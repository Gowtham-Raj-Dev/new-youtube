"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, YouTubeIcon } from "@/components/ui/brand-icons";
import { useChannels } from "@/components/providers/channel-provider";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/providers/auth-provider";
import { MAIN_NAV, isActive, type NavItem } from "./nav";
import { ProfileMenu } from "./profile-menu";

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(pathname, item.href);
  const { hrefFor } = useChannels();
  const Icon = item.icon;
  return (
    <Link
      href={hrefFor(item.href)}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
        active ? "bg-white/[0.06] text-text" : "text-muted hover:bg-white/[0.035] hover:text-text",
      )}
    >
      {active && <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]" />}
      {Icon === "youtube" ? (
        <YouTubeIcon className={cn("size-[17px] transition", !active && "opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0")} />
      ) : (
        <Icon className={cn("size-[17px]", active ? "text-accent" : "text-faint group-hover:text-muted")} strokeWidth={1.9} />
      )}
      {item.label}
    </Link>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { hrefFor } = useChannels();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href={hrefFor("/dashboard")} onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="px-3 pb-2 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">Workspace</p>
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Settings, Help, the owner tools and sign-out open from the profile card. */}
      {user && (
        <div className="border-t border-line p-3">
          <ProfileMenu user={user} placement="sidebar" />
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-surface/60 backdrop-blur-xl lg:block">
      <SidebarContent />
    </aside>
  );
}
