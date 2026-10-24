"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, CloudUpload, FolderUp, Scissors, X } from "lucide-react";
import { formatBytes } from "@shortflow/shared";
import { useChannelUploads, useChannelWork } from "@/components/providers/channel-provider";
import { describeImport, importPercent } from "@/lib/work/work-provider";
import { cn } from "@/lib/cn";

/** One job in the tray. Clicking it opens the page the job belongs to; finished ones can be dismissed. */
function TrayCard({
  href,
  icon,
  tone = "accent",
  title,
  detail,
  percent,
  onDismiss,
}: {
  href: string;
  icon: ReactNode;
  tone?: "accent" | "success" | "danger";
  title: string;
  detail: string;
  /** 0–100 while running; left out once finished. */
  percent?: number;
  onDismiss?: () => void;
}) {
  return (
    <div className="relative animate-enter rounded-2xl border border-line-strong bg-surface-2/95 shadow-2xl shadow-black/60 backdrop-blur-xl transition hover:border-accent/40">
      <Link href={href} className="block p-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone === "accent" ? "bg-accent-soft text-accent" : tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{icon}</span>
          <div className={cn("min-w-0 flex-1", onDismiss && "pr-6")}>
            <p className="truncate text-[13px] font-medium">{title}</p>
            <p className={cn("text-[11.5px] tabular-nums text-muted", percent === undefined ? "line-clamp-3" : "truncate")}>{detail}</p>
          </div>
        </div>
        {percent !== undefined && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}
      </Link>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-faint transition hover:bg-white/[0.06] hover:text-text">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Floating cards for everything still running in the background: video uploads,
 * Shorts being added from files, and videos being cut. A job is left out on the
 * page that already shows it.
 */
export function UploadTray() {
  // Only the jobs of the channel on screen; another channel's keep running and show when switched back to it.
  const { uploads } = useChannelUploads();
  const { importJob, dismissImport, splits, dismissSplit } = useChannelWork();
  const pathname = usePathname();
  const onVideos = pathname.startsWith("/videos");
  const onShorts = pathname.startsWith("/shorts");
  const cards: ReactNode[] = [];

  const active = uploads.filter((u) => u.state !== "error");
  if (active.length > 0 && !onVideos) {
    const total = active.reduce((s, u) => s + u.size, 0);
    const done = active.reduce((s, u) => s + u.transferred, 0);
    const pct = total ? (done / total) * 100 : 0;
    const speed = active.reduce((s, u) => s + u.speed, 0);
    const verifying = active.every((u) => u.state === "verifying");
    cards.push(
      <TrayCard
        key="uploads"
        href="/videos"
        icon={<CloudUpload className="size-4" />}
        title={`${verifying ? "Checking" : "Uploading"} ${active.length} video${active.length > 1 ? "s" : ""}`}
        detail={verifying ? "Almost done…" : `${pct.toFixed(0)}% · ${speed > 0 ? `${formatBytes(speed)}/s` : "starting…"}`}
        percent={verifying ? 100 : pct}
      />,
    );
  }

  if (importJob && !onShorts) {
    const { progress } = importJob;
    if (importJob.status === "working") {
      const percent = importPercent(progress);
      cards.push(
        <TrayCard
          key="import"
          href="/shorts"
          icon={<FolderUp className="size-4" />}
          title={`${progress.rendering ? "Rendering" : "Uploading"} Short ${progress.index + 1} / ${progress.total}`}
          detail={`${percent.toFixed(0)}% of your files done`}
          percent={percent}
        />,
      );
    } else {
      const { tone, message } = describeImport(importJob);
      cards.push(
        <TrayCard
          key="import"
          href="/shorts"
          icon={tone === "success" ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
          tone={tone === "success" ? "success" : "danger"}
          title={tone === "success" ? "Shorts added" : "Adding Shorts had problems"}
          detail={message}
          onDismiss={dismissImport}
        />,
      );
    }
  }

  for (const job of splits.values()) {
    if (job.status === "working") {
      cards.push(<TrayCard key={job.videoId} href="/videos" icon={<Scissors className="size-4" />} title={job.title} detail={`${job.progress.stage} · ${Math.round(job.progress.percent)}%`} percent={job.progress.percent} />);
    } else if (!onVideos) {
      const done = job.status === "done";
      cards.push(
        <TrayCard
          key={job.videoId}
          href={done ? "/shorts" : "/videos"}
          icon={done ? <CircleCheck className="size-4" /> : <CircleAlert className="size-4" />}
          tone={done ? "success" : "danger"}
          title={job.title}
          detail={done ? `${job.count === 1 ? "1 Short is" : `${job.count} Shorts are`} ready on the Shorts page.` : (job.error ?? "The video couldn't be cut.")}
          onDismiss={() => dismissSplit(job.videoId)}
        />,
      );
    }
  }

  if (cards.length === 0) return null;
  return <div className="fixed bottom-24 right-4 z-40 flex w-[min(320px,calc(100vw-32px))] flex-col gap-2 lg:bottom-6 lg:right-6">{cards}</div>;
}
