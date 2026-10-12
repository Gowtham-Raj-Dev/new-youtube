"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { LogoMark } from "@/components/ui/brand-icons";
import { ADMIN_NAV, FOOTER_NAV, MAIN_NAV, isActive } from "./nav";
import { ChannelSwitcher } from "./channel-switcher";
import { NotificationsMenu } from "./notifications-menu";
import { Avatar } from "./avatar";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const title = [...MAIN_NAV, ...FOOTER_NAV, ...ADMIN_NAV].find((item) => isActive(pathname, item.href))?.label ?? "";

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
        <ChannelSwitcher />
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
