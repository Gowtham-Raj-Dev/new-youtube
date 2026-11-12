"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink, Layers, ListX, RefreshCw } from "lucide-react";
import { DEFAULT_SETTINGS, slotRulesFrom, type ScheduleDoc, type ShortDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannels } from "@/components/providers/channel-provider";
import { ChannelTabs } from "@/components/layout/channel-tabs";
import { useChannelSchedules, useChannelSettings, useSchedules, useShorts, type WithId } from "@/lib/firebase/hooks";
import { rescheduleQueue, scheduleFacts } from "@/lib/schedule";
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
  // Every connected channel queries and operates strictly on its own independent queue.
  const { active, multi, loading: channelsLoading, hrefFor } = useChannels();
  const { data: allSchedules, loading: allLoading, error: allError } = useSchedules(uid);
  const { data: channelSchedules, loading: channelLoading, error: channelError } = useChannelSchedules(uid, active?.id);
  const schedules = active ? channelSchedules : allSchedules;
  const loading = channelsLoading || (active ? channelLoading : allLoading);
  const error = active ? channelError : allError;
  const { data: shorts } = useShorts(uid);
  const { data: settings } = useChannelSettings(uid, active?.id);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [retiming, setRetiming] = useState(false);
  const [now] = useState(() => Date.now());

  const rules = slotRulesFrom(settings ?? DEFAULT_SETTINGS);
  const timezone = rules.timezone;
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

  async function retime() {
    setRetiming(true);
    setNotice(null);
    try {
      const { moved, firstAt, lastAt } = await rescheduleQueue(active?.id);
      if (multi && active && moved > waiting) {
        setNotice({
          tone: "error",
          message: `Server returned ${moved} Shorts instead of ${waiting} for ${active.channelTitle}. Deploy the updated Cloud Functions so each channel reschedules separately.`,
        });
        setRetiming(false);
        return;
      }
      const when = (ms: number) =>
        formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      setNotice({
        tone: "success",
        message:
          moved > 0 && firstAt && lastAt
            ? `Aligned ${moved} Short${moved === 1 ? "" : "s"} for ${active?.channelTitle ?? "this channel"} starting from today: first ${when(firstAt)}, last ${when(lastAt)}.`
            : "No waiting Shorts to reschedule.",
      });
    } catch (err) {
      setNotice({ tone: "error", message: friendlyCallableError(err) });
    }
    setRetiming(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Queue{multi && active ? ` · ${active.channelTitle}` : ""}</h2>
          <p className="mt-1 text-sm text-muted">What&apos;s waiting to go out on this channel, and the last week&apos;s uploads. Times are in {timezone.replaceAll("_", " ")}.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {waiting > 0 && (
            <Button variant="secondary" loading={retiming} icon={<RefreshCw className="size-4" />} onClick={() => void retime()}>
              Re-time from today
            </Button>
          )}
          <ButtonLink href={hrefFor("/schedule")} variant="secondary">
            Change schedule
          </ButtonLink>
        </div>
      </div>

      <ChannelTabs
        badgeFor={(id) => allSchedules.filter((s) => s.connectionId === id && s.status !== "published" && s.status !== "failed").length || undefined}
        caption="Each channel has its own independent queue"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-[12.5px]">
        <span className="flex items-center gap-2 font-medium">
          <CalendarClock className="size-3.5 shrink-0 text-accent" />
          {multi && active ? `${active.channelTitle} schedule` : "Schedule"}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {scheduleFacts(rules).map((fact) => (
            <span key={fact} className="rounded-lg bg-white/[0.06] px-2 py-0.5 tabular-nums text-muted">
              {fact}
            </span>
          ))}
        </span>
        <Link href={hrefFor("/schedule")} className="ml-auto font-medium text-accent hover:underline">
          Edit schedule
        </Link>
      </div>

      {notice && (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
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
            action={<ButtonLink href={hrefFor("/shorts")}>Go to Shorts</ButtonLink>}
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
                        <QueueRow
                          key={schedule.id}
                          schedule={schedule}
                          short={shortsById.get(schedule.id)}
                          timezone={timezone}
                          onError={(message) => setNotice({ tone: "error", message })}
                        />
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
                  <QueueRow
                    key={schedule.id}
                    schedule={schedule}
                    short={shortsById.get(schedule.id)}
                    timezone={timezone}
                    withDate
                    onError={(message) => setNotice({ tone: "error", message })}
                  />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
