"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import { Check, Clapperboard } from "lucide-react";
import { formatDuration, type ShortDoc, type ShortStatus } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { isBlockedOnYouTube } from "@/lib/shorts";
import { useStorageUrl } from "@/lib/videos";
import { formatInZone, toDate } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

export function ShortStatusBadge({ status }: { status: ShortStatus }) {
  switch (status) {
    case "scheduled":
      return <Badge tone="accent">Queued</Badge>;
    case "uploading":
      return <Badge tone="accent" dot>Uploading</Badge>;
    case "published":
      return <Badge tone="success">Published</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    case "quota_exceeded":
      return <Badge tone="warning">Waiting</Badge>;
    default:
      return <Badge>Ready</Badge>;
  }
}

export function ShortThumbnail({ short, className }: { short: Pick<ShortDoc, "thumbnailPath">; className?: string }) {
  const url = useStorageUrl(short.thumbnailPath);
  if (url) return <img src={url} alt="" loading="lazy" className={cn("size-full object-cover", className)} />;
  return (
    <div className={cn("grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#241a4d,#0e0d14_70%)]", className)}>
      <Clapperboard className="size-6 text-white/15" />
    </div>
  );
}

/** One line under the title saying where this Short is in its life. */
function StatusLine({ short, timezone }: { short: ShortDoc; timezone: string }) {
  const publishAt = toDate(short.publishAt);
  const publishedAt = toDate(short.publishedAt);
  if (short.pendingPrivacy) return <span className="text-warning">Unlisted on YouTube — checking for copyright, then it goes {short.pendingPrivacy}</span>;
  const check = short.youtubeCheck;
  if (check && (check.state === "blocked" || check.state === "rejected" || check.state === "removed")) return <span className="text-danger">{check.detail}</span>;
  if (short.status === "published" && publishedAt) return <>Published {formatInZone(publishedAt, timezone)}</>;
  if ((short.status === "failed" || short.status === "quota_exceeded") && short.errorMessage) {
    return <span className={short.status === "failed" ? "text-danger" : "text-warning"}>{short.errorMessage}</span>;
  }
  if (publishAt && short.status !== "ready") return <>Goes out {formatInZone(publishAt, timezone)}</>;
  return (
    <>
      Part {short.segmentIndex + 1} · {formatDuration(short.startSec)}–{formatDuration(short.endSec)}
    </>
  );
}

export function ShortCard({
  short,
  timezone,
  selected,
  copyrightRisk,
  onToggle,
  onOpen,
}: {
  short: WithId<ShortDoc>;
  timezone: string;
  selected: boolean;
  /** Not uploaded yet, but another Short cut from the same video was blocked for copyright. */
  copyrightRisk?: boolean;
  /** Omit for Shorts that can't be queued; no checkbox is shown. */
  onToggle?: () => void;
  onOpen: () => void;
}) {
  return (
    <Card className={cn("group overflow-hidden transition duration-300 hover:border-line-strong", selected && "border-accent/60 shadow-[0_0_0_3px_var(--accent-soft)]")}>
      <div className="relative aspect-[9/16] overflow-hidden bg-surface-2">
        <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`Open ${short.title}`}>
          <ShortThumbnail short={short} className="transition duration-500 group-hover:scale-[1.03]" />
        </button>
        <div className="pointer-events-none absolute left-2.5 top-2.5">
          {isBlockedOnYouTube(short) ? (
            <Badge tone="danger">{short.youtubeCheck?.state === "blocked" ? "Copyright block" : "Not on YouTube"}</Badge>
          ) : copyrightRisk ? (
            <Badge tone="warning">Copyright risk</Badge>
          ) : (
            <ShortStatusBadge status={short.status} />
          )}
        </div>
        {onToggle && (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            aria-label={`Select ${short.title}`}
            onClick={onToggle}
            className={cn(
              "absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md border transition",
              selected ? "border-accent bg-accent text-white" : "border-white/40 bg-black/40 text-transparent backdrop-blur hover:border-white",
            )}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </button>
        )}
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white backdrop-blur">
          {formatDuration(short.durationSec)}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="block w-full p-3 text-left">
        <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight" title={short.title}>
          {short.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[12px] text-muted">
          {copyrightRisk ? <span className="text-warning">Another part of this video was blocked for copyright. This one will very likely be blocked too.</span> : <StatusLine short={short} timezone={timezone} />}
        </p>
      </button>
    </Card>
  );
}

export function ShortCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[9/16] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  );
}
