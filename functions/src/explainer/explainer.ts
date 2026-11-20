import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { clamp01, easeInOut, easeOut, easeOutBack, INK, talkEnvelope } from "../auto/cartoon";
import { brightMusic, calmMusic, lofiMusic, nightMusic, pulseMusic } from "../auto/music";
import { loadFonts, run } from "../auto/render";
import { sfxTrack, type SfxEvent } from "../auto/sfx";

/**
 * Ulagam Ippo: a Tamil explainer, 16:9. One narrator, the channel's host (a
 * cartoon boy from a single PNG): big on screen at the start and end, in the
 * bottom-right corner in between, acting out what he says, while pictures,
 * numbers, cards and buttons about the story fill the screen behind him.
 * Drawn in 1920×1080 units.
 */

/** The picture's shape, and where the host, text and subtitles go in it. Drawn in these units. */
export interface Frame {
  w: number;
  h: number;
  /** Where the host stands: big (intro, outro) and in the corner. */
  host: { big: { x: number; feet: number; h: number }; corner: { x: number; feet: number; h: number } };
  /** Centre of the text and cards: x with the host big, x with him in the corner; and y. */
  areaX: [number, number];
  overlayY: number;
  /** Cards and titles are sized for the wide frame; a narrow one draws them smaller. */
  overlayScale: number;
  /** The subtitle's last row, its widths (host big, in the corner) and size. */
  subY: number;
  subW: [number, number];
  subSize: number;
  /** Where the darkening for the subtitles begins. */
  shadeFrom: number;
  chapterY: number;
  /** Where a portrait photo is framed. */
  photo: { x: number; y: number; maxW: number; maxH: number };
  badgeY: number;
  /** The handle in the top-right corner, or none (Shorts show the channel themselves). */
  handleY: number | null;
  progress: boolean;
  /** A label at the top, e.g. the Short's part number. */
  tag?: string;
  /** A small line above the tag, e.g. the alcohol health warning on every Short. */
  note?: string;
}

/** The full video, 16:9. */
export const WIDE: Frame = {
  w: 1920,
  h: 1080,
  host: { big: { x: 430, feet: 1130, h: 1000 }, corner: { x: 1725, feet: 1095, h: 540 } },
  areaX: [1320, 840],
  overlayY: 430,
  overlayScale: 1,
  subY: 1018,
  subW: [1150, 1380],
  subSize: 52,
  shadeFrom: 760,
  chapterY: 470,
  photo: { x: 560, y: 470, maxW: 900, maxH: 760 },
  badgeY: 40,
  handleY: 34,
  progress: true,
};

/** A Short, 9:16: text in the upper half, subtitles above the host, his legs under YouTube's buttons. */
export const TALL: Frame = {
  w: 1080,
  h: 1920,
  host: { big: { x: 540, feet: 2000, h: 1000 }, corner: { x: 790, feet: 1990, h: 760 } },
  areaX: [540, 540],
  overlayY: 560,
  overlayScale: 0.82,
  subY: 930,
  subW: [900, 900],
  subSize: 56,
  shadeFrom: 600,
  chapterY: 600,
  photo: { x: 540, y: 560, maxW: 900, maxH: 760 },
  badgeY: 250,
  handleY: null,
  progress: false,
};

/** The frame being drawn; set by framePainter. */
let F: Frame = WIDE;
/** The video being painted asked for the clean look. */
let CLEAN = false;
/** The video being painted asked for the story look. */
let STORY = false;
/** The video being painted asked for the pulse look. */
let PULSE = false;
/** The feed look: the pulse look's drawing, in the feed's colours and moves. */
let FEED = false;
/** The night look: the pulse look's drawing under a starry sky, with the story's clock. */
let NIGHT = false;
/** The paper look: the pulse look's drawing on a light notebook page. */
let PAPER = false;
const FPS = 30;
const RATE = 24_000;
export const HANDLE = "@ulagamippo";

/**
 * The host's voice — the same in every video (the user's choice, 2026-10-31):
 * Gemini's Leda told to be an 8-year-old boy, then played 1.12× (sample "C").
 */
export const HOST_VOICE = {
  narrator: "Leda",
  style: "Speak as a cheerful, cute 8-year-old Tamil boy telling a story to his friends: small, light, bright child's voice, innocent and excited, natural and warm, clear Tamil pronunciation, a short pause after every sentence.",
  voiceRate: 1.12,
};

/** youtube-for-me/Channels/Ulagam Ippo — the bundled script runs from functions/.local. */
export const CHANNEL_DIR = resolve(__dirname, "..", "..", "Channels", "Ulagam Ippo");
export const videoDir = (v: ExVideo) => join(CHANNEL_DIR, "Videos", v.slug);

export type Overlay =
  /** Big words in the middle, word by word. */
  | { kind: "title"; text: string; small?: string }
  /** A number counting up to `value`; `ruler` grows a measuring bar beside it. */
  | { kind: "year"; value: number; prefix?: string; suffix?: string; label?: string; ruler?: boolean }
  /** A card the cursor clicks open. */
  | { kind: "card"; text: string; small?: string; icon?: string }
  /** Pills popping in one by one. */
  | { kind: "list"; items: string[] }
  /** Like / subscribe / bell… buttons, clicked one after another by the cursor. */
  | { kind: "cta"; buttons: Array<"like" | "subscribe" | "bell" | "share" | "comment">; text?: string }
  /** A map pin dropping in, with its place. */
  | { kind: "pin"; text: string; small?: string }
  /** One word turning into another. */
  | { kind: "morph"; from: string; to: string }
  /** Words slamming down like a rubber stamp. */
  | { kind: "stamp"; text: string; small?: string }
  /** Typed out letter by letter. */
  | { kind: "type"; text: string }
  /** A ship sailing a dotted line from one place to another, its cargo behind it. */
  | { kind: "route"; from: string; to: string; icons?: string[] }
  /** The time machine: spinning rings and streaks. */
  | { kind: "warp"; text: string }
  /** A comment being typed. */
  | { kind: "comment"; text: string }
  /** Steps joined by arrows, appearing one after another (pulse look). */
  | { kind: "flow"; items: string[] }
  /** A gauge sliding from `from` to `to` (0–1), going red as it drops (pulse look). */
  | { kind: "meter"; label: string; from: number; to: number; small?: string }
  /** A health warning card (pulse look). */
  | { kind: "warning"; text: string; small?: string }
  /**
   * Where a word came from (pulse looks): the Tamil word on a cream index card, an arrow
   * drawing across (with `via`, the stop on the way, e.g. "manga · போர்த்துகீசு"), then the
   * English word flipping in at `at` (0–1 of the line; default as a morph). `small` sits under it.
   */
  | { kind: "word"; ta: string; en: string; via?: string; small?: string; at?: number; label?: [string, string] };

/** What the host does while he says a line. */
export type Action =
  | "wave" | "jump" | "excited" | "celebrate" | "clap" | "point" | "point-down" | "please" | "think" | "surprised"
  | "proud" | "thumbs" | "salute" | "sad" | "whisper" | "crown" | "dance" | "roar" | "shrug" | "scared" | "look-up"
  | "fist" | "idea" | "eat" | "share" | "read" | "chisel" | "count" | "nod";

export interface ExLine {
  n: number;
  /** The Gemini recording this line is in. */
  take: string;
  /** Key into the video's images; several are shown one after another across the line. */
  visual: string | string[];
  /** What the narrator says. */
  tamil: string;
  /** The subtitle when it differs from what is said, e.g. years in digits. */
  sub?: string;
  overlay?: Overlay;
  action?: Action;
  fx?: "confetti" | "hearts" | "sparkles";
  /** Where the host stands from this line on. */
  host?: "big" | "corner";
  /** Starts a chapter with this name. */
  chapter?: string;
  /** The night look: the story's clock at this chapter, e.g. { time: "02:00", label: "நடு ராத்திரி" }; "HH:MM" times fast-forward from the last one. */
  clock?: { time: string; label: string };
}

export interface ExVideo {
  slug: string;
  title: string;
  lines: ExLine[];
  images: Record<string, { q: string; file?: string }>;
  /** Gemini voice. */
  narrator: string;
  /** Director's note sent before the narration, so Gemini knows how to speak it. */
  style: string;
  /** The voice played this much faster, which raises it too: 1.12 makes a grown voice a boy's. */
  voiceRate?: number;
  /** Lines recorded with the rest but not in the full video, e.g. each Short's closing line (n = 9000 + part). */
  extraLines?: ExLine[];
  /** A calm look (the user's ask for news videos): no emoji props around the host, no shaking on a stamp. */
  clean?: boolean;
  /** thumbnail.jpg: the picture behind it and its lines of big text (size in px at 1080p). */
  thumb?: { visual: string; lines: Array<{ text: string; size: number; fill: string }> };
  /**
   * "story" (from video 03, the user's ask: new fonts, a different, smooth look):
   * serif Tamil headings, glass panels with gold edges, fades and slides instead
   * of bouncy pops, no ink outlines, a warm vignette, a drawn ship on routes.
   * Implies the clean look. Same host, same voice.
   */
  /**
   * "pulse" (from video 07, the user's ask: a different, eye-catching look, 5+ min):
   * the picture in a rounded screen on a dark moving backdrop, pictures sliding in,
   * solid teal/coral chips, colour-wipe chapter cards, word-by-word subtitles.
   * Implies the clean look. Same host, same voice.
   * "feed" (video 08 on): the pulse look made into a phone feed — lime, pink and
   * violet on a deep night blue, pictures swiping up, chapters dropping in as a
   * notification, lists stacking up like notifications.
   * "night" (video 09 on): the pulse look at night — moon gold and indigo on a
   * starry midnight sky, a crescent moon, pictures dissolving into each other, and
   * a glowing digital clock that fast-forwards to each chapter's time (`clock`).
   */
  /**
   * "paper" (video 10 on, the user's ask 2026-11-20: a new design every video): the
   * first light look — a cream notebook page with ruled lines and a red margin, faint
   * Tamil and English letters drifting, the picture a taped photo that flips over to
   * the next one, chapters as a new notebook page sliding up with the name highlighted,
   * and the `word` overlay for where a word came from.
   */
  look?: "story" | "pulse" | "feed" | "night" | "paper";
  /** The music bed: "calm" (default), "pulse" (a light beat), "lofi" (slow, warm keys and a lazy beat), "night" (music box over soft pads, a clock's tick) or "bright" (marimba, plucked bass, shaker: light and curious). */
  music?: "calm" | "pulse" | "lofi" | "night" | "bright";
  /** A Short of its own (9:16, 1080×1920), not a long video cut into parts. */
  tall?: boolean;
  /** A "Top N" video: chapter cards count down (big 3, 2, 1) instead of "அத்தியாயம் N". */
  countdown?: boolean;
  /** Seconds of chapter card before a chapter's first line (default 2.2). */
  chapterGap?: number;
}

export interface Timed extends ExLine {
  start: number;
  end: number;
  chapterNo?: number;
}

export interface Built {
  video: ExVideo;
  lines: Timed[];
  /** 24 kHz mono 16-bit PCM of the whole narration, in place. */
  voice: Buffer;
  sfx: SfxEvent[];
  duration: number;
  /** Chapter starts, for YouTube. */
  chapters: Array<{ at: number; name: string }>;
}

const LEAD_IN = 0.8;
const GAP = 0.35;
const CHAPTER_GAP = 2.2;
const CHAPTER_GAP_DEFAULT = CHAPTER_GAP;
const TAIL = 2.0;

/** `pcm` played `rate` times faster: higher and quicker, with no stretching (so no echo or stutter). */
function speedUp(pcm: Buffer, rate: number): Buffer {
  const n = pcm.length / 2;
  const m = Math.floor(n / rate);
  const out = Buffer.alloc(m * 2);
  for (let i = 0; i < m; i++) {
    const x = i * rate;
    const k = Math.floor(x);
    const a = pcm.readInt16LE(k * 2);
    const b = k + 1 < n ? pcm.readInt16LE((k + 1) * 2) : a;
    out.writeInt16LE(Math.round(a + (b - a) * (x - k)), i * 2);
  }
  return out;
}

/** The voice of each line (keyed by line number), as cut from its take; silence where missing. */
export function voicePieces(v: ExVideo): Record<number, Buffer> {
  const dir = join(videoDir(v), "voice");
  const file = join(dir, "splits.json");
  if (!existsSync(file)) return {};
  const splits = JSON.parse(readFileSync(file, "utf8")) as Record<string, Array<{ n: number; from: number; to: number }>>;
  const out: Record<number, Buffer> = {};
  for (const [take, parts] of Object.entries(splits)) {
    const pcm = readFileSync(join(dir, `${take}.pcm`));
    for (const { n, from, to } of parts) out[n] = v.voiceRate ? speedUp(pcm.subarray(from, to), v.voiceRate) : pcm.subarray(from, to);
  }
  return out;
}

const YEAR_COUNT = 1.3;
const CLICK_AT = 0.55;
const STAMP_HIT = 0.25;

/** When each item of a list overlay pops in. */
function listTimes(l: Timed): number[] {
  if (l.overlay?.kind !== "list" && l.overlay?.kind !== "flow") return [];
  const count = l.overlay.items.length;
  const step = Math.max(0.35, Math.min(0.9, ((l.end - l.start) * 0.6) / count));
  return l.overlay.items.map((_, i) => l.start + 0.25 + i * step);
}

/** When the cursor clicks each button of a call to action. */
function ctaClicks(l: Timed): number[] {
  if (l.overlay?.kind !== "cta") return [];
  const n = l.overlay.buttons.length;
  const step = Math.max(0.5, Math.min(1.0, (l.end - l.start - 1.0) / n));
  return l.overlay.buttons.map((_, i) => l.start + 0.8 + i * step);
}

const morphAt = (l: Timed) => l.start + Math.max(0.8, (l.end - l.start) * 0.4);
/** When a word overlay's English word flips in. */
const wordAt = (l: Timed) => {
  const at = l.overlay?.kind === "word" ? l.overlay.at : undefined;
  return at === undefined ? morphAt(l) : l.start + Math.max(0.8, (l.end - l.start) * at);
};

export function build(video: ExVideo, voices: Record<number, Buffer>): Built {
  const lines: Timed[] = [];
  const sfx: SfxEvent[] = [];
  const chapters: Built["chapters"] = [{ at: 0, name: "அறிமுகம்" }];
  // A Short of its own starts talking at once and ends quickly.
  let t = video.tall ? 0.3 : LEAD_IN;
  let chapterNo = 0;
  const CG = video.chapterGap ?? CHAPTER_GAP;
  video.lines.forEach((line, i) => {
    if (line.chapter) {
      t += CG;
      chapterNo++;
      chapters.push({ at: t - CG, name: line.chapter });
      sfx.push({ at: t - CG + 0.05, kind: video.countdown ? "thud" : "whoosh" });
    }
    // Without a recording yet, about 0.075 s a letter.
    const length = voices[line.n] ? voices[line.n].length / (RATE * 2) : line.tamil.length * 0.075;
    lines.push({ ...line, start: t, end: t + length, chapterNo: line.chapter ? chapterNo : undefined });
    const next = video.lines[i + 1];
    t += length + (next && next.take !== line.take ? GAP + 0.2 : GAP);
  });
  const duration = t + (video.tall ? 1.3 : TAIL);

  const voice = Buffer.alloc(Math.ceil(duration * RATE) * 2);
  for (const l of lines) voices[l.n]?.copy(voice, Math.round(l.start * RATE) * 2);

  let lastHost: "big" | "corner" = "big";
  for (const l of lines) {
    if (l.host && l.host !== lastHost) {
      sfx.push({ at: l.start, kind: "whoosh" });
      lastHost = l.host;
    }
    const s = l.start;
    if (l.action === "clap") sfx.push({ at: s + 0.2, kind: "pop" }, { at: s + 0.45, kind: "pop" }, { at: s + 0.7, kind: "pop" });
    if (l.action === "idea" || l.action === "crown") sfx.push({ at: s + 0.3, kind: "ding" });
    if (l.action === "roar") sfx.push({ at: s + 0.2, kind: "thud" });
    if (l.action === "chisel") [0.3, 0.6, 0.9, 1.2].forEach((d) => sfx.push({ at: s + d, kind: "tick" }));
    if (l.fx === "confetti") sfx.push({ at: s + 0.1, kind: "pop" }, { at: s + 0.25, kind: "pop" });
    const o = l.overlay;
    if (!o) continue;
    if (o.kind === "title") sfx.push({ at: s + 0.15, kind: "whoosh" });
    if (o.kind === "year") sfx.push({ at: s + 0.15 + YEAR_COUNT, kind: "ding" });
    if (o.kind === "card") sfx.push({ at: s + CLICK_AT, kind: "tick" }, { at: s + CLICK_AT + 0.05, kind: "pop" });
    if (o.kind === "list") listTimes(l).forEach((at) => sfx.push({ at, kind: "pop" }));
    if (o.kind === "cta") ctaClicks(l).forEach((at) => sfx.push({ at, kind: "tick" }, { at: at + 0.05, kind: "pop" }));
    if (o.kind === "pin") sfx.push({ at: s + 0.45, kind: "pop" });
    if (o.kind === "morph") sfx.push({ at: morphAt(l), kind: "whoosh" });
    if (o.kind === "stamp") sfx.push({ at: s + STAMP_HIT, kind: "thud" });
    if (o.kind === "type") for (let k = 0; k < 6; k++) sfx.push({ at: s + 0.15 + k * 0.18, kind: "tick" });
    if (o.kind === "route") sfx.push({ at: s + 0.3, kind: "whoosh" });
    if (o.kind === "warp") sfx.push({ at: s + 0.05, kind: "whoosh" }, { at: s + 0.9, kind: "whoosh" });
    if (o.kind === "comment") sfx.push({ at: l.end - 0.4, kind: "pop" });
    if (o.kind === "flow") listTimes(l).forEach((at) => sfx.push({ at, kind: "whoosh" }));
    if (o.kind === "meter") sfx.push({ at: s + 0.2, kind: "whoosh" });
    if (o.kind === "warning") sfx.push({ at: s + 0.2, kind: "thud" });
    if (o.kind === "word") sfx.push({ at: s + 0.1, kind: "pop" }, { at: wordAt(l), kind: "whoosh" });
  }
  return { video, lines, voice, sfx, duration, chapters };
}

// ─── Fonts ────────────────────────────────────────────────────────────────────

const TB = `"Tamil Bold", "ShortFlow Bold", "ShortFlow Emoji"`;
const TS = `"Tamil Semi", "ShortFlow Semi", "ShortFlow Emoji"`;
const EMOJI = `"ShortFlow Emoji"`;
let tamilFonts = false;
function loadTamilFonts() {
  loadFonts();
  if (tamilFonts) return;
  const dir = [join(__dirname, "..", "assets", "fonts"), join(process.cwd(), "assets", "fonts")].find((d) => existsSync(d))!;
  GlobalFonts.registerFromPath(join(dir, "MuktaMalar-ExtraBold.ttf"), "Tamil Bold");
  GlobalFonts.registerFromPath(join(dir, "MuktaMalar-Bold.ttf"), "Tamil Semi");
  // The story look's faces.
  GlobalFonts.registerFromPath(join(dir, "NotoSerifTamil-ExtraBold.ttf"), "Story Head");
  GlobalFonts.registerFromPath(join(dir, "HindMadurai-Bold.ttf"), "Story Bold");
  GlobalFonts.registerFromPath(join(dir, "HindMadurai-SemiBold.ttf"), "Story Semi");
  tamilFonts = true;
}

const segmenter = new Intl.Segmenter("ta", { granularity: "grapheme" });
/** Letters as a reader sees them: a Tamil consonant with its vowel sign is one. */
const graphemes = (s: string) => [...segmenter.segment(s)].map((g) => g.segment);

/** A repeatable random number in [0, 1) for `i`. */
const hash = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ─── Pictures ─────────────────────────────────────────────────────────────────

interface Picture {
  img: Image;
  /** A tiny copy, drawn large: a free blur for the backdrop behind portraits. */
  blur: Canvas;
  portrait: boolean;
}

async function loadPictures(v: ExVideo): Promise<Record<string, Picture>> {
  const out: Record<string, Picture> = {};
  for (const key of Object.keys(v.images)) {
    const file = join(videoDir(v), "images", `${key}.jpg`);
    if (!existsSync(file)) continue;
    const img = await loadImage(file);
    const blur = createCanvas(48, 27);
    const b = blur.getContext("2d");
    const s = Math.max(48 / img.width, 27 / img.height);
    b.drawImage(img, (48 - img.width * s) / 2, (27 - img.height * s) / 2, img.width * s, img.height * s);
    out[key] = { img, blur, portrait: img.width / img.height < 1.25 };
  }
  return out;
}

/** The picture behind a stretch of time, slowly moving (Ken Burns), `p` from 0 to 1 across it. */
function drawPicture(ctx: SKRSContext2D, pic: Picture | undefined, key: string, p: number, index: number) {
  if (!pic) {
    // A picture still missing: a calm gradient with its name, so the gap is obvious in a check.
    const g = ctx.createLinearGradient(0, 0, F.w, F.h);
    g.addColorStop(0, "#1d2b53");
    g.addColorStop(1, "#7e2553");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, F.w, F.h);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = `60px ${TS}`;
    ctx.textAlign = "center";
    ctx.fillText(key, F.w / 2, 200);
    return;
  }
  const { img } = pic;
  if (!pic.portrait) {
    const zoom = 1.04 + (STORY ? 0.07 : 0.1) * (index % 2 ? p : 1 - p);
    const s = Math.max(F.w / img.width, F.h / img.height) * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const dir = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
    const x = (F.w - w) / 2 + dir * (w - F.w) * 0.4 * (p - 0.5);
    const y = (F.h - h) / 2 - (index % 2 ? 1 : -1) * (h - F.h) * 0.3 * (p - 0.5);
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  // A portrait: blurred behind, the picture itself framed like a photo on the table.
  const bs = Math.max(F.w / 48, F.h / 27) * 1.1;
  ctx.drawImage(pic.blur, (F.w - 48 * bs) / 2, (F.h - 27 * bs) / 2, 48 * bs, 27 * bs);
  ctx.fillStyle = "rgba(10,12,30,0.35)";
  ctx.fillRect(0, 0, F.w, F.h);
  const s = Math.min(F.photo.maxH / img.height, F.photo.maxW / img.width) * (1 + 0.05 * p);
  const w = img.width * s;
  const h = img.height * s;
  ctx.save();
  ctx.translate(F.photo.x, F.photo.y);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 40;
  if (STORY) {
    // Straight, with a thin gold edge, like a museum print.
    ctx.fillStyle = "rgba(9,16,36,0.9)";
    ctx.fillRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20);
    ctx.shadowBlur = 0;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(232,183,90,0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20);
    ctx.restore();
    return;
  }
  ctx.rotate(-0.025 + 0.01 * p);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 32);
  ctx.shadowBlur = 0;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// ─── The host ─────────────────────────────────────────────────────────────────

/** Where things are on the host PNG (980×980): his feet, mouth, eyes, head and hands. */
const HOST = {
  centreX: 500,
  feetY: 897,
  bodyH: 831,
  mouth: { x: 457, y: 399 },
  eyes: [
    { x: 388, y: 318, rx: 39, ry: 45 },
    { x: 540, y: 301, rx: 49, ry: 46 },
  ],
  head: { x: 480, y: 270 },
};

interface Host {
  img: Image;
  mouthSkin: string;
  lidSkin: string[];
}

async function loadHost(): Promise<Host> {
  const img = await loadImage(join(CHANNEL_DIR, "host", "host.png"));
  const c = createCanvas(img.width, img.height);
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const at = (px: number, py: number) => {
    const d = x.getImageData(px - 2, py - 2, 5, 5).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) [r, g, b] = [r + d[i], g + d[i + 1], b + d[i + 2]];
    const n = d.length / 4;
    return `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
  };
  return { img, mouthSkin: at(HOST.mouth.x, HOST.mouth.y - 14), lidSkin: [at(388, 372), at(548, 360)] };
}

/** How big and where: `big` is the intro and outro, `corner` the rest. */
function hostPlace(mode: number) {
  const { big, corner } = F.host;
  const m = easeInOut(mode);
  return { x: big.x + (corner.x - big.x) * m, feet: big.feet + (corner.feet - big.feet) * m, h: big.h + (corner.h - big.h) * m };
}

interface Prop {
  e: string;
  x: number;
  y: number;
  size: number;
  rot?: number;
  alpha?: number;
  /** In a white thought bubble. */
  bubble?: boolean;
}

interface Pose {
  dy: number;
  rot: number;
  scale: number;
  shake: number;
  props: Prop[];
}

/**
 * The host's body and the emoji props around him for an action, `la` seconds
 * into a line `dur` long; in the PNG's pixels. `left` when the screen's content
 * is to his left (he points that way).
 */
function pose(action: Action, la: number, dur: number, t: number, left: boolean): Pose {
  const p: Pose = { dy: 0, rot: 0, scale: 1, shake: 0, props: [] };
  const on = Math.min(clamp01(la / 0.25), clamp01((dur + 0.3 - la) / 0.35));
  const pop = easeOutBack(la / 0.35) * on;
  const hop = (count: number, height: number) => {
    if (la < count * 0.45) p.dy = -Math.abs(Math.sin((la / 0.45) * Math.PI)) * height;
  };
  const side = 760;
  switch (action) {
    case "wave":
      p.rot = 0.03 * Math.sin(t * 5);
      p.props.push({ e: "👋", x: 740, y: 380, size: 170 * pop, rot: 0.5 * Math.sin(t * 11) });
      break;
    case "jump":
      hop(2, 110);
      break;
    case "excited":
      hop(3, 130);
      for (let k = 0; k < 3; k++) {
        const a = t * 2.5 + (k * Math.PI * 2) / 3;
        p.props.push({ e: "⭐", x: HOST.head.x + Math.cos(a) * 300, y: HOST.head.y - 40 + Math.sin(a) * 120, size: 90 * on });
      }
      break;
    case "celebrate":
      hop(2, 120);
      p.props.push({ e: "🎉", x: 180, y: 260, size: 150 * pop, rot: -0.3 }, { e: "🎉", x: 780, y: 260, size: 150 * pop, rot: 0.3 });
      break;
    case "clap":
      p.props.push({ e: "👏", x: 500, y: 620, size: (140 + 40 * Math.abs(Math.sin(la * 13))) * on });
      break;
    case "point":
      p.rot = left ? -0.03 : 0.03;
      p.props.push({ e: left ? "👈" : "👉", x: side + (left ? -1 : 1) * 25 * Math.sin(t * 8), y: 560, size: 170 * pop });
      break;
    case "point-down":
      p.props.push({ e: "👇", x: 740, y: 600 + 30 * Math.sin(t * 8), size: 170 * pop });
      break;
    case "please":
      p.rot = 0.06 * on;
      p.props.push({ e: "🙏", x: 500, y: 620, size: 170 * pop });
      for (let k = 0; k < 3; k++) {
        const r = (la * 0.8 + k / 3) % 1;
        p.props.push({ e: "❤️", x: 300 + k * 200, y: 120 - r * 260, size: 80, alpha: on * (1 - r) });
      }
      break;
    case "think":
      p.rot = 0.07 * on;
      p.props.push({ e: "❓", x: 760, y: 60, size: 120 * pop, bubble: true });
      break;
    case "surprised":
      p.scale = 1 + 0.08 * clamp01(1 - la / 0.4) * on;
      p.props.push({ e: "‼️", x: 700, y: 20 + 8 * Math.sin(t * 30), size: 130 * pop });
      break;
    case "proud":
      p.scale = 1 + 0.04 * on;
      for (let k = 0; k < 3; k++) p.props.push({ e: "✨", x: [220, 760, 480][k], y: [160, 140, -40][k], size: (70 + 30 * Math.abs(Math.sin(t * 4 + k))) * on });
      break;
    case "thumbs":
      p.props.push({ e: "👍", x: 740, y: 560, size: 180 * pop, rot: -0.1 + 0.1 * Math.sin(t * 6) });
      break;
    case "salute":
      p.rot = -0.03 * on;
      p.props.push({ e: "🫡", x: 760, y: 120, size: 120 * pop, bubble: true });
      break;
    case "sad": {
      p.rot = 0.04 * on;
      p.scale = 1 - 0.02 * on;
      const r = (la * 0.9) % 1;
      p.props.push({ e: "💧", x: 380, y: 380 + r * 260, size: 60, alpha: on * (1 - r) }, { e: "😢", x: 760, y: 80, size: 110 * pop, bubble: true });
      break;
    }
    case "whisper":
      p.scale = 1 + 0.12 * on;
      p.props.push({ e: "🤫", x: 770, y: 90, size: 110 * pop, bubble: true });
      break;
    case "crown":
      p.props.push({ e: "👑", x: 470, y: 70 - 400 * (1 - easeOutBack(la / 0.5)), size: 170, alpha: on });
      break;
    case "dance":
      p.rot = 0.09 * Math.sin(t * 6) * on;
      for (let k = 0; k < 2; k++) {
        const r = (la * 0.7 + k / 2) % 1;
        p.props.push({ e: "🎵", x: k ? 760 : 200, y: 300 - r * 300, size: 90, alpha: on * (1 - r) });
      }
      break;
    case "roar":
      p.shake = 10 * clamp01(1 - la / 0.8);
      p.props.push({ e: "🐅", x: 770, y: 300, size: 200 * pop });
      break;
    case "shrug":
      p.rot = 0.05 * Math.sin(t * 4) * on;
      p.props.push({ e: "❓", x: 190, y: 130, size: 110 * pop, rot: -0.2 }, { e: "❓", x: 770, y: 110, size: 130 * pop, rot: 0.2 });
      break;
    case "scared":
      p.shake = 6 * on;
      p.props.push({ e: "😨", x: 770, y: 80, size: 110 * pop, bubble: true });
      break;
    case "look-up":
      p.rot = -0.04 * on;
      p.props.push({ e: "👀", x: 760, y: 90, size: 110 * pop, bubble: true });
      break;
    case "fist":
      hop(1, 60);
      p.props.push({ e: "💪", x: 750, y: 520, size: 180 * pop });
      break;
    case "idea":
      p.props.push({ e: "💡", x: 480, y: -40 - 10 * Math.sin(t * 5), size: 170 * pop });
      break;
    case "eat":
      p.props.push({ e: "🍛", x: 500, y: 640 + 10 * Math.sin(t * 9), size: 160 * pop }, { e: "😋", x: 770, y: 90, size: 100 * pop, bubble: true });
      break;
    case "share":
      p.props.push({ e: "📤", x: 740 + 60 * clamp01((la - 0.4) / 0.6), y: 520 - 80 * clamp01((la - 0.4) / 0.6), size: 160 * pop });
      break;
    case "read":
      p.props.push({ e: "📖", x: 500, y: 640, size: 190 * pop });
      break;
    case "chisel":
      p.props.push({ e: "🔨", x: 740, y: 560, size: 160 * pop, rot: -0.6 + 0.6 * Math.abs(Math.sin(la * Math.PI * 3.3)) });
      break;
    case "count":
      ["1️⃣", "2️⃣", "3️⃣"].forEach((e, k) => {
        const q = easeOutBack((la - 0.3 - k * 0.6) / 0.3) * on;
        if (q > 0) p.props.push({ e, x: 260 + k * 230, y: -10, size: 110 * q });
      });
      break;
    case "nod":
      p.rot = 0.03 * Math.sin(la * 9) * clamp01(1 - la / 1.2);
      break;
  }
  // In the corner, his props go on his left, towards the screen (and away from its edge).
  if (left) for (const pr of p.props) pr.x = 2 * HOST.centreX - pr.x;
  return p;
}

function drawProp(ctx: SKRSContext2D, pr: Prop) {
  if (pr.size < 2 || (pr.alpha ?? 1) <= 0) return;
  ctx.save();
  ctx.globalAlpha *= pr.alpha ?? 1;
  ctx.translate(pr.x, pr.y);
  if (pr.bubble) {
    // A thought bubble: a big cloud and two little puffs towards his head.
    const r = pr.size * 0.85;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    const toward = pr.x < HOST.centreX ? 1 : -1;
    for (const [bx, by, br] of [[toward * r * 0.9, r * 1.1, r * 0.18], [toward * r * 0.6, r * 0.75, r * 0.28]] as const) {
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.rotate(pr.rot ?? 0);
  ctx.font = `${Math.round(pr.size)}px ${EMOJI}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pr.e, 0, 0);
  ctx.restore();
}

function drawHost(ctx: SKRSContext2D, host: Host, t: number, talk: number, mode: number, f: number, act: { action: Action; la: number; dur: number } | null) {
  const place = hostPlace(mode);
  const s = place.h / HOST.bodyH;
  const ps = act ? pose(act.action, act.la, act.dur, t, mode > 0.5) : null;
  ctx.save();
  // A soft shadow at his feet, smaller while he is up in the air.
  const air = ps ? clamp01(-ps.dy / 150) : 0;
  ctx.fillStyle = `rgba(0,0,0,${0.28 * (1 - air * 0.5)})`;
  ctx.beginPath();
  ctx.ellipse(place.x, place.feet - 4 * s, 170 * s * (1 - air * 0.3), 26 * s * (1 - air * 0.3), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(place.x + (ps?.shake ? ps.shake * Math.sin(t * 60) * s : 0), place.feet + (ps?.dy ?? 0) * s);
  // Sways a little, breathes, nods while he talks; and the action's own lean.
  ctx.rotate(0.012 * Math.sin(t * 1.3) + talk * 0.012 * Math.sin(t * 6.5) + (ps?.rot ?? 0));
  const k = ps?.scale ?? 1;
  // Squashes as he lands.
  const squash = ps && ps.dy > -12 && ps.dy < 0 ? 0.03 : 0;
  ctx.scale(s * k * (1 + squash), s * k * (1 + 0.007 * Math.sin(t * 2.4) - squash));
  ctx.translate(-HOST.centreX, -HOST.feetY - talk * 5);
  ctx.drawImage(host.img, 0, 0);


  // Blinks: about every 3–4 s, 0.16 s long.
  const period = 3.6;
  const phase = (t + 1.1 * Math.sin(Math.floor(t / period) * 12.9898)) % period;
  const blink = phase < 0.16 ? Math.sin((phase / 0.16) * Math.PI) : 0;
  if (blink > 0.05) {
    HOST.eyes.forEach((e, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, e.rx + 3, e.ry + 3, 0, 0, Math.PI * 2);
      ctx.clip();
      const lid = e.y - e.ry - 3 + (e.ry * 2 + 6) * blink;
      ctx.fillStyle = host.lidSkin[i];
      ctx.fillRect(e.x - e.rx - 5, e.y - e.ry - 5, e.rx * 2 + 10, lid - (e.y - e.ry - 5));
      // The lashes on the lid's edge.
      ctx.strokeStyle = "#3a2418";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(e.x - e.rx, lid - 2);
      ctx.quadraticCurveTo(e.x, lid + 8 * blink, e.x + e.rx, lid - 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  // The mouth opens with the voice.
  if (talk > 0.04) {
    const { x, y } = HOST.mouth;
    ctx.save();
    ctx.globalAlpha = clamp01(talk * 4);
    // Skin over the drawn smile, fading out to the skin around it.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.5);
    const patch = ctx.createRadialGradient(0, 0, 4, 0, 0, 50);
    patch.addColorStop(0, host.mouthSkin);
    patch.addColorStop(0.65, host.mouthSkin);
    patch.addColorStop(1, host.mouthSkin.replace("rgb(", "rgba(").replace(")", ",0)"));
    ctx.fillStyle = patch;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    // Shape changes a little frame to frame, like different sounds.
    const w = 20 + 9 * talk + 4 * Math.sin(f * 1.7);
    const h = 5 + 24 * talk * (0.8 + 0.2 * Math.sin(f * 2.3));
    ctx.translate(x, y - 3);
    const mouth = () => {
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.quadraticCurveTo(0, -h * 0.3, w, 0);
      ctx.quadraticCurveTo(0, h * 1.5, -w, 0);
      ctx.closePath();
    };
    mouth();
    ctx.fillStyle = "#5b1a1c";
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (h > 12) {
      ctx.fillStyle = "#f6f1ea";
      ctx.fillRect(-w, -h, w * 2, h * 0.32 + 1);
    }
    ctx.fillStyle = "#d9686b";
    ctx.beginPath();
    ctx.ellipse(0, h * 0.75, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    mouth();
    ctx.strokeStyle = "#a8484a";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }
  if (!CLEAN) for (const pr of ps?.props ?? []) drawProp(ctx, pr);
  ctx.restore();
}

// ─── Text on screen ───────────────────────────────────────────────────────────

const YELLOW = "#FFD400";

function outlined(ctx: SKRSContext2D, text: string, x: number, y: number, fill: string, line: number) {
  ctx.lineJoin = "round";
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function pill(ctx: SKRSContext2D, text: string, cx: number, cy: number, size: number, bg: string, fg: string) {
  ctx.font = `${size}px ${TB}`;
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.6;
  ctx.fillStyle = bg;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + size * 0.08);
  return w;
}

/** A white mouse pointer, its tip at (x, y). */
function cursor(ctx: SKRSContext2D, x: number, y: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.6 * (1 - 0.15 * press), 1.6 * (1 - 0.15 * press));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 34);
  ctx.lineTo(9, 26);
  ctx.lineTo(16, 41);
  ctx.lineTo(22, 38);
  ctx.lineTo(15, 23);
  ctx.lineTo(27, 23);
  ctx.closePath();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function ripple(ctx: SKRSContext2D, x: number, y: number, r: number) {
  if (r <= 0 || r >= 1) return;
  ctx.strokeStyle = `rgba(255,255,255,${1 - r})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, 20 + 70 * r, 0, Math.PI * 2);
  ctx.stroke();
}

/** Text that fits `maxW` at most `size` px, outlined, centred at (x, y). */
function bigText(ctx: SKRSContext2D, text: string, x: number, y: number, size: number, maxW: number, fill: string) {
  ctx.font = `${size}px ${TB}`;
  const fit = Math.min(1, maxW / ctx.measureText(text).width);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fit, fit);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  outlined(ctx, text, 0, 0, fill, size / 7);
  ctx.restore();
}

const CTA_LOOK = {
  like: { off: ["👍 LIKE", "#ffffff", INK], on: ["👍 LIKED", "#2f6bff", "#fff"] },
  subscribe: { off: ["SUBSCRIBE", "#e62117", "#fff"], on: ["SUBSCRIBED ✅", "#7d7d7d", "#fff"] },
  bell: { off: ["🔔", "#ffffff", INK], on: ["🔔", YELLOW, INK] },
  share: { off: ["📤 SHARE", "#ffffff", INK], on: ["📤 SHARED ✅", "#19a974", "#fff"] },
  comment: { off: ["💬 COMMENT", "#ffffff", INK], on: ["💬 COMMENT", YELLOW, INK] },
} as const;

// ─── The story look (video 03 on) ─────────────────────────────────────────────

const GOLD = "#E8B75A";
const CREAM = "#FFF6E6";
const NAVY = "#0b1630";
const SH = `"Story Head", "Tamil Bold", "ShortFlow Bold"`;
const SB = `"Story Bold", "Tamil Bold", "ShortFlow Bold"`;
const SS = `"Story Semi", "Tamil Semi", "ShortFlow Semi"`;

/** 0 → 1 smoothly, `delay` s in, over `len` s: every story entrance is a fade and a short slide. */
const rise = (local: number, delay = 0, len = 0.6) => easeOut(clamp01((local - delay) / len));

/** Text with a soft shadow instead of an outline. */
function softText(ctx: SKRSContext2D, text: string, x: number, y: number, fill: string, blur = 18) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A dark see-through panel with a thin gold edge. */
function glass(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, fill = "rgba(9,16,36,0.68)") {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha *= 0.85;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Text fitted into `maxW`, centred at (x, y). */
function fitText(ctx: SKRSContext2D, text: string, x: number, y: number, size: number, maxW: number, fill: string, font = SH) {
  ctx.font = `${size}px ${font}`;
  const fit = Math.min(1, maxW / ctx.measureText(text).width);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(fit, fit);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  softText(ctx, text, 0, 0, fill);
  ctx.restore();
}

/** A small gold label with a short rule on each side. */
function kicker(ctx: SKRSContext2D, text: string, x: number, y: number, size = 40) {
  ctx.font = `${size}px ${SB}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width;
  softText(ctx, text, x, y, GOLD, 10);
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - w / 2 - 74, y - 1, 52, 3);
  ctx.fillRect(x + w / 2 + 22, y - 1, 52, 3);
}

/** A wooden sailing ship, drawn: hull, two sails, a pennant; facing right, waterline at y = 0. */
function drawShip(ctx: SKRSContext2D, x: number, y: number, size: number, tilt: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + 0.04 * Math.sin(t * 2.2));
  ctx.scale(size / 100, size / 100);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 14;
  // Hull.
  ctx.fillStyle = "#6b3f1f";
  ctx.beginPath();
  ctx.moveTo(-58, -14);
  ctx.lineTo(62, -14);
  ctx.quadraticCurveTo(52, 10, 34, 12);
  ctx.lineTo(-40, 12);
  ctx.quadraticCurveTo(-54, 6, -58, -14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = GOLD;
  ctx.fillRect(-54, -12, 112, 4);
  // Mast and sails, filled by the wind.
  ctx.fillStyle = "#3a2414";
  ctx.fillRect(-3, -96, 5, 84);
  const puff = 4 * Math.sin(t * 3);
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.moveTo(4, -92);
  ctx.quadraticCurveTo(46 + puff, -60, 8, -20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -84);
  ctx.quadraticCurveTo(-40 - puff * 0.6, -54, -8, -22);
  ctx.closePath();
  ctx.fill();
  // The pennant.
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.moveTo(2, -96);
  ctx.lineTo(26, -90 + 3 * Math.sin(t * 6));
  ctx.lineTo(2, -84);
  ctx.fill();
  ctx.restore();
}

/** A line's overlay in the story look; false for kinds it leaves to the classic look. */
function drawStoryOverlay(ctx: SKRSContext2D, l: Timed, t: number, cx: number, cy: number): boolean {
  const o = l.overlay!;
  const local = t - l.start;
  const dur = l.end - l.start;
  const out = clamp01((l.end + 0.4 - t) / 0.4);
  if (!["title", "year", "list", "pin", "type", "morph", "stamp", "route"].includes(o.kind)) return false;
  if (out <= 0 || local < 0) return true;
  ctx.save();
  ctx.globalAlpha = out;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  switch (o.kind) {
    case "title": {
      if (o.small) {
        const p = rise(local);
        ctx.save();
        ctx.globalAlpha = out * p;
        kicker(ctx, o.small, cx, cy - 105 + 14 * (1 - p));
        ctx.restore();
      }
      // Word by word, each fading up into place.
      ctx.font = `96px ${SH}`;
      const words = o.text.split(" ");
      const widths = words.map((w) => ctx.measureText(w).width);
      const space = ctx.measureText(" ").width;
      const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
      const fit = Math.min(1, 1080 / total);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      let x = -total / 2;
      words.forEach((w, i) => {
        const p = rise(local, 0.12 + i * 0.1, 0.55);
        if (p > 0) {
          ctx.save();
          ctx.globalAlpha = out * p;
          softText(ctx, w, x + widths[i] / 2, 26 * (1 - p), CREAM);
          ctx.restore();
        }
        x += widths[i] + space;
      });
      // A thin gold line opening out from the middle.
      const u = rise(local, 0.35, 0.8);
      ctx.fillStyle = GOLD;
      ctx.fillRect((-total / 2) * u, 72, total * u, 4);
      ctx.restore();
      break;
    }
    case "year": {
      if (o.label) {
        const p = rise(local);
        ctx.save();
        ctx.globalAlpha = out * p;
        kicker(ctx, o.label, cx, cy - 125 + 14 * (1 - p));
        ctx.restore();
      }
      const c = easeOut(clamp01((local - 0.15) / YEAR_COUNT));
      const value = Math.round(o.value * c);
      const shown = o.value >= 10_000 ? value.toLocaleString("en-IN") : String(value);
      ctx.save();
      ctx.globalAlpha = out * rise(local, 0.05, 0.4);
      fitText(ctx, `${o.prefix ?? ""}${shown}${o.suffix ?? ""}`, cx, cy + 25, 160, 1080, GOLD);
      ctx.restore();
      const u = rise(local, 0.2, 1.2);
      ctx.fillStyle = "rgba(255,246,230,0.6)";
      ctx.fillRect(cx - 220 * u, cy + 125, 440 * u, 3);
      break;
    }
    case "list": {
      const times = listTimes(l);
      ctx.font = `52px ${SB}`;
      const ws = o.items.map((it) => ctx.measureText(it).width + 84);
      const gap = 28;
      const rowW = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      const asRow = rowW <= 1080;
      o.items.forEach((item, i) => {
        const p = rise(t - times[i], 0, 0.5);
        if (p <= 0) return;
        const x = asRow ? cx - rowW / 2 + ws.slice(0, i).reduce((a, b) => a + b + gap, 0) + ws[i] / 2 : cx;
        const y = (asRow ? cy : cy + (i - (o.items.length - 1) / 2) * 116) + 22 * (1 - p);
        const lit = i === o.items.length - 1 && t > times[i] + 0.4;
        const w = asRow ? ws[i] : Math.max(...ws);
        ctx.save();
        ctx.globalAlpha = out * p;
        glass(ctx, x - w / 2, y - 46, w, 92, 22, lit ? "rgba(232,183,90,0.92)" : "rgba(9,16,36,0.68)");
        ctx.font = `52px ${SB}`;
        ctx.textAlign = "center";
        ctx.fillStyle = lit ? NAVY : CREAM;
        ctx.fillText(item, x, y + 3);
        ctx.restore();
      });
      break;
    }
    case "pin": {
      ctx.font = `64px ${SH}`;
      const tw = ctx.measureText(o.text).width;
      ctx.font = `38px ${SS}`;
      const sw = o.small ? ctx.measureText(o.small).width : 0;
      const w = Math.max(tw, sw) + 190;
      const h = o.small ? 186 : 130;
      const p = rise(local, 0.05, 0.6);
      const x0 = cx - w / 2 + 22 * (1 - p);
      ctx.save();
      ctx.globalAlpha = out * p;
      glass(ctx, x0, cy - h / 2, w, h, 26);
      // The place marker: a gold dot with a ring rippling out from it.
      const mx = x0 + 74;
      const ring = (local * 0.8) % 1;
      ctx.strokeStyle = `rgba(232,183,90,${0.9 * (1 - ring)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, cy, 14 + 30 * ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(mx, cy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.font = `64px ${SH}`;
      softText(ctx, o.text, x0 + 132, o.small ? cy - 26 : cy + 2, CREAM, 8);
      if (o.small) {
        ctx.font = `38px ${SS}`;
        ctx.fillStyle = GOLD;
        ctx.fillText(o.small, x0 + 132, cy + 46);
      }
      ctx.restore();
      break;
    }
    case "type": {
      const gs = graphemes(o.text);
      const shown = Math.floor(gs.length * clamp01((local - 0.15) / Math.max(1, Math.min(2.2, gs.length * 0.07))));
      ctx.font = `80px ${SH}`;
      const full = ctx.measureText(o.text).width;
      const fit = Math.min(1, 1080 / full);
      const p = rise(local, 0, 0.4);
      ctx.save();
      ctx.globalAlpha = out * p;
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      glass(ctx, -full / 2 - 50, -78, full + 120, 156, 28);
      const part = gs.slice(0, shown).join("");
      ctx.textAlign = "left";
      softText(ctx, part, -full / 2, 4, CREAM, 8);
      if (Math.floor(local * 2.2) % 2 === 0 || shown < gs.length) {
        ctx.fillStyle = GOLD;
        ctx.fillRect(-full / 2 + ctx.measureText(part).width + 10, -40, 6, 80);
      }
      ctx.restore();
      break;
    }
    case "morph": {
      // The first words lift away as the second rise in, in gold.
      const at = morphAt(l) - l.start;
      const a = rise(local, 0, 0.45) * (1 - rise(local, at - 0.2, 0.5));
      const b = rise(local, at, 0.6);
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = out * a;
        // In from below, away upwards.
        fitText(ctx, o.from, cx, cy + 30 * (1 - a) * (local > at - 0.2 ? -1 : 1), 110, 1080, CREAM);
        ctx.restore();
      }
      if (b > 0) {
        ctx.save();
        ctx.globalAlpha = out * b;
        fitText(ctx, o.to, cx, cy + 30 * (1 - b), 110, 1080, GOLD);
        ctx.restore();
      }
      const u = rise(local, at, 0.8);
      ctx.fillStyle = GOLD;
      ctx.fillRect(cx - 200 * u, cy + 85, 400 * u, 4);
      break;
    }
    case "stamp": {
      // A seal: the words settle from a little larger inside a double gold frame.
      const p = rise(local, 0, 0.5);
      const sc = 1.08 - 0.08 * p;
      ctx.save();
      ctx.globalAlpha = out * p;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.font = `112px ${SH}`;
      const w = Math.min(1040, ctx.measureText(o.text).width) + 120;
      const h = o.small ? 270 : 190;
      glass(ctx, -w / 2, -95, w, h, 18);
      ctx.strokeStyle = "rgba(232,183,90,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 12, -83, w - 24, h - 24, 12);
      ctx.stroke();
      fitText(ctx, o.text, 0, 0, 112, 1040, GOLD);
      if (o.small) fitText(ctx, o.small, 0, 112, 46, 960, CREAM, SS);
      ctx.restore();
      break;
    }
    case "route": {
      const a = { x: cx - 460, y: cy + 110 };
      const b = { x: cx + 460, y: cy + 110 };
      const c = { x: cx, y: cy - 210 };
      const at = (u: number) => ({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
      const sail = Math.max(1.4, dur * 0.65);
      const p = easeInOut(clamp01((local - 0.3) / sail));
      // The whole path faint, the part sailed in gold.
      ctx.save();
      ctx.setLineDash([16, 16]);
      ctx.lineCap = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,246,230,0.35)";
      ctx.beginPath();
      for (let u = 0; u <= 1.0001; u += 0.01) {
        const q = at(u);
        if (u === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let u = 0; u <= p; u += 0.01) {
        const q = at(u);
        if (u === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.restore();
      for (const [pt, name, on, lit] of [[a, o.from, rise(local, 0, 0.5), false], [b, o.to, rise(local, 0.3 + sail, 0.5), true]] as const) {
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.fill();
        if (on <= 0) continue;
        ctx.save();
        ctx.globalAlpha = out * on;
        ctx.font = `46px ${SB}`;
        const w = ctx.measureText(name).width + 70;
        glass(ctx, pt.x - w / 2, pt.y + 40 + 14 * (1 - on), w, 78, 20, lit ? "rgba(232,183,90,0.92)" : "rgba(9,16,36,0.68)");
        ctx.fillStyle = lit ? NAVY : CREAM;
        ctx.textAlign = "center";
        ctx.fillText(name, pt.x, pt.y + 81 + 14 * (1 - on));
        ctx.restore();
      }
      const q = at(p);
      const q2 = at(Math.min(1, p + 0.01));
      const q1 = at(Math.max(0, p - 0.01));
      drawShip(ctx, q.x, q.y - 6, 120, Math.atan2(q2.y - q1.y, q2.x - q1.x) * 0.6, t);
      break;
    }
  }
  ctx.restore();
  return true;
}

// ─── The pulse look (video 07 on) ─────────────────────────────────────────────

// The pulse look's colours; the feed look (video 08 on) reuses its drawing in its own colours.
let P_BG = "#0E1117";
let TEAL = "#2EE6C9";
let CORAL = "#FF5A5F";
const SNOW = "#F7F7F2";
const AMBER = "#FFC24B";
/** The dark of the backgrounds as "r,g,b", for see-through shades of it. */
let INKRGB = "14,17,23";
/** The accent (teal / lime) and the hot colour (coral / pink) as "r,g,b". */
let ACCRGB = "46,230,201";
let HOTRGB = "255,90,95";
let DARK_CHIP = "rgba(14,17,23,0.9)";
const shade = (a: number) => `rgba(${INKRGB},${a})`;

/** Sets the colours for the pulse look, the feed look's lime, pink and violet, or the night look's moon gold and indigo. */
function usePalette(look: ExVideo["look"]) {
  const [bg, acc, hot, ink, accRgb, hotRgb] =
    look === "feed"
      ? ["#0D0A1F", "#C6F432", "#FF3E8A", "13,10,31", "198,244,50", "255,62,138"]
      : look === "night"
        ? ["#070B1E", "#FFD36E", "#4E6CF0", "7,11,30", "255,211,110", "78,108,240"]
        : look === "paper"
          ? // Ink navy (the page itself is PAPER_BG), marigold highlighter, red pen.
            ["#1B2140", "#FFB627", "#E63946", "27,33,64", "255,182,39", "230,57,70"]
          : ["#0E1117", "#2EE6C9", "#FF5A5F", "14,17,23", "46,230,201", "255,90,95"];
  P_BG = bg;
  TEAL = acc;
  CORAL = hot;
  INKRGB = ink;
  ACCRGB = accRgb;
  HOTRGB = hotRgb;
  DARK_CHIP = shade(0.9);
}

/** The night look's crescent moon at (x, y), radius r, with a soft halo. */
function drawMoon(ctx: SKRSContext2D, x: number, y: number, r: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  halo.addColorStop(0, `rgba(${ACCRGB},0.28)`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  // The crescent: the moon, with a disc cut out of it on the upper right.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.arc(x + r * 0.45, y - r * 0.28, r * 0.86, 0, Math.PI * 2, true);
  ctx.fillStyle = TEAL;
  ctx.fill("evenodd");
  ctx.restore();
}

/** "HH:MM" on a 12-hour dial as minutes, or null for anything else (e.g. "30 நாள்"). */
const clockMinutes = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? (Number(m[1]) % 12) * 60 + Number(m[2]) : null;
};
const clockText = (min: number) => {
  const h = Math.floor(min / 60) % 12;
  return `${String(h === 0 ? 12 : h).padStart(2, "0")}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
};

/** The rounded screen the pictures play in. */
function pulseCard() {
  // The paper look keeps more of its page showing around the taped photo.
  if (PAPER) return F.h > F.w ? { x: 56, y: 210, w: F.w - 112, h: F.h - 650, r: 26 } : { x: 84, y: 104, w: F.w - 168, h: 780, r: 24 };
  return F.h > F.w ? { x: 36, y: 200, w: F.w - 72, h: F.h - 620, r: 40 } : { x: 48, y: 96, w: F.w - 96, h: 812, r: 36 };
}

/** Clear space kept between any text box and the frame's edges (the user, 2026-11-20: text was touching the right edge). */
const edge = () => (F.w > F.h ? 96 : 60);
/** The widest a text box may be around the current text centre, in overlay units; set before each overlay is drawn. */
let ROOM = 1500;
const setRoom = (cx: number) => {
  ROOM = (2 * Math.min(cx, F.w - cx) - 2 * edge()) / F.overlayScale;
};
/** A width for content that gets `pad` of box around it: at most `cap`, and never past the safe edges. */
const fitRoom = (cap: number, pad = 0) => Math.max(240, Math.min(cap, ROOM - pad));
/** The widest a subtitle row may be around `cx` when its bar adds `pad` (real frame units). */
const subRoom = (cx: number, want: number, pad: number) => Math.min(want, 2 * Math.min(cx, F.w - cx) - 2 * edge() - pad);

/** A pop-in with a little overshoot, `delay` s in, over `len` s. */
const popIn = (local: number, delay = 0, len = 0.45) => easeOutBack((local - delay) / len);

/** A solid rounded box, with a soft drop shadow unless `shadow` is false. */
function chip(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, shadow = true) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), h, Math.min(r, Math.max(0, w) / 2));
  ctx.fill();
  ctx.restore();
}

/** A pill of text centred at (x, y), scaled by `p`. */
function tag(ctx: SKRSContext2D, text: string, x: number, y: number, p: number, fill = TEAL, ink = P_BG, size = 40) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);
  ctx.font = `${size}px ${TB}`;
  const cap = fitRoom(1100, size * 1.3);
  const w = Math.min(cap, ctx.measureText(text).width) + size * 1.3;
  chip(ctx, -w / 2, -size * 0.85, w, size * 1.7, size * 0.85, fill);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 3, cap);
  ctx.restore();
}

/** Text on a solid box sized to it (at most 1080 wide), centred at (x, y); returns the box's width. */
function boxText(ctx: SKRSContext2D, text: string, x: number, y: number, size: number, fill: string, ink: string): number {
  ctx.font = `${size}px ${TB}`;
  const fit = Math.min(1, fitRoom(920, size * 1.1) / ctx.measureText(text).width);
  const tw = ctx.measureText(text).width * fit;
  const w = tw + size * 1.1;
  const h = size * 1.55 * Math.max(0.75, fit);
  chip(ctx, x - w / 2, y - h / 2, w, h, 24, fill);
  ctx.save();
  ctx.translate(x, y + 4);
  ctx.scale(fit, fit);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return w;
}

/** The paper look's page colour. */
const PAPER_BG = "#F4ECDB";

/** A notebook page over the whole frame: cream, a soft light in the middle, blue ruled lines, a red margin, a little grain. */
function drawPaper(ctx: SKRSContext2D) {
  ctx.fillStyle = PAPER_BG;
  ctx.fillRect(0, 0, F.w, F.h);
  const lightUp = ctx.createRadialGradient(F.w * 0.5, F.h * 0.42, 0, F.w * 0.5, F.h * 0.42, Math.max(F.w, F.h) * 0.7);
  lightUp.addColorStop(0, "rgba(255,255,255,0.45)");
  lightUp.addColorStop(1, "rgba(120,90,40,0.12)");
  ctx.fillStyle = lightUp;
  ctx.fillRect(0, 0, F.w, F.h);
  ctx.fillStyle = "rgba(70,110,175,0.16)";
  for (let y = 64; y < F.h; y += 54) ctx.fillRect(0, y, F.w, 2);
  ctx.fillStyle = `rgba(${HOTRGB},0.4)`;
  ctx.fillRect(F.h > F.w ? 64 : 22, 0, 3, F.h);
  ctx.fillStyle = "rgba(90,60,20,0.05)";
  for (let k = 0; k < 900; k++) ctx.fillRect(hash(k + 3000) * F.w, hash(k + 4000) * F.h, 2, 2);
}

/** The dark backdrop around the screen: two slow colour glows drifting and a faint dot grid. */
function drawPulseBackdrop(ctx: SKRSContext2D, t: number) {
  ctx.fillStyle = P_BG;
  ctx.fillRect(0, 0, F.w, F.h);
  const glow = (x: number, y: number, r: number, colour: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, F.w, F.h);
  };
  if (PAPER) {
    drawPaper(ctx);
    // Faint letters, Tamil and English mixed, drifting slowly across the page.
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyphs = ["அ", "A", "ம", "M", "க", "K", "த", "T", "ழ", "C", "ஆ", "E", "ங", "R", "ண", "W", "ப", "P", "ஞ", "S"];
    glyphs.forEach((g, k) => {
      const size = 90 + hash(k + 20) * 110;
      const x = ((hash(k) * (F.w + 240) + t * (6 + hash(k + 40) * 10)) % (F.w + 240)) - 120;
      const y = hash(k + 80) * F.h + 14 * Math.sin(t * 0.35 + k);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash(k + 60) - 0.5) * 0.5 + 0.05 * Math.sin(t * 0.3 + k));
      ctx.font = `${size}px ${SH}`;
      ctx.fillStyle = k % 3 === 0 ? `rgba(${HOTRGB},0.08)` : shade(0.06);
      ctx.fillText(g, 0, 0);
      ctx.restore();
    });
    ctx.restore();
    return;
  }
  if (NIGHT) {
    // A midnight sky: deep blue fading up from the bottom, twinkling stars, a crescent moon, faint clouds drifting.
    const sky = ctx.createLinearGradient(0, 0, 0, F.h);
    sky.addColorStop(0, "#050817");
    sky.addColorStop(1, "#111C46");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, F.w, F.h);
    glow(F.w * (0.2 + 0.05 * Math.sin(t * 0.13)), F.h * 0.95, F.w * 0.6, `rgba(${HOTRGB},0.22)`);
    for (let k = 0; k < 170; k++) {
      const x = hash(k) * F.w;
      const y = hash(k + 500) * F.h;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.8 + hash(k + 900) * 2.2) + k));
      const r = 1 + hash(k + 1300) * 2.2;
      ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.6 * hash(k + 1700)) * tw})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tall = F.h > F.w;
    // Left of the handle in the wide frame; in a Short, top right above the screen.
    drawMoon(ctx, tall ? F.w - 150 : F.w - 300, tall ? 110 : 48 + 4 * Math.sin(t * 0.3), tall ? 56 : 30);
    for (let k = 0; k < 3; k++) {
      const x = ((t * (14 + k * 6) + k * 700) % (F.w + 900)) - 450;
      const y = F.h * (0.12 + k * 0.33);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
      g.addColorStop(0, "rgba(160,180,255,0.07)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 420, y - 420, 840, 840);
    }
    return;
  }
  if (FEED) {
    // A violet and a pink glow, and faint posts scrolling up and up, like a feed that never ends.
    glow(F.w * (0.15 + 0.08 * Math.sin(t * 0.21)), F.h * (0.2 + 0.1 * Math.cos(t * 0.17)), F.w * 0.65, "rgba(140,108,255,0.3)");
    glow(F.w * (0.88 + 0.06 * Math.cos(t * 0.19)), F.h * (0.85 + 0.08 * Math.sin(t * 0.23)), F.w * 0.55, `rgba(${HOTRGB},0.2)`);
    const colW = F.h > F.w ? F.w * 0.42 : F.w * 0.2;
    const postH = colW * 1.25;
    const cols = Math.ceil(F.w / (colW + 40)) + 1;
    for (let c = 0; c < cols; c++) {
      const x = c * (colW + 40) - colW * 0.3;
      const scroll = (t * (36 + 10 * (c % 3)) + c * postH * 0.45) % (postH + 40);
      for (let y = -scroll; y < F.h; y += postH + 40) {
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.beginPath();
        ctx.roundRect(x, y, colW, postH, 26);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.arc(x + 34, y + 34, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + 62, y + 26, colW * 0.4, 8);
        ctx.fillRect(x + 62, y + 42, colW * 0.25, 6);
      }
    }
    return;
  }
  glow(F.w * (0.18 + 0.08 * Math.sin(t * 0.21)), F.h * (0.22 + 0.1 * Math.cos(t * 0.17)), F.w * 0.6, `rgba(${ACCRGB},0.22)`);
  glow(F.w * (0.86 + 0.06 * Math.cos(t * 0.19)), F.h * (0.82 + 0.08 * Math.sin(t * 0.23)), F.w * 0.55, `rgba(${HOTRGB},0.2)`);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let y = 24; y < F.h; y += 48) for (let x = 24; x < F.w; x += 48) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
}

/** A picture inside the screen, slowly moving, shifted `dx` sideways (or `dy` up, in the feed look) while it slides in or out. */
function drawPulsePicture(ctx: SKRSContext2D, pic: Picture | undefined, key: string, p: number, index: number, dx: number, dy = 0) {
  const c = pulseCard();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(c.x, c.y, c.w, c.h, c.r);
  ctx.clip();
  ctx.translate(dx, dy);
  if (!pic) {
    const g = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
    g.addColorStop(0, "#123a3a");
    g.addColorStop(1, "#4a1d2a");
    ctx.fillStyle = g;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = `60px ${TS}`;
    ctx.textAlign = "center";
    ctx.fillText(key, c.x + c.w / 2, c.y + 120);
    ctx.restore();
    return;
  }
  const { img } = pic;
  if (!pic.portrait) {
    const zoom = 1.03 + 0.08 * (index % 2 ? p : 1 - p);
    const s = Math.max(c.w / img.width, c.h / img.height) * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const dir = index % 3 === 0 ? 1 : index % 3 === 1 ? -1 : 0;
    ctx.drawImage(img, c.x + (c.w - w) / 2 + dir * (w - c.w) * 0.4 * (p - 0.5), c.y + (c.h - h) / 2 - (index % 2 ? 1 : -1) * (h - c.h) * 0.3 * (p - 0.5), w, h);
  } else {
    // A portrait: blurred behind, the picture itself on a white rounded card.
    const bs = Math.max(c.w / 48, c.h / 27) * 1.1;
    ctx.drawImage(pic.blur, c.x + (c.w - 48 * bs) / 2, c.y + (c.h - 27 * bs) / 2, 48 * bs, 27 * bs);
    ctx.fillStyle = shade(0.35);
    ctx.fillRect(c.x, c.y, c.w, c.h);
    const s = Math.min((c.h - 90) / img.height, F.photo.maxW / img.width) * (1 + 0.04 * p);
    const w = img.width * s;
    const h = img.height * s;
    const px = F.photo.x;
    const py = c.y + c.h / 2;
    chip(ctx, px - w / 2 - 12, py - h / 2 - 12, w + 24, h + 24, 22, SNOW);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px - w / 2, py - h / 2, w, h, 14);
    ctx.clip();
    ctx.drawImage(img, px - w / 2, py - h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/** A line's overlay in the pulse look; false for kinds it leaves to the classic look. */
function drawPulseOverlay(ctx: SKRSContext2D, l: Timed, t: number, cx: number, cy: number): boolean {
  const o = l.overlay!;
  const local = t - l.start;
  const out = clamp01((l.end + 0.4 - t) / 0.3);
  if (!["title", "year", "list", "pin", "type", "morph", "stamp", "flow", "meter", "warning", "word"].includes(o.kind)) return false;
  if (out <= 0 || local < 0) return true;
  ctx.save();
  ctx.globalAlpha = out;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  switch (o.kind) {
    case "title": {
      if (o.small) tag(ctx, o.small, cx, cy - 122, popIn(local, 0, 0.4));
      // A coral marker sweeping across, the words popping up on it one by one.
      ctx.font = `104px ${TB}`;
      const words = o.text.split(" ");
      const widths = words.map((w) => ctx.measureText(w).width);
      const space = ctx.measureText(" ").width;
      const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
      const fit = Math.min(1, fitRoom(960, 80) / total);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      const u = easeOut(clamp01((local - 0.05) / 0.4));
      chip(ctx, -total / 2 - 40, -72, (total + 80) * u, 144, 26, CORAL);
      let x = -total / 2;
      words.forEach((w, i) => {
        const p = popIn(local, 0.15 + i * 0.09, 0.4);
        if (p > 0) {
          ctx.save();
          ctx.globalAlpha = out * clamp01(p * 2);
          ctx.translate(x + widths[i] / 2, 6);
          ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p);
          ctx.fillStyle = SNOW;
          ctx.fillText(w, 0, 0);
          ctx.restore();
        }
        x += widths[i] + space;
      });
      ctx.restore();
      break;
    }
    case "year": {
      if (o.label) tag(ctx, o.label, cx, cy - 145, popIn(local, 0, 0.4), SNOW, P_BG);
      const c = easeOut(clamp01((local - 0.15) / YEAR_COUNT));
      const fmt = (n: number) => `${o.prefix ?? ""}${o.value >= 10_000 ? n.toLocaleString("en-IN") : String(n)}${o.suffix ?? ""}`;
      ctx.font = `170px ${TB}`;
      const full = ctx.measureText(fmt(o.value)).width;
      const fit = Math.min(1, fitRoom(900, 120) / full);
      ctx.save();
      ctx.globalAlpha = out * rise(local, 0.05, 0.3);
      ctx.translate(cx, cy + 25);
      ctx.scale(fit, fit);
      chip(ctx, -full / 2 - 60, -110, full + 120, 220, 34, DARK_CHIP);
      ctx.shadowColor = `rgba(${ACCRGB},0.5)`;
      ctx.shadowBlur = 40;
      ctx.fillStyle = TEAL;
      ctx.fillText(fmt(Math.round(o.value * c)), 0, 0);
      ctx.restore();
      const u = rise(local, 0.2, 1.0);
      chip(ctx, cx - 210 * u, cy + 125, 420 * u, 12, 6, CORAL, false);
      break;
    }
    case "list": {
      const times = listTimes(l);
      if (FEED) {
        // Each item drops in as a notification: a round icon with its number, the words, "இப்போ" on the right.
        ctx.font = `50px ${TB}`;
        const w = Math.max(...o.items.map((it) => ctx.measureText(it).width)) + 300;
        const fit = Math.min(1, fitRoom(1180) / w);
        const n = o.items.length;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(fit, fit);
        o.items.forEach((item, i) => {
          const p = easeOutBack(clamp01((t - times[i]) / 0.45));
          if (p <= 0) return;
          const y = (i - (n - 1) / 2) * 112 - 40 * (1 - p);
          const x = -w / 2;
          const lit = i === n - 1 && t > times[i] + 0.4;
          ctx.save();
          ctx.globalAlpha = out * clamp01(p * 2);
          chip(ctx, x, y - 46, w, 92, 30, "rgba(28,22,56,0.95)");
          if (lit) {
            ctx.strokeStyle = CORAL;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(x, y - 46, w, 92, 30);
            ctx.stroke();
          }
          const g = ctx.createLinearGradient(x + 16, y - 30, x + 76, y + 30);
          g.addColorStop(0, "#8C6CFF");
          g.addColorStop(1, CORAL);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x + 52, y, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = SNOW;
          ctx.font = `34px ${TB}`;
          ctx.textAlign = "center";
          ctx.fillText(String(i + 1), x + 52, y + 3);
          ctx.textAlign = "left";
          ctx.font = `50px ${TB}`;
          ctx.fillStyle = lit ? TEAL : SNOW;
          ctx.fillText(item, x + 104, y + 3);
          ctx.textAlign = "right";
          ctx.font = `30px ${TB}`;
          ctx.fillStyle = "rgba(247,247,242,0.45)";
          ctx.fillText("இப்போ", x + w - 30, y + 3);
          ctx.restore();
        });
        ctx.restore();
        break;
      }
      ctx.font = `50px ${TB}`;
      const w = Math.max(...o.items.map((it) => ctx.measureText(it).width)) + 140;
      // The slide-in starts 50 to the left, so that much is kept free too.
      const fit = Math.min(1, fitRoom(1080, 100) / w);
      const n = o.items.length;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      o.items.forEach((item, i) => {
        const p = rise(t - times[i], 0, 0.4);
        if (p <= 0) return;
        const y = (i - (n - 1) / 2) * 104;
        const x = -w / 2 - 50 * (1 - p);
        const lit = i === n - 1 && t > times[i] + 0.4;
        ctx.save();
        ctx.globalAlpha = out * p;
        chip(ctx, x, y - 42, w, 84, 22, lit ? CORAL : DARK_CHIP);
        chip(ctx, x + 12, y - 30, 60, 60, 16, lit ? SNOW : TEAL, false);
        ctx.fillStyle = P_BG;
        ctx.font = `36px ${TB}`;
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), x + 42, y + 3);
        ctx.fillStyle = SNOW;
        ctx.font = `50px ${TB}`;
        ctx.textAlign = "left";
        ctx.fillText(item, x + 98, y + 3);
        ctx.restore();
      });
      ctx.restore();
      break;
    }
    case "flow": {
      // Boxes left to right, an arrow drawing itself towards each next one.
      const times = listTimes(l);
      ctx.font = `50px ${TB}`;
      const ws = o.items.map((it) => ctx.measureText(it).width + 76);
      const gap = 96;
      const total = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      const fit = Math.min(1, fitRoom(1120) / total);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      let x = -total / 2;
      o.items.forEach((item, i) => {
        const p = popIn(t - times[i], 0, 0.4);
        const last = i === o.items.length - 1;
        if (p > 0) {
          ctx.save();
          ctx.globalAlpha = out * clamp01(p * 2);
          ctx.translate(x + ws[i] / 2, 0);
          ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p);
          chip(ctx, -ws[i] / 2, -52, ws[i], 104, 26, last ? CORAL : i === 0 ? TEAL : DARK_CHIP);
          ctx.fillStyle = i === 0 && !last ? P_BG : SNOW;
          ctx.font = `50px ${TB}`;
          ctx.textAlign = "center";
          ctx.fillText(item, 0, 5);
          ctx.restore();
        }
        x += ws[i];
        if (!last) {
          const q = rise(t - times[i + 1], -0.3, 0.3);
          if (q > 0) {
            const x0 = x + 16;
            const x1 = x0 + (gap - 32) * q;
            ctx.save();
            ctx.globalAlpha = out * q;
            ctx.strokeStyle = TEAL;
            ctx.fillStyle = TEAL;
            ctx.lineWidth = 9;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            ctx.lineTo(x1 - 14, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x1, 0);
            ctx.lineTo(x1 - 22, -18);
            ctx.lineTo(x1 - 22, 18);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          x += gap;
        }
      });
      ctx.restore();
      break;
    }
    case "meter": {
      tag(ctx, o.label, cx, cy - 125, popIn(local, 0, 0.4), SNOW, P_BG, 42);
      const W = fitRoom(900, 28);
      const H = 64;
      const v = o.from + (o.to - o.from) * easeInOut(clamp01((local - 0.5) / Math.max(1.2, (l.end - l.start) * 0.5)));
      ctx.save();
      ctx.globalAlpha = out * rise(local, 0.1, 0.4);
      chip(ctx, cx - W / 2 - 14, cy - H / 2 - 14, W + 28, H + 28, 26, DARK_CHIP);
      chip(ctx, cx - W / 2, cy - H / 2, W * v, H, 18, v > 0.5 ? TEAL : v > 0.32 ? AMBER : CORAL, false);
      ctx.fillStyle = shade(0.45);
      for (let k = 1; k < 10; k++) ctx.fillRect(cx - W / 2 + (W * k) / 10 - 1.5, cy - H / 2, 3, H);
      ctx.restore();
      if (o.small) tag(ctx, o.small, cx, cy + 112, popIn(local, 0.5, 0.4), DARK_CHIP, SNOW, 40);
      break;
    }
    case "warning": {
      // An amber-edged card that breathes, a hazard band along its top, a warning sign beside the words.
      const p = popIn(local, 0, 0.5);
      const W = fitRoom(1060);
      const H = o.small ? 340 : 260;
      const breathe = 0.5 + 0.5 * Math.sin(local * 4);
      ctx.save();
      ctx.globalAlpha = out * clamp01(p * 2);
      ctx.translate(cx, cy);
      ctx.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p);
      ctx.save();
      ctx.shadowColor = `rgba(255,194,75,${0.3 + 0.35 * breathe})`;
      ctx.shadowBlur = 60;
      chip(ctx, -W / 2, -H / 2, W, H, 28, shade(0.95), false);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-W / 2, -H / 2, W, H, 28);
      ctx.clip();
      ctx.fillStyle = AMBER;
      ctx.fillRect(-W / 2, -H / 2, W, 40);
      ctx.fillStyle = P_BG;
      const slide = (local * 60) % 60;
      for (let x = -W / 2 - 60 + slide; x < W / 2 + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, -H / 2);
        ctx.lineTo(x + 28, -H / 2);
        ctx.lineTo(x + 8, -H / 2 + 40);
        ctx.lineTo(x - 20, -H / 2 + 40);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(-W / 2, -H / 2, W, H, 28);
      ctx.stroke();
      // The sign.
      const sx = -W / 2 + 120;
      const sy = 22;
      ctx.fillStyle = AMBER;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 70);
      ctx.lineTo(sx + 74, sy + 58);
      ctx.lineTo(sx - 74, sy + 58);
      ctx.closePath();
      ctx.lineJoin = "round";
      ctx.lineWidth = 16;
      ctx.strokeStyle = AMBER;
      ctx.stroke();
      ctx.fill();
      ctx.fillStyle = P_BG;
      ctx.fillRect(sx - 7, sy - 32, 14, 54);
      ctx.beginPath();
      ctx.arc(sx, sy + 38, 9, 0, Math.PI * 2);
      ctx.fill();
      fitText(ctx, o.text, 70, o.small ? -10 : 22, 70, W - 300, SNOW, TB);
      if (o.small) fitText(ctx, o.small, 70, 92, 44, W - 300, AMBER, TB);
      ctx.restore();
      break;
    }
    case "pin": {
      const p = popIn(local, 0.05, 0.45);
      ctx.font = `66px ${TB}`;
      const tw = ctx.measureText(o.text).width;
      ctx.font = `40px ${TB}`;
      const sw = o.small ? ctx.measureText(o.small).width : 0;
      const w = Math.max(tw, sw) + 170;
      const h = o.small ? 184 : 126;
      const fit = Math.min(1, fitRoom(w) / w);
      ctx.save();
      ctx.globalAlpha = out * clamp01(p * 2);
      ctx.translate(cx, cy);
      ctx.scale((0.8 + 0.2 * p) * fit, (0.8 + 0.2 * p) * fit);
      chip(ctx, -w / 2, -h / 2, w, h, 28, DARK_CHIP);
      const mx = -w / 2 + 72;
      ctx.fillStyle = CORAL;
      ctx.beginPath();
      ctx.arc(mx, -14, 28, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(mx, 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SNOW;
      ctx.beginPath();
      ctx.arc(mx, -14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = "left";
      ctx.font = `66px ${TB}`;
      ctx.fillStyle = SNOW;
      ctx.fillText(o.text, mx + 60, o.small ? -26 : 4);
      if (o.small) {
        ctx.font = `40px ${TB}`;
        ctx.fillStyle = TEAL;
        ctx.fillText(o.small, mx + 60, 48);
      }
      ctx.restore();
      break;
    }
    case "type": {
      const gs = graphemes(o.text);
      const shown = Math.floor(gs.length * clamp01((local - 0.15) / Math.max(1, Math.min(2.2, gs.length * 0.07))));
      ctx.font = `80px ${TB}`;
      const full = ctx.measureText(o.text).width;
      const fit = Math.min(1, fitRoom(900, 128) / full);
      const p = rise(local, 0, 0.35);
      ctx.save();
      ctx.globalAlpha = out * p;
      ctx.translate(cx, cy + 20 * (1 - p));
      ctx.scale(fit, fit);
      chip(ctx, -full / 2 - 64, -78, full + 128, 156, 26, DARK_CHIP);
      chip(ctx, -full / 2 - 64, -78, 14, 156, 7, TEAL, false);
      const part = gs.slice(0, shown).join("");
      ctx.textAlign = "left";
      ctx.fillStyle = SNOW;
      ctx.fillText(part, -full / 2, 6);
      if (Math.floor(local * 2.2) % 2 === 0 || shown < gs.length) {
        ctx.fillStyle = TEAL;
        ctx.fillRect(-full / 2 + ctx.measureText(part).width + 10, -40, 7, 80);
      }
      ctx.restore();
      break;
    }
    case "morph": {
      // The first words get struck through in coral and drop away; the answer pops up in teal.
      const at = morphAt(l) - l.start;
      const a = rise(local, 0, 0.35) * (1 - rise(local, at, 0.35));
      const strike = easeOut(clamp01((local - (at - 0.5)) / 0.35));
      if (a > 0) {
        ctx.save();
        ctx.globalAlpha = out * a;
        ctx.translate(0, 30 * rise(local, at, 0.35));
        const w = boxText(ctx, o.from, cx, cy, 92, DARK_CHIP, SNOW);
        chip(ctx, cx - w / 2 + 30, cy - 5, (w - 60) * strike, 12, 6, CORAL, false);
        ctx.restore();
      }
      const b = popIn(local, at, 0.45);
      if (b > 0) {
        ctx.save();
        ctx.globalAlpha = out * clamp01(b * 2);
        ctx.translate(cx, cy);
        ctx.scale(0.8 + 0.2 * b, 0.8 + 0.2 * b);
        boxText(ctx, o.to, 0, 0, 92, TEAL, P_BG);
        ctx.restore();
      }
      break;
    }
    case "word": {
      // The Tamil word on a cream index card, an arrow drawing across, the English word flipping in on a highlighter-yellow card.
      const at = wordAt(l) - l.start;
      const H = 220;
      ctx.font = `96px ${SH}`;
      const wl = Math.max(ctx.measureText(o.ta).width + 120, 360);
      ctx.font = `104px ${SH}`;
      const wr = Math.max(ctx.measureText(o.en).width + 120, 360);
      ctx.font = `34px ${TB}`;
      const vw = o.via ? ctx.measureText(o.via).width + 60 : 0;
      const gap = Math.max(200, vw + 40);
      const total = wl + gap + wr;
      const fit = Math.min(1, fitRoom(1300) / total);
      const [labL, labR] = o.label ?? ["தமிழ்", "English"];
      const x0 = -total / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      const card = (x: number, w: number, text: string, size: number, fill: string, label: string, labelFill: string, labelInk: string) => {
        chip(ctx, x - w / 2, -H / 2, w, H, 30, fill);
        ctx.fillStyle = P_BG;
        ctx.font = `${size}px ${SH}`;
        ctx.textAlign = "center";
        ctx.fillText(text, x, 16, w - 60);
        tag(ctx, label, x, -H / 2, 1, labelFill, labelInk, 30);
      };
      const pL = popIn(local, 0.05, 0.45);
      if (pL > 0) {
        ctx.save();
        ctx.globalAlpha = out * clamp01(pL * 2);
        ctx.translate(x0 + wl / 2, 0);
        ctx.scale(0.85 + 0.15 * pL, 0.85 + 0.15 * pL);
        card(0, wl, o.ta, 96, "#FFF8EA", labL, CORAL, SNOW);
        ctx.restore();
      }
      // The arrow: a dashed red line drawing itself to the right, then its head.
      const q = rise(local, 0.35, Math.max(0.3, at - 0.45));
      if (q > 0) {
        const a0 = x0 + wl + 22;
        const a1 = a0 + (gap - 44) * q;
        ctx.save();
        ctx.strokeStyle = CORAL;
        ctx.fillStyle = CORAL;
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        ctx.setLineDash([22, 16]);
        ctx.beginPath();
        ctx.moveTo(a0, 0);
        ctx.lineTo(a1 - 16, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(a1, 0);
        ctx.lineTo(a1 - 26, -20);
        ctx.lineTo(a1 - 26, 20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (o.via) tag(ctx, o.via, x0 + wl + gap / 2, -70, popIn(local, 0.5, 0.4), DARK_CHIP, SNOW, 34);
      }
      const pR = clamp01((local - at) / 0.5);
      if (pR > 0) {
        ctx.save();
        ctx.globalAlpha = out * clamp01(pR * 3);
        ctx.translate(x0 + wl + gap + wr / 2, 0);
        ctx.scale(Math.max(0.02, easeOutBack(pR)), 1);
        card(0, wr, o.en, 104, TEAL, labR, P_BG, SNOW);
        ctx.restore();
      }
      ctx.restore();
      if (o.small) tag(ctx, o.small, cx, cy + (H / 2) * fit + 70, popIn(local, at + 0.35, 0.4), DARK_CHIP, SNOW, 40);
      break;
    }
    case "stamp": {
      // A coral sticker slapped on, a little tilted.
      const p = clamp01(local / 0.28);
      const sc = 1.5 - 0.5 * easeOut(p);
      ctx.save();
      ctx.globalAlpha = out * clamp01(p * 3);
      ctx.translate(cx, cy);
      ctx.rotate(-0.05);
      ctx.scale(sc, sc);
      boxText(ctx, o.text, 0, 0, 108, CORAL, SNOW);
      ctx.restore();
      if (o.small) tag(ctx, o.small, cx, cy + 130, popIn(local, 0.3, 0.4), DARK_CHIP, SNOW, 40);
      break;
    }
  }
  ctx.restore();
  return true;
}

/** The subtitle in the pulse look: a dark bar, each word lighting up teal as it is said. */
function drawPulseSubtitle(ctx: SKRSContext2D, sub: { text: string; from: number; to: number }, t: number, cx: number, maxW: number) {
  ctx.font = `${F.subSize}px ${TB}`;
  ctx.textBaseline = "middle";
  const words = sub.text.split(" ");
  const space = ctx.measureText(" ").width;
  const widths = words.map((w) => ctx.measureText(w).width);
  const rows: number[][] = [[]];
  let rowW = 0;
  words.forEach((_, i) => {
    const add = (rows[rows.length - 1].length ? space : 0) + widths[i];
    if (rowW + add > maxW && rows[rows.length - 1].length) {
      rows.push([i]);
      rowW = widths[i];
    } else {
      rows[rows.length - 1].push(i);
      rowW += add;
    }
  });
  const rowWidth = (r: number[]) => r.reduce((s, i) => s + widths[i], 0) + space * (r.length - 1);
  const letters = words.reduce((s, w) => s + w.length, 0);
  let acc = 0;
  const starts = words.map((w) => {
    const at = sub.from + ((sub.to - sub.from) * acc) / letters;
    acc += w.length;
    return at;
  });
  let current = -1;
  starts.forEach((s, i) => {
    if (t >= s) current = i;
  });
  if (t > sub.to) current = words.length;
  const rowH = F.subSize * 1.3;
  const barW = Math.max(...rows.map(rowWidth)) + 64;
  const barH = rows.length * rowH + 26;
  const bottom = F.subY + rowH / 2 + 13;
  chip(ctx, cx - barW / 2, bottom - barH, barW, barH, 22, shade(0.8));
  rows.forEach((r, ri) => {
    let x = cx - rowWidth(r) / 2;
    const y = bottom - barH + 13 + rowH * (ri + 0.5) + 3;
    for (const i of r) {
      ctx.textAlign = "left";
      ctx.fillStyle = i === current ? TEAL : i < current ? SNOW : "rgba(247,247,242,0.55)";
      ctx.fillText(words[i], x, y);
      x += widths[i] + space;
    }
  });
}

function drawOverlay(ctx: SKRSContext2D, l: Timed, t: number, cx: number, cy: number) {
  if (STORY && drawStoryOverlay(ctx, l, t, cx, cy)) return;
  if (PULSE && drawPulseOverlay(ctx, l, t, cx, cy)) return;
  const o = l.overlay!;
  const local = t - l.start;
  const dur = l.end - l.start;
  const out = clamp01((l.end + 0.35 - t) / 0.3);
  if (out <= 0 || local < 0) return;
  ctx.save();
  ctx.globalAlpha = out;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  switch (o.kind) {
    case "title": {
      if (o.small) {
        const p = easeOutBack((local - 0.05) / 0.35);
        ctx.save();
        ctx.translate(cx, cy - 115);
        ctx.scale(p, p);
        pill(ctx, o.small, 0, 0, 40, YELLOW, INK);
        ctx.restore();
      }
      // Word by word, rising into place.
      ctx.font = `100px ${TB}`;
      const words = o.text.split(" ");
      const widths = words.map((w) => ctx.measureText(w).width);
      const space = ctx.measureText(" ").width;
      const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
      const fit = Math.min(1, 1050 / total);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      let x = -total / 2;
      words.forEach((w, i) => {
        const p = easeOutBack((local - 0.15 - i * 0.12) / 0.4);
        if (p > 0) {
          ctx.save();
          ctx.globalAlpha = out * clamp01(p * 2);
          ctx.translate(x + widths[i] / 2, 40 * (1 - p));
          ctx.textAlign = "center";
          outlined(ctx, w, 0, 0, "#fff", 16);
          ctx.restore();
        }
        x += widths[i] + space;
      });
      // An underline drawing itself.
      const u = easeOut((local - 0.3) / 0.5);
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.roundRect(-total / 2, 70, total * u, 14, 7);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "year": {
      if (o.label) {
        const p = easeOutBack(local / 0.35);
        ctx.save();
        ctx.translate(cx, cy - 130);
        ctx.scale(p, p);
        pill(ctx, o.label, 0, 0, 42, "#fff", INK);
        ctx.restore();
      }
      const c = easeOut((local - 0.15) / YEAR_COUNT);
      const value = Math.round(o.value * c);
      const pop = 1 + 0.12 * Math.max(0, 1 - Math.abs(local - 0.15 - YEAR_COUNT) / 0.25);
      if (o.ruler) {
        // A measuring stick growing up beside the number.
        const h = 380 * c;
        const x0 = cx - 560;
        ctx.fillStyle = YELLOW;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(x0, cy + 200 - h, 54, h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = INK;
        for (let y = cy + 200 - 40; y > cy + 200 - h; y -= 40) ctx.fillRect(x0, y, 26, 5);
        ctx.font = `60px ${EMOJI}`;
        ctx.fillText("⬆️", x0 + 27, cy + 160 - h);
      }
      ctx.save();
      ctx.translate(cx, cy + 20);
      ctx.scale(pop, pop);
      // Big counts with Indian commas (1,50,000); years and small numbers as they are.
      const shown = o.value >= 10_000 ? value.toLocaleString("en-IN") : String(value);
      bigText(ctx, `${o.prefix ?? ""}${shown}${o.suffix ?? ""}`, 0, 0, 170, 1050, YELLOW);
      ctx.restore();
      break;
    }
    case "card": {
      // The pointer glides in from the host's side and clicks; the card pops open.
      const glide = easeInOut(local / CLICK_AT);
      const px = cx + 520 + (30 - 520) * glide;
      const py = cy + 360 + (30 - 360) * glide;
      const press = clamp01(1 - Math.abs(local - CLICK_AT) / 0.12);
      const p = easeOutBack((local - CLICK_AT) / 0.4);
      if (p > 0) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(p, p);
        ctx.font = `76px ${TB}`;
        const tw = ctx.measureText(o.text).width;
        ctx.font = `40px ${TS}`;
        const sw = o.small ? ctx.measureText(o.small).width : 0;
        const w = Math.max(tw, sw) + (o.icon ? 230 : 110);
        const h = o.small ? 230 : 170;
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#fffaf0";
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 34);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 7;
        ctx.stroke();
        // A coloured strip down the left edge.
        ctx.fillStyle = YELLOW;
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 14, -h / 2 + 14, 18, h - 28, 9);
        ctx.fill();
        let x = -w / 2 + 60;
        if (o.icon) {
          ctx.font = `90px ${TB}`;
          ctx.textAlign = "center";
          ctx.fillText(o.icon, x + 60, 6);
          x += 130;
        }
        ctx.textAlign = "left";
        ctx.fillStyle = INK;
        ctx.font = `76px ${TB}`;
        ctx.fillText(o.text, x, o.small ? -30 : 6);
        if (o.small) {
          ctx.font = `40px ${TS}`;
          ctx.fillStyle = "#6b5a2e";
          ctx.fillText(o.small, x, 52);
        }
        ctx.restore();
      }
      ripple(ctx, cx + 30, cy + 30, (local - CLICK_AT) / 0.45);
      const gone = clamp01((local - CLICK_AT - 0.5) / 0.3);
      if (gone < 1) {
        ctx.globalAlpha = out * (1 - gone);
        cursor(ctx, px, py, press);
      }
      break;
    }
    case "list": {
      const times = listTimes(l);
      ctx.font = `56px ${TB}`;
      const ws = o.items.map((it) => ctx.measureText(it).width + 80);
      const gap = 30;
      const rowW = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      const asRow = rowW <= 1080;
      o.items.forEach((item, i) => {
        const p = easeOutBack((t - times[i]) / 0.35);
        if (p <= 0) return;
        const x = asRow ? cx - rowW / 2 + ws.slice(0, i).reduce((a, b) => a + b + gap, 0) + ws[i] / 2 : cx;
        const y = asRow ? cy : cy + (i - (o.items.length - 1) / 2) * 120;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(p, p);
        ctx.rotate((i % 2 ? 1 : -1) * 0.02);
        pill(ctx, item, 0, 0, 56, i === o.items.length - 1 && t > times[i] + 0.4 ? YELLOW : "#fff", INK);
        ctx.restore();
      });
      break;
    }
    case "cta": {
      const clicks = ctaClicks(l);
      if (o.text) {
        const p = easeOutBack((local - 0.05) / 0.35);
        ctx.save();
        ctx.translate(cx, cy - 140);
        ctx.scale(p, p);
        bigText(ctx, o.text, 0, 0, 84, 1050, "#fff");
        ctx.restore();
      }
      ctx.font = `54px ${TB}`;
      const looks = o.buttons.map((b, i) => (t >= clicks[i] ? CTA_LOOK[b].on : CTA_LOOK[b].off));
      const ws = o.buttons.map((b) => (b === "bell" ? 110 : Math.max(ctx.measureText(CTA_LOOK[b].off[0]).width, ctx.measureText(CTA_LOOK[b].on[0]).width) + 80));
      const gap = 34;
      const rowW = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
      const xs = ws.map((w, i) => cx - rowW / 2 + ws.slice(0, i).reduce((a, b) => a + b + gap, 0) + w / 2);
      const y = cy + 40;
      o.buttons.forEach((b, i) => {
        const p = easeOutBack((local - 0.2 - i * 0.15) / 0.35);
        if (p <= 0) return;
        const bump = 1 + 0.18 * clamp01(1 - Math.abs(t - clicks[i] - 0.08) / 0.15);
        ctx.save();
        ctx.translate(xs[i], y);
        ctx.scale(p * bump, p * bump);
        if (b === "bell") ctx.rotate(t > clicks[i] ? 0.35 * Math.sin((t - clicks[i]) * 25) * clamp01(1 - (t - clicks[i]) / 0.9) : 0);
        const [text, bg, fg] = looks[i];
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 20;
        ctx.fillStyle = bg;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(-ws[i] / 2, -50, ws[i], 100, 50);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.fillStyle = fg;
        ctx.font = b === "bell" ? `58px ${EMOJI}` : `54px ${TB}`;
        ctx.textAlign = "center";
        ctx.fillText(text, 0, 5);
        ctx.restore();
        ripple(ctx, xs[i], y, (t - clicks[i]) / 0.45);
      });
      // The pointer goes from button to button.
      const k = clicks.findIndex((c) => t < c + 0.15);
      const target = k < 0 ? clicks.length - 1 : k;
      const fromX = target > 0 ? xs[target - 1] : cx + 600;
      const fromY = target > 0 ? y : cy + 380;
      const startMove = target > 0 ? clicks[target - 1] + 0.15 : l.start + 0.3;
      const g = easeInOut((t - startMove) / Math.max(0.2, clicks[target] - startMove));
      const gone = clamp01((t - clicks[clicks.length - 1] - 0.5) / 0.3);
      if (gone < 1) {
        ctx.globalAlpha = out * (1 - gone);
        cursor(ctx, fromX + (xs[target] - fromX) * g + 10, fromY + (y - fromY) * g + 10, clamp01(1 - Math.abs(t - clicks[target]) / 0.12));
      }
      break;
    }
    case "pin": {
      ctx.font = `66px ${TB}`;
      const tw = ctx.measureText(o.text).width;
      ctx.font = `38px ${TS}`;
      const sw = o.small ? ctx.measureText(o.small).width : 0;
      const w = Math.max(tw, sw) + 80;
      const h = o.small ? 190 : 130;
      const total = 130 + w;
      const px = cx - total / 2 + 50;
      // The pin falls and bounces on the spot.
      const fall = easeOutBack((local - 0.1) / 0.4);
      const py = cy + 40 - 500 * (1 - fall);
      if (fall > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(px, cy + 62, 34 * fall, 10 * fall, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle = "#e53935";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.bezierCurveTo(-60, -40, -46, -120, 0, -120);
        ctx.bezierCurveTo(46, -120, 60, -40, 0, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, -72, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const p = easeOutBack((local - 0.45) / 0.35);
      if (p > 0) {
        ctx.save();
        ctx.translate(px + 70, cy - 30);
        ctx.scale(p, p);
        ctx.fillStyle = "#fffaf0";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(0, -h / 2, w, h, 28);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = INK;
        ctx.font = `66px ${TB}`;
        ctx.fillText(o.text, 40, o.small ? -22 : 4);
        if (o.small) {
          ctx.font = `38px ${TS}`;
          ctx.fillStyle = "#6b5a2e";
          ctx.fillText(o.small, 40, 46);
        }
        ctx.restore();
      }
      break;
    }
    case "morph": {
      // The first word, a flip like a card turning over, then the second in yellow.
      const at = morphAt(l) - l.start;
      const flip = clamp01((local - at + 0.15) / 0.3);
      const sy = Math.abs(Math.cos(flip * Math.PI));
      const text = flip < 0.5 ? o.from : o.to;
      const p = easeOutBack(local / 0.35);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(p, p * Math.max(0.02, sy));
      bigText(ctx, text, 0, 0, 120, 1050, flip < 0.5 ? "#fff" : YELLOW);
      ctx.restore();
      if (flip >= 1 && !CLEAN) {
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + local;
          ctx.font = `${50 + 20 * Math.abs(Math.sin(local * 4 + k))}px ${EMOJI}`;
          ctx.fillText("✨", cx + Math.cos(a) * 520, cy + Math.sin(a) * 120);
        }
      }
      break;
    }
    case "stamp": {
      // From big and see-through down onto the screen with a thump.
      const q = clamp01(local / STAMP_HIT);
      const sc = 2.4 - 1.4 * q * q;
      ctx.save();
      ctx.globalAlpha = out * (0.3 + 0.7 * q);
      ctx.translate(cx, cy);
      ctx.rotate(-0.06);
      ctx.scale(sc, sc);
      ctx.font = `120px ${TB}`;
      const w = Math.min(1000, ctx.measureText(o.text).width) + 90;
      ctx.strokeStyle = "#e53935";
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -95, w, o.small ? 280 : 190, 26);
      ctx.stroke();
      bigText(ctx, o.text, 0, 0, 120, 1000, YELLOW);
      if (o.small) bigText(ctx, o.small, 0, 115, 50, 900, "#fff");
      ctx.restore();
      break;
    }
    case "type": {
      const gs = graphemes(o.text);
      const shown = Math.floor(gs.length * clamp01((local - 0.1) / Math.max(0.8, Math.min(2, gs.length * 0.06))));
      ctx.font = `90px ${TB}`;
      const fit = Math.min(1, 1100 / ctx.measureText(o.text).width);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(fit, fit);
      const full = ctx.measureText(o.text).width;
      const part = gs.slice(0, shown).join("");
      ctx.textAlign = "left";
      // A dark strip behind, like a terminal line.
      ctx.fillStyle = "rgba(8,10,24,0.7)";
      ctx.beginPath();
      ctx.roundRect(-full / 2 - 40, -80, full + 110, 160, 24);
      ctx.fill();
      outlined(ctx, part, -full / 2, 4, "#fff", 12);
      if (Math.floor(local * 2.5) % 2 === 0 || shown < gs.length) {
        ctx.fillStyle = YELLOW;
        ctx.fillRect(-full / 2 + ctx.measureText(part).width + 10, -45, 10, 90);
      }
      ctx.restore();
      break;
    }
    case "route": {
      const a = { x: cx - 470, y: cy + 90 };
      const b = { x: cx + 470, y: cy + 90 };
      const c = { x: cx, y: cy - 230 };
      const at = (u: number) => ({ x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
      const p = easeInOut((local - 0.3) / Math.max(1.2, dur * 0.6));
      ctx.save();
      ctx.setLineDash([22, 18]);
      ctx.lineDashOffset = -local * 60;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let u = 0; u <= p; u += 0.01) {
        const q = at(u);
        if (u === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.restore();
      const lp = easeOutBack(local / 0.35);
      ctx.save();
      ctx.translate(a.x, a.y + 90);
      ctx.scale(lp, lp);
      pill(ctx, o.from, 0, 0, 46, "#fff", INK);
      ctx.restore();
      const bp = easeOutBack((local - 0.3 - Math.max(1.2, dur * 0.6)) / 0.35);
      if (bp > 0) {
        ctx.save();
        ctx.translate(b.x, b.y + 90);
        ctx.scale(bp, bp);
        pill(ctx, o.to, 0, 0, 46, YELLOW, INK);
        ctx.restore();
      }
      ctx.font = `100px ${EMOJI}`;
      const ship = at(p);
      ctx.fillText("⛵", ship.x, ship.y - 40 + 8 * Math.sin(local * 5));
      (o.icons ?? []).forEach((e, k) => {
        const u = p - 0.09 * (k + 1);
        if (u <= 0) return;
        const q = at(u);
        ctx.font = `70px ${EMOJI}`;
        ctx.fillText(e, q.x, q.y - 30 + 6 * Math.sin(local * 5 + k));
      });
      break;
    }
    case "warp": {
      ctx.fillStyle = `rgba(8,10,40,${0.6 * clamp01(local / 0.3)})`;
      // Past the frame's edges: a narrow frame draws this overlay scaled down.
      ctx.fillRect(-F.w, -F.h, F.w * 3, F.h * 3);
      ctx.save();
      ctx.translate(cx, cy);
      // Rings rushing out, streaks flying past: the feeling of going back in time.
      for (let k = 0; k < 7; k++) {
        const r = ((local * 420 + k * 140) % 980) + 10;
        ctx.strokeStyle = `rgba(${k % 2 ? "255,212,0" : "90,200,255"},${0.7 * (1 - r / 990)})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let k = 0; k < 36; k++) {
        const ang = hash(k) * Math.PI * 2;
        const d = ((local * 900 * (0.6 + hash(k + 50)) + hash(k + 99) * 900) % 1000) + 80;
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * d, Math.sin(ang) * d);
        ctx.lineTo(Math.cos(ang) * (d + 90), Math.sin(ang) * (d + 90));
        ctx.stroke();
      }
      ctx.rotate(-local * 4);
      ctx.font = `200px ${EMOJI}`;
      ctx.fillText("🕰️", 0, 0);
      ctx.restore();
      const p = easeOutBack((local - 0.3) / 0.4);
      if (p > 0) {
        ctx.save();
        ctx.translate(cx, cy + 220);
        ctx.scale(p, p);
        bigText(ctx, o.text, 0, 0, 90, 1000, YELLOW);
        ctx.restore();
      }
      break;
    }
    case "comment": {
      const p = easeOutBack(local / 0.35);
      const gs = graphemes(o.text);
      const shown = gs.slice(0, Math.floor(gs.length * clamp01((local - 0.4) / Math.max(1, dur - 1.2)))).join("");
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(p, p);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(-520, -110, 1040, 220, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(-420, 0, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `70px ${EMOJI}`;
      ctx.fillText("🙂", -420, 4);
      ctx.textAlign = "left";
      ctx.fillStyle = "#777";
      ctx.font = `36px ${TS}`;
      ctx.fillText("நீங்க · இப்போ", -330, -50);
      ctx.fillStyle = INK;
      ctx.font = `54px ${TB}`;
      ctx.fillText(shown, -330, 22);
      if (Math.floor(local * 2.5) % 2 === 0) ctx.fillRect(-330 + ctx.measureText(shown).width + 6, -8, 6, 60);
      const h = easeOutBack((local - dur + 0.4) / 0.3);
      if (h > 0) {
        ctx.font = `${80 * h}px ${EMOJI}`;
        ctx.fillText("❤️", 420, 60);
      }
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

/** Confetti over the whole screen for a moment after `at`. */
function drawConfetti(ctx: SKRSContext2D, seed: number, local: number) {
  if (local < 0 || local > 3) return;
  const colours = ["#FFD400", "#ff5a5f", "#3EE8FF", "#7CFC6B", "#ff9f1c", "#c77dff"];
  ctx.save();
  ctx.globalAlpha = clamp01((3 - local) / 0.6);
  for (let i = 0; i < 110; i++) {
    const r = (k: number) => hash(seed * 1000 + i * 7 + k);
    const x = r(1) * F.w + Math.sin(local * 3 + i) * 40;
    const y = -60 - r(2) * 400 + local * (380 + r(3) * 380);
    if (y > F.h + 40) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(local * (4 + r(4) * 6) + i);
    ctx.fillStyle = colours[i % colours.length];
    ctx.fillRect(-9, -5, 18, 10);
    ctx.restore();
  }
  ctx.restore();
}

/** A line's subtitle in pieces of a few words, each shown for its share of the line. */
function subtitleAt(lines: Timed[], t: number): { text: string; line: Timed; from: number; to: number } | null {
  const line = lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.25);
  if (!line) return null;
  const words = (line.sub ?? line.tamil).split(/\s+/);
  const chunks: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    cur.push(w);
    const len = cur.join(" ").length;
    if (len > 52 || (len > 26 && /[,.!?…]$/.test(w))) {
      chunks.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur.join(" "));
  const total = chunks.reduce((s, c) => s + c.length, 0);
  let at = line.start;
  for (const c of chunks) {
    const end = at + ((line.end - line.start) * c.length) / total;
    if (t < end) return { text: c, line, from: at, to: end };
    at = end;
  }
  const last = chunks[chunks.length - 1];
  return { text: last, line, from: line.end - ((line.end - line.start) * last.length) / total, to: line.end };
}

function drawSubtitle(ctx: SKRSContext2D, text: string, cx: number, maxW: number) {
  ctx.font = STORY ? `${F.subSize}px ${SS}` : `${F.subSize}px ${TS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const rows: string[] = [""];
  for (const w of text.split(" ")) {
    const tryRow = rows[rows.length - 1] ? `${rows[rows.length - 1]} ${w}` : w;
    if (ctx.measureText(tryRow).width > maxW && rows[rows.length - 1]) rows.push(w);
    else rows[rows.length - 1] = tryRow;
  }
  const row = F.subSize * 1.23;
  const top = F.subY - (rows.length - 1) * row;
  if (STORY) {
    // A thin dark edge and a soft shadow: easy to read, no cartoon outline.
    rows.forEach((r, i) => {
      ctx.lineJoin = "round";
      ctx.lineWidth = 7;
      ctx.strokeStyle = "rgba(5,8,20,0.7)";
      ctx.strokeText(r, cx, top + i * row);
      softText(ctx, r, cx, top + i * row, CREAM, 14);
    });
    return;
  }
  rows.forEach((r, i) => outlined(ctx, r, cx, top + i * row, "#fff", 12));
}

// ─── The frame ────────────────────────────────────────────────────────────────

export async function framePainter(b: Built, height: number, frame: Frame = WIDE) {
  F = frame;
  STORY = b.video.look === "story";
  FEED = b.video.look === "feed";
  NIGHT = b.video.look === "night";
  PAPER = b.video.look === "paper";
  PULSE = b.video.look === "pulse" || FEED || NIGHT || PAPER;
  usePalette(b.video.look);
  CLEAN = !!b.video.clean || STORY || PULSE;
  loadTamilFonts();
  const pictures = await loadPictures(b.video);
  const host = await loadHost();
  const scale = height / F.h;
  const width = Math.round(F.w * scale);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const voiceWav = wavOf(b.voice, RATE);
  const talk = talkEnvelope(voiceWav, FPS, b.duration);
  const CHAPTER_GAP = b.video.chapterGap ?? CHAPTER_GAP_DEFAULT;
  // A countdown shows each chapter by its rank: the last chapter is number 1.
  const chapterCount = b.lines.filter((l) => l.chapter).length;
  const rankOf = (no: number) => (b.video.countdown ? chapterCount - no + 1 : no);

  // Stretches of the same picture; a line with several pictures shares its time among them.
  const shows: Array<{ key: string; at: number }> = [];
  for (const l of b.lines) {
    const keys = Array.isArray(l.visual) ? l.visual : [l.visual];
    const from = l.chapter ? l.start - CHAPTER_GAP : l.start;
    keys.forEach((key, i) => shows.push({ key, at: i === 0 ? from : l.start + ((l.end - l.start) * i) / keys.length }));
  }
  const stretches: Array<{ key: string; from: number; to: number }> = [];
  for (const s of shows) {
    const last = stretches[stretches.length - 1];
    if (last && last.key === s.key) continue;
    if (last) last.to = s.at;
    stretches.push({ key: s.key, from: stretches.length ? s.at : 0, to: b.duration });
  }
  // The host's place over time: 0 big, 1 in the corner.
  const moves: Array<{ at: number; to: number }> = [];
  for (const l of b.lines) if (l.host) moves.push({ at: l.start, to: l.host === "big" ? 0 : 1 });
  const hostMode = (t: number) => {
    let mode = 0;
    for (const m of moves) {
      if (t < m.at) break;
      mode = mode + (m.to - mode) * clamp01((t - m.at) / 0.9);
    }
    return mode;
  };
  const chapterOf = (t: number) => {
    let c: { no: number; name: string } | null = null;
    for (const l of b.lines) if (l.chapter && t >= l.start - CHAPTER_GAP) c = { no: l.chapterNo!, name: l.chapter };
    return c;
  };

  const paint = (f: number) => {
    const t = f / FPS;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, F.w, F.h);
    const line = b.lines.find((l) => t >= l.start - 0.05 && t < l.end + 0.3);

    // A stamp landing shakes the whole picture for a moment.
    const hit = line?.overlay?.kind === "stamp" ? t - line.start - STAMP_HIT : -1;
    const quake = !CLEAN && hit >= 0 && hit < 0.35 ? 14 * (1 - hit / 0.35) : 0;
    ctx.save();
    if (quake) ctx.translate(quake * Math.sin(t * 90), quake * Math.cos(t * 70));

    // The pictures, crossfading over 0.7 s (1.2 s in the story look; sliding in, in the pulse look).
    const XF = STORY ? 1.2 : PAPER ? 0.75 : PULSE ? 0.55 : 0.7;
    const si = Math.max(0, stretches.findIndex((s) => t >= s.from && t < s.to));
    const st = stretches[si];
    const prog = (s: (typeof stretches)[number]) => clamp01((t - s.from + XF) / (s.to - s.from + 2 * XF));
    if (PULSE) {
      drawPulseBackdrop(ctx, t);
      const c = pulseCard();
      const u = si > 0 ? easeInOut(clamp01((t - st.from) / XF)) : 1;
      // Pulse slides the next picture in from the right; the feed swipes it up from below, like a Short; the night dissolves it in;
      // the paper look flips the taped photo over to the next one.
      if (PAPER) {
        const flip = (k: number, sx: number) => {
          const s = stretches[k];
          const mid = c.x + c.w / 2;
          ctx.save();
          ctx.translate(mid, 0);
          ctx.scale(Math.max(0.002, sx), 1);
          ctx.translate(-mid, 0);
          // The white photo border with its shadow on the page.
          chip(ctx, c.x - 14, c.y - 14, c.w + 28, c.h + 28, c.r + 8, "#FFFFFF");
          drawPulsePicture(ctx, pictures[s.key], s.key, prog(s), k, 0);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(c.x, c.y, c.w, c.h, c.r);
          ctx.clip();
          ctx.fillStyle = shade(0.18);
          ctx.fillRect(c.x, c.y, c.w, c.h);
          const low = ctx.createLinearGradient(0, c.y + c.h * 0.55, 0, c.y + c.h);
          low.addColorStop(0, shade(0));
          low.addColorStop(1, shade(0.5));
          ctx.fillStyle = low;
          ctx.fillRect(c.x, c.y, c.w, c.h);
          // While it turns, the far side darkens like a card catching less light.
          if (sx < 1) {
            ctx.fillStyle = shade(0.5 * (1 - sx));
            ctx.fillRect(c.x, c.y, c.w, c.h);
          }
          ctx.restore();
          // Two strips of tape holding the photo at its top corners.
          for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(side < 0 ? c.x + 40 : c.x + c.w - 40, c.y + 4);
            ctx.rotate(side * 0.62);
            ctx.fillStyle = "rgba(255,226,150,0.78)";
            ctx.fillRect(-85, -24, 170, 48);
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect(-85, -24, 170, 10);
            ctx.restore();
          }
          ctx.restore();
        };
        if (si > 0 && u < 0.5) flip(si - 1, 1 - easeInOut(u * 2));
        else flip(si, si > 0 ? easeOut((u - 0.5) * 2) : 1);
      } else if (NIGHT) {
        if (u < 1) drawPulsePicture(ctx, pictures[stretches[si - 1].key], stretches[si - 1].key, prog(stretches[si - 1]), si - 1, 0);
        ctx.save();
        ctx.globalAlpha = u;
        drawPulsePicture(ctx, pictures[st.key], st.key, prog(st), si, 0);
        ctx.restore();
      } else if (FEED) {
        if (u < 1) drawPulsePicture(ctx, pictures[stretches[si - 1].key], stretches[si - 1].key, prog(stretches[si - 1]), si - 1, 0, -u * c.h);
        drawPulsePicture(ctx, pictures[st.key], st.key, prog(st), si, 0, (1 - u) * c.h);
      } else {
        if (u < 1) drawPulsePicture(ctx, pictures[stretches[si - 1].key], stretches[si - 1].key, prog(stretches[si - 1]), si - 1, -u * c.w);
        drawPulsePicture(ctx, pictures[st.key], st.key, prog(st), si, (1 - u) * c.w);
      }
      // The paper look shades and frames its photo itself, inside the flip.
      if (!PAPER) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, c.r);
      ctx.clip();
      // The seam of a slide: a teal bar (a lime one across, in the feed).
      if (NIGHT) {
        // Night: the picture a little bluer, as if lit by the moon.
        ctx.fillStyle = "rgba(30,50,140,0.16)";
        ctx.fillRect(c.x, c.y, c.w, c.h);
      } else if (u < 1) {
        ctx.fillStyle = TEAL;
        if (FEED) ctx.fillRect(c.x, c.y + (1 - u) * c.h - 5, c.w, 10);
        else ctx.fillRect(c.x + (1 - u) * c.w - 7, c.y, 14, c.h);
      }
      // A little darker for the text on top, more towards the bottom.
      ctx.fillStyle = shade(0.26);
      ctx.fillRect(c.x, c.y, c.w, c.h);
      const low = ctx.createLinearGradient(0, c.y + c.h * 0.55, 0, c.y + c.h);
      low.addColorStop(0, shade(0));
      low.addColorStop(1, shade(0.55));
      ctx.fillStyle = low;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.restore();
      if (NIGHT) {
        // The screen's edge: moonlight gold fading into indigo.
        const edge = ctx.createLinearGradient(c.x + c.w, c.y, c.x, c.y + c.h);
        edge.addColorStop(0, `rgba(${ACCRGB},0.85)`);
        edge.addColorStop(0.5, "rgba(255,255,255,0.12)");
        edge.addColorStop(1, `rgba(${HOTRGB},0.8)`);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 3;
      } else if (FEED) {
        // The screen's edge glows violet into pink.
        const edge = ctx.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h);
        edge.addColorStop(0, "rgba(140,108,255,0.9)");
        edge.addColorStop(1, `rgba(${HOTRGB},0.9)`);
        ctx.strokeStyle = edge;
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = `rgba(${ACCRGB},0.55)`;
        ctx.lineWidth = 3;
      }
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, c.r);
      ctx.stroke();
      }
    } else {
      drawPicture(ctx, pictures[st.key], st.key, prog(st), si);
      const fadeIn = clamp01((t - st.from) / XF);
      if (si > 0 && fadeIn < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - easeInOut(fadeIn);
        drawPicture(ctx, pictures[stretches[si - 1].key], stretches[si - 1].key, prog(stretches[si - 1]), si - 1);
        ctx.restore();
      }
    }
    ctx.restore();
    // Darker at the bottom for the subtitles, and a little all over for the text (the pulse look darkens its screen itself).
    if (!PULSE) {
      ctx.fillStyle = STORY ? "rgba(6,14,34,0.3)" : "rgba(8,10,24,0.28)";
      ctx.fillRect(0, 0, F.w, F.h);
    }
    if (STORY) {
      // A soft vignette, like an old film.
      const vg = ctx.createRadialGradient(F.w / 2, F.h * 0.45, Math.min(F.w, F.h) * 0.35, F.w / 2, F.h * 0.45, Math.max(F.w, F.h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, F.w, F.h);
    }
    if (!PULSE) {
      const shade = ctx.createLinearGradient(0, F.shadeFrom, 0, F.h);
      shade.addColorStop(0, "rgba(8,10,24,0)");
      shade.addColorStop(1, "rgba(8,10,24,0.85)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, F.shadeFrom, F.w, F.h - F.shadeFrom);
    }

    const mode = hostMode(t);
    const areaX = F.areaX[0] + (F.areaX[1] - F.areaX[0]) * easeInOut(mode);

    // The chapter: a big card while it starts, then a badge at the top left.
    const ch = chapterOf(t);
    const chLine = ch && b.lines.find((l) => l.chapterNo === ch.no)!;
    const cardT = chLine ? t - (chLine.start - CHAPTER_GAP) : 99;
    const num = ch ? String(rankOf(ch.no)).padStart(2, "0") : "";
    const clockNow = chLine?.clock;
    if (ch && NIGHT && cardT < CHAPTER_GAP + 0.4) {
      // The night sky closes over the screen; a big glowing clock fast-forwards from the last chapter's time to this one's.
      const fadeIn = easeOut(clamp01(cardT / 0.35));
      const fadeOut = easeInOut(clamp01((cardT - CHAPTER_GAP) / 0.4));
      const vis = fadeIn * (1 - fadeOut);
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.fillStyle = shade(0.86);
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.restore();
      const prevClock = b.lines.find((l) => l.chapterNo === ch.no - 1)?.clock;
      const to = clockNow ? clockMinutes(clockNow.time) : null;
      const from = prevClock ? clockMinutes(prevClock.time) : null;
      let shown = clockNow?.time ?? num;
      let rolling = false;
      if (to !== null && from !== null && to !== from) {
        const u = easeInOut(clamp01((cardT - 0.25) / 0.95));
        shown = clockText(from + (((to - from + 720) % 720) * u));
        rolling = u > 0 && u < 1;
      }
      ctx.save();
      ctx.globalAlpha = vis;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // The label: the chapter number and the time of day, with a small moon before it.
      const lift = 30 * (1 - fadeIn);
      ctx.font = `44px ${TB}`;
      const label = `அத்தியாயம் ${num}${clockNow ? ` · ${clockNow.label}` : ""}`;
      const lw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(247,247,242,0.75)";
      ctx.fillText(label, areaX + 26, F.chapterY - 265 + lift);
      drawMoon(ctx, areaX - lw / 2 - 22, F.chapterY - 268 + lift, 20);
      // The time, each character in a cell of its own so the digits do not jiggle as they roll.
      const isTime = clockMinutes(shown) !== null;
      ctx.shadowColor = `rgba(${ACCRGB},0.65)`;
      ctx.shadowBlur = rolling ? 70 : 45;
      ctx.fillStyle = TEAL;
      if (isTime) {
        ctx.font = `250px ${TB}`;
        const cell = ctx.measureText("0").width * 1.02;
        const chars = [...shown];
        const widths = chars.map((c) => (c === ":" ? cell * 0.55 : cell));
        let x = areaX - widths.reduce((a, b2) => a + b2, 0) / 2;
        chars.forEach((c, i) => {
          // The colon blinks once the clock has stopped.
          const blink = c === ":" && !rolling && Math.floor(cardT * 2) % 2 === 1 ? 0.25 : 1;
          ctx.globalAlpha = vis * blink;
          ctx.fillText(c, x + widths[i] / 2, F.chapterY - 105 + lift);
          x += widths[i];
        });
      } else {
        // Words (e.g. "30 நாள்") in one piece, so Tamil letters keep their vowel signs.
        ctx.font = `190px ${TB}`;
        ctx.fillText(shown, areaX, F.chapterY - 105 + lift);
      }
      ctx.restore();
      ctx.save();
      const p = rise(cardT, 0.45, 0.6);
      ctx.globalAlpha = vis * p;
      // Kept inside the frame wherever the text area is centred.
      fitText(ctx, ch.name, areaX, F.chapterY + 85 + 20 * (1 - p), 100, Math.min(1300, 2 * Math.min(areaX, F.w - areaX) - 120), SNOW, TB);
      const u2 = rise(cardT, 0.6, 0.8);
      const g = ctx.createLinearGradient(areaX - 260, 0, areaX + 260, 0);
      g.addColorStop(0, `rgba(${HOTRGB},0)`);
      g.addColorStop(0.5, TEAL);
      g.addColorStop(1, `rgba(${HOTRGB},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(areaX - 260 * u2, F.chapterY + 160, 520 * u2, 5);
      ctx.restore();
    } else if (ch && NIGHT) {
      // The badge: the story's time in gold, then the chapter's name.
      const p = easeOut(clamp01((cardT - CHAPTER_GAP - 0.3) / 0.5));
      const time = clockNow?.time ?? num;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(48 - 40 * (1 - p), F.h > F.w ? F.badgeY : 22);
      ctx.font = `32px ${TB}`;
      const tw = ctx.measureText(time).width + 40;
      ctx.font = `34px ${TB}`;
      const w = tw + ctx.measureText(ch.name).width + 44;
      chip(ctx, 0, 0, w, 58, 29, DARK_CHIP, false);
      ctx.save();
      ctx.shadowColor = `rgba(${ACCRGB},0.5)`;
      ctx.shadowBlur = 16;
      chip(ctx, 0, 0, tw, 58, 29, TEAL, false);
      ctx.restore();
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = P_BG;
      ctx.font = `32px ${TB}`;
      ctx.fillText(time, tw / 2, 31);
      ctx.textAlign = "left";
      ctx.fillStyle = SNOW;
      ctx.font = `34px ${TB}`;
      ctx.fillText(ch.name, tw + 22, 31);
      ctx.restore();
    } else if (ch && PAPER && cardT < CHAPTER_GAP + 0.4) {
      // A fresh notebook page slides up over everything, the chapter written on it and highlighted, then slides on up and away.
      const inU = easeInOut(clamp01(cardT / 0.55));
      const outU = easeInOut(clamp01((cardT - CHAPTER_GAP) / 0.45));
      const y = F.h * (1 - inU) - (F.h + 60) * outU;
      ctx.save();
      ctx.translate(0, y);
      ctx.save();
      ctx.shadowColor = "rgba(40,30,10,0.4)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = -10;
      ctx.fillStyle = PAPER_BG;
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.restore();
      drawPaper(ctx);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const half = Math.min(areaX, F.w - areaX) - edge();
      // The number, huge and faint behind.
      ctx.font = `460px ${SH}`;
      ctx.fillStyle = shade(0.07);
      ctx.fillText(num, areaX, F.chapterY - 10);
      const p = rise(cardT, 0.35, 0.5);
      ctx.globalAlpha = p;
      ctx.font = `50px ${SH}`;
      ctx.fillStyle = CORAL;
      ctx.fillText(b.video.countdown ? `நம்பர் ${rankOf(ch.no)}` : `அத்தியாயம் ${num}`, areaX, F.chapterY - 150 + 16 * (1 - p));
      ctx.font = `124px ${SH}`;
      const nameW = ctx.measureText(ch.name).width;
      const fit = Math.min(1, (2 * half) / (nameW + 60));
      ctx.save();
      ctx.translate(areaX, F.chapterY + 10 + 16 * (1 - p));
      ctx.scale(fit, fit);
      // The highlighter stroke, swept left to right behind the lower half of the words.
      const hl = rise(cardT, 0.6, 0.55);
      ctx.fillStyle = `rgba(${ACCRGB},0.75)`;
      ctx.beginPath();
      ctx.roundRect(-nameW / 2 - 30, 0, (nameW + 60) * hl, 62, 10);
      ctx.fill();
      ctx.fillStyle = P_BG;
      ctx.fillText(ch.name, 0, 0);
      ctx.restore();
      // A red pen underline.
      const u = rise(cardT, 0.8, 0.5);
      ctx.fillStyle = CORAL;
      ctx.fillRect(areaX - 240 * u, F.chapterY + 120, 480 * u, 6);
      ctx.restore();
    } else if (ch && FEED && cardT < CHAPTER_GAP + 0.4) {
      // A notification drops in over the dimmed screen: the app's icon with the chapter number, the chapter as its message.
      const inP = easeOutBack(clamp01(cardT / 0.5));
      const outP = easeInOut(clamp01((cardT - CHAPTER_GAP) / 0.4));
      ctx.save();
      ctx.globalAlpha = clamp01(cardT / 0.3) * (1 - outP);
      ctx.fillStyle = shade(0.6);
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.restore();
      const W = Math.min(F.w - 80, 1320);
      const H = 290;
      const x = (F.w - W) / 2;
      const y = F.chapterY - H / 2 + (-F.chapterY - H) * (1 - inP) - (F.chapterY + H) * outP;
      ctx.save();
      ctx.shadowColor = "rgba(140,108,255,0.45)";
      ctx.shadowBlur = 60;
      chip(ctx, x, y, W, H, 46, "rgba(28,22,56,0.97)", false);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, W, H, 46);
      ctx.stroke();
      // The icon.
      const icon = ctx.createLinearGradient(x + 40, y + 40, x + 210, y + 210);
      icon.addColorStop(0, "#8C6CFF");
      icon.addColorStop(1, CORAL);
      ctx.fillStyle = icon;
      ctx.beginPath();
      ctx.roundRect(x + 40, y + 60, 170, 170, 40);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = SNOW;
      ctx.font = `96px ${TB}`;
      ctx.fillText(num, x + 125, y + 150);
      // The header: who it is from, and when.
      ctx.textAlign = "left";
      ctx.font = `38px ${TB}`;
      ctx.fillStyle = "rgba(247,247,242,0.6)";
      ctx.fillText(`உலகம் இப்போ · இப்போ`, x + 250, y + 78);
      ctx.textAlign = "right";
      ctx.fillStyle = TEAL;
      ctx.fillText(b.video.countdown ? `நம்பர் ${rankOf(ch.no)}` : `அத்தியாயம் ${num}`, x + W - 44, y + 78);
      // The message.
      ctx.textAlign = "left";
      ctx.font = `92px ${TB}`;
      const room = W - 250 - 44;
      const fit = Math.min(1, room / ctx.measureText(ch.name).width);
      ctx.save();
      ctx.translate(x + 250, y + 180);
      ctx.scale(fit, fit);
      ctx.fillStyle = SNOW;
      ctx.fillText(ch.name, 0, 0);
      ctx.restore();
    } else if (ch && PULSE && cardT < CHAPTER_GAP + 0.4) {
      // A teal panel wipes across from the left, the chapter on it, and wipes off to the right.
      const inU = easeInOut(clamp01(cardT / 0.4));
      const outU = easeInOut(clamp01((cardT - CHAPTER_GAP) / 0.4));
      const x0 = F.w * outU;
      const x1 = F.w * inU;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, 0, x1 - x0, F.h);
      ctx.clip();
      ctx.fillStyle = TEAL;
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // The number, huge and faint behind.
      ctx.font = `560px ${TB}`;
      ctx.fillStyle = shade(0.1);
      ctx.fillText(num, areaX + 40 * (1 - rise(cardT, 0, 1.6)), F.chapterY);
      const p = rise(cardT, 0.25, 0.5);
      ctx.globalAlpha = p;
      ctx.font = `50px ${TB}`;
      ctx.fillStyle = P_BG;
      ctx.fillText(b.video.countdown ? `நம்பர் ${rankOf(ch.no)}` : `அத்தியாயம் ${num}`, areaX, F.chapterY - 130 + 20 * (1 - p));
      ctx.font = `130px ${TB}`;
      const fit = Math.min(1, Math.min(1400, F.w - 140) / ctx.measureText(ch.name).width);
      ctx.save();
      ctx.translate(areaX, F.chapterY + 10 + 20 * (1 - p));
      ctx.scale(fit, fit);
      ctx.fillText(ch.name, 0, 0);
      ctx.restore();
      const u = rise(cardT, 0.45, 0.6);
      ctx.fillStyle = CORAL;
      ctx.fillRect(areaX - 260 * u, F.chapterY + 115, 520 * u, 12);
      ctx.restore();
      // A coral edge leading the wipe in, and trailing it out.
      ctx.fillStyle = CORAL;
      if (inU > 0 && inU < 1) ctx.fillRect(x1 - 16, 0, 16, F.h);
      if (outU > 0 && outU < 1) ctx.fillRect(x0, 0, 16, F.h);
    } else if (ch && PULSE) {
      const p = easeOut(clamp01((cardT - CHAPTER_GAP - 0.3) / 0.5));
      ctx.save();
      ctx.globalAlpha = p;
      ctx.font = `34px ${TB}`;
      const w = ctx.measureText(ch.name).width + 112;
      ctx.translate(48 - 40 * (1 - p), F.h > F.w ? F.badgeY : 22);
      chip(ctx, 0, 0, w, 58, 16, DARK_CHIP, false);
      chip(ctx, 0, 0, 66, 58, 16, TEAL, false);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = P_BG;
      ctx.font = `30px ${TB}`;
      ctx.fillText(num, 33, 31);
      ctx.textAlign = "left";
      ctx.fillStyle = SNOW;
      ctx.font = `34px ${TB}`;
      ctx.fillText(ch.name, 86, 31);
      ctx.restore();
    } else if (ch && STORY && cardT < CHAPTER_GAP + 0.4) {
      // A quiet title card: the number in gold, the name fading up, a line drawing under it.
      const out = clamp01((CHAPTER_GAP + 0.4 - cardT) / 0.4);
      ctx.save();
      ctx.globalAlpha = out * rise(cardT, 0, 0.4);
      ctx.fillStyle = "rgba(4,9,24,0.6)";
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = out * rise(cardT, 0.1, 0.5);
      if (b.video.countdown) {
        // The rank, huge and gold, settling from a little bigger.
        const s = 1 + 0.25 * (1 - easeOut(clamp01(cardT / 0.5)));
        ctx.save();
        ctx.translate(areaX, F.chapterY - 320);
        ctx.scale(s, s);
        ctx.font = `360px "Story Head", ${TB}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(232,183,90,0.55)";
        ctx.shadowBlur = 40;
        ctx.fillStyle = GOLD;
        ctx.fillText(String(rankOf(ch.no)), 0, 0);
        ctx.restore();
        kicker(ctx, `நம்பர் ${rankOf(ch.no)}`, areaX, F.chapterY - 110, 44);
      } else kicker(ctx, `அத்தியாயம் ${ch.no}`, areaX, F.chapterY - 110, 44);
      ctx.globalAlpha = out * rise(cardT, 0.25, 0.6);
      fitText(ctx, ch.name, areaX, F.chapterY + 30 + 24 * (1 - rise(cardT, 0.25, 0.6)), 112, Math.min(1300, F.w - 120), CREAM);
      const u = rise(cardT, 0.5, 0.9);
      ctx.fillStyle = GOLD;
      ctx.fillRect(areaX - 240 * u, F.chapterY + 120, 480 * u, 4);
      ctx.restore();
    } else if (ch && STORY) {
      const p = easeOut(clamp01((cardT - CHAPTER_GAP - 0.3) / 0.6));
      ctx.save();
      ctx.globalAlpha = p;
      ctx.font = `36px ${SB}`;
      const w = ctx.measureText(ch.name).width + 112;
      ctx.translate(40, F.badgeY + 12 * (1 - p));
      glass(ctx, 0, 0, w, 64, 32);
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(34, 32, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `28px ${SB}`;
      ctx.fillText(String(rankOf(ch.no)), 34, 34);
      ctx.fillStyle = CREAM;
      ctx.textAlign = "left";
      ctx.font = `36px ${SB}`;
      ctx.fillText(ch.name, 70, 35);
      ctx.restore();
    } else if (ch && cardT < CHAPTER_GAP + 0.4) {
      const p = easeOutBack(cardT / 0.45);
      const out = clamp01((CHAPTER_GAP + 0.4 - cardT) / 0.35);
      ctx.save();
      ctx.globalAlpha = out;
      ctx.fillStyle = "rgba(8,10,24,0.55)";
      ctx.fillRect(0, 0, F.w, F.h);
      ctx.translate(areaX, F.chapterY);
      ctx.scale(p, p);
      pill(ctx, `அத்தியாயம் ${ch.no}`, 0, -110, 46, YELLOW, INK);
      bigText(ctx, ch.name, 0, 40, 120, Math.min(1300, F.w - 120), "#fff");
      ctx.restore();
    } else if (ch) {
      const p = easeOut((cardT - CHAPTER_GAP - 0.3) / 0.5);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.font = `38px ${TB}`;
      const text = `${ch.no} · ${ch.name}`;
      const w = ctx.measureText(text).width + 60;
      ctx.translate(40 - (1 - p) * (w + 60), F.badgeY);
      ctx.fillStyle = "rgba(8,10,24,0.75)";
      ctx.beginPath();
      ctx.roundRect(0, 0, w, 66, 33);
      ctx.fill();
      ctx.fillStyle = YELLOW;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 30, 36);
      ctx.restore();
    }

    // This line's text and effects.
    for (const l of b.lines) {
      if (!l.overlay || t < l.start || t >= l.end + 0.4 || (ch && cardT < CHAPTER_GAP + 0.3)) continue;
      ctx.save();
      ctx.translate(areaX, F.overlayY);
      ctx.scale(F.overlayScale, F.overlayScale);
      ctx.translate(-areaX, -F.overlayY);
      setRoom(areaX);
      drawOverlay(ctx, l, t, areaX, F.overlayY);
      ctx.restore();
    }

    const acting = b.lines.find((l) => l.action && t >= l.start && t < l.end + 0.35);
    drawHost(ctx, host, t, talk[f] ?? 0, mode, f, acting ? { action: acting.action!, la: t - acting.start, dur: acting.end - acting.start } : null);

    for (const l of b.lines) {
      if (l.fx === "confetti") drawConfetti(ctx, l.n, t - l.start);
      if (l.fx === "hearts" || l.fx === "sparkles") {
        const local = t - l.start;
        if (local < 0 || local > l.end - l.start + 0.3) continue;
        const place = hostPlace(mode);
        for (let k = 0; k < 6; k++) {
          const r = (local * 0.6 + k / 6) % 1;
          ctx.save();
          ctx.globalAlpha = (1 - r) * clamp01((l.end + 0.3 - t) / 0.3);
          ctx.font = `${60 + 20 * hash(k)}px ${EMOJI}`;
          ctx.textAlign = "center";
          // Hearts float up from above his head, never over his face.
          const x = l.fx === "hearts" ? place.x + (k % 2 ? 1 : -1) * (place.h * 0.25 + hash(k + 3) * place.h * 0.2) : areaX - (F.w * 0.42) + hash(k + 3) * F.w * 0.84;
          const y = l.fx === "hearts" ? place.feet - place.h * 0.85 - r * 350 : F.overlayY - 180 + hash(k + 9) * 400;
          ctx.fillText(l.fx === "hearts" ? "❤️" : "✨", x, y);
          ctx.restore();
        }
      }
    }

    const sub = subtitleAt(b.lines, t);
    const subWant = mode > 0.5 ? F.subW[1] : F.subW[0];
    if (sub && PULSE) drawPulseSubtitle(ctx, sub, t, areaX, subRoom(areaX, subWant, 64));
    else if (sub) drawSubtitle(ctx, sub.text, areaX, subRoom(areaX, subWant, 24));

    // How far along the video is, along the top edge (in the pulse look, in segments, one per chapter).
    if (F.progress && PULSE) {
      const marks = [0, ...b.chapters.slice(1).map((c) => c.at / b.duration), 1];
      const done = t / b.duration;
      for (let k = 0; k + 1 < marks.length; k++) {
        const a = marks[k] * F.w + (k ? 4 : 0);
        const z = marks[k + 1] * F.w - (k + 2 < marks.length ? 4 : 0);
        ctx.fillStyle = PAPER ? shade(0.12) : "rgba(255,255,255,0.16)";
        ctx.fillRect(a, 0, z - a, 6);
        ctx.fillStyle = TEAL;
        ctx.fillRect(a, 0, Math.max(0, Math.min(z, done * F.w) - a), 6);
      }
    } else if (F.progress) {
      const ph = STORY ? 5 : 8;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, 0, F.w, ph);
      ctx.fillStyle = STORY ? GOLD : YELLOW;
      ctx.fillRect(0, 0, (F.w * t) / b.duration, ph);
    }
    if (F.handleY !== null) {
      ctx.font = `30px ${TS}`;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillStyle = PAPER ? shade(0.7) : "rgba(255,255,255,0.75)";
      ctx.fillText(HANDLE, F.w - 36, F.handleY);
    }
    if (F.tag) pill(ctx, F.tag, F.w / 2, 170, 36, YELLOW, INK);
    if (F.note) {
      ctx.font = `28px ${TB}`;
      const w = ctx.measureText(F.note).width + 40;
      ctx.fillStyle = shade(0.85);
      ctx.beginPath();
      ctx.roundRect(F.w / 2 - w / 2, 92, w, 44, 22);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(F.note, F.w / 2, 115);
    }

    const fade = Math.max(1 - Math.min(1, t / 0.6), clamp01((t - (b.duration - 0.8)) / 0.8));
    if (fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, F.w, F.h);
    }
  };
  return { canvas, ctx, paint, voiceWav, width, height, fps: FPS, scale };
}

function wavOf(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Renders to an H.264/AAC MP4 at `height`p, in one-minute parts like the long Moolai videos. */
export async function renderExplainer(b: Built, outPath: string, workDir: string, height = 1440, range?: { from: number; to: number }, frame: Frame = WIDE, musicSeed = 7) {
  const { canvas, paint, voiceWav, width } = await framePainter(b, height, frame);
  // A sample renders only `range` (seconds) of the video.
  const first = range ? Math.round(range.from * FPS) : 0;
  const frames = range ? Math.min(Math.ceil(b.duration * FPS), Math.round(range.to * FPS)) : Math.ceil(b.duration * FPS);
  const seek = range ? ["-ss", range.from.toFixed(2)] : [];
  const length = (frames - first) / FPS;
  const voicePath = join(workDir, "voice.wav");
  const musicPath = join(workDir, "music.wav");
  const sfxPath = join(workDir, "sfx.wav");
  await writeFile(voicePath, voiceWav);
  const bed = { pulse: pulseMusic, lofi: lofiMusic, night: nightMusic, bright: brightMusic, calm: calmMusic }[b.video.music ?? "calm"];
  await writeFile(musicPath, bed(b.duration + 0.5, musicSeed));
  await writeFile(sfxPath, sfxTrack(b.duration + 0.5, b.sfx));

  const PART = 60 * FPS;
  const parts: string[] = [];
  for (let from = first, i = 0; from < frames; from += PART, i++) {
    const to = Math.min(frames, from + PART);
    const part = join(workDir, `part-${i}.mp4`);
    for (let attempt = 1; ; attempt++) {
      try {
        await run(
          [
            "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(FPS), "-i", "pipe:0",
            "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-profile:v", "high",
            // Fewer threads and a shorter lookahead: far less memory at 1440p (this PC runs out — "malloc of …" from x264).
            "-threads", "3", "-rc-lookahead", "20",
            part,
          ],
          async (write) => {
            for (let f = from; f < to; f++) {
              paint(f);
              await write(Buffer.from(canvas.data()));
            }
          },
        );
        break;
      } catch (error) {
        if (attempt >= 5) throw error;
        // Give the memory a moment to free up before trying again.
        await new Promise((r) => setTimeout(r, 15_000));
        console.log(`part ${i + 1} failed (${String(error).slice(0, 80)}), making it again`);
      }
    }
    parts.push(part);
    console.log(`part ${i + 1} of ${Math.ceil((frames - first) / PART)} done`);
  }
  const list = join(workDir, "parts.txt");
  await writeFile(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
  await run([
    "-f", "concat", "-safe", "0", "-i", list,
    ...seek, "-i", voicePath, ...seek, "-i", musicPath, ...seek, "-i", sfxPath,
    "-filter_complex",
    `[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-18dB:ratio=3,volume=1.6,aformat=channel_layouts=stereo,asplit[voice][key];` +
      `[2:a]volume=0.4[music];[music][key]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=600[bed];` +
      `[3:a]aformat=channel_layouts=stereo,volume=0.7[fx];` +
      `[voice][bed][fx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[a]`,
    "-map", "0:v", "-map", "[a]",
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart", "-t", length.toFixed(2),
    outPath,
  ]);
}
