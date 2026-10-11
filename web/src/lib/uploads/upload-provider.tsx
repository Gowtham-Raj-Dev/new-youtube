"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, type UploadTask } from "firebase/storage";
import { FirebaseError } from "firebase/app";
import { COLLECTIONS, MAX_SOURCE_VIDEO_BYTES, formatBytes, storagePaths, videoTypeForFile } from "@shortflow/shared";
import { firebase } from "@/lib/firebase/client";

export type UploadState = "uploading" | "verifying" | "error";

export interface UploadItem {
  videoId: string;
  fileName: string;
  size: number;
  transferred: number;
  /** Smoothed bytes/second. */
  speed: number;
  etaSec: number | null;
  state: UploadState;
  error: string | null;
}

export interface RejectedFile {
  name: string;
  reason: string;
}

interface UploadContextValue {
  uploads: UploadItem[];
  byVideoId: Map<string, UploadItem>;
  addFiles: (files: Iterable<File>) => RejectedFile[];
  cancel: (videoId: string) => Promise<void>;
  retry: (videoId: string) => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

function friendlyUploadError(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : "";
  switch (code) {
    case "storage/unauthorized":
      return "Upload was rejected. Make sure it's a supported video under 10 GB.";
    case "storage/retry-limit-exceeded":
      return "The connection dropped for too long. Check your internet and retry.";
    case "storage/quota-exceeded":
      return "Storage is full. Free up space and retry.";
    case "permission-denied":
      return "Couldn't start this upload. Please sign in again and retry.";
    default:
      return "Upload failed. Please retry.";
  }
}

/**
 * App-wide upload manager: uploads keep running while the user moves between
 * pages. Each file goes straight from the browser to Storage with a resumable
 * upload (streamed in chunks, never loaded into memory). A reservation doc in
 * `videos` is created first — storage.rules only accept files that match it.
 */
export function UploadProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, UploadItem>>(new Map());
  const files = useRef(new Map<string, File>());
  const tasks = useRef(new Map<string, UploadTask>());
  const watchers = useRef(new Map<string, () => void>());
  /** Video ids whose reservation doc exists, so a retry can reuse it. */
  const reserved = useRef(new Set<string>());

  const patch = useCallback((videoId: string, update: Partial<UploadItem> | null) => {
    setItems((prev) => {
      const next = new Map(prev);
      if (update === null) next.delete(videoId);
      else {
        const current = next.get(videoId);
        if (current) next.set(videoId, { ...current, ...update });
      }
      return next;
    });
  }, []);

  const forget = useCallback(
    (videoId: string) => {
      files.current.delete(videoId);
      tasks.current.delete(videoId);
      reserved.current.delete(videoId);
      watchers.current.get(videoId)?.();
      watchers.current.delete(videoId);
      patch(videoId, null);
    },
    [patch],
  );

  /** Once bytes are in, wait for the server check to move the doc out of `uploading`. */
  const watchVerification = useCallback(
    (videoId: string) => {
      const unsubscribe = onSnapshot(
        doc(firebase().db, COLLECTIONS.videos, videoId),
        (snap) => {
          if (!snap.exists() || snap.get("status") !== "uploading") forget(videoId);
        },
        // A deleted doc reads as permission-denied (rules check the owner field), so treat errors as "gone".
        () => forget(videoId),
      );
      watchers.current.set(videoId, unsubscribe);
    },
    [forget],
  );

  const upload = useCallback(
    (videoId: string, file: File, path: string, contentType: string) => {
      const task = uploadBytesResumable(storageRef(firebase().storage, path), file, { contentType });
      tasks.current.set(videoId, task);

      let lastAt = performance.now();
      let lastBytes = 0;
      let speed = 0;
      let lastRender = 0;

      task.on(
        "state_changed",
        (snap) => {
          const now = performance.now();
          const elapsed = now - lastAt;
          if (elapsed >= 1000) {
            const instant = ((snap.bytesTransferred - lastBytes) / elapsed) * 1000;
            speed = speed ? speed * 0.7 + instant * 0.3 : instant;
            lastAt = now;
            lastBytes = snap.bytesTransferred;
          }
          if (now - lastRender < 250 && snap.bytesTransferred < snap.totalBytes) return;
          lastRender = now;
          patch(videoId, {
            transferred: snap.bytesTransferred,
            speed,
            etaSec: speed > 0 ? (snap.totalBytes - snap.bytesTransferred) / speed : null,
          });
        },
        (error) => {
          tasks.current.delete(videoId);
          if (error instanceof FirebaseError && error.code === "storage/canceled") return;
          patch(videoId, { state: "error", error: friendlyUploadError(error), speed: 0, etaSec: null });
        },
        () => {
          tasks.current.delete(videoId);
          patch(videoId, { state: "verifying", transferred: file.size, speed: 0, etaSec: 0 });
          watchVerification(videoId);
        },
      );
    },
    [patch, watchVerification],
  );

  const start = useCallback(
    async (file: File) => {
      const { auth, db } = firebase();
      const uid = auth.currentUser?.uid;
      const contentType = videoTypeForFile(file.name, file.type);
      if (!uid || !contentType) return;

      const ref = doc(collection(db, COLLECTIONS.videos));
      const path = storagePaths.sourceVideo(uid, ref.id, contentType);
      files.current.set(ref.id, file);
      setItems((prev) =>
        new Map(prev).set(ref.id, {
          videoId: ref.id,
          fileName: file.name,
          size: file.size,
          transferred: 0,
          speed: 0,
          etaSec: null,
          state: "uploading",
          error: null,
        }),
      );

      try {
        // Field set must match the `videos` create rule exactly.
        await setDoc(ref, {
          userId: uid,
          title: file.name.replace(/\.[^.]+$/, "").trim().slice(0, 200) || "Untitled video",
          fileName: file.name.slice(0, 255),
          storagePath: path,
          contentType,
          fileSize: file.size,
          status: "uploading",
          createdAt: serverTimestamp(),
          uploadedAt: null,
          durationSec: null,
          width: null,
          height: null,
          thumbnailPath: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          shortsCount: 0,
          activeJobId: null,
          errorMessage: null,
        });
      } catch (error) {
        patch(ref.id, { state: "error", error: friendlyUploadError(error) });
        return;
      }
      reserved.current.add(ref.id);
      upload(ref.id, file, path, contentType);
    },
    [patch, upload],
  );

  const addFiles = useCallback(
    (incoming: Iterable<File>) => {
      const rejected: RejectedFile[] = [];
      for (const file of incoming) {
        if (!videoTypeForFile(file.name, file.type)) {
          rejected.push({ name: file.name, reason: "Unsupported format — use MP4, MOV, MKV or WebM." });
        } else if (file.size > MAX_SOURCE_VIDEO_BYTES) {
          rejected.push({ name: file.name, reason: `Too large (${formatBytes(file.size)}). The limit is 10 GB.` });
        } else if (file.size === 0) {
          rejected.push({ name: file.name, reason: "This file is empty." });
        } else {
          void start(file);
        }
      }
      return rejected;
    },
    [start],
  );

  const cancel = useCallback(
    async (videoId: string) => {
      tasks.current.get(videoId)?.cancel();
      forget(videoId);
      // Allowed by rules only while the doc is still `uploading`.
      await deleteDoc(doc(firebase().db, COLLECTIONS.videos, videoId)).catch(() => undefined);
    },
    [forget],
  );

  const retry = useCallback(
    (videoId: string) => {
      const file = files.current.get(videoId);
      const contentType = file && videoTypeForFile(file.name, file.type);
      const uid = firebase().auth.currentUser?.uid;
      if (!file || !contentType || !uid) return;
      if (!reserved.current.has(videoId)) {
        // The reservation was never written; start over with a fresh one.
        forget(videoId);
        void start(file);
        return;
      }
      patch(videoId, { state: "uploading", error: null, transferred: 0, speed: 0, etaSec: null });
      upload(videoId, file, storagePaths.sourceVideo(uid, videoId, contentType), contentType);
    },
    [forget, patch, start, upload],
  );

  // Closing the tab kills in-flight uploads, so ask first.
  const hasActive = [...items.values()].some((i) => i.state === "uploading");
  useEffect(() => {
    if (!hasActive) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasActive]);

  useEffect(() => {
    const active = watchers.current;
    return () => active.forEach((unsubscribe) => unsubscribe());
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({ uploads: [...items.values()], byVideoId: items, addFiles, cancel, retry }),
    [items, addFiles, cancel, retry],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploads() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside <UploadProvider>.");
  return ctx;
}
