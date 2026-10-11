"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useUserDoc } from "@/lib/firebase/hooks";
import { LogoMark, YouTubeIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";
import { FOOTER_NAV, MAIN_NAV, isActive } from "./nav";
import { NotificationsMenu } from "./notifications-menu";
import { Avatar } from "./avatar";

function YouTubeStatus({ connected, loading }: { connected: boolean; loading: boolean }) {
  return (
    <Link
      href="/youtube"
      className={cn(
        "hidden h-9 items-center gap-2 rounded-xl border px-3 text-[12.5px] font-medium transition sm:flex",
        connected
          ? "border-success/20 bg-success/[0.06] text-text hover:border-success/35"
          : "border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-text",
        loading && "opacity-0",
      )}
    >
      <YouTubeIcon className="size-4" />
      {connected ? "Connected" : "Connect YouTube"}
      <span className={cn("size-1.5 rounded-full", connected ? "bg-success text-success animate-pulse-dot" : "bg-faint")} />
    </Link>
  );
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: profile, loading } = useUserDoc(user?.uid);
  const title = [...MAIN_NAV, ...FOOTER_NAV].find((item) => isActive(pathname, item.href))?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={onOpenMenu}
        className="grid size-9 place-items-center rounded-xl border border-line text-muted transition hover:text-text lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-[18px]" />
      </button>
      <Link href="/dashboard" className="lg:hidden">
        <LogoMark className="size-7" />
      </Link>
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <YouTubeStatus connected={!!profile?.youtubeConnected} loading={loading} />
        {user && <NotificationsMenu uid={user.uid} />}
        {user && (
          <Link href="/settings" className="lg:hidden" aria-label="Profile and settings">
            <Avatar name={user.displayName ?? user.email} src={user.photoURL} className="size-9" />
          </Link>
        )}
      </div>
    </header>
  );
}
