import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import {
  FLOOR, INK, blob, burst, camera, circle, clamp01, drawPerson, easeOut, easeOutBack, ellipse, kick, lineAt, mark, phone, sweat, talkOf, thought,
  type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import { ammaHall, bed, friendsRoom, kitchen, shout, sign, street, table, zzz } from "./props";
import { AMMA, MACHAN, NAAN } from "./scenes-day1";

/** Scenes for the Day 2 batch: F6, F14, F16, F26, F27, A6, A8, A15, A22 (A13 is in scenes-day1.ts). */

type Ctx = SKRSContext2D;

function person(ctx: Ctx, s: SceneState, name: string, look: Look, x: number, face: 1 | -1, pose: Partial<Pose> = {}) {
  drawPerson(ctx, x, FLOOR, look, { t: s.t, talk: talkOf(s, name), face, ...pose });
}

function follow(s: SceneState, at: Record<string, number>, extra: Shot[] = [], zoom = 1.15): Shot[] {
  const story = s.spans.slice(0, -1).map((span, i) => ({ at: span.start - 0.15, x: 540 + ((at[s.speakers[i]] ?? 540) - 540) * 0.45, y: 740, zoom }));
  return [...story, ...extra];
}

const punchShare = (s: SceneState) => {
  const p = s.spans[s.spans.length - 1];
  return (s.t - p.start) / (p.end - p.start);
};

/** Night over the whole world, for flashbacks and sleeping. */
function night(ctx: Ctx, alpha = 0.3) {
  ctx.fillStyle = `rgba(20,20,70,${alpha})`;
  ctx.fillRect(-600, -600, W + 1200, H + 1200);
}

// ─── Things ───────────────────────────────────────────────────────────────────

/** A banknote, its origin at the centre. */
function note(ctx: Ctx, text = "₹100", color = "#B5E48C") {
  blob(ctx, color, () => ctx.roundRect(-95, -50, 190, 100, 10), 7);
  blob(ctx, "rgba(255,255,255,0.5)", () => circle(ctx, -45, 0, 28), 0);
  ctx.font = `44px "ShortFlow Bold"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.fillText(text, 30, 3);
}

/** A tear-off wall calendar showing `word`, `flip` 0–1 turning its top page over. */
function calendar(ctx: Ctx, x: number, y: number, word: string, flip = 0, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  blob(ctx, "#fff", () => ctx.roundRect(-110, -120, 220, 250, 14));
  blob(ctx, "#E63946", () => ctx.roundRect(-110, -120, 220, 60, [14, 14, 0, 0]));
  ctx.font = `${word.length > 6 ? 34 : 46}px "ShortFlow Bold"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.fillText(word, 0, 40);
  if (flip > 0 && flip < 1) {
    // The old page lifting off upwards.
    ctx.save();
    ctx.translate(0, -60);
    ctx.scale(1, 1 - flip);
    blob(ctx, "#F8F9FA", () => ctx.rect(-110, 0, 220, 190), 6);
    ctx.restore();
  }
  ctx.restore();
}

/** A round birthday cake with candles. */
function cake(ctx: Ctx, x: number, y: number, t: number, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  blob(ctx, "#F28482", () => ctx.roundRect(-120, -90, 240, 90, 16));
  blob(ctx, "#FFF1E6", () => ctx.roundRect(-128, -110, 256, 40, 20));
  for (const cx of [-60, 0, 60]) {
    blob(ctx, "#4CC9F0", () => ctx.rect(cx - 8, -170, 16, 60), 5);
    blob(ctx, "#FFB703", () => ellipse(ctx, cx + Math.sin(t * 12 + cx) * 3, -190, 11, 18), 0);
  }
  ctx.restore();
}

/** Glasses over a standing person's eyes (feet at `x`, `y`, facing `face`). */
function glasses(ctx: Ctx, x: number, y: number, face: 1 | -1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  for (const ex of [-24, 60]) {
    ctx.beginPath();
    circle(ctx, ex, -546, 36);
    ctx.fillStyle = "rgba(189,224,254,0.35)";
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(12, -548);
  ctx.lineTo(24, -548);
  ctx.moveTo(-60, -548);
  ctx.lineTo(-108, -556);
  ctx.stroke();
  ctx.restore();
}

/** A city bus seen from the side, its front at the right. */
function bus(ctx: Ctx, x: number, t: number, moving: boolean) {
  const y = FLOOR - 40 + (moving ? Math.sin(t * 18) * 3 : 0);
  blob(ctx, "#E63946", () => ctx.roundRect(x - 330, y - 330, 660, 300, [40, 60, 16, 16]));
  blob(ctx, "#FFD166", () => ctx.rect(x - 330, y - 120, 660, 30), 0);
  for (let i = 0; i < 4; i++) blob(ctx, "#BDE0FE", () => ctx.roundRect(x - 300 + i * 140, y - 300, 110, 110, 12), 7);
  blob(ctx, "#BDE0FE", () => ctx.roundRect(x + 260, y - 300, 60, 150, [10, 40, 10, 10]), 7);
  for (const wx of [x - 200, x + 190]) {
    blob(ctx, INK, () => circle(ctx, wx, y - 20, 58), 0);
    blob(ctx, "#ADB5BD", () => circle(ctx, wx, y - 20, 24), 0);
  }
  sign(ctx, x - 40, y - 150, "LAST BUS", "#2B2D42", "#FFD166", 30);
  if (moving) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 360 - i * 30, y - 260 + i * 80);
      ctx.lineTo(x - 470 - i * 30, y - 260 + i * 80);
      ctx.stroke();
    }
  }
}

/** A small house with a door, labelled VEEDU. */
function house(ctx: Ctx, x: number) {
  blob(ctx, "#FFB4A2", () => ctx.rect(x - 200, FLOOR - 380, 400, 380));
  blob(ctx, "#B5838D", () => {
    ctx.moveTo(x - 240, FLOOR - 370);
    ctx.lineTo(x, FLOOR - 560);
    ctx.lineTo(x + 240, FLOOR - 370);
    ctx.closePath();
  });
  blob(ctx, "#6D4C41", () => ctx.roundRect(x - 60, FLOOR - 230, 120, 230, [50, 50, 0, 0]));
  blob(ctx, "#FFF3B0", () => ctx.rect(x + 90, FLOOR - 300, 80, 80), 7);
  sign(ctx, x, FLOOR - 450, "VEEDU", "#fff", INK, 36);
}

/** A folded shirt, lying flat, its origin at the centre. */
function foldedShirt(ctx: Ctx, color: string) {
  blob(ctx, color, () => ctx.roundRect(-110, -26, 220, 52, 10), 7);
  blob(ctx, "#fff", () => {
    ctx.moveTo(-26, -26);
    ctx.lineTo(0, 6);
    ctx.lineTo(26, -26);
    ctx.closePath();
  }, 6);
}

/** A shirt held up by the collar, with a price tag. */
function shirtOnHanger(ctx: Ctx, tag: string) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(-90, 20);
  ctx.lineTo(90, 20);
  ctx.closePath();
  ctx.stroke();
  blob(ctx, "#9D4EDD", () => {
    ctx.moveTo(-60, 20);
    ctx.lineTo(-130, 60);
    ctx.lineTo(-105, 110);
    ctx.lineTo(-70, 95);
    ctx.lineTo(-70, 250);
    ctx.lineTo(70, 250);
    ctx.lineTo(70, 95);
    ctx.lineTo(105, 110);
    ctx.lineTo(130, 60);
    ctx.lineTo(60, 20);
    ctx.closePath();
  });
  ctx.save();
  ctx.translate(75, 160);
  ctx.rotate(0.15);
  blob(ctx, "#FFD166", () => ctx.roundRect(-10, -30, 150, 60, 10), 6);
  ctx.font = `34px "ShortFlow Bold"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.fillText(tag, 65, 2);
  ctx.restore();
}

/** An open book held in both hands, its origin at the spine's bottom; `upsideDown` writes the title the wrong way. */
function openBook(ctx: Ctx, title: string, upsideDown: boolean, peek?: (ctx: Ctx) => void) {
  blob(ctx, "#2A9D8F", () => ctx.roundRect(-170, -230, 340, 230, 10));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, -230);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.save();
  ctx.translate(-85, -115);
  if (upsideDown) ctx.rotate(Math.PI);
  ctx.font = `40px "ShortFlow Bold"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(title, 0, 0);
  ctx.restore();
  // Hidden on the right page.
  if (peek) peek(ctx);
}

/** A box of sweets, open when `open`. */
function sweetBox(ctx: Ctx, x: number, y: number, open: boolean, left = 6) {
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#FFB703", () => ctx.roundRect(-130, -70, 260, 70, 8));
  for (let i = 0; i < left; i++) blob(ctx, "#FB8500", () => circle(ctx, -90 + (i % 3) * 90, -70 - (i < 3 ? 6 : 30), 30), 6);
  if (!open) {
    blob(ctx, "#E63946", () => ctx.roundRect(-140, -110, 280, 50, 8));
    blob(ctx, "#FFD166", () => ctx.rect(-14, -110, 28, 50), 0);
  }
  ctx.restore();
}

/** One laddu, held. */
const laddu = (ctx: Ctx) => blob(ctx, "#FB8500", () => circle(ctx, 0, -20, 30), 6);

/** A fridge at `x`, its door swung open by `open` 0–1 with the light inside. */
function fridge(ctx: Ctx, x: number, open: number) {
  const top = FLOOR - 640;
  blob(ctx, "#E9ECEF", () => ctx.roundRect(x - 150, top, 300, 640, 24));
  if (open > 0) {
    blob(ctx, "#FFF9C4", () => ctx.rect(x - 130, top + 20, 260, 600), 6);
    for (const sy of [top + 200, top + 380]) blob(ctx, "#CED4DA", () => ctx.rect(x - 130, sy, 260, 14), 0);
    ctx.fillStyle = "rgba(255,249,196,0.35)";
    ctx.beginPath();
    ctx.moveTo(x - 130, top + 20);
    ctx.lineTo(x - 420, top - 80);
    ctx.lineTo(x - 420, FLOOR);
    ctx.lineTo(x - 130, FLOOR - 20);
    ctx.fill();
  }
  // The door, hinged at the right, getting narrower as it opens.
  const w = 300 * (1 - open * 0.8);
  blob(ctx, "#F8F9FA", () => ctx.roundRect(x + 150 - w, top, w, 640, 24));
  blob(ctx, "#ADB5BD", () => ctx.roundRect(x + 150 - w + 24, top + 240, 16, 120, 8), 0);
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

/** F6 · "Lend me 100, I'll return it tomorrow" — every day is tomorrow. */
export function naalaikkuTharen(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 260, Naan: 830 }, [{ at: p.start, x: 470, y: 700, zoom: 1.2 }]));
  friendsRoom(ctx);
  // The calendar over the poster: in the punch its pages keep turning, every one "NAALAI".
  const pages = line === 4 ? clamp01(share - 0.1) * 6 : 0;
  calendar(ctx, 175, 410, line === 4 ? "NAALAI" : line >= 1 ? "NETHU" : "INNAIKKU", pages % 1, 0.75);
  person(ctx, s, "Machan", MACHAN, 260, 1, {
    mood: line === 4 ? "proud" : line === 2 ? "happy" : "normal",
    arm: line === 0 || line === 4 ? "point" : line === 2 ? "thumb" : "down",
  });
  person(ctx, s, "Naan", NAAN, 830, -1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 1 || line === 3 ? "confused" : "normal",
    arm: t >= p.end ? "facepalm" : line === 1 ? "point" : line === 3 ? "hold" : "down",
    holding: line === 3 ? (c) => note(c) : undefined,
  });
  if (line === 0) {
    const pop = easeOutBack((t - l0.start - 0.3) / 0.3);
    if (pop > 0) {
      ctx.save();
      ctx.translate(540, 420);
      ctx.rotate(-0.08);
      ctx.scale(pop * 1.4, pop * 1.4);
      note(ctx);
      ctx.restore();
    }
  }
  if (line === 1) shout(ctx, "NETHUM!", 700, 380, easeOutBack((t - l1.start - 0.3) / 0.3), "#FF7B3A", 80);
  if (line === 3) mark(ctx, "?", 830, 470, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "NAALAIKKU = NEVER!", 540, 300, easeOutBack((share - 0.7) / 0.2), "#FFD400", 66, -0.04, 900);
  ctx.restore();
}

/** F14 · Ran behind the last bus all the way home — and saved the ₹10 fare. */
export function lastBus(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line === 2 || line === 4) {
    // Last night: the bus pulling away with Machan running behind it.
    const from = line === 2 ? l2.start : p.start;
    const run = t - from;
    const busX = line === 2 ? 620 + run * 120 : 900 + run * 320;
    const homeX = 1500 - easeOut((share - 0.35) / 0.4) * 700;
    const home = line === 4 && share > 0.35;
    const stopped = line === 4 && share > 0.75;
    const machanX = line === 2 ? 120 + run * 60 : Math.min(homeX - 260, 160 + run * 120);
    camera(ctx, t, [{ at: from, x: 540, y: 760, zoom: 1.05, move: 0 }]);
    street(ctx, t, false);
    if (home) house(ctx, homeX);
    bus(ctx, busX, t, true);
    person(ctx, s, "Machan", MACHAN, machanX, 1, {
      mood: stopped ? "proud" : "sad",
      arm: stopped ? "thumb" : "down",
      run: stopped ? undefined : run,
    });
    if (!stopped) sweat(ctx, machanX - 90, 640, t, from + 0.3);
    night(ctx);
    if (stopped) shout(ctx, "₹10 SAVE!", 540, 330, easeOutBack((share - 0.78) / 0.15), "#80ED99", 100);
  } else {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }, [], 1.1));
    street(ctx, t);
    // A bus stop pole.
    blob(ctx, "#ADB5BD", () => ctx.rect(530, FLOOR - 560, 22, 560), 6);
    sign(ctx, 541, FLOOR - 600, "BUS STOP", "#2A9D8F", "#fff", 34);
    person(ctx, s, "Machan", MACHAN, 250, 1, { mood: line === 0 ? "sad" : "normal", arm: line === 0 ? "scratch" : "down" });
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 1 ? "shocked" : line === 3 ? "happy" : "normal",
      arm: line === 1 ? "cheeks" : line === 3 ? "point" : "down",
    });
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  }
  ctx.restore();
}

/** F16 · Wants a surprise party but won't say when his birthday is. */
export function surpriseParty(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }, [{ at: p.start, x: 520, y: 720, zoom: 1.15 }]));
  friendsRoom(ctx);
  person(ctx, s, "Machan", MACHAN, 250, 1, {
    mood: line === 4 ? "proud" : line === 2 ? "happy" : "happy",
    arm: line === 0 ? "up" : line === 2 ? "cheeks" : line === 4 ? "point" : "down",
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 16 : 0,
  });
  person(ctx, s, "Naan", NAAN, 840, -1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 3 ? "confused" : line === 1 ? "happy" : "normal",
    arm: t >= p.end ? "facepalm" : line === 1 ? "hold" : line === 3 ? "scratch" : "down",
    holding: line === 1 ? (c) => phone(c, t, 0.8) : undefined,
  });
  thought(ctx, 300, 330, 380, 300, t, l0.start + 0.3, l0.end + 0.2, [260, 560], (c) => cake(c, 0, 80, t, 0.9));
  if (line === 2) shout(ctx, "🤐 SECRET!", 330, 360, easeOutBack((t - l2.start - 0.2) / 0.3), "#FF7B3A", 76);
  if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  if (line === 4) {
    calendar(ctx, 560, 420, "??", 0, easeOutBack((share - 0.1) / 0.25) * 1.2);
    shout(ctx, "SURPRISE!", 540, 300, easeOutBack((share - 0.6) / 0.2), "#FFD400", 96);
  }
  ctx.restore();
}

/** F26 · Glasses on even while sleeping, so the dreams come out clear. */
export function kanavuClear(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }, [], 1.15));
    friendsRoom(ctx);
    bed(ctx, 330, 420);
    person(ctx, s, "Machan", MACHAN, 250, 1, { mood: "proud", arm: line === 0 || line === 2 ? "point" : "down" });
    glasses(ctx, 250, FLOOR, 1);
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 3 ? "confused" : line === 1 ? "happy" : "normal",
      arm: line === 3 ? "scratch" : line === 1 ? "thumb" : "down",
    });
    if (line === 0) shout(ctx, "FULL TIME 👓", 540, 380, easeOutBack((t - l0.start - 0.4) / 0.3), "#4CC9F0", 72);
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  } else {
    // Asleep with the glasses on, and a dream in 4K.
    camera(ctx, t, [{ at: p.start, x: 540, y: 760, zoom: 1.1, move: 0 }], kick(t, p.start, 0.3) * 0.4);
    friendsRoom(ctx);
    bed(ctx, 200, 720);
    ctx.save();
    ctx.translate(870, FLOOR - 225);
    ctx.rotate(-Math.PI / 2);
    drawPerson(ctx, 0, 0, MACHAN, { t, mood: "sleep", face: 1 });
    glasses(ctx, 0, 0, 1);
    ctx.restore();
    blob(ctx, "#E76F51", () => ctx.roundRect(470, FLOOR - 330, 420, 140, 30));
    night(ctx, 0.25);
    zzz(ctx, 760, FLOOR - 520, t);
    thought(ctx, 470, 470, 560, 400, t, p.start + 0.3, Infinity, [720, FLOOR - 400], (c) => {
      // A crisp dream: Machan on a beach, sun and all.
      c.fillStyle = "#8ECAE6";
      c.fillRect(-300, -220, 600, 440);
      c.fillStyle = "#FFD166";
      c.fillRect(-300, 60, 600, 200);
      blob(c, "#FFB703", () => circle(c, 130, -80, 60), 6);
      drawPerson(c, -60, 140, MACHAN, { t, mood: "laugh", face: 1, arm: "up", scale: 0.35 });
      // Labelled like a TV picture, inside the dream.
      const pop = easeOutBack((share - 0.5) / 0.2);
      if (pop > 0) {
        c.save();
        c.translate(-150, -60);
        c.scale(pop, pop);
        sign(c, 0, 0, "4K HD", "#E63946", "#fff", 40);
        c.restore();
      }
    });
    shout(ctx, "CLEAR DREAM!", 540, 760, easeOutBack((share - 0.6) / 0.2), "#FFD400", 80, -0.04);
  }
  ctx.restore();
}

/** F27 · ₹999 is a rupee less than 1000 — so ten shirts "save" ₹10. */
export function shirt999(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const piled = line === 4 ? Math.min(10, Math.floor(clamp01(share / 0.6) * 10) + 1) : 0;
  const colors = ["#9D4EDD", "#3A86FF", "#FF006E", "#FB5607", "#2A9D8F", "#FFBE0B", "#8338EC", "#06D6A0", "#EF476F", "#118AB2"];
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 240, Naan: 850 }, [{ at: p.start, x: 520, y: 720, zoom: 1.12 }]));
  friendsRoom(ctx);
  table(ctx, 380, 320, 260);
  for (let i = 0; i < piled; i++) {
    ctx.save();
    ctx.translate(540 + Math.sin(i * 2.1) * 10, FLOOR - 290 - i * 52);
    foldedShirt(ctx, colors[i]);
    ctx.restore();
  }
  person(ctx, s, "Machan", MACHAN, 240, 1, {
    mood: line === 4 ? "proud" : line === 2 ? "happy" : "proud",
    arm: line < 3 ? "hold" : line === 4 ? "thumb" : "down",
    holding: line < 3 ? (c) => { c.translate(30, -40); shirtOnHanger(c, line === 2 ? "1000-1" : "₹999"); } : undefined,
  });
  person(ctx, s, "Naan", NAAN, 850, -1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 1 ? "shocked" : line === 3 ? "confused" : "normal",
    arm: t >= p.end ? "facepalm" : line === 1 ? "cheeks" : "down",
  });
  if (line === 1) mark(ctx, "!", 850, 470, t, l1.start + 0.1, "#FF3B5C");
  if (line === 2) shout(ctx, "-₹1", 640, 380, easeOutBack((t - l2.start - 0.8) / 0.3), "#80ED99", 90);
  if (line === 3) mark(ctx, "?", 850, 470, t, l3.start + 0.1);
  if (line === 4) {
    shout(ctx, `x${piled}`, 760, 560, easeOutBack(((share / 0.6) * 10 - (piled - 1)) / 0.4), "#FFD400", 90);
    shout(ctx, "₹10 SAVING!", 540, 260, easeOutBack((share - 0.65) / 0.15), "#80ED99", 90);
    if (t >= p.end) shout(ctx, "BILL ₹9,990 😵", 540, 430, easeOutBack((t - p.end) / 0.3), "#FF3B5C", 64, 0.04);
  }
  ctx.restore();
}

/** How far a person sitting on the sofa is drawn below a standing one. */
const SIT = 100;

/** A sofa: `back` behind whoever sits on it, `front` drawn over their legs. */
function sofa(ctx: Ctx, x: number, w: number, part: "back" | "front") {
  if (part === "back") {
    blob(ctx, "#457B9D", () => ctx.roundRect(x, FLOOR - 420, w, 300, 40));
    return;
  }
  blob(ctx, "#1D3557", () => ctx.roundRect(x - 30, FLOOR - 230, 70, 190, 24));
  blob(ctx, "#1D3557", () => ctx.roundRect(x + w - 40, FLOOR - 230, 70, 190, 24));
  blob(ctx, "#457B9D", () => ctx.roundRect(x + 20, FLOOR - 140, w - 40, 110, 20));
  blob(ctx, "#2B2D42", () => ctx.rect(x + 30, FLOOR - 30, 26, 30), 0);
  blob(ctx, "#2B2D42", () => ctx.rect(x + w - 56, FLOOR - 30, 26, 30), 0);
}

/** A big call screen: who is on the line and how long they've talked. */
function callCard(ctx: Ctx, x: number, y: number, who: string, seconds: number, pop: number) {
  if (pop <= 0) return;
  const s = Math.floor(seconds);
  const time = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  blob(ctx, "#2B2D42", () => ctx.roundRect(-250, -95, 500, 190, 34));
  blob(ctx, "#2DC653", () => circle(ctx, -170, 0, 50), 6);
  ctx.font = `56px "ShortFlow Bold", "ShortFlow Emoji"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("📞", -170, 4);
  ctx.textAlign = "left";
  ctx.font = `44px "ShortFlow Bold", "ShortFlow Emoji"`;
  ctx.fillStyle = "#fff";
  ctx.fillText(who, -95, -34);
  ctx.font = `64px "ShortFlow Bold"`;
  ctx.fillStyle = "#80ED99";
  ctx.fillText(time, -95, 36);
  ctx.restore();
}

/** A wall clock whose hands spin `speed` times faster than real time. */
function fastClock(ctx: Ctx, x: number, y: number, t: number, speed: number) {
  blob(ctx, "#fff", () => circle(ctx, x, y, 70));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(t * speed) * 50, y + Math.sin(t * speed) * 50);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(t * speed / 12) * 32, y + Math.sin(t * speed / 12) * 32);
  ctx.stroke();
}

/**
 * A6 · An hour on the phone with Amma's sister. Amma grabs the phone — not to
 * scold, but to talk to her for two more hours.
 */
export function thangachiCall(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const ammaHas = line === 4;
  // The phone flies from Naan's hand to Amma's at the end of "Phone-ah kudu!".
  const grab = clamp01((t - (l2.end - 0.3)) / 0.35);
  const naanHas = line < 2 || (line === 2 && grab < 0.5);
  ctx.save();
  if (!ammaHas) {
    camera(ctx, t, follow(s, { Naan: 330, Amma: 820 }, [], 1.1), kick(t, l2.start, 0.3) * 0.5);
    ammaHall(ctx, t);
    sofa(ctx, 140, 380, "back");
    // Sitting back on the sofa, chatting away.
    ctx.save();
    ctx.translate(0, SIT);
    person(ctx, s, "Naan", NAAN, 330, 1, {
      mood: line === 3 ? "confused" : line === 2 ? "shocked" : "happy",
      arm: naanHas ? "hold" : line === 3 ? "scratch" : "down",
      holding: naanHas ? (c) => phone(c, t, 0.3, -0.5) : undefined,
    });
    ctx.restore();
    sofa(ctx, 140, 380, "front");
    const angry = line === 0;
    const thrilled = line >= 2 || (line === 1 && t > l1.end - 0.2);
    person(ctx, s, "Amma", AMMA, 820, -1, {
      mood: thrilled ? "laugh" : angry ? "confused" : "normal",
      arm: line === 0 ? "point" : line === 2 ? (grab > 0.5 ? "hold" : "point") : line === 3 ? "hold" : "down",
      holding: !naanHas ? (c) => phone(c, t, 0.3) : undefined,
      jump: line === 2 ? Math.abs(Math.sin((t - l2.start) * 9)) * 18 : 0,
    });
    if (grab > 0 && grab < 1) {
      // The phone in the air.
      ctx.save();
      ctx.translate(480 + grab * 330, 760 - Math.sin(grab * Math.PI) * 220);
      ctx.rotate(grab * 6);
      phone(ctx, t, 0.3);
      ctx.restore();
    }
    // The call timer ticking past an hour, then the caller's name.
    const callSec = 3590 + Math.max(0, t - l0.start) * 4;
    callCard(ctx, 540, 380, line >= 1 ? "CHITHI ❤️" : "Unknown…", callSec, easeOutBack((t - l0.start) / 0.3) * (line >= 2 ? 1 - easeOut((t - l2.start) / 0.3) : 1));
    if (line === 0) shout(ctx, "1 HOUR?!", 760, 540, easeOutBack((t - l0.start - 0.6) / 0.3), "#FF7B3A", 76, 0.06);
    if (line === 1) burst(ctx, 820, 470, 150, t, l1.end - 0.2, "#FF8FAB");
    if (line === 2) shout(ctx, "KUDU!", 800, 400, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD400", 96);
    if (line === 3) mark(ctx, "?", 330, 600, t, l3.start + 0.1);
  } else {
    // Amma settles into the sofa for the long call; the clock races two hours; Naan falls asleep standing.
    camera(ctx, t, [{ at: p.start, x: 540, y: 740, zoom: 1.08, move: 0 }]);
    ammaHall(ctx, t);
    fastClock(ctx, 150, 400, t, 1 + clamp01(share - 0.2) * 40);
    sofa(ctx, 140, 380, "back");
    ctx.save();
    ctx.translate(0, SIT);
    person(ctx, s, "Amma", AMMA, 330, 1, {
      mood: "laugh",
      arm: "hold",
      holding: (c) => phone(c, t, 0.3, -0.5),
    });
    ctx.restore();
    sofa(ctx, 140, 380, "front");
    const asleep = share > 0.6;
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: asleep ? "sleep" : "shocked",
      arm: asleep ? "down" : "cheeks",
    });
    if (asleep) zzz(ctx, 760, 520, t);
    // Evening falling while they talk.
    night(ctx, clamp01((share - 0.3) / 0.7) * 0.35);
    callCard(ctx, 540, 380, "CHITHI ❤️", clamp01((share - 0.15) / 0.85) * 7200, easeOutBack(share / 0.2));
    shout(ctx, "+2 HOURS!", 540, 560, easeOutBack((share - 0.55) / 0.2), "#FF3B5C", 96, -0.05);
  }
  ctx.restore();
}

/** A8 · "Appa's coming, study!" — no: act like you're studying. */
export function padikkuraMaadhiri(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const acting = line === 4 && share > 0.35;
  ctx.save();
  camera(ctx, t, [...follow(s, { Naan: 260, Amma: 830 }), { at: p.start, x: 400, y: 720, zoom: 1.2 }]);
  ammaHall(ctx, t);
  // The front door at the right, Appa's shadow growing in it.
  blob(ctx, "#8D5B3B", () => ctx.rect(960, FLOOR - 560, 200, 560));
  if (line >= 0) {
    const near = clamp01((t - l0.start) / (p.end - l0.start));
    ctx.fillStyle = `rgba(30,27,46,${0.2 + near * 0.4})`;
    ctx.beginPath();
    ellipse(ctx, 1060, FLOOR - 380, 40 + near * 30, 50 + near * 40);
    ctx.fill();
  }
  person(ctx, s, "Naan", NAAN, 260, 1, {
    mood: acting ? "proud" : line === 0 ? "shocked" : line === 3 ? "confused" : "normal",
    arm: "hold",
    holding: acting
      ? (c) => {
          c.translate(40, 190);
          openBook(c, "MATHS", true, (cc) => {
            cc.save();
            cc.translate(85, -115);
            cc.scale(0.85, 0.85);
            phone(cc, t, 0.9);
            cc.restore();
          });
        }
      : (c) => phone(c, t, 0.9),
  });
  if (acting) {
    // Glasses for the act.
    glasses(ctx, 260, FLOOR, 1);
  }
  person(ctx, s, "Amma", AMMA, 830, -1, {
    mood: line === 4 ? "proud" : line === 0 ? "shocked" : "normal",
    arm: line === 0 ? "point" : acting ? "thumb" : "down",
  });
  if (line === 0) shout(ctx, "APPA VARAARU!", 540, 360, easeOutBack((t - l0.start - 0.3) / 0.3), "#FF3B5C", 76);
  if (line === 3) mark(ctx, "?", 260, 470, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "ACTION! 🎬", 540, 310, easeOutBack((share - 0.5) / 0.2), "#FFD400", 96);
  if (acting && share > 0.6) shout(ctx, "UPSIDE DOWN!", 330, 420, easeOutBack((share - 0.8) / 0.15), "#4CC9F0", 56, 0.1);
  ctx.restore();
}

/** A15 · The sweets are for tomorrow's guest — so today's guest eats them. */
export function guestSweet(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const eating = line === 4 && share > 0.4;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 250, Amma: 850 }, [{ at: p.start, x: 480, y: 720, zoom: 1.18 }]));
  ammaHall(ctx, t);
  table(ctx, 400, 280, 300, "#A9744F");
  sweetBox(ctx, 540, FLOOR - 300, line >= 3, eating ? Math.max(0, 5 - Math.floor((share - 0.4) * 10)) : 6);
  if (line === 3) calendar(ctx, 865, 370, "NAALAI", 0, 0.7);
  person(ctx, s, "Naan", NAAN, 250, 1, {
    mood: eating ? "laugh" : line === 1 ? "sad" : "happy",
    arm: eating ? "hold" : line === 0 ? "point" : "down",
    holding: eating ? laddu : undefined,
  });
  if (eating) {
    // A paper badge on his shirt.
    sign(ctx, 260, FLOOR - 290, "GUEST", "#FFD166", INK, 30);
  }
  person(ctx, s, "Amma", AMMA, 850, -1, {
    mood: eating ? "shocked" : line === 1 ? "confused" : "normal",
    arm: eating ? "cheeks" : line === 1 ? "point" : "down",
  });
  if (line === 1) shout(ctx, "THODAADHA!", 700, 360, easeOutBack((t - l1.start - 0.3) / 0.3), "#FF3B5C", 80);
  if (line === 3) mark(ctx, "!", 250, 470, t, l3.start + 0.1);
  if (eating) shout(ctx, "INNAIKKU GUEST = NAAN 😎", 540, 310, easeOutBack((share - 0.55) / 0.2), "#FFD400", 60, -0.04, 940);
  ctx.restore();
}

/** A22 · The fridge was open, the cake came out — and went straight into his stomach. */
export function fridgeCake(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const open = clamp01((t - l0.start - 0.3) / 0.5);
  // The cake: on its shelf, floating out in line 3, then flying into his mouth in the punch.
  const out = clamp01((t - l2.start - 0.3) / 1.2);
  const fly = line === 4 ? easeOut((share - 0.2) / 0.5) : 0;
  const gone = line === 4 && share > 0.7;
  const cakeX = 900 - out * 280 - fly * 360;
  const cakeY = FLOOR - 470 - out * 250 + fly * 230 + Math.sin(t * 4) * 10 * (out - fly);
  ctx.save();
  camera(ctx, t, [...follow(s, { Naan: 220, Amma: 640 }), { at: p.start, x: 440, y: 720, zoom: 1.12 }], kick(t, p.start + (p.end - p.start) * 0.7, 0.3) * 0.5);
  kitchen(ctx);
  fridge(ctx, 930, open);
  if (!gone) cake(ctx, cakeX, cakeY, t, 0.6 - fly * 0.3);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: gone ? "laugh" : line === 4 ? "happy" : "normal",
    arm: gone ? "hold" : line === 2 ? "point" : "down",
    // Only the empty cake board is left in his hand.
    holding: gone
      ? (c) => {
          blob(c, "#E9ECEF", () => ellipse(c, 0, -10, 80, 16), 6);
          for (const cx of [-30, 10, 40]) blob(c, "#F28482", () => circle(c, cx, -24, 7), 0);
        }
      : undefined,
  });
  if (gone) {
    // A dollop of cream on his cheek and chin.
    blob(ctx, "#FFF1E6", () => ellipse(ctx, 300, FLOOR - 470, 34, 20, 0.3), 6);
    blob(ctx, "#F28482", () => circle(ctx, 300, FLOOR - 488, 10), 0);
    burst(ctx, 280, FLOOR - 500, 130, t, p.start + (p.end - p.start) * 0.7, "#FFD400");
  }
  person(ctx, s, "Amma", AMMA, 640, -1, {
    mood: gone ? "shocked" : line === 3 ? "confused" : "normal",
    arm: gone ? "cheeks" : line === 1 ? "point" : "down",
  });
  if (line === 3) mark(ctx, "?", 640, 470, t, l3.start + 0.1);
  if (gone) shout(ctx, "GULP!", 440, 330, easeOutBack((share - 0.72) / 0.15), "#FF7B3A", 110);
  ctx.restore();
}
