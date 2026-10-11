import { onObjectFinalized } from "firebase-functions/storage";
import * as logger from "firebase-functions/logger";
import { FieldValue, getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SOURCE_VIDEO_PATH_RE, formatDuration, storagePaths, type VideoDoc } from "@shortflow/shared";
import { STORAGE_REGION } from "../config";
import { logActivity, notify } from "../lib/activity";
import { grabFrameJpeg, probeMedia, withStorageSource, type ProbeResult } from "../lib/media";

async function markFailed(ref: DocumentReference, video: VideoDoc, message: string) {
  const batch = getFirestore().batch();
  batch.update(ref, { status: "failed", errorMessage: message });
  logActivity(batch, video.userId, { type: "VIDEO_UPLOAD_FAILED", message: `“${video.title}” couldn't be read as a video`, refType: "video", refId: ref.id });
  notify(batch, video.userId, { kind: "error", title: "Video upload failed", body: message, link: "/videos" });
  await batch.commit();
}

/**
 * Runs when a source video lands in Storage: verifies it matches what the
 * client declared, reads duration/size with ffprobe and saves a thumbnail.
 * Only then does the video become `uploaded` — clients can't set that status.
 * Cutting into Shorts starts when the user picks a length (generateShorts).
 */
export const onSourceVideoUploaded = onObjectFinalized(
  { region: STORAGE_REGION, memory: "1GiB", timeoutSeconds: 300 },
  async (event) => {
    const { name, bucket, size, contentType } = event.data;
    const match = name?.match(SOURCE_VIDEO_PATH_RE);
    if (!match) return; // thumbnails, Shorts, anything else

    const [, userId, videoId] = match;
    const ref = getFirestore().collection(COLLECTIONS.videos).doc(videoId);
    const video = (await ref.get()).data() as VideoDoc | undefined;
    if (!video || video.userId !== userId || video.storagePath !== name) {
      logger.warn("Source upload without a matching video doc", { name });
      return;
    }
    if (video.status !== "uploading") return; // duplicate delivery

    if (Number(size) !== video.fileSize || contentType !== video.contentType) {
      return markFailed(ref, video, "The uploaded file didn't match the one you selected. Please upload it again.");
    }

    let probe: ProbeResult | null;
    let frame: Buffer | null = null;
    try {
      ({ probe, frame } = await withStorageSource(bucket, name, async (input) => {
        const probe = await probeMedia(input);
        const frame = probe
          ? await grabFrameJpeg(input, Math.min(5, probe.durationSec * 0.1)).catch((error) => {
              logger.warn("Thumbnail extraction failed", { videoId, error: String(error) });
              return null;
            })
          : null;
        return { probe, frame };
      }));
    } catch (error) {
      // Our tooling broke, not the user's file — say so.
      logger.error("Media check crashed", { videoId, error: String(error) });
      return markFailed(ref, video, "We couldn't check this video because of a problem on our side. Please upload it again in a few minutes.");
    }
    if (!probe) {
      return markFailed(ref, video, "This file isn't a playable video or its format isn't supported. Export it as MP4 (H.264) and try again.");
    }

    let thumbnailPath: string | null = null;
    if (frame) {
      thumbnailPath = storagePaths.videoThumbnail(userId, videoId);
      await getStorage()
        .bucket(bucket)
        .file(thumbnailPath)
        .save(frame, { contentType: "image/jpeg", resumable: false, metadata: { cacheControl: "private, max-age=86400" } });
    }

    const batch = getFirestore().batch();
    batch.update(ref, {
      status: "uploaded",
      uploadedAt: FieldValue.serverTimestamp(),
      durationSec: probe.durationSec,
      width: probe.width,
      height: probe.height,
      thumbnailPath,
      errorMessage: null,
    });
    logActivity(batch, userId, {
      type: "VIDEO_UPLOADED",
      message: `Uploaded “${video.title}” (${formatDuration(probe.durationSec)})`,
      refType: "video",
      refId: videoId,
    });
    await batch.commit();
    logger.info("Source video verified", { videoId, ...probe });
  },
);
