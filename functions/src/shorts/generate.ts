import { HttpsError, onCall } from "firebase-functions/https";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, DEFAULT_SETTINGS, type SettingsDoc, type VideoDoc } from "@shortflow/shared";
import { requireUid } from "../lib/auth";
import { planSegments } from "./segments";

/** A verified source with no Shorts yet, or whose last attempt at cutting failed. */
function canGenerate(video: VideoDoc): boolean {
  if (video.sourceDeletedAt) return false;
  if (video.status === "uploaded") return true;
  // A duration means the file itself was fine — it was the cutting that failed.
  if (video.status === "failed") return video.durationSec != null;
  return video.status === "completed" && video.shortsCount === 0;
}

/**
 * Puts a video in line for the worker (processVideoQueue), with the user's
 * processing settings frozen onto the job. Pass `userId` to require ownership.
 */
export async function queueShortGeneration(videoId: string, userId?: string): Promise<"queued" | "missing" | "not_ready"> {
  const db = getFirestore();
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  const jobRef = db.collection(COLLECTIONS.jobs).doc();

  return db.runTransaction(async (tx) => {
    const video = (await tx.get(videoRef)).data() as VideoDoc | undefined;
    if (!video || (userId && video.userId !== userId)) return "missing";
    if (!canGenerate(video)) return "not_ready";

    const settings = (await tx.get(db.collection(COLLECTIONS.settings).doc(video.userId))).data() as SettingsDoc | undefined;
    const processing = settings?.processing ?? DEFAULT_SETTINGS.processing;

    tx.set(jobRef, {
      userId: video.userId,
      type: "video_processing",
      status: "queued",
      sourceId: videoId,
      progress: 0,
      stage: null,
      completedSteps: 0,
      totalSteps: planSegments(video.durationSec ?? 0, processing.shortDuration).length,
      attempt: 0,
      createdAt: FieldValue.serverTimestamp(),
      startedAt: null,
      completedAt: null,
      error: null,
      processing,
      heartbeatAt: null,
    });
    tx.update(videoRef, { status: "queued", activeJobId: jobRef.id, errorMessage: null, processingStartedAt: null, processingCompletedAt: null });
    return "queued";
  });
}

/** Manual start: for videos uploaded before automatic cutting existed, and for retrying a failed one. */
export const generateShorts = onCall<{ videoId?: string }>(async (request) => {
  const userId = requireUid(request.auth);
  const videoId = request.data?.videoId;
  if (typeof videoId !== "string" || !videoId) throw new HttpsError("invalid-argument", "Choose a video.");

  const result = await queueShortGeneration(videoId, userId);
  if (result === "missing") throw new HttpsError("not-found", "That video no longer exists.");
  if (result === "not_ready") throw new HttpsError("failed-precondition", "This video can't be cut into Shorts right now.");
  return { ok: true };
});
