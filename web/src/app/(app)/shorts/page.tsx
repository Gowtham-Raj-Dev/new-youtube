"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clapperboard, ListPlus, LoaderCircle, Upload } from "lucide-react";
import { DEFAULT_SETTINGS, slotRulesFrom, type ShortDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useSettings, useShorts, useVideos, useYoutubeConnections, type WithId } from "@/lib/firebase/hooks";
import { describeSchedule, previewSlots } from "@/lib/schedule";
import { canQueue, matchesShortFilter, queueShorts, type ShortFilter } from "@/lib/shorts";
import { friendlyCallableError } from "@/lib/youtube";
import { formatInZone } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/field";
import { ShortCard, ShortCardSkeleton } from "@/components/short/short-card";
import { ShortEditorDialog } from "@/components/short/short-editor";
import { cn } from "@/lib/cn";

const FILTERS: Array<{ id: ShortFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "queued", label: "In queue" },
  { id: "published", label: "Published" },
  { id: "failed", label: "Failed" },
];

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";

type Banner = { tone: "success" | "error"; message: string } | null;

export default function GeneratedShortsPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: shorts, loading, error } = useShorts(uid);
  const { data: videos } = useVideos(uid);
  const { data: settings } = useSettings(uid);
  const { data: schedules } = useSchedules(uid);
  const { data: connections, loading: connectionsLoading } = useYoutubeConnections(uid);

  const [filter, setFilter] = useState<ShortFilter>("all");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ ids: string[]; slots: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [channelId, setChannelId] = useState("");

  const rules = slotRulesFrom(settings ?? DEFAULT_SETTINGS);
  const timezone = rules.timezone;
  const connected = connections.filter((c) => c.status === "connected");
  const cutting = videos.filter((v) => v.status === "queued" || v.status === "processing");

  // Newest video first, and within a video in the order the parts play.
  const ordered = useMemo(() => {
    const videoRank = new Map(videos.map((v, i) => [v.id, i]));
    const rank = (s: ShortDoc) => videoRank.get(s.videoId) ?? Number.MAX_SAFE_INTEGER;
    return [...shorts].sort((a, b) => rank(a) - rank(b) || a.videoId.localeCompare(b.videoId) || a.segmentIndex - b.segmentIndex);
  }, [shorts, videos]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, shorts.filter((s) => matchesShortFilter(s, f.id)).length])) as Record<ShortFilter, number>,
    [shorts],
  );

  const groups = useMemo(() => {
    const titles = new Map(videos.map((v) => [v.id, v.title]));
    const byVideo = new Map<string, WithId<ShortDoc>[]>();
    for (const short of ordered) {
      if (!matchesShortFilter(short, filter)) continue;
      byVideo.set(short.videoId, [...(byVideo.get(short.videoId) ?? []), short]);
    }
    return [...byVideo].map(([videoId, items]) => ({ videoId, title: titles.get(videoId) ?? "Deleted video", items }));
  }, [ordered, videos, filter]);

  const picked = ordered.filter((s) => selected.has(s.id) && canQueue(s)).map((s) => s.id);
  const allReady = ordered.filter((s) => s.status === "ready").map((s) => s.id);
  const target = picked.length > 0 ? picked : allReady;
  const open = openId ? shorts.find((s) => s.id === openId) : undefined;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const when = (ms: number) =>
    formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  /** Opens the confirmation with the slots the server is about to hand out, so it can say when things go live. */
  function askToQueue(ids: string[]) {
    setConfirming({ ids, slots: previewSlots(rules, ids.length, schedules) });
  }

  /** True once queued; on failure the reason goes in the banner. */
  async function submit(ids: string[]): Promise<boolean> {
    setBusy(true);
    setBanner(null);
    try {
      const result = await queueShorts(ids, connected.length > 1 ? channelId || connected[0].id : undefined);
      setBanner({
        tone: "success",
        message:
          result.queued === 1
            ? `Added to the queue. It goes out ${when(result.firstAt)}.`
            : `${result.queued} Shorts added to the queue — the first goes out ${when(result.firstAt)}, the last ${when(result.lastAt)}.`,
      });
      setSelected(new Set());
      return true;
    } catch (err) {
      setBanner({ tone: "error", message: friendlyCallableError(err) });
      return false;
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const preview = confirming?.slots ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Generated Shorts</h2>
          <p className="mt-1 text-sm text-muted">Every vertical Short cut from your videos. Open one to set its title, description and keywords, then submit it to the queue.</p>
        </div>
        {shorts.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {connected.length > 1 && (
              <select value={channelId || connected[0].id} onChange={(e) => setChannelId(e.target.value)} className={cn(inputClasses, "h-10 w-44")} aria-label="Channel to publish to">
                {connected.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.channelTitle}
                  </option>
                ))}
              </select>
            )}
            <Button icon={<ListPlus className="size-4" />} loading={busy} disabled={target.length === 0 || connected.length === 0} onClick={() => askToQueue(target)}>
              {picked.length > 0 ? `Submit ${picked.length} to queue` : `Submit all ${allReady.length} to queue`}
            </Button>
          </div>
        )}
      </div>

      {banner && (
        <Alert tone={banner.tone} onDismiss={() => setBanner(null)}>
          {banner.message}
        </Alert>
      )}
      {error && <Alert tone="error">We couldn&apos;t load your Shorts. Check your connection and refresh the page.</Alert>}

      {!connectionsLoading && connected.length === 0 && shorts.length > 0 && (
        <Card className="flex flex-col gap-3 border-warning/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            <span className="font-medium text-text">Connect your YouTube channel</span> before queueing — ShortFlow needs somewhere to publish to.
          </p>
          <ButtonLink href="/youtube" variant="secondary" size="sm">
            Connect YouTube
          </ButtonLink>
        </Card>
      )}

      {cutting.length > 0 && (
        <Card className="flex items-center gap-3 border-accent/20 bg-[linear-gradient(100deg,var(--accent-soft),transparent_60%)] px-4 py-3">
          <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" />
          <p className="text-[13px] text-muted">
            <span className="font-medium text-text">{cutting.length === 1 ? `Cutting “${cutting[0].title}” into Shorts.` : `Cutting ${cutting.length} videos into Shorts.`}</span> They appear here one by one as
            each is ready.
          </p>
        </Card>
      )}

      {shorts.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <CalendarClock className="size-3.5 shrink-0" />
            <span>
              Queued Shorts go out {describeSchedule(rules)}.{" "}
              <Link href="/schedule" className="font-medium text-accent hover:underline">
                Change
              </Link>
            </span>
          </p>
        </div>
      )}

      {loading ? (
        <div className={GRID}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ShortCardSkeleton key={i} />
          ))}
        </div>
      ) : shorts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clapperboard className="size-5" />}
            title={cutting.length > 0 ? "Your Shorts are being made" : "No Shorts yet"}
            description={
              cutting.length > 0
                ? "This usually takes about as long as the video itself. You can leave this page — it carries on in the cloud."
                : "Upload a video and ShortFlow cuts it into vertical Shorts automatically."
            }
            action={
              cutting.length === 0 && (
                <ButtonLink href="/videos" icon={<Upload className="size-4" />}>
                  Upload a video
                </ButtonLink>
              )
            }
          />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Clapperboard className="size-5" />} title="Nothing here" description="No Shorts match this filter." />
        </Card>
      ) : (
        groups.map((group) => {
          const queueable = group.items.filter(canQueue).map((s) => s.id);
          const allPicked = queueable.length > 0 && queueable.every((id) => selected.has(id));
          return (
            <section key={group.videoId} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="min-w-0 truncate text-[14px] font-semibold tracking-tight">
                  {group.title} <span className="font-normal text-faint">· {group.items.length}</span>
                </h3>
                {queueable.length > 0 && (
                  <button
                    onClick={() =>
                      setSelected((current) => {
                        const next = new Set(current);
                        for (const id of queueable) if (allPicked) next.delete(id); else next.add(id);
                        return next;
                      })
                    }
                    className="shrink-0 text-[12.5px] font-medium text-accent hover:underline"
                  >
                    {allPicked ? "Clear selection" : "Select all"}
                  </button>
                )}
              </div>
              <div className={GRID}>
                {group.items.map((short) => (
                  <ShortCard
                    key={short.id}
                    short={short}
                    timezone={timezone}
                    selected={selected.has(short.id)}
                    onToggle={canQueue(short) ? () => toggle(short.id) : undefined}
                    onOpen={() => setOpenId(short.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {open && <ShortEditorDialog key={open.id} short={open} timezone={timezone} onClose={() => setOpenId(null)} onQueue={(id) => submit([id])} />}

      <ConfirmDialog
        open={confirming !== null}
        tone="primary"
        title={confirming?.ids.length === 1 ? "Add this Short to the queue?" : `Add ${confirming?.ids.length ?? 0} Shorts to the queue?`}
        description={
          preview.length > 0 ? (
            <>
              One goes out per slot, {describeSchedule(rules)} ({timezone}). {preview.length === 1 ? "It goes out" : "The first goes out"} <span className="text-text">{when(preview[0])}</span>
              {preview.length > 1 && (
                <>
                  , the last <span className="text-text">{when(preview[preview.length - 1])}</span>
                </>
              )}
              . You can remove any of them from the Queue page before then.
            </>
          ) : (
            "Your schedule has no publishing days. Pick at least one on the Schedule page first."
          )
        }
        confirmLabel="Submit to queue"
        loading={busy}
        onConfirm={() => confirming && void submit(confirming.ids)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
