"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Layers, ListX } from "lucide-react";
import { DEFAULT_SETTINGS, type ScheduleDoc, type ShortDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useSettings, useShorts, type WithId } from "@/lib/firebase/hooks";
import { unqueueShort, youtubeShortUrl } from "@/lib/shorts";
import { friendlyCallableError } from "@/lib/youtube";
import { formatInZone, toDate } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ShortStatusBadge, ShortThumbnail } from "@/components/short/short-card";

const DAY_MS = 24 * 60 * 60 * 1000;

function QueueRow({
  schedule,
  short,
  timezone,
  withDate,
  onError,
}: {
  schedule: WithId<ScheduleDoc>;
  short: WithId<ShortDoc> | undefined;
  timezone: string;
  /** Rows under a day heading only need the time. */
  withDate?: boolean;
  onError: (message: string) => void;
}) {
  const [removing, setRemoving] = useState(false);
  const at = toDate(schedule.publishAt);
  const removable = schedule.status === "scheduled" || schedule.status === "failed" || schedule.status === "quota_exceeded";

  async function remove() {
    setRemoving(true);
    try {
      await unqueueShort(schedule.id);
    } catch (error) {
      onError(friendlyCallableError(error));
      setRemoving(false);
    }
  }

  return (
    <li className="flex items-center gap-3.5 px-5 py-3">
      <div className="aspect-[9/16] w-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">{short && <ShortThumbnail short={short} />}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{short?.title ?? "Deleted Short"}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-muted">
          {schedule.errorMessage ? (
            <span className={schedule.status === "failed" ? "text-danger" : "text-warning"}>{schedule.errorMessage}</span>
          ) : (
            at && formatInZone(at, timezone, withDate ? {} : { dateStyle: undefined })
          )}
        </p>
      </div>
      <ShortStatusBadge status={schedule.status} />
      {schedule.youtubeVideoId ? (
        <a href={youtubeShortUrl(schedule.youtubeVideoId)} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "sm")} aria-label="View on YouTube">
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">YouTube</span>
        </a>
      ) : (
        removable && (
          <Button variant="ghost" size="sm" icon={<ListX className="size-3.5" />} loading={removing} onClick={remove} aria-label="Remove from queue">
            <span className="hidden sm:inline">Remove</span>
          </Button>
        )
      )}
    </li>
  );
}

export default function UploadQueuePage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: schedules, loading, error } = useSchedules(uid);
  const { data: shorts } = useShorts(uid);
  const { data: settings } = useSettings(uid);
  const [banner, setBanner] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const timezone = (settings ?? DEFAULT_SETTINGS).publishing.timezone;
  const shortsById = useMemo(() => new Map(shorts.map((s) => [s.id, s])), [shorts]);

  const dayLabel = (ms: number) => formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "long", day: "numeric", month: "long" });
  const friendlyDay = (ms: number) => {
    const label = dayLabel(ms);
    if (label === dayLabel(now)) return `Today · ${label}`;
    if (label === dayLabel(now + DAY_MS)) return `Tomorrow · ${label}`;
    return label;
  };

  // Schedules arrive earliest first. Still-to-go ones are grouped by day; finished ones are shown newest first.
  const { days, finished } = useMemo(() => {
    const days: Array<{ label: string; items: WithId<ScheduleDoc>[] }> = [];
    const finished: WithId<ScheduleDoc>[] = [];
    for (const schedule of schedules) {
      if (schedule.status === "published" || schedule.status === "failed") {
        finished.unshift(schedule);
        continue;
      }
      const label = friendlyDay(toDate(schedule.publishAt)?.getTime() ?? 0);
      const last = days[days.length - 1];
      if (last?.label === label) last.items.push(schedule);
      else days.push({ label, items: [schedule] });
    }
    return { days, finished };
    // `friendlyDay` only depends on timezone and the fixed `now`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, timezone, now]);

  const waiting = days.reduce((sum, day) => sum + day.items.length, 0);
  const empty = !loading && waiting === 0 && finished.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Queue</h2>
          <p className="mt-1 text-sm text-muted">What&apos;s waiting to go out, and what happened to the last week&apos;s uploads. Times are in {timezone.replaceAll("_", " ")}.</p>
        </div>
        <ButtonLink href="/schedule" variant="secondary" className="shrink-0">
          Change schedule
        </ButtonLink>
      </div>

      {banner && (
        <Alert tone="error" onDismiss={() => setBanner(null)}>
          {banner}
        </Alert>
      )}
      {error && <Alert tone="error">We couldn&apos;t load the queue. Check your connection and refresh the page.</Alert>}

      {loading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : empty ? (
        <Card>
          <EmptyState
            icon={<Layers className="size-5" />}
            title="Nothing in the queue"
            description="Open the Shorts page, pick the ones you want and press Submit to queue."
            action={<ButtonLink href="/shorts">Go to Shorts</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          {waiting > 0 && (
            <Card>
              <CardHeader title="Going out" description={`${waiting} Short${waiting === 1 ? "" : "s"} waiting for ${waiting === 1 ? "its" : "their"} slot.`} />
              <div className="mt-3">
                {days.map((day) => (
                  <section key={day.label}>
                    <h3 className="border-y border-line bg-white/[0.02] px-5 py-2 text-[12px] font-medium uppercase tracking-wider text-faint">{day.label}</h3>
                    <ul className="divide-y divide-line">
                      {day.items.map((schedule) => (
                        <QueueRow key={schedule.id} schedule={schedule} short={shortsById.get(schedule.id)} timezone={timezone} onError={setBanner} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </Card>
          )}

          {finished.length > 0 && (
            <Card>
              <CardHeader title="Last 7 days" description="Published Shorts, and any that couldn't be uploaded." />
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {finished.map((schedule) => (
                  <QueueRow key={schedule.id} schedule={schedule} short={shortsById.get(schedule.id)} timezone={timezone} withDate onError={setBanner} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
