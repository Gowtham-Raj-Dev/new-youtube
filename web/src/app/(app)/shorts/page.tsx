"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clapperboard, Download, ListPlus, ShieldCheck, Trash2, Upload } from "lucide-react";
import { DEFAULT_SETTINGS, slotRulesFrom, type ShortDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useSettings, useShorts, useVideos, useYoutubeConnections, type WithId } from "@/lib/firebase/hooks";
import { describeSchedule, previewSlots, scheduleFacts } from "@/lib/schedule";
import { canQueue, checkYouTubeStatus, deleteShorts, downloadShorts, isBlockedOnYouTube, matchesShortFilter, needsYouTubeCheck, queueShorts, type ShortFilter } from "@/lib/shorts";
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
  { id: "blocked", label: "Copyright blocked" },
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
  const [confirming, setConfirming] = useState<{ ids: string[]; slots: number[]; now: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [channelId, setChannelId] = useState("");
  /** Upload as Unlisted, and go public only once it is confirmed to play (no copyright block). */
  const [checkFirst, setCheckFirst] = useState(true);

  const rules = slotRulesFrom(settings ?? DEFAULT_SETTINGS);
  const timezone = rules.timezone;
  const connected = connections.filter((c) => c.status === "connected");

  // Newest video first, and within a video in the order the parts play.
  const ordered = useMemo(() => {
    const videoRank = new Map(videos.map((v, i) => [v.id, i]));
    const rank = (s: ShortDoc) => videoRank.get(s.videoId) ?? Number.MAX_SAFE_INTEGER;
    return [...shorts].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
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
  // A video with one blocked Short is copyrighted material: its other parts are flagged and left out of "all".
  const blockedVideos = useMemo(() => new Set(shorts.filter(isBlockedOnYouTube).map((s) => s.videoId)), [shorts]);
  const atRisk = (s: ShortDoc) => canQueue(s) && blockedVideos.has(s.videoId);
  const riskyCount = ordered.filter(atRisk).length;
  const allReady = ordered.filter((s) => s.status === "ready" && !atRisk(s)).map((s) => s.id);
  const target = picked.length > 0 ? picked : allReady;
  const open = openId ? shorts.find((s) => s.id === openId) : undefined;
  // Download works on the ticked Shorts, or on everything in the current tab.
  // (Uploaded Shorts have no file left to download: it is removed from Storage once it's on YouTube.)
  const toDownload = (picked.length > 0 ? ordered.filter((s) => picked.includes(s.id)) : ordered.filter((s) => matchesShortFilter(s, filter))).filter((s) => !s.fileDeletedAt);
  const [downloading, setDownloading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Clear removes the ticked Shorts, or everything in the current tab — from here and from Storage.
  const ticked = ordered.filter((s) => selected.has(s.id));
  const toClear = ticked.length > 0 ? ticked : ordered.filter((s) => matchesShortFilter(s, filter));
  const [clearing, setClearing] = useState<WithId<ShortDoc>[] | null>(null);
  const [clearBusy, setClearBusy] = useState(false);

  async function clear() {
    if (!clearing) return;
    setClearBusy(true);
    setBanner(null);
    try {
      const { deleted, skipped } = await deleteShorts(clearing.map((s) => s.id));
      setBanner({ tone: "success", message: `${deleted} Short${deleted === 1 ? "" : "s"} deleted.${skipped > 0 ? ` ${skipped} uploading right now ${skipped === 1 ? "was" : "were"} left alone.` : ""}` });
      setSelected(new Set());
    } catch (err) {
      setBanner({ tone: "error", message: friendlyCallableError(err) });
    }
    setClearBusy(false);
    setClearing(null);
  }

  /** Asks YouTube about each uploaded Short in turn. Results land on the Shorts themselves and show up live. */
  async function checkUploaded(list: WithId<ShortDoc>[]) {
    setChecking(true);
    let blocked = 0;
    let failed = 0;
    for (const short of list) {
      try {
        const result = await checkYouTubeStatus(short.id);
        if (result.state === "blocked" || result.state === "rejected" || result.state === "removed") blocked++;
      } catch {
        failed++;
      }
    }
    setChecking(false);
    setBanner(
      failed === list.length && list.length > 0
        ? { tone: "error", message: "Couldn't reach YouTube to check. Try again in a moment." }
        : { tone: blocked > 0 ? "error" : "success", message: blocked > 0 ? `${blocked} of ${list.length} uploaded Shorts ${blocked === 1 ? "is" : "are"} blocked or gone on YouTube. See the Copyright blocked tab.` : `Checked ${list.length} uploaded Shorts — YouTube reports no blocks.` },
    );
  }

  // Once the Shorts have loaded, quietly check the uploaded ones that haven't been looked at lately.
  const autoChecked = useRef(false);
  useEffect(() => {
    if (autoChecked.current || loading) return;
    autoChecked.current = true;
    const due = shorts.filter((s) => needsYouTubeCheck(s, Date.now())).slice(0, 15);
    // No spinner or banner for this one: the answers simply appear on the cards.
    void (async () => {
      for (const short of due) await checkYouTubeStatus(short.id).catch(() => undefined);
    })();
    // Runs once per visit; `shorts` is read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const uploaded = ordered.filter((s) => s.status === "published" && s.youtubeVideoId);

  async function download() {
    setDownloading(true);
    setBanner(null);
    try {
      await downloadShorts(toDownload);
      setBanner({ tone: "success", message: `${toDownload.length === 1 ? "1 Short is" : `${toDownload.length} Shorts are`} downloading as vertical MP4 files. If only one arrives, allow multiple downloads for this site in your browser.` });
    } catch {
      setBanner({ tone: "error", message: "Couldn't download the Shorts. Check your connection and try again." });
    }
    setDownloading(false);
  }

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
    setConfirming({ ids, slots: previewSlots(rules, ids.length, schedules), now: false });
  }

  /** True once queued; on failure the reason goes in the banner. `now` skips the schedule. */
  async function submit(ids: string[], now = false): Promise<boolean> {
    setBusy(true);
    setBanner(null);
    try {
      const result = await queueShorts(ids, connected.length > 1 ? channelId || connected[0].id : undefined, now, checkFirst);
      setBanner({
        tone: "success",
        message: now
          ? result.uploaded === result.queued
            ? `${result.uploaded === 1 ? "1 Short is" : `${result.uploaded} Shorts are`} on YouTube now.${checkFirst ? " Public ones are Unlisted until their copyright check, about 10 minutes from now." : ""}`
            : `${result.uploaded} of ${result.queued} Shorts are on YouTube. The rest couldn't go up yet and will be retried within 5 minutes — see the Queue page.`
          : result.queued === 1
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {connected.length > 1 && (
              <div className="w-48">
                <select value={channelId || connected[0].id} onChange={(e) => setChannelId(e.target.value)} className={cn(inputClasses, "h-10")} aria-label="Channel to publish to">
                  {connected.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.channelTitle}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button variant="danger" icon={<Trash2 className="size-4" />} disabled={toClear.length === 0 || busy} onClick={() => setClearing(toClear)}>
              {ticked.length > 0 ? `Clear ${toClear.length}` : `Clear all ${toClear.length}`}
            </Button>
            {uploaded.length > 0 && (
              <Button variant="secondary" icon={<ShieldCheck className="size-4" />} loading={checking} onClick={() => void checkUploaded(uploaded.slice(0, 50))}>
                Check copyright
              </Button>
            )}
            <Button variant="secondary" icon={<Download className="size-4" />} loading={downloading} disabled={toDownload.length === 0} onClick={download}>
              {picked.length > 0 ? `Download ${toDownload.length}` : `Download all ${toDownload.length}`}
            </Button>
            <Button
              variant="secondary"
              icon={<Upload className="size-4" />}
              disabled={busy || target.length === 0 || connected.length === 0}
              onClick={() => setConfirming({ ids: target, slots: [], now: true })}
            >
              {picked.length > 0 ? `Upload ${picked.length} now` : `Upload all ${allReady.length} now`}
            </Button>
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

      {riskyCount > 0 && (
        <Card className="flex items-start gap-3 border-warning/30 bg-warning/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-medium text-text">
              {riskyCount} Short{riskyCount === 1 ? "" : "s"} marked “Copyright risk”.
            </span>{" "}
            {riskyCount === 1 ? "It comes" : "They come"} from a video whose other part YouTube already blocked, so {riskyCount === 1 ? "it's" : "they're"} left out of “Submit all” and “Upload all”. Tick one yourself if you still want to send it.
          </p>
        </Card>
      )}

      {shorts.length > 0 && (
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition", checkFirst ? "border-accent/40 bg-accent-soft" : "border-line bg-surface/60")}>
          <input type="checkbox" checked={checkFirst} onChange={(e) => setCheckFirst(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span className="text-[13px] leading-relaxed">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-3.5 text-accent" />
              Check for copyright before going public
            </span>
            <span className="text-muted">
              A Short set to Public uploads as Unlisted first — off your channel page. About 10 minutes later ShortFlow checks whether it plays: if it does, it goes Public; if a copyright claim blocked it, it stays Unlisted and shows under “Copyright blocked” with who claimed it.
            </span>
          </span>
        </label>
      )}

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

      {shorts.length > 0 && (
        <div className="space-y-3">
          {/* Wraps instead of scrolling, and has the row to itself so nothing squeezes it. */}
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
                <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", filter === f.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-faint")}>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-[12.5px]">
            <span className="flex items-center gap-2 font-medium">
              <CalendarClock className="size-3.5 shrink-0 text-accent" />
              Queued Shorts go out
            </span>
            <span className="flex flex-wrap gap-1.5">
              {scheduleFacts(rules).map((fact) => (
                <span key={fact} className="rounded-lg bg-white/[0.06] px-2 py-0.5 tabular-nums text-muted">
                  {fact}
                </span>
              ))}
            </span>
            <Link href="/schedule" className="ml-auto font-medium text-accent hover:underline">
              Change
            </Link>
          </div>
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
            title="No Shorts yet"
            description="Upload a video, press Generate Shorts on it and choose how long each Short should be."
            action={
              <ButtonLink href="/videos" icon={<Upload className="size-4" />}>
                Go to Videos
              </ButtonLink>
            }
          />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={<Clapperboard className="size-5" />} title="Nothing here" description="No Shorts match this filter." />
        </Card>
      ) : (
        groups.map((group) => {
          // Every Short can be ticked (for Clear and Download); queue and upload only act on the ones that can still go out.
          const queueable = group.items.map((s) => s.id);
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
                    copyrightRisk={atRisk(short)}
                    onToggle={() => toggle(short.id)}
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
        open={clearing !== null}
        title={clearing?.length === 1 ? "Delete this Short?" : `Delete ${clearing?.length ?? 0} Shorts?`}
        description={
          <>
            {clearing?.length === 1 ? "It is" : "They are"} removed from ShortFlow and {clearing?.length === 1 ? "its file is" : "their files are"} deleted from storage. This can&apos;t be undone.
            {clearing?.some((s) => s.youtubeVideoId) && " Ones already on YouTube stay on YouTube — delete those in YouTube Studio."}
            {clearing?.some((s) => s.status === "scheduled") && " Queued ones are taken out of the queue."}
          </>
        }
        confirmLabel={clearing?.length === 1 ? "Delete Short" : "Delete Shorts"}
        loading={clearBusy}
        onConfirm={() => void clear()}
        onCancel={() => setClearing(null)}
      />

      <ConfirmDialog
        open={confirming !== null}
        tone="primary"
        title={
          confirming?.now
            ? confirming.ids.length === 1 ? "Upload this Short to YouTube now?" : `Upload ${confirming.ids.length} Shorts to YouTube now?`
            : confirming?.ids.length === 1 ? "Add this Short to the queue?" : `Add ${confirming?.ids.length ?? 0} Shorts to the queue?`
        }
        description={
          confirming?.now ? (
            "They skip your schedule and start uploading within 5 minutes, one after another, each with the title, description, keywords and visibility it has right now."
          ) : preview.length > 0 ? (
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
        confirmLabel={confirming?.now ? "Upload now" : "Submit to queue"}
        loading={busy}
        onConfirm={() => confirming && void submit(confirming.ids, confirming.now)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
