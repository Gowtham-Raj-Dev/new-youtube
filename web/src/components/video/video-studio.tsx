"use client";

/* eslint-disable @next/next/no-img-element -- Storage download URLs in a static export */
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import {
  Copy,
  Crop,
  FileText,
  LoaderCircle,
  Mic,
  PanelsTopLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  Scissors,
  Square,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Trash2,
  Type,
  Volume2,
} from "lucide-react";
import {
  BANNER_POSITIONS,
  FRAMING_ZOOM_MAX,
  FRAMING_ZOOM_MIN,
  MAX_SHORT_SECONDS,
  MIN_SHORT_SECONDS,
  SHORT_HEIGHT,
  SHORT_LENGTH_PRESETS,
  SHORT_WIDTH,
  VOICE_PITCH_MAX,
  VOICE_PITCH_MIN,
  VOICE_PRESETS,
  bannerHeight,
  fillZoom,
  formatBytes,
  formatDuration,
  leftoverSeconds,
  placePicture,
  planSegments,
  reactionHeight,
  tailModeFits,
  wholeZoom,
  type BannerDoc,
  type BannerPosition,
  type CropMode,
  type Framing,
  type Segment,
  type SettingsDoc,
  type TailMode,
} from "@shortflow/shared";
import { firebase } from "@/lib/firebase/client";
import { measureSource, type SourceFrame } from "@/lib/local-splitter";
import { useBlobUrl, type LibraryVideo } from "@/lib/local-videos";
import { decodeSound, pitchShift } from "@/lib/pitch";
import { newTextBox, readTextBoxes, rememberTextBoxes, type TextBox, type TextVars } from "@/lib/text-boxes";
import { detailsProblem, partDetails, readDetails, rememberDetails, type ShortDetails } from "@/lib/short-details";
import { tagChars } from "@/lib/shorts";
import { TagInput } from "@/components/short/tag-input";
import { TEXT_FONTS } from "@/lib/text-fonts";
import { useStorageUrl } from "@/lib/videos";
import { useWork } from "@/lib/work/work-provider";
import type { WithId } from "@/lib/firebase/hooks";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BannerPicker, PreviewBanner, chip } from "@/components/banner/banner-picker";
import { ReactionPicker, ReactionStrip, bannersPercentOf, useReactionSetup } from "@/components/short/reaction-picker";
import { HelperNotice } from "@/components/video/helper-notice";
import { TextLayer } from "@/components/video/text-layer";
import { cn } from "@/lib/cn";

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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const shorten = (text: string, max: number) => ([...text].length > max ? `${[...text].slice(0, max - 1).join("")}…` : text);
const pct = (n: number) => `${Math.round(n * 100)}%`;

// ─── Framing: how big the video is in the Short and where it sits ───

/** `fill` and `whole` follow the banners as they change; a number is the user's own size. */
type SizeChoice = "fill" | "whole" | number;
type Backdrop = "black" | "blur";

interface FramingChoice {
  size: SizeChoice;
  x: number;
  y: number;
  backdrop: Backdrop;
}

const FRAMING_KEY = "shortflow:framing";
const VOICE_KEY = "shortflow:voice";

function readFraming(cropMode: CropMode): FramingChoice {
  const fallback: FramingChoice = cropMode === "center" || cropMode === "smart" ? { size: "fill", x: 0.5, y: 0.5, backdrop: "black" } : { size: "whole", x: 0.5, y: 0.5, backdrop: cropMode === "blur" ? "blur" : "black" };
  try {
    const saved = JSON.parse(localStorage.getItem(FRAMING_KEY) ?? "null") as Partial<FramingChoice> | null;
    if (!saved) return fallback;
    const size = saved.size === "fill" || saved.size === "whole" || (typeof saved.size === "number" && saved.size >= FRAMING_ZOOM_MIN && saved.size <= FRAMING_ZOOM_MAX) ? saved.size : fallback.size;
    return { size, x: typeof saved.x === "number" ? clamp01(saved.x) : 0.5, y: typeof saved.y === "number" ? clamp01(saved.y) : 0.5, backdrop: saved.backdrop === "blur" ? "blur" : "black" };
  } catch {
    return fallback;
  }
}

function remember(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage off or full: it just isn't remembered.
  }
}

function readVoice(): { preset: string; pitch: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(VOICE_KEY) ?? "null") as { preset?: unknown; pitch?: unknown } | null;
    if (saved && typeof saved.pitch === "number" && saved.pitch >= VOICE_PITCH_MIN && saved.pitch <= VOICE_PITCH_MAX && typeof saved.preset === "string") return { preset: saved.preset, pitch: saved.pitch };
  } catch {
    // Nothing saved.
  }
  return { preset: "original", pitch: 1 };
}

const PRESETS: Array<{ id: string; label: string; hint: string; choice: FramingChoice }> = [
  { id: "fill", label: "Fill", hint: "Fills all the space; the sides are cut off.", choice: { size: "fill", x: 0.5, y: 0.5, backdrop: "black" } },
  { id: "blur", label: "Blur", hint: "Whole picture on a blurred background.", choice: { size: "whole", x: 0.5, y: 0.5, backdrop: "blur" } },
  { id: "bars", label: "Bars", hint: "Whole picture on black.", choice: { size: "whole", x: 0.5, y: 0.5, backdrop: "black" } },
];

const samePreset = (a: FramingChoice, b: FramingChoice) => a.size === b.size && a.x === b.x && a.y === b.y && (a.size === "fill" || a.backdrop === b.backdrop);

/** +x% / −x% for a pitch ratio. */
const pitchLabel = (pitch: number) => (pitch === 1 ? "0%" : `${pitch > 1 ? "+" : "−"}${Math.round(Math.abs(pitch - 1) * 100)}%`);

// ─── The preview ───

/** The whole video playing inside the vertical frame, with the chosen banners, framing and text — what each Short will look like. */
function ShortPreview({
  video,
  player,
  frame,
  framing,
  slotHeight,
  backdrop,
  onMovePicture,
  top,
  bottom,
  aboveVideo,
  belowVideo,
  boxes,
  vars,
  selectedBox,
  onSelectBox,
  onChangeBox,
  onPlaying,
}: {
  video: LibraryVideo;
  player: RefObject<HTMLVideoElement | null>;
  frame: SourceFrame | null;
  framing: Framing;
  /** Height of the space the video gets, in Short pixels (the Short is 1080 wide). */
  slotHeight: number;
  backdrop: Backdrop;
  onMovePicture: (position: { x: number; y: number }) => void;
  top?: BannerDoc;
  bottom?: BannerDoc;
  /** Strips between a banner and the video — the reaction video goes in one of them. */
  aboveVideo?: ReactNode;
  belowVideo?: ReactNode;
  boxes: TextBox[];
  vars: TextVars;
  selectedBox: string | null;
  onSelectBox: (id: string | null) => void;
  onChangeBox: (id: string, change: Partial<TextBox>) => void;
  onPlaying: (playing: boolean) => void;
}) {
  const local = video.local;
  const cloudSource = useStorageUrl(local ? null : video.storagePath);
  const cloudPoster = useStorageUrl(local ? null : video.thumbnailPath);
  const localSource = useBlobUrl(local?.playable ? local.file : null);
  const localPoster = useBlobUrl(local?.thumbnail);
  const source = local ? localSource : cloudSource;
  const poster = local ? localPoster : cloudPoster;
  const [playing, setPlaying] = useState(false);
  const [moving, setMoving] = useState(false);
  const frameBox = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const grab = useRef<{ x: number; y: number; fx: number; fy: number; moved: boolean } | null>(null);

  // The real picture inside the file's frame: black bars baked into the video are left out, as they are in the Shorts.
  const full = { width: frame?.width ?? video.width ?? 16, height: frame?.height ?? video.height ?? 9 };
  const picture = frame?.crop ?? { ...full, x: 0, y: 0 };
  // The picture's box in the slot, as shares of the slot — the same sums `placePicture()` does for the render.
  const widthShare = framing.zoom;
  const heightShare = (SHORT_WIDTH * framing.zoom * (picture.height / picture.width)) / slotHeight;
  const leftShare = (1 - widthShare) * framing.x;
  const topShare = (1 - heightShare) * framing.y;

  const togglePlay = () => (player.current?.paused ? void player.current.play().catch(() => undefined) : player.current?.pause());

  return (
    <div ref={frameBox} className="relative mx-auto flex aspect-[9/16] h-[min(600px,calc(100dvh-13rem))] flex-col overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_var(--line),0_30px_60px_-30px_rgb(0_0_0/0.9)] [container-type:size]">
      <PreviewBanner banner={top} />
      {aboveVideo}
      <div
        ref={slot}
        role="button"
        tabIndex={0}
        aria-label={playing ? "Pause preview — drag to move the video" : "Play preview — drag to move the video"}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), togglePlay())}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onSelectBox(null);
          grab.current = { x: e.clientX, y: e.clientY, fx: framing.x, fy: framing.y, moved: false };
        }}
        onPointerMove={(e) => {
          const g = grab.current;
          if (!g || !slot.current) return;
          const dx = e.clientX - g.x;
          const dy = e.clientY - g.y;
          if (!g.moved && Math.hypot(dx, dy) < 4) return;
          g.moved = true;
          setMoving(true);
          const box = slot.current.getBoundingClientRect();
          // Room to move in each direction; negative when the picture is bigger than the space (then it moves which part shows).
          const roomX = box.width * (1 - widthShare);
          const roomY = box.height * (1 - heightShare);
          const snap = (value: number) => (Math.abs(value - 0.5) < 0.03 ? 0.5 : value);
          onMovePicture({
            x: Math.abs(roomX) > 1 ? snap(clamp01(g.fx + dx / roomX)) : framing.x,
            y: Math.abs(roomY) > 1 ? snap(clamp01(g.fy + dy / roomY)) : framing.y,
          });
        }}
        onPointerUp={() => {
          if (grab.current && !grab.current.moved) togglePlay();
          grab.current = null;
          setMoving(false);
        }}
        onPointerCancel={() => {
          grab.current = null;
          setMoving(false);
        }}
        className={cn("relative min-h-0 flex-1 touch-none select-none overflow-hidden outline-none [container-type:size]", moving ? "cursor-grabbing" : "cursor-grab")}
      >
        {backdrop === "blur" && poster && <img src={poster} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full scale-150 object-cover blur-xl" />}
        {source ? (
          <div className="pointer-events-none absolute overflow-hidden" style={{ left: `${leftShare * 100}%`, top: `${topShare * 100}%`, width: `${widthShare * 100}%`, height: `${heightShare * 100}%` }}>
            <video
              ref={player}
              src={source}
              poster={poster ?? undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => (setPlaying(true), onPlaying(true))}
              onPause={() => (setPlaying(false), onPlaying(false))}
              className="absolute max-w-none object-fill"
              style={{
                width: `${(full.width / picture.width) * 100}%`,
                height: `${(full.height / picture.height) * 100}%`,
                left: `${(-picture.x / picture.width) * 100}%`,
                top: `${(-picture.y / picture.height) * 100}%`,
              }}
            />
          </div>
        ) : local && !local.playable ? (
          <div className="grid size-full place-items-center px-4 text-center text-[12px] text-faint">This browser can&apos;t play this file, so there&apos;s no preview. The PC helper can still cut it.</div>
        ) : (
          <div className="grid size-full place-items-center text-[12px] text-faint">Loading preview…</div>
        )}
        {moving && (
          <>
            <span className={cn("pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2", framing.x === 0.5 ? "bg-accent" : "bg-white/35")} />
            <span className={cn("pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2", framing.y === 0.5 ? "bg-accent" : "bg-white/35")} />
          </>
        )}
        {source && !playing && !moving && (
          <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        )}
      </div>
      {belowVideo}
      <PreviewBanner banner={bottom} />

      <TextLayer frame={frameBox} boxes={boxes} vars={vars} selected={selectedBox} onSelect={onSelectBox} onChange={onChangeBox} />
    </div>
  );
}

// ─── Small parts of the panel ───

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A labelled slider. */
function Slide({ label, ends, value, onChange, disabled, min = 0, max = 1, step = 0.01, readout }: { label: string; ends?: [string, string]; value: number; onChange: (value: number) => void; disabled?: boolean; min?: number; max?: number; step?: number; readout?: string }) {
  return (
    <label className={cn("grid grid-cols-[6rem_minmax(0,1fr)_3rem] items-center gap-3 text-[12.5px]", disabled ? "text-faint" : "text-muted")}>
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {ends && <span className="text-[11px] text-faint">{ends[0]}</span>}
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(e.target.valueAsNumber)} aria-label={label} className="min-w-0 flex-1 accent-[var(--accent)] disabled:opacity-40" />
        {ends && <span className="text-[11px] text-faint">{ends[1]}</span>}
      </span>
      <span className="text-right tabular-nums text-text">{readout}</span>
    </label>
  );
}

const SWATCHES = ["#ffffff", "#ffd400", "#ff3b30", "#22d3ee", "#a3e635", "#000000"];

function Swatches({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={cn("size-7 rounded-full border transition", value.toLowerCase() === color ? "border-accent ring-2 ring-accent/40" : "border-white/20 hover:border-white/50")}
          style={{ background: color }}
        />
      ))}
      <label className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-white/30 text-[10px] text-muted hover:border-white/60" title="Any colour">
        <Plus className="size-3.5" />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label}: any colour`} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

type Tab = "cut" | "details" | "framing" | "text" | "voice" | "extras";

const TITLE_IDEAS = ["{title} | Part {n}", "{title} - Part {n}/{total}", "Part {n} | {title}", "{title} 🔥 Part {n} #shorts"];

/** Buttons that put `{n}` and friends where the cursor is in `field`. */
function InsertTokens({ field, value, onChange, tokens = ["{title}", "{n}", "{part}", "{total}"] }: { field: RefObject<HTMLInputElement | HTMLTextAreaElement | null>; value: string; onChange: (value: string) => void; tokens?: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-faint">
      <span>Insert</span>
      {tokens.map((token) => (
        <button
          key={token}
          type="button"
          onClick={() => {
            const el = field.current;
            const at = el?.selectionStart ?? value.length;
            const end = el?.selectionEnd ?? at;
            onChange(value.slice(0, at) + token + value.slice(end));
            requestAnimationFrame(() => {
              el?.focus();
              el?.setSelectionRange(at + token.length, at + token.length);
            });
          }}
          className="rounded-md border border-line px-1.5 py-0.5 font-mono text-muted transition hover:border-line-strong hover:text-text"
        >
          {token}
        </button>
      ))}
    </div>
  );
}

const fieldClass = "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[14px] text-text outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)]";

/** Title, description, tags and visibility for every Short, with each Short's title listed as it will be. */
function DetailsPanel({ details, onChange, total }: { details: ShortDetails; onChange: (change: Partial<ShortDetails>) => void; total: number }) {
  const titleField = useRef<HTMLInputElement>(null);
  const descriptionField = useRef<HTMLTextAreaElement>(null);
  const parts = Math.max(1, total);
  const titles = Array.from({ length: parts }, (_, i) => partDetails(details, i + 1, parts).title);
  const first = partDetails(details, 1, parts);
  const tagLength = tagChars(details.tags);

  return (
    <>
      <Section title="Name" aside={<span className="text-[11.5px] text-faint">used for {"{title}"}</span>}>
        <input value={details.name} maxLength={200} onChange={(e) => onChange({ name: e.target.value })} aria-label="Name used for {title}" className={fieldClass} />
        <p className="mt-1.5 text-[12px] text-faint">A short name for this video. It goes into the titles, the description and the text boxes wherever {"{title}"} is. If a title gets too long, the name is shortened — never the part number.</p>
      </Section>

      <Section title="Title of each Short" aside={<span className="text-[11.5px] text-faint">max 100 characters</span>}>
        <input ref={titleField} value={details.title} maxLength={200} onChange={(e) => onChange({ title: e.target.value })} aria-label="Title" className={fieldClass} />
        <InsertTokens field={titleField} value={details.title} onChange={(title) => onChange({ title })} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TITLE_IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => onChange({ title: idea })} className={cn(chip(details.title === idea), "h-8 px-3 font-mono text-[12px]")}>
              {idea}
            </button>
          ))}
        </div>
        <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-line bg-black/20 [scrollbar-width:thin]">
          {titles.map((title, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line/60 px-3 py-1.5 text-[12.5px] last:border-b-0">
              <span className="w-6 shrink-0 text-right tabular-nums text-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate" title={title}>
                {title}
              </span>
              <span className={cn("shrink-0 tabular-nums text-[11px]", title.length >= 100 ? "text-warning" : "text-faint")}>{title.length}</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-faint">All {parts} titles, as they will be. Each one can still be changed on the Shorts page afterwards.</p>
      </Section>

      <Section title="Description" aside={<span className={cn("text-[11.5px] tabular-nums", first.description.length > 4800 ? "text-warning" : "text-faint")}>{first.description.length} / 5000</span>}>
        <textarea ref={descriptionField} rows={6} value={details.description} onChange={(e) => onChange({ description: e.target.value })} aria-label="Description" placeholder="What every Short's description says" className={cn(fieldClass, "resize-y leading-snug")} />
        <InsertTokens field={descriptionField} value={details.description} onChange={(description) => onChange({ description })} />
        {details.description.includes("{") && (
          <p className="mt-2 whitespace-pre-line rounded-lg border border-line bg-black/20 px-3 py-2 text-[12px] text-muted">
            <span className="text-faint">Short 1: </span>
            {first.description}
          </p>
        )}
      </Section>

      <Section title="Tags" aside={<span className={cn("text-[11.5px] tabular-nums", tagLength > 500 ? "text-danger" : "text-faint")}>{tagLength} / 500</span>}>
        <TagInput tags={details.tags} onChange={(tags) => onChange({ tags })} />
        <p className="mt-1.5 text-[12px] text-faint">The same tags go on every Short. Paste a comma-separated list to add many at once.</p>
      </Section>

      <Section title="Visibility">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Visibility">
          {(["public", "unlisted", "private"] as const).map((privacy) => (
            <button key={privacy} type="button" role="radio" aria-checked={details.privacy === privacy} onClick={() => onChange({ privacy })} className={chip(details.privacy === privacy)}>
              {privacy[0].toUpperCase() + privacy.slice(1)}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

// ─── The dialog ───

/**
 * Everything for one video: preview it in the vertical frame, choose the Short
 * length, framing, text, voice and banners, then cut it. Rename and remove live here too.
 */
export function VideoStudioDialog({
  video,
  settings,
  banners,
  onClose,
  onRename,
  onDelete,
}: {
  video: LibraryVideo;
  settings: Pick<SettingsDoc, "processing" | "publishing">;
  banners: WithId<BannerDoc>[];
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<Tab>("cut");
  const [seconds, setSeconds] = useState(30);
  const [tailChoice, setTailChoice] = useState<TailMode>("own");
  const [look, setLook] = useState<FramingChoice>(() => readFraming(settings.processing.cropMode));
  const [picked, setPicked] = useState<Record<BannerPosition, string | null>>({ top: null, bottom: null });
  const [boxes, setBoxes] = useState<TextBox[]>(readTextBoxes);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [voice, setVoice] = useState(readVoice);
  const [details, setDetails] = useState<ShortDetails>(() => readDetails(video.connectionId, settings.publishing, video.title));
  const changeDetails = (change: Partial<ShortDetails>) =>
    setDetails((current) => {
      const next = { ...current, ...change };
      rememberDetails(video.connectionId, next);
      return next;
    });
  const player = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // Cutting runs app-wide, so it carries on if this window is closed or another page is opened.
  const { splits, startSplit } = useWork();
  const job = splits.get(video.id);
  const progress = job?.status === "working" ? job.progress : null;
  const error = job?.status === "failed" ? job.error : null;

  // The picture's size and black bars: a video on this PC was measured when it was added; a cloud one is measured by the helper.
  const local = video.local;
  const [measured, setMeasured] = useState<SourceFrame | null>(null);
  useEffect(() => {
    if (local) return;
    let cancelled = false;
    void measureSource(video.storagePath).then((m) => !cancelled && setMeasured(m));
    return () => {
      cancelled = true;
    };
  }, [local, video.storagePath]);
  const frame: SourceFrame | null = local ? { width: local.width, height: local.height, crop: local.crop } : measured;

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
  const canCut = Boolean(local) || (!video.sourceDeletedAt && (video.status === "uploaded" || video.status === "completed"));

  // The space the video gets once the banners and the reaction strip are in, in Short pixels.
  const slotHeight = Math.max(
    2,
    SHORT_HEIGHT - (chosen.top ? bannerHeight(chosen.top.width, chosen.top.height) : 0) - (chosen.bottom ? bannerHeight(chosen.bottom.width, chosen.bottom.height) : 0) - (reaction.file ? reactionHeight(reaction.percent) : 0),
  );
  const pw = frame?.crop?.width ?? frame?.width ?? video.width ?? 16;
  const ph = frame?.crop?.height ?? frame?.height ?? video.height ?? 9;
  const whole = wholeZoom(pw, ph, SHORT_WIDTH, slotHeight);
  const fill = fillZoom(pw, ph, SHORT_WIDTH, slotHeight);
  const clampZoom = (zoom: number) => Math.min(FRAMING_ZOOM_MAX, Math.max(FRAMING_ZOOM_MIN, zoom));
  const zoom = clampZoom(look.size === "fill" ? fill : look.size === "whole" ? whole : look.size);
  const framing: Framing = { zoom, x: look.x, y: look.y };
  const covers = placePicture(pw, ph, SHORT_WIDTH, slotHeight, framing).covers;
  const cropMode: CropMode = look.backdrop === "blur" && !covers ? "blur" : covers ? "center" : "fit";
  const preset = PRESETS.find((p) => samePreset(look, p.choice));
  const sizeMin = clampZoom(Math.min(whole, 1) * 0.5);
  const sizeMax = clampZoom(Math.max(fill * 1.6, 2));
  const heightShare = (SHORT_WIDTH * zoom * (ph / pw)) / slotHeight;
  const sidesCut = Math.max(0, 1 - 1 / zoom);
  const ends = heightShare < 0.995 ? { above: (1 - heightShare) * look.y, below: (1 - heightShare) * (1 - look.y) } : null;
  const vars: TextVars = { n: 1, total: Math.max(1, count), title: details.name.trim() || video.title };
  const detailsIssue = detailsProblem(details, count);
  const voicePreset = VOICE_PRESETS.find((p) => p.id === voice.preset);
  const voiceName = voice.pitch === 1 ? "Original" : (voicePreset?.label ?? `Custom ${pitchLabel(voice.pitch)}`);

  function changeLook(change: Partial<FramingChoice>) {
    setLook((current) => {
      const next = { ...current, ...change };
      remember(FRAMING_KEY, next);
      return next;
    });
  }

  function setSize(value: number) {
    // Close to whole or fill, it snaps there and keeps following the banners.
    const near = (target: number) => Math.abs(value - target) / target < 0.025;
    changeLook({ size: near(fill) ? "fill" : near(whole) ? "whole" : value });
  }

  function changeBoxes(next: (current: TextBox[]) => TextBox[]) {
    setBoxes((current) => {
      const updated = next(current);
      rememberTextBoxes(updated);
      return updated;
    });
  }
  const changeBox = (id: string, change: Partial<TextBox>) => changeBoxes((all) => all.map((b) => (b.id === id ? { ...b, ...change } : b)));
  function addBox(kind: "part" | "title" | "plain") {
    const box = newTextBox(kind);
    changeBoxes((all) => [...all, box]);
    setSelectedBox(box.id);
  }
  function selectBox(id: string | null) {
    setSelectedBox(id);
    if (id) setTab("text");
  }

  function changeVoice(next: { preset: string; pitch: number }) {
    setVoice(next);
    remember(VOICE_KEY, next);
  }

  // ─── Hearing the voice on the video before making the Shorts ───
  const [testing, setTesting] = useState<"idle" | "loading" | "playing">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const test = useRef<{ ctx: AudioContext; node: AudioBufferSourceNode | null } | null>(null);

  function stopTest() {
    const current = test.current;
    test.current = null;
    if (current) {
      current.node?.stop();
      void current.ctx.close().catch(() => undefined);
    }
    player.current?.pause();
    setTesting("idle");
  }

  async function startTest() {
    stopTest();
    const el = player.current;
    if (!el) return;
    setTestError(null);
    // Made on the click, so the browser lets it play.
    const ctx = new AudioContext();
    const session = { ctx, node: null as AudioBufferSourceNode | null };
    test.current = session;
    setTesting("loading");
    try {
      const from = el.currentTime;
      const length = 15;
      const source = local ? local.file : await getDownloadURL(storageRef(firebase().storage, video.storagePath));
      const sound = await decodeSound(source, from, Math.min(duration || from + length, from + length));
      if (test.current !== session) return;
      if (!sound) throw new Error("This video has no sound to change.");
      const changed = pitchShift(sound.channels, sound.rate, voice.pitch);
      const buffer = ctx.createBuffer(changed.length, changed[0].length, sound.rate);
      changed.forEach((channel, c) => buffer.getChannelData(c).set(channel));
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      session.node = node;
      el.currentTime = sound.startSec;
      el.muted = true;
      await el.play();
      await ctx.resume();
      if (test.current !== session) return;
      node.start();
      node.onended = () => test.current === session && stopTest();
      setTesting("playing");
    } catch (err) {
      if (test.current === session) {
        stopTest();
        setTestError(err instanceof Error ? err.message : "The voice couldn't be played.");
      }
    }
  }
  // The test sound stops when the window closes.
  useEffect(() => () => stopTest(), []);

  function start(e: FormEvent) {
    e.preventDefault();
    if (!valid || !canCut || reaction.noRoom || reaction.unreadable) return;
    if (detailsIssue) return setTab("details");
    stopTest();
    reaction.remember();
    startSplit(video, seconds, { ...settings, processing: { ...settings.processing, cropMode } }, chosen, null, tail, reaction.choice, {
      framing,
      frame,
      text: boxes.filter((b) => b.text.trim()),
      pitch: voice.pitch,
      details: { ...details, name: details.name.trim() || video.title },
    });
  }

  const selected = boxes.find((b) => b.id === selectedBox) ?? null;
  const TABS: Array<{ id: Tab; label: string; icon: ReactNode; note?: string }> = [
    { id: "cut", label: "Cut", icon: <Scissors className="size-3.5" />, note: valid ? `${count}×` : undefined },
    { id: "details", label: "Details", icon: <FileText className="size-3.5" />, note: detailsIssue ? "!" : undefined },
    { id: "framing", label: "Framing", icon: <Crop className="size-3.5" />, note: preset?.label ?? "Custom" },
    { id: "text", label: "Text", icon: <Type className="size-3.5" />, note: boxes.length ? String(boxes.length) : undefined },
    { id: "voice", label: "Voice", icon: <Mic className="size-3.5" />, note: voice.pitch === 1 ? undefined : voiceName },
    { id: "extras", label: "Banners", icon: <PanelsTopLeft className="size-3.5" />, note: [chosen.top, chosen.bottom, reaction.file].filter(Boolean).length ? String([chosen.top, chosen.bottom, reaction.file].filter(Boolean).length) : undefined },
  ];

  return (
    <Dialog title={video.title} onClose={onClose} width="max-w-6xl">
      <p className="-mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-faint">
        <span>{formatDuration(video.durationSec)}</span>
        <span>·</span>
        <span>{formatBytes(video.fileSize)}</span>
        {local && (
          <>
            <span>·</span>
            <span>On this PC — not uploaded</span>
          </>
        )}
      </p>
      <form onSubmit={start} className="mt-4 grid gap-6 md:h-[min(680px,calc(100dvh-9rem))] md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
        {/* The preview stays put; only the panel on the right scrolls. */}
        <div className="flex flex-col items-center gap-3">
          <ShortPreview
            video={video}
            player={player}
            frame={frame}
            framing={framing}
            slotHeight={slotHeight}
            backdrop={look.backdrop}
            onMovePicture={(position) => changeLook(position)}
            top={chosen.top}
            bottom={chosen.bottom}
            aboveVideo={<ReactionStrip setup={reaction} position="top" />}
            belowVideo={<ReactionStrip setup={reaction} position="bottom" />}
            boxes={boxes}
            vars={vars}
            selectedBox={selectedBox}
            onSelectBox={selectBox}
            onChangeBox={changeBox}
            onPlaying={setPlaying}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (player.current?.paused ? void player.current.play().catch(() => undefined) : player.current?.pause())}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-3 text-[12.5px] font-medium text-muted transition hover:border-line-strong hover:text-text"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => (testing === "idle" ? void startTest() : stopTest())}
              className={cn("flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-medium transition", testing === "idle" ? "border-line text-muted hover:border-line-strong hover:text-text" : "border-accent/50 bg-accent-soft text-text")}
            >
              {testing === "loading" ? <LoaderCircle className="size-3.5 animate-spin" /> : testing === "playing" ? <Square className="size-3 fill-current" /> : <Volume2 className="size-3.5" />}
              {testing === "idle" ? `Hear voice · ${voiceName}` : testing === "loading" ? "Preparing…" : "Stop"}
            </button>
          </div>
          <p className="max-w-[300px] text-center text-[11.5px] leading-relaxed text-faint">Drag the video to move it. Click a text to edit it — drag it to move, drag its corners to resize.</p>
        </div>

        <div className="flex min-w-0 flex-col md:min-h-0">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface/60 p-1 [scrollbar-width:none]" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition", tab === t.id ? "bg-white/[0.08] text-text" : "text-muted hover:text-text")}
              >
                {t.icon}
                {t.label}
                {t.note && <span className={cn("rounded-full px-1.5 text-[10.5px] tabular-nums", tab === t.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-faint")}>{t.note}</span>}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-4 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-2 [scrollbar-width:thin]">
            {tab === "cut" && (
              <>
                <Section title="Length of each Short">
                  <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Short length">
                    {SHORT_LENGTH_PRESETS.map((p) => (
                      <button key={p} type="button" role="radio" aria-checked={seconds === p} onClick={() => setSeconds(p)} className={chip(seconds === p)}>
                        {p}s
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
                  <p className="mt-3 text-[12.5px] text-muted">
                    {valid ? (
                      <>
                        A {formatDuration(video.durationSec)} video makes <span className="font-semibold text-accent">{count} {count === 1 ? "Short" : "Shorts"}</span>: {describeLengths(segments)}.
                      </>
                    ) : (
                      <span className="text-danger">
                        Choose between {MIN_SHORT_SECONDS} and {MAX_SHORT_SECONDS} seconds.
                      </span>
                    )}
                  </p>
                </Section>
                {leftover > 0 && (
                  <Section title={`The last ${formatSeconds(leftover)} left over`}>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to do with the leftover seconds">
                      {TAILS.filter((o) => tailFits(o.mode)).map((o) => (
                        <button key={o.mode} type="button" role="radio" aria-checked={tail === o.mode} onClick={() => setTailChoice(o.mode)} className={chip(tail === o.mode)}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-[12.5px] text-muted">{TAILS.find((o) => o.mode === tail)?.hint}</p>
                  </Section>
                )}
              </>
            )}

            {tab === "details" && <DetailsPanel details={details} onChange={changeDetails} total={count} />}

            {tab === "framing" && (
              <>
                <Section
                  title="Framing"
                  aside={
                    <div className="flex gap-1.5" role="radiogroup" aria-label="Framing presets">
                      {PRESETS.map((p) => (
                        <button key={p.id} type="button" role="radio" aria-checked={preset?.id === p.id} onClick={() => changeLook(p.choice)} className={cn(chip(preset?.id === p.id), "h-8 px-3")}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <p className="mb-3 text-[12.5px] text-muted">{preset ? preset.hint : "Your own size and position."} Change it below, or drag the video in the preview.</p>
                  <div className="space-y-2.5">
                    <Slide label="Size" ends={["Small", "Big"]} min={sizeMin} max={sizeMax} step={0.005} value={zoom} onChange={setSize} readout={pct(zoom)} />
                    <Slide label="Up / down" ends={["Up", "Down"]} value={look.y} onChange={(y) => changeLook({ y: Math.abs(y - 0.5) < 0.02 ? 0.5 : y })} disabled={Math.abs(heightShare - 1) < 0.005} readout={pct(look.y)} />
                    <Slide label="Left / right" ends={["Left", "Right"]} value={look.x} onChange={(x) => changeLook({ x: Math.abs(x - 0.5) < 0.02 ? 0.5 : x })} disabled={Math.abs(zoom - 1) < 0.005} readout={pct(look.x)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => changeLook({ size: "whole" })} className={cn(chip(look.size === "whole"), "h-8 px-3")}>
                      Whole video
                    </button>
                    <button type="button" onClick={() => changeLook({ size: "fill" })} className={cn(chip(look.size === "fill"), "h-8 px-3")}>
                      Fill top to bottom
                    </button>
                    <button type="button" onClick={() => changeLook({ x: 0.5, y: 0.5 })} className={cn(chip(look.x === 0.5 && look.y === 0.5), "h-8 px-3")}>
                      Centre
                    </button>
                  </div>
                </Section>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Height filled", value: pct(Math.min(1, heightShare)) },
                    { label: "Empty above", value: ends ? pct(ends.above) : "0%" },
                    { label: "Empty below", value: ends ? pct(ends.below) : "0%" },
                    { label: "Sides cut off", value: pct(sidesCut) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-line bg-surface/40 px-3 py-2.5">
                      <p className="text-[11px] text-faint">{stat.label}</p>
                      <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {!covers && (
                  <Section title="Empty space">
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Empty space">
                      {(["black", "blur"] as const).map((b) => (
                        <button key={b} type="button" role="radio" aria-checked={look.backdrop === b} onClick={() => changeLook({ backdrop: b })} className={chip(look.backdrop === b)}>
                          {b === "black" ? "Black" : "Blurred video"}
                        </button>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            )}

            {tab === "text" && (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button type="button" size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => addBox("plain")}>
                    Text box
                  </Button>
                  <Button type="button" size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => addBox("part")}>
                    Part number
                  </Button>
                  <Button type="button" size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => addBox("title")}>
                    Video title
                  </Button>
                </div>
                {boxes.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">No text on the Shorts. Add a text box — it goes on every Short.</p>}
                {boxes.map((box, i) =>
                  box.id === selected?.id ? (
                    <TextBoxEditor
                      key={box.id}
                      box={box}
                      number={i + 1}
                      vars={vars}
                      onChange={(change) => changeBox(box.id, change)}
                      onCopy={() => {
                        const copy = { ...box, id: Math.random().toString(36).slice(2, 10), y: Math.min(1 - box.h, box.y + 0.05) };
                        changeBoxes((all) => [...all, copy]);
                        setSelectedBox(copy.id);
                      }}
                      onDelete={() => {
                        changeBoxes((all) => all.filter((b) => b.id !== box.id));
                        setSelectedBox(null);
                      }}
                    />
                  ) : (
                    <button key={box.id} type="button" onClick={() => setSelectedBox(box.id)} className="flex items-center gap-3 rounded-xl border border-line bg-surface/40 px-4 py-3 text-left transition hover:border-line-strong">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[12px] font-semibold text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px]">{box.text || <span className="text-faint">Empty</span>}</span>
                      <Pencil className="size-3.5 text-faint" />
                    </button>
                  ),
                )}
                <p className="text-[12px] leading-relaxed text-faint">
                  Every text box goes on every Short. <code className="text-muted">{"{n}"}</code> becomes the part number, <code className="text-muted">{"{total}"}</code> the number of parts and <code className="text-muted">{"{title}"}</code> the video&apos;s title. Long text wraps inside the box and gets smaller to fit.
                </p>
              </>
            )}

            {tab === "voice" && (
              <>
                <Section title="Voice" aside={<span className="font-mono text-[12px] text-muted">{pitchLabel(voice.pitch)}</span>}>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Voice">
                    {VOICE_PRESETS.map((p) => (
                      <button key={p.id} type="button" role="radio" aria-checked={voice.preset === p.id && voice.pitch === p.pitch} onClick={() => changeVoice({ preset: p.id, pitch: p.pitch })} className={chip(voice.preset === p.id && voice.pitch === p.pitch)}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12.5px] text-muted">{voicePreset?.hint ?? "Your own setting."}</p>
                  <div className="mt-4">
                    <Slide
                      label="Pitch"
                      ends={["Deeper", "Higher"]}
                      min={VOICE_PITCH_MIN}
                      max={VOICE_PITCH_MAX}
                      step={0.01}
                      value={voice.pitch}
                      onChange={(value) => changeVoice({ preset: VOICE_PRESETS.find((p) => p.pitch === value)?.id ?? "custom", pitch: value })}
                      readout={pitchLabel(voice.pitch)}
                    />
                  </div>
                </Section>
                <Section title="Test it on the video">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    Plays 15 seconds from where the preview is, with this voice, at normal speed — the same change the Shorts get. Move the preview to another moment to hear a different part.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" icon={testing === "loading" ? <LoaderCircle className="size-3.5 animate-spin" /> : testing === "playing" ? <Square className="size-3 fill-current" /> : <Volume2 className="size-3.5" />} onClick={() => (testing === "idle" ? void startTest() : stopTest())}>
                      {testing === "idle" ? `Hear ${voiceName.toLowerCase()} voice` : testing === "loading" ? "Preparing…" : "Stop"}
                    </Button>
                    {voice.pitch !== 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => changeVoice({ preset: "original", pitch: 1 })}>
                        Back to original
                      </Button>
                    )}
                  </div>
                  {testError && <p className="mt-2 text-[12.5px] text-danger">{testError}</p>}
                </Section>
              </>
            )}

            {tab === "extras" && (
              <>
                {BANNER_POSITIONS.map((position) => (
                  <div key={position} className="rounded-xl border border-line bg-surface/40 p-4">
                    <BannerPicker position={position} banners={banners} selected={picked[position]} onSelect={(id) => setPicked((current) => ({ ...current, [position]: id }))} />
                  </div>
                ))}
                <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/40 p-4">
                  <ReactionPicker setup={reaction} where="every Short" />
                </div>
              </>
            )}

            {canCut && !progress && <HelperNotice />}
          </div>

          <div className="mt-4 space-y-3 border-t border-line pt-4">
            {progress && (
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
            {detailsIssue && !progress && (
              <p className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-[13px] text-warning">
                {detailsIssue}{" "}
                <button type="button" onClick={() => setTab("details")} className="font-medium underline">
                  Open Details
                </button>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="ghost" size="sm" icon={<Pencil className="size-3.5" />} disabled={busy} onClick={onRename}>
                Rename
              </Button>
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 className="size-3.5" />} disabled={busy} onClick={onDelete} className="hover:text-danger">
                {local ? "Remove" : "Delete"}
              </Button>
              <p className="ml-auto hidden text-right text-[12px] leading-tight text-faint lg:block">
                {!canCut ? "This video's file isn't available." : `${count} Shorts · “${shorten(partDetails(details, 1, Math.max(1, count)).title, 38)}” · ${voiceName} voice`}
              </p>
              <Button type="submit" icon={<Scissors className="size-4" />} loading={busy} disabled={!valid || count === 0 || !canCut || reaction.noRoom || reaction.unreadable || Boolean(detailsIssue)}>
                Generate {count > 0 ? count : ""} Shorts
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Everything about one text box: its words, letters, colours and how it sits. */
function TextBoxEditor({ box, number, vars, onChange, onCopy, onDelete }: { box: TextBox; number: number; vars: TextVars; onChange: (change: Partial<TextBox>) => void; onCopy: () => void; onDelete: () => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? box.text.length;
    const end = el?.selectionEnd ?? at;
    onChange({ text: box.text.slice(0, at) + token + box.text.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  const sample = box.text.replaceAll("{n}", String(vars.n)).replaceAll("{total}", String(vars.total)).replaceAll("{title}", vars.title);

  return (
    <section className="rounded-xl border border-accent/40 bg-accent-soft/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-accent/20 text-[12px] font-semibold text-accent">{number}</span>
        <h3 className="flex-1 text-[13px] font-semibold">Text box {number}</h3>
        <button type="button" onClick={onCopy} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-text" aria-label="Duplicate text box" title="Duplicate">
          <Copy className="size-3.5" />
        </button>
        <button type="button" onClick={onDelete} className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger" aria-label="Delete text box" title="Delete">
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <textarea
        ref={area}
        autoFocus
        rows={2}
        value={box.text}
        maxLength={300}
        onChange={(e) => onChange({ text: e.target.value })}
        aria-label="Text"
        placeholder="Type the text for every Short"
        className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2 text-[14px] leading-snug text-text outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)]"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-faint">
        <span>Insert</span>
        {["{n}", "{total}", "{title}"].map((token) => (
          <button key={token} type="button" onClick={() => insert(token)} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-muted transition hover:border-line-strong hover:text-text">
            {token}
          </button>
        ))}
        {sample !== box.text && <span className="ml-auto truncate">Short 1: {sample}</span>}
      </div>

      <div className="mt-4 space-y-2.5">
        <Slide label="Letter size" min={24} max={160} step={1} value={box.size} onChange={(size) => onChange({ size })} readout={String(box.size)} />
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
          <span>Font</span>
          <div className="flex flex-wrap gap-1.5">
            {TEXT_FONTS.map((f) => (
              <button key={f.id} type="button" onClick={() => onChange({ font: f.id })} className={cn(chip(box.font === f.id), "h-8 px-3")} style={{ fontFamily: f.family, fontWeight: f.weight }}>
                {f.label} தமிழ்
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
          <span>Colour</span>
          <Swatches value={box.color} onChange={(color) => onChange({ color })} label="Text colour" />
        </div>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
          <span>Align</span>
          <div className="flex gap-1.5">
            {(
              [
                ["left", <TextAlignStart key="l" className="size-4" />],
                ["center", <TextAlignCenter key="c" className="size-4" />],
                ["right", <TextAlignEnd key="r" className="size-4" />],
              ] as const
            ).map(([align, icon]) => (
              <button key={align} type="button" aria-label={`Align ${align}`} onClick={() => onChange({ align })} className={cn(chip(box.align === align), "grid h-8 w-10 place-items-center px-0")}>
                {icon}
              </button>
            ))}
            <button type="button" onClick={() => onChange({ outline: !box.outline })} className={cn(chip(box.outline), "h-8 px-3")}>
              Outline
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
          <span>Background</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => onChange({ background: "none" })} className={cn(chip(box.background === "none"), "h-8 px-3")}>
              None
            </button>
            <button type="button" onClick={() => onChange({ background: "box" })} className={cn(chip(box.background === "box"), "h-8 px-3")}>
              Box
            </button>
          </div>
        </div>
        {box.background === "box" && (
          <>
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
              <span>Box colour</span>
              <Swatches value={box.backgroundColor} onChange={(backgroundColor) => onChange({ backgroundColor })} label="Box colour" />
            </div>
            <Slide label="See-through" min={0.1} max={1} step={0.05} value={box.backgroundOpacity} onChange={(backgroundOpacity) => onChange({ backgroundOpacity })} readout={pct(box.backgroundOpacity)} />
          </>
        )}
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 text-[12.5px] text-muted">
          <span>Place</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange({ x: 0.5 - box.w / 2 })} className={cn(chip(false), "h-8 px-3")}>
              Centre across
            </button>
            <button type="button" onClick={() => onChange({ x: 0.04, w: 0.92 })} className={cn(chip(false), "h-8 px-3")}>
              Full width
            </button>
            <button type="button" onClick={() => onChange({ y: 0.04 })} className={cn(chip(false), "h-8 px-3")}>
              Top
            </button>
            <button type="button" onClick={() => onChange({ y: 0.96 - box.h })} className={cn(chip(false), "h-8 px-3")}>
              Bottom
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
