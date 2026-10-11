"use client";

import { ArrowRight, CalendarClock, Film, Upload } from "lucide-react";
import { DEFAULT_TIMEZONE } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useUserDoc, useVideos } from "@/lib/firebase/hooks";
import { useUploads } from "@/lib/uploads/upload-provider";
import { VideoCard, VideoCardSkeleton } from "@/components/video/video-card";
import { useDashboardCounts } from "@/lib/firebase/counts";
import { greetingFor } from "@/lib/time";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { DashboardHero } from "@/components/dashboard/hero";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profile, loading: profileLoading } = useUserDoc(user?.uid);
  const { counts } = useDashboardCounts(user?.uid);
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
        <p className="mt-1.5 text-sm text-muted">Manage your videos, Shorts and automated YouTube publishing from one place.</p>
      </div>

      {!profileLoading && !profile?.youtubeConnected && <ConnectYouTubeBanner />}

      <DashboardHero />
      <StatCards counts={counts} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {user && <RecentVideos uid={user.uid} timezone={timezone} />}
          <Card>
            <CardHeader title="Upcoming schedule" description="The next Shorts going live on YouTube." />
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="No scheduled Shorts"
              description="Your publishing calendar is empty."
              action={
                <ButtonLink href="/schedule" variant="secondary">
                  Schedule a Short
                </ButtonLink>
              }
            />
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader title="Recent activity" description="Everything ShortFlow does, as it happens." />
          {user && <ActivityFeed uid={user.uid} />}
        </Card>
      </div>
    </div>
  );
}
