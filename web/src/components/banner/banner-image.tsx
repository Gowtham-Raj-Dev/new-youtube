"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import type { BannerDoc } from "@shortflow/shared";
import { useStorageUrl } from "@/lib/videos";
import { cn } from "@/lib/cn";

/** A banner at full width and its natural height; a grey strip while it loads. */
export function BannerImage({ banner, className }: { banner: Pick<BannerDoc, "storagePath" | "width" | "height" | "name">; className?: string }) {
  const url = useStorageUrl(banner.storagePath);
  if (!url) return <div className={cn("w-full bg-white/[0.06]", className)} style={{ aspectRatio: `${banner.width} / ${banner.height}` }} />;
  return <img src={url} alt={banner.name} className={cn("block w-full", className)} />;
}
