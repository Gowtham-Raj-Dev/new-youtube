"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { BRAND } from "@shortflow/shared";
import { Logo, YouTubeIcon } from "@/components/ui/brand-icons";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannels } from "@/components/providers/channel-provider";
import { signOut } from "@/lib/firebase/auth";
import { cn } from "@/lib/cn";
import { isAdmin } from "@/lib/admin";
import { ADMIN_NAV, FOOTER_NAV, MAIN_NAV, isActive, type NavItem } from "./nav";
import { Avatar } from "./avatar";

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

      <div className="space-y-0.5 border-t border-line px-3 py-3">
        {[...FOOTER_NAV, ...(isAdmin(user) ? ADMIN_NAV : [])].map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>

      <p className="flex gap-3 px-6 pb-2 text-[11px] text-faint">
        <Link href="/privacy" className="transition hover:text-muted">
          Privacy
        </Link>
        <Link href="/terms" className="transition hover:text-muted">
          Terms
        </Link>
      </p>

      {user && (
        <div className="flex items-center gap-3 border-t border-line px-4 py-3.5">
          <Avatar name={user.displayName ?? user.email} src={user.photoURL} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{user.displayName ?? "Creator"}</p>
            <p className="truncate text-[11.5px] text-faint">{user.email}</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-white/[0.05] hover:text-text"
            title={`Sign out of ${BRAND.name}`}
          >
            <LogOut className="size-4" />
          </button>
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
