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
  type ReactionLook,
  type Segment,
  type SettingsDoc,
  type TailMode,
  type VideoDoc,
} from "@shortflow/shared";
import { canRenderInBrowser } from "./browser-render";
import { splitInBrowser } from "./browser-splitter";
import { firebase } from "./firebase/client";

/** The PC helper (`npm run helper`, started by `npm run dev`). It cuts with FFmpeg on this machine, so no cloud compute is used. */
const HELPER = "http://127.0.0.1:4777";

/** The helper as a download for Windows, built into the site by `npm run pack-helper`. */
export const HELPER_DOWNLOAD = "/downloads/ShortFlowHelper-win.zip";

export class HelperOfflineError extends Error {
  constructor() {
    super("This browser can't do this by itself, and the PC helper isn't running. Use Chrome or Edge — or open ShortFlowHelper.exe (download it from the Videos or Shorts page), leave its window open, and try again.");
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

/** Throws HelperOfflineError unless the PC helper is running. */
export async function checkHelper() {
  await helper("/health");
}

/**
 * Where rendering will happen: the PC helper when it is running (FFmpeg, and far
 * quicker), otherwise this browser if it can encode video. Throws
 * HelperOfflineError when neither is possible.
 */
export async function pickEngine(): Promise<"helper" | "browser"> {
  try {
    await checkHelper();
    return "helper";
  } catch (err) {
    if (await canRenderInBrowser()) return "browser";
    throw err;
  }
}

/** Where the helper can fetch each chosen banner, with its pixel size. */
async function bannerSources(chosen: Partial<Record<BannerPosition, BannerDoc>>) {
  const banners: Partial<Record<BannerPosition, { url: string; width: number; height: number }>> = {};
  for (const position of BANNER_POSITIONS) {
    const banner = chosen[position];
    if (banner) banners[position] = { url: await getDownloadURL(storageRef(firebase().storage, banner.storagePath)), width: banner.width, height: banner.height };
  }
  return banners;
}

export class ReactionVideoError extends Error {
  constructor(message = "The reaction video couldn't be read. Choose an MP4 file and try again.") {
    super(message);
  }
}

/** A reaction video the PC helper is holding, and how it sits in its strip. */
export interface HeldReaction extends ReactionLook {
  id: string;
}

/** Hands the reaction video to the PC helper once, to be put on every Short of an import. Returns the id to ask for it by. */
export async function holdReaction(file: Blob): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${HELPER}/reactions`, { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file });
  } catch {
    throw new HelperOfflineError();
  }
  // A helper started before reaction videos existed doesn't know this address at all.
  if (res.status === 404) throw new ReactionVideoError("The PC helper that's running is an older version. Close it and start it again (stop and re-run “npm run dev”, or open the newest ShortFlowHelper.exe), then try again.");
  if (!res.ok) throw new ReactionVideoError();
  return ((await res.json()) as { id: string }).id;
}

export function releaseReaction(id: string) {
  void fetch(`${HELPER}/reactions/${id}`, { method: "DELETE" }).catch(() => undefined);
}

/**
 * Puts the chosen banners and reaction video on a ready-made Short, on this PC.
 * The video is re-framed into the space they leave; nothing is cut off its length.
 */
export async function addBannersLocally(
  file: Blob,
  chosenBanners: Partial<Record<BannerPosition, BannerDoc>>,
  { cropMode, outputQuality }: SettingsDoc["processing"],
  reaction: HeldReaction | null = null,
): Promise<{ video: Blob; thumbnail: Blob | null; durationSec: number }> {
  const query = new URLSearchParams({ cropMode, quality: outputQuality, banners: JSON.stringify(await bannerSources(chosenBanners)), reaction: JSON.stringify(reaction) });
  const { jobId } = (await (await helper(`/wrap?${query}`, { method: "POST", headers: { "Content-Type": "video/mp4" }, body: file })).json()) as { jobId: string };
  try {
    let job: HelperJob;
    while (true) {
      job = (await (await helper(`/jobs/${jobId}`)).json()) as HelperJob;
      if (job.status === "failed") throw new Error(job.error ?? "The Short couldn't be rendered.");
      if (job.status === "done") break;
      await pause(1000);
    }
    const [part] = job.parts;
    const video = await (await helper(`/jobs/${jobId}/1.mp4`)).blob();
    const thumbnail = part.hasThumbnail ? await (await helper(`/jobs/${jobId}/1.jpg`)).blob() : null;
    return { video, thumbnail, durationSec: part.durationSec };
  } finally {
    void fetch(`${HELPER}/jobs/${jobId}`, { method: "DELETE" }).catch(() => undefined);
  }
}

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
  /** What to do with the seconds left over after the last full-length Short. */
  tail: TailMode = "own",
  /** A reaction video played in a strip on every Short. */
  reactionChoice: (ReactionLook & { file: Blob }) | null = null,
): Promise<number> {
  const { db, storage } = firebase();
  onProgress({ stage: "Starting", percent: 0 });
  if ((await pickEngine()) === "browser") return splitInBrowser(video, shortDuration, settings, onProgress, chosenBanners, label, tail, reactionChoice);
  // The helper keeps the one reaction video and puts it on every Short it cuts.
  let reaction: HeldReaction | null = null;
  if (reactionChoice) {
    const { file, ...look } = reactionChoice;
    reaction = { ...look, id: await holdReaction(file) };
  }

  const { cropMode, outputQuality } = settings.processing;
  const run = newRunId();
  let jobId: string | null = null;

  try {
    const url = await getDownloadURL(storageRef(storage, video.storagePath));
    const banners = await bannerSources(chosenBanners);
    ({ jobId } = (await (
      await helper("/split", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, shortDuration, cropMode, quality: outputQuality, banners, label, tail, reaction }) })
    ).json()) as { jobId: string });

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
        // Shorts stay on their video's channel.
        ...(video.connectionId ? { connectionId: video.connectionId } : {}),
      });
    }
    onProgress({ stage: "Done", percent: 100 });
    return total;
  } finally {
    if (jobId) void fetch(`${HELPER}/jobs/${jobId}`, { method: "DELETE" }).catch(() => undefined);
    if (reaction) releaseReaction(reaction.id);
  }
}
