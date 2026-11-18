"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Copy, CopyCheck, Eraser, Send } from "lucide-react";
import { cn } from "@/lib/cn";

const small = "flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted transition hover:bg-white/[0.06] hover:text-text disabled:opacity-40";

/**
 * Quick keyword tools: copy them, paste a list in, clear them, or put these
 * keywords on every ready Short of the channel. Clearing asks whether it is for
 * this Short or for all of them.
 */
export function KeywordActions({
  tags,
  readyCount,
  disabled,
  onClearHere,
  onPaste,
  onToAll,
}: {
  tags: string[];
  /** How many of the channel's Shorts are ready (not queued or out yet). */
  readyCount: number;
  disabled?: boolean;
  onClearHere: () => void;
  onPaste: (tags: string[]) => void;
  /** Saves `tags` on every ready Short; resolves true once done. */
  onToAll: (tags: string[]) => Promise<boolean>;
}) {
  const [ask, setAsk] = useState<"clear" | "all" | null>(null);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // A click anywhere else closes the question.
  useEffect(() => {
    if (!ask) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && !working && setAsk(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [ask, working]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(timer);
  }, [note]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tags.join(", "));
      setNote("Copied");
    } catch {
      setNote("Couldn't copy");
    }
  }

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      const list = text.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
      if (list.length === 0) return setNote("Nothing to paste");
      onPaste(list);
      setNote(`Added ${list.length}`);
    } catch {
      setNote("Paste into the box with Ctrl+V");
    }
  }

  async function toAll(next: string[]) {
    setWorking(true);
    const ok = await onToAll(next);
    setWorking(false);
    setAsk(null);
    if (ok) setNote(next.length ? `Set on ${readyCount} Shorts` : `Cleared on ${readyCount} Shorts`);
  }

  return (
    <div ref={box} className="relative flex items-center gap-0.5">
      {note && <span className="mr-1 text-[11.5px] text-success">{note}</span>}
      <button type="button" className={small} disabled={disabled || tags.length === 0} onClick={() => void copy()} title="Copy these keywords">
        {note === "Copied" ? <CopyCheck className="size-3.5" /> : <Copy className="size-3.5" />}
        Copy
      </button>
      <button type="button" className={small} disabled={disabled} onClick={() => void paste()} title="Paste a comma-separated list">
        <ClipboardPaste className="size-3.5" />
        Paste
      </button>
      <button type="button" className={cn(small, ask === "clear" && "bg-white/[0.08] text-text")} disabled={disabled || (tags.length === 0 && readyCount === 0)} onClick={() => setAsk(ask === "clear" ? null : "clear")}>
        <Eraser className="size-3.5" />
        Clear
      </button>
      <button type="button" className={cn(small, "text-accent hover:text-accent", ask === "all" && "bg-accent-soft")} disabled={disabled || readyCount === 0 || tags.length === 0} onClick={() => setAsk(ask === "all" ? null : "all")} title="Put these keywords on every ready Short">
        <Send className="size-3.5" />
        All ready
      </button>

      {ask && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-line-strong bg-surface-2 p-3 shadow-2xl shadow-black/60">
          {ask === "clear" ? (
            <>
              <p className="text-[13px] font-medium">Remove the keywords from…</p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={working}
                  onClick={() => {
                    onClearHere();
                    setAsk(null);
                  }}
                  className="rounded-lg border border-line px-3 py-2 text-left text-[13px] transition hover:border-line-strong"
                >
                  <span className="font-medium">Only this Short</span>
                  <span className="block text-[11.5px] text-muted">Press Save to keep it.</span>
                </button>
                <button type="button" disabled={working || readyCount === 0} onClick={() => void toAll([])} className="rounded-lg border border-danger/40 px-3 py-2 text-left text-[13px] text-danger transition hover:bg-danger/10 disabled:opacity-50">
                  <span className="font-medium">{working ? "Clearing…" : `All ${readyCount} ready Shorts`}</span>
                  <span className="block text-[11.5px] text-muted">Every Short that isn&apos;t queued or out yet, on this channel. Saved straight away.</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] font-medium">
                Put these {tags.length} keywords on all {readyCount} ready Shorts?
              </p>
              <p className="mt-1 text-[12px] text-muted">Their keywords are replaced by these. Shorts already queued or on YouTube aren&apos;t touched.</p>
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" disabled={working} onClick={() => setAsk(null)} className={small}>
                  Cancel
                </button>
                <button type="button" disabled={working} onClick={() => void toAll(tags)} className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
                  <Send className="size-3.5" />
                  {working ? "Saving…" : `Apply to ${readyCount}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
