"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MAX_SOURCE_VIDEO_BYTES, formatBytes, videoTypeForFile, type TimestampLike, type VideoDoc } from "@shortflow/shared";
import type { WithId } from "./firebase/hooks";

/**
 * Long videos stay on the user's PC — kept in this browser (IndexedDB), never
 * uploaded. Only the Shorts cut from them are saved to the cloud, because
 * YouTube publishing runs from there. The PC helper (or this browser) reads the
 * file straight from here when it cuts.
 */
const DB_NAME = "shortflow-local-videos";
const STORE = "videos";

/** Black bars baked into the picture: the area that is real picture, in the file's own pixels. */
export interface PictureCrop {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface LocalVideo {
  id: string;
  uid: string;
  connectionId: string | null;
  title: string;
  fileName: string;
  size: number;
  contentType: string;
  addedAt: number;
  durationSec: number;
  width: number;
  height: number;
  /** Null when there are no bars, or they couldn't be measured. */
  crop: PictureCrop | null;
  /** Whether this browser can play it (for the preview). The PC helper can cut it either way. */
  playable: boolean;
  shortsCount: number;
  file: Blob;
  thumbnail: Blob | null;
}

/** A video in the library: one kept on this PC carries `local`. */
export type LibraryVideo = WithId<VideoDoc> & { local?: LocalVideo };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store<T>(mode: IDBTransactionMode, work: (videos: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

// ─── A small app-wide store, so every page sees the same list and adds keep going between pages ───

/** A file being read and saved, shown as a card until it is in. */
export interface AddingVideo {
  id: string;
  fileName: string;
  size: number;
  connectionId: string | null;
  error: string | null;
}

let videos: LocalVideo[] = [];
let adding: AddingVideo[] = [];
let loadedFor: string | null = null;
let snapshot = { videos, adding, loaded: false };
const listeners = new Set<() => void>();

function emit() {
  snapshot = { videos, adding, loaded: loadedFor !== null };
  listeners.forEach((listener) => listener());
}

async function load(uid: string) {
  if (loadedFor === uid) return;
  loadedFor = uid;
  try {
    const all = await store<LocalVideo[]>("readonly", (s) => s.getAll());
    videos = all.filter((v) => v.uid === uid).sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    videos = [];
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = { videos: [] as LocalVideo[], adding: [] as AddingVideo[], loaded: false };

/** The videos kept on this PC for `uid`, and the ones still being added. */
export function useLocalVideos(uid: string | undefined) {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  useEffect(() => {
    if (uid) void load(uid);
  }, [uid]);
  return uid && loadedFor === uid ? state : serverSnapshot;
}

const timestamp = (ms: number) => ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as TimestampLike;

/** A local video in the shape the library's cards and dialogs already know. */
export function asLibraryVideo(video: LocalVideo): LibraryVideo {
  return {
    id: video.id,
    userId: video.uid,
    title: video.title,
    fileName: video.fileName,
    storagePath: "",
    contentType: video.contentType,
    fileSize: video.size,
    status: "uploaded",
    createdAt: timestamp(video.addedAt),
    uploadedAt: timestamp(video.addedAt),
    durationSec: video.durationSec,
    width: video.width,
    height: video.height,
    thumbnailPath: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    shortsCount: video.shortsCount,
    activeJobId: null,
    errorMessage: null,
    connectionId: video.connectionId,
    local: video,
  };
}

async function update(id: string, change: (video: LocalVideo) => LocalVideo) {
  const current = videos.find((v) => v.id === id);
  if (!current) return;
  const next = change(current);
  videos = videos.map((v) => (v.id === id ? next : v));
  emit();
  await store("readwrite", (s) => s.put(next)).catch(() => undefined);
}

export const renameLocalVideo = (id: string, title: string) => update(id, (v) => ({ ...v, title: title.trim().slice(0, 200) }));

export const countLocalShorts = (id: string, added: number) => update(id, (v) => ({ ...v, shortsCount: v.shortsCount + added }));

/** Removes it from this browser. The file on the PC and the Shorts already made stay. */
export async function deleteLocalVideo(id: string) {
  videos = videos.filter((v) => v.id !== id);
  emit();
  await store("readwrite", (s) => s.delete(id)).catch(() => undefined);
}

export function dismissAdding(id: string) {
  adding = adding.filter((a) => a.id !== id);
  emit();
}

export interface RejectedLocalFile {
  name: string;
  reason: string;
}

/** Adds video files to the library on this PC. Returns the ones refused straight away. */
export function addLocalVideos(files: Iterable<File>, uid: string, connectionId?: string | null): RejectedLocalFile[] {
  const rejected: RejectedLocalFile[] = [];
  // Asks the browser not to clear the videos when the disk gets full. Fine if it says no.
  void navigator.storage?.persist?.().catch(() => false);
  for (const file of files) {
    if (!videoTypeForFile(file.name, file.type)) rejected.push({ name: file.name, reason: "Unsupported format — use MP4, MOV, MKV or WebM." });
    else if (file.size > MAX_SOURCE_VIDEO_BYTES) rejected.push({ name: file.name, reason: `Too large (${formatBytes(file.size)}). The limit is 10 GB.` });
    else if (file.size === 0) rejected.push({ name: file.name, reason: "This file is empty." });
    else void addOne(file, uid, connectionId ?? null);
  }
  return rejected;
}

async function addOne(file: File, uid: string, connectionId: string | null) {
  const id = crypto.randomUUID();
  adding = [...adding, { id, fileName: file.name, size: file.size, connectionId, error: null }];
  emit();
  try {
    const info = await inspectVideo(file);
    const video: LocalVideo = {
      id,
      uid,
      connectionId,
      title: file.name.replace(/\.[^.]+$/, "").trim().slice(0, 200) || "Untitled video",
      fileName: file.name.slice(0, 255),
      size: file.size,
      contentType: videoTypeForFile(file.name, file.type) ?? "video/mp4",
      addedAt: Date.now(),
      shortsCount: 0,
      file,
      ...info,
    };
    try {
      await store("readwrite", (s) => s.put(video));
    } catch (error) {
      console.warn("Couldn't keep the video in this browser:", error);
      // Still usable until the page is closed.
    }
    if (loadedFor === uid) videos = [video, ...videos];
    adding = adding.filter((a) => a.id !== id);
    emit();
  } catch (error) {
    adding = adding.map((a) => (a.id === id ? { ...a, error: error instanceof Error ? error.message : "This file couldn't be read." } : a));
    emit();
  }
}

// ─── Reading a file on this PC: length, size, a thumbnail and any black bars ───

function waitFor(video: HTMLVideoElement, event: string, ms = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => (cleanup(), reject(new Error("timeout"))), ms);
    const done = () => (cleanup(), resolve());
    const failed = () => (cleanup(), reject(video.error ?? new Error("error")));
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", failed);
    };
    video.addEventListener(event, done, { once: true });
    video.addEventListener("error", failed, { once: true });
  });
}

async function seek(video: HTMLVideoElement, at: number) {
  video.currentTime = at;
  await waitFor(video, "seeked");
}

/** Rows and columns of a frame that hold real picture (anything brighter than near-black). */
function pictureBox(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const bright = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] > 24;
  // A line counts as picture once more than 2% of it is bright, so compression noise in a bar doesn't.
  const rowHas = (y: number) => {
    let n = 0;
    for (let x = 0; x < w; x++) if (bright((y * w + x) * 4)) n++;
    return n > w * 0.02;
  };
  const colHas = (x: number) => {
    let n = 0;
    for (let y = 0; y < h; y++) if (bright((y * w + x) * 4)) n++;
    return n > h * 0.02;
  };
  let top = 0;
  while (top < h && !rowHas(top)) top++;
  if (top === h) return null; // A black frame says nothing.
  let bottom = h - 1;
  while (bottom > top && !rowHas(bottom)) bottom--;
  let left = 0;
  while (left < w && !colHas(left)) left++;
  let right = w - 1;
  while (right > left && !colHas(right)) right--;
  return { top, bottom, left, right };
}

/** Same rules as the PC helper's `detectCrop()`: the widest picture seen wins, and only clear bars are removed. */
function measureBars(boxes: Array<ReturnType<typeof pictureBox>>, w: number, h: number, width: number, height: number): PictureCrop | null {
  const found = boxes.filter((b): b is NonNullable<typeof b> => b !== null);
  if (found.length === 0) return null;
  const sx = width / w;
  const sy = height / h;
  const left = 2 * Math.floor((Math.min(...found.map((b) => b.left)) * sx) / 2);
  const top = 2 * Math.floor((Math.min(...found.map((b) => b.top)) * sy) / 2);
  const right = Math.min(width, Math.ceil((Math.max(...found.map((b) => b.right)) + 1) * sx));
  const bottom = Math.min(height, Math.ceil((Math.max(...found.map((b) => b.bottom)) + 1) * sy));
  const crop = { x: left, y: top, width: 2 * Math.floor((right - left) / 2), height: 2 * Math.floor((bottom - top) / 2) };
  const sensible = crop.width >= width / 2 && crop.height >= height / 2;
  const worthIt = crop.width < width * 0.97 || crop.height < height * 0.97;
  return sensible && worthIt ? crop : null;
}

type VideoInfo = Pick<LocalVideo, "durationSec" | "width" | "height" | "crop" | "playable" | "thumbnail">;

/** Reads a video file on this PC. Throws with a message for the user if it isn't a video at all. */
export async function inspectVideo(file: File): Promise<VideoInfo> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    video.src = url;
    await waitFor(video, "loadedmetadata");
    let duration = video.duration;
    if (!Number.isFinite(duration)) {
      // Some WebM files only learn their length at the end.
      await seek(video, 1e7).catch(() => undefined);
      duration = video.duration;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height || !(duration > 0)) throw new Error("no picture");

    const cw = Math.min(320, width);
    const ch = Math.max(2, Math.round((height * cw) / width));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const boxes: Array<ReturnType<typeof pictureBox>> = [];
    let thumbnail: Blob | null = null;
    if (ctx) {
      for (const share of [0.2, 0.5, 0.8]) {
        try {
          await seek(video, duration * share);
          ctx.drawImage(video, 0, 0, cw, ch);
          boxes.push(pictureBox(ctx, cw, ch));
        } catch {
          // That moment couldn't be shown; the others still count.
        }
      }
      try {
        await seek(video, Math.min(duration * 0.1, 30));
        const still = document.createElement("canvas");
        still.width = 480;
        still.height = Math.max(2, Math.round((height * 480) / width));
        still.getContext("2d")?.drawImage(video, 0, 0, still.width, still.height);
        thumbnail = await new Promise<Blob | null>((resolve) => still.toBlob(resolve, "image/jpeg", 0.8));
      } catch {
        thumbnail = null;
      }
    }
    return { durationSec: Math.round(duration * 100) / 100, width, height, crop: measureBars(boxes, cw, ch, width, height), playable: true, thumbnail };
  } catch {
    // This browser can't play it; read its length and size from the file itself, so the PC helper can still cut it.
    try {
      const { ALL_FORMATS, BlobSource, Input } = await import("mediabunny");
      const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
      try {
        const track = await input.getPrimaryVideoTrack();
        const durationSec = await input.computeDuration();
        if (!track || !(durationSec > 0)) throw new Error("no video");
        return { durationSec: Math.round(durationSec * 100) / 100, width: track.displayWidth, height: track.displayHeight, crop: null, playable: false, thumbnail: null };
      } finally {
        input.dispose();
      }
    } catch {
      throw new Error("This file isn't a video this browser can read. Export it as MP4 (H.264) and add it again.");
    }
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** An object URL for a blob, for as long as the component shows it. */
export function useBlobUrl(blob: Blob | null | undefined) {
  const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL must be made and revoked with the blob's lifetime
    setMade({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return blob && made?.blob === blob ? made.url : null;
}
