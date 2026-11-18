import { doc, updateDoc } from "firebase/firestore";
import { getBlob, getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { COLLECTIONS, TRIM_MIN_SECONDS, shortFileName, storagePaths, type ShortDoc } from "@shortflow/shared";
import { BrowserRenderError, canRenderInBrowser, trimInBrowser } from "./browser-render";
import type { WithId } from "./firebase/hooks";
import { firebase } from "./firebase/client";
import { HELPER, HelperOfflineError } from "./local-splitter";

/**
 * Trimming a finished Short: its start and end are moved and it is saved
 * again. The Short as it was before the first trim is kept (untrimmed.mp4), and
 * every trim is cut from that, so a trim can be widened again or undone.
 */

/** Fresh files are fetched again rather than served from the browser's cache. */
const FRESH = { cacheControl: "private, max-age=0, no-cache" };

/** The untrimmed Short (or the Short itself, while it has never been trimmed): where to play it from, and its length. */
export function trimSourcePath(short: WithId<ShortDoc>) {
  return short.trim ? storagePaths.shortUntrimmed(short.userId, short.id) : short.storagePath;
}

export function fullLength(short: ShortDoc) {
  return short.trim?.fullSec ?? short.durationSec;
}

/** Asks the PC helper; null when it isn't running (or is too old to know `path`). */
async function askHelper(path: string, body: unknown): Promise<Response | null> {
  let res: Response;
  try {
    res = await fetch(`${HELPER}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return null;
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("The PC helper couldn't do that. Check its window for details.");
  return res;
}

/**
 * The bytes of a file in Storage. The PC helper fetches it when it is running
 * (the browser itself may not be let to); otherwise the Firebase SDK does.
 */
export async function storedFile(path: string): Promise<Blob> {
  const { storage } = firebase();
  const url = await getDownloadURL(storageRef(storage, path));
  // The helper's voice change at pitch 1 hands back an untouched copy.
  const viaHelper = await askHelper("/voice", { url, pitch: 1 });
  if (viaHelper) return viaHelper.blob();
  try {
    return await getBlob(storageRef(storage, path));
  } catch (error) {
    console.error("Couldn't read the Short from Storage in this browser:", error);
    throw new Error("This browser couldn't read the Short from storage. Start the PC helper (“npm run dev”, or ShortFlowHelper.exe) and try again.");
  }
}

/** `startSec`…`endSec` of the Storage file at `path`, cut on this PC (the helper) or else in this browser. */
export async function cutVideo(path: string, startSec: number, endSec: number, onProgress?: (share: number) => void): Promise<Blob> {
  const url = await getDownloadURL(storageRef(firebase().storage, path));
  const viaHelper = await askHelper("/trim", { url, startSec, endSec });
  if (viaHelper) return viaHelper.blob();
  if (!(await canRenderInBrowser())) throw new HelperOfflineError();
  return trimInBrowser(await storedFile(path), startSec, endSec, onProgress);
}

/** A thumbnail like the Shorts get: a frame about a second in, 540 wide. Null if the browser can't show it. */
export async function thumbnailOf(video: Blob): Promise<Blob | null> {
  const url = URL.createObjectURL(video);
  const el = document.createElement("video");
  el.muted = true;
  el.playsInline = true;
  el.preload = "auto";
  try {
    el.src = url;
    await new Promise<void>((resolve, reject) => {
      el.onloadeddata = () => resolve();
      el.onerror = () => reject(new Error("unreadable"));
    });
    el.currentTime = Math.min(1, el.duration / 2 || 0);
    await new Promise<void>((resolve) => {
      el.onseeked = () => resolve();
    });
    const canvas = document.createElement("canvas");
    canvas.width = 540;
    canvas.height = Math.round((el.videoHeight / el.videoWidth) * 540) || 960;
    canvas.getContext("2d")?.drawImage(el, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  } catch {
    return null;
  } finally {
    el.removeAttribute("src");
    el.load();
    URL.revokeObjectURL(url);
  }
}

export type TrimStage = "keeping" | "cutting" | "saving";

/**
 * Keeps `startSec`…`endSec` of the untrimmed Short. Picking the whole of it
 * undoes the trim. Seconds are of the untrimmed Short.
 */
export async function trimShort(short: WithId<ShortDoc>, startSec: number, endSec: number, onStage: (stage: TrimStage, share?: number) => void): Promise<void> {
  const { storage, db } = firebase();
  const uid = short.userId;
  const untrimmedPath = storagePaths.shortUntrimmed(uid, short.id);
  const full = fullLength(short);
  const start = Math.max(0, Math.round(startSec * 100) / 100);
  const end = Math.min(full, Math.round(endSec * 100) / 100);
  if (end - start < TRIM_MIN_SECONDS) throw new Error(`A Short must be at least ${TRIM_MIN_SECONDS} second long.`);
  const mp4 = { contentType: "video/mp4", contentDisposition: `attachment; filename="${shortFileName(short.title)}"`, ...FRESH };

  // The first trim keeps the Short as it is now, so later trims (and "whole") start from it.
  if (!short.trim) {
    onStage("keeping");
    const now = await storedFile(short.storagePath);
    await uploadBytes(storageRef(storage, untrimmedPath), now, { contentType: "video/mp4", ...FRESH });
  }
  const whole = start <= 0.05 && end >= full - 0.05;

  onStage("cutting", 0);
  const video = whole ? await storedFile(untrimmedPath) : await cutVideo(untrimmedPath, start, end, (share) => onStage("cutting", share));

  onStage("saving");
  await uploadBytes(storageRef(storage, short.storagePath), video, mp4);
  if (short.thumbnailPath) {
    const thumbnail = await thumbnailOf(video);
    if (thumbnail) await uploadBytes(storageRef(storage, short.thumbnailPath), thumbnail, { contentType: "image/jpeg", ...FRESH });
  }
  await updateDoc(doc(db, COLLECTIONS.shorts, short.id), {
    durationSec: Math.round((whole ? full : end - start) * 100) / 100,
    trim: whole ? null : { startSec: start, endSec: end, fullSec: full },
  });
}

/** In words, for the user. */
export function trimErrorMessage(error: unknown) {
  if (error instanceof HelperOfflineError || error instanceof BrowserRenderError) return error.message;
  if (error instanceof Error && /permission|unauthorized/i.test(`${error.message} ${(error as { code?: string }).code ?? ""}`)) {
    return "ShortFlow isn't allowed to save the trim yet — its database rules need updating (npm run deploy:rules).";
  }
  return error instanceof Error ? error.message : "The Short couldn't be trimmed. Please try again.";
}
