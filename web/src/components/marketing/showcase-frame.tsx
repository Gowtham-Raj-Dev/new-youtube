"use client";

import { useRef } from "react";
import { SampleShort } from "@/components/ui/sample-short";
import type { Frame } from "./frames";
import { cn } from "@/lib/cn";

/** A floating, playing sample Short with a progress bar and title, as on a phone. */
export function ShowcaseFrame({ frame, index, className }: { frame: Frame; index: number; className?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  return (
    <div
      style={{ ["--tilt" as string]: frame.tilt, animationDelay: frame.delay }}
      className={cn(
        "relative aspect-[9/16] w-[150px] animate-float overflow-hidden rounded-2xl border border-white/10 bg-surface-2 shadow-2xl shadow-black/60 xl:w-[170px]",
        index === 1 && "mt-16",
        className,
      )}
    >
      <SampleShort clip={frame.clip} progressRef={bar} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <span className="absolute right-2 top-2 rounded-md bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">{frame.time}</span>
      <div className="absolute inset-x-3 bottom-3">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/20">
          <div ref={bar} className="h-full rounded-full bg-accent" style={{ width: `${40 + index * 22}%` }} />
        </div>
        <p className="text-[11px] font-medium leading-tight text-white drop-shadow">{frame.title}</p>
      </div>
    </div>
  );
}
