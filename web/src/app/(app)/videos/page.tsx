"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Film, Sparkles } from "lucide-react";
import { DEFAULT_TIMEZONE, type VideoDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useUserDoc, useVideos, type WithId } from "@/lib/firebase/hooks";
import { useUploads, type RejectedFile } from "@/lib/uploads/upload-provider";
import { matchesFilter, type VideoFilter } from "@/lib/videos";
import { generateShorts } from "@/lib/shorts";
import { friendlyCallableError } from "@/lib/youtube";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dropzone } from "@/components/video/dropzone";
import { VideoCard, VideoCardSkeleton } from "@/components/video/video-card";
import { DeleteVideoDialog, RenameVideoDialog } from "@/components/video/video-dialogs";
import { cn } from "@/lib/cn";

const FILTERS: Array<{ id: VideoFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "processing", label: "In progress" },
  { id: "failed", label: "Failed" },
];

export default function VideosPage() {
  const { user } = useAuth();
  const { data: profile } = useUserDoc(user?.uid);
  const { data: videos, loading, error } = useVideos(user?.uid);
  const { addFiles, byVideoId, cancel, retry, uploads } = useUploads();
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [deleting, setDeleting] = useState<WithId<VideoDoc> | null>(null);
  const [renaming, setRenaming] = useState<WithId<VideoDoc> | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, videos.filter((v) => matchesFilter(v, f.id)).length])) as Record<VideoFilter, number>,
    [videos],
  );
  const visible = videos.filter((v) => matchesFilter(v, filter));
  // Uploads that failed before their reservation doc existed have no card to show the error on.
  const unplaced = uploads.filter((u) => u.state === "error" && !videos.some((v) => v.id === u.videoId));

  function onFiles(files: File[]) {
    setRejected(addFiles(files));
  }

  async function generate(videoId: string) {
    setGenerateError(null);
    try {
      await generateShorts(videoId);
    } catch (err) {
      setGenerateError(friendlyCallableError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Video library</h2>
        <p className="mt-1 text-sm text-muted">Upload long-form videos. ShortFlow checks each one, then cuts it into vertical Shorts automatically.</p>
      </div>

      {!loading && <Dropzone onFiles={onFiles} compact={videos.length > 0} />}

      {rejected.length > 0 && (
        <Alert tone="error" onDismiss={() => setRejected([])}>
          <p className="font-medium">{rejected.length === 1 ? "1 file wasn't uploaded" : `${rejected.length} files weren't uploaded`}</p>
          <ul className="mt-1 space-y-0.5 text-[13px] text-muted">
            {rejected.map((r) => (
              <li key={r.name}>
                <span className="text-text">{r.name}</span> — {r.reason}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {unplaced.map((u) => (
        <Alert key={u.videoId} tone="error" onDismiss={() => void cancel(u.videoId)}>
          <span className="font-medium">{u.fileName}</span> — {u.error}{" "}
          <button onClick={() => retry(u.videoId)} className="font-medium text-accent hover:underline">
            Retry
          </button>
        </Alert>
      ))}
      {error && <Alert tone="error">We couldn&apos;t load your videos. Check your connection and refresh the page.</Alert>}
      {generateError && (
        <Alert tone="error" onDismiss={() => setGenerateError(null)}>
          {generateError}
        </Alert>
      )}

      {videos.length > 0 && (
        <Card className="flex items-center gap-3 border-accent/20 bg-[linear-gradient(100deg,var(--accent-soft),transparent_60%)] px-4 py-3">
          <Sparkles className="size-4 shrink-0 text-accent" />
          <p className="text-[13px] text-muted">
            <span className="font-medium text-text">New uploads are cut into vertical Shorts automatically.</span> For a video uploaded earlier, open its menu and choose Generate Shorts. Finished Shorts appear on the{" "}
            <Link href="/shorts" className="font-medium text-accent hover:underline">
              Shorts page
            </Link>
            .
          </p>
        </Card>
      )}

      {videos.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface/60 p-1 sm:w-fit" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition",
                filter === f.id ? "bg-white/[0.08] text-text" : "text-muted hover:text-text",
              )}
            >
              {f.label}
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", filter === f.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-faint")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              upload={byVideoId.get(video.id)}
              timezone={timezone}
              onRename={() => setRenaming(video)}
              onDelete={() => setDeleting(video)}
              onCancelUpload={() => void cancel(video.id)}
              onRetryUpload={() => retry(video.id)}
              onGenerate={() => void generate(video.id)}
            />
          ))}
        </div>
      ) : (
        videos.length > 0 && (
          <Card>
            <EmptyState icon={<Film className="size-5" />} title="Nothing here" description="No videos match this filter." />
          </Card>
        )
      )}

      {deleting && <DeleteVideoDialog video={deleting} onClose={() => setDeleting(null)} />}
      {renaming && <RenameVideoDialog video={renaming} onClose={() => setRenaming(null)} />}
    </div>
  );
}
