"use client";

/* eslint-disable @next/next/no-img-element -- YouTube avatars in a static export */
import { useState } from "react";
import { Link2, RefreshCw, TriangleAlert, Unplug } from "lucide-react";
import type { YoutubeConnectionDoc } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { connectYouTube, disconnectYouTube, friendlyCallableError, refreshYouTubeChannel } from "@/lib/youtube";
import { formatInZone, toDate } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { YouTubeIcon } from "@/components/ui/brand-icons";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function ChannelCard({
  connection,
  timezone,
  waiting,
  onError,
}: {
  connection: WithId<YoutubeConnectionDoc>;
  timezone: string;
  /** Queued Shorts for this channel: how many, how many are past their time, and when the next one is due. */
  waiting: { total: number; overdue: number; nextAt: string | null };
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState<"refresh" | "disconnect" | "reconnect" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const expired = connection.status !== "connected";
  const since = toDate(connection.createdAt);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<unknown>) {
    setBusy(kind);
    try {
      await action();
      if (kind === "disconnect") setConfirming(false);
    } catch (error) {
      onError(friendlyCallableError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="animate-enter p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          {connection.channelThumbnailUrl ? (
            <img src={connection.channelThumbnailUrl} alt="" referrerPolicy="no-referrer" className="size-16 rounded-full border border-line-strong object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full border border-line-strong bg-surface-2">
              <YouTubeIcon className="size-7" />
            </span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-surface bg-surface-2">
            <YouTubeIcon className="size-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-tight">{connection.channelTitle}</h3>
            {expired ? <Badge tone="danger">Reconnect needed</Badge> : <Badge tone="success" dot>Connected</Badge>}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            {connection.channelHandle && <span>{connection.channelHandle}</span>}
            {connection.subscriberCount != null && <span>{compact.format(connection.subscriberCount)} subscribers</span>}
            {since && <span className="text-faint">Connected {formatInZone(since, timezone, { timeStyle: undefined })}</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {expired ? (
            <Button loading={busy === "reconnect"} icon={<Link2 className="size-4" />} onClick={() => run("reconnect", connectYouTube)}>
              Reconnect now
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" loading={busy === "refresh"} icon={<RefreshCw className="size-3.5" />} onClick={() => run("refresh", () => refreshYouTubeChannel(connection.id))}>
                Refresh
              </Button>
              {/* Signing in with Google again renews the saved permission in place. */}
              <Button variant="secondary" size="sm" loading={busy === "reconnect"} icon={<Link2 className="size-3.5" />} onClick={() => run("reconnect", connectYouTube)}>
                Reconnect
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" icon={<Unplug className="size-3.5" />} onClick={() => setConfirming(true)}>
            Disconnect
          </Button>
        </div>
      </div>

      {expired && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-medium text-text">Your Google session for this channel expired, so ShortFlow cut the connection.</span> Nothing uploads to it until you reconnect.{" "}
            {waiting.overdue > 0 ? (
              <>
                <span className="font-medium text-danger">
                  {waiting.overdue === 1 ? "1 queued Short has" : `${waiting.overdue} queued Shorts have`} already missed {waiting.overdue === 1 ? "its" : "their"} time.
                </span>{" "}
                Reconnect now and {waiting.overdue === 1 ? "it goes" : "they go"} out within about 5 minutes.
              </>
            ) : waiting.nextAt ? (
              <>
                <span className="font-medium text-danger">Reconnect before {waiting.nextAt}</span> — that is when your next queued Short is due ({waiting.total} waiting). Later than that and it goes out late.
              </>
            ) : (
              "Nothing is queued for it right now, but you can't queue or upload until you do."
            )}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Disconnect ${connection.channelTitle}?`}
        description="ShortFlow will lose upload access immediately. Scheduled Shorts for this channel won't publish until you reconnect."
        confirmLabel="Disconnect"
        loading={busy === "disconnect"}
        onConfirm={() => run("disconnect", () => disconnectYouTube(connection.id))}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
