import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  FLOOR, INK, blob, burst, camera, circle, clamp01, drawPerson, easeOut, easeOutBack, ellipse, lineAt, mark, phone, pulseRing, room, sweat, talkOf,
  thought, type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import { ammaHall, bed, fan, friendsRoom, shoppingBag, shout, sign, street, table, zzz } from "./props";
import { AMMA, MACHAN, NAAN } from "./scenes-day1";

/** Scenes for the Day 5 batch: F23, A23, F21, A11, F3, A29, F30, A4, F12, A21. */

type Ctx = SKRSContext2D;
const FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;

function person(ctx: Ctx, s: SceneState, name: string, look: Look, x: number, face: 1 | -1, pose: Partial<Pose> = {}) {
  drawPerson(ctx, x, FLOOR, look, { t: s.t, talk: talkOf(s, name), face, ...pose });
}

/** The camera on whoever is talking, plus `extra` framings, in time order (an extra at the same moment wins). */
function follow(s: SceneState, at: Record<string, number>, extra: Shot[] = [], zoom = 1.15): Shot[] {
  const story = s.spans.slice(0, -1).map((span, i) => ({ at: span.start - 0.15, x: 540 + ((at[s.speakers[i]] ?? 540) - 540) * 0.45, y: 740, zoom }));
  return [...story, ...extra].sort((a, b) => a.at - b.at);
}

const punchShare = (s: SceneState) => {
  const p = s.spans[s.spans.length - 1];
  return (s.t - p.start) / (p.end - p.start);
};

function write(ctx: Ctx, text: string, x: number, y: number, size: number, color = INK, align: CanvasTextAlign = "center") {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Draws `draw` at `x`, `y` grown to `p` (nothing while 0). */
function popped(ctx: Ctx, x: number, y: number, p: number, draw: () => void) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);
  draw();
  ctx.restore();
}

/** A big phone screen card: a header bar and whatever `draw` puts on the screen below it. */
function screenCard(ctx: Ctx, x: number, y: number, pop: number, header: string, draw: (ctx: Ctx) => void, headerColor = "#2A9D8F") {
  popped(ctx, x, y, pop, () => {
    blob(ctx, "#2B2D42", () => ctx.roundRect(-270, -280, 540, 560, 40));
    blob(ctx, "#F1FAEE", () => ctx.roundRect(-240, -250, 480, 500, 20), 0);
    blob(ctx, headerColor, () => ctx.roundRect(-240, -250, 480, 80, [20, 20, 0, 0]), 0);
    write(ctx, header, 0, -208, 40, "#fff");
    draw(ctx);
  });
}

/** Floating hearts rising around (x, y). */
function hearts(ctx: Ctx, x: number, y: number, t: number, count = 4, size = 50) {
  for (let i = 0; i < count; i++) {
    const ph = (t * 0.6 + i / count) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    write(ctx, "💗", x - 80 + (i % 2) * 160 + Math.sin(t * 2 + i) * 10, y - ph * 160, size);
  }
  ctx.globalAlpha = 1;
}

// ─── F23 · Six ────────────────────────────────────────────────────────────────

const NEIGHBOUR: Look = { skin: "#A86B45", shirt: "#F8F9FA", pants: "#3B3B4F", hair: "short", hairColor: "#6C757D", mustache: true };

/** A cricket bat held by its handle, tilted by `angle`. */
function bat(ctx: Ctx, angle: number) {
  ctx.save();
  ctx.rotate(angle);
  blob(ctx, "#6D4C41", () => ctx.roundRect(-9, -40, 18, 80, 8), 6);
  blob(ctx, "#E9C46A", () => ctx.roundRect(-24, -250, 48, 215, 16));
  ctx.restore();
}

const WINDOW_Y = FLOOR - 560;

/** The neighbour's house behind the street; its front window at (x, WINDOW_Y) shatters as `crack` goes 0 → 1. */
function neighbourHouse(ctx: Ctx, x: number, crack: number, peek: (ctx: Ctx) => void) {
  blob(ctx, "#FFB4A2", () => ctx.rect(x - 330, FLOOR - 760, 660, 760));
  blob(ctx, "#9D0208", () => {
    ctx.moveTo(x - 380, FLOOR - 760);
    ctx.lineTo(x, FLOOR - 960);
    ctx.lineTo(x + 380, FLOOR - 760);
    ctx.closePath();
  });
  const wy = WINDOW_Y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 150, wy - 120, 300, 240);
  ctx.clip();
  ctx.fillStyle = "#BDE0FE";
  ctx.fillRect(x - 150, wy - 120, 300, 240);
  peek(ctx);
  if (crack > 0) {
    blob(ctx, INK, () => {
      ctx.moveTo(x + 30, wy - 40);
      ctx.lineTo(x + 70, wy - 10);
      ctx.lineTo(x + 40, wy + 30);
      ctx.lineTo(x, wy + 5);
      ctx.lineTo(x + 5, wy - 30);
      ctx.closePath();
    }, 0);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const len = (70 + (i % 3) * 45) * crack;
      ctx.beginPath();
      ctx.moveTo(x + 35, wy);
      ctx.lineTo(x + 35 + Math.cos(a) * len, wy + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.strokeRect(x - 150, wy - 120, 300, 240);
  ctx.beginPath();
  ctx.moveTo(x, wy - 120);
  ctx.lineTo(x, wy + 120);
  ctx.stroke();
}

function ball(ctx: Ctx, x: number, y: number) {
  blob(ctx, "#D62828", () => circle(ctx, x, y, 20), 6);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x - 30, y, 26, -0.6, 0.6);
  ctx.stroke();
}

/** F23 · A six — straight through the neighbour's glass. Ball out, glass out, Machan out. */
export function sixer(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const hit = l2.start + 0.8;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: l2.start - 0.15, x: 540, y: 660, zoom: 1.25 }, { at: p.start, x: 540, y: 680, zoom: 1.1 }]));
  street(ctx, t, false);
  neighbourHouse(ctx, 540, t >= hit ? easeOut((t - hit) / 0.2) : 0, (c) => {
    // The neighbour comes to the broken window.
    if (line === 4) drawPerson(c, 540, WINDOW_Y + 470 - easeOut((share - 0.1) / 0.25) * 110, NEIGHBOUR, { t, mood: "shocked", face: -1, scale: 0.7 });
  });
  if (t >= hit) burst(ctx, 575, WINDOW_Y, 120, t, hit, "#fff");
  // The ball: up and away on the six, then down through the window.
  const up = clamp01((t - l0.start - 0.6) / 0.9);
  if (line === 0 && up > 0 && up < 1) ball(ctx, 420 + up * 700, 520 - Math.sin(up * Math.PI * 0.6) * 700);
  const down = clamp01((t - l2.start - 0.2) / 0.6);
  if (line === 2 && down > 0 && down < 1) ball(ctx, 1000 - down * 425, -100 + down * (WINDOW_Y + 100));
  const swing = line === 0 ? -0.9 + easeOut((t - l0.start - 0.4) / 0.25) * 2.4 : 0;
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 ? "sad" : line === 2 ? "shocked" : "proud",
    arm: line === 0 ? "up" : "hold",
    holding: (c) => bat(c, line === 0 ? swing : line === 4 ? 2.6 : 0.35),
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "laugh" : line === 1 ? "happy" : line >= 2 ? "shocked" : "normal",
    arm: done ? "cheeks" : line === 1 ? "thumb" : line === 3 ? "cheeks" : "down",
  });
  if (line === 0) shout(ctx, "SIXER! 🏏", 450, 300, easeOutBack((t - l0.start - 0.6) / 0.3), "#FFD400", 96, -0.06, 740);
  if (line === 2) shout(ctx, "CRASH! 💥", 540, 300, easeOutBack((t - hit) / 0.25), "#FF3B5C", 96);
  if (line === 3) mark(ctx, "?!", 860, 440, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    const outs = ["BALL OUT ⚾", "GLASS OUT 💥", "MACHAN OUT 🚫"];
    outs.forEach((text, i) => popped(ctx, 540, 290 + i * 80, easeOutBack((share - 0.25 - i * 0.2) / 0.2), () => sign(ctx, 0, 0, text, i === 2 ? "#E63946" : "#2B2D42", i === 2 ? "#fff" : "#FFD166", 38)));
  }
  ctx.restore();
}

// ─── A23 · Better luck ────────────────────────────────────────────────────────

/** A23 · "Better luck next time" — next time is next year, so rest till then. */
export function betterLuck(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 4 ? "proud" : line === 2 ? "normal" : "happy",
    arm: line === 4 ? "thumb" : "hold",
    holding: line === 4 ? undefined : (c) => phone(c, t, 0.7),
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 1 ? "happy" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 1 ? "cheeks" : line === 3 ? "scratch" : "down",
  });
  const result = 1 - (line === 4 ? easeOut((share - 0.05) / 0.15) : 0);
  screenCard(ctx, 545, 560, easeOutBack((t - l0.start - 0.4) / 0.3) * 0.7 * result, "📄 RESULT", (c) => {
    if (line < 2) {
      write(c, "Roll No: 2026-47", 0, -90, 40);
      for (let i = 0; i < 3; i++) blob(c, (t * 3 + i / 3) % 1 < 0.5 ? "#2A9D8F" : "#CED4DA", () => circle(c, -50 + i * 50, 40, 16), 0);
    } else {
      write(c, "Better luck", 0, -40, 58, "#E63946");
      write(c, "next time 🍀", 0, 50, 58, "#E63946");
    }
  });
  if (line === 4) {
    screenCard(ctx, 545, 560, easeOutBack((share - 0.15) / 0.25) * 0.7, "📅 EN PLAN", (c) => {
      const rows = ["Nov: Rest 😴", "Dec: Rest 🛋️", "Jan–May: Rest 🎮", "Next year: Exam ✍️"];
      rows.forEach((row, i) => {
        if (share > 0.3 + i * 0.12) write(c, row, -200, -120 + i * 90, 42, i === 3 ? "#E63946" : INK, "left");
      });
    }, "#E76F51");
  }
  if (line === 0) shout(ctx, "RESULT VANDHACHU! 📄", 450, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#4CC9F0", 70, -0.05, 740);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) burst(ctx, 545, 560, 190, t, l2.start + 0.3, "#FF3B5C");
  if (line === 3) shout(ctx, "NEXT TIME EPPO? 🤔", 630, 300, easeOutBack((t - l3.start - 0.2) / 0.3), "#FFD400", 70, -0.05, 720);
  if (line === 4) shout(ctx, "ADHUVARAIKKUM REST 😎", 540, 300, easeOutBack((share - 0.75) / 0.15), "#80ED99", 68, -0.05, 920);
  ctx.restore();
}

// ─── F21 · Konjam cut ─────────────────────────────────────────────────────────

const BARBER: Look = { skin: "#B5764A", shirt: "#E9ECEF", pants: "#2B2D42", hair: "short", mustache: true };
const MACHAN_CAP: Look = { ...MACHAN, hair: "beanie", beanieColor: "#E63946" };
const MACHAN_BALD: Look = { ...MACHAN, hair: "short", hairColor: MACHAN.skin };

/** A saloon: pale walls, a big mirror over a shelf of bottles, a scissors poster. */
function saloon(ctx: Ctx) {
  room(ctx, "#E0FBFC", "#ADB5BD", "rgba(0,0,0,0.04)");
  blob(ctx, "#ADB5BD", () => ctx.roundRect(370, 330, 340, 300, 30));
  blob(ctx, "#CAF0F8", () => ctx.roundRect(392, 352, 296, 256, 20), 0);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(430, 470);
  ctx.lineTo(520, 380);
  ctx.moveTo(460, 520);
  ctx.lineTo(580, 400);
  ctx.stroke();
  blob(ctx, "#8D5B3B", () => ctx.rect(360, 640, 360, 24));
  for (const [i, colour] of ["#E63946", "#3A86FF", "#80ED99", "#FFB703"].entries()) {
    blob(ctx, colour, () => ctx.roundRect(390 + i * 85, 580, 44, 60, 10), 6);
  }
  blob(ctx, "#FFD166", () => ctx.roundRect(60, 300, 170, 220, 10));
  write(ctx, "✂️", 145, 410, 90);
}

/** The few hairs left on a shaved head at (x, its top). */
function tuft(ctx: Ctx, x: number, top: number, t: number) {
  ctx.strokeStyle = "#2A1A14";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  for (const dx of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, top + 4);
    ctx.quadraticCurveTo(x + dx + 12, top - 20, x + dx + Math.sin(t * 3 + dx) * 6, top - 42);
    ctx.stroke();
  }
}

/** F21 · "Cut just a little," he told the barber — who left just a little. */
export function konjamCut(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, , p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const reveal = line === 4 && share > 0.3;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 470, y: 700, zoom: 1.15 }]));
  saloon(ctx);
  drawPerson(ctx, 540, FLOOR - 50, BARBER, {
    t,
    scale: 0.8,
    face: -1,
    mood: line === 4 ? "laugh" : line === 2 ? "proud" : "normal",
    arm: line === 2 ? "thumb" : "hold",
    holding: line === 2 ? undefined : (c) => write(c, "✂️", 0, -30, 70),
  });
  person(ctx, s, "Machan", reveal ? MACHAN_BALD : MACHAN_CAP, 220, 1, {
    mood: reveal ? "sad" : line === 0 ? "proud" : "normal",
    arm: reveal ? "hold" : line === 0 ? "point" : "down",
    holding: reveal ? (c) => blob(c, "#E63946", () => { c.arc(0, 10, 50, Math.PI, 0); c.closePath(); }) : undefined,
  });
  if (reveal) {
    tuft(ctx, 220, FLOOR - 664, t);
    pulseRing(ctx, 222, FLOOR - 680, 70, t, p.start + (p.end - p.start) * 0.4);
  }
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "laugh" : reveal ? "shocked" : line === 3 ? "happy" : "normal",
    arm: done ? "cheeks" : line === 3 ? "thumb" : "down",
  });
  if (line === 0) shout(ctx, "KONJAM MATTUM ✂️", 450, 300, easeOutBack((t - l0.start - 0.5) / 0.3), "#FFD400", 76, -0.05, 740);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) shout(ctx, "SONNA MAADHIRIYE 👍", 450, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 70, -0.05, 740);
  if (line === 4) shout(ctx, "KONJAM MATTUM MEEDHI! 😂", 500, 300, easeOutBack((share - 0.6) / 0.2), "#FF7B3A", 66, -0.05, 860);
  ctx.restore();
}

// ─── A11 · Light off ──────────────────────────────────────────────────────────

/** Naan's own room sits off to the side of the hall; the camera cuts to it. */
const ROOM_X = 1800;

/** A bulb hanging from the ceiling at (x, y), glowing when on. */
function bulb(ctx: Ctx, x: number, y: number, t: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, -200);
  ctx.lineTo(x, y - 60);
  ctx.stroke();
  const glow = ctx.createRadialGradient(x, y, 10, x, y, 240);
  glow.addColorStop(0, `rgba(255,230,100,${0.55 + Math.sin(t * 6) * 0.05})`);
  glow.addColorStop(1, "rgba(255,230,100,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  circle(ctx, x, y, 240);
  ctx.fill();
  blob(ctx, "#FFE066", () => circle(ctx, x, y, 50));
  blob(ctx, "#ADB5BD", () => ctx.roundRect(x - 26, y - 84, 52, 38, 6), 6);
}

/** A11 · "Switch off your room's light!" He isn't in the room — that's exactly why. */
export function lightOff(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const shots = follow(s, { Naan: 220, Amma: 860 });
  // Lines 2–3: the empty room, light and fan on.
  shots[1] = { at: l1.start - 0.15, x: ROOM_X, y: 700, zoom: 1.1, move: 0 };
  shots[2] = { at: l2.start - 0.15, x: ROOM_X, y: 700, zoom: 1.1, move: 0 };
  shots[3] = { ...shots[3], move: 0 };
  shots.push({ at: p.start, x: 540, y: 690, zoom: 1.0 });
  ctx.save();
  camera(ctx, t, shots);
  ammaHall(ctx, t);
  bed(ctx, ROOM_X - 360, 520, "#457B9D");
  fan(ctx, ROOM_X - 350, 330, t, t * 14);
  bulb(ctx, ROOM_X + 250, 470, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: done ? "sad" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 3 ? "scratch" : "down",
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: line === 4 ? "proud" : "normal",
    arm: line === 0 || line === 4 ? "point" : "down",
  });
  if (line === 0) shout(ctx, "LIGHT-AH OFF PANNU! 💡", 640, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD400", 70, -0.05, 720);
  if (line === 1) shout(ctx, "ROOM-LA YAARUME ILLA 🛏️", ROOM_X + 100, 230, easeOutBack((t - l1.start - 0.3) / 0.3), "#4CC9F0", 64, -0.05, 760);
  if (line === 2) {
    pulseRing(ctx, ROOM_X + 250, 470, 110, t, l2.start + 0.3);
    shout(ctx, "AANAA LIGHT ON 💡", ROOM_X + 100, 230, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD400", 70, -0.05, 760);
  }
  if (line === 3) mark(ctx, "?", 220, 440, t, l3.start + 0.1);
  if (line === 4) {
    popped(ctx, 540, 370, easeOutBack((share - 0.15) / 0.25), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-260, -110, 520, 220, 24));
      write(ctx, "⚡ EB BILL", 0, -55, 46);
      write(ctx, `₹${Math.round(850 + 1550 * easeOut((share - 0.3) / 0.6))}`, 0, 40, 76, "#E63946");
    });
    shout(ctx, "AALE ILLA, LIGHT EDHUKKU? 💡", 540, 170, easeOutBack((share - 0.65) / 0.2), "#FF7B3A", 64, -0.04, 940);
  }
  ctx.restore();
}

// ─── F3 · Syllabus ────────────────────────────────────────────────────────────

/** An open book, its origin at the spine's bottom; pages flip over fast while `flipping`. */
function openBook(ctx: Ctx, t: number, flipping: boolean) {
  blob(ctx, "#2A9D8F", () => ctx.roundRect(-150, -210, 300, 210, 10));
  blob(ctx, "#fff", () => ctx.roundRect(-140, -200, 135, 190, 4), 5);
  blob(ctx, "#fff", () => ctx.roundRect(5, -200, 135, 190, 4), 5);
  ctx.strokeStyle = "#ADB5BD";
  ctx.lineWidth = 5;
  for (let y = -170; y < -30; y += 26) {
    for (const x0 of [-125, 20]) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + 100, y);
      ctx.stroke();
    }
  }
  if (flipping) {
    // A page every third of a second, from the right page over to the left.
    const w = Math.cos(((t * 3) % 1) * Math.PI) * 135;
    blob(ctx, "#F8F9FA", () => ctx.rect(Math.min(0, w), -200, Math.abs(w), 190), 5);
  }
}

/** F3 · The whole syllabus "seen" — seen, he said; never said read. */
export function syllabus(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  friendsRoom(ctx);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 || line === 0 ? "proud" : "happy",
    arm: line === 4 ? "thumb" : "hold",
    holding: line === 4 ? undefined : (c) => {
      c.translate(100, 100);
      c.scale(0.75, 0.75);
      openBook(c, t, line === 2);
    },
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 14 : 0,
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 1 ? "happy" : line >= 3 ? "confused" : "normal",
    arm: done ? "facepalm" : line === 1 ? "thumb" : line === 3 ? "scratch" : "down",
  });
  if (line === 1) {
    screenCard(ctx, 545, 560, easeOutBack((t - l1.start - 0.2) / 0.3) * 0.7, "📚 SYLLABUS", (c) => {
      for (let i = 0; i < 10; i++) {
        const x = -170 + (i % 2) * 190;
        const y = -130 + Math.floor(i / 2) * 76;
        blob(c, "#fff", () => c.roundRect(x - 10, y - 28, 170, 56, 14), 5);
        write(c, `Chapter ${i + 1}`, x + 75, y + 2, 30);
      }
    });
  }
  if (line === 4) {
    screenCard(ctx, 545, 560, easeOutBack((share - 0.1) / 0.25) * 0.7, "📚 MACHAN STATUS", (c) => {
      if (share > 0.2) write(c, "👀 Paathen ✅", 0, -70, 60, "#2A9D8F");
      if (share > 0.45) write(c, "📖 Padichen ❌", 0, 70, 60, "#E63946");
    });
  }
  if (line === 0) shout(ctx, "SYLLABUS FINISH! 🎉", 450, 300, easeOutBack((t - l0.start - 0.4) / 0.3), "#80ED99", 70, -0.05, 740);
  if (line === 2) shout(ctx, "ELLAAM PAATHEN 👀", 450, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD400", 76, -0.05, 740);
  if (line === 3) shout(ctx, "PAATHIYAA? PADICHIYAA? 🤔", 620, 300, easeOutBack((t - l3.start - 0.2) / 0.3), "#4CC9F0", 64, -0.05, 720);
  if (line === 4) shout(ctx, "PAATHEN ≠ PADICHEN 😂", 540, 300, easeOutBack((share - 0.7) / 0.2), "#FF7B3A", 70, -0.05, 920);
  ctx.restore();
}

// ─── A29 · Half confirm ───────────────────────────────────────────────────────

const PONNU: Look = { skin: "#C68A60", shirt: "#FF8FAB", pants: "#F4A261", hair: "bun", bindi: true };

/** A29 · He saw a girl. She didn't see him. So: half confirm. */
export function halfConfirm(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 690, zoom: 1.0 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 4 ? "proud" : "happy",
    arm: line === 4 ? "thumb" : line === 0 ? "up" : "down",
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 14 : 0,
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 1 ? "laugh" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 1 ? "cheeks" : line === 3 ? "scratch" : "down",
    jump: line === 1 ? Math.abs(Math.sin((t - l1.start) * 9)) * 12 : 0,
  });
  if (line === 1) hearts(ctx, 860, 520, t);
  // The bus stop, remembered: he gazes at her; she's on her phone.
  thought(ctx, 540, 420, 440, 290, t, l2.start + 0.2, Infinity, [300, 560], (c) => {
    c.fillStyle = "#BDE0FE";
    c.fillRect(-220, -145, 440, 290);
    c.fillStyle = "#90BE6D";
    c.fillRect(-220, 105, 440, 40);
    drawPerson(c, -100, 125, NAAN, { t, scale: 0.3, face: 1, mood: "happy" });
    drawPerson(c, 100, 125, PONNU, { t, scale: 0.3, face: 1, mood: "normal", arm: "hold", holding: (h) => phone(h, t, 0.6) });
    hearts(c, -80, -10, t, 3, 34);
  });
  if (line === 0) shout(ctx, "PONNU PAATHEN! 😍", 450, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#FF8FAB", 76, -0.05, 740);
  if (line === 3) mark(ctx, "?", 860, 440, t, l3.start + 0.1);
  if (line === 4) {
    popped(ctx, 540, 175, easeOutBack((share - 0.25) / 0.25), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-290, -60, 580, 120, 24));
      blob(ctx, "#E9ECEF", () => ctx.roundRect(-260, 0, 520, 34, 17), 0);
      blob(ctx, "#2DC653", () => ctx.roundRect(-260, 0, 520 * 0.5 * easeOut((share - 0.4) / 0.3), 34, 17), 0);
      write(ctx, "CONFIRM: 50% 💍", 0, -26, 40);
    });
  }
  ctx.restore();
}

// ─── F30 · Full-time busy ─────────────────────────────────────────────────────

/** A laptop on a table top at (x, y). */
function laptop(ctx: Ctx, x: number, y: number) {
  blob(ctx, "#2B2D42", () => ctx.roundRect(x - 95, y - 160, 190, 140, 10));
  blob(ctx, "#BDE0FE", () => ctx.rect(x - 82, y - 147, 164, 114), 0);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(x - 120, y - 22, 240, 22, 6));
}

/** F30 · So busy — acting busy. A full-time job, minus the salary. */
export function fullTimeBusy(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  friendsRoom(ctx);
  table(ctx, 340, 280, 300);
  laptop(ctx, 480, FLOOR - 330);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 ? "proud" : line === 0 ? "sad" : "happy",
    arm: line === 4 ? "thumb" : "hold",
    holding: line === 0 ? (c) => phone(c, t, 0.3, -0.3) : undefined,
  });
  if (line === 0) sweat(ctx, 110, 610, t, l0.start + 0.3);
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 3 ? "scratch" : "down",
  });
  if (line === 2) {
    screenCard(ctx, 545, 560, easeOutBack((t - l2.start - 0.2) / 0.3) * 0.7, "💻 Untitled.doc", (c) => {
      if ((t * 2) % 1 < 0.55) blob(c, INK, () => c.rect(-200, -140, 8, 56), 0);
      write(c, "0 words", 0, 170, 36, "#6C757D");
      write(c, "🎭", 0, 30, 130);
    }, "#457B9D");
  }
  if (line === 4) {
    screenCard(ctx, 545, 560, easeOutBack((share - 0.1) / 0.25) * 0.7, "💼 PAYSLIP", (c) => {
      const rows: Array<[string, string]> = [["Velai: Busy nadippu 🎭", INK], ["Neram: 24 × 7", INK], ["Salary: ₹0", "#E63946"]];
      rows.forEach(([row, colour], i) => {
        if (share > 0.2 + i * 0.15) write(c, row, -215, -110 + i * 100, i === 2 ? 56 : 34, colour, "left");
      });
    }, "#6A4C93");
  }
  if (line === 0) shout(ctx, "ROMBA BUSY 😓", 450, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#4CC9F0", 80, -0.05, 740);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) shout(ctx, "ACTING MATTUM 🎭", 450, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD400", 76, -0.05, 740);
  if (line === 3) mark(ctx, "?!", 860, 440, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) shout(ctx, "SALARY ILLAADHA JOB 😂", 540, 300, easeOutBack((share - 0.7) / 0.2), "#FF7B3A", 68, -0.05, 920);
  ctx.restore();
}

// ─── A4 · Book-um naanum ──────────────────────────────────────────────────────

/** An open book with a face: staring back, or fast asleep. */
function bookFace(ctx: Ctx, asleep: boolean) {
  blob(ctx, "#2A9D8F", () => ctx.roundRect(-150, -100, 300, 200, 12));
  blob(ctx, "#fff", () => ctx.roundRect(-138, -88, 132, 176, 6), 5);
  blob(ctx, "#fff", () => ctx.roundRect(6, -88, 132, 176, 6), 5);
  for (const ex of [-72, 72]) {
    if (asleep) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(ex, -16, 22, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      blob(ctx, "#fff", () => ellipse(ctx, ex, -10, 28, 34), 6);
      blob(ctx, INK, () => circle(ctx, ex - 9, -6, 13), 0);
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  if (asleep) circle(ctx, 0, 50, 10);
  else {
    ctx.moveTo(-24, 50);
    ctx.lineTo(24, 50);
  }
  ctx.stroke();
}

/** A4 · He opened the book; they stared at each other; both fell asleep. */
export function bookNaanum(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const asleep = line === 4 && share > 0.2;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 690, zoom: 1.0 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 4 ? "happy" : line === 2 ? "normal" : "proud",
    arm: "hold",
    holding: (c) => {
      c.translate(100, 100);
      c.scale(0.75, 0.75);
      openBook(c, t, false);
    },
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 1 || line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 3 ? "scratch" : "down",
  });
  thought(ctx, 540, 420, 440, 290, t, l2.start + 0.2, Infinity, [300, 560], (c) => {
    c.fillStyle = "#FFF3B0";
    c.fillRect(-220, -145, 440, 290);
    drawPerson(c, -120, 130, NAAN, { t, scale: 0.32, face: 1, mood: asleep ? "sleep" : "normal" });
    c.save();
    c.translate(90, 0);
    c.scale(0.6, 0.6);
    bookFace(c, asleep);
    c.restore();
    if (asleep) zzz(c, 30, -40, t);
  });
  if (line === 0) shout(ctx, "EXAM PREP 📖", 450, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#4CC9F0", 80, -0.05, 740);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 3) mark(ctx, "?", 860, 440, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "RENDU PERUM THOOKAM 😴", 540, 170, easeOutBack((share - 0.6) / 0.2), "#FFD400", 66, -0.04, 940);
  ctx.restore();
}

// ─── F12 · 70% mazhai ─────────────────────────────────────────────────────────

/** Rain streaking down over the scene. */
function rain(ctx: Ctx, t: number, amount: number) {
  if (amount <= 0) return;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.75 * amount})`;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const x = ((i * 97) % 1500) - 200;
    const y = ((t * 1100 + i * 131) % 1500) - 200;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 12, y + 46);
    ctx.stroke();
  }
  ctx.restore();
}

/** F12 · 70% chance of rain — so they'll go out for the other 30%. */
export function mazhai70(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  street(ctx, t, true);
  ctx.fillStyle = "rgba(60,70,100,0.22)";
  ctx.fillRect(-600, -600, 2300, 3200);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 || line === 2 ? "proud" : "normal",
    arm: line === 2 || line === 4 ? "thumb" : line === 0 ? "hold" : "down",
    holding: line === 0 ? (c) => phone(c, t, 0.7) : undefined,
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 1 ? "happy" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 3 ? "scratch" : "down",
  });
  if (line === 0) {
    screenCard(ctx, 545, 560, easeOutBack((t - l0.start - 0.4) / 0.3) * 0.7, "🌧️ WEATHER", (c) => {
      write(c, "70%", 0, -20, 150, "#3A86FF");
      write(c, "Mazhai varum", 0, 130, 46);
    }, "#457B9D");
  }
  if (line === 4) {
    screenCard(ctx, 545, 560, easeOutBack((share - 0.05) / 0.25) * 0.7, "⏰ INNAIKKU PLAN", (c) => {
      const a0 = -Math.PI / 2;
      const rainy = easeOut((share - 0.15) / 0.25);
      const out = easeOut((share - 0.4) / 0.2);
      blob(c, "#3A86FF", () => {
        c.moveTo(0, 30);
        c.arc(0, 30, 160, a0, a0 + Math.PI * 2 * 0.7 * rainy);
        c.closePath();
      });
      if (out > 0) {
        blob(c, "#FFD166", () => {
          c.moveTo(0, 30);
          c.arc(0, 30, 160, a0 + Math.PI * 1.4, a0 + Math.PI * 2 * (0.7 + 0.3 * out));
          c.closePath();
        });
      }
      if (rainy > 0.9) write(c, "🌧️ 70%", 60, 90, 42, "#fff");
      if (out > 0.9) write(c, "😎 30%", -75, -30, 36);
    }, "#457B9D");
  }
  rain(ctx, t, line === 4 ? easeOut((share - 0.65) / 0.2) : 0);
  if (line === 0) shout(ctx, "70% MAZHAI ☔", 450, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#4CC9F0", 80, -0.05, 740);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) shout(ctx, "POGALAAM! 😎", 450, 300, easeOutBack((t - l2.start - 0.2) / 0.3), "#80ED99", 84, -0.05, 740);
  if (line === 3) mark(ctx, "?!", 860, 440, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) shout(ctx, "30% TIME VELIYA! 😂", 540, 300, easeOutBack((share - 0.6) / 0.2), "#FFD400", 72, -0.05, 920);
  ctx.restore();
}

// ─── A21 · Thakkali vilai ─────────────────────────────────────────────────────

const VENDOR: Look = { skin: "#B5764A", shirt: "#F8F9FA", pants: "#3B3B4F", hair: "short", mustache: true };

function tomato(ctx: Ctx, x: number, y: number, r = 22) {
  blob(ctx, "#E63946", () => circle(ctx, x, y, r), 5);
  blob(ctx, "#2DC653", () => ellipse(ctx, x, y - r + 3, r * 0.45, r * 0.22), 0);
}

/** The market, remembered: the vendor, his tomatoes, and what he said (`price`). */
function market(ctx: Ctx, t: number, price: string, priceColor: string) {
  ctx.fillStyle = "#FFE8D6";
  ctx.fillRect(-220, -145, 440, 290);
  drawPerson(ctx, -90, 140, VENDOR, { t, scale: 0.3, face: 1, mood: "happy" });
  blob(ctx, "#A9744F", () => ctx.rect(-10, 70, 200, 75), 6);
  for (let i = 0; i < 6; i++) tomato(ctx, 20 + (i % 3) * 60 + (i > 2 ? 30 : 0), 60 - (i > 2 ? 30 : 0), 24);
  blob(ctx, "#fff", () => ctx.roundRect(-30, -120, 220, 80, 20), 6);
  write(ctx, price, 80, -79, 40, priceColor);
}

/** A21 · He asked the tomato price. He never said he remembered it. */
export function thakkali(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 690, zoom: 1.0 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 4 ? "happy" : line === 3 ? "shocked" : "proud",
    arm: "hold",
    holding: (c) => {
      shoppingBag(c);
      tomato(c, -25, 34, 20);
      tomato(c, 15, 28, 20);
    },
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 1 ? "happy" : line >= 3 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 3 ? "point" : line === 1 ? "cheeks" : "down",
  });
  thought(ctx, 540, 420, 440, 290, t, l0.start + 0.3, l0.end + 0.2, [300, 560], (c) => market(c, t, "₹80 / kg", "#E63946"));
  thought(ctx, 540, 420, 440, 290, t, p.start + 0.2, Infinity, [300, 560], (c) => {
    market(c, t, share > 0.35 ? "₹ ? ? ?" : "₹80 / kg", share > 0.35 ? "#6C757D" : "#E63946");
    if (share > 0.35) {
      for (let i = 0; i < 3; i++) write(c, "❓", -150 + i * 70, -60 + Math.sin(t * 4 + i) * 12, 44);
    }
  });
  if (line === 1) mark(ctx, "₹?", 860, 440, t, l1.start + 0.1, "#80ED99");
  if (line === 2) shout(ctx, "AVARU SONNAARU 👍", 450, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 72, -0.05, 740);
  if (line === 3) shout(ctx, "EVLO-NU SOLLU! 😤", 630, 300, easeOutBack((t - l3.start - 0.2) / 0.3), "#FF7B3A", 76, -0.05, 720);
  if (line === 4) shout(ctx, "KETTEN… MARANDHUTTEN 😅", 540, 170, easeOutBack((share - 0.6) / 0.2), "#FFD400", 64, -0.04, 940);
  ctx.restore();
}
