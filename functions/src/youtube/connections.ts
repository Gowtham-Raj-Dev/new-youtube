import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@shortflow/shared";
import { TOKEN_ENCRYPTION_KEY, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI } from "../config";
import { decrypt, encrypt } from "../lib/crypto";
import { logActivity, notify } from "../lib/activity";
import { TokenRevokedError, refreshAccessToken, type OAuthClient } from "./oauth";
import type { ChannelInfo } from "./channel";

/** One connection per (user, channel), so reconnecting the same channel updates in place. */
export function connectionIdFor(userId: string, channelId: string) {
  return `${userId}_${channelId}`;
}

export function oauthClient(): OAuthClient {
  return {
    clientId: YOUTUBE_CLIENT_ID.value(),
    clientSecret: YOUTUBE_CLIENT_SECRET.value(),
    redirectUri: YOUTUBE_REDIRECT_URI.value(),
  };
}

export async function saveConnection(userId: string, channel: ChannelInfo, refreshToken: string, scopes: string[]) {
  const db = getFirestore();
  const id = connectionIdFor(userId, channel.channelId);
  const connectionRef = db.collection(COLLECTIONS.youtubeConnections).doc(id);
  const existing = await connectionRef.get();
  const now = FieldValue.serverTimestamp();

  const batch = db.batch();
  batch.set(
    connectionRef,
    { userId, ...channel, status: "connected", updatedAt: now, ...(existing.exists ? {} : { createdAt: now }) },
    { merge: true },
  );
  batch.set(db.collection(COLLECTIONS.youtubeCredentials).doc(id), {
    userId,
    channelId: channel.channelId,
    encryptedRefreshToken: encrypt(refreshToken, TOKEN_ENCRYPTION_KEY.value(), id),
    scopes,
    updatedAt: now,
  });
  batch.set(db.collection(COLLECTIONS.users).doc(userId), { youtubeConnected: true }, { merge: true });
  logActivity(batch, userId, {
    type: "YOUTUBE_CONNECTED",
    message: `Connected YouTube channel ${channel.channelTitle}`,
    refType: "youtube",
    refId: id,
  });
  notify(batch, userId, {
    kind: "success",
    title: "YouTube connected",
    body: `${channel.channelTitle} is ready for automatic uploads.`,
    link: "/youtube",
  });
  await batch.commit();
  return id;
}

export async function removeConnection(userId: string, connectionId: string, channelTitle: string) {
  const db = getFirestore();
  const others = await db.collection(COLLECTIONS.youtubeConnections).where("userId", "==", userId).get();
  const stillConnected = others.docs.some((d) => d.id !== connectionId && d.get("status") === "connected");

  const batch = db.batch();
  batch.delete(db.collection(COLLECTIONS.youtubeConnections).doc(connectionId));
  batch.delete(db.collection(COLLECTIONS.youtubeCredentials).doc(connectionId));
  batch.set(db.collection(COLLECTIONS.users).doc(userId), { youtubeConnected: stillConnected }, { merge: true });
  logActivity(batch, userId, {
    type: "YOUTUBE_DISCONNECTED",
    message: `Disconnected YouTube channel ${channelTitle}`,
    refType: "youtube",
    refId: connectionId,
  });
  await batch.commit();
}

export async function readRefreshToken(connectionId: string): Promise<string | null> {
  const snap = await getFirestore().collection(COLLECTIONS.youtubeCredentials).doc(connectionId).get();
  if (!snap.exists) return null;
  return decrypt(snap.get("encryptedRefreshToken"), TOKEN_ENCRYPTION_KEY.value(), connectionId);
}

/**
 * Fresh access token for a stored connection (refreshYouTubeToken). If Google
 * reports the grant revoked, the connection is marked `expired` and the user is
 * told to reconnect; the TokenRevokedError is rethrown for the caller.
 */
export async function getAccessToken(connectionId: string): Promise<string> {
  const refreshToken = await readRefreshToken(connectionId);
  if (!refreshToken) throw new TokenRevokedError();
  try {
    const { access_token } = await refreshAccessToken(refreshToken, oauthClient());
    return access_token;
  } catch (error) {
    if (error instanceof TokenRevokedError) await markExpired(connectionId);
    throw error;
  }
}

async function markExpired(connectionId: string) {
  const db = getFirestore();
  const ref = db.collection(COLLECTIONS.youtubeConnections).doc(connectionId);
  const snap = await ref.get();
  if (!snap.exists || snap.get("status") === "expired") return;

  const userId = snap.get("userId") as string;
  const batch = db.batch();
  batch.update(ref, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
  notify(batch, userId, {
    kind: "error",
    title: "Reconnect YouTube",
    body: `Access to ${snap.get("channelTitle")} expired. Reconnect so scheduled Shorts keep uploading.`,
    link: "/youtube",
  });
  await batch.commit();
}
