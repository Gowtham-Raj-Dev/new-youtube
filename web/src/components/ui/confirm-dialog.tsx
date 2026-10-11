"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { useScrollLock } from "./dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = "danger",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);
  useScrollLock(open);

  if (!open) return null;

  // On <body>, so it is centred on the screen rather than in the content column.
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal aria-labelledby="confirm-title">
      <div className="absolute inset-0 animate-enter bg-black/70 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <div className="relative w-full max-w-sm animate-enter rounded-2xl border border-line-strong bg-surface-2 p-6 shadow-2xl shadow-black/60">
        <h2 id="confirm-title" className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-2 text-[13.5px] leading-relaxed text-muted">{description}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
