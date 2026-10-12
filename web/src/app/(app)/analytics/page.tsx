"use client";

import { useMemo, useState } from "react";
import { ChartColumn, ExternalLink } from "lucide-react";
import { DEFAULT_SETTINGS, type ShortDoc, type VideoDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSettings, useShorts, useVideos, type WithId } from "@/lib/firebase/hooks";
import { useDashboardCounts } from "@/lib/firebase/counts";
import { isBlockedOnYouTube } from "@/lib/shorts";
import { dayKey, toDate } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How many of the newest Shorts the charts read. */
const SHORTS_LOADED = 300;

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];
const RANGE_LABELS: Record<Range, string> = { 7: "7 days", 14: "14 days", 30: "30 days" };

/** The two series of the daily chart. Checked together for colour-blind separation on this surface. */
const SERIES = [
  { key: "made", label: "Made", color: "#8b6cff" },
  { key: "published", label: "Published", color: "#1aa3b8" },
] as const;

interface Day {
  key: string;
  date: Date;
  made: number;
  published: number;
}

/** One entry per calendar day in `timeZone`, oldest first, ending today. */
function dailyCounts(shorts: Array<Pick<ShortDoc, "createdAt" | "publishedAt">>, range: Range, timeZone: string, now: number): Day[] {
  const days: Day[] = Array.from({ length: range }, (_, i) => {
    const date = new Date(now - (range - 1 - i) * DAY_MS);
    return { key: dayKey(date, timeZone), date, made: 0, published: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const short of shorts) {
    const made = toDate(short.createdAt);
    const published = toDate(short.publishedAt);
    const madeDay = made && byKey.get(dayKey(made, timeZone));
    const publishedDay = published && byKey.get(dayKey(published, timeZone));
    if (madeDay) madeDay.made++;
    if (publishedDay) publishedDay.published++;
  }
  return days;
}

/** A round number at or above `max` that halves cleanly, for the top of the axis. */
function axisTop(max: number) {
  return [4, 10, 20, 40, 100, 200, 400, 1000].find((step) => step >= max) ?? Math.ceil(max / 1000) * 1000;
}

function DailyChart({ days, timeZone }: { days: Day[]; timeZone: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const top = axisTop(Math.max(...days.map((day) => Math.max(day.made, day.published))));
  const dayLabel = (date: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone, ...opts }).format(date);
  // Label about six days across, always including today.
  const labelEvery = Math.ceil(days.length / 7);

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-52 w-6 shrink-0 flex-col justify-between text-right text-[11px] leading-none tabular-nums text-faint">
          {[top, top / 2, 0].map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="relative h-52 min-w-0 flex-1" onMouseLeave={() => setHovered(null)}>
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((line) => (
              <span key={line} className={cn("h-px", line === 2 ? "bg-line-strong" : "bg-line")} />
            ))}
          </div>
          <div className="relative flex h-full">
            {days.map((day, i) => (
              <div
                key={day.key}
                tabIndex={0}
                role="img"
                aria-label={`${dayLabel(day.date, { day: "numeric", month: "long" })}: ${day.made} made, ${day.published} published`}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className={cn("relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-t-md px-0.5 outline-none transition-colors", hovered === i && "bg-white/[0.04]")}
              >
                {SERIES.map((series) => (
                  <span
                    key={series.key}
                    className="min-w-0 max-w-3 flex-1 rounded-t-[4px]"
                    style={{ height: `${(day[series.key] / top) * 100}%`, minHeight: day[series.key] > 0 ? 3 : 0, background: series.color }}
                  />
                ))}
                {hovered === i && (
                  <div
                    className={cn(
                      "pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-line-strong bg-surface-3 px-3 py-2 text-[12px] shadow-xl",
                      // Beside the column, on whichever side has room, so it never covers the bars it describes.
                      i < days.length / 2 ? "left-full ml-1.5" : "right-full mr-1.5",
                    )}
                  >
                    <p className="mb-1 font-medium">{dayLabel(day.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                    {SERIES.map((series) => (
                      <p key={series.key} className="flex items-center gap-2 text-muted">
                        <span className="size-2 rounded-sm" style={{ background: series.color }} />
                        {series.label}
                        <span className="ml-auto pl-3 font-medium tabular-nums text-text">{day[series.key]}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex text-[11px] text-faint">
        {days.map((day, i) => (
          <span key={day.key} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
            {(days.length - 1 - i) % labelEvery === 0 && <span>{dayLabel(day.date, { day: "numeric", month: "short" })}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A labelled row whose bar length is its share of the biggest row. */
function BarRow({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-muted">
          {detail && <span className="mr-2 text-[12px] text-faint">{detail}</span>}
          <span className="font-medium text-text">{value}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full bg-accent" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, minWidth: value > 0 ? 4 : 0 }} />
      </div>
    </li>
  );
}

function Tile({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[12.5px] font-medium text-muted">{label}</p>
      {value === null ? <Skeleton className="mt-3 h-7 w-14" /> : <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>}
      {hint && <p className="mt-2 text-[12px] text-faint">{hint}</p>}
    </Card>
  );
}

function statusRows(shorts: WithId<ShortDoc>[]) {
  const count = (test: (short: WithId<ShortDoc>) => boolean) => shorts.filter(test).length;
  return [
    { label: "Ready to queue", value: count((s) => s.status === "ready") },
    { label: "In the queue", value: count((s) => s.status === "scheduled" || s.status === "uploading" || s.status === "quota_exceeded") },
    { label: "Live on YouTube", value: count((s) => s.status === "published" && !isBlockedOnYouTube(s)) },
    { label: "Blocked or removed by YouTube", value: count((s) => s.status === "published" && isBlockedOnYouTube(s)) },
    { label: "Upload failed", value: count((s) => s.status === "failed") },
  ];
}

function videoRows(shorts: WithId<ShortDoc>[], videos: WithId<VideoDoc>[]) {
  const perVideo = new Map<string, { made: number; published: number }>();
  for (const short of shorts) {
    const row = perVideo.get(short.videoId) ?? { made: 0, published: 0 };
    row.made++;
    if (short.status === "published") row.published++;
    perVideo.set(short.videoId, row);
  }
  const titles = new Map(videos.map((video) => [video.id, video.title]));
  return [...perVideo]
    .map(([videoId, row]) => ({ videoId, title: titles.get(videoId) ?? (videoId.startsWith("upload-") ? "Uploaded from your files" : "Deleted video"), ...row }))
    .sort((a, b) => b.made - a.made)
    .slice(0, 6);
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { data: shorts, loading, error } = useShorts(user?.uid, SHORTS_LOADED);
  const { data: videos } = useVideos(user?.uid);
  const { data: settings } = useSettings(user?.uid);
  const { counts } = useDashboardCounts(user?.uid);
  const [range, setRange] = useState<Range>(14);
  const [now] = useState(() => Date.now());
  const timeZone = (settings ?? DEFAULT_SETTINGS).publishing.timezone;

  const days = useMemo(() => dailyCounts(shorts, range, timeZone, now), [shorts, range, timeZone, now]);
  const totals = { made: days.reduce((sum, day) => sum + day.made, 0), published: days.reduce((sum, day) => sum + day.published, 0) };
  const statuses = useMemo(() => statusRows(shorts), [shorts]);
  const topVideos = useMemo(() => videoRows(shorts, videos), [shorts, videos]);
  const partial = counts !== null && counts.shorts > shorts.length;
  const number = (value: number | undefined) => (value === undefined ? null : value.toLocaleString("en-IN"));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="mt-1 text-sm text-muted">How many Shorts you&apos;ve made and published, and where they stand now.</p>
      </div>

      {error && <Alert tone="error">We couldn&apos;t load your Shorts. Check your connection and refresh the page.</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Shorts made" value={number(counts?.shorts)} hint={counts ? `From ${counts.videos.toLocaleString("en-IN")} video${counts.videos === 1 ? "" : "s"}` : undefined} />
        <Tile
          label="Published"
          value={number(counts?.published)}
          hint={counts && counts.shorts > 0 ? `${Math.round((counts.published / counts.shorts) * 100)}% of your Shorts` : undefined}
        />
        <Tile label="In the queue" value={number(counts?.scheduled)} hint="Waiting for their slot" />
        <Tile label="Failed" value={number(counts?.failed)} hint="Videos and Shorts" />
      </div>

      <Card>
        <CardHeader
          title="Shorts per day"
          description={`Made and published over the last ${range} days.`}
          action={<Segmented label="Time range" options={RANGES} labels={RANGE_LABELS} value={range} onChange={setRange} />}
        />
        <div className="p-5">
          {loading ? (
            <Skeleton className="h-52 w-full" />
          ) : totals.made + totals.published === 0 ? (
            <EmptyState
              icon={<ChartColumn className="size-5" />}
              title={`Nothing in the last ${range} days`}
              description="Generate Shorts from a video, or queue some for YouTube, and they'll show up here."
              action={
                <ButtonLink href="/videos" variant="secondary">
                  Open videos
                </ButtonLink>
              }
              className="py-8"
            />
          ) : (
            <>
              <div className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                {SERIES.map((series) => (
                  <span key={series.key} className="flex items-center gap-2 text-muted">
                    <span className="size-2.5 rounded-sm" style={{ background: series.color }} />
                    {series.label}
                    <span className="font-medium tabular-nums text-text">{totals[series.key]}</span>
                  </span>
                ))}
              </div>
              <DailyChart days={days} timeZone={timeZone} />
              <details className="mt-4 text-[13px]">
                <summary className="w-fit text-muted transition hover:text-text">Show as a table</summary>
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-line">
                  <table className="w-full text-left tabular-nums">
                    <thead className="sticky top-0 bg-surface-2 text-[12px] text-muted">
                      <tr>
                        <th className="px-3.5 py-2 font-medium">Day</th>
                        <th className="px-3.5 py-2 text-right font-medium">Made</th>
                        <th className="px-3.5 py-2 text-right font-medium">Published</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {[...days].reverse().map((day) => (
                        <tr key={day.key}>
                          <td className="px-3.5 py-2">{new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(day.date)}</td>
                          <td className="px-3.5 py-2 text-right">{day.made}</td>
                          <td className="px-3.5 py-2 text-right">{day.published}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Where your Shorts stand" description="Each Short counted once, by what's happening to it now." />
          {loading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <ul className="space-y-4 p-5">
              {statuses.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={Math.max(...statuses.map((s) => s.value))} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Videos with the most Shorts" description="How many each video was cut into, and how many are published." />
          {loading ? (
            <div className="space-y-4 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : topVideos.length === 0 ? (
            <EmptyState icon={<ChartColumn className="size-5" />} title="No Shorts yet" description="Cut a video into Shorts to see it here." className="py-8" />
          ) : (
            <ul className="space-y-4 p-5">
              {topVideos.map((row) => (
                <BarRow key={row.videoId} label={row.title} value={row.made} max={topVideos[0].made} detail={`${row.published} published`} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      {partial && <p className="text-[12.5px] text-muted">The chart and the two lists read your newest {shorts.length} Shorts. The totals at the top count all of them.</p>}

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium">Looking for views, likes and watch time?</p>
          <p className="mt-0.5 text-[12.5px] text-muted">ShortFlow doesn&apos;t read those from YouTube. They&apos;re in YouTube Studio.</p>
        </div>
        <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
          <ExternalLink className="size-3.5" />
          YouTube Studio
        </a>
      </Card>
    </div>
  );
}
