import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import {
  BANNER_POSITIONS,
  COLLECTIONS,
  newRunId,
  shortFileName,
  shortIdFor,
  shortTitle,
  storagePaths,
  type BannerDoc,
  type BannerPosition,
  type Segment,
  type SettingsDoc,
  type VideoDoc,
} from "@shortflow/shared";
import { firebase } from "./firebase/client";

/** The PC helper (`npm run helper`, started by `npm run dev`). It cuts with FFmpeg on this machine, so no cloud compute is used. */
const HELPER = "http://127.0.0.1:4777";

export class HelperOfflineError extends Error {
  constructor() {
    super("The PC helper isn't running. Start the app with “npm run dev” (or run “npm run helper”) and try again.");
  }
}

interface HelperPart extends Segment {
  durationSec: number;
  hasThumbnail: boolean;
}

interface HelperJob {
  status: "working" | "done" | "failed";
  stage: string;
  done: number;
  total: number;
  parts: HelperPart[];
  error: string | null;
}

export interface SplitProgress {
  stage: string;
  /** 0–100. */
  percent: number;
}

async function helper(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${HELPER}${path}`, init);
  } catch {
    throw new HelperOfflineError();
  }
  if (!res.ok) throw new Error("The PC helper couldn't do that. Check its window for details.");
  return res;
}

/** Frame size of a video and, if it has black bars baked in, the area that is real picture. */
export interface SourceFrame {
  width: number;
  height: number;
  crop: { width: number; height: number; x: number; y: number } | null;
}

/** Measures a source video via the helper, for the preview. Null if the helper is off or can't tell. */
export async function measureSource(storagePath: string): Promise<SourceFrame | null> {
  try {
    const url = await getDownloadURL(storageRef(firebase().storage, storagePath));
    const res = await fetch(`${HELPER}/frame`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
    return res.ok ? ((await res.json()) as SourceFrame) : null;
  } catch {
    return null;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cuts `video` into Shorts of `shortDuration` seconds on this PC, then saves
 * each one to Storage and registers it, so it shows on the Shorts page.
 * Returns how many Shorts were made. Cutting a video again adds a new set.
 */
export async function splitLocally(
  video: VideoDoc & { id: string },
  shortDuration: number,
  settings: Pick<SettingsDoc, "processing" | "publishing">,
  onProgress: (progress: SplitProgress) => void,
  chosenBanners: Partial<Record<BannerPosition, BannerDoc>> = {},
  /** Written on every Short, centred on (x, y) as 0–1 shares of the frame; `{n}` becomes the part number. */
  label: { template: string; x: number; y: number } | null = null,
): Promise<number> {
  const { db, storage } = firebase();
  onProgress({ stage: "Starting", percent: 0 });
  await helper("/health");

  const url = await getDownloadURL(storageRef(storage, video.storagePath));
  const banners: Partial<Record<BannerPosition, { url: string; width: number; height: number }>> = {};
  for (const position of BANNER_POSITIONS) {
    const banner = chosenBanners[position];
    if (banner) banners[position] = { url: await getDownloadURL(storageRef(storage, banner.storagePath)), width: banner.width, height: banner.height };
  }
  const { cropMode, outputQuality } = settings.processing;
  const run = newRunId();
  const { jobId } = (await (
    await helper("/split", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, shortDuration, cropMode, quality: outputQuality, banners, label }) })
  ).json()) as { jobId: string };

  try {
    // Cutting is the slow part: it fills the first 80% of the bar.
    let job: HelperJob;
    while (true) {
      job = (await (await helper(`/jobs/${jobId}`)).json()) as HelperJob;
      if (job.status === "failed") throw new Error(job.error ?? "The video couldn't be cut.");
      onProgress({ stage: job.stage, percent: job.total ? (job.done / job.total) * 80 : 2 });
      if (job.status === "done") break;
      await pause(1000);
    }

    const total = job.parts.length;
    for (const part of job.parts) {
      const number = part.index + 1;
      onProgress({ stage: `Saving Short ${number} / ${total}`, percent: 80 + (part.index / total) * 20 });

      const shortId = shortIdFor(video.id, run, part.index);
      const shortRef = doc(db, COLLECTIONS.shorts, shortId);

      const title = shortTitle(settings.publishing.titleTemplate, video.title, number, total);
      const storagePath = storagePaths.shortVideo(video.userId, shortId);
      const file = await (await helper(`/jobs/${jobId}/${number}.mp4`)).blob();
      // `attachment` makes the browser save the file when its URL is opened; <video> still plays it.
      await uploadBytes(storageRef(storage, storagePath), file, {
        contentType: "video/mp4",
        cacheControl: "private, max-age=86400",
        contentDisposition: `attachment; filename="${shortFileName(title)}"`,
      });

      let thumbnailPath: string | null = null;
      if (part.hasThumbnail) {
        thumbnailPath = storagePaths.shortThumbnail(video.userId, shortId);
        const thumbnail = await (await helper(`/jobs/${jobId}/${number}.jpg`)).blob();
        await uploadBytes(storageRef(storage, thumbnailPath), thumbnail, { contentType: "image/jpeg", cacheControl: "private, max-age=86400" });
      }

      // Field set must match firestore.rules.
      await setDoc(shortRef, {
        userId: video.userId,
        videoId: video.id,
        segmentIndex: part.index,
        startSec: part.startSec,
        endSec: part.endSec,
        durationSec: part.durationSec,
        storagePath,
        thumbnailPath,
        cropMode,
        status: "ready",
        createdAt: serverTimestamp(),
        title,
        description: settings.publishing.defaultDescription,
        tags: settings.publishing.defaultTags,
        privacy: settings.publishing.defaultPrivacy,
        categoryId: settings.publishing.categoryId,
        publishAt: null,
        youtubeVideoId: null,
        publishedAt: null,
        errorMessage: null,
      });
    }
    onProgress({ stage: "Done", percent: 100 });
    return total;
  } finally {
    void fetch(`${HELPER}/jobs/${jobId}`, { method: "DELETE" }).catch(() => undefined);
  }
}
