"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Stops the page behind a modal from scrolling while it is open. */
export function useScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/**
 * Modal shell. Escape and the backdrop close it unless `busy`. Taller than the screen, it scrolls.
 * Rendered on <body>: inside the page it would be centred in the content column
 * (an animated or blurred ancestor traps `position: fixed`), not on the screen.
 */
export function Dialog({
  title,
  children,
  onClose,
  busy,
  width = "max-w-md",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  /** A Tailwind max-width class. */
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);
  useScrollLock();

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal aria-label={title}>
      <div className="fixed inset-0 animate-enter bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      {/* min-h-full + centring keeps short dialogs in the middle and lets tall ones start at the top. */}
      <div className="pointer-events-none flex min-h-full items-center justify-center p-4">
        <div className={cn("pointer-events-auto relative w-full animate-enter rounded-2xl border border-line-strong bg-surface-2 p-6 shadow-2xl shadow-black/60", width)}>
          <div className="flex items-center justify-between gap-4">
            <h2 className="min-w-0 text-base font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/[0.06] hover:text-text disabled:opacity-40"
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
