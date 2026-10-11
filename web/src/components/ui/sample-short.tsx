"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/cn";

/** 9:16 preview loops in /public/samples (see CREDITS.txt there). */
export type SampleClip = "butterfly" | "dragon" | "squirrel" | "foxes" | "standing" | "vine";

export const SAMPLE_CREDIT = "Sample clips: Big Buck Bunny & Sintel © Blender Foundation · CC BY 3.0";

/**
 * Muted, looping sample Short. Nothing downloads until the frame is actually on
 * screen (so the desktop-only showcases cost nothing on mobile), it pauses when
 * scrolled away, and reduced-motion users just get the poster frame.
 * Pass `progressRef` to have a bar's width track playback.
 */
export function SampleShort({
  clip,
  progressRef,
  className,
}: {
  clip: SampleClip;
  progressRef?: RefObject<HTMLElement | null>;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.muted = true;

    let frame = 0;
    const tick = () => {
      const bar = progressRef?.current;
      if (bar && video.duration) bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      frame = requestAnimationFrame(tick);
    };
    const startBar = () => {
      cancelAnimationFrame(frame);
      if (progressRef) frame = requestAnimationFrame(tick);
    };
    const stopBar = () => cancelAnimationFrame(frame);
    video.addEventListener("playing", startBar);
    video.addEventListener("pause", stopBar);

    const observer = new IntersectionObserver(([entry]) => {
      // Autoplay can still be refused (e.g. iOS Low Power Mode) — the poster stays up.
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => {
      observer.disconnect();
      stopBar();
      video.removeEventListener("playing", startBar);
      video.removeEventListener("pause", stopBar);
    };
  }, [progressRef]);

  return (
    <video
      ref={videoRef}
      src={`/samples/${clip}.mp4`}
      poster={`/samples/${clip}.jpg`}
      preload="none"
      muted
      loop
      playsInline
      disablePictureInPicture
      aria-hidden
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}
