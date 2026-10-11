"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Modal shell. Escape and the backdrop close it unless `busy`. */
export function Dialog({
  title,
  children,
  onClose,
  busy,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  /** Overrides the default `max-w-md` width. */
  className?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 animate-enter bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className={cn("relative w-full max-w-md animate-enter rounded-2xl border border-line-strong bg-surface-2 p-6 shadow-2xl shadow-black/60", className)}>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}
