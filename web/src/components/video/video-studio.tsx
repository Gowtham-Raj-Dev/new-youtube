"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Crosshair, Pencil, Play, Scissors, Trash2 } from "lucide-react";
import {
  BANNER_POSITIONS,
  MAX_SHORT_SECONDS,
  MIN_SHORT_SECONDS,
  SHORT_LENGTH_PRESETS,
  formatDuration,
  leftoverSeconds,
  planSegments,
  tailModeFits,
  type BannerDoc,
  type BannerPosition,
  type CropMode,
  type Segment,
  type SettingsDoc,
  type TailMode,
  type VideoDoc,
} from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { measureSource, type SourceFrame } from "@/lib/local-splitter";
import { useStorageUrl } from "@/lib/videos";
import { useWork } from "@/lib/work/work-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BannerPicker, PreviewBanner, chip } from "@/components/banner/banner-picker";
import { ReactionPicker, ReactionStrip, bannersPercentOf, useReactionSetup } from "@/components/short/reaction-picker";
import { HelperNotice } from "@/components/video/helper-notice";
import { cn } from "@/lib/cn";

const FRAMINGS: Array<{ mode: CropMode; label: string; hint: string }> = [
  { mode: "center", label: "Fill", hint: "Fills the space between the banners; the sides are cropped." },
  { mode: "blur", label: "Blur", hint: "Whole picture on a blurred background." },
  { mode: "fit", label: "Bars", hint: "Whole picture on black." },
];

const TAILS: Array<{ mode: TailMode; label: string; hint: string }> = [
  { mode: "own", label: "Its own Short", hint: "The leftover becomes one more, shorter Short." },
  { mode: "last", label: "Add to the last Short", hint: "The last Short runs longer and takes all of it." },
  { mode: "last2", label: "Share over the last 2", hint: "The last two Shorts each run a little longer." },
  { mode: "all", label: "Share over all", hint: "Every Short runs a little longer, so all are the same length." },
  { mode: "drop", label: "Leave it out", hint: "The leftover isn't used; the end of the video is cut off." },
];

/** `32s`, or `33.3s` when it isn't a whole number. */
const formatSeconds = (seconds: number) => `${Math.round(seconds * 10) / 10}s`;

/** The lengths a plan gives, in order: `8 × 30s + 2 × 40s`. */
function describeLengths(segments: Segment[]): string {
  const runs: Array<{ length: string; count: number }> = [];
  for (const segment of segments) {
    const length = formatSeconds(segment.endSec - segment.startSec);
    const current = runs.at(-1);
    if (current?.length === length) current.count++;
    else runs.push({ length, count: 1 });
  }
  return runs.map((run) => `${run.count} × ${run.length}`).join(" + ");
}

/** What the helper will write on part `n`. */
const previewLabel = (template: string, n: number, total: number) => template.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));

/** The whole video playing inside the vertical frame, with the chosen banners and framing — what each Short will look like. */
function ShortPreview({
  video,
  cropMode,
  top,
  bottom,
  aboveVideo,
  belowVideo,
  label,
  onMoveLabel,
}: {
  video: VideoDoc;
  cropMode: CropMode;
  top?: BannerDoc;
  bottom?: BannerDoc;
  /** Strips between a banner and the video — the reaction video goes in one of them. */
  aboveVideo?: ReactNode;
  belowVideo?: ReactNode;
  label: { text: string; x: number; y: number } | null;
  onMoveLabel: (position: { x: number; y: number }) => void;
}) {
  const source = useStorageUrl(video.storagePath);
  const poster = useStorageUrl(video.thumbnailPath);
  const [frame, setFrame] = useState<SourceFrame | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const frameBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void measureSource(video.storagePath).then((measured) => !cancelled && setFrame(measured));
    return () => {
      cancelled = true;
    };
  }, [video.storagePath]);

  // The real picture inside the file's frame: black bars baked into the video are left out, as they are in the Shorts.
  const full = { width: frame?.width ?? video.width ?? 16, height: frame?.height ?? video.height ?? 9 };
  const picture = frame?.crop ?? { ...full, x: 0, y: 0 };
  const ratio = picture.width / picture.height;

  return (
    <div ref={frameBox} className="relative mx-auto flex aspect-[9/16] h-[min(460px,calc(100dvh-15rem))] flex-col overflow-hidden rounded-xl border border-line bg-black [container-type:size]">
      <PreviewBanner banner={top} />
      {aboveVideo}
      <div className="relative min-h-0 flex-1 overflow-hidden [container-type:size]">
        {cropMode === "blur" && poster && <img src={poster} alt="" className="absolute inset-0 size-full scale-150 object-cover blur-xl" />}
        {source ? (
          // A box the shape of the picture, sized to cover the slot (Fill) or sit inside it (Blur, Bars).
          <button
            type="button"
            // The browser may refuse or interrupt play() (tab in the background, power saving); that's not an error worth surfacing.
            onClick={() => (player.current?.paused ? void player.current.play().catch(() => undefined) : player.current?.pause())}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
            style={{ aspectRatio: String(ratio), width: `${cropMode === "center" ? "max" : "min"}(100cqw, calc(100cqh * ${ratio}))` }}
          >
            <video
              ref={player}
              src={source}
              poster={poster ?? undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              className="absolute max-w-none object-fill"
              style={{
                width: `${(full.width / picture.width) * 100}%`,
                height: `${(full.height / picture.height) * 100}%`,
                left: `${(-picture.x / picture.width) * 100}%`,
                top: `${(-picture.y / picture.height) * 100}%`,
              }}
            />
          </button>
        ) : (
          <div className="grid size-full place-items-center text-[12px] text-faint">Loading preview…</div>
        )}
        {source && !playing && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        )}
      </div>
      {belowVideo}
      <PreviewBanner banner={bottom} />

      {/* Centre guides while the label is being moved; each lights up when the label snaps onto it. */}
      {label && dragging && (
        <>
          <span className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2", label.x === 0.5 ? "bg-accent" : "bg-white/35")} />
          <span className={cn("pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2", label.y === 0.5 ? "bg-accent" : "bg-white/35")} />
          <span className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-accent" />
        </>
      )}
      {label && (
        // Same proportions as the helper draws: 60px text with 22px padding on a 1920px-tall frame.
        <span
          role="slider"
          tabIndex={0}
          aria-label="Part number position — drag to move"
          aria-valuetext={`${Math.round(label.x * 100)}% across, ${Math.round(label.y * 100)}% down`}
          aria-valuenow={Math.round(label.y * 100)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!dragging || !frameBox.current) return;
            const box = frameBox.current.getBoundingClientRect();
            const share = (value: number) => Math.min(0.96, Math.max(0.04, value));
            // Within a whisker of the middle, it snaps onto the centre line.
            const snap = (value: number, reach: number) => (Math.abs(value - 0.5) < reach ? 0.5 : value);
            onMoveLabel({ x: snap(share((e.clientX - box.left) / box.width), 0.035), y: snap(share((e.clientY - box.top) / box.height), 0.02) });
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 touch-none select-none whitespace-nowrap bg-black/60 font-bold leading-none text-white outline-offset-2",
            dragging ? "cursor-grabbing ring-1 ring-accent" : "cursor-grab hover:ring-1 hover:ring-white/60",
          )}
          style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%`, fontSize: "3.125cqh", padding: "1.15cqh", fontFamily: "Arial, sans-serif" }}
        >
          {label.text}
        </span>
      )}
    </div>
  );
}

/**
 * Everything for one video: preview it in the vertical frame, choose the Short
 * length, framing and banners, then cut it. Rename and delete live here too.
 */
export function VideoStudioDialog({
  video,
  settings,
  banners,
  onClose,
  onRename,
  onDelete,
}: {
  video: WithId<VideoDoc>;
  settings: Pick<SettingsDoc, "processing" | "publishing">;
  banners: WithId<BannerDoc>[];
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [seconds, setSeconds] = useState(30);
  const [tailChoice, setTailChoice] = useState<TailMode>("own");
  const [cropMode, setCropMode] = useState<CropMode>(settings.processing.cropMode === "smart" ? "center" : settings.processing.cropMode);
  const [picked, setPicked] = useState<Record<BannerPosition, string | null>>({ top: null, bottom: null });
  // Cutting runs app-wide, so it carries on if this window is closed or another page is opened.
  const { splits, startSplit } = useWork();
  const job = splits.get(video.id);
  const progress = job?.status === "working" ? job.progress : null;
  const error = job?.status === "failed" ? job.error : null;
  const [labelOn, setLabelOn] = useState(true);
  const [labelText, setLabelText] = useState("Part {n}");
  /** Centre of the label, as shares of the frame's width and height. */
  const [labelAt, setLabelAt] = useState({ x: 0.5, y: 0.3 });
  const label = labelOn && labelText.trim() ? { template: labelText.trim(), ...labelAt } : null;

  const busy = progress !== null;
  const valid = Number.isInteger(seconds) && seconds >= MIN_SHORT_SECONDS && seconds <= MAX_SHORT_SECONDS;
  const duration = video.durationSec ?? 0;
  // Only asked when the video doesn't divide evenly; a choice that would stretch a Short past the limit isn't offered.
  const leftover = valid ? leftoverSeconds(duration, seconds) : 0;
  const tailFits = (mode: TailMode) => tailModeFits(duration, seconds, mode);
  const tail = leftover > 0 && tailFits(tailChoice) ? tailChoice : "own";
  const segments = valid ? planSegments(duration, seconds, tail) : [];
  const count = segments.length;
  const chosen = Object.fromEntries(BANNER_POSITIONS.map((position) => [position, banners.find((b) => b.id === picked[position])])) as Partial<Record<BannerPosition, WithId<BannerDoc>>>;
  const reaction = useReactionSetup(bannersPercentOf(chosen));
  const canCut = !video.sourceDeletedAt && (video.status === "uploaded" || video.status === "completed");

  function start(e: FormEvent) {
    e.preventDefault();
    if (!valid || !canCut || reaction.noRoom || reaction.unreadable) return;
    reaction.remember();
    startSplit(video, seconds, { ...settings, processing: { ...settings.processing, cropMode } }, chosen, label, tail, reaction.choice);
  }

  return (
    <Dialog title={video.title} onClose={onClose} width="max-w-4xl">
      <form onSubmit={start} className="mt-4 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <ShortPreview
            video={video}
            cropMode={cropMode}
            top={chosen.top}
            bottom={chosen.bottom}
            aboveVideo={<ReactionStrip setup={reaction} position="top" />}
            belowVideo={<ReactionStrip setup={reaction} position="bottom" />}
            label={label && { text: previewLabel(label.template, 1, count), x: label.x, y: label.y }}
            onMoveLabel={setLabelAt}
          />
          <p className="mt-2.5 text-center text-[12px] text-faint">Preview · {formatDuration(video.durationSec)} · every Short gets this look</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Length of each Short</p>
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Short length">
              {SHORT_LENGTH_PRESETS.map((preset) => (
                <button key={preset} type="button" role="radio" aria-checked={seconds === preset} onClick={() => setSeconds(preset)} className={chip(seconds === preset)}>
                  {preset}s
                </button>
              ))}
              <label className="ml-1 flex items-center gap-2 text-[12.5px] text-muted">
                or
                <input
                  type="number"
                  min={MIN_SHORT_SECONDS}
                  max={MAX_SHORT_SECONDS}
                  step={1}
                  value={Number.isNaN(seconds) ? "" : seconds}
                  onChange={(e) => setSeconds(e.target.valueAsNumber)}
                  aria-label="Seconds per Short"
                  className="h-9 w-20 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-text outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)]"
                />
                sec
              </label>
            </div>
          </div>

          {leftover > 0 && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium">
                The last {formatSeconds(leftover)} left over <span className="font-normal text-muted">· this video isn&apos;t a whole number of {seconds}s Shorts</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to do with the leftover seconds">
                {TAILS.filter((option) => tailFits(option.mode)).map((option) => (
                  <button key={option.mode} type="button" role="radio" aria-checked={tail === option.mode} onClick={() => setTailChoice(option.mode)} className={chip(tail === option.mode)}>
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {TAILS.find((option) => option.mode === tail)?.hint} <span className="text-text">You get {describeLengths(segments)}.</span>
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[13px] font-medium">Framing</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="flex gap-1.5" role="radiogroup" aria-label="Framing">
                {FRAMINGS.map((framing) => (
                  <button key={framing.mode} type="button" role="radio" aria-checked={cropMode === framing.mode} onClick={() => setCropMode(framing.mode)} className={chip(cropMode === framing.mode)}>
                    {framing.label}
                  </button>
                ))}
              </div>
              <span className="text-[12.5px] text-muted">{FRAMINGS.find((f) => f.mode === cropMode)?.hint}</span>
            </div>
          </div>

          {BANNER_POSITIONS.map((position) => (
            <BannerPicker key={position} position={position} uid={video.userId} banners={banners} selected={picked[position]} onSelect={(id) => setPicked((current) => ({ ...current, [position]: id }))} />
          ))}

          <ReactionPicker setup={reaction} where="every Short" />

          <div>
            <p className="mb-1.5 text-[13px] font-medium">Part number on each Short</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex gap-1.5" role="radiogroup" aria-label="Part number">
                <button type="button" role="radio" aria-checked={!labelOn} onClick={() => setLabelOn(false)} className={chip(!labelOn)}>
                  Off
                </button>
                <button type="button" role="radio" aria-checked={labelOn} onClick={() => setLabelOn(true)} className={chip(labelOn)}>
                  On
                </button>
              </div>
              {labelOn && (
                <input
                  value={labelText}
                  maxLength={40}
                  onChange={(e) => setLabelText(e.target.value)}
                  aria-label="Part number text"
                  className="h-9 w-36 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-text outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)]"
                />
              )}
              {labelOn && (
                <button type="button" onClick={() => setLabelAt({ x: 0.5, y: 0.5 })} className={cn(chip(labelAt.x === 0.5 && labelAt.y === 0.5), "flex items-center gap-1.5")}>
                  <Crosshair className="size-3.5" />
                  Centre
                </button>
              )}
            </div>
            {labelOn && (
              <p className="mt-1.5 text-[12.5px] text-muted">
                <code className="text-text">{"{n}"}</code> counts up — {previewLabel(labelText, 1, count)}, {previewLabel(labelText, 2, count)}… Drag the label in the preview to place it; it snaps to the centre lines.
              </p>
            )}
          </div>

          {canCut && !progress && <HelperNotice />}

          {progress ? (
            <div>
              <p className="flex justify-between text-[12.5px] text-muted">
                <span>{progress.stage}</span>
                <span className="tabular-nums">{Math.round(progress.percent)}%</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-faint">Cutting happens on this device. You can close this window or open another page — it carries on. Just keep this browser tab open.</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              {!canCut ? (
                "This video can't be cut — its file isn't available."
              ) : valid ? (
                <>
                  Makes <span className="font-semibold text-accent">{count} {count === 1 ? "Short" : "Shorts"}</span>: {describeLengths(segments)}.
                  {video.shortsCount > 0 && ` The ${video.shortsCount} already made from this video stay as they are.`}
                </>
              ) : (
                <span className="text-danger">
                  Choose between {MIN_SHORT_SECONDS} and {MAX_SHORT_SECONDS} seconds.
                </span>
              )}
            </p>
          )}
          {job?.status === "done" && (
            <p className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-[13px] text-success">
              {job.count === 1 ? "1 Short is" : `${job.count} Shorts are`} ready on the{" "}
              <Link href="/shorts" className="font-medium underline">
                Shorts page
              </Link>
              .
            </p>
          )}
          {error && <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>}

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} disabled={busy} onClick={onRename}>
              Rename
            </Button>
            <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-3.5" />} disabled={busy} onClick={onDelete} className="hover:text-danger">
              Delete
            </Button>
            <Button type="submit" className="ml-auto" icon={<Scissors className="size-4" />} loading={busy} disabled={!valid || count === 0 || !canCut || reaction.noRoom || reaction.unreadable}>
              Generate {count > 0 ? count : ""} Shorts
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
