"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer, query, where, type QueryConstraint } from "firebase/firestore";
import { COLLECTIONS } from "@shortflow/shared";
import { firebase } from "./client";

export interface DashboardCounts {
  videos: number;
  shorts: number;
  scheduled: number;
  published: number;
  processing: number;
  failed: number;
}

async function count(uid: string, name: string, ...constraints: QueryConstraint[]) {
  const q = query(collection(firebase().db, name), where("userId", "==", uid), ...constraints);
  return (await getCountFromServer(q)).data().count;
}

/** Aggregate counts (billed per 1,000 index entries, not per document). */
export function useDashboardCounts(uid: string | undefined) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    Promise.all([
      count(uid, COLLECTIONS.videos),
      count(uid, COLLECTIONS.shorts),
      count(uid, COLLECTIONS.shorts, where("status", "==", "scheduled")),
      count(uid, COLLECTIONS.shorts, where("status", "==", "published")),
      count(uid, COLLECTIONS.videos, where("status", "in", ["queued", "processing"])),
      count(uid, COLLECTIONS.shorts, where("status", "in", ["failed", "quota_exceeded"])),
      count(uid, COLLECTIONS.videos, where("status", "==", "failed")),
    ])
      .then(([videos, shorts, scheduled, published, processing, failedShorts, failedVideos]) => {
        if (!cancelled) setCounts({ videos, shorts, scheduled, published, processing, failed: failedShorts + failedVideos });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { counts, error };
}
