"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import { useChannels } from "@/components/providers/channel-provider";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";

/**
 * The channel the app is on, in the top bar. With several connected it opens a
 * list to switch between them; whichever is chosen is the one the pages show,
 * each channel having its own videos, Shorts, banners, queue and activity.
 */
export function ChannelSwitcher() {
  const { connections, loading, active, switchTo, hrefFor } = useChannels();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!active) {
    return (
      <Link
        href="/youtube"
        className={cn("hidden h-9 items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 text-[12.5px] font-medium text-muted transition hover:border-line-strong hover:text-text sm:flex", loading && "opacity-0")}
      >
        <YouTubeIcon className="size-4" />
        Connect YouTube
        <span className="size-1.5 rounded-full bg-faint" />
      </Link>
    );
  }

  const expired = active.status !== "connected";
  // A channel Google cut off needs attention even while the user is on another one.
  const otherExpired = connections.some((c) => c.id !== active.id && c.status !== "connected");

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        title="The channel your Shorts go to"
        className={cn(
          "flex h-9 max-w-[52vw] items-center gap-2 rounded-xl border pl-1.5 pr-2.5 text-[12.5px] font-medium transition sm:max-w-64",
          expired ? "border-danger/30 bg-danger/10 text-danger hover:border-danger/50" : "border-success/20 bg-success/[0.06] text-text hover:border-success/35",
        )}
      >
        <Avatar name={active.channelTitle} src={active.channelThumbnailUrl} className="size-6 text-[11px]" />
        <span className="min-w-0 truncate">{expired ? `Reconnect ${active.channelTitle}` : active.channelTitle}</span>
        {otherExpired && !expired && <span className="size-1.5 shrink-0 rounded-full bg-danger" />}
        <ChevronsUpDown className="size-3.5 shrink-0 text-faint" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-enter overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60">
          <p className="px-3.5 pb-1.5 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{connections.length > 1 ? "Switch channel" : "Your channel"}</p>
          <ul role="listbox" aria-label="YouTube channel" className="max-h-72 overflow-y-auto px-1.5 pb-1.5">
            {connections.map((c) => {
              const on = c.id === active.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      switchTo(c.id);
                      setOpen(false);
                    }}
                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition", on ? "bg-white/[0.06]" : "hover:bg-white/[0.04]")}
                  >
                    <Avatar name={c.channelTitle} src={c.channelThumbnailUrl} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{c.channelTitle}</span>
                      <span className={cn("block truncate text-[11.5px]", c.status === "connected" ? "text-faint" : "text-danger")}>
                        {c.status === "connected" ? (c.channelHandle ?? "Connected") : "Cut off — reconnect it"}
                      </span>
                    </span>
                    {on && <Check className="size-4 shrink-0 text-accent" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link href={hrefFor("/youtube")} onClick={() => setOpen(false)} className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 text-[12.5px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-text">
            <Settings2 className="size-3.5" />
            Connect or manage channels
          </Link>
        </div>
      )}
    </div>
  );
}
