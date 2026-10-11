"use client";

import { useState, type FormEvent } from "react";
import type { VideoDoc } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { deleteVideo, renameVideo, type DeleteMode } from "@/lib/videos";
import { friendlyCallableError } from "@/lib/youtube";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

const DELETE_OPTIONS: Array<{ mode: DeleteMode; title: string; body: string }> = [
  { mode: "everything", title: "Delete everything", body: "The original video, its thumbnail and every Short made from it." },
  { mode: "source", title: "Delete source only", body: "Free up storage but keep the generated Shorts and their schedules." },
  { mode: "shorts", title: "Delete Shorts only", body: "Keep the original so you can generate Shorts again later." },
];

export function DeleteVideoDialog({ video, onClose }: { video: WithId<VideoDoc>; onClose: () => void }) {
  const hasShorts = video.shortsCount > 0;
  const [mode, setMode] = useState<DeleteMode>("everything");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteVideo(video.id, mode);
      onClose();
    } catch (err) {
      setError(friendlyCallableError(err));
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Delete “${video.title}”?`} onClose={onClose} busy={busy}>
      {hasShorts ? (
        <div className="mt-4 space-y-2" role="radiogroup">
          {DELETE_OPTIONS.map((o) => (
            <label
              key={o.mode}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-3.5 transition",
                mode === o.mode ? "border-danger/50 bg-danger/[0.06]" : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" name="delete-mode" className="mt-1 accent-[var(--danger)]" checked={mode === o.mode} onChange={() => setMode(o.mode)} />
              <span>
                <span className="block text-[13.5px] font-medium">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">The original video and its thumbnail will be permanently deleted from storage. This can&apos;t be undone.</p>
      )}
      {error && <p className="mt-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} loading={busy}>
          {DELETE_OPTIONS.find((o) => o.mode === mode)!.title}
        </Button>
      </div>
    </Dialog>
  );
}

export function RenameVideoDialog({ video, onClose }: { video: WithId<VideoDoc>; onClose: () => void }) {
  const [title, setTitle] = useState(video.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = title.trim();

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!trimmed) return;
    setBusy(true);
    try {
      await renameVideo(video.id, trimmed);
      onClose();
    } catch {
      setError("Couldn't rename the video. Please try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Rename video" onClose={onClose} busy={busy}>
      <form onSubmit={save}>
        <p className="mt-1 text-[13px] text-muted">Shorts default to this title plus a part number, e.g. “{trimmed || "My video"} — Part 01”.</p>
        <input
          autoFocus
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)]"
        />
        {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!trimmed || trimmed === video.title}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
