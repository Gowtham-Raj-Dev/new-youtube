"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Ban, ImagePlus } from "lucide-react";
import { SHORT_HEIGHT, bannerHeight, type BannerDoc, type BannerPosition } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { addBanner } from "@/lib/banners";
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

/** Chooses the banner for one position, or none. An image uploaded here is saved to My banners and chosen straight away. */
export function BannerPicker({
  position,
  uid,
  banners,
  selected,
  onSelect,
}: {
  position: BannerPosition;
  uid: string;
  /** All the user's banners; only the ones for `position` are offered. */
  banners: WithId<BannerDoc>[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const label = LABELS[position];
  const offered = banners.filter((b) => b.position === position);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onSelect(await addBanner(uid, file, position, file.name.replace(/\.[^.]+$/, "")));
    } catch (err) {
      // addBanner's own messages are written for the user; Firebase's aren't.
      setError(err instanceof Error && !("code" in err) ? err.message : "Couldn't save the banner. Check your connection and try again.");
    }
    setUploading(false);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-medium">{label}</p>
        <Link href="/banners" className="text-[12px] text-muted transition hover:text-text">
          Design one
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={label}>
        <button type="button" role="radio" aria-checked={selected === null} onClick={() => onSelect(null)} className={cn(chip(selected === null), "flex h-12 shrink-0 items-center gap-1.5")}>
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
            onClick={() => onSelect(banner.id)}
            className={cn(
              "grid h-12 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border bg-black transition",
              selected === banner.id ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line hover:border-line-strong",
            )}
          >
            <BannerImage banner={banner} className="max-h-full object-contain" />
          </button>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3.5 text-[12.5px] text-muted transition hover:border-accent/60 hover:text-text disabled:opacity-60"
        >
          <ImagePlus className="size-3.5" />
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
      </div>
      {error && <p className="mt-1 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
