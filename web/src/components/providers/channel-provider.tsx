"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ScheduleDoc, YoutubeConnectionDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useAllSchedules, useYoutubeConnections, type WithId } from "@/lib/firebase/hooks";

interface ChannelState {
  connections: WithId<YoutubeConnectionDoc>[];
  loading: boolean;
  /** The channel the app is on: Shorts are queued to it, and with several channels pages show only its Shorts. Null until one is connected. */
  active: WithId<YoutubeConnectionDoc> | null;
  /** More than one channel is connected, so there is something to switch between. */
  multi: boolean;
  switchTo: (connectionId: string) => void;
  /** Whether a Short belongs on screen: one not sent anywhere yet shows on every channel, a queued or published one only on its own. */
  showsShort: (shortId: string) => boolean;
  /** Every Short the active channel has been given, queued or published. Empty with a single channel. */
  sent: WithId<ScheduleDoc>[];
}

const ChannelContext = createContext<ChannelState | null>(null);

const storageKey = (uid: string) => `shortflow.activeChannel.${uid}`;

function readSaved(uid: string | undefined) {
  if (!uid || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey(uid)) ?? "";
  } catch {
    return "";
  }
}

/**
 * Which YouTube channel the user is working on. Lives above the pages so the
 * switch in the top bar changes all of them at once, and is remembered in this
 * browser for the signed-in user.
 */
export function ChannelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: connections, loading } = useYoutubeConnections(uid);
  const [picked, setPicked] = useState(() => readSaved(uid));

  // The one picked if it still exists, otherwise the first that works.
  const active = connections.find((c) => c.id === picked) ?? connections.find((c) => c.status === "connected") ?? connections[0] ?? null;
  const multi = connections.length > 1;
  const activeId = active?.id ?? "";

  // Which channel each Short went to is on its schedule. Only needed to tell channels apart.
  const { data: schedules } = useAllSchedules(multi ? uid : undefined);
  const channelOfShort = useMemo(() => new Map(schedules.map((s) => [s.id, s.connectionId])), [schedules]);
  const sent = useMemo(() => (multi ? schedules.filter((s) => s.connectionId === activeId) : []), [multi, schedules, activeId]);

  const switchTo = useCallback(
    (connectionId: string) => {
      setPicked(connectionId);
      try {
        if (uid) window.localStorage.setItem(storageKey(uid), connectionId);
      } catch {
        // Storage blocked or full: the choice still holds until the page is closed.
      }
    },
    [uid],
  );

  const showsShort = useCallback(
    (shortId: string) => {
      const channel = channelOfShort.get(shortId);
      // One that went to a channel since disconnected would otherwise show nowhere.
      return !multi || !channel || channel === activeId || !connections.some((c) => c.id === channel);
    },
    [multi, channelOfShort, activeId, connections],
  );

  const value = useMemo<ChannelState>(() => ({ connections, loading, active, multi, switchTo, showsShort, sent }), [connections, loading, active, multi, switchTo, showsShort, sent]);
  return <ChannelContext.Provider value={value}>{children}</ChannelContext.Provider>;
}

export function useChannels() {
  const ctx = useContext(ChannelContext);
  if (!ctx) throw new Error("useChannels must be used inside <ChannelProvider>.");
  return ctx;
}
