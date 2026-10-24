import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";

/**
 * Flat vector cartoon pieces for the illustrated Shorts: people with thick
 * outlines whose mouths move with the voice, props, effects and a camera.
 * Everything is drawn in code; world coordinates are the 1080×1920 frame,
 * with the floor at FLOOR.
 */

type Ctx = SKRSContext2D;
export const INK = "#1E1B2E";
const LINE = 9;
/** Registered by render.ts. */
const FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;
export const FLOOR = 1210;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const easeInOut = (x: number) => {
  const p = clamp01(x);
  return p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
};
export function easeOutBack(x: number) {
  const p = clamp01(x);
  return 1 + 2.5 * (p - 1) ** 3 + 1.5 * (p - 1) ** 2;
}

// ─── What a scene knows about the Short ───────────────────────────────────────

export interface SceneState {
  t: number;
  /** When each line is spoken. */
  spans: Array<{ start: number; end: number }>;
  /** Who says each line, e.g. "Machan". */
  speakers: string[];
  /** How open the speaking mouth is now, 0–1, from the voice's loudness. */
  talk: number;
  duration: number;
  /** Long videos: the transform of the whole 1920×1080 frame, for drawing on the screen rather than in the world. */
  frame?: { a: number; b: number; c: number; d: number; e: number; f: number };
}

/** Draws in screen space (1920×1080) for long videos, e.g. a caption or a split screen; nothing for Shorts. */
export function onScreen(ctx: SKRSContext2D, s: SceneState, draw: () => void) {
  if (!s.frame) return;
  const { a, b, c, d, e, f } = s.frame;
  ctx.save();
  ctx.setTransform(a, b, c, d, e, f);
  draw();
  ctx.restore();
}

/** Draws the picture behind the subtitles at `s.t`. */
export type Scene = (ctx: Ctx, s: SceneState) => void;

/** The line being spoken, or the last one started, at `s.t`; -1 before the first. */
export function lineAt(s: SceneState): number {
  let line = -1;
  s.spans.forEach((span, i) => s.t >= span.start - 0.05 && (line = i));
  return line;
}

/** How open `name`'s mouth is now: only while their own line is heard. */
export function talkOf(s: SceneState, name: string): number {
  const i = lineAt(s);
  return i >= 0 && s.speakers[i] === name && s.t <= s.spans[i].end + 0.05 ? s.talk : 0;
}

/**
 * How loud the voice is in each video frame, 0–1, smoothed like a mouth
 * opening and closing. `wav` is 24 kHz mono 16-bit PCM with a 44-byte header.
 */
export function talkEnvelope(wav: Buffer, fps: number, seconds: number): Float32Array {
  const pcm = wav.subarray(44);
  const per = Math.round(24_000 / fps);
  const frames = Math.ceil(seconds * fps);
  const rms = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    let n = 0;
    for (let i = f * per; i < (f + 1) * per && i * 2 + 1 < pcm.length; i++, n++) {
      const v = pcm.readInt16LE(i * 2) / 32768;
      sum += v * v;
    }
    rms[f] = n ? Math.sqrt(sum / n) : 0;
  }
  // Loud speech opens the mouth fully; the reference ignores the silences.
  const loud = [...rms].filter((v) => v > 0.01).sort((a, b) => a - b);
  const ref = loud[Math.floor(loud.length * 0.85)] ?? 0.1;
  const out = new Float32Array(frames);
  let level = 0;
  for (let f = 0; f < frames; f++) {
    const target = clamp01((rms[f] - 0.012) / (ref * 0.8));
    // Opens fast, closes a little slower.
    level += (target - level) * (target > level ? 0.75 : 0.45);
    out[f] = level;
  }
  return out;
}

// ─── Camera ───────────────────────────────────────────────────────────────────

export interface Shot {
  /** When the camera starts moving to this framing. */
  at: number;
  /** The world point at the frame's centre (a little above the middle). */
  x: number;
  y: number;
  zoom: number;
  /** How long the move takes; 0 is a cut. */
  move?: number;
}

const FRAME_CY = H * 0.42;

/** Applies the camera framing at `t`, gliding from one shot to the next. */
export function camera(ctx: Ctx, t: number, shots: Shot[], shake = 0) {
  let x = W / 2;
  let y = FRAME_CY;
  let zoom = 1;
  for (const shot of shots) {
    if (t < shot.at) break;
    const p = shot.move === 0 ? 1 : easeInOut((t - shot.at) / (shot.move ?? 0.6));
    x += (shot.x - x) * p;
    y += (shot.y - y) * p;
    zoom += (shot.zoom - zoom) * p;
  }
  ctx.translate(W / 2 + Math.sin(t * 83) * 16 * shake, FRAME_CY + Math.cos(t * 67) * 12 * shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-x, -y);
}

/** 1 at `from`, falling to 0 over `length` seconds: for a shake or a flash. */
export const kick = (t: number, from: number, length = 0.35) => (t >= from ? Math.max(0, 1 - (t - from) / length) : 0);

// ─── People ───────────────────────────────────────────────────────────────────

export interface Look {
  skin: string;
  shirt: string;
  pants: string;
  hair: "short" | "messy" | "bun" | "beanie";
  hairColor?: string;
  /** The beanie's colour, e.g. a monkey cap; dark when not given. */
  beanieColor?: string;
  /** Draws a saree in this colour over the body; `shirt` is the blouse. */
  saree?: string;
  bindi?: boolean;
  mustache?: boolean;
  /** Stripes across the shirt, e.g. a thief's. */
  stripes?: string;
  /** A black band across the eyes. */
  mask?: boolean;
}

export type Mood = "normal" | "happy" | "sad" | "scared" | "confused" | "shocked" | "laugh" | "proud" | "sleep";
export type Arm = "down" | "hold" | "point" | "up" | "cheeks" | "scratch" | "thumb" | "facepalm";

export interface Pose {
  t: number;
  talk?: number;
  mood?: Mood;
  /** 1 faces right, -1 left. */
  face?: 1 | -1;
  arm?: Arm;
  /** Seconds since they started running; leaves the arm pose for swinging arms. */
  run?: number;
  /** Drawn in the front hand, its origin at the palm. */
  holding?: (ctx: Ctx) => void;
  scale?: number;
  /** Lifted off the floor, in pixels. */
  jump?: number;
  /** Shivering, 0–1. */
  shiver?: number;
}

type Pt = [number, number];

function limb(ctx: Ctx, pts: Pt[], color: string, width: number) {
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (const p of pts.slice(1)) ctx.lineTo(...p);
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + LINE * 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function blob(ctx: Ctx, fill: string, draw: () => void, line = LINE) {
  ctx.beginPath();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

export const circle = (ctx: Ctx, x: number, y: number, r: number) => ctx.arc(x, y, r, 0, Math.PI * 2);
export const ellipse = (ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

/** Where the front arm's elbow and hand go, from the front shoulder. */
function frontArm(arm: Arm, t: number): [Pt, Pt] {
  switch (arm) {
    case "hold": return [[135, -300], [150, -425]];
    case "point": return [[160, -420], [255, -470]];
    case "up": return [[130, -500], [165, -650]];
    case "thumb": return [[150, -330], [205, -390]];
    case "scratch": return [[175, -520], [75, -655]];
    case "facepalm": return [[160, -440], [40, -560]];
    case "cheeks": return [[150, -410], [118, -480]];
    default: return [[95, -290], [100 + Math.sin(t * 2) * 4, -205]];
  }
}

/** A person standing at `x` with their feet on `y`. */
export function drawPerson(ctx: Ctx, x: number, y: number, look: Look, pose: Pose) {
  const { t, talk = 0, mood = "normal", face = 1, arm = "down" } = pose;
  const running = pose.run !== undefined;
  const cycle = running ? Math.sin(pose.run! * 20) : 0;
  const bob = running ? -Math.abs(cycle) * 22 : talk > 0.05 ? -talk * 7 : Math.sin(t * 2.4 + x) * 3;
  const shiver = (pose.shiver ?? 0) * Math.sin(t * 70) * 6;
  const scale = pose.scale ?? 1;

  ctx.save();
  ctx.translate(x + shiver, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ellipse(ctx, 0, 6, 135, 22);
  ctx.fill();
  ctx.translate(0, -(pose.jump ?? 0));
  ctx.scale(face, 1);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (running) ctx.rotate(0.14);

  // Legs, swinging when running; a saree hides all but the feet.
  const swing = cycle * 0.6;
  const leg = (side: number, angle: number) => {
    const hip: Pt = [side * 34, -175];
    const foot: Pt = [hip[0] + Math.sin(angle) * 165, hip[1] + Math.cos(angle) * 165];
    if (!look.saree) limb(ctx, [hip, foot], look.pants, 50);
    blob(ctx, INK, () => ellipse(ctx, foot[0] + 16, foot[1] + 2, 38, 20, angle * 0.5), 0);
  };
  leg(-1, -swing);
  leg(1, swing);

  ctx.translate(0, bob);
  const [shoulderF, shoulderB]: Pt[] = [[62, -378], [-62, -378]];
  const armSwing = running ? cycle * 0.9 : 0;
  const swingArm = (s: Pt, a: number): [Pt, Pt] => [
    [s[0] + Math.sin(a) * 80, s[1] + Math.cos(a) * 80],
    [s[0] + Math.sin(a + 0.9) * 150, s[1] + Math.cos(a + 0.9) * 150],
  ];
  const drawArm = (s: Pt, [e, h]: [Pt, Pt]) => {
    limb(ctx, [s, e], look.shirt, 44);
    limb(ctx, [e, h], look.skin, 30);
    blob(ctx, look.skin, () => circle(ctx, h[0], h[1], 24));
  };

  // The back arm, behind the body.
  const back: [Pt, Pt] = running
    ? swingArm(shoulderB, -armSwing)
    : arm === "cheeks"
      ? [[-150, -410], [-118, -480]]
      : [[-95, -290], [-100, -205]];
  if (arm !== "cheeks") drawArm(shoulderB, back);

  // Body.
  if (look.saree) {
    blob(ctx, look.saree, () => {
      ctx.moveTo(-80, -200);
      ctx.lineTo(80, -200);
      ctx.lineTo(118, -8);
      ctx.lineTo(-118, -8);
      ctx.closePath();
    });
  }
  blob(ctx, look.shirt, () => ctx.roundRect(-88, -420, 176, 252, [64, 64, 30, 30]));
  if (look.stripes) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-84, -416, 168, 244, [60, 60, 28, 28]);
    ctx.clip();
    ctx.fillStyle = look.stripes;
    for (let s = -400; s < -170; s += 46) ctx.fillRect(-90, s, 180, 20);
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.beginPath();
    ctx.roundRect(-88, -420, 176, 252, [64, 64, 30, 30]);
    ctx.stroke();
  }
  if (look.saree) {
    // The pallu over the shoulder, with a gold border.
    blob(ctx, look.saree, () => {
      ctx.moveTo(-70, -415);
      ctx.lineTo(-20, -420);
      ctx.lineTo(90, -210);
      ctx.lineTo(60, -175);
      ctx.closePath();
    });
    ctx.strokeStyle = "#F4C542";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-14, -404);
    ctx.lineTo(80, -214);
    ctx.stroke();
  } else if (!look.stripes) {
    // A collar.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-26, -418);
    ctx.lineTo(0, -380);
    ctx.lineTo(26, -418);
    ctx.stroke();
  }

  drawHead(ctx, look, mood, talk, t + x * 0.01);

  const front: [Pt, Pt] = running ? swingArm(shoulderF, armSwing) : frontArm(arm, t);
  if (arm === "cheeks" && !running) drawArm(shoulderB, back);
  drawArm(shoulderF, front);
  if (arm === "thumb" && !running) blob(ctx, look.skin, () => ctx.roundRect(front[1][0] - 10, front[1][1] - 58, 20, 44, 10));
  if (pose.holding) {
    ctx.save();
    ctx.translate(front[1][0], front[1][1]);
    pose.holding(ctx);
    ctx.restore();
  }
  ctx.restore();
}

function drawHead(ctx: Ctx, look: Look, mood: Mood, talk: number, t: number) {
  const hair = look.hairColor ?? "#2A1A14";
  const hy = -540;
  // Neck and the bun behind the head.
  blob(ctx, look.skin, () => ctx.rect(-24, -440, 48, 40));
  if (look.hair === "bun") blob(ctx, hair, () => circle(ctx, -100, -625, 52));
  blob(ctx, look.skin, () => circle(ctx, -108, hy + 6, 26));
  blob(ctx, look.skin, () => circle(ctx, 0, hy, 118));

  // Hair over the top of the head.
  if (look.hair === "beanie") {
    const cap = look.beanieColor ?? "#2B2D42";
    blob(ctx, cap, () => {
      ctx.arc(0, hy - 4, 124, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
    });
    blob(ctx, cap, () => ctx.roundRect(-128, hy - 40, 256, 40, 18));
    if (look.beanieColor) blob(ctx, "#fff", () => circle(ctx, 0, hy - 128, 26));
  } else {
    blob(ctx, hair, () => {
      ctx.arc(0, hy, 124, Math.PI * 0.98, Math.PI * 2.02);
      ctx.quadraticCurveTo(90, hy - 70, 30, hy - 60);
      ctx.quadraticCurveTo(-30, hy - 50, -70, hy - 82);
      ctx.quadraticCurveTo(-110, hy - 40, -124, hy);
      ctx.closePath();
    });
    if (look.hair === "messy") {
      for (const [sx, a] of [[-70, -0.7], [-20, -0.2], [35, 0.3], [80, 0.8]] as const) {
        blob(ctx, hair, () => {
          ctx.moveTo(sx - 26, hy - 100);
          ctx.lineTo(sx + Math.sin(a) * 70, hy - 160 - Math.cos(a) * 20 + Math.sin(t * 3 + sx) * 4);
          ctx.lineTo(sx + 26, hy - 104);
          ctx.closePath();
        }, 7);
      }
    }
  }

  const fx = 16;
  const eyeY = hy - 6;
  const eyes: Pt[] = [[fx - 40, eyeY], [fx + 44, eyeY]];
  const blink = (t * 0.29) % 1 < 0.035 && mood !== "shocked";

  if (look.mask) blob(ctx, INK, () => ctx.roundRect(-120, eyeY - 42, 245, 78, 30), 0);

  // Eyes.
  for (const [ex, ey] of eyes) {
    if (mood === "sleep") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(ex, ey - 6, 18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    if (mood === "laugh" || mood === "happy" && talk < 0.05 && (t * 0.5) % 1 < 0.5) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(ex, ey + 8, 18, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    const big = mood === "shocked" ? 1.4 : mood === "scared" ? 1.2 : 1;
    const ry = blink ? 3 : 29 * big;
    blob(ctx, "#fff", () => ellipse(ctx, ex, ey, 24 * big, ry), 6);
    if (!blink) {
      const jitter = mood === "scared" ? Math.sin(t * 60) * 2 : 0;
      blob(ctx, INK, () => circle(ctx, ex + 7 + jitter, ey + 2, mood === "shocked" || mood === "scared" ? 8 : 12), 0);
      blob(ctx, "#fff", () => circle(ctx, ex + 10, ey - 3, 3.5), 0);
    }
    if (mood === "proud" && !blink) blob(ctx, look.skin, () => ctx.rect(ex - 30, ey - 34, 60, 30), 0);
  }

  // Eyebrows.
  ctx.strokeStyle = look.mask ? "#555" : INK;
  ctx.lineWidth = 10;
  const brow = (ex: number, inner: number, outer: number) => {
    ctx.beginPath();
    ctx.moveTo(ex - 22, eyeY - 48 - outer);
    ctx.lineTo(ex + 22, eyeY - 48 - inner);
    ctx.stroke();
  };
  const [l, r] = eyes;
  const lift = mood === "shocked" ? 18 : 0;
  if (mood === "sad" || mood === "scared") {
    brow(l[0], 14, -4);
    ctx.beginPath();
    ctx.moveTo(r[0] - 22, eyeY - 48 - 14);
    ctx.lineTo(r[0] + 22, eyeY - 48 + 4);
    ctx.stroke();
  } else if (mood === "confused") {
    brow(l[0], 0, 0);
    brow(r[0], 22, 22);
  } else {
    brow(l[0], lift, lift);
    brow(r[0], lift, lift);
  }

  // Nose, cheeks, mustache.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(fx + 12, hy + 28, 12, -Math.PI * 0.4, Math.PI * 0.6);
  ctx.stroke();
  if (mood === "happy" || mood === "laugh" || mood === "proud") {
    ctx.fillStyle = "rgba(255,95,125,0.35)";
    for (const [cx] of eyes) {
      ctx.beginPath();
      circle(ctx, cx + (cx < fx ? -14 : 12), hy + 44, 20);
      ctx.fill();
    }
  }
  if (look.bindi) blob(ctx, "#D62828", () => circle(ctx, fx + 4, eyeY - 60, 9), 0);

  // Mouth.
  const mx = fx + 6;
  const my = hy + 70;
  if (mood === "laugh") {
    blob(ctx, "#6B1426", () => {
      ctx.moveTo(mx - 46, my - 12);
      ctx.quadraticCurveTo(mx, my + 70 + Math.sin(t * 30) * 8, mx + 46, my - 12);
      ctx.closePath();
    }, 7);
  } else if (talk > 0.06) {
    const open = 10 + 34 * talk;
    blob(ctx, "#6B1426", () => ellipse(ctx, mx, my, 22 + 8 * talk, open / 2), 7);
    blob(ctx, "#E86A7C", () => ellipse(ctx, mx, my + open / 2 - 7, 13, Math.max(3, open / 5)), 0);
  } else if (mood === "shocked") {
    blob(ctx, "#6B1426", () => ellipse(ctx, mx, my + 4, 17, 25), 7);
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (mood === "happy" || mood === "proud") ctx.arc(mx, my - 22, 32, Math.PI * 0.2, Math.PI * 0.8);
    else if (mood === "sad") ctx.arc(mx, my + 22, 24, Math.PI * 1.2, Math.PI * 1.8);
    else if (mood === "scared") {
      ctx.moveTo(mx - 26, my);
      for (let i = 1; i <= 4; i++) ctx.lineTo(mx - 26 + i * 13, my + (i % 2 ? -7 : 7));
    } else if (mood === "confused") {
      ctx.moveTo(mx - 22, my + 6);
      ctx.lineTo(mx + 22, my - 6);
    } else ctx.arc(mx, my - 12, 20, Math.PI * 0.25, Math.PI * 0.75);
    ctx.stroke();
  }
  if (look.mustache) {
    blob(ctx, hair, () => {
      ctx.moveTo(mx - 38, my - 14);
      ctx.quadraticCurveTo(mx, my - 40, mx + 38, my - 14);
      ctx.quadraticCurveTo(mx, my - 24, mx - 38, my - 14);
    }, 0);
  }
}

// ─── Effects ──────────────────────────────────────────────────────────────────

/** A "?" or "!" popping up and wobbling over someone's head. */
export function mark(ctx: Ctx, text: string, x: number, y: number, t: number, from: number, color = "#FFD400", size = 120) {
  const p = easeOutBack((t - from) / 0.3);
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y + Math.sin((t - from) * 6) * 6);
  ctx.rotate(Math.sin((t - from) * 4) * 0.15);
  ctx.scale(p, p);
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 16;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A sweat drop sliding down beside a face. */
export function sweat(ctx: Ctx, x: number, y: number, t: number, from: number) {
  if (t < from) return;
  const fall = ((t - from) * 40) % 60;
  ctx.save();
  ctx.translate(x, y + fall);
  blob(ctx, "#8FD8FF", () => {
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(22, 6, 0, 16);
    ctx.quadraticCurveTo(-22, 6, 0, -30);
  }, 6);
  ctx.restore();
}

/** Quick lines around something to show it moving or mattering. */
export function burst(ctx: Ctx, x: number, y: number, r: number, t: number, from: number, color = "#FFD400") {
  const p = clamp01((t - from) / 0.25);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.globalAlpha = 1 - p;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * (0.6 + p * 0.6), y + Math.sin(a) * r * (0.6 + p * 0.6));
    ctx.lineTo(x + Math.cos(a) * r * (1 + p * 0.8), y + Math.sin(a) * r * (1 + p * 0.8));
    ctx.stroke();
  }
  ctx.restore();
}

/** A ring pulsing around something the viewer should look at. */
export function pulseRing(ctx: Ctx, x: number, y: number, r: number, t: number, from: number, color = "#FF3B5C") {
  if (t < from) return;
  const p = easeOutBack((t - from) / 0.3);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 12;
  ctx.setLineDash([26, 16]);
  ctx.lineDashOffset = -t * 60;
  ctx.beginPath();
  circle(ctx, x, y, r * p * (1 + 0.06 * Math.sin(t * 9)));
  ctx.stroke();
  ctx.restore();
}

/** Wavy smell lines rising from a spot. */
export function stink(ctx: Ctx, x: number, y: number, t: number, count = 3) {
  ctx.save();
  ctx.strokeStyle = "rgba(120,200,60,0.85)";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const phase = (t * 0.6 + i / count) % 1;
    const bx = x + (i - (count - 1) / 2) * 50;
    ctx.globalAlpha = Math.sin(phase * Math.PI);
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const yy = y - phase * 120 - k * 10;
      const xx = bx + Math.sin(k * 0.8 + t * 5 + i) * 12;
      if (k) ctx.lineTo(xx, yy);
      else ctx.moveTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Flies buzzing around a spot. */
export function flies(ctx: Ctx, x: number, y: number, t: number, count = 4) {
  for (let i = 0; i < count; i++) {
    const a = t * (3 + i * 0.7) + i * 2;
    const fx = x + Math.cos(a) * (60 + i * 18);
    const fy = y + Math.sin(a * 1.3) * (35 + i * 8);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ellipse(ctx, fx - 6, fy - 8, 8, 5, -0.5);
    ellipse(ctx, fx + 6, fy - 8, 8, 5, 0.5);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    circle(ctx, fx, fy, 7);
    ctx.fill();
  }
}

/** Dust puffs left behind by someone running away. */
export function dust(ctx: Ctx, x: number, y: number, t: number, from: number) {
  if (t < from) return;
  const age = t - from;
  if (age > 0.9) return;
  ctx.save();
  ctx.globalAlpha = 1 - age / 0.9;
  for (let i = 0; i < 3; i++) blob(ctx, "#E9E3D5", () => circle(ctx, x + i * 34 - 34, y - 20 - age * 30 - i * 6, 22 + age * 50), 5);
  ctx.restore();
}

/** A thought cloud, with `inside` drawn clipped within it (origin at its centre). */
export function thought(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, from: number, until: number, towards: Pt, inside: (ctx: Ctx) => void) {
  const grow = easeOutBack((t - from) / 0.35) * (1 - easeOut((t - until) / 0.25));
  if (grow <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(grow, grow);
  // The small puffs leading to the thinker.
  for (let i = 1; i <= 2; i++) {
    const px = ((towards[0] - x) * i) / 3.2;
    const py = ((towards[1] - y) * i) / 3.2 + h * 0.3;
    blob(ctx, "#fff", () => circle(ctx, px, py, 26 - i * 7), 7);
  }
  const cloud = () => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      circle(ctx, Math.cos(a) * w * 0.42, Math.sin(a) * h * 0.4, Math.min(w, h) * 0.22);
    }
    ellipse(ctx, 0, 0, w * 0.45, h * 0.42);
  };
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 2;
  ctx.beginPath();
  cloud();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  cloud();
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ellipse(ctx, 0, 0, w * 0.5, h * 0.48);
  ctx.clip();
  inside(ctx);
  ctx.restore();
  ctx.restore();
}

// ─── Things ───────────────────────────────────────────────────────────────────

/** A phone, its screen showing the battery: `level` 0–1, blinking red when empty. */
export function phone(ctx: Ctx, t: number, level: number, tilt = 0) {
  ctx.save();
  ctx.rotate(tilt);
  blob(ctx, "#2B2D42", () => ctx.roundRect(-44, -82, 88, 160, 16));
  ctx.fillStyle = "#BDE0FE";
  ctx.fillRect(-34, -68, 68, 130);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(-20, -30, 40, 64);
  ctx.fillStyle = INK;
  ctx.fillRect(-9, -40, 18, 10);
  const low = level < 0.15;
  ctx.fillStyle = low ? ((t * 2.5) % 1 < 0.55 ? "#FF2E4C" : "#BDE0FE") : "#2DC653";
  const fill = Math.max(0.08, level) * 56;
  ctx.fillRect(-15, 30 - fill, 30, fill);
  // The charging port at the bottom edge.
  ctx.fillStyle = "#8D99AE";
  ctx.fillRect(-12, 72, 24, 6);
  ctx.restore();
}

/** A switchboard on the wall: a socket, two switches, and the red light that glows when on. */
export function switchboard(ctx: Ctx, x: number, y: number, on: number) {
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#F6F1E7", () => ctx.roundRect(-130, -95, 260, 190, 20));
  // Socket.
  blob(ctx, "#E8E1D2", () => circle(ctx, -55, 8, 52), 6);
  ctx.fillStyle = INK;
  for (const [hx, hy] of [[-55, -16], [-75, 22], [-35, 22]]) {
    ctx.beginPath();
    circle(ctx, hx, hy, 8);
    ctx.fill();
  }
  // Switches; the first is the socket's.
  for (const [i, sx] of [55, 100].entries()) {
    blob(ctx, "#fff", () => ctx.roundRect(sx - 18, -40, 36, 80, 8), 6);
    const down = i === 0 ? on : 0;
    blob(ctx, i === 0 && on > 0.5 ? "#FFB703" : "#D9D2C3", () => ctx.roundRect(sx - 12, -34 + down * 34, 24, 34, 6), 5);
  }
  // The red light.
  if (on > 0.5) {
    const glow = ctx.createRadialGradient(77, -70, 2, 77, -70, 40);
    glow.addColorStop(0, "rgba(255,60,60,0.9)");
    glow.addColorStop(1, "rgba(255,60,60,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    circle(ctx, 77, -70, 40);
    ctx.fill();
  }
  blob(ctx, on > 0.5 ? "#FF3030" : "#7A2E2E", () => circle(ctx, 77, -70, 9), 4);
  ctx.restore();
}

/** A charger plugged in at `from`, its cable hanging down to a loose end at `to`. */
export function charger(ctx: Ctx, from: Pt, to: Pt, t: number) {
  ctx.save();
  ctx.lineCap = "round";
  const sway = Math.sin(t * 1.6) * 10;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1] + 40);
    ctx.bezierCurveTo(from[0] - 30 + sway, from[1] + 320, to[0] - 160, to[1] - 40, to[0] - 20, to[1] - 10);
  };
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 22;
  ctx.stroke();
  path();
  ctx.strokeStyle = "#F8F9FA";
  ctx.lineWidth = 10;
  ctx.stroke();
  blob(ctx, "#F8F9FA", () => ctx.roundRect(from[0] - 34, from[1] - 40, 68, 84, 12));
  blob(ctx, "#ADB5BD", () => ctx.roundRect(to[0] - 24, to[1] - 22, 44, 24, 6), 6);
  ctx.restore();
}

/** A pile of clothes and junk on the floor. */
export function mess(ctx: Ctx, x: number, y: number, size: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const pieces: Array<[string, number, number, number, number, number]> = [
    ["#E63946", -120, -40, 110, 50, -0.2],
    ["#457B9D", 40, -50, 120, 55, 0.25],
    ["#F4A261", -30, -95, 100, 46, 0.1],
    ["#8338EC", 110, -100, 80, 38, -0.4],
    ["#2A9D8F", -150, -110, 70, 34, 0.5],
    ["#FFB703", 10, -140, 70, 32, -0.15],
  ];
  for (const [color, px, py, rx, ry, rot] of pieces) blob(ctx, color, () => ellipse(ctx, px, py, rx, ry, rot), 7);
  // A sock on top and a pizza box leaning on the pile.
  blob(ctx, "#fff", () => ctx.roundRect(-60, -200 + Math.sin(t * 2) * 2, 26, 70, 10), 6);
  blob(ctx, "#C8A165", () => {
    ctx.moveTo(150, -10);
    ctx.lineTo(260, -10);
    ctx.lineTo(240, -130);
    ctx.lineTo(160, -120);
    ctx.closePath();
  }, 7);
  ctx.restore();
}

/** A sack, carried by its neck. */
export function sack(ctx: Ctx) {
  blob(ctx, "#B08968", () => {
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-110, 60, -80, 170);
    ctx.quadraticCurveTo(0, 210, 80, 170);
    ctx.quadraticCurveTo(110, 60, 14, 0);
    ctx.closePath();
  });
  blob(ctx, "#7F5539", () => ctx.roundRect(-22, -10, 44, 20, 8), 6);
}

/** Wall and floor of a room. */
export function room(ctx: Ctx, wall: string, floor: string, accent: string) {
  ctx.fillStyle = wall;
  // Wide enough for a long video's close-ups at either end.
  ctx.fillRect(-1500, -600, W + 3000, FLOOR + 600);
  // Soft stripes on the wall.
  ctx.fillStyle = accent;
  for (let x = -1500; x < W + 1500; x += 120) ctx.fillRect(x, -600, 54, FLOOR + 600);
  ctx.fillStyle = floor;
  ctx.fillRect(-1500, FLOOR, W + 3000, H);
  ctx.fillStyle = INK;
  ctx.fillRect(-1500, FLOOR - 8, W + 3000, 16);
}
