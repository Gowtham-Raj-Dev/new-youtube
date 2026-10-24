"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ScheduleDoc, ShortDoc, YoutubeConnectionDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useDashboardCounts, type DashboardCounts } from "@/lib/firebase/counts";
import { useAllSchedules, useBanners, useShorts, useVideos, useYoutubeConnections, type WithId } from "@/lib/firebase/hooks";
import { useUploads } from "@/lib/uploads/upload-provider";
import { useWork } from "@/lib/work/work-provider";

/** What says which channel something belongs to — see `connectionId` in the shared models. */
interface Tagged {
  connectionId?: string | null;
}

interface ChannelState {
  connections: WithId<YoutubeConnectionDoc>[];
  loading: boolean;
  /** The channel the app is on: everything made is made on it, and with several channels pages show only what is its own. Null until one is connected. */
  active: WithId<YoutubeConnectionDoc> | null;
  /** More than one channel is connected, so there is something to switch between. */
  multi: boolean;
  switchTo: (connectionId: string) => void;
  /** Whether a video, banner or activity entry belongs to the active channel. */
  owns: (item: Tagged) => boolean;
  /** The same for a Short. One made before channels were kept apart belongs to the channel it was queued to. */
  showsShort: (short: WithId<ShortDoc>) => boolean;
  /** Every Short the active channel has been given, queued or published. Empty with a single channel. */
  sent: WithId<ScheduleDoc>[];
  /** `href` with the active channel in it, so opening the link in a new tab lands on the same channel. */
  hrefFor: (href: string) => string;
}

const ChannelContext = createContext<ChannelState | null>(null);

/** The active channel's YouTube id is kept in the address as `?channel=`, so each channel has its own links. */
const CHANNEL_PARAM = "channel";

const storageKey = (uid: string) => `shortflow.activeChannel.${uid}`;

function readSaved(uid: string | undefined) {
  if (!uid || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey(uid)) ?? "";
  } catch {
    return "";
  }
}

function withChannel(href: string, channelId: string | undefined) {
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  if (channelId) params.set(CHANNEL_PARAM, channelId);
  else params.delete(CHANNEL_PARAM);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Which YouTube channel the user is working on. Lives above the pages so the
 * switch in the top bar changes all of them at once. With several channels the
 * one in the address (`?channel=`) is it; the last one used is remembered in
 * this browser for links that don't say.
 */
export function ChannelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { data: connections, loading } = useYoutubeConnections(uid);
  const [picked, setPicked] = useState(() => readSaved(uid));

  const multi = connections.length > 1;
  const inUrl = new URLSearchParams(search).get(CHANNEL_PARAM);
  const fromUrl = inUrl ? connections.find((c) => c.channelId === inUrl) : undefined;
  // A page opened without a channel in its address stays on the one the user was last on.
  if (fromUrl && fromUrl.id !== picked) setPicked(fromUrl.id);

  // The one in the address, else the last one used if it still exists, otherwise the first that works.
  const active = fromUrl ?? connections.find((c) => c.id === picked) ?? connections.find((c) => c.status === "connected") ?? connections[0] ?? null;
  const activeId = active?.id ?? "";
  const channelId = multi ? active?.channelId : undefined;

  // Keeps the address saying which channel is on screen; with a single channel there is nothing to say.
  useEffect(() => {
    if (loading || (inUrl ?? undefined) === channelId) return;
    window.history.replaceState(null, "", withChannel(search ? `${pathname}?${search}` : pathname, channelId));
  }, [loading, inUrl, channelId, pathname, search]);

  useEffect(() => {
    if (!uid || !activeId) return;
    try {
      window.localStorage.setItem(storageKey(uid), activeId);
    } catch {
      // Storage blocked or full: the address still says which channel it is.
    }
  }, [uid, activeId]);

  // What was made before channels were kept apart, or on a channel since disconnected,
  // stays with the channel connected first, so it never shows nowhere — and a newly connected channel starts empty.
  const homeId = useMemo(() => [...connections].sort((a, b) => (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity) || a.id.localeCompare(b.id))[0]?.id ?? "", [connections]);
  const known = useMemo(() => new Set(connections.map((c) => c.id)), [connections]);

  // Which channel each Short went to is on its schedule. Only needed to tell channels apart.
  const { data: schedules } = useAllSchedules(multi ? uid : undefined);
  const channelOfShort = useMemo(() => new Map(schedules.map((s) => [s.id, s.connectionId])), [schedules]);
  const sent = useMemo(() => (multi ? schedules.filter((s) => s.connectionId === activeId) : []), [multi, schedules, activeId]);

  const switchTo = useCallback(
    (connectionId: string) => {
      const next = connections.find((c) => c.id === connectionId);
      // A new history entry, so Back returns to the channel the user came from.
      if (next) window.history.pushState(null, "", withChannel(window.location.pathname + window.location.search, next.channelId));
    },
    [connections],
  );

  const owns = useCallback(
    (item: Tagged) => {
      const channel = item.connectionId && known.has(item.connectionId) ? item.connectionId : homeId;
      return !multi || channel === activeId;
    },
    [multi, known, homeId, activeId],
  );

  const showsShort = useCallback((short: WithId<ShortDoc>) => owns({ connectionId: short.connectionId ?? channelOfShort.get(short.id) }), [owns, channelOfShort]);

  const hrefFor = useCallback((href: string) => withChannel(href, channelId), [channelId]);

  const value = useMemo<ChannelState>(
    () => ({ connections, loading, active, multi, switchTo, owns, showsShort, sent, hrefFor }),
    [connections, loading, active, multi, switchTo, owns, showsShort, sent, hrefFor],
  );
  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>;
}

export function useChannels() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error("useChannels must be used inside <ChannelProvider>.");
  return ctx;
}

function useKept<T, S extends { data: T[] }>(state: S, keep: (item: T) => boolean): S {
  const data = useMemo(() => state.data.filter(keep), [state.data, keep]);
  return { ...state, data };
}

/** The videos of the channel the app is on. */
export function useChannelVideos(uid: string | undefined, count?: number) {
  return useKept(useVideos(uid, count), useChannels().owns);
}

/** The Shorts of the channel the app is on. */
export function useChannelShorts(uid: string | undefined, count?: number) {
  return useKept(useShorts(uid, count), useChannels().showsShort);
}

/** The banners of the channel the app is on. */
export function useChannelBanners(uid: string | undefined) {
  return useKept(useBanners(uid), useChannels().owns);
}

/** The uploads running on the channel the app is on; another channel's uploads keep going but don't show here. */
export function useChannelUploads() {
  const uploads = useUploads();
  const { owns } = useChannels();
  return useMemo(() => {
    const kept = uploads.uploads.filter(owns);
    return { ...uploads, uploads: kept, byVideoId: new Map(kept.map((u) => [u.videoId, u])) };
  }, [uploads, owns]);
}

/** The background jobs (adding Shorts, cutting videos) of the channel the app is on. */
export function useChannelWork() {
  const work = useWork();
  const { owns } = useChannels();
  return useMemo(
    () => ({
      ...work,
      importJob: work.importJob && owns(work.importJob) ? work.importJob : null,
      splits: new Map([...work.splits].filter(([, job]) => owns(job))),
    }),
    [work, owns],
  );
}

/**
 * The dashboard's numbers for the channel the app is on. With one channel the
 * server counts everything; with several they are counted from what is loaded
 * of this channel. Null until known.
 */
export function useChannelCounts(uid: string | undefined): DashboardCounts | null {
  const { multi, sent } = useChannels();
  const { counts } = useDashboardCounts(uid);
  const videos = useChannelVideos(multi ? uid : undefined);
  const shorts = useChannelShorts(multi ? uid : undefined);

  return useMemo(() => {
    if (!multi) return counts;
    if (videos.loading || shorts.loading) return null;
    return {
      videos: videos.data.length,
      shorts: shorts.data.length,
      scheduled: sent.filter((s) => s.status === "scheduled").length,
      published: sent.filter((s) => s.status === "published").length,
      processing: videos.data.filter((v) => v.status === "queued" || v.status === "processing").length,
      failed: shorts.data.filter((s) => s.status === "failed" || s.status === "quota_exceeded").length + videos.data.filter((v) => v.status === "failed").length,
    };
  }, [multi, counts, sent, videos.loading, videos.data, shorts.loading, shorts.data]);
}
