"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, Scissors } from "lucide-react";
import { TRIM_MIN_SECONDS, type ShortDoc } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { fullLength, trimErrorMessage, trimShort, trimSourcePath, type TrimStage } from "@/lib/trim";
import { useStorageUrl } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STAGES: Record<TrimStage, string> = { keeping: "Keeping the untrimmed Short…", cutting: "Cutting…", saving: "Saving…" };

/** `12.3s` / `1:05.4`. */
function clock(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(1);
  return m > 0 ? `${m}:${rest.padStart(4, "0")}` : `${rest}s`;
}

/**
 * Moves a Short's start and end: drag the two handles on the timeline (the
 * picture follows), play the part kept, then save. Works on the untrimmed
 * Short, so the trim can be widened again or reset to the whole Short.
 */
export function TrimEditor({ short, onDone }: { short: WithId<ShortDoc>; onDone: (saved: boolean) => void }) {
  const full = fullLength(short);
  const [start, setStart] = useState(short.trim?.startSec ?? 0);
  const [end, setEnd] = useState(short.trim?.endSec ?? full);
  const [at, setAt] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState<{ stage: TrimStage; share?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | "head" | null>(null);

  // Played from the untrimmed Short; the version in the address makes the browser fetch it fresh after a save.
  const base = useStorageUrl(trimSourcePath(short));
  const source = base && `${base}${base.includes("?") ? "&" : "?"}v=${short.trim ? `${short.trim.startSec}-${short.trim.endSec}` : "whole"}`;

  const length = end - start;
  const changed = Math.abs(start - (short.trim?.startSec ?? 0)) > 0.04 || Math.abs(end - (short.trim?.endSec ?? full)) > 0.04;
  const share = (sec: number) => `${(Math.min(full, Math.max(0, sec)) / full) * 100}%`;

  function seek(sec: number) {
    const el = player.current;
    if (!el) return;
    el.currentTime = Math.min(full, Math.max(0, sec));
    setAt(el.currentTime);
  }

  // Playing stays inside the part kept: at its end it stops and goes back to the start.
  useEffect(() => {
    const el = player.current;
    if (!el || !playing) return;
    let frame = 0;
    const tick = () => {
      setAt(el.currentTime);
      if (el.currentTime >= end - 0.03) {
        el.pause();
        el.currentTime = start;
        setAt(start);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, start, end]);

  function togglePlay() {
    const el = player.current;
    if (!el) return;
    if (!el.paused) return el.pause();
    if (el.currentTime < start || el.currentTime >= end - 0.05) el.currentTime = start;
    void el.play().catch(() => undefined);
  }

  function setStartAt(sec: number) {
    const next = Math.min(Math.max(0, Math.round(sec * 10) / 10), end - TRIM_MIN_SECONDS);
    setStart(next);
    seek(next);
  }
  function setEndAt(sec: number) {
    const next = Math.max(Math.min(full, Math.round(sec * 10) / 10), start + TRIM_MIN_SECONDS);
    setEnd(next);
    seek(next - 0.05);
  }

  function pointerSec(e: ReactPointerEvent) {
    const box = bar.current?.getBoundingClientRect();
    if (!box) return 0;
    return ((e.clientX - box.left) / box.width) * full;
  }

  function onDown(e: ReactPointerEvent) {
    const sec = pointerSec(e);
    player.current?.pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    // The nearest handle is taken if it is close; otherwise the playhead jumps there.
    const box = bar.current?.getBoundingClientRect();
    const px = (s: number) => (box ? (s / full) * box.width : 0);
    const toStart = Math.abs(px(sec) - px(start));
    const toEnd = Math.abs(px(sec) - px(end));
    if (Math.min(toStart, toEnd) < 14) drag.current = toStart <= toEnd ? "start" : "end";
    else {
      drag.current = "head";
      seek(sec);
    }
  }
  function onMove(e: ReactPointerEvent) {
    if (!drag.current) return;
    const sec = pointerSec(e);
    if (drag.current === "start") setStartAt(sec);
    else if (drag.current === "end") setEndAt(sec);
    else seek(sec);
  }

  async function save(whole = false) {
    setBusy({ stage: "keeping" });
    setError(null);
    player.current?.pause();
    try {
      await trimShort(short, whole ? 0 : start, whole ? full : end, (stage, s) => setBusy({ stage, share: s }));
      onDone(true);
    } catch (err) {
      console.error("Trim failed:", err);
      setError(trimErrorMessage(err));
      setBusy(null);
    }
  }

  const nudge = (which: "start" | "end", by: number) => (which === "start" ? setStartAt(start + by) : setEndAt(end + by));
  const fieldClass = "h-8 w-20 rounded-lg border border-line-strong bg-surface px-2 text-[13px] tabular-nums text-text outline-none focus:border-accent/60";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto aspect-[9/16] h-[min(400px,calc(100dvh-22rem))] overflow-hidden rounded-xl border border-line bg-black">
        {source ? (
          <video ref={player} src={source} playsInline preload="auto" onClick={togglePlay} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={() => seek(start)} className="size-full cursor-pointer object-contain" />
        ) : (
          <div className="grid size-full place-items-center text-[12px] text-faint">Loading…</div>
        )}
        {!playing && source && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        )}
      </div>

      {/* The timeline: the whole Short, the part kept lit, a handle at each end and the playhead. */}
      <div
        ref={bar}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative h-12 cursor-pointer touch-none select-none rounded-lg bg-white/[0.06]"
        role="group"
        aria-label="Trim timeline"
      >
        <div className="absolute inset-y-0 left-0 rounded-l-lg bg-black/50" style={{ width: share(start) }} />
        <div className="absolute inset-y-0 right-0 rounded-r-lg bg-black/50" style={{ left: share(end) }} />
        <div className="absolute inset-y-0 border-y-2 border-accent bg-accent/15" style={{ left: share(start), width: `calc(${share(end)} - ${share(start)})` }} />
        {(["start", "end"] as const).map((which) => (
          <span
            key={which}
            role="slider"
            tabIndex={0}
            aria-label={which === "start" ? "Start" : "End"}
            aria-valuemin={0}
            aria-valuemax={full}
            aria-valuenow={which === "start" ? start : end}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 1 : 0.1;
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
              e.preventDefault();
              nudge(which, e.key === "ArrowLeft" ? -step : step);
            }}
            className="absolute inset-y-0 z-10 flex w-3.5 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-md bg-accent outline-none ring-white focus-visible:ring-2"
            style={{ left: share(which === "start" ? start : end) }}
          >
            <span className="h-4 w-0.5 rounded bg-white/80" />
          </span>
        ))}
        <span className="pointer-events-none absolute -inset-y-1 z-20 w-0.5 -translate-x-1/2 rounded bg-white shadow" style={{ left: share(at) }} />
      </div>
      <div className="flex justify-between text-[11px] tabular-nums text-faint">
        <span>0s</span>
        <span>{clock(full)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {(["start", "end"] as const).map((which) => (
          <div key={which} className="flex items-center gap-1">
            <span className="mr-1 text-[12px] text-muted">{which === "start" ? "Start" : "End"}</span>
            <button type="button" onClick={() => nudge(which, -0.1)} className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:text-text" aria-label={`${which} 0.1s earlier`}>
              <Minus className="size-3.5" />
            </button>
            <input
              type="number"
              step={0.1}
              min={0}
              max={full}
              value={(which === "start" ? start : end).toFixed(1)}
              onChange={(e) => (which === "start" ? setStartAt(e.target.valueAsNumber || 0) : setEndAt(e.target.valueAsNumber || 0))}
              aria-label={`${which} in seconds`}
              className={fieldClass}
            />
            <button type="button" onClick={() => nudge(which, 0.1)} className="grid size-8 place-items-center rounded-lg border border-line text-muted hover:text-text" aria-label={`${which} 0.1s later`}>
              <Plus className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" icon={playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />} onClick={togglePlay}>
          {playing ? "Pause" : "Play kept part"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setStartAt(at)}>
          Start here
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEndAt(at)}>
          End here
        </Button>
        <span className="ml-auto text-[12.5px] text-muted">
          Keeps <span className="font-semibold tabular-nums text-text">{clock(length)}</span> of {clock(full)}
        </span>
      </div>

      {busy && (
        <div>
          <p className="flex justify-between text-[12.5px] text-muted">
            <span>{STAGES[busy.stage]}</span>
            {busy.share !== undefined && <span className="tabular-nums">{Math.round(busy.share * 100)}%</span>}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: busy.stage === "keeping" ? "10%" : busy.stage === "saving" ? "90%" : `${10 + (busy.share ?? 0) * 75}%` }} />
          </div>
        </div>
      )}
      {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => onDone(false)}>
          Cancel
        </Button>
        {short.trim && (
          <Button type="button" variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" />} disabled={busy !== null} onClick={() => void save(true)}>
            Whole Short again
          </Button>
        )}
        <Button type="button" size="sm" className={cn("ml-auto")} icon={<Scissors className="size-3.5" />} loading={busy !== null} disabled={!changed || busy !== null} onClick={() => void save()}>
          Save trim
        </Button>
      </div>
    </div>
  );
}
