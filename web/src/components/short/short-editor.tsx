"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, ListPlus, ListX } from "lucide-react";
import { PRIVACY_STATUSES, type PrivacyStatus, type ShortDoc } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { DESCRIPTION_MAX, TAG_CHARS_MAX, TITLE_MAX, canEdit, canQueue, saveShortMetadata, tagChars, unqueueShort, youtubeShortUrl } from "@/lib/shorts";
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

/**
 * Preview a Short and edit what YouTube will show for it: title, description,
 * keywords and visibility. `onQueue` submits it to the upload queue.
 */
export function ShortEditorDialog({
  short,
  timezone,
  onClose,
  onQueue,
}: {
  short: WithId<ShortDoc>;
  timezone: string;
  onClose: () => void;
  /** True once queued. On failure the caller shows why and this resolves false. */
  onQueue: (shortId: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(short.title);
  const [description, setDescription] = useState(short.description);
  const [tags, setTags] = useState(short.tags);
  const [privacy, setPrivacy] = useState(short.privacy);
  const [busy, setBusy] = useState<"save" | "queue" | "unqueue" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const videoUrl = useStorageUrl(short.storagePath);
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
    <Dialog title="Short details" onClose={onClose} busy={busy !== null} className="max-w-3xl">
      <form onSubmit={onSubmit} className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr]">
        <div>
          <div className="mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl border border-line bg-black">
            {videoUrl ? (
              <video src={videoUrl} poster={posterUrl ?? undefined} controls playsInline preload="metadata" className="size-full object-contain" />
            ) : (
              <div className="grid size-full place-items-center text-[12px] text-faint">Loading preview…</div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <ShortStatusBadge status={short.status} />
            {publishAt && short.status !== "published" && <span>Goes out {formatInZone(publishAt, timezone)}</span>}
          </div>
          {short.youtubeVideoId && (
            <a href={youtubeShortUrl(short.youtubeVideoId)} target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm", "mt-3 w-full")}>
              <ExternalLink className="size-3.5" />
              View on YouTube
            </a>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {short.errorMessage && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{short.errorMessage}</p>}
          {!editable && (
            <p className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-muted">
              {short.status === "published" ? "This Short is on YouTube. Edit it in YouTube Studio from here on." : "This Short is uploading to YouTube right now."}
            </p>
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
              rows={5}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => (setDescription(e.target.value), setSaved(false))}
              className={cn(inputClasses, "resize-y py-2.5 leading-relaxed")}
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
            <p className="mt-1.5 text-[12px] text-muted">Sent to YouTube as tags. Press Enter or a comma after each one.</p>
          </div>

          <Field label="Visibility" className="max-w-48">
            <select value={privacy} disabled={!editable} onChange={(e) => (setPrivacy(e.target.value as PrivacyStatus), setSaved(false))} className={cn(inputClasses, "h-11")}>
              {PRIVACY_STATUSES.map((p) => (
                <option key={p} value={p}>
                  {PRIVACY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>

          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            {saved && !dirty && <span className="mr-auto text-[13px] text-success">Saved</span>}
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy !== null}>
              Close
            </Button>
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
