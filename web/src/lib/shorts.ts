import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { COLLECTIONS, type PrivacyStatus, type ShortDoc, type ShortStatus, type YoutubeCheckState } from "@shortflow/shared";
import { firebase } from "./firebase/client";

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

/** How YouTube counts keywords towards its 500-character limit (commas included). */
export function tagChars(tags: string[]) {
  return tags.join(",").length;
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

export type ShortFilter = "all" | "ready" | "queued" | "published" | "blocked" | "failed";

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
