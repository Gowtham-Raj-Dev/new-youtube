"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HardDrive, RefreshCw, Trash2, TriangleAlert, Users } from "lucide-react";
import { FREE_STORAGE_BYTES, formatBytes, type UsageReport } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchUsage, isAdmin, removeLeftovers } from "@/lib/admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/layout/avatar";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";

const percent = (bytes: number) => (bytes / FREE_STORAGE_BYTES) * 100;
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dayAndTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Accent while there is room, amber from 80% of the free plan, red once it is over. */
function barTone(totalBytes: number) {
  const used = percent(totalBytes);
  return used >= 100 ? "bg-danger" : used >= 80 ? "bg-warning" : "bg-accent";
}

export default function UsagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const admin = isAdmin(user);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setReport(await fetchUsage());
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!admin) {
      router.replace("/dashboard");
      return;
    }
    let cancelled = false;
    fetchUsage()
      .then((data) => !cancelled && setReport(data))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, admin, router]);

  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function remove() {
    setRemoving(true);
    setNotice(null);
    try {
      const freed = await removeLeftovers();
      setNotice({
        tone: "success",
        message: freed.files > 0 ? `Deleted ${freed.files} leftover file${freed.files === 1 ? "" : "s"} — ${formatBytes(freed.bytes)} freed.` : "Nothing was deleted. Files saved in the last 10 minutes are left alone — try again a little later.",
      });
      await load();
    } catch {
      setNotice({ tone: "error", message: "Couldn't delete the leftover files. Check your connection and try again." });
    }
    setRemoving(false);
    setConfirming(false);
  }

  if (!admin) return null;

  const total = report?.totalBytes ?? 0;
  const left = FREE_STORAGE_BYTES - total;
  const users = report?.users ?? [];
  const channels = users.reduce((sum, u) => sum + u.channels, 0);
  // Files in the bucket that sit outside every user's folder.
  const leftoverBytes = users.reduce((sum, u) => sum + (u.orphanBytes ?? 0), 0);
  const leftoverFiles = users.reduce((sum, u) => sum + (u.orphanFiles ?? 0), 0);
  const unowned = total - users.reduce((sum, u) => sum + u.storageBytes, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Usage</h2>
          <p className="mt-1 text-sm text-muted">Everyone who uses the app, the channels they connected and the storage they take. Only you can see this page.</p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw className="size-3.5" />} loading={loading} onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {notice && (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}
      {failed && <Alert tone="error">We couldn&apos;t load the usage. Check your connection and press Refresh.</Alert>}

      {!report ? (
        loading && (
          <Card className="space-y-4 p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </Card>
        )
      ) : (
        <>
          <Card>
            <CardHeader title="Storage, all users together" description={`The free plan includes ${formatBytes(FREE_STORAGE_BYTES, 0)} for the whole app.`} />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {formatBytes(total)} <span className="text-base font-normal text-muted">of {formatBytes(FREE_STORAGE_BYTES, 0)}</span>
                </p>
                <p className={cn("text-[13px] tabular-nums", left < 0 ? "text-danger" : "text-muted")}>
                  {left < 0 ? `${formatBytes(-left)} over the free plan` : `${formatBytes(left)} left`} · {percent(total).toFixed(1)}%
                </p>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(percent(total)))}
                aria-label="Storage used of the free plan"
              >
                <div className={cn("h-full rounded-full transition-[width]", barTone(total))} style={{ width: `${Math.min(100, percent(total))}%` }} />
              </div>
              {leftoverFiles > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-warning sm:flex-row sm:items-center">
                  <span className="flex-1">
                    {formatBytes(leftoverBytes)} ({leftoverFiles} file{leftoverFiles === 1 ? "" : "s"}) is leftover: files of Shorts, videos and banners that are no longer in the app, so no page shows them.
                  </span>
                  <Button variant="danger" size="sm" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirming(true)}>
                    Delete leftover files
                  </Button>
                </div>
              )}
              {percent(total) >= 80 && (
                <p className="flex gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[13px] leading-relaxed text-warning">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {left < 0
                      ? "The app is over the free plan. Delete original videos or published Shorts to get back under it."
                      : "The app is close to the free plan's limit. Delete original videos or published Shorts to free space."}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-muted">
                <span className="flex items-center gap-2">
                  <Users className="size-3.5 text-faint" />
                  {users.length} user{users.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-2">
                  <YouTubeIcon className="size-3.5" />
                  {channels} channel{channels === 1 ? "" : "s"} connected
                </span>
                {unowned > 0 && (
                  <span className="flex items-center gap-2">
                    <HardDrive className="size-3.5 text-faint" />
                    {formatBytes(unowned)} in files that belong to no user
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Users" description="Biggest storage first." />
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {users.map((u) => (
                <li key={u.uid} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={u.displayName ?? u.email} src={u.photoURL} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[13.5px] font-medium">
                        <span className="truncate">{u.email ?? "Deleted account"}</span>
                        {u.uid === user?.uid && <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">You</span>}
                      </p>
                      <p className="truncate text-[12px] text-faint">
                        {u.displayName ?? (u.email ? "No name" : u.uid)}
                        {u.lastSignInAt != null && ` · last signed in ${day.format(u.lastSignInAt)}`}
                      </p>
                    </div>
                  </div>
                  <p className="flex shrink-0 items-center gap-2 text-[13px] tabular-nums text-muted sm:w-28">
                    <YouTubeIcon className={cn("size-4", u.channels === 0 && "opacity-50 grayscale")} />
                    {u.channels} channel{u.channels === 1 ? "" : "s"}
                  </p>
                  <div className="w-full shrink-0 sm:w-64">
                    <div className="flex items-baseline justify-between gap-2 text-[13px] tabular-nums">
                      <span className="font-medium">{formatBytes(u.storageBytes)}</span>
                      <span className="text-faint">
                        {percent(u.storageBytes).toFixed(1)}% of {formatBytes(FREE_STORAGE_BYTES, 0)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={cn("h-full rounded-full", barTone(total))} style={{ width: `${Math.min(100, percent(u.storageBytes))}%` }} />
                    </div>
                    {u.orphanFiles > 0 && (
                      <p className="mt-1.5 text-[12px] tabular-nums text-warning">
                        {formatBytes(u.orphanBytes)} of it ({u.orphanFiles} file{u.orphanFiles === 1 ? "" : "s"}) is leftover: Shorts, videos or banners no longer in the app.
                      </p>
                    )}
                    <p className="mt-1.5 text-[12px] tabular-nums text-faint">
                      {u.files === 0 ? "No files" : `Videos ${formatBytes(u.videoBytes)} · Shorts ${formatBytes(u.shortBytes)} · ${u.files} file${u.files === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <p className="text-[12px] text-faint">Measured {dayAndTime.format(report.generatedAt)} from the files in Storage.</p>
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Delete ${leftoverFiles} leftover file${leftoverFiles === 1 ? "" : "s"}?`}
        description={`${formatBytes(leftoverBytes)} of files whose Short, video or banner is no longer in the app are deleted from storage for good. Shorts and videos that still show in the app are not touched.`}
        confirmLabel="Delete leftover files"
        loading={removing}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
