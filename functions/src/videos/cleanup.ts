import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS } from "@shortflow/shared";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Daily sweep for uploads that never finished (tab closed, network lost).
 * No file → the reservation is removed. A file the trigger never verified →
 * marked failed so the user sees it instead of a forever-spinning card.
 */
export const cleanupStaleUploads = onSchedule({ schedule: "every day 03:30", timeZone: "Asia/Kolkata" }, async () => {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const stale = await db
    .collection(COLLECTIONS.videos)
    .where("status", "==", "uploading")
    .where("createdAt", "<", Timestamp.fromMillis(Date.now() - STALE_AFTER_MS))
    .limit(200)
    .get();

  let removed = 0;
  let failed = 0;
  for (const doc of stale.docs) {
    const [exists] = await bucket.file(doc.get("storagePath")).exists();
    if (exists) {
      await doc.ref.update({ status: "failed", errorMessage: "This upload couldn't be verified. Please upload the video again." });
      failed++;
    } else {
      await doc.ref.delete();
      removed++;
    }
  }
  logger.info("Stale upload sweep", { removed, failed });
});
