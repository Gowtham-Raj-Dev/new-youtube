import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref as storageRef, uploadBytes, uploadBytesResumable } from "firebase/storage";
import {
  COLLECTIONS,
  MAX_SHORT_SECONDS,
  directUploadVideoId,
  newRunId,
  shortFileName,
  shortIdFor,
  storagePaths,
  youtubeTagChars,
  type BannerDoc,
  type BannerPosition,
  type PrivacyStatus,
  type ReactionLook,
  type SettingsDoc,
  type ShortDoc,
  type ShortStatus,
  type YoutubeCheckState,
} from "@shortflow/shared";
import { firebase } from "./firebase/client";
import { bannerBitmaps, wrapInBrowser } from "./browser-splitter";
import { HelperOfflineError, addBannersLocally, pickEngine, holdReaction, releaseReaction, type HeldReaction } from "./local-splitter";

/** YouTube's limits; firestore.rules enforces the first two and the tag count. */
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_MAX = 30;
export const TAG_CHARS_MAX = 500;

export interface ShortMetadata {
  title: string;
  description: string;
  tags: string[];
  privacy: PrivacyStatus;
}

export async function saveShortMetadata(shortId: string, metadata: ShortMetadata) {
  await updateDoc(doc(firebase().db, COLLECTIONS.shorts, shortId), {
    title: metadata.title.trim().slice(0, TITLE_MAX),
    description: metadata.description.slice(0, DESCRIPTION_MAX),
    tags: metadata.tags.slice(0, TAGS_MAX),
    privacy: metadata.privacy,
  });
}

/** Cleans what the user typed into keywords: no `#`, no empties, no repeats. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const tag = raw.trim().replace(/^#+/, "").replace(/[<>]/g, "");
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/** How YouTube counts keywords towards its 500-character limit: commas, plus quotes around multi-word tags. */
export function tagChars(tags: string[]) {
  return youtubeTagChars(tags);
}

const CALL_LIMIT = 50;

export interface QueueResult {
  queued: number;
  firstAt: number;
  lastAt: number;
  /** "Upload now" only: how many are already on YouTube. The rest follow within minutes. */
  uploaded: number;
}

/** "Submit to queue": the server gives each Short the next free slot of the publishing schedule, in this order. */
export async function queueShorts(shortIds: string[], connectionId?: string, now = false, safe = false): Promise<QueueResult> {
  // "Upload now" uploads inside the call, so it can run for minutes — well past the default 70-second wait.
  const call = httpsCallable<{ shortIds: string[]; connectionId?: string; now?: boolean; safe?: boolean }, QueueResult>(firebase().functions, "queueShorts", { timeout: 540_000 });
  let result: QueueResult | null = null;
  for (let i = 0; i < shortIds.length; i += CALL_LIMIT) {
    const { data } = await call({ shortIds: shortIds.slice(i, i + CALL_LIMIT), connectionId, now, safe });
    result = result ? { queued: result.queued + data.queued, firstAt: result.firstAt, lastAt: data.lastAt, uploaded: result.uploaded + data.uploaded } : data;
  }
  return result!;
}

/** Asks YouTube whether an uploaded Short is live, blocked or rejected. The answer is also saved on the Short. */
export async function checkYouTubeStatus(shortId: string): Promise<{ state: YoutubeCheckState; detail: string }> {
  const { data } = await httpsCallable<{ shortId: string }, { state: YoutubeCheckState; detail: string }>(firebase().functions, "checkYouTubeStatus")({ shortId });
  return data;
}

/** Deletes Shorts from ShortFlow and their files from Storage. Ones already on YouTube stay on YouTube. */
export async function deleteShorts(shortIds: string[]): Promise<{ deleted: number; skipped: number }> {
  const call = httpsCallable<{ shortIds: string[] }, { deleted: number; skipped: number }>(firebase().functions, "deleteShorts", { timeout: 300_000 });
  const total = { deleted: 0, skipped: 0 };
  for (let i = 0; i < shortIds.length; i += CALL_LIMIT) {
    const { data } = await call({ shortIds: shortIds.slice(i, i + CALL_LIMIT) });
    total.deleted += data.deleted;
    total.skipped += data.skipped;
  }
  return total;
}

export async function unqueueShort(shortId: string) {
  await httpsCallable(firebase().functions, "unqueueShort")({ shortId });
}

/**
 * Saves each Short's MP4 to the user's downloads folder. The files are stored
 * with an `attachment` disposition, so opening the URL downloads instead of playing.
 */
export async function downloadShorts(shorts: Array<Pick<ShortDoc, "storagePath">>) {
  for (const short of shorts) {
    const url = await getDownloadURL(storageRef(firebase().storage, short.storagePath));
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = url;
    document.body.appendChild(frame);
    setTimeout(() => frame.remove(), 60_000);
    // Browsers drop downloads fired in the same instant.
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
}

/** Must match the Short size limit in storage.rules. */
export const MAX_SHORT_FILE_BYTES = 500 * 1024 * 1024;

export interface RejectedShortFile {
  name: string;
  reason: string;
}

export interface ImportProgress {
  index: number;
  total: number;
  /** Of the upload of file `index`, 0–100. */
  percent: number;
  /** The PC helper is still putting the banners or reaction video on this file; its upload hasn't started. */
  rendering?: boolean;
}

/** The reaction video picked for a set of Shorts, and how it sits in its strip above or below each Short's own video. */
export interface ReactionChoice extends ReactionLook {
  file: File;
}

interface ProbedShort {
  durationSec: number;
  width: number;
  height: number;
  thumbnail: Blob | null;
}

/** Reads a video file's length and frame size in the browser, and grabs a frame for its thumbnail. */
function probeShortFile(file: File): Promise<ProbedShort | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let settled = false;
    const finish = (result: ProbedShort | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };
    const measured = (thumbnail: Blob | null) => finish({ durationSec: video.duration, width: video.videoWidth, height: video.videoHeight, thumbnail });
    // A file the browser can measure but not seek in still gets added, just without a thumbnail.
    const timer = setTimeout(() => (video.videoWidth > 0 && Number.isFinite(video.duration) ? measured(null) : finish(null)), 20_000);

    video.onerror = () => finish(null);
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.videoWidth === 0) return finish(null);
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      try {
        const scale = Math.min(1, 540 / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => measured(blob), "image/jpeg", 0.8);
      } catch {
        measured(null);
      }
    };
    video.src = url;
  });
}

/**
 * Adds ready-made Shorts straight from the user's files: each MP4 is saved to
 * Storage and registered as a Short, with no cutting. They show up as "ready",
 * like the ones cut from a video. Files that can't be Shorts come back in `rejected`.
 * With `banners` or a `reaction` video, the PC helper puts them on each one first (framed as `settings.processing.cropMode` says).
 * `connectionId` is the channel they are added on, the only one they then show on.
 */
export async function uploadShortFiles(
  files: File[],
  uid: string,
  settings: Pick<SettingsDoc, "processing" | "publishing">,
  onProgress: (progress: ImportProgress) => void,
  banners: Partial<Record<BannerPosition, BannerDoc>> = {},
  reaction: ReactionChoice | null = null,
  connectionId?: string,
): Promise<{ added: number; rejected: RejectedShortFile[] }> {
  const { db, storage } = firebase();
  const videoId = directUploadVideoId(uid);
  const run = newRunId();
  const rejected: RejectedShortFile[] = [];
  let added = 0;
  const withBanners = Boolean(banners.top || banners.bottom || reaction);
  // Rendered by the PC helper when it is running, otherwise in this browser.
  const engine = withBanners ? await pickEngine() : null;
  const bitmaps = engine === "browser" ? await bannerBitmaps(banners) : null;
  // The helper keeps the one reaction video and puts it on every file.
  const held: HeldReaction | null = engine === "helper" && reaction ? { id: await holdReaction(reaction.file), position: reaction.position, percent: reaction.percent, fit: reaction.fit, focus: reaction.focus, sound: reaction.sound } : null;

  for (const [index, file] of files.entries()) {
    const report = (percent: number, rendering = false) => onProgress({ index, total: files.length, percent, rendering });
    report(0, withBanners);
    if (file.type !== "video/mp4" && !/\.mp4$/i.test(file.name)) {
      rejected.push({ name: file.name, reason: "not an MP4 file" });
      continue;
    }
    if (file.size === 0 || file.size > MAX_SHORT_FILE_BYTES) {
      rejected.push({ name: file.name, reason: file.size === 0 ? "the file is empty" : "larger than 500 MB" });
      continue;
    }
    const probe = await probeShortFile(file);
    if (!probe) {
      rejected.push({ name: file.name, reason: "your browser couldn't read this video" });
      continue;
    }
    if (probe.durationSec > MAX_SHORT_SECONDS) {
      rejected.push({ name: file.name, reason: "longer than 3 minutes, so YouTube won't treat it as a Short" });
      continue;
    }
    if (probe.width > probe.height) {
      rejected.push({ name: file.name, reason: "a wide video — Shorts must be vertical or square" });
      continue;
    }

    let video: Blob = file;
    let { durationSec, thumbnail } = probe;
    if (withBanners) {
      try {
        const wrapped = bitmaps ? await wrapInBrowser(file, bitmaps, settings.processing, reaction) : await addBannersLocally(file, banners, settings.processing, held);
        video = wrapped.video;
        durationSec = wrapped.durationSec;
        thumbnail = wrapped.thumbnail ?? thumbnail;
      } catch (err) {
        // Without the helper none of the remaining files can get their banners either.
        if (err instanceof HelperOfflineError) throw err;
        rejected.push({ name: file.name, reason: reaction ? "it couldn't be rendered with the reaction video" : "the banners couldn't be added to it" });
        continue;
      }
    }

    try {
      const shortId = shortIdFor(videoId, run, index);
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[<>]/g, "").trim().slice(0, TITLE_MAX) || `Short ${index + 1}`;
      const storagePath = storagePaths.shortVideo(uid, shortId);
      const task = uploadBytesResumable(storageRef(storage, storagePath), video, {
        contentType: "video/mp4",
        cacheControl: "private, max-age=86400",
        contentDisposition: `attachment; filename="${shortFileName(title)}"`,
      });
      task.on("state_changed", (snap) => report((snap.bytesTransferred / snap.totalBytes) * 100));
      await task;

      let thumbnailPath: string | null = null;
      if (thumbnail) {
        thumbnailPath = storagePaths.shortThumbnail(uid, shortId);
        await uploadBytes(storageRef(storage, thumbnailPath), thumbnail, { contentType: "image/jpeg", cacheControl: "private, max-age=86400" });
      }

      // Field set must match firestore.rules.
      await setDoc(doc(db, COLLECTIONS.shorts, shortId), {
        userId: uid,
        videoId,
        segmentIndex: index,
        startSec: 0,
        endSec: durationSec,
        durationSec,
        storagePath,
        thumbnailPath,
        cropMode: settings.processing.cropMode,
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
        ...(connectionId ? { connectionId } : {}),
      });
      added++;
    } catch (err) {
      console.error("Saving a Short failed:", err);
      // Firebase refusing the write is a setup problem (rules not deployed), not the connection.
      const refused = ["permission-denied", "storage/unauthorized"].includes((err as { code?: string }).code ?? "");
      rejected.push({ name: file.name, reason: refused ? "Firebase refused to save it — the security rules need deploying (npm run deploy:rules)" : "the upload failed — check your connection and try again" });
    }
  }
  if (held) releaseReaction(held.id);
  return { added, rejected };
}

export type ShortFilter ="all" | "ready" | "queued" | "published" | "blocked" | "failed";

export const SHORT_FILTER_STATUSES: Record<Exclude<ShortFilter, "all" | "blocked">, ShortStatus[]> = {
  ready: ["ready"],
  queued: ["scheduled", "uploading", "quota_exceeded"],
  published: ["published"],
  failed: ["failed"],
};

/** Uploaded, but YouTube is hiding it: a copyright block, a rejection, or a takedown. */
export function isBlockedOnYouTube(short: Pick<ShortDoc, "youtubeCheck">) {
  const state = short.youtubeCheck?.state;
  return state === "blocked" || state === "rejected" || state === "removed";
}

export function matchesShortFilter(short: Pick<ShortDoc, "status" | "youtubeCheck">, filter: ShortFilter) {
  if (filter === "all") return true;
  if (filter === "blocked") return isBlockedOnYouTube(short);
  return SHORT_FILTER_STATUSES[filter].includes(short.status);
}

const RECHECK_AFTER_MS = 6 * 60 * 60 * 1000;

/** Published Shorts whose YouTube status has never been checked, is still settling, or is stale. */
export function needsYouTubeCheck(short: Pick<ShortDoc, "status" | "youtubeVideoId" | "youtubeCheck">, now: number) {
  if (short.status !== "published" || !short.youtubeVideoId) return false;
  const check = short.youtubeCheck;
  if (!check || check.state === "processing") return true;
  return now - (check.checkedAt?.toMillis?.() ?? 0) > RECHECK_AFTER_MS;
}

/** Shorts the user can still put in the queue. */
export function canQueue(short: Pick<ShortDoc, "status">) {
  return short.status === "ready" || short.status === "failed";
}

/** Metadata is locked while uploading and once on YouTube (same condition as firestore.rules). */
export function canEdit(short: Pick<ShortDoc, "status">) {
  return short.status !== "uploading" && short.status !== "published";
}

export function youtubeShortUrl(youtubeVideoId: string) {
  return `https://www.youtube.com/shorts/${youtubeVideoId}`;
}
