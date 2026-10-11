"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";
import { MOBILE_NAV, isActive } from "./nav";
import { Sidebar, SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";

function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[272px] border-r border-line bg-surface shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button onClick={onClose} className="absolute right-3 top-4 grid size-8 place-items-center rounded-lg text-muted hover:text-text" aria-label="Close navigation">
          <X className="size-4" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium", active ? "text-text" : "text-faint")}
          >
            {Icon === "youtube" ? (
              <YouTubeIcon className={cn("size-5", !active && "opacity-60 grayscale")} />
            ) : (
              <Icon className={cn("size-5", active && "text-accent")} strokeWidth={1.9} />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  return (
    <div className="relative min-h-dvh">
      {/* Ambient cinematic glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[480px] w-[720px] rounded-full bg-accent/[0.07] blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[420px] w-[520px] rounded-full bg-[#3b82f6]/[0.04] blur-[120px]" />
      </div>

      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-[248px]">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main key={pathname} className="mx-auto w-full max-w-[1400px] animate-enter px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
