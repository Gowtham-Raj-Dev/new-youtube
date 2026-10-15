import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { GlobalFonts, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import type { Narration } from "./voice";
import type { Palette } from "./palettes";

const FPS = 30;
const BOLD = "ShortFlow Bold";
const SEMI = "ShortFlow Semi";

/** Text on screen, with the moment it is spoken. */
export interface Scene {
  screen: string;
  highlight: string;
  start: number;
  end: number;
}

export interface RenderJob {
  scenes: Scene[];
  /** The last scene is the call to follow: drawn smaller, with a Follow button. */
  narration: Narration;
  palette: Palette;
  /** Shown small at the top, e.g. "DAILY MOTIVATION". */
  label: string;
  /** Shown at the bottom, e.g. "@channel". */
  handle: string | null;
  /** Varies the drifting shapes from one Short to the next. */
  seed: number;
}

let fontsLoaded = false;
function loadFonts() {
  if (fontsLoaded) return;
  // lib/index.js in the deployed function, .local/ when run as a script — both sit next to assets/.
  const dir = [join(__dirname, "..", "assets", "fonts"), join(process.cwd(), "assets", "fonts")].find((d) => existsSync(d));
  if (!dir) throw new Error("Fonts for AI Shorts are missing (functions/assets/fonts).");
  GlobalFonts.registerFromPath(join(dir, "Poppins-ExtraBold.ttf"), BOLD);
  GlobalFonts.registerFromPath(join(dir, "Poppins-SemiBold.ttf"), SEMI);
  fontsLoaded = true;
}

// ─── Easing ───────────────────────────────────────────────────────────────────

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const easeInCubic = (x: number) => clamp01(x) ** 3;
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2;
function easeOutBack(x: number) {
  const c1 = 1.5;
  const c3 = c1 + 1;
  const p = clamp01(x);
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}

/** A repeatable pseudo-random number in [0, 1) for shape `i`. */
function rand(seed: number, i: number) {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
}

function hexA(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ─── Text layout ──────────────────────────────────────────────────────────────

interface PlacedWord {
  text: string;
  x: number;
  y: number;
  width: number;
  highlighted: boolean;
  index: number;
}

interface Layout {
  words: PlacedWord[];
  size: number;
  top: number;
  bottom: number;
}

const normalise = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** Wraps a line into centred rows, shrinking the type until it fits in at most four rows. */
function layout(ctx: SKRSContext2D, text: string, highlight: string, maxWidth: number, startSize: number, centreY: number): Layout {
  const words = text.split(/\s+/).filter(Boolean);
  const target = normalise(highlight);
  let size = startSize;
  let rows: string[][] = [];
  for (; size >= 56; size -= 6) {
    ctx.font = `${size}px "${BOLD}"`;
    rows = [[]];
    for (const word of words) {
      const row = rows[rows.length - 1];
      const candidate = [...row, word].join(" ");
      if (row.length && ctx.measureText(candidate).width > maxWidth) rows.push([word]);
      else row.push(word);
    }
    if (rows.length <= 4 && words.every((w) => ctx.measureText(w).width <= maxWidth)) break;
  }

  const lineHeight = size * 1.28;
  const top = centreY - (rows.length * lineHeight) / 2;
  const space = ctx.measureText(" ").width;
  const placed: PlacedWord[] = [];
  let index = 0;
  let highlightUsed = false;
  rows.forEach((row, r) => {
    const widths = row.map((w) => ctx.measureText(w).width);
    const rowWidth = widths.reduce((a, b) => a + b, 0) + space * (row.length - 1);
    let x = (W - rowWidth) / 2;
    row.forEach((word, i) => {
      const highlighted = !highlightUsed && normalise(word) === target;
      if (highlighted) highlightUsed = true;
      placed.push({ text: word, x, y: top + r * lineHeight + lineHeight / 2, width: widths[i], highlighted, index: index++ });
      x += widths[i] + space;
    });
  });
  return { words: placed, size, top, bottom: top + rows.length * lineHeight };
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawBackground(ctx: SKRSContext2D, t: number, job: RenderJob) {
  const { palette, seed } = job;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, palette.top);
  sky.addColorStop(1, palette.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Three soft glows drifting on slow, different orbits.
  palette.glows.forEach((colour, i) => {
    const speed = 0.12 + rand(seed, i) * 0.1;
    const cx = W * (0.2 + 0.6 * rand(seed, i + 10)) + Math.sin(t * speed * 2 + i * 2) * 220;
    const cy = H * (0.18 + 0.32 * i) + Math.cos(t * speed * 1.6 + i) * 180;
    const radius = 560 + Math.sin(t * 0.5 + i) * 60;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glow.addColorStop(0, hexA(colour, 0.42));
    glow.addColorStop(0.55, hexA(colour, 0.12));
    glow.addColorStop(1, hexA(colour, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  });

  // A faint grid that slowly slides, for depth.
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 2;
  const step = 120;
  const shift = (t * 14) % step;
  ctx.beginPath();
  for (let x = -step + shift; x < W + step; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = -step + shift; y < H + step; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
}

function drawShapes(ctx: SKRSContext2D, t: number, progress: number, job: RenderJob) {
  const { palette, seed } = job;
  const cx = W / 2;
  const cy = H * 0.47;
  const intro = easeOutCubic(t / 1.2);

  // Two slow rings behind the text, and an arc that fills as the Short plays.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = intro;
  ctx.rotate(t * 0.12);
  ctx.setLineDash([4, 26]);
  ctx.lineCap = "round";
  ctx.strokeStyle = hexA(palette.accent, 0.35);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 470, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-t * 0.3);
  ctx.setLineDash([140, 60]);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 540, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = intro;
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  ctx.strokeStyle = hexA(palette.accent, 0.85);
  ctx.lineWidth = 8;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, 505, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, progress));
  ctx.stroke();
  ctx.restore();

  // Outlined triangles, squares and circles turning slowly in the corners.
  for (let i = 0; i < 7; i++) {
    const kind = i % 3;
    const x = W * rand(seed, i + 20);
    const y = H * (0.08 + 0.84 * rand(seed, i + 30)) + Math.sin(t * 0.6 + i) * 30;
    const size = 50 + rand(seed, i + 40) * 70;
    const spin = t * (0.2 + rand(seed, i + 50) * 0.4) * (i % 2 ? 1 : -1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin);
    ctx.globalAlpha = 0.16 * intro;
    ctx.strokeStyle = i % 2 ? palette.accent : "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (kind === 0) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 - Math.PI / 2;
        if (k === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
        else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.closePath();
    } else if (kind === 1) {
      ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
    } else {
      ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Specks of light rising and twinkling.
  for (let i = 0; i < 46; i++) {
    const speed = 30 + rand(seed, i + 60) * 70;
    const x = W * rand(seed, i + 70) + Math.sin(t * 0.8 + i) * 18;
    const y = (H + 40 - ((rand(seed, i + 80) * H + t * speed) % (H + 80))) | 0;
    const radius = 2 + rand(seed, i + 90) * 4;
    const twinkle = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
    ctx.fillStyle = hexA(i % 4 === 0 ? palette.accent : "#ffffff", twinkle * 0.55 * intro);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Seconds into a scene's entrance at which word `index` starts to come in. */
const WORD_STAGGER = 0.085;
const WORD_IN = 0.5;
const EXIT = 0.3;

function drawScene(ctx: SKRSContext2D, t: number, scene: Scene, exitAt: number, isOutro: boolean, palette: Palette) {
  const enterAt = scene.start - 0.12;
  if (t < enterAt || t > exitAt + EXIT) return;
  const exit = easeInCubic((t - exitAt) / EXIT);

  ctx.save();
  ctx.translate(0, -60 * exit);
  ctx.globalAlpha = 1 - exit;

  const box = layout(ctx, scene.screen, scene.highlight, isOutro ? 820 : 880, isOutro ? 78 : 104, H * 0.47);

  // A big quote mark above each line.
  if (!isOutro) {
    const q = easeOutCubic((t - enterAt) / 0.6);
    ctx.font = `260px "${BOLD}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = hexA(palette.accent, 0.28 * q);
    ctx.fillText("“", W / 2, box.top + 60 - 30 * (1 - q));
  }

  ctx.font = `${box.size}px "${BOLD}"`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const word of box.words) {
    const p = (t - enterAt - word.index * WORD_STAGGER) / WORD_IN;
    if (p <= 0) continue;
    const rise = (1 - easeOutBack(p)) * 70;
    const alpha = easeOutCubic(p);

    if (word.highlighted) {
      const grow = easeOutCubic((p - 0.35) / 0.8);
      const padX = box.size * 0.22;
      const h = box.size * 1.12;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = palette.accent;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 40 * grow;
      roundRect(ctx, word.x - padX, word.y - h / 2 + rise, (word.width + padX * 2) * Math.max(0.02, grow), h, h * 0.26);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha *= alpha;
    // A soft shadow keeps white text readable over the bright glows.
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = word.highlighted ? 0 : 18;
    ctx.shadowOffsetY = word.highlighted ? 0 : 6;
    ctx.fillStyle = word.highlighted && p > 0.6 ? palette.onAccent : "#ffffff";
    ctx.fillText(word.text, word.x, word.y + rise);
    ctx.restore();
  }

  // The call to follow gets a pulsing button under it.
  if (isOutro) {
    const p = easeOutBack((t - enterAt - 0.5) / 0.6);
    const pulse = 1 + 0.04 * Math.sin(t * 6);
    const w = 420 * pulse;
    const h = 120 * pulse;
    const y = box.bottom + 90;
    ctx.save();
    ctx.globalAlpha *= clamp01(p);
    ctx.translate(W / 2, y + h / 2);
    ctx.scale(clamp01(p) || 0.001, clamp01(p) || 0.001);
    ctx.fillStyle = "#ff0033";
    ctx.shadowColor = "#ff0033";
    ctx.shadowBlur = 50;
    roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // A bell, in lines.
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    const bx = -w / 2 + 92;
    ctx.beginPath();
    ctx.moveTo(bx - 24, 18);
    ctx.quadraticCurveTo(bx - 24, -30, bx, -30);
    ctx.quadraticCurveTo(bx + 24, -30, bx + 24, 18);
    ctx.lineTo(bx - 30, 18);
    ctx.lineTo(bx + 30, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `52px "${BOLD}"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("FOLLOW", bx + 52, 4);
    ctx.restore();
  }
  ctx.restore();
}

function drawChrome(ctx: SKRSContext2D, t: number, progress: number, job: RenderJob) {
  const { palette } = job;
  const intro = easeOutCubic((t - 0.1) / 0.8);

  // The label pill at the top.
  ctx.save();
  ctx.globalAlpha = intro;
  ctx.font = `36px "${SEMI}"`;
  const label = job.label.toUpperCase();
  const textWidth = ctx.measureText(label).width + label.length * 4;
  const pillW = textWidth + 110;
  const pillX = (W - pillW) / 2;
  const pillY = 170 - 20 * (1 - intro);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, pillX, pillY, pillW, 84, 42);
  ctx.fill();
  ctx.stroke();
  const dotPulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 10 + 14 * dotPulse;
  ctx.beginPath();
  ctx.arc(pillX + 48, pillY + 42, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  let x = pillX + 76;
  for (const ch of label) {
    ctx.fillText(ch, x, pillY + 44);
    x += ctx.measureText(ch).width + 4;
  }
  ctx.restore();

  // Progress bar and handle at the bottom, above YouTube's own controls.
  ctx.save();
  ctx.globalAlpha = intro;
  const barY = H - 300;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, 140, barY, W - 280, 10, 5);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 16;
  roundRect(ctx, 140, barY, Math.max(10, (W - 280) * progress), 10, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (job.handle) {
    ctx.font = `40px "${SEMI}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(job.handle, W / 2, barY - 40);
  }
  ctx.restore();
}

/** Draws frame `t` (seconds) of the Short. */
function drawFrame(ctx: SKRSContext2D, t: number, job: RenderJob, duration: number) {
  const progress = clamp01(t / duration);
  // Everything eases in from black over the first half-second and out over the last.
  drawBackground(ctx, t, job);
  drawShapes(ctx, t, easeInOutSine(progress) * 0.15 + progress * 0.85, job);
  const { scenes } = job;
  scenes.forEach((scene, i) => {
    const next = scenes[i + 1];
    const exitAt = next ? next.start - EXIT - 0.05 : duration + 1;
    drawScene(ctx, t, scene, exitAt, i === scenes.length - 1, job.palette);
  });
  drawChrome(ctx, t, progress, job);
  const fade = Math.max(1 - clamp01(t / 0.5), clamp01((t - (duration - 0.4)) / 0.4));
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export interface RenderedShort {
  video: Buffer;
  thumbnail: Buffer;
  durationSec: number;
}

/**
 * Renders the Short to an H.264/AAC MP4: frames are drawn on a canvas and piped
 * to ffmpeg with the voice-over and a quiet synthesised pad underneath.
 */
export async function renderShort(job: RenderJob, workDir: string): Promise<RenderedShort> {
  if (!ffmpegPath) throw new Error("ffmpeg isn't available on this platform.");
  loadFonts();
  const duration = job.narration.durationSec;
  const frames = Math.ceil(duration * FPS);
  const voicePath = join(workDir, "voice.wav");
  const outPath = join(workDir, "short.mp4");
  await writeFile(voicePath, job.narration.wav);

  // A soft major-seventh pad that swells in and out — no music library, so nothing to clear.
  const pad = [130.81, 196.0, 246.94, 329.63]
    .map((f, i) => `${(0.035 / (i + 1)).toFixed(4)}*sin(2*PI*${f}*t)*(0.6+0.4*sin(2*PI*${(0.07 + i * 0.03).toFixed(2)}*t))`)
    .join("+");

  const ffmpeg = spawn(
    ffmpegPath,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-r", String(FPS), "-i", "pipe:0",
      "-i", voicePath,
      "-f", "lavfi", "-i", `aevalsrc='${pad}':s=48000:d=${duration.toFixed(2)}`,
      "-filter_complex",
      `[2:a]lowpass=f=900,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, duration - 1.5).toFixed(2)}:d=1.5[bed];` +
        `[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-18dB:ratio=3,volume=1.6[voice];` +
        `[voice][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`,
      "-map", "0:v", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
      "-movflags", "+faststart", "-t", duration.toFixed(2),
      outPath,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  // If ffmpeg dies mid-way, writing more frames fails; the exit code below says why.
  ffmpeg.stdin.on("error", () => {});
  let stderr = "";
  ffmpeg.stderr.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-4000)));
  const exited = once(ffmpeg, "close") as Promise<[number | null, NodeJS.Signals | null]>;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  let thumbnail: Buffer | null = null;
  const firstScene = job.scenes[0];
  const thumbAt = Math.min(duration - 0.5, firstScene.start + 1.6);
  try {
    for (let f = 0; f < frames; f++) {
      const t = f / FPS;
      drawFrame(ctx, t, job, duration);
      if (!thumbnail && t >= thumbAt) thumbnail = canvas.encodeSync("jpeg", 88);
      if (!ffmpeg.stdin.write(Buffer.from(canvas.data()))) await once(ffmpeg.stdin, "drain");
    }
  } finally {
    ffmpeg.stdin.end();
  }
  const [code, signal] = await exited;
  if (code !== 0) throw new Error(`ffmpeg ${signal ?? `exited ${code}`}: ${stderr.slice(-800)}`);

  return { video: await readFile(outPath), thumbnail: thumbnail ?? canvas.encodeSync("jpeg", 88), durationSec: duration };
}
