import { randomBytes } from "node:crypto";
import { HttpsError, onCall, onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@shortflow/shared";
import { appOrigins, TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI } from "../config";
import { YOUTUBE_SCOPES, TokenRevokedError, buildAuthUrl, exchangeCode, revokeToken } from "./oauth";
import { getMyChannel } from "./channel";
import { getAccessToken, oauthClient, readRefreshToken, removeConnection, saveConnection } from "./connections";
import { requireUid } from "../lib/auth";

const STATE_TTL_MS = 10 * 60 * 1000;

async function requireOwnedConnection(userId: string, connectionId: unknown) {
  if (typeof connectionId !== "string" || !connectionId) throw new HttpsError("invalid-argument", "Missing connection.");
  const snap = await getFirestore().collection(COLLECTIONS.youtubeConnections).doc(connectionId).get();
  if (!snap.exists || snap.get("userId") !== userId) throw new HttpsError("not-found", "That YouTube connection no longer exists.");
  return snap;
}

/** Step 1: returns the Google consent URL. The `state` nonce ties the callback to this user. */
export const youtubeConnectStart = onCall<{ returnOrigin?: string }>(async (request) => {
  const userId = requireUid(request.auth);
  const returnOrigin = request.data?.returnOrigin;
  if (!returnOrigin || !appOrigins().includes(returnOrigin)) {
    throw new HttpsError("invalid-argument", "This app address isn't allowed to connect YouTube.");
  }
  if (!YOUTUBE_CLIENT_ID.value()) {
    throw new HttpsError("failed-precondition", "YouTube isn't configured yet. Add the OAuth client ID.");
  }

  const nonce = randomBytes(32).toString("base64url");
  await getFirestore()
    .collection(COLLECTIONS.oauthStates)
    .doc(nonce)
    .set({
      userId,
      returnOrigin,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + STATE_TTL_MS),
    });

  return { url: buildAuthUrl(YOUTUBE_CLIENT_ID.value(), YOUTUBE_REDIRECT_URI.value(), nonce) };
});

/** Reads and deletes the state doc in one transaction so each nonce works exactly once. */
async function consumeState(nonce: string) {
  const db = getFirestore();
  const ref = db.collection(COLLECTIONS.oauthStates).doc(nonce);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);
    const expiresAt = snap.get("expiresAt") as Timestamp;
    if (expiresAt.toMillis() < Date.now()) return null;
    return { userId: snap.get("userId") as string, returnOrigin: snap.get("returnOrigin") as string };
  });
}

/**
 * Step 2: Google redirects here (via Hosting rewrite /api/youtube/callback).
 * Exchanges the code server-side; the refresh token never reaches the browser.
 */
export const youtubeOAuthCallback = onRequest(
  { secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY], invoker: "public" },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    const finish = (origin: string, params: Record<string, string>) =>
      res.redirect(303, `${origin}/youtube?${new URLSearchParams(params)}`);

    const nonce = typeof req.query.state === "string" ? req.query.state : "";
    const state = nonce ? await consumeState(nonce) : null;
    if (!state) return finish(appOrigins()[0], { error: "expired" });

    const { userId, returnOrigin } = state;
    if (req.query.error) return finish(returnOrigin, { error: req.query.error === "access_denied" ? "denied" : "failed" });

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) return finish(returnOrigin, { error: "failed" });

    try {
      const tokens = await exchangeCode(code, oauthClient());
      const granted = tokens.scope.split(" ");

      // Google's granular consent lets users untick scopes; uploads need both.
      if (!YOUTUBE_SCOPES.every((scope) => granted.includes(scope))) {
        await revokeToken(tokens.refresh_token ?? tokens.access_token);
        return finish(returnOrigin, { error: "scopes" });
      }
      if (!tokens.refresh_token) return finish(returnOrigin, { error: "failed" });

      const channel = await getMyChannel(tokens.access_token);
      if (!channel) {
        await revokeToken(tokens.refresh_token);
        return finish(returnOrigin, { error: "no_channel" });
      }

      await saveConnection(userId, channel, tokens.refresh_token, granted);
      logger.info("YouTube connected", { userId, channelId: channel.channelId });
      return finish(returnOrigin, { connected: channel.channelTitle });
    } catch (error) {
      logger.error("YouTube OAuth callback failed", { userId, error: String(error) });
      return finish(returnOrigin, { error: "failed" });
    }
  },
);

/** Pulls fresh channel name, avatar and subscriber count. Also proves the stored token still works. */
export const youtubeRefreshChannel = onCall<{ connectionId?: string }>(
  { secrets: [YOUTUBE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const userId = requireUid(request.auth);
    const connection = await requireOwnedConnection(userId, request.data?.connectionId);

    let accessToken: string;
    try {
      accessToken = await getAccessToken(connection.id);
    } catch (error) {
      if (error instanceof TokenRevokedError) {
        throw new HttpsError("failed-precondition", "YouTube access expired. Please reconnect your channel.");
      }
      logger.error("Token refresh failed", { userId, connectionId: connection.id, error: String(error) });
      throw new HttpsError("unavailable", "Couldn't reach YouTube. Try again in a moment.");
    }

    const channel = await getMyChannel(accessToken);
    if (!channel) throw new HttpsError("not-found", "This Google account no longer has a YouTube channel.");
    await connection.ref.update({ ...channel, status: "connected", updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  },
);

/** Revokes Google access and deletes the stored credentials. */
export const youtubeDisconnect = onCall<{ connectionId?: string }>(
  { secrets: [TOKEN_ENCRYPTION_KEY] },
  async (request) => {
    const userId = requireUid(request.auth);
    const connection = await requireOwnedConnection(userId, request.data?.connectionId);

    try {
      const refreshToken = await readRefreshToken(connection.id);
      if (refreshToken) await revokeToken(refreshToken);
    } catch (error) {
      // Still delete locally even if the stored token can't be decrypted/revoked.
      logger.warn("Revoke during disconnect failed", { connectionId: connection.id, error: String(error) });
    }

    await removeConnection(userId, connection.id, connection.get("channelTitle"));
    return { ok: true };
  },
);
