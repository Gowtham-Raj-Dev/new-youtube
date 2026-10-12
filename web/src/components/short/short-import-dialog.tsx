"use client";

import { useCallback, useState, type FormEvent } from "react";
import { FolderUp } from "lucide-react";
import { BANNER_POSITIONS, type BannerDoc, type BannerPosition, type CropMode } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import type { ReactionChoice } from "@/lib/shorts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BannerPicker, PreviewBanner, chip } from "@/components/banner/banner-picker";
import { ReactionPicker, ReactionStrip, bannersPercentOf, useReactionSetup } from "@/components/short/reaction-picker";
import { HelperNotice } from "@/components/video/helper-notice";
import { cn } from "@/lib/cn";

// A ready-made Short is already vertical, so between banners it is the top and bottom that no longer fit.
const FRAMINGS: Array<{ mode: CropMode; label: string; hint: string }> = [
  { mode: "center", label: "Fill", hint: "Fills the space it is given; the top and bottom of your video are cropped." },
  { mode: "blur", label: "Blur", hint: "Whole video, smaller, on a blurred background." },
  { mode: "fit", label: "Bars", hint: "Whole video, smaller, on black." },
];

/** What to put on Shorts added from files. No banners and no reaction video means they go up exactly as they are. */
export interface ShortImportLook {
  banners: Partial<Record<BannerPosition, WithId<BannerDoc>>>;
  cropMode: CropMode;
  reaction: ReactionChoice | null;
}

/** Asked after the user picks MP4 files: which banners and reaction video to put on them, with a preview on the first file. */
export function ShortImportDialog({
  files,
  uid,
  banners,
  defaultCropMode,
  onCancel,
  onStart,
}: {
  files: File[];
  uid: string;
  banners: WithId<BannerDoc>[];
  defaultCropMode: CropMode;
  onCancel: () => void;
  onStart: (look: ShortImportLook) => void;
}) {
  const [picked, setPicked] = useState<Record<BannerPosition, string | null>>({ top: null, bottom: null });
  const [cropMode, setCropMode] = useState<CropMode>(defaultCropMode === "smart" ? "center" : defaultCropMode);
  const chosen = Object.fromEntries(BANNER_POSITIONS.map((position) => [position, banners.find((b) => b.id === picked[position])])) as ShortImportLook["banners"];
  const withBanners = Boolean(chosen.top || chosen.bottom);

  const reaction = useReactionSetup(bannersPercentOf(chosen));
  const reactionFile = reaction.file;
  const changed = withBanners || Boolean(reactionFile);

  // Plays the first file straight from disk; the URL lives as long as the <video> it is attached to.
  const attachPreview = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) return;
      const url = URL.createObjectURL(files[0]);
      video.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [files],
  );

  function start(e: FormEvent) {
    e.preventDefault();
    if (reaction.noRoom || reaction.unreadable) return;
    reaction.remember();
    onStart({ banners: chosen, cropMode, reaction: reaction.choice });
  }

  const count = files.length === 1 ? "1 Short" : `${files.length} Shorts`;
  const each = files.length === 1 ? "it" : "each one";
  const added = [withBanners && "banners", reactionFile && "reaction video"].filter(Boolean).join(" and ");

  return (
    <Dialog title={`Add ${count} from your files`} onClose={onCancel} width="max-w-5xl">
      <form onSubmit={start} className="mt-4 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <div className="relative mx-auto flex aspect-[9/16] h-[min(600px,calc(100dvh-12rem))] flex-col overflow-hidden rounded-xl border border-line bg-black">
            <PreviewBanner banner={chosen.top} />
            <ReactionStrip setup={reaction} position="top" />
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {changed && cropMode === "blur" && <video ref={attachPreview} muted playsInline preload="auto" className="absolute inset-0 size-full scale-150 object-cover blur-xl" />}
              <video ref={attachPreview} muted loop autoPlay playsInline className={cn("absolute inset-0 size-full", changed && cropMode !== "center" ? "object-contain" : "object-cover")} />
            </div>
            <ReactionStrip setup={reaction} position="bottom" />
            <PreviewBanner banner={chosen.bottom} />
          </div>
          <p className="mt-2.5 mx-auto max-w-[225px] truncate text-center text-[12px] text-faint" title={files[0].name}>
            Preview · {files[0].name}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {BANNER_POSITIONS.map((position) => (
            <BannerPicker key={position} position={position} uid={uid} banners={banners} selected={picked[position]} onSelect={(id) => setPicked((current) => ({ ...current, [position]: id }))} />
          ))}

          <ReactionPicker setup={reaction} where={files.length === 1 ? "the Short" : "every Short"} />

          {changed && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium">Framing of the Short</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <div className="flex gap-1.5" role="radiogroup" aria-label="Framing of the Short">
                  {FRAMINGS.map((framing) => (
                    <button key={framing.mode} type="button" role="radio" aria-checked={cropMode === framing.mode} onClick={() => setCropMode(framing.mode)} className={chip(cropMode === framing.mode)}>
                      {framing.label}
                    </button>
                  ))}
                </div>
                <span className="text-[12.5px] text-muted">{FRAMINGS.find((f) => f.mode === cropMode)?.hint}</span>
              </div>
            </div>
          )}

          {changed && <HelperNotice />}

          <p className="text-[13px] leading-relaxed text-muted">
            {changed
              ? `The ${added} ${withBanners || !reactionFile ? "are" : "is"} put on ${each} on this device before it is saved — by the PC helper if it is running, otherwise in this browser. Keep this tab open until it finishes.${reactionFile ? " The Short keeps its own sound; the reaction video is silent." : ""}`
              : `With nothing chosen, ${files.length === 1 ? "your file is" : "your files are"} added exactly as ${files.length === 1 ? "it is" : "they are"}. Pick a banner or a reaction video above to put it on ${files.length === 1 ? "this Short" : "every one"}.`}
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" icon={<FolderUp className="size-4" />} disabled={reaction.noRoom || reaction.unreadable}>
              Add {count}
              {added ? ` with ${added}` : ""}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
