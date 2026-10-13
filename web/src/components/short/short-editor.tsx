"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import { useState, type FormEvent } from "react";
import { Download, ExternalLink, ListPlus, ListX, ShieldCheck, Trash2 } from "lucide-react";
import { PRIVACY_STATUSES, formatDuration, type PrivacyStatus, type ShortDoc, type YoutubeCheckState } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { DESCRIPTION_MAX, TAG_CHARS_MAX, TITLE_MAX, canEdit, canQueue, checkYouTubeStatus, downloadShorts, saveShortMetadata, tagChars, unqueueShort, youtubeShortUrl } from "@/lib/shorts";
import { useStorageUrl } from "@/lib/videos";
import { friendlyCallableError } from "@/lib/youtube";
import { formatInZone, toDate } from "@/lib/time";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, inputClasses } from "@/components/ui/field";
import { ShortStatusBadge } from "./short-card";
import { TagInput } from "./tag-input";
import { cn } from "@/lib/cn";

const PRIVACY_LABELS: Record<PrivacyStatus, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };

const CHECK_TITLES: Record<YoutubeCheckState, string> = {
  live: "Live on YouTube",
  processing: "YouTube is still processing it",
  blocked: "Blocked on YouTube",
  rejected: "Rejected by YouTube",
  removed: "Not on YouTube any more",
};

/**
 * Preview a Short and edit what YouTube will show for it: title, description,
 * keywords and visibility. `onQueue` submits it to the upload queue.
 */
export function ShortEditorDialog({
  short,
  timezone,
  onClose,
  onQueue,
  onDelete,
}: {
  short: WithId<ShortDoc>;
  timezone: string;
  onClose: () => void;
  /** True once queued. On failure the caller shows why and this resolves false. */
  onQueue: (shortId: string) => Promise<boolean>;
  /** Asks to delete this Short and its files. Not offered while it is uploading to YouTube. */
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(short.title);
  const [description, setDescription] = useState(short.description);
  const [tags, setTags] = useState(short.tags);
  const [privacy, setPrivacy] = useState(short.privacy);
  const [busy, setBusy] = useState<"save" | "queue" | "unqueue" | "check" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const videoUrl = useStorageUrl(short.fileDeletedAt ? null : short.storagePath);
  const posterUrl = useStorageUrl(short.thumbnailPath);
  const editable = canEdit(short);
  const publishAt = toDate(short.publishAt);
  const inQueue = short.status === "scheduled" || short.status === "quota_exceeded";

  const tagLength = tagChars(tags);
  const valid = title.trim().length > 0 && title.length <= TITLE_MAX && description.length <= DESCRIPTION_MAX && tagLength <= TAG_CHARS_MAX;
  const dirty = title !== short.title || description !== short.description || privacy !== short.privacy || tags.join("\n") !== short.tags.join("\n");

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    try {
      await saveShortMetadata(short.id, { title, description, tags, privacy });
      return true;
    } catch {
      setError("Couldn't save your changes. Check your connection and try again.");
      return false;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || !dirty) return;
    setBusy("save");
    setError(null);
    setSaved(await save());
    setBusy(null);
  }

  async function saveAndQueue() {
    setBusy("queue");
    setError(null);
    if ((await save()) && (await onQueue(short.id))) return onClose();
    setBusy(null);
  }

  // The answer is saved on the Short, so it arrives through the live `short` prop.
  const check = short.youtubeCheck;
  async function runCheck() {
    setBusy("check");
    setError(null);
    try {
      await checkYouTubeStatus(short.id);
    } catch (err) {
      setError(friendlyCallableError(err));
    }
    setBusy(null);
  }

  async function removeFromQueue() {
    setBusy("unqueue");
    setError(null);
    try {
      await unqueueShort(short.id);
    } catch (err) {
      setError(friendlyCallableError(err));
    }
    setBusy(null);
  }

  return (
    <Dialog title="Short details" onClose={onClose} busy={busy !== null} width="max-w-4xl">
      <form onSubmit={onSubmit} className="mt-4 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          {/* Sized from the window height so the whole dialog fits without scrolling. */}
          <div className="mx-auto aspect-[9/16] h-[min(460px,calc(100dvh-15rem))] overflow-hidden rounded-xl border border-line bg-black">
            {short.fileDeletedAt ? (
              // The file was removed from Storage once it reached YouTube; only the thumbnail is kept.
              <div className="relative size-full">
                {posterUrl && <img src={posterUrl} alt="" className="size-full object-cover opacity-50" />}
                <p className="absolute inset-0 grid place-items-center p-4 text-center text-[12.5px] leading-relaxed text-text">It&apos;s on YouTube now, so the file was removed from storage to save space.</p>
              </div>
            ) : videoUrl ? (
              <video src={videoUrl} poster={posterUrl ?? undefined} controls playsInline preload="metadata" className="size-full object-contain" />
            ) : (
              <div className="grid size-full place-items-center text-[12px] text-faint">Loading preview…</div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-[12.5px] text-muted">
            <span className="flex min-w-0 items-center gap-2">
              <ShortStatusBadge status={short.status} />
              <span className="truncate">
                {publishAt && short.status !== "published"
                  ? `Goes out ${formatInZone(publishAt, timezone)}`
                  : `Part ${short.segmentIndex + 1} · ${formatDuration(short.durationSec)}`}
              </span>
            </span>
            {!short.fileDeletedAt && (
              <button type="button" onClick={() => void downloadShorts([short])} className={buttonClasses("ghost", "sm", "shrink-0 px-2")} aria-label="Download this Short">
                <Download className="size-3.5" />
                Download
              </button>
            )}
          </div>
          {short.youtubeVideoId && (
            <a href={youtubeShortUrl(short.youtubeVideoId)} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm", "mt-3 w-full")}>
              <ExternalLink className="size-3.5" />
              View on YouTube
            </a>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {short.errorMessage && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{short.errorMessage}</p>}
          {!editable && (
            <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-muted">
              {short.status === "published" ? "This Short is on YouTube. Edit it in YouTube Studio from here on." : "This Short is uploading to YouTube right now."}
            </p>
          )}
          {short.youtubeVideoId && (
            <div className={cn("rounded-lg border px-3 py-2.5 text-[13px]", !check ? "border-line bg-surface" : check.state === "live" ? "border-success/25 bg-success/[0.07]" : check.state === "processing" ? "border-warning/25 bg-warning/10" : "border-danger/25 bg-danger/10")}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{check ? CHECK_TITLES[check.state] : "Is it visible on YouTube?"}</p>
                <Button type="button" variant="secondary" size="sm" icon={<ShieldCheck className="size-3.5" />} loading={busy === "check"} disabled={busy !== null} onClick={runCheck}>
                  {check ? "Check again" : "Check now"}
                </Button>
              </div>
              <p className="mt-1 leading-relaxed text-muted">{check ? check.detail : "Asks YouTube whether this Short is live, blocked by a copyright claim, or rejected."}</p>
            </div>
          )}

          <Field label="Title" counter={`${title.length} / ${TITLE_MAX}`} error={title.length > TITLE_MAX || !title.trim()}>
            <input
              value={title}
              disabled={!editable}
              maxLength={TITLE_MAX}
              onChange={(e) => (setTitle(e.target.value), setSaved(false))}
              className={cn(inputClasses, "h-11")}
            />
          </Field>

          <Field label="Description" counter={`${description.length} / ${DESCRIPTION_MAX}`} error={description.length > DESCRIPTION_MAX}>
            <textarea
              value={description}
              disabled={!editable}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => (setDescription(e.target.value), setSaved(false))}
              className={cn(inputClasses, "resize-none py-2.5 leading-relaxed")}
            />
          </Field>

          {/* Not a <label>: clicking a chip's remove button must not refocus the input. */}
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">Keywords</span>
              <span className={cn("text-[11.5px] tabular-nums", tagLength > TAG_CHARS_MAX ? "text-danger" : "text-faint")}>
                {tagLength} / {TAG_CHARS_MAX}
              </span>
            </div>
            <TagInput tags={tags} disabled={!editable} onChange={(next) => (setTags(next), setSaved(false))} />
          </div>

          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

          <div>
            <p className="mb-1.5 text-[13px] font-medium">Visibility</p>
            <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1" role="radiogroup" aria-label="Visibility">
              {PRIVACY_STATUSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={privacy === p}
                  disabled={!editable}
                  onClick={() => (setPrivacy(p), setSaved(false))}
                  className={cn(
                    "h-8 rounded-lg px-4 text-[13px] font-medium transition disabled:opacity-60",
                    privacy === p ? "bg-accent-soft text-text shadow-[inset_0_0_0_1px_rgb(139_108_255/0.45)]" : "text-muted hover:text-text",
                  )}
                >
                  {PRIVACY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            {short.status !== "uploading" && (
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-3.5" />} disabled={busy !== null} onClick={onDelete} className="mr-auto hover:text-danger">
                Delete
              </Button>
            )}
            {saved && !dirty && <span className="text-[13px] text-success">Saved</span>}
            {inQueue && (
              <Button type="button" variant="secondary" icon={<ListX className="size-4" />} loading={busy === "unqueue"} disabled={busy !== null} onClick={removeFromQueue}>
                Remove from queue
              </Button>
            )}
            {editable && (
              <Button type="submit" variant={canQueue(short) ? "secondary" : "primary"} loading={busy === "save"} disabled={!valid || !dirty || busy !== null}>
                Save
              </Button>
            )}
            {canQueue(short) && (
              <Button type="button" icon={<ListPlus className="size-4" />} loading={busy === "queue"} disabled={!valid || busy !== null} onClick={saveAndQueue}>
                Submit to queue
              </Button>
            )}
          </div>
        </div>
      </form>
    </Dialog>
  );
}
