"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BannerDoc, BannerPosition, SettingsDoc, TailMode, VideoDoc } from "@shortflow/shared";
import { BrowserRenderError } from "@/lib/browser-render";
import { HelperOfflineError, ReactionVideoError, splitLocally, type SplitProgress } from "@/lib/local-splitter";
import { uploadShortFiles, type ImportProgress, type ReactionChoice, type RejectedShortFile } from "@/lib/shorts";

type WorkStatus = "working" | "done" | "failed";
type Settings = Pick<SettingsDoc, "processing" | "publishing">;
type ChosenBanners = Partial<Record<BannerPosition, BannerDoc>>;

/** Shorts being added from the user's files. Stays, finished, until dismissed, so its outcome can be shown on any page. */
export interface ImportJob {
  status: WorkStatus;
  progress: ImportProgress;
  added: number;
  rejected: RejectedShortFile[];
  error: string | null;
  /** The channel the Shorts are added on, so it shows only there. */
  connectionId: string | null;
}

/** One lot of files handed to startImport. */
interface ImportBatch {
  files: File[];
  uid: string;
  settings: Settings;
  banners: ChosenBanners;
  reaction: ReactionChoice | null;
  connectionId?: string;
}

/** One video being cut into Shorts. Stays, finished, until dismissed. */
export interface SplitJob {
  videoId: string;
  title: string;
  status: WorkStatus;
  progress: SplitProgress;
  /** Shorts made, once done. */
  count: number;
  error: string | null;
  /** The video's channel, so it shows only there. */
  connectionId: string | null;
}

interface WorkContextValue {
  importJob: ImportJob | null;
  startImport: (files: File[], uid: string, settings: Settings, banners: ChosenBanners, reaction?: ReactionChoice | null, connectionId?: string) => void;
  dismissImport: () => void;
  splits: Map<string, SplitJob>;
  startSplit: (video: VideoDoc & { id: string }, shortDuration: number, settings: Settings, banners: ChosenBanners, label: { template: string; x: number; y: number } | null, tail?: TailMode, reaction?: ReactionChoice | null) => void;
  dismissSplit: (videoId: string) => void;
}

const WorkContext = createContext<WorkContextValue | null>(null);

/** How a finished import went, in words for the user. */
export function describeImport(job: ImportJob): { tone: "success" | "error"; message: string } {
  if (job.status === "failed") return { tone: "error", message: job.error ?? "Couldn't upload your Shorts. Check your connection and try again." };
  const { added, rejected } = job;
  const skipped = rejected.map((r) => `“${r.name}” (${r.reason})`).join(", ");
  if (added === 0) return { tone: "error", message: `No Shorts were added. Skipped: ${skipped}.` };
  return {
    tone: rejected.length > 0 ? "error" : "success",
    message: `${added === 1 ? "1 Short" : `${added} Shorts`} added from your files.${rejected.length > 0 ? ` Skipped: ${skipped}.` : " Open one to set its title, or submit them to the queue."}`,
  };
}

/** Share of the whole import that is finished, 0–100. */
export function importPercent({ index, total, percent, rendering }: ImportProgress) {
  return total ? ((index + (rendering ? 0 : percent / 100)) / total) * 100 : 0;
}

/**
 * App-wide home for the slow jobs the browser drives itself — adding Shorts
 * from files and cutting a video into Shorts. They live above the page tree,
 * so they keep running, and keep reporting, while the user moves between pages.
 */
export function WorkProvider({ children }: { children: ReactNode }) {
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [splits, setSplits] = useState<Map<string, SplitJob>>(new Map());
  const importing = useRef(false);
  /** Batches added while one is being saved; they run one after another, as part of the same job. */
  const importQueue = useRef<ImportBatch[]>([]);
  /** Files of this job already through, from the batches before the running one. */
  const importDone = useRef(0);
  const splitting = useRef(new Set<string>());

  const runImports = useCallback(() => {
    const waiting = () => importQueue.current.reduce((sum, batch) => sum + batch.files.length, 0);
    const step = () => {
      const batch = importQueue.current.shift();
      if (!batch) {
        importing.current = false;
        setImportJob((job) => job && { ...job, status: "done" });
        return;
      }
      const before = importDone.current;
      // Progress counts across every batch of the job, so the bar runs once from start to end.
      const onProgress = (progress: ImportProgress) => setImportJob((job) => job && { ...job, progress: { ...progress, index: before + progress.index, total: before + progress.total + waiting() } });
      uploadShortFiles(batch.files, batch.uid, batch.settings, onProgress, batch.banners, batch.reaction, batch.connectionId)
        .then(({ added, rejected }) => {
          importDone.current += batch.files.length;
          setImportJob((job) => job && { ...job, added: job.added + added, rejected: [...job.rejected, ...rejected] });
          step();
        })
        .catch((err) => {
          // The helper or the renderer is gone, so the batches still waiting would fail the same way.
          importQueue.current = [];
          importing.current = false;
          setImportJob((job) => job && { ...job, status: "failed", error: err instanceof HelperOfflineError || err instanceof ReactionVideoError || err instanceof BrowserRenderError ? err.message : null });
        });
    };
    step();
  }, []);

  const startImport = useCallback(
    (files: File[], uid: string, settings: Settings, banners: ChosenBanners, reaction: ReactionChoice | null = null, connectionId?: string) => {
      if (files.length === 0) return;
      importQueue.current.push({ files, uid, settings, banners, reaction, connectionId });
      // One is already being saved: this batch waits its turn and joins the same job.
      if (importing.current) {
        setImportJob((job) => job && { ...job, progress: { ...job.progress, total: job.progress.total + files.length } });
        return;
      }
      importing.current = true;
      importDone.current = 0;
      setImportJob({ status: "working", progress: { index: 0, total: files.length, percent: 0 }, added: 0, rejected: [], error: null, connectionId: connectionId ?? null });
      runImports();
    },
    [runImports],
  );

  const dismissImport = useCallback(() => setImportJob((job) => (job?.status === "working" ? job : null)), []);

  const patchSplit = useCallback((videoId: string, update: Partial<SplitJob>) => {
    setSplits((prev) => {
      const current = prev.get(videoId);
      return current ? new Map(prev).set(videoId, { ...current, ...update }) : prev;
    });
  }, []);

  const startSplit = useCallback<WorkContextValue["startSplit"]>(
    (video, shortDuration, settings, banners, label, tail, reaction) => {
      if (splitting.current.has(video.id)) return;
      splitting.current.add(video.id);
      setSplits((prev) => new Map(prev).set(video.id, { videoId: video.id, title: video.title, status: "working", progress: { stage: "Starting", percent: 0 }, count: 0, error: null, connectionId: video.connectionId ?? null }));
      splitLocally(video, shortDuration, settings, (progress) => patchSplit(video.id, { progress }), banners, label, tail, reaction)
        .then((count) => patchSplit(video.id, { status: "done", count }))
        .catch((err) => patchSplit(video.id, { status: "failed", error: err instanceof Error ? err.message : "Something went wrong. Please try again." }))
        .finally(() => splitting.current.delete(video.id));
    },
    [patchSplit],
  );

  const dismissSplit = useCallback((videoId: string) => {
    setSplits((prev) => {
      if (prev.get(videoId)?.status === "working" || !prev.has(videoId)) return prev;
      const next = new Map(prev);
      next.delete(videoId);
      return next;
    });
  }, []);

  // Closing or reloading the tab would drop the work half-way, so ask first.
  const hasWork = importJob?.status === "working" || [...splits.values()].some((job) => job.status === "working");
  useEffect(() => {
    if (!hasWork) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasWork]);

  const value = useMemo<WorkContextValue>(
    () => ({ importJob, startImport, dismissImport, splits, startSplit, dismissSplit }),
    [importJob, startImport, dismissImport, splits, startSplit, dismissSplit],
  );

  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>;
}

export function useWork() {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error("useWork must be used inside <WorkProvider>.");
  return ctx;
}
