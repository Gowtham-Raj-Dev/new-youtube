"use client";

import { Avatar } from "@/components/layout/avatar";
import { useChannels } from "@/components/providers/channel-provider";
import { cn } from "@/lib/cn";

/**
 * Inline channel selector for queue, schedule, Shorts and settings pages when
 * multiple channels are connected so switching updates the active channel context.
 */
export function ChannelTabs({
  badgeFor,
  caption,
}: {
  badgeFor?: (connectionId: string) => number | string | undefined;
  caption?: string;
}) {
  const { connections, active, switchTo } = useChannels();
  if (connections.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {connections.map((c) => {
        const current = c.id === active?.id;
        const badge = badgeFor?.(c.id);
        const expired = c.status !== "connected";
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => switchTo(c.id)}
            aria-pressed={current}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[13px] font-medium transition",
              current
                ? "border-accent/50 bg-accent-soft text-text shadow-sm"
                : "border-line bg-surface-2/60 text-muted hover:border-line-strong hover:text-text",
            )}
          >
            <Avatar name={c.channelTitle} src={c.channelThumbnailUrl} className="size-5 text-[10px]" />
            <span className="max-w-44 truncate">{c.channelTitle}</span>
            {expired ? (
              <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-danger">Reconnect</span>
            ) : badge !== undefined && badge !== 0 ? (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", current ? "bg-accent/25 text-text" : "bg-white/[0.06] text-muted")}>
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
      {caption && <span className="text-[12px] text-faint">{caption}</span>}
    </div>
  );
}

