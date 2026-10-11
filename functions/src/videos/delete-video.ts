import { HttpsError, onCall } from "firebase-functions/https";
import { FieldValue, getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, type VideoDoc } from "@shortflow/shared";
import { requireUid } from "../lib/auth";
import { logActivity } from "../lib/activity";

type DeleteMode = "everything" | "source" | "shorts";
const MODES: DeleteMode[] = ["everything", "source", "shorts"];

/**
 * Deletes a video's source, its Shorts, or both — Storage files, Short docs and
 * schedules together, so nothing is left orphaned. Never runs mid-processing or
 * while one of its Shorts is uploading to YouTube.
 */
export const deleteVideo = onCall<{ videoId?: string; mode?: DeleteMode }>({ timeoutSeconds: 300 }, async (request) => {
  const userId = requireUid(request.auth);
  const { videoId, mode = "everything" } = request.data ?? {};
  if (typeof videoId !== "string" || !videoId || !MODES.includes(mode)) {
    throw new HttpsError("invalid-argument", "Choose what to delete.");
  }

  const db = getFirestore();
  const bucket = getStorage().bucket();
  const ref = db.collection(COLLECTIONS.videos).doc(videoId);
  const snap = await ref.get();
  const video = snap.data() as VideoDoc | undefined;
  if (!video || video.userId !== userId) throw new HttpsError("not-found", "That video no longer exists.");
  if (video.status === "queued" || video.status === "processing") {
    throw new HttpsError("failed-precondition", "This video is being processed. Wait for it to finish, then delete it.");
  }

  const batches: WriteBatch[] = [db.batch()];
  let ops = 0;
  const batch = () => {
    if (ops >= 450) {
      batches.push(db.batch());
      ops = 0;
    }
    ops++;
    return batches[batches.length - 1];
  };

  let shortsDeleted = 0;
  if (mode !== "source") {
    const shorts = await db.collection(COLLECTIONS.shorts).where("userId", "==", userId).where("videoId", "==", videoId).get();
    if (shorts.docs.some((d) => d.get("status") === "uploading")) {
      throw new HttpsError("failed-precondition", "A Short from this video is uploading to YouTube right now. Try again in a few minutes.");
    }
    for (const short of shorts.docs) {
      await bucket.deleteFiles({ prefix: `users/${userId}/shorts/${short.id}/` });
      batch().delete(short.ref);
      batch().delete(db.collection(COLLECTIONS.schedules).doc(short.id));
    }
    shortsDeleted = shorts.size;
  }

  if (mode !== "shorts") {
    await bucket.file(video.storagePath).delete({ ignoreNotFound: true });
  }

  if (mode === "everything") {
    if (video.thumbnailPath) await bucket.file(video.thumbnailPath).delete({ ignoreNotFound: true });
    batch().delete(ref);
  } else if (mode === "source") {
    batch().update(ref, { sourceDeletedAt: FieldValue.serverTimestamp() });
  } else {
    batch().update(ref, { shortsCount: 0 });
  }

  const what = { everything: "video and its Shorts", source: "original video", shorts: `${shortsDeleted} Shorts` }[mode];
  logActivity(batch(), userId, { type: "VIDEO_DELETED", message: `Deleted the ${what} of “${video.title}”`, refType: "video", refId: videoId });

  for (const b of batches) await b.commit();
  return { ok: true, shortsDeleted };
});
