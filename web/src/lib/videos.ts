"use client";

import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { COLLECTIONS, type VideoDoc, type VideoStatus } from "@shortflow/shared";
import { firebase } from "./firebase/client";

export type DeleteMode = "everything" | "source" | "shorts";

export async function deleteVideo(videoId: string, mode: DeleteMode) {
  await httpsCallable(firebase().functions, "deleteVideo")({ videoId, mode });
}

export async function renameVideo(videoId: string, title: string) {
  await updateDoc(doc(firebase().db, COLLECTIONS.videos, videoId), { title: title.trim().slice(0, 200) });
}

export type VideoFilter = "all" | "ready" | "processing" | "failed";

export const FILTER_STATUSES: Record<Exclude<VideoFilter, "all">, VideoStatus[]> = {
  ready: ["uploaded", "completed"],
  processing: ["uploading", "queued", "processing"],
  failed: ["failed"],
};

export function matchesFilter(video: Pick<VideoDoc, "status">, filter: VideoFilter) {
  return filter === "all" || FILTER_STATUSES[filter].includes(video.status);
}

// Download URLs are stable per object; cache them for the session.
const urlCache = new Map<string, Promise<string | null>>();

/** Signed download URL for an owner-readable Storage path (thumbnails, Shorts). */
export function useStorageUrl(path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let pending = urlCache.get(path);
    if (!pending) {
      pending = getDownloadURL(storageRef(firebase().storage, path)).catch(() => null);
      urlCache.set(path, pending);
    }
    void pending.then((u) => !cancelled && setUrl(u));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return path ? url : null;
}
