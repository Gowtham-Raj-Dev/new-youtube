import { HttpsError, onCall } from "firebase-functions/https";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, type ShortDoc } from "@shortflow/shared";
import { requireUid } from "../lib/auth";
import { logActivity } from "../lib/activity";

const MAX_PER_CALL = 50;

/**
 * Removes Shorts from ShortFlow: their files in Storage, their docs and any
 * queue entry. A Short already on YouTube stays on YouTube — only our copy
 * goes. One that is uploading right now is skipped.
 */
export const deleteShorts = onCall<{ shortIds?: string[] }>({ timeoutSeconds: 300 }, async (request) => {
  const userId = requireUid(request.auth);
  const requested = request.data?.shortIds;
  if (!Array.isArray(requested) || requested.length === 0 || requested.length > MAX_PER_CALL || !requested.every((id) => typeof id === "string" && id)) {
    throw new HttpsError("invalid-argument", `Choose between 1 and ${MAX_PER_CALL} Shorts to delete.`);
  }

  const db = getFirestore();
  const bucket = getStorage().bucket();
  const snaps = await db.getAll(...[...new Set(requested)].map((id) => db.collection(COLLECTIONS.shorts).doc(id)));

  const batch = db.batch();
  let deleted = 0;
  let skipped = 0;
  // A page only ever lists one channel's Shorts, so the first one's channel is the channel of them all.
  let connectionId: string | null = null;
  for (const snap of snaps) {
    const short = snap.data() as ShortDoc | undefined;
    if (!short || short.userId !== userId) continue; // already gone, or not theirs
    if (short.status === "uploading") {
      skipped++;
      continue;
    }
    await bucket.deleteFiles({ prefix: `users/${userId}/shorts/${snap.id}/` });
    batch.delete(snap.ref);
    batch.delete(db.collection(COLLECTIONS.schedules).doc(snap.id));
    connectionId ??= short.connectionId ?? null;
    deleted++;
  }

  if (deleted > 0) {
    logActivity(batch, userId, { type: "VIDEO_DELETED", message: `Deleted ${deleted} Short${deleted === 1 ? "" : "s"}`, refType: "short", refId: null, connectionId });
    await batch.commit();
  }
  return { deleted, skipped };
});
