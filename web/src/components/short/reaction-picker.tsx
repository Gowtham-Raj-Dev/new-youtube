"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Film, X } from "lucide-react";
import {
  BANNER_POSITIONS,
  MAIN_VIDEO_PERCENT_MIN,
  REACTION_PERCENT_MAX,
  REACTION_PERCENT_MIN,
  REACTION_POSITIONS,
  SHORT_HEIGHT,
  bannerHeight,
  reactionHeight,
  type BannerDoc,
  type BannerPosition,
  type ReactionFit,
  type ReactionPosition,
} from "@shortflow/shared";
import type { ReactionChoice } from "@/lib/shorts";
import { deleteReaction, listReactions, readLastReaction, rememberLastReaction, saveReaction, type SavedReaction } from "@/lib/reactions";
import { chip } from "@/components/banner/banner-picker";
import { cn } from "@/lib/cn";

const SLOT_LABELS: Record<ReactionPosition, string> = { top: "Top video", bottom: "Bottom video" };

const REACTION_FRAMINGS: Array<{ fit: ReactionFit; label: string; hint: string }> = [
  { fit: "fill", label: "Fill", hint: "Covers the whole strip; what doesn't fit is cropped." },
  { fit: "fit", label: "Whole", hint: "Whole reaction video, on black." },
];

/** Where reaction videos are added, deleted and sized. */
const SETUP_HREF = "/banners?tab=reaction";

/** How much of the Short's height the chosen banners take, in percent. */
export function bannersPercentOf(chosen: Partial<Record<BannerPosition, BannerDoc>>): number {
  return BANNER_POSITIONS.reduce((sum, position) => {
    const banner = chosen[position];
    return sum + (banner ? (bannerHeight(banner.width, banner.height) / SHORT_HEIGHT) * 100 : 0);
  }, 0);
}

/**
 * The reaction video chosen for a set of Shorts and how it sits in its strip.
 * Reaction videos are saved in this browser, and the one used last time comes
 * back chosen, set up as it was. `bannersPercent` is the height the banners take:
 * the Short's own video always keeps a share of the frame, so tall banners leave the strip less.
 * With `autoSave`, every change is kept as it is made, with no need to start a job first.
 */
export function useReactionSetup(bannersPercent = 0, autoSave = false) {
  const [last] = useState(readLastReaction);
  const [saved, setSaved] = useState<SavedReaction[]>([]);
  const [id, setId] = useState<string | null>(last.id);
  const [unreadableId, setUnreadableId] = useState<string | null>(null);
  const [position, setPosition] = useState<ReactionPosition>(last.position);
  const [wantedPercent, setPercent] = useState(last.percent);
  const [fit, setFit] = useState<ReactionFit>(last.fit);
  const [focus, setFocus] = useState(last.focus);

  useEffect(() => {
    let current = true;
    void listReactions().then((list) => current && setSaved((added) => [...added, ...list.filter((r) => !added.some((a) => a.id === r.id))]));
    return () => {
      current = false;
    };
  }, []);

  const file = saved.find((r) => r.id === id)?.file ?? null;
  const room = Math.floor(100 - MAIN_VIDEO_PERCENT_MIN - bannersPercent);
  const percentMax = Math.max(REACTION_PERCENT_MIN, Math.min(REACTION_PERCENT_MAX, room));
  const percent = Math.min(percentMax, Math.max(REACTION_PERCENT_MIN, wantedPercent || REACTION_PERCENT_MIN));
  const choice: ReactionChoice | null = file && { file, position, percent, fit, focus };

  // The size asked for is what's kept, not the smaller one tall banners may have squeezed it to this time.
  const remember = useCallback(() => rememberLastReaction({ id, position, percent: wantedPercent, fit, focus }), [id, position, wantedPercent, fit, focus]);
  useEffect(() => {
    if (autoSave) remember();
  }, [autoSave, remember]);

  async function add(picked: File) {
    const added = await saveReaction(picked);
    setSaved((list) => [added, ...list]);
    setId(added.id);
  }

  function remove(removed: string) {
    setSaved((list) => list.filter((r) => r.id !== removed));
    if (id === removed) setId(null);
    void deleteReaction(removed);
  }

  return {
    saved,
    id,
    file,
    position,
    percent,
    percentMax,
    fit,
    focus,
    /** What to hand to the renderer; null when no reaction video is chosen. */
    choice,
    /** The browser can't play the chosen file, so it is unlikely to render either. */
    unreadable: id !== null && unreadableId === id,
    /** The banners leave the strip less than its smallest size. */
    noRoom: Boolean(file) && room < REACTION_PERCENT_MIN,
    /** Puts a saved reaction video at the top or the bottom; `null` takes it off that place. */
    choose(slot: ReactionPosition, chosen: string | null) {
      if (chosen === null) {
        if (position === slot) setId(null);
        return;
      }
      setId(chosen);
      setPosition(slot);
    },
    setPercent,
    setFit,
    setFocus,
    markUnreadable: () => setUnreadableId(id),
    add,
    remove,
    /** Saves the choice, so it comes back the next time Shorts are made. */
    remember,
  };
}

export type ReactionSetup = ReturnType<typeof useReactionSetup>;

/** Shows a video file's first frame; the URL lives as long as the <video> it is attached to. */
function useFilePreview(file: Blob | null, firstFrame = false) {
  return useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video || !file) return;
      const url = URL.createObjectURL(file);
      // Without a time to show, a video that isn't playing stays black.
      video.src = firstFrame ? `${url}#t=0.1` : url;
      return () => URL.revokeObjectURL(url);
    },
    [file, firstFrame],
  );
}

/** The reaction strip in a preview, at the share of the frame it will take. Renders nothing unless it belongs at `position`. */
export function ReactionStrip({ setup, position }: { setup: ReactionSetup; position: ReactionPosition }) {
  const attach = useFilePreview(setup.file);
  if (!setup.file || setup.position !== position) return null;
  return (
    <div className="shrink-0 overflow-hidden bg-black" style={{ height: `${(reactionHeight(setup.percent) / SHORT_HEIGHT) * 100}%` }}>
      <video
        ref={attach}
        muted
        loop
        autoPlay
        playsInline
        onError={setup.markUnreadable}
        className={cn("size-full", setup.fit === "fill" ? "object-cover" : "object-contain")}
        style={{ objectPosition: `50% ${setup.focus * 100}%` }}
      />
    </div>
  );
}

/** A saved reaction video as a small picture of itself, like the banners beside it. */
function ReactionTile({ reaction, selected, onSelect }: { reaction: SavedReaction; selected: boolean; onSelect: () => void }) {
  const attach = useFilePreview(reaction.file, true);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={reaction.name}
      title={reaction.name}
      onClick={onSelect}
      className={cn(
        "relative h-12 w-28 shrink-0 overflow-hidden rounded-lg border bg-black transition",
        selected ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line hover:border-line-strong",
      )}
    >
      <video ref={attach} muted playsInline preload="metadata" className="size-full object-cover" />
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1.5 py-px text-left text-[10.5px] leading-tight text-white">{reaction.name}</span>
    </button>
  );
}

/**
 * Chooses, from the reaction videos saved on the Banners page, the one that
 * plays above the Short's own video or the one that plays below it — a row for
 * each, like the banners. `manage` links to where they are added and sized.
 */
export function ReactionPicker({ setup, where, manage = true }: { setup: ReactionSetup; /** "the Short", "every Short". */ where: string; manage?: boolean }) {
  return (
    <div className="space-y-4">
      {REACTION_POSITIONS.map((slot) => {
        const selected = setup.file && setup.position === slot ? setup.id : null;
        return (
          <div key={slot}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-medium">{SLOT_LABELS[slot]}</p>
              {manage && (
                <Link href={SETUP_HREF} className="text-[12px] text-muted transition hover:text-text">
                  {setup.saved.length > 0 ? "Add or resize" : "Add one"}
                </Link>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label={SLOT_LABELS[slot]}>
              <button type="button" role="radio" aria-checked={selected === null} onClick={() => setup.choose(slot, null)} className={cn(chip(selected === null), "flex h-12 shrink-0 items-center gap-1.5")}>
                <Ban className="size-3.5" />
                None
              </button>
              {setup.saved.map((reaction) => (
                <ReactionTile key={reaction.id} reaction={reaction} selected={selected === reaction.id} onSelect={() => setup.choose(slot, reaction.id)} />
              ))}
              {setup.saved.length === 0 && (
                <span className="flex h-12 items-center text-[12.5px] text-muted">{manage ? "No reaction videos yet — add one on the Banners page." : "Add a reaction video above first."}</span>
              )}
            </div>
          </div>
        );
      })}
      {setup.file ? (
        <p className="text-[12.5px] text-muted">
          The reaction video plays in a strip at the {setup.position} of {where}, {setup.percent}% tall, on repeat until the Short ends. One per Short: choosing it at the top takes it off the bottom.
        </p>
      ) : (
        setup.saved.length > 0 && <p className="text-[12.5px] text-muted">Pick a video for the top or the bottom to play your reaction next to {where}.</p>
      )}
      {setup.unreadable && <p className="text-[12.5px] text-danger">Your browser can&apos;t play this reaction video. Delete it on the Banners page and add an MP4 video.</p>}
      {setup.noRoom && <p className="text-[12.5px] text-danger">These banners leave no room for a reaction video. Pick shorter banners, or remove one.</p>}
    </div>
  );
}

/** The saved reaction videos, with a way to add one and to delete each. */
export function ReactionLibrary({ setup }: { setup: ReactionSetup }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {setup.saved.map((reaction) => (
        <span key={reaction.id} className="flex h-9 max-w-56 items-center gap-1 rounded-lg border border-line pl-3 text-[13px] font-medium text-muted">
          <Film className="size-3.5 shrink-0" />
          <span className="truncate" title={reaction.name}>
            {reaction.name}
          </span>
          <button
            type="button"
            onClick={() => setup.remove(reaction.id)}
            aria-label={`Delete the saved reaction video ${reaction.name}`}
            title="Delete"
            className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-white/[0.08] hover:text-text"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3.5 text-[12.5px] text-muted transition hover:border-accent/60 hover:text-text"
      >
        <Film className="size-3.5 shrink-0" />
        Add a video
      </button>
      <input
        ref={input}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) void setup.add(picked);
        }}
      />
    </div>
  );
}

/** How tall the reaction strip is and how the reaction video sits in it. */
export function ReactionSizing({ setup }: { setup: ReactionSetup }) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-[12.5px] text-muted">
        <span className="w-16 shrink-0">Height</span>
        <input
          type="range"
          min={REACTION_PERCENT_MIN}
          max={setup.percentMax}
          step={1}
          value={setup.percent}
          onChange={(e) => setup.setPercent(Number(e.target.value))}
          aria-label="Reaction video height in percent of the Short"
          className="h-2 flex-1 accent-[var(--accent)]"
        />
        <span className="w-10 shrink-0 text-right tabular-nums text-text">{setup.percent}%</span>
      </label>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="w-16 shrink-0 text-[12.5px] text-muted">Framing</span>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Reaction video framing">
          {REACTION_FRAMINGS.map((framing) => (
            <button key={framing.fit} type="button" role="radio" aria-checked={setup.fit === framing.fit} onClick={() => setup.setFit(framing.fit)} className={chip(setup.fit === framing.fit)}>
              {framing.label}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-muted">{REACTION_FRAMINGS.find((f) => f.fit === setup.fit)?.hint}</span>
      </div>
      {setup.fit === "fill" && (
        <label className="flex items-center gap-3 text-[12.5px] text-muted">
          <span className="w-16 shrink-0">Move</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(setup.focus * 100)}
            onChange={(e) => setup.setFocus(Number(e.target.value) / 100)}
            aria-label="Which part of the reaction video shows, from its top to its bottom"
            className="h-2 flex-1 accent-[var(--accent)]"
          />
          <span className="w-10 shrink-0 text-right text-text">{setup.focus < 0.34 ? "Top" : setup.focus > 0.66 ? "Bottom" : "Middle"}</span>
        </label>
      )}
    </div>
  );
}
