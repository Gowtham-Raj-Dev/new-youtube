"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentReference,
  type Query,
} from "firebase/firestore";
import {
  COLLECTIONS,
  type ActivityLogDoc,
  type JobDoc,
  type NotificationDoc,
  type ScheduleDoc,
  type SettingsDoc,
  type ShortDoc,
  type UserDoc,
  type VideoDoc,
  type YoutubeConnectionDoc,
} from "@shortflow/shared";
import { firebase } from "./client";

export type WithId<T> = T & { id: string };

interface LiveState<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/** Live query keyed by `key`; pass `null` to pause (e.g. while signed out). */
function useLiveQuery<T>(key: string | null, build: () => Query): LiveState<WithId<T>[]> {
  const [state, setState] = useState<LiveState<WithId<T>[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!key) return;
    return onSnapshot(
      build(),
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    );
    // `key` fully identifies the query; `build` is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

function useLiveDoc<T>(key: string | null, build: () => DocumentReference): LiveState<WithId<T> | null> {
  const [state, setState] = useState<LiveState<WithId<T> | null>>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!key) return;
    return onSnapshot(
      build(),
      (snap) => setState({ data: snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null, loading: false, error: null }),
      (error) => setState({ data: null, loading: false, error }),
    );
    // `key` fully identifies the query; `build` is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function useUserDoc(uid: string | undefined) {
  return useLiveDoc<UserDoc>(uid ? `user:${uid}` : null, () => doc(firebase().db, COLLECTIONS.users, uid!));
}

export function useVideos(uid: string | undefined, count = 100) {
  return useLiveQuery<VideoDoc>(uid ? `videos:${uid}:${count}` : null, () =>
    query(collection(firebase().db, COLLECTIONS.videos), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(count)),
  );
}

export function useSettings(uid: string | undefined) {
  return useLiveDoc<SettingsDoc>(uid ? `settings:${uid}` : null, () => doc(firebase().db, COLLECTIONS.settings, uid!));
}

/** Live progress of a processing job; pass the video's `activeJobId`. */
export function useJob(jobId: string | null | undefined) {
  return useLiveDoc<JobDoc>(jobId ? `job:${jobId}` : null, () => doc(firebase().db, COLLECTIONS.jobs, jobId!));
}

export function useShorts(uid: string | undefined, count = 300) {
  return useLiveQuery<ShortDoc>(uid ? `shorts:${uid}:${count}` : null, () =>
    query(collection(firebase().db, COLLECTIONS.shorts), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(count)),
  );
}

const QUEUE_HISTORY_MS = 7 * 24 * 60 * 60 * 1000;

/** Everything in the upload queue: what's still to go out, plus the last week's results. Earliest first. */
export function useSchedules(uid: string | undefined, count = 300) {
  return useLiveQuery<ScheduleDoc>(uid ? `schedules:${uid}:${count}` : null, () =>
    query(
      collection(firebase().db, COLLECTIONS.schedules),
      where("userId", "==", uid),
      where("publishAt", ">=", new Date(Date.now() - QUEUE_HISTORY_MS)),
      orderBy("publishAt", "asc"),
      limit(count),
    ),
  );
}

export function useYoutubeConnections(uid: string | undefined) {
  return useLiveQuery<YoutubeConnectionDoc>(uid ? `yt:${uid}` : null, () =>
    query(collection(firebase().db, COLLECTIONS.youtubeConnections), where("userId", "==", uid)),
  );
}

export function useRecentActivity(uid: string | undefined, count = 8) {
  return useLiveQuery<ActivityLogDoc>(uid ? `activity:${uid}:${count}` : null, () =>
    query(
      collection(firebase().db, COLLECTIONS.activityLogs),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(count),
    ),
  );
}

export function useNotifications(uid: string | undefined, count = 20) {
  return useLiveQuery<NotificationDoc>(uid ? `notifications:${uid}:${count}` : null, () =>
    query(
      collection(firebase().db, COLLECTIONS.notifications),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(count),
    ),
  );
}
