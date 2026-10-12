"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, ChevronDown } from "lucide-react";
import { SHORT_HEIGHT, bannerHeight, type BannerDoc, type BannerPosition } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { BannerImage } from "@/components/banner/banner-image";
import { cn } from "@/lib/cn";

export const chip = (on: boolean) =>
  cn("h-9 rounded-lg border px-3.5 text-[13px] font-medium transition", on ? "border-accent/50 bg-accent-soft text-text" : "border-line text-muted hover:border-line-strong hover:text-text");

/** One banner strip in a preview, at the share of the frame it will take in the finished Short. */
export function PreviewBanner({ banner }: { banner: BannerDoc | undefined }) {
  if (!banner) return null;
  return (
    <div className="shrink-0 overflow-hidden bg-black" style={{ height: `${(bannerHeight(banner.width, banner.height) / SHORT_HEIGHT) * 100}%` }}>
      <BannerImage banner={banner} className="h-full object-contain" />
    </div>
  );
}

const LABELS: Record<BannerPosition, string> = { top: "Top banner", bottom: "Bottom banner" };

/**
 * Chooses the banner for one position, or none, from the ones already saved.
 * Shows only the current choice; the saved banners open underneath when asked for.
 * New banners are made on the Banners page, not here.
 */
export function BannerPicker({
  position,
  banners,
  selected,
  onSelect,
}: {
  position: BannerPosition;
  /** All the user's banners; only the ones for `position` are offered. */
  banners: WithId<BannerDoc>[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const label = LABELS[position];
  const offered = banners.filter((b) => b.position === position);
  const current = offered.find((b) => b.id === selected);
  const [open, setOpen] = useState(false);

  const choose = (id: string | null) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium">{label}</p>
        <Link href="/banners" className="text-[12px] text-muted transition hover:text-text">
          {offered.length > 0 ? "Manage banners" : "Make one"}
        </Link>
      </div>
      {offered.length === 0 ? (
        <p className="flex h-12 items-center text-[12.5px] text-muted">No {label.toLowerCase()}s yet — make one on the Banners page.</p>
      ) : (
        <>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn("flex h-12 w-full items-center gap-3 rounded-lg border px-2 text-left text-[13px] transition", open ? "border-accent/50" : "border-line hover:border-line-strong")}
          >
            {current ? (
              <span className="grid h-8 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-black">
                <BannerImage banner={current} className="max-h-full object-contain" />
              </span>
            ) : (
              <span className="grid h-8 w-20 shrink-0 place-items-center rounded-md bg-white/[0.04] text-faint">
                <Ban className="size-3.5" />
              </span>
            )}
            <span className={cn("min-w-0 flex-1 truncate font-medium", !current && "text-muted")}>{current ? current.name : "None"}</span>
            <span className="flex shrink-0 items-center gap-1 pr-1.5 text-[12.5px] text-muted">
              {open ? "Close" : "Choose"}
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </span>
          </button>
          {open && (
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
              <button type="button" role="radio" aria-checked={selected === null} onClick={() => choose(null)} className={cn(chip(selected === null), "flex h-12 items-center gap-1.5")}>
                <Ban className="size-3.5" />
                None
              </button>
              {offered.map((banner) => (
                <button
                  key={banner.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === banner.id}
                  aria-label={banner.name}
                  title={banner.name}
                  onClick={() => choose(banner.id)}
                  className={cn(
                    "grid h-12 w-28 place-items-center overflow-hidden rounded-lg border bg-black transition",
                    selected === banner.id ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line hover:border-line-strong",
                  )}
                >
                  <BannerImage banner={banner} className="max-h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
