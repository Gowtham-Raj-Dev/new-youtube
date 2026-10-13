"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { DEFAULT_TIMEZONE, type ActivityLogDoc, type ActivityType } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannels } from "@/components/providers/channel-provider";
import { useRecentActivity, useUserDoc, type WithId } from "@/lib/firebase/hooks";
import { dayKey, formatInZone, toDate } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityIcon } from "@/components/dashboard/activity-feed";
import { cn } from "@/lib/cn";

const PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

type Filter = "all" | "videos" | "shorts" | "youtube" | "problems";
const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "youtube", label: "YouTube" },
  { id: "problems", label: "Problems" },
];

function matches(type: ActivityType, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "problems") return type.endsWith("_FAILED");
  if (filter === "videos") return type.startsWith("VIDEO_");
  if (filter === "shorts") return type.startsWith("SHORT_");
  return type.startsWith("YOUTUBE_");
}

/** Where to go to see the thing an entry is about. */
const REF_LINKS: Record<NonNullable<ActivityLogDoc["refType"]>, { href: string; label: string }> = {
  video: { href: "/videos", label: "Videos" },
  short: { href: "/shorts", label: "Shorts" },
  schedule: { href: "/queue", label: "Queue" },
  youtube: { href: "/youtube", label: "YouTube" },
};

/** "Today", "Yesterday", or the date. */
function dayHeading(date: Date, timeZone: string, now: number) {
  const key = dayKey(date, timeZone);
  if (key === dayKey(new Date(now), timeZone)) return "Today";
  if (key === dayKey(new Date(now - DAY_MS), timeZone)) return "Yesterday";
  return formatInZone(date, timeZone, { dateStyle: undefined, timeStyle: undefined, weekday: "long", day: "numeric", month: "long" });
}

export default function ActivityLogPage() {
  const { user } = useAuth();
  const { data: profile } = useUserDoc(user?.uid);
  const [count, setCount] = useState(PAGE);
  const { data: loaded, loading, error } = useRecentActivity(user?.uid, count);
  // With several channels connected, only what happened on the one picked in the top bar.
  const { owns } = useChannels();
  const data = useMemo(() => loaded.filter(owns), [loaded, owns]);
  const [filter, setFilter] = useState<Filter>("all");
  const [now] = useState(() => Date.now());
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const groups = useMemo(() => {
    const byDay: Array<{ heading: string; items: WithId<ActivityLogDoc>[] }> = [];
    for (const item of data) {
      if (!matches(item.type, filter)) continue;
      const heading = dayHeading(toDate(item.createdAt) ?? new Date(now), timeZone, now);
      const last = byDay[byDay.length - 1];
      if (last?.heading === heading) last.items.push(item);
      else byDay.push({ heading, items: [item] });
    }
    return byDay;
  }, [data, filter, timeZone, now]);
  // A full page means there may be older entries still on the server.
  const more = loaded.length >= count;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Activity</h2>
        <p className="mt-1 text-sm text-muted">Everything that happened to your videos, Shorts and YouTube channel, newest first.</p>
      </div>

      {error && <Alert tone="error">We couldn&apos;t load your activity. Check your connection and refresh the page.</Alert>}

      {data.length > 0 && (
        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-line bg-surface/60 p-1" role="tablist">
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
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", filter === f.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-faint")}>
                {data.filter((item) => matches(item.type, f.id)).length}
                {more && "+"}
              </span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="space-y-5 p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </Card>
      ) : data.length === 0 ? (
        !error && (
          <Card>
            <EmptyState icon={<Activity className="size-5" />} title="No activity yet" description="Uploads, scheduling and YouTube publishing will appear here as they happen." />
          </Card>
        )
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Activity className="size-5" />} title="Nothing here" description={more ? "Nothing of this kind in the entries loaded so far. Load older ones below." : "Nothing of this kind has happened yet."} />
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.heading} className="space-y-3">
            <h3 className="text-[13px] font-semibold tracking-tight text-muted">{group.heading}</h3>
            <Card>
              <ol className="divide-y divide-line">
                {group.items.map((item) => {
                  const at = toDate(item.createdAt);
                  const link = item.refType && REF_LINKS[item.refType];
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                      <ActivityIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] leading-snug">{item.message}</p>
                        <p className="mt-0.5 text-[12px] tabular-nums text-faint">{at ? formatInZone(at, timeZone, { dateStyle: undefined, timeStyle: "short" }) : "Just now"}</p>
                      </div>
                      {link && (
                        <Link href={link.href} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted transition hover:bg-white/[0.05] hover:text-text">
                          {link.label}
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>
        ))
      )}

      {!loading && more && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setCount((c) => c + PAGE)}>
            Load older activity
          </Button>
        </div>
      )}
    </div>
  );
}
