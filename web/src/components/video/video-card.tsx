"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import type { ReactNode } from "react";
import { CircleAlert, Clapperboard, Film, LoaderCircle, Pencil, RotateCcw, Scissors, Trash2, X } from "lucide-react";
import { formatBytes, formatDuration, type VideoDoc } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import type { UploadItem } from "@/lib/uploads/upload-provider";
import { useStorageUrl } from "@/lib/videos";
import { formatInZone, toDate } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";

export interface VideoCardActions {
  onRename?: () => void;
  onDelete?: () => void;
  onCancelUpload?: () => void;
  onRetryUpload?: () => void;
  /** Cut this video into Shorts. */
  onGenerate?: () => void;
}

/** A verified source whose file is still there. It can be cut as many times as the user likes. */
function canGenerate(video: VideoDoc) {
  return !video.sourceDeletedAt && (video.status === "uploaded" || video.status === "completed");
}

type Phase = "uploading" | "verifying" | "upload-error" | "interrupted" | VideoDoc["status"];

function phaseOf(video: VideoDoc, upload?: UploadItem): Phase {
  if (video.status !== "uploading") return video.status;
  if (!upload) return "interrupted";
  if (upload.state === "error") return "upload-error";
  return upload.state;
}

function StatusBadge({ phase }: { phase: Phase }) {
  switch (phase) {
    case "uploading":
      return <Badge tone="accent" dot>Uploading</Badge>;
    case "verifying":
      return <Badge tone="accent" dot>Checking</Badge>;
    case "upload-error":
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    case "interrupted":
      return <Badge tone="warning">Interrupted</Badge>;
    case "queued":
    case "processing":
      return <Badge tone="warning" dot>Processing</Badge>;
    case "completed":
      return <Badge tone="success">Shorts ready</Badge>;
    default:
      return <Badge tone="success">Ready</Badge>;
  }
}

function formatEta(sec: number | null) {
  if (sec == null || !Number.isFinite(sec)) return "estimating…";
  if (sec < 60) return `${Math.max(1, Math.round(sec))}s left`;
  if (sec < 3600) return `${Math.round(sec / 60)} min left`;
  return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m left`;
}

function UploadOverlay({ upload, onCancel }: { upload: UploadItem; onCancel?: () => void }) {
  const pct = upload.size ? Math.min(100, (upload.transferred / upload.size) * 100) : 0;
  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(180deg,rgb(8_8_10/0.2),rgb(8_8_10/0.92))] p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{pct.toFixed(0)}%</p>
          <p className="mt-0.5 text-[12px] text-muted tabular-nums">
            {formatBytes(upload.transferred)} of {formatBytes(upload.size)}
          </p>
        </div>
        <div className="text-right text-[12px] tabular-nums text-muted">
          <p>{upload.speed > 0 ? `${formatBytes(upload.speed)}/s` : "starting…"}</p>
          <p>{formatEta(upload.etaSec)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent shadow-[0_0_12px_var(--accent)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        {onCancel && (
          <button onClick={onCancel} className="grid size-6 place-items-center rounded-md text-muted hover:bg-white/10 hover:text-text" aria-label="Cancel upload">
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function CenterNote({ icon, title, body, children }: { icon: ReactNode; title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-bg/70 px-4 text-center backdrop-blur-[2px]">
      {icon}
      <p className="text-[13px] font-medium">{title}</p>
      {body && <p className="line-clamp-2 text-[12px] text-muted">{body}</p>}
      {children && <div className="mt-2 flex gap-2">{children}</div>}
    </div>
  );
}

function Thumbnail({ video }: { video: WithId<VideoDoc> }) {
  const url = useStorageUrl(video.thumbnailPath);
  if (url) return <img src={url} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]" />;
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#241a4d,#0e0d14_70%)]">
      <Film className="size-8 text-white/15" />
    </div>
  );
}

export function VideoCard({
  video,
  upload,
  timezone,
  ...actions
}: { video: WithId<VideoDoc>; upload?: UploadItem; timezone: string } & VideoCardActions) {
  const phase = phaseOf(video, upload);
  const created = toDate(video.createdAt);
  const generatable = Boolean(actions.onGenerate) && canGenerate(video);
  const menu = [
    ...(generatable ? [{ label: "Generate Shorts", icon: <Scissors className="size-3.5" />, onSelect: actions.onGenerate! }] : []),
    ...(actions.onRename && video.status !== "uploading" ? [{ label: "Rename", icon: <Pencil className="size-3.5" />, onSelect: actions.onRename }] : []),
    ...(actions.onDelete && phase !== "uploading" && phase !== "verifying"
      ? [{ label: "Delete", icon: <Trash2 className="size-3.5" />, onSelect: actions.onDelete, danger: true }]
      : []),
  ];

  return (
    <Card className="group overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_20px_40px_-20px_rgb(0_0_0/0.8)]">
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <Thumbnail video={video} />
        {generatable && <button type="button" onClick={actions.onGenerate} className="absolute inset-0" aria-label={`Open ${video.title}`} />}
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <StatusBadge phase={phase === "uploaded" && video.shortsCount > 0 ? "completed" : phase} />
        </div>
        {video.durationSec != null && (
          <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white backdrop-blur">
            {formatDuration(video.durationSec)}
          </span>
        )}

        {phase === "uploading" && upload && <UploadOverlay upload={upload} onCancel={actions.onCancelUpload} />}
        {phase === "verifying" && (
          <CenterNote icon={<LoaderCircle className="size-5 animate-spin text-accent" />} title="Checking video…" body="Reading duration and making a thumbnail" />
        )}
        {phase === "upload-error" && (
          <CenterNote icon={<CircleAlert className="size-5 text-danger" />} title="Upload failed" body={upload?.error ?? undefined}>
            <Button size="sm" icon={<RotateCcw className="size-3.5" />} onClick={actions.onRetryUpload}>
              Retry
            </Button>
            <Button size="sm" variant="ghost" onClick={actions.onCancelUpload}>
              Remove
            </Button>
          </CenterNote>
        )}
        {phase === "interrupted" && (
          <CenterNote icon={<CircleAlert className="size-5 text-warning" />} title="Upload interrupted" body="The page was closed before it finished. Upload the file again.">
            <Button size="sm" variant="secondary" onClick={actions.onDelete}>
              Remove
            </Button>
          </CenterNote>
        )}
        {phase === "failed" && <CenterNote icon={<CircleAlert className="size-5 text-danger" />} title="Couldn't use this file" body={video.errorMessage ?? undefined} />}
      </div>

      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold tracking-tight" title={video.title}>
            {video.title}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
            <span>{formatBytes(video.fileSize)}</span>
            {created && (
              <>
                <span className="text-faint">·</span>
                <span>{formatInZone(created, timezone, { timeStyle: undefined })}</span>
              </>
            )}
            <span className="text-faint">·</span>
            <span className="inline-flex items-center gap-1">
              <Clapperboard className="size-3" />
              {video.shortsCount} Shorts
            </span>
          </p>
          {generatable && (
            <Button size="sm" className="mt-3" icon={<Scissors className="size-3.5" />} onClick={actions.onGenerate}>
              Generate Shorts
            </Button>
          )}
        </div>
        {menu.length > 0 && <Menu items={menu} label={`Actions for ${video.title}`} />}
      </div>
    </Card>
  );
}

export function VideoCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}
