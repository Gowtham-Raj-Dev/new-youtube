"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

const GAP = 6;
const EDGE = 8;

/**
 * Small "⋯" action menu. Rendered in a portal with fixed positioning so it is never
 * clipped by an `overflow-hidden` / transformed parent (e.g. cards). Flips above the
 * trigger when there is no room below. Closes on outside click, Escape, scroll and resize.
 */
export function Menu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = (refocus = false) => {
    setOpen(false);
    setPos(null);
    if (refocus) trigger.current?.focus();
  };

  // Measure after the panel mounts so we know its real size, then place it.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const t = trigger.current.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = panel.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const up = t.bottom + GAP + h > vh - EDGE && t.top - GAP - h >= EDGE;
    const top = up ? t.top - GAP - h : Math.min(t.bottom + GAP, vh - EDGE - h);
    const left = Math.min(Math.max(EDGE, t.right - w), vw - EDGE - w);
    setPos({ top, left, up });
    panel.current.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDismiss = () => close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [open]);

  const onPanelKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/[0.06] hover:text-text",
          open && "bg-white/[0.08] text-text",
        )}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            aria-label={label}
            onKeyDown={onPanelKey}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" }}
            className={cn(
              "fixed z-[60] min-w-44 animate-enter overflow-hidden rounded-xl border border-line-strong bg-surface-2/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl",
              pos?.up ? "origin-bottom-right" : "origin-top-right",
            )}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close();
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] outline-none transition",
                  item.danger ? "text-danger hover:bg-danger/10 focus-visible:bg-danger/10" : "text-text hover:bg-white/[0.06] focus-visible:bg-white/[0.06]",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
