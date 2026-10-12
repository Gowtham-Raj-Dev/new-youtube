"use client";

import { ArrowRight, CalendarClock, Film, Upload } from "lucide-react";
import { DEFAULT_SETTINGS, DEFAULT_TIMEZONE } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannels } from "@/components/providers/channel-provider";
import { useSchedules, useSettings, useShorts, useUserDoc, useVideos } from "@/lib/firebase/hooks";
import { useUploads } from "@/lib/uploads/upload-provider";
import { VideoCard, VideoCardSkeleton } from "@/components/video/video-card";
import { useDashboardCounts } from "@/lib/firebase/counts";
import { formatInZone, greetingFor, toDate } from "@/lib/time";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { DashboardHero } from "@/components/dashboard/hero";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ShortStatusBadge, ShortThumbnail } from "@/components/short/short-card";

function ConnectYouTubeBanner() {
  return (
    <Card className="flex flex-col gap-4 border-[#ff0033]/20 bg-[linear-gradient(100deg,rgb(255_0_51/0.08),transparent_60%)] p-5 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface-2">
        <YouTubeIcon className="size-6" />
      </span>
      <div className="flex-1">
        <p className="text-[14.5px] font-semibold">Connect your YouTube channel</p>
        <p className="mt-0.5 text-[13px] text-muted">Required before ShortFlow can publish scheduled Shorts for you.</p>
      </div>
      <ButtonLink href="/youtube" variant="secondary">
        Connect YouTube
        <ArrowRight className="size-4" />
      </ButtonLink>
    </Card>
  );
}

function RecentVideos({ uid, timezone }: { uid: string; timezone: string }) {
  const { data: videos, loading } = useVideos(uid, 4);
  const { byVideoId } = useUploads();

  return (
    <Card>
      <CardHeader
        title="Recent videos"
        description="Long-form uploads and their processing status."
        action={
          videos.length > 0 && (
            <ButtonLink href="/videos" variant="ghost" size="sm">
              View all
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          )
        }
      />
      {loading ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </div>
      ) : videos.length > 0 ? (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} upload={byVideoId.get(video.id)} timezone={timezone} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Film className="size-5" />}
          title="No videos yet"
          description="Upload your first long-form video and let ShortFlow turn it into Shorts."
          action={
            <ButtonLink href="/videos" icon={<Upload className="size-4" />}>
              Upload Video
            </ButtonLink>
          }
        />
      )}
    </Card>
  );
}

function UpcomingSchedule({ uid }: { uid: string }) {
  const { data: schedules, loading } = useSchedules(uid);
  const { active, multi } = useChannels();
  const { data: shorts } = useShorts(uid);
  const { data: settings } = useSettings(uid);
  const timezone = (settings ?? DEFAULT_SETTINGS).publishing.timezone;
  // With several channels, only what is going out on the one picked in the top bar.
  const waiting = schedules.filter((s) => (!multi || s.connectionId === active?.id) && (s.status === "scheduled" || s.status === "uploading" || s.status === "quota_exceeded"));
  const next = waiting.slice(0, 4);

  return (
    <Card>
      <CardHeader
        title="Upcoming schedule"
        description="The next Shorts going live on YouTube."
        action={
          waiting.length > 0 && (
            <ButtonLink href="/queue" variant="ghost" size="sm">
              View all {waiting.length}
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          )
        }
      />
      {loading ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : next.length > 0 ? (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {next.map((schedule) => {
            const short = shorts.find((s) => s.id === schedule.id);
            const at = toDate(schedule.publishAt);
            return (
              <li key={schedule.id} className="flex items-center gap-3.5 px-5 py-3">
                <div className="aspect-[9/16] w-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">{short && <ShortThumbnail short={short} />}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium">{short?.title ?? "Short"}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">{at && formatInZone(at, timezone)}</p>
                </div>
                <ShortStatusBadge status={schedule.status} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<CalendarClock className="size-5" />}
          title="No scheduled Shorts"
          description="Your publishing calendar is empty."
          action={
            <ButtonLink href="/shorts" variant="secondary">
              Queue a Short
            </ButtonLink>
          }
        />
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profile, loading: profileLoading } = useUserDoc(user?.uid);
  const { counts: totals } = useDashboardCounts(user?.uid);
  // The totals cover every channel. With several connected, Scheduled and Published are counted for the one in the top bar.
  const { active, multi, sent } = useChannels();
  const counts = totals && multi ? { ...totals, scheduled: sent.filter((s) => s.status === "scheduled").length, published: sent.filter((s) => s.status === "published").length } : totals;
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const firstName = (profile?.displayName ?? user?.displayName ?? "").split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        {profileLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greetingFor(timezone)}, {firstName}
          </h2>
        )}
        <p className="mt-1.5 text-sm text-muted">
          Manage your videos, Shorts and automated YouTube publishing from one place.
          {multi && active && (
            <>
              {" "}
              You are on <span className="font-medium text-text">{active.channelTitle}</span> — switch channel in the top bar.
            </>
          )}
        </p>
      </div>

      {!profileLoading && !profile?.youtubeConnected && <ConnectYouTubeBanner />}

      <DashboardHero />
      <StatCards counts={counts} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {user && <RecentVideos uid={user.uid} timezone={timezone} />}
          {user && <UpcomingSchedule uid={user.uid} />}
        </div>
        <Card className="h-fit">
          <CardHeader title="Recent activity" description="Everything ShortFlow does, as it happens." />
          {user && <ActivityFeed uid={user.uid} />}
        </Card>
      </div>
    </div>
  );
}
