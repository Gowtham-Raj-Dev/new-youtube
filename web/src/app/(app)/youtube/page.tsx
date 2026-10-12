"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CloudUpload, ExternalLink, Plus, RefreshCcw, Server } from "lucide-react";
import { DEFAULT_TIMEZONE } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useUserDoc, useYoutubeConnections } from "@/lib/firebase/hooks";
import { formatInZone } from "@/lib/time";
import { CALLBACK_ERRORS, connectYouTube, friendlyCallableError } from "@/lib/youtube";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ConnectCard } from "@/components/youtube/connect-card";
import { ChannelCard } from "@/components/youtube/channel-card";

const HOW_IT_WORKS = [
  { icon: CalendarClock, title: "You schedule a Short", body: "Pick a date and time, or let auto-schedule fill your calendar." },
  { icon: Server, title: "The cloud picks it up", body: "A server-side scheduler finds due Shorts. Your browser and PC can be off." },
  { icon: CloudUpload, title: "Uploaded to YouTube", body: "Streamed from Firebase Storage straight to your channel with your title and tags." },
  { icon: RefreshCcw, title: "Status comes back", body: "Published, retried or failed — you'll see it here and in notifications." },
];

/** YouTube's list of the signed-in account's channels, with its "Create a channel" button. */
const CREATE_CHANNEL_URL = "https://www.youtube.com/channel_switcher";

type Banner ={ tone: "success" | "error"; message: string } | null;

/** Reads `?connected=` / `?error=` set by the OAuth callback, then cleans the URL. */
function readCallbackBanner(): Banner {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const error = params.get("error");
  if (!connected && !error) return null;
  window.history.replaceState(null, "", window.location.pathname);
  if (connected) return { tone: "success", message: `${connected} is connected. Scheduled Shorts can now publish automatically.` };
  return { tone: "error", message: CALLBACK_ERRORS[error!] ?? CALLBACK_ERRORS.failed };
}

export default function YouTubePage() {
  const { user } = useAuth();
  const { data: profile } = useUserDoc(user?.uid);
  const { data: connections, loading, error: loadError } = useYoutubeConnections(user?.uid);
  const [banner, setBanner] = useState<Banner>(null);
  const { data: schedules } = useSchedules(user?.uid);
  const [connecting, setConnecting] = useState(false);
  const [now] = useState(() => Date.now());
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the OAuth redirect params
  useEffect(() => setBanner(readCallbackBanner()), []);

  async function connect() {
    setConnecting(true);
    setBanner(null);
    try {
      await connectYouTube(); // navigates away on success
    } catch (error) {
      setBanner({ tone: "error", message: friendlyCallableError(error) });
      setConnecting(false);
    }
  }

  const showError = (message: string) => setBanner({ tone: "error", message });

  /** What is queued for a channel, so a cut-off one can say by when to reconnect. */
  function waitingFor(connectionId: string) {
    const due = schedules
      .filter((s) => s.connectionId === connectionId && (s.status === "scheduled" || s.status === "quota_exceeded"))
      .map((s) => s.publishAt.toMillis())
      .sort((a, b) => a - b);
    const next = due.find((ms) => ms > now);
    return {
      total: due.length,
      overdue: due.filter((ms) => ms <= now).length,
      nextAt: next ? formatInZone(new Date(next), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">YouTube connection</h2>
          <p className="mt-1 text-sm text-muted">Connect the channel ShortFlow publishes to. Tokens stay encrypted on the server — never in your browser.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* YouTube has no API for making a channel, so this opens its own page for it. */}
          <a href={CREATE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
            <ExternalLink className="size-4" />
            Create a new channel on YouTube
          </a>
          {connections.length > 0 && (
            <Button variant="secondary" loading={connecting} icon={<Plus className="size-4" />} onClick={connect}>
              Connect another channel
            </Button>
          )}
        </div>
      </div>

      {banner && (
        <Alert tone={banner.tone} onDismiss={() => setBanner(null)}>
          {banner.message}
        </Alert>
      )}
      {loadError && <Alert tone="error">We couldn&apos;t load your channels. Check your connection and refresh.</Alert>}

      {loading ? (
        <Card className="flex items-center gap-5 p-6">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </Card>
      ) : connections.length === 0 ? (
        <ConnectCard onConnect={connect} connecting={connecting} />
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <ChannelCard key={c.id} connection={c} timezone={timezone} waiting={waitingFor(c.id)} onError={showError} />
          ))}
          <p className="px-1 text-[12.5px] leading-relaxed text-muted">
            Several channels under one Google account? Press <span className="text-text">Connect another channel</span> once for each: choose the same Google account, then a different channel on
            Google&apos;s &ldquo;Choose an account or a brand account&rdquo; screen. Then switch between them in the top bar: Shorts you queue go to the channel shown there. Need a new one first?{" "}
            <span className="text-text">Create a new channel on YouTube</span> opens YouTube, where &ldquo;Create a channel&rdquo; adds one under the Google account you&apos;re signed in to there — then come back and
            connect it.
          </p>
        </div>
      )}

      <Card>
        <CardHeader title="How automatic publishing works" description="Runs entirely on Google Cloud." />
        <ol className="grid gap-px overflow-hidden rounded-b-2xl p-5 sm:grid-cols-2 xl:grid-cols-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative rounded-xl p-4">
              <span className="mb-3 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="size-4" />
                </span>
                <span className="font-mono text-[11px] text-faint">0{i + 1}</span>
              </span>
              <p className="text-[13.5px] font-medium">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
