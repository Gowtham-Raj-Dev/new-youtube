import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { clamp01, easeInOut, easeOut, easeOutBack, INK, talkEnvelope } from "../auto/cartoon";
import { calmMusic } from "../auto/music";
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
}

/** The full video, 16:9. */
export const WIDE: Frame = {
  w: 1920,
  h: 1080,
  host: { big: { x: 430, feet: 1130, h: 1000 }, corner: { x: 1725, feet: 1095, h: 540 } },
  areaX: [1340, 840],
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

/** youtube-for-me/Ulagam Ippo — the bundled script runs from functions/.local. */
export const CHANNEL_DIR = resolve(__dirname, "..", "..", "Ulagam Ippo");
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
  | { kind: "comment"; text: string };

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
  look?: "story";
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
  if (l.overlay?.kind !== "list") return [];
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

function drawOverlay(ctx: SKRSContext2D, l: Timed, t: number, cx: number, cy: number) {
  if (STORY && drawStoryOverlay(ctx, l, t, cx, cy)) return;
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
function subtitleAt(lines: Timed[], t: number): { text: string; line: Timed } | null {
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
    if (t < end) return { text: c, line };
    at = end;
  }
  return { text: chunks[chunks.length - 1], line };
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
  CLEAN = !!b.video.clean || STORY;
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

    // The pictures, crossfading over 0.7 s (1.2 s in the story look).
    const XF = STORY ? 1.2 : 0.7;
    const si = Math.max(0, stretches.findIndex((s) => t >= s.from && t < s.to));
    const st = stretches[si];
    const prog = (s: (typeof stretches)[number]) => clamp01((t - s.from + XF) / (s.to - s.from + 2 * XF));
    drawPicture(ctx, pictures[st.key], st.key, prog(st), si);
    const fadeIn = clamp01((t - st.from) / XF);
    if (si > 0 && fadeIn < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - easeInOut(fadeIn);
      drawPicture(ctx, pictures[stretches[si - 1].key], stretches[si - 1].key, prog(stretches[si - 1]), si - 1);
      ctx.restore();
    }
    ctx.restore();
    // Darker at the bottom for the subtitles, and a little all over for the text.
    ctx.fillStyle = STORY ? "rgba(6,14,34,0.3)" : "rgba(8,10,24,0.28)";
    ctx.fillRect(0, 0, F.w, F.h);
    if (STORY) {
      // A soft vignette, like an old film.
      const vg = ctx.createRadialGradient(F.w / 2, F.h * 0.45, Math.min(F.w, F.h) * 0.35, F.w / 2, F.h * 0.45, Math.max(F.w, F.h) * 0.72);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, F.w, F.h);
    }
    const shade = ctx.createLinearGradient(0, F.shadeFrom, 0, F.h);
    shade.addColorStop(0, "rgba(8,10,24,0)");
    shade.addColorStop(1, "rgba(8,10,24,0.85)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, F.shadeFrom, F.w, F.h - F.shadeFrom);

    const mode = hostMode(t);
    const areaX = F.areaX[0] + (F.areaX[1] - F.areaX[0]) * easeInOut(mode);

    // The chapter: a big card while it starts, then a badge at the top left.
    const ch = chapterOf(t);
    const chLine = ch && b.lines.find((l) => l.chapterNo === ch.no)!;
    const cardT = chLine ? t - (chLine.start - CHAPTER_GAP) : 99;
    if (ch && STORY && cardT < CHAPTER_GAP + 0.4) {
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
    if (sub) drawSubtitle(ctx, sub.text, areaX, mode > 0.5 ? F.subW[1] : F.subW[0]);

    // How far along the video is, along the top edge.
    if (F.progress) {
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
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(HANDLE, F.w - 36, F.handleY);
    }
    if (F.tag) pill(ctx, F.tag, F.w / 2, 170, 36, YELLOW, INK);

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
  await writeFile(musicPath, calmMusic(b.duration + 0.5, musicSeed));
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
        if (attempt >= 3) throw error;
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
