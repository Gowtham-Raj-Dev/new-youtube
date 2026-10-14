import { HttpsError, onCall } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS } from "@shortflow/shared";
import { TOKEN_ENCRYPTION_KEY } from "../config";
import { requireUid } from "../lib/auth";
import { readRefreshToken } from "../youtube/connections";
import { revokeToken } from "../youtube/oauth";

/** Every collection whose documents carry the owner's `userId`. */
const OWNED_COLLECTIONS = [
  COLLECTIONS.schedules,
  COLLECTIONS.shorts,
  COLLECTIONS.videos,
  COLLECTIONS.jobs,
  COLLECTIONS.banners,
  COLLECTIONS.activityLogs,
  COLLECTIONS.notifications,
] as const;

/**
 * Deletes the signed-in user and everything the app holds for them: Google
 * access to their channels is revoked, then their files, documents and sign-in
 * account are removed. Nothing on YouTube is touched. Refused while one of
 * their Shorts is uploading, so the upload can't write back after the delete.
 */
export const deleteAccount = onCall({ secrets: [TOKEN_ENCRYPTION_KEY], timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  const userId = requireUid(request.auth);
  const db = getFirestore();

  const uploading = await db.collection(COLLECTIONS.schedules).where("userId", "==", userId).where("status", "==", "uploading").limit(1).get();
  if (!uploading.empty) {
    throw new HttpsError("failed-precondition", "A Short is uploading to YouTube right now. Try again in a few minutes.");
  }

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("userId", "==", userId).get();
  for (const connection of connections.docs) {
    try {
      const refreshToken = await readRefreshToken(connection.id);
      if (refreshToken) await revokeToken(refreshToken);
    } catch (error) {
      // The stored credentials are deleted below either way.
      logger.warn("Revoke during account deletion failed", { connectionId: connection.id, error: String(error) });
    }
  }

  await getStorage().bucket().deleteFiles({ prefix: `users/${userId}/` });

  const writer = db.bulkWriter();
  for (const connection of connections.docs) {
    void writer.delete(connection.ref);
    void writer.delete(db.collection(COLLECTIONS.youtubeCredentials).doc(connection.id));
  }
  for (const name of OWNED_COLLECTIONS) {
    const docs = await db.collection(name).where("userId", "==", userId).select().get();
    for (const doc of docs.docs) void writer.delete(doc.ref);
  }
  void writer.delete(db.collection(COLLECTIONS.settings).doc(userId));
  await writer.close();
  await db.recursiveDelete(db.collection(COLLECTIONS.users).doc(userId));

  await getAuth().deleteUser(userId);
  logger.info("Account deleted", { userId, channels: connections.size });
  return { ok: true };
});
