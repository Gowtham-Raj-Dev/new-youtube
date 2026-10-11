"use client";

import { Activity, CalendarClock, CircleCheck, CircleX, Clapperboard, Film, LoaderCircle, Trash2, Unplug, type LucideIcon } from "lucide-react";
import type { ActivityType } from "@shortflow/shared";
import { useRecentActivity } from "@/lib/firebase/hooks";
import { timeAgo, toDate } from "@/lib/time";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";

const ICONS: Partial<Record<ActivityType, { icon: LucideIcon | "youtube"; tint: string }>> = {
  VIDEO_UPLOADED: { icon: Film, tint: "text-text" },
  VIDEO_UPLOAD_FAILED: { icon: CircleX, tint: "text-danger" },
  VIDEO_DELETED: { icon: Trash2, tint: "text-muted" },
  VIDEO_PROCESSING_STARTED: { icon: LoaderCircle, tint: "text-warning" },
  VIDEO_PROCESSING_COMPLETED: { icon: CircleCheck, tint: "text-success" },
  VIDEO_PROCESSING_FAILED: { icon: CircleX, tint: "text-danger" },
  SHORT_GENERATED: { icon: Clapperboard, tint: "text-accent" },
  SHORT_SCHEDULED: { icon: CalendarClock, tint: "text-accent" },
  YOUTUBE_CONNECTED: { icon: "youtube", tint: "" },
  YOUTUBE_DISCONNECTED: { icon: Unplug, tint: "text-muted" },
  YOUTUBE_UPLOAD_STARTED: { icon: "youtube", tint: "" },
  YOUTUBE_UPLOAD_COMPLETED: { icon: CircleCheck, tint: "text-success" },
  YOUTUBE_UPLOAD_FAILED: { icon: CircleX, tint: "text-danger" },
};

/** The round icon for one kind of activity. */
export function ActivityIcon({ type }: { type: ActivityType }) {
  const meta = ICONS[type] ?? { icon: Activity, tint: "text-muted" };
  const Icon = meta.icon;
  return (
    <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-surface-2">
      {Icon === "youtube" ? <YouTubeIcon className="size-3.5" /> : <Icon className={cn("size-3.5", meta.tint)} />}
    </span>
  );
}

export function ActivityFeed({ uid }: { uid: string }) {
  const { data, loading } = useRecentActivity(uid, 8);

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState icon={<Activity className="size-5" />} title="No activity yet" description="Uploads, processing, scheduling and YouTube publishing will appear here as they happen." />;
  }

  return (
    <ol className="relative p-5">
      <span aria-hidden className="absolute bottom-8 left-[35px] top-8 w-px bg-line" />
      {data.map((item) => (
        <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          <ActivityIcon type={item.type} />
          <div className="min-w-0 pt-1">
            <p className="text-[13px] leading-snug">{item.message}</p>
            <p className="mt-0.5 text-[11.5px] text-faint">{timeAgo(toDate(item.createdAt))}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
