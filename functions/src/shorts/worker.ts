import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import { FieldValue, Timestamp, getFirestore, type DocumentReference, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, DEFAULT_SETTINGS, storagePaths, type JobDoc, type SettingsDoc, type VideoDoc } from "@shortflow/shared";
import { STORAGE_REGION } from "../config";
import { logActivity, notify } from "../lib/activity";
import { grabFrameJpeg, renderShort, withStorageSource, type MediaInput } from "../lib/media";
import { planSegments, shortTitle, type Segment } from "./segments";

const MAX_ATTEMPTS = 3;
/** Stop starting new Shorts this far into a run; the next run carries on where this one stopped. */
const RUN_BUDGET_MS = 20 * 60 * 1000;
/** No heartbeat for this long means the worker holding the job died. One Short never takes this long. */
const LEASE_MS = 15 * 60 * 1000;

type Processing = SettingsDoc["processing"];

/**
 * Takes the job if nobody holds it. Returns the job as it was before the claim,
 * with `attempt` already counting this one.
 */
async function claimJob(jobRef: DocumentReference): Promise<JobDoc | null> {
  return getFirestore().runTransaction(async (tx) => {
    const job = (await tx.get(jobRef)).data() as JobDoc | undefined;
    if (!job || (job.status !== "queued" && job.status !== "processing")) return null;

    const heartbeat = job.heartbeatAt?.toMillis() ?? null;
    // `processing` with no heartbeat was handed over by a run that ran out of time — not a new attempt.
    const handedOver = job.status === "processing" && heartbeat === null;
    if (job.status === "processing" && !handedOver && Date.now() - heartbeat! < LEASE_MS) return null;

    const attempt = handedOver ? job.attempt : job.attempt + 1;
    tx.update(jobRef, {
      status: "processing",
      attempt,
      heartbeatAt: FieldValue.serverTimestamp(),
      ...(job.startedAt ? {} : { startedAt: FieldValue.serverTimestamp() }),
    });
    return { ...job, attempt };
  });
}

/** Renders one segment, stores it, and records the Short. Skips a Short an earlier attempt already made. */
async function makeShort(input: MediaInput, videoRef: DocumentReference, video: VideoDoc, segment: Segment, total: number, processing: Processing, publishing: SettingsDoc["publishing"]) {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const part = segment.index + 1;
  const shortId = `${videoRef.id}_${String(part).padStart(3, "0")}`;
  const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
  // Never overwrite: the user may have edited, queued or published it already.
  if ((await shortRef.get()).exists) return;

  const durationSec = Math.round((segment.endSec - segment.startSec) * 100) / 100;
  const outPath = join(tmpdir(), `${shortId}.mp4`);
  try {
    await renderShort(input, { startSec: segment.startSec, durationSec, cropMode: processing.cropMode, quality: processing.outputQuality }, outPath);

    const storagePath = storagePaths.shortVideo(video.userId, shortId);
    await bucket.upload(outPath, { destination: storagePath, contentType: "video/mp4", resumable: false, metadata: { cacheControl: "private, max-age=86400" } });

    let thumbnailPath: string | null = null;
    const frame = await grabFrameJpeg({ url: outPath }, Math.min(1, durationSec / 2)).catch(() => null);
    if (frame) {
      thumbnailPath = storagePaths.shortThumbnail(video.userId, shortId);
      await bucket.file(thumbnailPath).save(frame, { contentType: "image/jpeg", resumable: false, metadata: { cacheControl: "private, max-age=86400" } });
    }

    const batch = db.batch();
    batch.set(shortRef, {
      userId: video.userId,
      videoId: videoRef.id,
      segmentIndex: segment.index,
      startSec: segment.startSec,
      endSec: segment.endSec,
      durationSec,
      storagePath,
      thumbnailPath,
      cropMode: processing.cropMode,
      status: "ready",
      createdAt: FieldValue.serverTimestamp(),
      title: shortTitle(publishing.titleTemplate, video.title, part, total),
      description: publishing.defaultDescription,
      tags: publishing.defaultTags,
      privacy: publishing.defaultPrivacy,
      categoryId: publishing.categoryId,
      publishAt: null,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
    });
    batch.update(videoRef, { shortsCount: FieldValue.increment(1) });
    await batch.commit();
  } finally {
    await rm(outPath, { force: true });
  }
}

async function failVideo(videoRef: DocumentReference, jobRef: DocumentReference, video: VideoDoc, reason: string, notifyUser: boolean) {
  const message = "We couldn't cut this video into Shorts. Try again from the video's menu.";
  const batch = getFirestore().batch();
  batch.update(videoRef, { status: "failed", errorMessage: message, activeJobId: null });
  batch.update(jobRef, { status: "failed", error: reason.slice(0, 500), completedAt: FieldValue.serverTimestamp(), heartbeatAt: null });
  logActivity(batch, video.userId, { type: "VIDEO_PROCESSING_FAILED", message: `Couldn't cut “${video.title}” into Shorts`, refType: "video", refId: videoRef.id });
  if (notifyUser) notify(batch, video.userId, { kind: "error", title: "Shorts couldn't be made", body: message, link: "/videos" });
  await batch.commit();
}

async function processVideo(videoSnap: QueryDocumentSnapshot, deadline: number) {
  const db = getFirestore();
  const videoRef = videoSnap.ref;
  const video = videoSnap.data() as VideoDoc;
  if (!video.activeJobId) {
    logger.error("Video waiting to be cut has no job", { videoId: videoRef.id });
    return;
  }
  const jobRef = db.collection(COLLECTIONS.jobs).doc(video.activeJobId);
  const job = await claimJob(jobRef);
  if (!job) return;

  const settings = ((await db.collection(COLLECTIONS.settings).doc(video.userId).get()).data() as SettingsDoc | undefined) ?? DEFAULT_SETTINGS;
  if (job.attempt > MAX_ATTEMPTS) {
    return failVideo(videoRef, jobRef, video, job.error ?? "The worker kept dying while cutting this video.", settings.notifications.failures);
  }

  const processing = job.processing ?? settings.processing;
  const segments = planSegments(video.durationSec ?? 0, processing.shortDuration);
  const total = segments.length;

  try {
    if (total === 0) throw new Error("Video has no duration to cut.");
    if (video.status === "queued") {
      const batch = db.batch();
      batch.update(videoRef, { status: "processing", processingStartedAt: FieldValue.serverTimestamp() });
      logActivity(batch, video.userId, { type: "VIDEO_PROCESSING_STARTED", message: `Cutting “${video.title}” into Shorts`, refType: "video", refId: videoRef.id });
      await batch.commit();
    }

    const finished = await withStorageSource(getStorage().bucket().name, video.storagePath, async (input) => {
      for (const segment of segments.slice(job.completedSteps ?? 0)) {
        if (Date.now() > deadline) return false;
        const part = segment.index + 1;
        await jobRef.update({ stage: `Generating Short ${part} / ${total}`, heartbeatAt: FieldValue.serverTimestamp() });
        await makeShort(input, videoRef, video, segment, total, processing, settings.publishing);
        await jobRef.update({ completedSteps: part, progress: Math.round((part / total) * 100), heartbeatAt: FieldValue.serverTimestamp() });
      }
      return true;
    });
    if (!finished) {
      await jobRef.update({ heartbeatAt: null }); // out of time — the next run picks it up
      return;
    }

    const batch = db.batch();
    batch.update(videoRef, { status: "completed", processingCompletedAt: FieldValue.serverTimestamp(), activeJobId: null, errorMessage: null });
    batch.update(jobRef, { status: "completed", progress: 100, stage: null, completedAt: FieldValue.serverTimestamp(), heartbeatAt: null, error: null });
    const count = `${total} Short${total === 1 ? "" : "s"}`;
    logActivity(batch, video.userId, { type: "VIDEO_PROCESSING_COMPLETED", message: `Cut “${video.title}” into ${count}`, refType: "video", refId: videoRef.id });
    if (settings.notifications.processing) {
      notify(batch, video.userId, { kind: "success", title: "Shorts ready", body: `${count} from “${video.title}” ${total === 1 ? "is" : "are"} ready to review.`, link: "/shorts" });
    }
    await batch.commit();
    logger.info("Video cut into Shorts", { videoId: videoRef.id, shorts: total });
  } catch (error) {
    logger.error("Cutting video failed", { videoId: videoRef.id, attempt: job.attempt, error: String(error) });
    if (job.attempt >= MAX_ATTEMPTS) {
      await failVideo(videoRef, jobRef, video, String(error), settings.notifications.failures);
    } else {
      // Back in line; the next claim counts as a new attempt.
      await jobRef.update({ status: "queued", heartbeatAt: null, error: String(error).slice(0, 500) });
    }
  }
}

/**
 * The FFmpeg worker: cuts queued videos into vertical Shorts, oldest first.
 * One instance, one run at a time, in the bucket's region because it reads the
 * source and writes the Shorts there.
 */
export const processVideoQueue = onSchedule(
  { schedule: "every 1 minutes", region: STORAGE_REGION, memory: "4GiB", cpu: 4, concurrency: 1, timeoutSeconds: 1800, maxInstances: 1 },
  async () => {
    const deadline = Date.now() + RUN_BUDGET_MS;
    const seen = new Set<string>();

    while (Date.now() < deadline) {
      const waiting = await getFirestore()
        .collection(COLLECTIONS.videos)
        .where("status", "in", ["queued", "processing"])
        .orderBy("createdAt")
        .limit(20)
        .get();
      const next = waiting.docs.find((doc) => !seen.has(doc.id));
      if (!next) break;
      seen.add(next.id);
      await processVideo(next, deadline);
    }
  },
);
