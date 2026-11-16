import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  FLOOR, INK, blob, burst, camera, circle, clamp01, drawPerson, easeOut, easeOutBack, ellipse, lineAt, mark, phone, pulseRing, stink, sweat, talkOf,
  thought, type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import { ammaHall, bike, biryani, friendsRoom, kitchen, shout, sign, street, table, zzz } from "./props";
import { AMMA, MACHAN, NAAN } from "./scenes-day1";

/** Scenes for the Day 4 batch: F9, A18, F11, A16, F19, A5, F24, A30, F13, A25. */

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

/** Two little ticks, as on a read message, ending at `x` (the fonts have no ✓). */
function ticks(ctx: Ctx, x: number, y: number, color: string, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const dx of [-36, -16]) {
    ctx.beginPath();
    ctx.moveTo(dx - 10, 0);
    ctx.lineTo(dx - 2, 8);
    ctx.lineTo(dx + 14, -10);
    ctx.stroke();
  }
  ctx.restore();
}

/** A banknote, its origin at the centre. */
function note(ctx: Ctx, text: string) {
  blob(ctx, "#B5E48C", () => ctx.roundRect(-95, -50, 190, 100, 10), 7);
  blob(ctx, "rgba(255,255,255,0.5)", () => circle(ctx, -45, 0, 28), 0);
  write(ctx, text, 30, 3, 44);
}

// ─── F9 · Natural selfie ──────────────────────────────────────────────────────

const SELFIE_FRIEND: Look = { skin: "#E3A87C", shirt: "#06D6A0", pants: "#2B2D42", hair: "short", hairColor: "#4A2C1A" };

/** A phone held up big with the selfie on it, sparkling, and `caption` under the picture. */
function selfiePhone(ctx: Ctx, t: number, caption: string, captionColor: string) {
  blob(ctx, "#2B2D42", () => ctx.roundRect(-230, -300, 460, 600, 44));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-200, -262, 400, 470, 22);
  ctx.clip();
  ctx.fillStyle = "#FFC8DD";
  ctx.fillRect(-200, -262, 400, 470);
  drawPerson(ctx, 0, 330, SELFIE_FRIEND, { t, mood: "proud", face: 1, scale: 0.75 });
  ctx.restore();
  for (const [i, [sx, sy]] of ([[-140, -200], [150, -170], [-150, 60], [150, 90]] as const).entries()) {
    write(ctx, "✨", sx, sy + Math.sin(t * 4 + i * 2) * 8, 52);
  }
  write(ctx, caption, 0, 256, 36, captionColor);
}

/** F9 · A no-filter selfie that looks great — because it's his friend's photo. */
export function naturalSelfie(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const reveal = line === 4 && share > 0.45;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 720, zoom: 1.12 }]));
  friendsRoom(ctx);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 ? "happy" : "proud",
    arm: line <= 0 ? "up" : "point",
    holding: line <= 0 ? (c) => phone(c, t, 0.8) : undefined,
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 3 || line === 4 ? "shocked" : line >= 1 ? "happy" : "normal",
    arm: done ? "facepalm" : line === 1 ? "thumb" : line === 3 ? "cheeks" : "down",
  });
  popped(ctx, 545, 580, easeOutBack((t - l0.start - 0.6) / 0.3) * 0.7, () =>
    selfiePhone(ctx, t, reveal ? "📸 Friend-oda photo" : "Machan 😎", reveal ? "#FFD400" : "#fff"));
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) shout(ctx, "NO FILTER ✅", 545, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 76);
  if (line === 3) shout(ctx, "NATURAL?! 😍", 580, 300, easeOutBack((t - l3.start - 0.2) / 0.3), "#FF8FAB", 76);
  if (line === 4) {
    // The face in the photo isn't Machan's.
    pulseRing(ctx, 545, 528, 85, t, p.start + (p.end - p.start) * 0.3);
    shout(ctx, "IDHU EN FRIEND! 😂", 540, 300, easeOutBack((share - 0.5) / 0.2), "#FFD400", 76, -0.05, 940);
  }
  ctx.restore();
}

// ─── A18 · Chair wardrobe ─────────────────────────────────────────────────────

const CLOTHES = ["#E63946", "#457B9D", "#F4A261", "#8338EC", "#2A9D8F", "#FFB703", "#FF8FAB", "#06D6A0", "#3A86FF", "#B5838D", "#F77F00", "#9D4EDD"];

/** A chair facing left at `x`, buried under `layers` of clothes; the first `tags` of them wear a queue number. */
function clothesChair(ctx: Ctx, x: number, t: number, layers: number, tags: number) {
  const seat = FLOOR - 290;
  blob(ctx, "#8D5B3B", () => ctx.roundRect(x + 90, FLOOR - 640, 34, 640, 10));
  blob(ctx, "#8D5B3B", () => ctx.rect(x - 120, seat, 30, FLOOR - seat));
  blob(ctx, "#A9744F", () => ctx.roundRect(x - 140, seat - 10, 270, 40, 12));
  ctx.save();
  ctx.translate(x, seat - 10);
  // The tower sways a little, as if one more shirt would topple it.
  ctx.rotate(Math.sin(t * 2.2) * 0.015);
  for (let i = 0; i < layers; i++) {
    const w = 250 - (i % 3) * 30 - i * 5;
    const colour = CLOTHES[i % CLOTHES.length];
    ctx.save();
    ctx.translate(Math.sin(i * 2.1) * 26, -26 - i * 46);
    ctx.rotate(Math.sin(i * 1.7) * 0.1);
    // A sleeve hanging down over the pile now and then.
    if (i % 3 === 1) blob(ctx, colour, () => ctx.roundRect(w / 2 - 40, -6, 44, 120, 18), 7);
    blob(ctx, colour, () => ctx.roundRect(-w / 2, -26, w, 52, 24), 7);
    if (i < tags) {
      blob(ctx, "#fff", () => ctx.roundRect(-48, -20, 96, 40, 10), 5);
      write(ctx, `No.${i + 1}`, 0, 2, 26);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** A18 · "I put my shirt in the wash" — on the chair, the wash's waiting area. */
export function chairWardrobe(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const layers = 10;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 880 }, [{ at: l2.start - 0.15, x: 560, y: 640, zoom: 1.12 }, { at: p.start, x: 560, y: 660, zoom: 1.08 }]));
  ammaHall(ctx, t);
  clothesChair(ctx, 560, t, layers, line === 4 ? Math.floor(clamp01((share - 0.4) / 0.45) * layers) : 0);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 0 || line === 4 ? "proud" : "happy",
    arm: line === 0 || line === 4 ? "thumb" : line === 2 ? "point" : "down",
  });
  person(ctx, s, "Amma", AMMA, 880, -1, {
    mood: done ? "shocked" : line === 1 ? "confused" : line >= 3 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 1 ? "scratch" : line === 3 ? "cheeks" : "down",
  });
  if (line === 0) shout(ctx, "WASH-KU POTTACHU 👕", 470, 320, easeOutBack((t - l0.start - 0.4) / 0.3), "#4CC9F0", 70, -0.05, 760);
  if (line === 1) mark(ctx, "?", 880, 440, t, l1.start + 0.1);
  if (line === 2) {
    pulseRing(ctx, 560, 680, 270, t, l2.start + 0.3);
    shout(ctx, "CHAIR MELA 🪑", 560, 320, easeOutBack((t - l2.start - 0.4) / 0.3), "#FFD400", 80);
  }
  if (line === 3) mark(ctx, "?!", 880, 440, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) popped(ctx, 560, 360, easeOutBack((share - 0.2) / 0.25), () => sign(ctx, 0, 0, "WASH WAITING AREA ⏳", "#2B2D42", "#FFD166", 46));
  ctx.restore();
}

// ─── F11 · Mystery dish ───────────────────────────────────────────────────────

/** A pot of something nobody can name: `colours` swirled together, bubbling; its origin at the bottom. */
function mysteryPot(ctx: Ctx, t: number, colours: string[]) {
  blob(ctx, "#495057", () => ctx.roundRect(-152, -120, 34, 22, 8));
  blob(ctx, "#495057", () => ctx.roundRect(118, -120, 34, 22, 8));
  blob(ctx, "#495057", () => ctx.roundRect(-125, -150, 250, 150, [10, 10, 44, 44]));
  ctx.save();
  ctx.beginPath();
  ellipse(ctx, 0, -150, 118, 28);
  ctx.clip();
  const band = 236 / colours.length;
  colours.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(-118 + i * band + Math.sin(t * 3 + i) * 8, -180, band + 4, 60);
  });
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ellipse(ctx, 0, -150, 118, 28);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.9 + i / 4) % 1;
    ctx.globalAlpha = 1 - ph;
    blob(ctx, colours[i % colours.length], () => circle(ctx, -70 + i * 45, -165 - ph * 70, 12 + ph * 10), 5);
  }
  ctx.globalAlpha = 1;
}

/** A recipe video's thumbnail: the dish, a play button and its name. */
function recipeVideo(ctx: Ctx, emoji: string, name: string) {
  blob(ctx, "#111", () => ctx.roundRect(-115, -75, 230, 150, 16));
  write(ctx, emoji, -40, -8, 70);
  blob(ctx, "#FF0000", () => ctx.roundRect(30, -32, 66, 46, 12), 0);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(54, -20);
  ctx.lineTo(76, -9);
  ctx.lineTo(54, 2);
  ctx.fill();
  write(ctx, name, 0, 50, 26, "#fff");
}

function spoon(ctx: Ctx) {
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-8, -110, 16, 120, 8), 6);
  blob(ctx, "#ADB5BD", () => ellipse(ctx, 0, -130, 26, 36), 6);
}

const RECIPES = [["🍗", "BIRYANI"], ["🎂", "CAKE"], ["🍲", "RASAM"], ["🍜", "NOODLES"]] as const;

/** F11 · "I cooked — taste it!" What dish? Four recipe videos, all in one pot. */
export function mysteryDish(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 660, zoom: 1.1 }]));
  kitchen(ctx);
  table(ctx, 400, 280, 300);
  ctx.save();
  ctx.translate(540, FLOOR - 330);
  mysteryPot(ctx, t, ["#F4A261", "#FF8FAB", "#E63946", "#FFD166"]);
  ctx.restore();
  if (line >= 3) stink(ctx, 540, FLOOR - 520, t, 3);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 2 ? "confused" : line === 4 ? "proud" : "happy",
    arm: line === 0 ? "point" : line === 2 ? "scratch" : line === 4 ? "thumb" : "down",
  });
  const sick = done || (line === 4 && share > 0.6);
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: sick ? "sad" : line === 3 || line === 4 ? "shocked" : line === 2 ? "confused" : "happy",
    arm: done ? "facepalm" : line >= 1 ? "hold" : "down",
    holding: !done && line >= 1 ? spoon : undefined,
  });
  if (sick) sweat(ctx, 960, 610, t, p.start + (p.end - p.start) * 0.6);
  if (line === 0) shout(ctx, "MACHAN SPECIAL 🍳", 450, 300, easeOutBack((t - l0.start - 0.4) / 0.3), "#FFD400", 76, -0.05, 760);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) mark(ctx, "🤷", 220, 420, t, l2.start + 0.2, "#FFD400", 110);
  if (line === 3) mark(ctx, "?!", 860, 440, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    RECIPES.forEach(([emoji, name], i) => {
      const pop = easeOutBack((share - 0.05 - i * 0.1) / 0.2);
      // All four drop into the pot together once they're up.
      const fall = easeOut((share - 0.55 - i * 0.05) / 0.2);
      if (fall >= 1) return;
      const x0 = 540 + (i - 1.5) * 225;
      popped(ctx, x0 + (540 - x0) * fall, 330 + fall * 480, pop * 0.85 * (1 - fall * 0.8), () => recipeVideo(ctx, emoji, name));
    });
    if (share > 0.75) burst(ctx, 540, 720, 140, t, p.start + (p.end - p.start) * 0.75, "#FF8FAB");
    shout(ctx, "4 RECIPE = 1 DISH 🤢", 540, 300, easeOutBack((share - 0.8) / 0.15), "#80ED99", 70, -0.05, 940);
  }
  ctx.restore();
}

// ─── A16 · Level 50 ───────────────────────────────────────────────────────────

/** A16 · Level 50 on the "education app" — next level, kill the dragon. */
export function level50(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const game = line === 4 && share > 0.3;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 2 || line === 4 ? "proud" : "happy",
    arm: line === 2 ? "up" : "hold",
    holding: line === 2 ? undefined : (c) => phone(c, t, 0.7),
    jump: line === 2 ? Math.abs(Math.sin((t - l2.start) * 8)) * 14 : 0,
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 1 ? "happy" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 1 ? "thumb" : line === 3 ? "scratch" : line === 4 ? "cheeks" : "down",
  });
  screenCard(ctx, 545, 560, easeOutBack((t - l0.start - 0.4) / 0.3) * 0.7, game ? "🐉 BOSS FIGHT" : "📚 EDU APP", (c) => {
    if (game) {
      blob(c, "#3C096C", () => c.roundRect(-240, -170, 480, 420, [0, 0, 20, 20]), 0);
      write(c, "LEVEL 51", 0, -120, 44, "#FFD400");
      write(c, "🐉", 70, 40 + Math.sin(t * 3) * 10, 190);
      write(c, "🔥", -50, 60 + Math.sin(t * 9) * 6, 70);
      write(c, "⚔️", -160, 160, 70);
    } else if (line >= 2) {
      write(c, "LEVEL", 0, -100, 52);
      write(c, "50", 0, 20, 140, "#E63946");
      write(c, "⭐⭐⭐", 0, 170, 56);
    } else {
      write(c, "Lesson 1 ✏️", 0, -100, 46);
      write(c, "2 + 2 = ?", 0, 10, 66, "#2A9D8F");
      blob(c, "#DEE2E6", () => c.roundRect(-180, 140, 360, 30, 15), 0);
      blob(c, "#2DC653", () => c.roundRect(-180, 140, 360 * 0.1, 30, 15), 0);
    }
  }, game ? "#E63946" : "#2A9D8F");
  if (line === 2) {
    burst(ctx, 545, 560, 200, t, l2.start + 0.3);
    shout(ctx, "LEVEL 50! 🏆", 545, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD400", 84);
  }
  if (line === 3) mark(ctx, "?", 860, 440, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "EDUCATION?! 🎮", 545, 300, easeOutBack((share - 0.55) / 0.2), "#FF3B5C", 80);
  ctx.restore();
}

// ─── F19 · Petrol 100 ─────────────────────────────────────────────────────────

/** A petrol price board on a pole, above the bike. */
function priceBoard(ctx: Ctx, x: number, price: number) {
  blob(ctx, "#ADB5BD", () => ctx.rect(x - 14, FLOOR - 680, 28, 680));
  blob(ctx, "#E63946", () => ctx.roundRect(x - 140, FLOOR - 880, 280, 210, 20));
  write(ctx, "⛽ PETROL", x, FLOOR - 846, 34, "#fff");
  blob(ctx, "#111", () => ctx.roundRect(x - 115, FLOOR - 816, 230, 130, 12), 0);
  write(ctx, `₹${price}`, x, FLOOR - 750, 74, "#FFD400");
}

/** A fuel gauge, its needle at `level` (0 = empty, blinking). */
function fuelGauge(ctx: Ctx, level: number, t: number) {
  blob(ctx, "#2B2D42", () => {
    ctx.arc(0, 0, 140, Math.PI, 0);
    ctx.closePath();
  });
  write(ctx, "E", -100, -30, 42, level < 0.15 && (t * 2.5) % 1 < 0.55 ? "#FF3B5C" : "#fff");
  write(ctx, "F", 100, -30, 42, "#fff");
  write(ctx, "⛽", 0, -95, 40);
  const a = Math.PI + level * Math.PI;
  ctx.strokeStyle = "#FF3B5C";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * 110, Math.sin(a) * 110);
  ctx.stroke();
  blob(ctx, "#fff", () => circle(ctx, 0, 0, 14), 5);
}

/** A worried face on the tank of a bike standing at `x`, `y`, crying a little. */
function bikeFace(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  for (const ex of [10, 75]) {
    blob(ctx, "#fff", () => ellipse(ctx, ex, -160, 20, 24), 5);
    blob(ctx, INK, () => circle(ctx, ex + 3, -154, 8), 0);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(45, -112, 20, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();
  sweat(ctx, x + 115, y - 150, t, 0);
}

/** A round close-up of the bike, worried and crying: the low petrol is its problem now. */
function sadBikeInset(ctx: Ctx, x: number, y: number, t: number, p: number) {
  popped(ctx, x, y, p, () => {
    blob(ctx, "#fff", () => circle(ctx, 0, 0, 190), 10);
    ctx.save();
    ctx.beginPath();
    circle(ctx, 0, 0, 182);
    ctx.clip();
    ctx.fillStyle = "#E0FBFC";
    ctx.fillRect(-190, -190, 380, 380);
    ctx.scale(0.8, 0.8);
    bike(ctx, 15, 160, t, 0);
    bikeFace(ctx, 15, 160, t);
    ctx.restore();
  });
}

/** F19 · Always ₹100 of petrol, whatever the price — less petrol is the bike's problem. */
export function petrol100(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const price = Math.round(102 + clamp01((t - l0.start) / Math.max(1, p.start - l0.start)) * 28);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 200, Naan: 860 }, [{ at: p.start, x: 520, y: 720, zoom: 1.15 }]));
  street(ctx, t, false);
  priceBoard(ctx, 520, price);
  bike(ctx, 520, FLOOR, t, 0);
  if (line === 4 && share > 0.3) bikeFace(ctx, 520, FLOOR, t);
  person(ctx, s, "Machan", MACHAN, 200, 1, {
    mood: "proud",
    arm: line === 0 ? "thumb" : line === 2 ? "hold" : line === 4 ? "point" : "down",
    holding: line === 2 ? (c) => note(c, "₹100") : undefined,
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 4 ? "shocked" : line === 1 || line === 3 ? "confused" : "normal",
    arm: done ? "facepalm" : line === 1 || line === 3 ? "scratch" : "down",
  });
  if (line === 0) shout(ctx, "KAVALAI ILLA 😎", 450, 275, easeOutBack((t - l0.start - 0.4) / 0.3), "#80ED99", 70, -0.05, 700);
  if (line === 1) mark(ctx, "?", 860, 440, t, l1.start + 0.1);
  if (line === 2) shout(ctx, "EPPAVUME ₹100 💵", 450, 275, easeOutBack((t - l2.start - 0.4) / 0.3), "#FFD400", 70, -0.05, 700);
  if (line >= 3) {
    // The needle falls as the price climbs.
    const level = line === 3 ? 0.5 - 0.45 * easeOut((t - l3.start - 0.3) / 1.2) : 0.05;
    const gone = line === 4 ? easeOut((share - 0.2) / 0.15) : 0;
    popped(ctx, 520, 770, easeOutBack((t - l3.start - 0.1) / 0.3) * 0.9 * (1 - gone), () => fuelGauge(ctx, level, t));
  }
  if (line === 4) {
    // The bike's own close-up: it's the bike's problem.
    sadBikeInset(ctx, 520, 720, t, easeOutBack((share - 0.3) / 0.25));
    shout(ctx, "BIKE-ODA PROBLEM 🏍️😭", 520, 275, easeOutBack((share - 0.55) / 0.2), "#FF7B3A", 70, -0.05, 900);
  }
  ctx.restore();
}

// ─── A5 · Uppu illa ───────────────────────────────────────────────────────────

function saltShaker(ctx: Ctx) {
  blob(ctx, "#fff", () => ctx.roundRect(-32, -100, 64, 100, 12), 7);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-32, -134, 64, 38, [18, 18, 4, 4]), 7);
  for (const hx of [-12, 0, 12]) blob(ctx, INK, () => circle(ctx, hx, -118, 4), 0);
  write(ctx, "UPPU", 0, -50, 20, "#457B9D");
}

/** Lunch on a banana leaf on the table: rice, sambar and a steaming curry. */
function mealLeaf(ctx: Ctx, x: number, y: number, t: number) {
  blob(ctx, "#52B788", () => ellipse(ctx, x, y, 150, 34));
  ctx.strokeStyle = "#2D6A4F";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 140, y);
  ctx.lineTo(x + 140, y);
  ctx.stroke();
  blob(ctx, "#fff", () => ellipse(ctx, x - 30, y - 18, 70, 30), 6);
  blob(ctx, "#F4A261", () => ellipse(ctx, x + 80, y - 8, 36, 14), 5);
  blob(ctx, "#E9C46A", () => ellipse(ctx, x - 100, y - 4, 26, 10), 5);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 6;
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.7 + i / 2) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(x - 50 + i * 40 + Math.sin(k + t * 4) * 8, y - 60 - ph * 60 - k * 10);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A5 · No salt in the food — "that's why it's great: no salt, no BP!" */
export function uppuIlla(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 230, Amma: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  ammaHall(ctx, t);
  table(ctx, 390, 300, 300);
  mealLeaf(ctx, 540, 870, t);
  person(ctx, s, "Naan", NAAN, 230, 1, {
    mood: line === 2 || line === 4 ? "proud" : line === 3 ? "normal" : "happy",
    arm: line === 0 || line === 2 || line === 4 ? "thumb" : "down",
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "laugh" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "cheeks" : line === 1 ? "hold" : line === 3 ? "scratch" : "down",
    holding: line === 1 ? saltShaker : undefined,
  });
  if (line === 0) {
    burst(ctx, 540, 820, 130, t, l0.start + 0.3);
    shout(ctx, "SEMMA! 😋", 540, 300, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD400", 96);
  }
  if (line === 1) shout(ctx, "UPPE ILLA 🧂❌", 560, 300, easeOutBack((t - l1.start - 0.3) / 0.3), "#FF7B3A", 80);
  if (line === 2) shout(ctx, "ADHAAN SEMMA 👌", 540, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#4CC9F0", 80);
  if (line === 3) mark(ctx, "?", 860, 440, t, l3.start + 0.1);
  if (line === 4) {
    popped(ctx, 540, 360, easeOutBack((share - 0.15) / 0.25), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-300, -150, 600, 300, 24));
      const rows = ["🧂 Uppu: 0", "🩺 BP: Varaadhu ✅", "💪 Romba healthy!"];
      rows.forEach((row, i) => {
        if (share > 0.3 + i * 0.18) write(ctx, row, -250, -80 + i * 80, 44, i === 2 ? "#2A9D8F" : INK, "left");
      });
    });
    // Brave words — but it really has no salt.
    sweat(ctx, 125, 610, t, p.start + (p.end - p.start) * 0.75);
  }
  ctx.restore();
}

// ─── F24 · Study table ────────────────────────────────────────────────────────

function chargerBrick(ctx: Ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(60, -10, 70, -60, 30, -70);
  ctx.bezierCurveTo(-10, -80, -40, -40, 20, -20);
  ctx.stroke();
  ctx.strokeStyle = "#F8F9FA";
  ctx.lineWidth = 7;
  ctx.stroke();
  blob(ctx, "#F8F9FA", () => ctx.roundRect(-34, -60, 56, 60, 10), 7);
}

function clothesHeap(ctx: Ctx) {
  blob(ctx, "#E63946", () => ctx.roundRect(-90, -50, 180, 50, 22), 7);
  blob(ctx, "#457B9D", () => ctx.roundRect(-70, -90, 150, 46, 20), 7);
  blob(ctx, "#457B9D", () => ctx.roundRect(50, -70, 40, 100, 16), 7);
}

function foodPlate(ctx: Ctx) {
  blob(ctx, "#fff", () => ellipse(ctx, 0, -12, 80, 18));
  blob(ctx, "#F4A261", () => {
    ctx.moveTo(-55, -16);
    ctx.quadraticCurveTo(0, -80, 55, -16);
    ctx.closePath();
  }, 7);
}

function helmet(ctx: Ctx) {
  blob(ctx, "#3A86FF", () => {
    ctx.arc(0, -10, 70, Math.PI, 0);
    ctx.closePath();
  });
  blob(ctx, "#BDE0FE", () => ctx.roundRect(10, -50, 56, 30, 10), 6);
}

function chipsPacket(ctx: Ctx) {
  blob(ctx, "#FFB703", () => ctx.roundRect(-40, -110, 80, 110, 10), 7);
  write(ctx, "🥔", 0, -60, 40);
}

function flatBook(ctx: Ctx) {
  blob(ctx, "#2A9D8F", () => ctx.roundRect(-80, -34, 160, 34, 6), 7);
  blob(ctx, "#fff", () => ctx.rect(-70, -12, 150, 8), 0);
  write(ctx, "📖 MATHS", 0, -64, 28);
}

/** F24 · A new study table — holding everything except studies. */
export function studyTable(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const top = FLOOR - 330;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 200, Naan: 880 }, [{ at: l3.start - 0.1, x: 560, y: 700, zoom: 1.2 }, { at: p.start, x: 545, y: 680, zoom: 1.12 }]));
  friendsRoom(ctx);
  table(ctx, 380, 340, 300, "#E9C46A");
  // The book: on the table, then pushed off the edge once everything else is on it.
  const fall = line === 4 ? easeOut((share - 0.72) / 0.18) : 0;
  ctx.save();
  ctx.translate(620 + fall * 150, top - 2 + fall * 330);
  ctx.rotate(fall * 1.3);
  flatBook(ctx);
  ctx.restore();
  if (line === 4) {
    // Each thing lands as he names it, then the rest piles on.
    const items: Array<[number, number, number, (c: Ctx) => void]> = [
      [0.05, 450, top, chargerBrick],
      [0.18, 560, top, clothesHeap],
      [0.32, 670, top - 4, foodPlate],
      [0.5, 560, top - 90, helmet],
      [0.58, 440, top - 60, chipsPacket],
    ];
    for (const [at, x, y, draw] of items) popped(ctx, x, y, easeOutBack((share - at) / 0.15), () => draw(ctx));
  }
  if (line <= 0) {
    for (const [i, [sx, sy]] of ([[410, 840], [700, 820], [560, 790]] as const).entries()) write(ctx, "✨", sx, sy + Math.sin(t * 4 + i * 2) * 8, 54);
  }
  person(ctx, s, "Machan", MACHAN, 200, 1, {
    mood: line === 2 ? "happy" : "proud",
    arm: line === 0 ? "point" : line === 2 ? "scratch" : line === 4 ? "thumb" : "down",
  });
  person(ctx, s, "Naan", NAAN, 880, -1, {
    mood: done ? "sad" : line === 4 ? "shocked" : line === 3 ? "confused" : line === 1 ? "happy" : "normal",
    arm: done ? "facepalm" : line === 1 ? "thumb" : line === 3 ? "point" : "down",
  });
  if (line === 0) shout(ctx, "NEW STUDY TABLE ✨", 450, 300, easeOutBack((t - l0.start - 0.4) / 0.3), "#FFD400", 70, -0.05, 740);
  if (line === 1) mark(ctx, "📚?", 880, 440, t, l1.start + 0.1);
  if (line === 3) mark(ctx, "?", 880, 440, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "PADIPPU THAVIRA ELLAAME 😂", 545, 300, easeOutBack((share - 0.8) / 0.15), "#FF7B3A", 64, -0.05, 940);
  ctx.restore();
}

// ─── A30 · Online busy ────────────────────────────────────────────────────────

/** A row in a chat list: a green dot, a name and a status. */
function onlineRow(ctx: Ctx, y: number, name: string, status: string, statusColor = "#2DC653") {
  blob(ctx, "#2DC653", () => circle(ctx, -195, y, 14), 4);
  write(ctx, name, -165, y, 38, INK, "left");
  write(ctx, status, 215, y, 30, statusColor, "right");
}

/** A30 · Online on WhatsApp but no reply — busy watching who else is online. */
export function onlineBusy(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 220, Amma: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  ammaHall(ctx, t);
  person(ctx, s, "Naan", NAAN, 220, 1, {
    mood: line === 2 ? "sad" : line === 4 ? "proud" : "happy",
    arm: "hold",
    holding: (c) => phone(c, t, 0.6),
  });
  person(ctx, s, "Amma", AMMA, 860, -1, {
    mood: done ? "shocked" : line === 3 ? "confused" : line === 4 ? "shocked" : "normal",
    arm: done ? "facepalm" : line === 1 ? "point" : line === 3 ? "scratch" : "down",
  });
  const pop = easeOutBack((t - l0.start - 0.4) / 0.3) * 0.7;
  if (line < 2) {
    screenCard(ctx, 545, 560, pop, "💬 CHATS", (c) => {
      write(c, "🟢 Online", 0, -110, 56, "#2DC653");
      // Amma's messages, read and left unanswered.
      ["Saapida vaa 🍛", "Enga da?", "Reply pannu! 😠"].forEach((msg, i) => {
        if (t < l0.start + 0.6 + i * 0.35) return;
        blob(c, "#fff", () => c.roundRect(-210, -40 + i * 90, 330, 66, 18), 5);
        write(c, msg, -190, -7 + i * 90, 32, INK, "left");
        ticks(c, 215, -7 + i * 90, "#3A86FF", 1.3);
      });
    });
  }
  if (line === 4) {
    screenCard(ctx, 545, 560, easeOutBack((share - 0.1) / 0.25) * 0.7, "👀 YAAR ONLINE?", (c) => {
      const rows: Array<[string, string]> = [["Ravi", "online"], ["Priya", "online"], ["Chithi", "online"], ["Mama", "online"], ["Amma", "typing…"]];
      rows.forEach(([name, status], i) => {
        if (share > 0.25 + i * 0.1) onlineRow(c, -120 + i * 82, name, status, i === 4 ? "#E63946" : "#2DC653");
      });
    });
  }
  if (line === 1) shout(ctx, "REPLY ENGA?! 😠", 620, 300, easeOutBack((t - l1.start - 0.3) / 0.3), "#FF7B3A", 76, -0.05, 700);
  if (line === 2) shout(ctx, "BUSY 😓", 540, 300, easeOutBack((t - l2.start - 0.3) / 0.3), "#4CC9F0", 110);
  if (line === 3) mark(ctx, "?", 860, 440, t, l3.start + 0.1);
  if (line === 4) shout(ctx, "FULL-TIME ONLINE WATCHMAN 👀", 545, 300, easeOutBack((share - 0.8) / 0.15), "#FFD400", 60, -0.05, 940);
  ctx.restore();
}

// ─── F13 · Seen = love ────────────────────────────────────────────────────────

/** F13 · She replied — "Seen". There was a lot of love in that seen. */
export function seenLove(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 220, Naan: 860 }, [{ at: p.start, x: 540, y: 700, zoom: 1.12 }]));
  friendsRoom(ctx);
  person(ctx, s, "Machan", MACHAN, 220, 1, {
    mood: line === 4 ? "laugh" : "happy",
    arm: line === 4 ? "cheeks" : line === 0 ? "up" : "hold",
    holding: line === 4 ? undefined : (c) => phone(c, t, 0.8),
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 16 : 0,
  });
  person(ctx, s, "Naan", NAAN, 860, -1, {
    mood: done ? "sad" : line === 3 ? "shocked" : line === 4 ? "shocked" : line === 1 ? "happy" : "normal",
    arm: done ? "facepalm" : line === 1 ? "thumb" : line === 3 ? "point" : "down",
  });
  if (line === 0) shout(ctx, "AVA REPLY! 😍", 450, 300, easeOutBack((t - l0.start - 0.4) / 0.3), "#FF8FAB", 90, -0.06, 740);
  if (line >= 2) {
    const love = line === 4 ? easeOutBack((share - 0.2) / 0.3) : 0;
    screenCard(ctx, 545, 560, easeOutBack((t - l2.start) / 0.3) * 0.7, "🌸 Ava", (c) => {
      ["Hi 😊", "Saaptiya? 🌹", "Pesalaamaa? 🥺"].forEach((msg, i) => {
        c.font = `34px ${FONT}`;
        const w = c.measureText(msg).width + 50;
        blob(c, "#80ED99", () => c.roundRect(215 - w, -150 + i * 85, w, 64, 20), 5);
        write(c, msg, 190, -118 + i * 85, 34, INK, "right");
      });
      const seen = love > 0 ? "#E63946" : "#6C757D";
      write(c, "Seen", 205 - 56 * (1 + love), 150, 30 + love * 34, seen, "right");
      ticks(c, 215, 150, seen, 1 + love);
      if (love > 0) {
        for (let i = 0; i < 5; i++) {
          const ph = (t * 0.7 + i / 5) % 1;
          c.globalAlpha = Math.sin(ph * Math.PI);
          write(c, "❤️", -120 + i * 70, 150 - ph * 200, 44);
        }
        c.globalAlpha = 1;
      }
    });
  }
  if (line === 2) pulseRing(ctx, 640, 665, 75, t, l2.start + 0.6);
  if (line === 3) shout(ctx, "ADHU REPLY ILLA! 🙄", 600, 300, easeOutBack((t - l3.start - 0.2) / 0.3), "#FF7B3A", 70, -0.05, 760);
  if (line === 4) {
    // Hearts rising around the lovestruck Machan.
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.6 + i / 4) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI);
      write(ctx, "💗", 140 + (i % 2) * 180, 560 - ph * 180, 56);
    }
    ctx.globalAlpha = 1;
    shout(ctx, "SEEN = LOVE 💘", 545, 300, easeOutBack((share - 0.55) / 0.2), "#FF8FAB", 84);
  }
  ctx.restore();
}

// ─── A25 · Appa lazy ──────────────────────────────────────────────────────────

const APPA: Look = { skin: "#B5764A", shirt: "#F8F9FA", pants: "#5C4033", hair: "short", hairColor: "#6C757D", mustache: true };
const YOUNG_APPA: Look = { ...APPA, shirt: "#3A86FF", hairColor: "#2A1A14" };
/** The sofa sits off to the side of the hall; the camera cuts to it. */
const SOFA_X = 1800;

/** The sofa with Appa asleep on it, head on the left armrest. */
function sofaWithAppa(ctx: Ctx, t: number) {
  const x = SOFA_X;
  blob(ctx, "#6A4C93", () => ctx.roundRect(x - 330, FLOOR - 560, 660, 300, 50));
  blob(ctx, "#8E6BBF", () => ctx.roundRect(x - 330, FLOOR - 300, 660, 160, 30));
  ctx.save();
  ctx.translate(x + 300, FLOOR - 390);
  ctx.rotate(-Math.PI / 2);
  drawPerson(ctx, 0, 0, APPA, { t, mood: "sleep", face: 1, scale: 0.9 });
  ctx.restore();
  blob(ctx, "#6A4C93", () => ctx.roundRect(x - 380, FLOOR - 400, 100, 280, 36));
  blob(ctx, "#6A4C93", () => ctx.roundRect(x + 280, FLOOR - 400, 100, 280, 36));
  blob(ctx, "#3C2A21", () => ctx.rect(x - 350, FLOOR - 140, 30, 140));
  blob(ctx, "#3C2A21", () => ctx.rect(x + 320, FLOOR - 140, 30, 140));
  zzz(ctx, x - 200, FLOOR - 560, t);
}

/** A25 · "Your Appa wasn't lazy like you" — then he started eating Amma's cooking. */
export function appaLazy(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const done = t >= p.end;
  const shots = follow(s, { Naan: 230, Amma: 850 });
  // Line 2 is about Appa: cut to the sofa, then cut back.
  shots[1] = { at: l1.start - 0.15, x: SOFA_X, y: 760, zoom: 1.1, move: 0 };
  shots[2] = { ...shots[2], move: 0 };
  // Wider for the punch, so the thought and its sticker both fit under the series badge.
  shots.push({ at: p.start, x: 540, y: 690, zoom: 1.0 });
  ctx.save();
  camera(ctx, t, shots);
  ammaHall(ctx, t);
  sofaWithAppa(ctx, t);
  person(ctx, s, "Naan", NAAN, 230, 1, {
    mood: done ? "laugh" : line === 0 ? "sad" : line === 4 ? "shocked" : line >= 2 ? "confused" : "normal",
    arm: done ? "cheeks" : line === 1 ? "point" : line === 3 ? "scratch" : "down",
  });
  person(ctx, s, "Amma", AMMA, 850, -1, {
    mood: line === 4 ? "laugh" : line === 2 ? "proud" : "normal",
    arm: line === 0 ? "point" : line === 2 ? "up" : line === 4 ? "cheeks" : "down",
  });
  if (line === 0) shout(ctx, "NEE THAAN LAZY! 😤", 660, 300, easeOutBack((t - l0.start - 0.4) / 0.3), "#FF7B3A", 76, -0.05, 760);
  if (line === 1) shout(ctx, "EPPAVUM SOFA 🛋️", SOFA_X, 420, easeOutBack((t - l1.start - 0.4) / 0.3), "#FFD400", 80);
  thought(ctx, 520, 410, 420, 300, t, l2.start + 0.2, l2.end + 0.1, [790, 540], (c) => {
    c.fillStyle = "#CDEAC0";
    c.fillRect(-210, -150, 420, 300);
    write(c, "1998 💪", -95, -50, 40);
    drawPerson(c, 85, 125, YOUNG_APPA, { t, run: t, scale: 0.3, face: 1, mood: "happy" });
  });
  if (line === 3) mark(ctx, "?", 230, 440, t, l3.start + 0.1);
  if (line === 4) {
    thought(ctx, 540, 390, 500, 320, t, p.start + 0.2, Infinity, [790, 540], (c) => {
      c.fillStyle = "#FFE8D6";
      c.fillRect(-250, -160, 500, 320);
      c.save();
      c.translate(-140, 50);
      c.scale(0.6, 0.6);
      biryani(c, 0, 0, t);
      c.restore();
      write(c, "➡️", 0, -10, 60);
      write(c, share > 0.5 ? "😴" : "😋", 140, -10, 110);
    });
    shout(ctx, "SAAPTU SAAPTU THOOKAM 😴", 540, 165, easeOutBack((share - 0.7) / 0.2), "#FFD400", 62, -0.04, 940);
  }
  ctx.restore();
}
