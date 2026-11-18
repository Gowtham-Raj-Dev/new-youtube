"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { drawTextBoxes, type TextBox, type TextVars } from "@/lib/text-boxes";
import { loadTextFonts } from "@/lib/text-fonts";
import { cn } from "@/lib/cn";

type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];
const MIN_W = 0.08;
const MIN_H = 0.03;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** Within this share of the frame, a box's middle snaps onto the frame's middle. */
const SNAP = 0.012;

/**
 * The text boxes over the preview, drawn exactly as they will be on the Shorts,
 * with a handle for each: drag a box to move it, drag a corner to resize it.
 * The text wraps and shrinks to fit as the box changes.
 */
export function TextLayer({
  frame,
  boxes,
  vars,
  selected,
  onSelect,
  onChange,
}: {
  frame: RefObject<HTMLDivElement | null>;
  boxes: TextBox[];
  vars: TextVars;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, change: Partial<TextBox>) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontsLoaded, setFontsLoaded] = useState(0);
  const [guides, setGuides] = useState<{ x: boolean; y: boolean } | null>(null);
  const grab = useRef<{ id: string; corner: Corner | null; px: number; py: number; box: TextBox } | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [frame]);

  const fontKey = [...new Set(boxes.map((b) => b.font))].sort().join(",");
  useEffect(() => {
    let live = true;
    void loadTextFonts(fontKey.split(",")).then(() => live && setFontsLoaded((n) => n + 1));
    return () => {
      live = false;
    };
  }, [fontKey]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !size.width) return;
    const ratio = window.devicePixelRatio || 1;
    el.width = Math.round(size.width * ratio);
    el.height = Math.round(size.height * ratio);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, el.width, el.height);
    drawTextBoxes(ctx, boxes, vars, el.width, el.height);
  }, [boxes, vars, size, fontsLoaded]);

  function start(e: ReactPointerEvent, box: TextBox, corner: Corner | null) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(box.id);
    grab.current = { id: box.id, corner, px: e.clientX, py: e.clientY, box };
  }

  function move(e: ReactPointerEvent) {
    const g = grab.current;
    const rect = frame.current?.getBoundingClientRect();
    if (!g || !rect) return;
    const dx = (e.clientX - g.px) / rect.width;
    const dy = (e.clientY - g.py) / rect.height;
    const b = g.box;
    if (!g.corner) {
      let x = clamp(b.x + dx, 0, 1 - b.w);
      let y = clamp(b.y + dy, 0, 1 - b.h);
      const snapX = Math.abs(x + b.w / 2 - 0.5) < SNAP;
      const snapY = Math.abs(y + b.h / 2 - 0.5) < SNAP;
      if (snapX) x = 0.5 - b.w / 2;
      if (snapY) y = 0.5 - b.h / 2;
      setGuides({ x: snapX, y: snapY });
      onChange(g.id, { x, y });
      return;
    }
    // The opposite corner stays put.
    const left = g.corner.endsWith("w");
    const top = g.corner.startsWith("n");
    const x1 = b.x;
    const x2 = b.x + b.w;
    const y1 = b.y;
    const y2 = b.y + b.h;
    const nx1 = left ? clamp(x1 + dx, 0, x2 - MIN_W) : x1;
    const nx2 = left ? x2 : clamp(x2 + dx, x1 + MIN_W, 1);
    const ny1 = top ? clamp(y1 + dy, 0, y2 - MIN_H) : y1;
    const ny2 = top ? y2 : clamp(y2 + dy, y1 + MIN_H, 1);
    onChange(g.id, { x: nx1, y: ny1, w: nx2 - nx1, h: ny2 - ny1 });
  }

  function end() {
    grab.current = null;
    setGuides(null);
  }

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 size-full" />
      {guides && (
        <>
          <span className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2", guides.x ? "bg-accent" : "bg-white/30")} />
          <span className={cn("pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2", guides.y ? "bg-accent" : "bg-white/30")} />
        </>
      )}
      {boxes.map((box) => {
        const on = box.id === selected;
        return (
          <div
            key={box.id}
            role="button"
            tabIndex={0}
            aria-label={`Text box: ${box.text || "empty"} — drag to move, drag a corner to resize`}
            onPointerDown={(e) => start(e, box, null)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 0.02 : 0.004;
              const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              const by = moves[e.key];
              if (!by) return;
              e.preventDefault();
              onSelect(box.id);
              onChange(box.id, { x: clamp(box.x + by[0], 0, 1 - box.w), y: clamp(box.y + by[1], 0, 1 - box.h) });
            }}
            className={cn(
              "absolute touch-none select-none outline-none",
              on ? "cursor-move ring-1 ring-accent" : "cursor-pointer hover:ring-1 hover:ring-white/50 focus-visible:ring-1 focus-visible:ring-white/70",
            )}
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          >
            {on &&
              CORNERS.map((corner) => (
                <span
                  key={corner}
                  onPointerDown={(e) => start(e, box, corner)}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  className={cn(
                    "absolute size-3 rounded-[3px] border-2 border-accent bg-white shadow",
                    corner === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                    corner === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize",
                    corner === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                    corner === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                  )}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}
