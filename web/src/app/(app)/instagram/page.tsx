"use client";

/* eslint-disable @next/next/no-img-element -- pictures passed on by the PC helper, in a static export */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Clapperboard, Download, FolderUp, KeyRound, LogIn, RefreshCw, Search } from "lucide-react";
import { DEFAULT_SETTINGS, formatDuration } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannelBanners, useChannels } from "@/components/providers/channel-provider";
import { useSettings } from "@/lib/firebase/hooks";
import {
  InstagramError,
  fetchInstagramVideo,
  forgetInstagramSession,
  instagramFileUrl,
  instagramLoginState,
  instagramSessionSaved,
  listInstagramVideos,
  markInstagramAdded,
  saveInstagramSession,
  startInstagramLogin,
  unfitForShorts,
  type InstagramVideo,
} from "@/lib/instagram";
import { HELPER_DOWNLOAD } from "@/lib/local-splitter";
import { isAdmin } from "@/lib/admin";
import { describeImport, importPercent, useWork } from "@/lib/work/work-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClasses } from "@/components/ui/field";
import { ShortImportDialog, type ShortImportLook } from "@/components/short/short-import-dialog";
import { cn } from "@/lib/cn";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
/** Downloaded videos wait in the browser's memory until they are saved, so they are taken a batch at a time. */
const MAX_AT_ONCE = 20;

/** The videos listed so far for one profile. */
interface Listing {
  username: string;
  fullName: string;
  videos: InstagramVideo[];
  next: string | null;
}

/**
 * Owner-only: it runs through the PC helper, and downloading other people's
 * Instagram videos isn't something to offer the public.
 */
export default function InstagramDownloaderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const admin = isAdmin(user);

  useEffect(() => {
    if (!admin) router.replace("/dashboard");
  }, [admin, router]);

  return admin ? <InstagramDownloader /> : null;
}

function InstagramDownloader() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { active, hrefFor } = useChannels();
  const { data: settings } = useSettings(uid);
  const { data: banners } = useChannelBanners(uid);
  const { importJob, startImport, dismissImport } = useWork();

  /** Everything here runs through the PC helper; there is no doing it in the browser. */
  const [helper, setHelper] = useState<"checking" | "ready" | "offline" | "outdated">("checking");
  const [saved, setSaved] = useState(false);
  /** The session box is open although one is saved: it expired, or the user wants another account. */
  const [replacing, setReplacing] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  /** The helper has Instagram's sign-in page open in a window of its own, and is waiting for the user to finish there. */
  const [signingIn, setSigningIn] = useState(false);

  const [profile, setProfile] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState<"first" | "more" | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  /** Videos being downloaded from Instagram, before the dialog asks what to put on them. */
  const [fetching, setFetching] = useState<{ done: number; total: number } | null>(null);
  /** Downloaded and waiting for the dialog: the files, and which videos they are. */
  const [pending, setPending] = useState<{ files: File[]; ids: string[] } | null>(null);
  /** Videos already added as Shorts are left out of the list unless asked for. */
  const [showAdded, setShowAdded] = useState(false);

  const look = useCallback(
    () =>
      instagramSessionSaved().then(
        (isSaved) => {
          setHelper("ready");
          setSaved(isSaved);
        },
        (err) => setHelper(err instanceof InstagramError && err.kind === "outdated" ? "outdated" : "offline"),
      ),
    [],
  );

  // Looks again every few seconds, so the page wakes up by itself once the helper is opened.
  useEffect(() => {
    void look();
    const timer = setInterval(() => void look(), 4000);
    return () => clearInterval(timer);
  }, [look]);

  // While the sign-in window is open, asks the helper how it is going.
  useEffect(() => {
    if (!signingIn) return;
    const timer = setInterval(
      () =>
        void instagramLoginState().then(
          (login) => {
            if (login.status === "waiting") return;
            setSigningIn(false);
            if (login.status === "done") {
              setSaved(true);
              setReplacing(false);
            } else setError(login.error ?? "The sign-in didn't go through. Try again.");
          },
          (err) => {
            setSigningIn(false);
            setError(err instanceof Error ? err.message : "The sign-in didn't go through. Try again.");
          },
        ),
      1500,
    );
    return () => clearInterval(timer);
  }, [signingIn]);

  async function signIn() {
    setError(null);
    try {
      const login = await startInstagramLogin();
      if (login.status === "failed") setError(login.error);
      else setSigningIn(true);
    } catch (err) {
      fail(err);
    }
  }

  function fail(err: unknown) {
    if (err instanceof InstagramError && err.kind === "session") setReplacing(true);
    if (err instanceof InstagramError && err.kind !== "other" && err.kind !== "session") void look();
    setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
  }

  async function saveSession(e: FormEvent) {
    e.preventDefault();
    setSavingSession(true);
    setError(null);
    try {
      await saveInstagramSession(sessionId);
      setSaved(true);
      setReplacing(false);
      setSessionId("");
    } catch (err) {
      fail(err);
    }
    setSavingSession(false);
  }

  async function forgetSession() {
    setError(null);
    try {
      await forgetInstagramSession();
      setSaved(false);
      setReplacing(false);
    } catch (err) {
      fail(err);
    }
  }

  async function show(e: FormEvent) {
    e.preventDefault();
    setLoading("first");
    setError(null);
    setSelected(new Set());
    try {
      setListing(await listInstagramVideos(profile));
    } catch (err) {
      setListing(null);
      fail(err);
    }
    setLoading(null);
  }

  async function showMore() {
    if (!listing?.next) return;
    setLoading("more");
    setError(null);
    try {
      const page = await listInstagramVideos(listing.username, listing.next);
      const known = new Set(listing.videos.map((v) => v.id));
      setListing({ ...listing, videos: [...listing.videos, ...page.videos.filter((v) => !known.has(v.id))], next: page.next });
    } catch (err) {
      fail(err);
    }
    setLoading(null);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const addedCount = listing?.videos.filter((v) => v.added).length ?? 0;
  const shown = listing?.videos.filter((v) => showAdded || !v.added) ?? [];
  const chosen = shown.filter((v) => selected.has(v.id) && !unfitForShorts(v));
  // "Select all" is for what's new: one already added is only taken again by ticking it yourself.
  const usable = shown.filter((v) => !unfitForShorts(v) && !v.added);
  const allPicked = usable.length > 0 && usable.slice(0, MAX_AT_ONCE).every((v) => selected.has(v.id));
  const importing = importJob?.status === "working" ? importJob.progress : null;
  const importNotice = importJob && importJob.status !== "working" ? describeImport(importJob) : null;

  /** Downloads the ticked videos to this browser, then asks which banners and reaction video to put on them. */
  async function download() {
    if (!listing || chosen.length === 0) return;
    setError(null);
    const files: File[] = [];
    const ids: string[] = [];
    let missed = 0;
    for (const [done, video] of chosen.entries()) {
      setFetching({ done, total: chosen.length });
      try {
        files.push(await fetchInstagramVideo(video, listing.username));
        ids.push(video.id);
      } catch (err) {
        // Without the helper none of the remaining videos can be fetched either.
        if (err instanceof InstagramError && err.kind === "offline") {
          setFetching(null);
          return fail(err);
        }
        missed++;
      }
    }
    setFetching(null);
    if (missed > 0) setError(files.length === 0 ? "Instagram didn't hand over the videos. Show the profile's videos again and retry." : `${missed} of ${chosen.length} videos couldn't be downloaded and ${missed === 1 ? "was" : "were"} left out.`);
    if (files.length > 0) setPending({ files, ids });
  }

  /** Saves the downloaded videos as Shorts, with the chosen banners and reaction video on them. */
  function addToShorts({ files, ids }: { files: File[]; ids: string[] }, lookChosen: ShortImportLook) {
    if (!uid) return;
    const base = settings ?? DEFAULT_SETTINGS;
    startImport(files, uid, { ...base, processing: { ...base.processing, cropMode: lookChosen.cropMode } }, lookChosen.banners, lookChosen.reaction, active?.id);
    setSelected(new Set());
    // Remembered from here on, so these don't come up as new the next time this profile is opened.
    const done = new Set(ids);
    setListing((current) => current && { ...current, videos: current.videos.map((v) => (done.has(v.id) ? { ...v, added: true } : v)) });
    markInstagramAdded(ids).catch(fail);
  }

  const showSessionBox = helper === "ready" && (!saved || replacing);

  return (
    <div className="space-y-6">
      <div className="lg:max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">Insta Downloader</h2>
        <p className="mt-1 text-sm text-muted">
          Paste an Instagram profile link, tick the videos you want and add them as Shorts — with your banners or a reaction video on them if you like. From the Shorts page they go to YouTube like any other Short.
        </p>
      </div>

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {importing && (
        <Alert tone="success">
          {importing.rendering ? `Rendering Short ${importing.index + 1} / ${importing.total}` : `Saving Short ${importing.index + 1} / ${importing.total}`} · {Math.round(importPercent(importing))}% done. Keep this tab open until it finishes.
        </Alert>
      )}
      {importNotice && (
        <Alert tone={importNotice.tone} onDismiss={dismissImport}>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span>{importNotice.message}</span>
            {importJob && importJob.added > 0 && (
              <ButtonLink href={hrefFor("/shorts")} variant="secondary" size="sm" icon={<Clapperboard className="size-3.5" />}>
                Go to Shorts
              </ButtonLink>
            )}
          </div>
        </Alert>
      )}

      {(helper === "offline" || helper === "outdated") && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] leading-relaxed">
          <p className="font-medium">{helper === "offline" ? "The Insta Downloader needs the PC helper." : "The PC helper that's running is an older version."}</p>
          <p className="mt-1 text-muted">
            {helper === "offline" ? (
              <>
                Instagram can only be reached from your own PC. Download the helper once, unzip it and open <span className="text-text">ShortFlowHelper.exe</span>, then leave its window open. If your browser asks whether this site may reach apps on your device, choose Allow.
              </>
            ) : (
              <>Close its window and start it again — stop and re-run “npm run dev”, or download the newest helper below and open that one.</>
            )}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <a href={HELPER_DOWNLOAD} download className="flex h-9 items-center gap-1.5 rounded-lg border border-accent/50 bg-accent-soft px-3.5 text-[13px] font-medium text-text transition hover:border-accent">
              <Download className="size-3.5" />
              Download helper for Windows
            </a>
            <button type="button" onClick={() => void look()} className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-3.5 text-[13px] font-medium text-muted transition hover:border-line-strong hover:text-text">
              <RefreshCw className="size-3.5" />
              Check again
            </button>
          </div>
        </div>
      )}

      {showSessionBox && (
        <Card className="pb-5">
          <CardHeader title="Log in to Instagram" description="Instagram only lists a profile's videos for someone who is signed in. Do this once; it lasts until that account signs out." />
          <div className="mt-4 flex flex-wrap items-center gap-2 px-5">
            <Button icon={<LogIn className="size-4" />} loading={signingIn} onClick={() => void signIn()}>
              {signingIn ? "Waiting for you to sign in…" : "Log in to Instagram"}
            </Button>
            {saved && !signingIn && (
              <Button type="button" variant="ghost" onClick={() => setReplacing(false)}>
                Cancel
              </Button>
            )}
          </div>
          <p className="mt-3 px-5 text-[13px] leading-relaxed text-muted">
            {signingIn
              ? "A window with Instagram's sign-in page has opened on this PC — look for it on your taskbar. Sign in there as usual; it closes by itself when you are in."
              : "Opens Instagram's own sign-in page in a separate window. Your password is typed there, to Instagram — ShortFlow never sees it. A spare account is safest, since Instagram can restrict accounts that download a lot."}
          </p>
          <p className="mt-2 px-5 text-[12px] leading-relaxed text-faint">The sign-in is kept only by the helper on this PC — never in ShortFlow&apos;s cloud — and is used nowhere but instagram.com.</p>

          <details className="mt-4 border-t border-line px-5 pt-4">
            <summary className="cursor-pointer text-[13px] font-medium text-muted hover:text-text">Window didn&apos;t open? Paste a sessionid cookie instead</summary>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-[13px] leading-relaxed text-muted">
              <li>
                Open <span className="text-text">instagram.com</span> in Chrome or Edge and sign in.
              </li>
              <li>
                Press <span className="text-text">F12</span>, open the <span className="text-text">Application</span> tab, then <span className="text-text">Cookies → https://www.instagram.com</span>.
              </li>
              <li>
                Find the row named <span className="text-text">sessionid</span>, copy its value and paste it here.
              </li>
            </ol>
            <form onSubmit={saveSession} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="password"
                autoComplete="off"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="sessionid value"
                aria-label="Instagram sessionid"
                className={cn(inputClasses, "h-10 sm:max-w-md")}
              />
              <Button type="submit" variant="secondary" icon={<KeyRound className="size-4" />} loading={savingSession} disabled={!sessionId.trim()}>
                Save on this PC
              </Button>
            </form>
          </details>
        </Card>
      )}

      {helper === "ready" && saved && (
        <Card className="space-y-3 p-5">
          <form onSubmit={show} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="instagram.com/username"
              aria-label="Instagram profile link"
              className={cn(inputClasses, "h-10 sm:max-w-md")}
            />
            <Button type="submit" icon={<Search className="size-4" />} loading={loading === "first"} disabled={!profile.trim() || loading !== null}>
              Show videos
            </Button>
          </form>
          {!replacing && (
            <p className="text-[12px] text-faint">
              Signed in to Instagram on this PC.{" "}
              <button type="button" onClick={() => setReplacing(true)} className="font-medium text-accent hover:underline">
                Use another account
              </button>{" "}
              ·{" "}
              <button type="button" onClick={() => void forgetSession()} className="font-medium text-accent hover:underline">
                Sign out
              </button>
            </p>
          )}
        </Card>
      )}

      {listing && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold tracking-tight">
                @{listing.username}
                {listing.fullName && <span className="font-normal text-muted"> · {listing.fullName}</span>} <span className="font-normal text-faint">· {listing.videos.length} videos</span>
              </h3>
              {addedCount > 0 && (
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {addedCount} already added to Shorts{showAdded ? "" : " — hidden"}.{" "}
                  <button type="button" onClick={() => setShowAdded(!showAdded)} className="font-medium text-accent hover:underline">
                    {showAdded ? "Hide them" : "Show them"}
                  </button>
                </p>
              )}
              <p className="mt-0.5 text-[12.5px] text-muted">Only add videos that are yours or that you have permission to post — YouTube blocks or strikes copied ones.</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {usable.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelected(allPicked ? new Set() : new Set(usable.slice(0, MAX_AT_ONCE).map((v) => v.id)))}>
                  {allPicked ? "Clear selection" : usable.length > MAX_AT_ONCE ? `Select first ${MAX_AT_ONCE}` : "Select all"}
                </Button>
              )}
              <Button icon={<FolderUp className="size-4" />} loading={fetching !== null} disabled={chosen.length === 0 || chosen.length > MAX_AT_ONCE || importing !== null || !uid} onClick={() => void download()}>
                {fetching ? `Downloading ${fetching.done + 1} / ${fetching.total}` : chosen.length > 0 ? `Download ${chosen.length} & add to Shorts` : "Download & add to Shorts"}
              </Button>
            </div>
          </div>
          {chosen.length > MAX_AT_ONCE && <p className="text-[12.5px] text-warning">Pick up to {MAX_AT_ONCE} at a time — they are held in this browser&apos;s memory until they are saved.</p>}
          {importing !== null && chosen.length > 0 && <p className="text-[12.5px] text-muted">Shorts are still being added from the last batch. This one can start once that finishes.</p>}

          {listing.videos.length === 0 ? (
            <Card>
              <EmptyState icon={<Clapperboard className="size-5" />} title="No videos found" description={listing.next ? "The newest posts on this profile are all photos. Load more to look further back." : "This profile has no videos or reels."} />
            </Card>
          ) : shown.length === 0 ? (
            <Card>
              <EmptyState icon={<Check className="size-5" />} title="Nothing new here" description={listing.next ? "Every video loaded so far is already added to Shorts. Load more to look further back." : "Every video on this profile is already added to Shorts."} />
            </Card>
          ) : (
            <div className={GRID}>
              {shown.map((video) => {
                const unfit = unfitForShorts(video);
                const picked = selected.has(video.id);
                return (
                  <Card key={video.id} className={cn("group overflow-hidden transition duration-300 hover:border-line-strong", picked && "border-accent/60 shadow-[0_0_0_3px_var(--accent-soft)]", (unfit || (video.added && !picked)) && "opacity-60")}>
                    <button type="button" role="checkbox" aria-checked={picked} disabled={Boolean(unfit)} onClick={() => toggle(video.id)} className="block w-full text-left disabled:cursor-not-allowed" aria-label={`Select ${video.caption.slice(0, 60) || video.code}`}>
                      <div className="relative aspect-[9/16] overflow-hidden bg-surface-2">
                        {video.thumbnailUrl ? (
                          <img src={instagramFileUrl(video.thumbnailUrl)} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <div className="grid size-full place-items-center bg-[radial-gradient(circle_at_30%_20%,#241a4d,#0e0d14_70%)]">
                            <Clapperboard className="size-6 text-white/15" />
                          </div>
                        )}
                        {unfit ? (
                          <span className="absolute left-2.5 top-2.5">
                            <Badge tone="warning">{unfit}</Badge>
                          </span>
                        ) : (
                          <>
                            {video.added && (
                              <span className="absolute left-2.5 top-2.5">
                                <Badge tone="success">Added</Badge>
                              </span>
                            )}
                            <span className={cn("absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md border transition", picked ? "border-accent bg-accent text-white" : "border-white/40 bg-black/40 text-transparent backdrop-blur group-hover:border-white")}>
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                          </>
                        )}
                        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white backdrop-blur">{formatDuration(video.durationSec)}</span>
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-[12.5px] leading-snug" title={video.caption}>
                          {video.caption || <span className="text-faint">No caption</span>}
                        </p>
                        {video.takenAt > 0 && <p className="mt-1 text-[11.5px] text-faint">{new Date(video.takenAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>}
                      </div>
                    </button>
                  </Card>
                );
              })}
            </div>
          )}

          {listing.next && (
            <div className="flex justify-center pt-1">
              <Button variant="secondary" loading={loading === "more"} disabled={loading !== null} onClick={() => void showMore()}>
                Load more
              </Button>
            </div>
          )}
        </section>
      )}

      {pending && uid && (
        <ShortImportDialog
          files={pending.files}
          banners={banners}
          defaultCropMode={(settings ?? DEFAULT_SETTINGS).processing.cropMode}
          onCancel={() => setPending(null)}
          onStart={(lookChosen) => {
            setPending(null);
            addToShorts(pending, lookChosen);
          }}
        />
      )}
    </div>
  );
}
