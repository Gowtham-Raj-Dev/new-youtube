"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { ChevronDown, ChevronsUpDown, LogOut } from "lucide-react";
import { BRAND } from "@shortflow/shared";
import { useChannels } from "@/components/providers/channel-provider";
import { signOut } from "@/lib/firebase/auth";
import { isAdmin } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, FOOTER_NAV, isActive } from "./nav";
import { Avatar } from "./avatar";

/**
 * The account's card: opens its pages (settings, help, owner tools) and sign-out.
 * At the foot of the sidebar it opens upward; in the top bar (phones) it is just the avatar.
 */
export function ProfileMenu({ user, placement = "topbar" }: { user: User; placement?: "sidebar" | "topbar" }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { hrefFor } = useChannels();
  const name = user.displayName ?? "Creator";
  const items = [...FOOTER_NAV, ...(isAdmin(user) ? ADMIN_NAV : [])];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !panelRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {placement === "sidebar" ? (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-line hover:bg-white/[0.04]",
            open && "border-line bg-white/[0.05]",
          )}
        >
          <Avatar name={user.displayName ?? user.email} src={user.photoURL} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-text">{name}</span>
            <span className="block truncate text-[11.5px] text-faint">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-faint" />
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl border border-line bg-surface-2/60 pl-1 pr-1.5 text-muted transition hover:border-line-strong hover:text-text sm:pr-2.5",
            open && "border-line-strong text-text",
          )}
        >
          <Avatar name={user.displayName ?? user.email} src={user.photoURL} className="size-7" />
          <ChevronDown className={cn("hidden size-3.5 transition sm:block", open && "rotate-180")} />
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 animate-enter overflow-hidden rounded-2xl border border-line-strong bg-surface-2/95 shadow-2xl shadow-black/60 backdrop-blur-xl",
            placement === "sidebar" ? "bottom-full left-0 right-0 mb-2 origin-bottom" : "right-0 top-12 w-[min(280px,calc(100vw-32px))] origin-top-right",
          )}
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <Avatar name={user.displayName ?? user.email} src={user.photoURL} />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold">{name}</p>
              <p className="truncate text-[12px] text-faint">{user.email}</p>
            </div>
          </div>

          <div className="p-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={hrefFor(item.href)}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
                    active ? "bg-white/[0.06] text-text" : "text-muted hover:bg-white/[0.05] hover:text-text",
                  )}
                >
                  {Icon !== "youtube" && <Icon className={cn("size-4", active ? "text-accent" : "text-faint")} strokeWidth={1.9} />}
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-line p-1.5">
            <button
              role="menuitem"
              onClick={() => void signOut()}
              className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-danger transition hover:bg-danger/10"
            >
              <LogOut className="size-4" />
              Sign out of {BRAND.name}
            </button>
          </div>

          <p className="flex gap-3 border-t border-line px-4 py-2.5 text-[11px] text-faint">
            <Link href="/privacy" className="transition hover:text-muted">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-muted">
              Terms
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
