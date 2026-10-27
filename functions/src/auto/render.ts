import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { GlobalFonts, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { AUTO_SHORTS_ENDING_MAX_SEC, SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import type { LineKind } from "./bank";
import { INK, talkEnvelope, type Scene } from "./cartoon";
import { calmMusic } from "./music";
import { sfxTrack, type SfxEvent } from "./sfx";
import type { Narration } from "./voice";

const FPS = 30;
const BOLD = "ShortFlow Bold";
const SEMI = "ShortFlow Semi";
const EMOJI = "ShortFlow Emoji";
/** Poppins for the words, with colour emoji for anything it doesn't have. */
const BOLD_STACK = `"${BOLD}", "${EMOJI}"`;
/** Who is talking, drawn before "Amma:", "Boss:" and the like. */
const SPEAKERS: Record<string, string> = {
  amma: "👩", appa: "👨", naan: "🙋", thambi: "🙋", boss: "😎", friend: "🧑", avan: "🧑", hr: "💼", manager: "👔",
  doctor: "🩺", relatives: "👪", mama: "🧔", salesman: "🧑‍💼", friends: "👬", ellaarum: "👥",
  machan: "🤪", colleague: "🧑‍💻", uncle: "👴", trainer: "🧑‍🏫", kadaikaarar: "🧑‍🍳",
  mechanic: "🔧", thatha: "👴", sir: "👔", youtuber: "🎙️",
};
const YELLOW = "#FFD400";
const CYAN = "#3EE8FF";
/** Subtitle size, the punch line's, and the widest a line may be. */
const SIZE = 84;
const PUNCH_SIZE = 76;
const MAX_W = 900;
const CENTRE_Y = H * 0.47;

/** Where the subtitles sit, and whether they need an outline to read over a picture. */
interface Layout {
  cy: number;
  outline: boolean;
}
const ON_BLACK: Layout = { cy: CENTRE_Y, outline: false };
/** Over an illustrated scene the subtitles go in the lower third, below the people. */
const ON_SCENE: Layout = { cy: 1405, outline: true };

/** Words with a dark outline first, when they sit over a picture. */
function words(ctx: SKRSContext2D, text: string, x: number, y: number, layout: Layout) {
  if (layout.outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = 16;
    ctx.strokeStyle = INK;
    ctx.strokeText(text, x, y);
  }
  ctx.fillText(text, x, y);
}

/** One spoken line: its subtitle, the word to colour, and what part of the Short it is. */
export interface Line {
  screen: string;
  highlight: string;
  kind: LineKind;
}

export interface RenderJob {
  lines: Line[];
  narration: Narration;
  /** Series name, small at the top, e.g. "MIDDLE CLASS DIARIES". */
  label: string;
  /** Shown at the bottom, e.g. "@channel". */
  handle: string | null;
  /** Shown big above the story subtitles, e.g. "😭". */
  emoji: string | null;
  /** Varies the background music. */
  seed: number;
  /** A clip played after the punch line, e.g. a laughing reaction. Only its first few seconds are used. */
  endingPath: string | null;
  /** An illustrated scene acting out the dialogue behind the subtitles; black when none. */
  scene?: Scene | null;
  /** Renders at this many times 1080×1920, e.g. 2 for 4K (2160×3840). Everything is drawn as vectors, so it stays sharp. */
  scale?: number;
}

/** x264 settings: the usual quick ones at 1080p, slower and finer for 4K. */
function encoder(scale: number): string[] {
  return scale > 1
    ? ["-c:v", "libx264", "-preset", "slow", "-tune", "animation", "-crf", "16", "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "5.2"]
    : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-profile:v", "high"];
}

export interface RenderedShort {
  video: Buffer;
  thumbnail: Buffer;
  durationSec: number;
}

let fontsLoaded = false;
export function loadFonts() {
  if (fontsLoaded) return;
  // lib/index.js in the deployed function, .local/ when run as a script — both sit next to assets/.
  const dir = [join(__dirname, "..", "assets", "fonts"), join(process.cwd(), "assets", "fonts")].find((d) => existsSync(d));
  if (!dir) throw new Error("Fonts for AI Shorts are missing (functions/assets/fonts).");
  GlobalFonts.registerFromPath(join(dir, "Poppins-ExtraBold.ttf"), BOLD);
  GlobalFonts.registerFromPath(join(dir, "Poppins-SemiBold.ttf"), SEMI);
  GlobalFonts.registerFromPath(join(dir, "NotoColorEmoji.ttf"), EMOJI);
  fontsLoaded = true;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
function easeOutBack(x: number) {
  const p = clamp01(x);
  return 1 + 2.5 * (p - 1) ** 3 + 1.5 * (p - 1) ** 2;
}

const norm = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
/** "gift-nu" and "busy-ah" count as the keyword "gift" / "busy". */
const isKey = (word: string, key: string) => !!key && norm(word.split("-")[0]) === norm(key);

/** A piece of subtitle on screen: a few words of a story line, or the whole punch line. */
interface Chunk {
  words: string[];
  line: number;
  start: number;
  /** When the next chunk replaces it (the last one stays to the end). */
  end: number;
  /** When its words have been spoken. */
  spokenEnd: number;
  punch: boolean;
  /** Who is talking, shown as a tag above the subtitle for the whole line, e.g. "👩 Amma". */
  speaker: string | null;
}

/** Splits the story into 1–3 word subtitles timed to the voice, and keeps the punch line whole. */
function chunksOf(ctx: SKRSContext2D, lines: Line[], spans: Narration["spans"]): Chunk[] {
  ctx.font = `${SIZE}px ${BOLD_STACK}`;
  const out: Chunk[] = [];
  lines.forEach((line, li) => {
    let words = line.screen.split(/\s+/).filter(Boolean);
    // "Amma: …" — the name becomes the tag, so the subtitle is only what is said.
    let speaker: string | null = null;
    if (/^[A-Za-z]+:$/.test(words[0] ?? "")) {
      const name = words[0].slice(0, -1);
      speaker = `${SPEAKERS[norm(name)] ?? "🗣️"} ${name}`;
      words = words.slice(1);
    }
    const { start, end } = spans[li];
    if (line.kind === "punch") {
      out.push({ words, line: li, start, end, spokenEnd: end, punch: true, speaker });
      return;
    }
    const groups: string[][] = [[]];
    for (const word of words) {
      const group = groups[groups.length - 1];
      const endsPhrase = /[.,!?:]$/.test(group[group.length - 1] ?? "");
      if (group.length && (group.length >= 3 || endsPhrase || ctx.measureText([...group, word].join(" ")).width > MAX_W)) groups.push([word]);
      else group.push(word);
    }
    // Each subtitle gets a share of the spoken time in proportion to its letters.
    const total = groups.reduce((sum, g) => sum + g.join(" ").length + 4, 0);
    let at = start;
    for (const group of groups) {
      const length = ((group.join(" ").length + 4) / total) * (end - start);
      out.push({ words: group, line: li, start: at, end: at + length, spokenEnd: at + length, punch: false, speaker });
      at += length;
    }
  });
  // Each subtitle stays up until the next arrives, so the screen never goes blank mid-Short.
  out.forEach((chunk, i) => (chunk.end = out[i + 1]?.start ?? Infinity));
  return out;
}

/** Text with extra space between the letters, centred on `cx`. */
function spaced(ctx: SKRSContext2D, text: string, cx: number, y: number, gap: number) {
  const width = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, -gap);
  let x = cx - width / 2;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + gap;
  }
}

/** Who is talking: a cyan name tag centred at `y`, popping in when their line starts. */
function drawSpeaker(ctx: SKRSContext2D, t: number, speaker: string, y: number, from: number, layout: Layout) {
  const p = easeOutBack((t - from + 0.04) / 0.2);
  if (p <= 0) return;
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.scale(p, p);
  ctx.font = `46px ${BOLD_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(speaker).width + 60;
  ctx.fillStyle = layout.outline ? "rgba(20,18,36,0.8)" : "rgba(62,232,255,0.14)";
  ctx.beginPath();
  ctx.roundRect(-w / 2, -38, w, 76, 38);
  ctx.fill();
  ctx.fillStyle = CYAN;
  ctx.fillText(speaker, 0, 2);
  ctx.restore();
}

/** A story subtitle: one row, popping in. */
function drawChunk(ctx: SKRSContext2D, t: number, chunk: Chunk, highlight: string, lineStart: number, layout: Layout) {
  if (chunk.speaker) drawSpeaker(ctx, t, chunk.speaker, layout.cy - 110, lineStart, layout);
  const pop = easeOutBack((t - chunk.start + 0.04) / 0.18);
  ctx.save();
  ctx.translate(W / 2, layout.cy);
  ctx.scale(0.86 + 0.14 * pop, 0.86 + 0.14 * pop);
  ctx.globalAlpha = clamp01(pop * 1.4);
  ctx.font = `${SIZE}px ${BOLD_STACK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const space = ctx.measureText(" ").width;
  const widths = chunk.words.map((w) => ctx.measureText(w).width);
  let x = -(widths.reduce((a, b) => a + b, 0) + space * (widths.length - 1)) / 2;
  chunk.words.forEach((word, i) => {
    ctx.fillStyle = isKey(word, highlight) ? YELLOW : "#fff";
    words(ctx, word, x, 0, layout);
    x += widths[i] + space;
  });
  ctx.restore();
}

/** The punch line: wrapped rows, its words landing one after another as they are spoken. */
function drawPunch(ctx: SKRSContext2D, t: number, chunk: Chunk, highlight: string, layout: Layout) {
  const size = PUNCH_SIZE;
  ctx.font = `${size}px ${BOLD_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const space = ctx.measureText(" ").width;
  const rows: string[][] = [[]];
  for (const word of chunk.words) {
    const row = rows[rows.length - 1];
    if (row.length && ctx.measureText([...row, word].join(" ")).width > MAX_W) rows.push([word]);
    else row.push(word);
  }
  const lineHeight = size * 1.3;
  const top = layout.cy - (rows.length * lineHeight) / 2 + lineHeight / 2;
  const step = ((chunk.spokenEnd - chunk.start) * 0.8) / chunk.words.length;

  // The screen shakes as the punch line lands, and again on the drum sting after it.
  const kick = (from: number) => Math.max(0, 1 - (t - from) / 0.35) * (t >= from ? 1 : 0);
  const shake = Math.max(kick(chunk.start), kick(chunk.spokenEnd + 0.1));
  ctx.save();
  ctx.translate(Math.sin(t * 90) * 14 * shake, Math.cos(t * 70) * 10 * shake);

  if (chunk.speaker) drawSpeaker(ctx, t, chunk.speaker, top - lineHeight / 2 - 50, chunk.start, layout);
  // Once it has been said, a laughing face lands above it with the drum sting, shaking with the laugh.
  // Over a scene the people react instead.
  const laugh = layout.outline ? 0 : easeOutBack((t - chunk.spokenEnd - 0.1) / 0.35);
  if (laugh > 0) {
    ctx.save();
    ctx.globalAlpha = clamp01(laugh * 1.4);
    ctx.translate(W / 2, top - lineHeight / 2 - (chunk.speaker ? 190 : 110));
    ctx.rotate(Math.sin(t * 14) * 0.12);
    ctx.scale(laugh * (1 + 0.06 * Math.sin(t * 9)), laugh * (1 + 0.06 * Math.sin(t * 9)));
    ctx.font = `130px "${EMOJI}"`;
    ctx.fillText("😂", 0, 0);
    ctx.restore();
  }
  let k = 0;
  rows.forEach((row, r) => {
    const widths = row.map((w) => ctx.measureText(w).width);
    let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + space * (row.length - 1)) / 2;
    row.forEach((word, i) => {
      const p = easeOutBack((t - chunk.start - k++ * step) / 0.22);
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = clamp01(p * 1.4);
        ctx.fillStyle = isKey(word, highlight) ? YELLOW : "#fff";
        words(ctx, word, x + widths[i] / 2, top + r * lineHeight + (1 - p) * 30, layout);
        ctx.restore();
      }
      x += widths[i] + space;
    });
  });
  ctx.restore();
}

/** The story's emoji, big above the subtitles, bobbing gently from when the story starts. */
function drawStoryEmoji(ctx: SKRSContext2D, t: number, emoji: string | null, from: number) {
  if (!emoji) return;
  const p = easeOutBack((t - from) / 0.4);
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp01(p * 1.4);
  ctx.translate(W / 2, CENTRE_Y - 260 + Math.sin((t - from) * 2.6) * 14);
  ctx.rotate(Math.sin((t - from) * 1.8) * 0.08);
  ctx.scale(p, p);
  ctx.font = `150px "${EMOJI}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.restore();
}

/** The series name over a scene: a yellow sticker near the top that drops in and sways a little. */
function drawSeriesBadge(ctx: SKRSContext2D, t: number, label: string) {
  const text = label.toUpperCase();
  const p = easeOutBack(t / 0.5);
  ctx.save();
  ctx.translate(W / 2, 150 - (1 - p) * 120);
  ctx.rotate(-0.035 + Math.sin(t * 1.6) * 0.012);
  ctx.font = `46px ${BOLD_STACK}`;
  const gap = 5;
  const w = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, -gap) + 90;
  // A hard shadow, then the sticker with a thick outline.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 10, -42 + 12, w, 84, 42);
  ctx.fill();
  ctx.fillStyle = YELLOW;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -42, w, 84, 42);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  spaced(ctx, text, 0, 3, gap);
  ctx.restore();
}

/**
 * Subtitles for a long video: the same look as over a scene, centred on `cx`
 * at height `cy`. Each line's words leave the screen a moment after it is said.
 */
export function subtitles(ctx: SKRSContext2D, lines: Line[], spans: Narration["spans"], cx: number, cy: number) {
  const chunks = chunksOf(ctx, lines, spans);
  for (const chunk of chunks) chunk.end = Math.min(chunk.end, spans[chunk.line].end + 0.7);
  const layout: Layout = { cy, outline: true };
  return (t: number) => {
    const chunk = chunks.find((c) => t >= c.start - 0.04 && t < c.end);
    if (!chunk) return;
    ctx.save();
    // The drawing centres on the Short's width; this moves it to `cx`.
    ctx.translate(cx - W / 2, 0);
    const highlight = lines[chunk.line].highlight;
    if (chunk.punch) drawPunch(ctx, t, chunk, highlight, layout);
    else drawChunk(ctx, t, chunk, highlight, chunks.find((c) => c.line === chunk.line)?.start ?? chunk.start, layout);
    ctx.restore();
  };
}

/** With an ending clip, the punch line's last word is cut straight to the clip; without one, the drum sting gets room to ring. */
const CUT_AFTER_PUNCH = 0.5;
function lengthOf(job: RenderJob): number {
  const last = job.narration.spans[job.narration.spans.length - 1];
  return job.endingPath && last ? Math.min(job.narration.durationSec, last.end + CUT_AFTER_PUNCH) : job.narration.durationSec;
}

/** Draws frame `t` (seconds) of the Short. */
function drawFrame(ctx: SKRSContext2D, t: number, job: RenderJob, chunks: Chunk[], talk: number) {
  const duration = lengthOf(job);
  const layout = job.scene ? ON_SCENE : ON_BLACK;
  if (job.scene) {
    ctx.save();
    job.scene(ctx, { t, spans: job.narration.spans, speakers: job.lines.map((l) => /^([A-Za-z]+):/.exec(l.screen)?.[1] ?? "Naan"), talk, duration });
    ctx.restore();
    // The lower third darkens so the subtitles read over the picture.
    const shade = ctx.createLinearGradient(0, 1240, 0, 1380);
    shade.addColorStop(0, "rgba(20,18,36,0)");
    shade.addColorStop(1, "rgba(20,18,36,0.82)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 1240, W, H - 1240);
    // An empty label leaves the top of the frame clear.
    if (job.label) drawSeriesBadge(ctx, t, job.label);
  } else {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.font = `34px "${SEMI}"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    spaced(ctx, job.label.toUpperCase(), W / 2, 230, 6);
  }

  const chunk = chunks.find((c) => t >= c.start - 0.04 && t < c.end);
  if (chunk) {
    const highlight = job.lines[chunk.line].highlight;
    if (chunk.punch) drawPunch(ctx, t, chunk, highlight, layout);
    else {
      if (!job.scene) drawStoryEmoji(ctx, t, job.emoji, chunks[0].start);
      drawChunk(ctx, t, chunk, highlight, chunks.find((c) => c.line === chunk.line)?.start ?? chunk.start, layout);
    }
  }

  // A thin progress line and the handle, above YouTube's own controls.
  const barY = H - 300;
  ctx.fillStyle = job.scene ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)";
  ctx.fillRect(140, barY, W - 280, 6);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(140, barY, (W - 280) * clamp01(t / duration), 6);
  if (job.handle) {
    ctx.font = `38px "${SEMI}"`;
    ctx.textAlign = "center";
    ctx.fillStyle = job.scene ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)";
    // Over a scene the subtitles need the room above the bar, so the handle goes below it.
    ctx.fillText(job.handle, W / 2, job.scene ? barY + 48 : barY - 50);
  }

  // Fades in from black; fades out only when nothing follows — an ending clip comes in on a hard cut.
  const fade = Math.max(1 - easeOut(t / 0.3), job.endingPath ? 0 : clamp01((t - (duration - 0.4)) / 0.4));
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export async function run(args: string[], stdin?: (write: (frame: Buffer) => Promise<void>) => Promise<void>) {
  const ffmpeg = spawn(ffmpegPath as unknown as string, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: [stdin ? "pipe" : "ignore", "ignore", "pipe"] });
  let stderr = "";
  ffmpeg.stderr?.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-4000)));
  const exited = once(ffmpeg, "close") as Promise<[number | null, NodeJS.Signals | null]>;
  if (stdin && ffmpeg.stdin) {
    const pipe = ffmpeg.stdin;
    // If ffmpeg dies mid-way, writing more fails; the exit code below says why.
    pipe.on("error", () => {});
    try {
      await stdin(async (frame) => {
        if (pipe.destroyed || pipe.writableEnded) return;
        if (!pipe.write(frame)) await once(pipe, "drain");
      });
    } catch (error) {
      // ffmpeg closing its input early (e.g. once `-t` is reached) isn't a failure; its exit code below says.
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EPIPE" && code !== "EOF" && code !== "ERR_STREAM_DESTROYED") {
        pipe.end();
        await exited;
        throw error;
      }
    } finally {
      pipe.end();
    }
  }
  const [code, signal] = await exited;
  if (code !== 0) throw new Error(`ffmpeg ${signal ?? `exited ${code}`}: ${stderr.slice(-800)}`);
  return stderr;
}

/** ffmpeg's log for `args`, e.g. to read what a file holds or what a detect filter found. */
async function ffmpegLog(args: string[]): Promise<string> {
  const ffmpeg = spawn(ffmpegPath as unknown as string, ["-hide_banner", ...args], { stdio: ["ignore", "ignore", "pipe"] });
  let log = "";
  ffmpeg.stderr?.on("data", (chunk: Buffer) => (log = (log + chunk.toString()).slice(-200_000)));
  await once(ffmpeg, "close");
  return log;
}

/**
 * The picture inside a clip's bars — the white or black side and top strips meme
 * pages add, with their watermarks — as an ffmpeg crop, or null when it has none.
 */
async function pictureArea(path: string, seconds: number): Promise<string | null> {
  const found: Array<{ crop: string; area: number }> = [];
  // Black bars as they are; white bars once the picture is inverted.
  for (const filter of ["cropdetect=limit=40:round=2:reset=0", "negate,cropdetect=limit=40:round=2:reset=0"]) {
    const log = await ffmpegLog(["-t", seconds.toFixed(2), "-i", path, "-vf", filter, "-an", "-f", "null", "-"]);
    const all = [...log.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
    const last = all[all.length - 1];
    if (last) found.push({ crop: last[0], area: Number(last[1]) * Number(last[2]) });
  }
  const size = /Stream #.*Video:.*?(\d{2,5})x(\d{2,5})/.exec(await ffmpegLog(["-i", path]));
  if (!size || !found.length) return null;
  const full = Number(size[1]) * Number(size[2]);
  // The tighter of the two, unless it would throw most of the picture away.
  const best = found.sort((a, b) => a.area - b.area).find((f) => f.area >= full * 0.2 && f.area < full * 0.97);
  return best?.crop ?? null;
}

/** Plays the ending clip after the Short: bars cut off, as wide as the frame on black, at most a few seconds, with its own sound. */
async function appendEnding(shortPath: string, endingPath: string, workDir: string, scale: number) {
  // A clip without a sound track gets silence, so the two parts join cleanly.
  const info = await ffmpegLog(["-i", endingPath]);
  const hasAudio = /Stream #.*Audio:/.test(info);
  const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(info);
  const clipSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : AUTO_SHORTS_ENDING_MAX_SEC;
  if (!/Stream #.*Video:/.test(info) || clipSec < 0.5) throw new Error("The ending clip isn't a video that can be played.");
  const seconds = Math.min(AUTO_SHORTS_ENDING_MAX_SEC, clipSec);
  const crop = await pictureArea(endingPath, seconds);

  const out = join(workDir, "with-ending.mp4");
  await run([
    "-i", shortPath,
    "-t", String(seconds), "-i", endingPath,
    ...(hasAudio ? [] : ["-f", "lavfi", "-t", String(seconds), "-i", "anullsrc=r=48000:cl=mono"]),
    "-filter_complex",
    `[1:v]${crop ? `${crop},` : ""}scale=${W * scale}:${H * scale}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W * scale}:${H * scale}:(ow-iw)/2:(oh-ih)/2:black,fps=${FPS},setsar=1,format=yuv420p,` +
      `fade=t=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4[ev];` +
      `[${hasAudio ? 1 : 2}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${seconds.toFixed(2)},afade=t=out:st=${(seconds - 0.6).toFixed(2)}:d=0.6[ea];` +
      `[0:v]setsar=1,format=yuv420p[sv];[0:a]aformat=channel_layouts=stereo[sa];` +
      `[sv][sa][ev][ea]concat=n=2:v=1:a=1[v][a]`,
    "-map", "[v]", "-map", "[a]",
    ...encoder(scale),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-movflags", "+faststart", out,
  ]);
  await rename(out, shortPath);
  return seconds;
}

/**
 * Renders the black-screen Short to an H.264/AAC MP4: frames are drawn on a
 * canvas and piped to ffmpeg with the voice-over and calm music that ducks
 * under the voice. An ending clip, if given, is joined on after.
 */
export async function renderShort(job: RenderJob, workDir: string): Promise<RenderedShort> {
  if (!ffmpegPath) throw new Error("ffmpeg isn't available on this platform.");
  loadFonts();
  const duration = lengthOf(job);
  const frames = Math.ceil(duration * FPS);
  const voicePath = join(workDir, "voice.wav");
  const musicPath = join(workDir, "music.wav");
  const outPath = join(workDir, "short.mp4");
  await writeFile(voicePath, job.narration.wav);
  await writeFile(musicPath, calmMusic(duration + 0.5, job.seed));

  const scale = job.scale ?? 1;
  const canvas = createCanvas(W * scale, H * scale);
  const ctx = canvas.getContext("2d");
  const chunks = chunksOf(ctx, job.lines, job.narration.spans);
  // How open the speaker's mouth is in each frame, from the voice.
  const talk = job.scene ? talkEnvelope(job.narration.wav, FPS, duration) : null;

  // A pop as each hook button lands, and the drum sting right after the punch line.
  const sfxPath = join(workDir, "sfx.wav");
  const events: SfxEvent[] = job.lines.flatMap((line, i): SfxEvent[] => {
    const span = job.narration.spans[i];
    // The ending clip brings its own laugh; the drum sting is for Shorts without one.
    if (line.kind === "punch" && !job.endingPath) return [{ at: span.end + 0.1, kind: "rimshot" }];
    return [];
  });
  await writeFile(sfxPath, sfxTrack(duration + 0.5, events));
  let thumbnail: Buffer | null = null;
  // The thumbnail is the first line of the story, not the hook.
  const thumbAt = Math.min(duration - 0.5, (chunks[0]?.start ?? 0) + 0.6);

  await run(
    [
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W * scale}x${H * scale}`, "-r", String(FPS), "-i", "pipe:0",
      "-i", voicePath,
      "-i", musicPath,
      "-i", sfxPath,
      "-filter_complex",
      `[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-18dB:ratio=3,volume=1.6,aformat=channel_layouts=stereo,asplit[voice][key];` +
        `[2:a]volume=0.5[music];[music][key]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=500[bed];` +
        `[3:a]aformat=channel_layouts=stereo,volume=1.2[fx];` +
        `[voice][bed][fx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[a]`,
      "-map", "0:v", "-map", "[a]",
      ...encoder(scale),
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-movflags", "+faststart", "-t", duration.toFixed(2),
      outPath,
    ],
    async (write) => {
      for (let f = 0; f < frames; f++) {
        const t = f / FPS;
        // Everything is drawn in 1080×1920 units; the transform scales it up.
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        drawFrame(ctx, t, job, chunks, talk?.[f] ?? 0);
        if (!thumbnail && t >= thumbAt) thumbnail = canvas.encodeSync("jpeg", 88);
        await write(Buffer.from(canvas.data()));
      }
    },
  );

  const endingSec = job.endingPath ? await appendEnding(outPath, job.endingPath, workDir, scale) : 0;
  return { video: await readFile(outPath), thumbnail: thumbnail ?? canvas.encodeSync("jpeg", 88), durationSec: duration + endingSec };
}
