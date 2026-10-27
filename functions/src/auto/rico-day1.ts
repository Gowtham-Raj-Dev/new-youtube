import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_WIDTH as W } from "@shortflow/shared";
import { FLOOR, INK, blob, burst, camera as baseCamera, circle, clamp01, easeOut, easeOutBack, ellipse, kick, lineAt, mark, mess, phone, pulseRing, talkOf, thought, type SceneState, type Shot } from "./cartoon";
import { alarmClock, bed, shout, sign, zzz } from "./props";
import { MOM, MEENA, classroom, drawThin, paleRoom, type ThinLook, type ThinPose } from "./rico";

/**
 * The Rico-folder cast and the Day 1 scenes. Each girl keeps her look and
 * her voice in every Short: Meena (sleepy, lazy), Riya (glasses, "smart"
 * logic), Tara (pigtails, chaos), Mom and Miss Rose the teacher.
 */

type Ctx = SKRSContext2D;
const FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;

export { MEENA, MOM };
export const RIYA: ThinLook = { skin: "#C99A74", lid: "#B8C0FF", dress: "#E9C46A", legs: "#C99A74", shoes: "#3D405B", hair: "#22223B", style: "bob", lashes: true, glasses: true };
export const TARA: ThinLook = { skin: "#F1D3B3", lid: "#F4A261", dress: "#E07A5F", legs: "#F1D3B3", shoes: "#3D405B", hair: "#D9762B", style: "pigtails", lashes: true, freckles: true };
export const MISS_ROSE: ThinLook = { skin: "#E3BC9A", lid: "#CDB4DB", dress: "#3D5A80", legs: "#E3BC9A", shoes: "#22223B", hair: "#8D99AE", style: "short", lashes: true, glasses: true };

/** Each character's Gemini voice, the same in every Short. */
export const RICO_VOICES: Record<string, string> = { Meena: "Leda", Riya: "Autonoe", Tara: "Laomedeia", Mom: "Kore", Teacher: "Gacrux" };

const LOOKS: Record<string, ThinLook> = { Meena: MEENA, Riya: RIYA, Tara: TARA, Mom: MOM, Teacher: MISS_ROSE };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const L = 320;
const R = 760;
/** People are drawn smaller than the default, so the whole of them and the space above their heads show. */
const SIZE = 0.75;

function thin(ctx: Ctx, s: SceneState, name: string, x: number, face: 1 | -1, pose: Partial<ThinPose> = {}) {
  drawThin(ctx, x, FLOOR, LOOKS[name], { t: s.t, talk: talkOf(s, name), face, scale: SIZE, ...pose });
}

/**
 * The camera stays wide and still (only a shake now and then): words and
 * pictures pop in the band above the heads, never over the characters.
 */
function camera(ctx: Ctx, t: number, _shots: Shot[], shake = 0) {
  baseCamera(ctx, t, [], shake);
}

function follow(_s: SceneState, extra: Shot[] = []): Shot[] {
  return extra;
}

const share = (s: SceneState) => {
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

function popped(ctx: Ctx, x: number, y: number, p: number, draw: () => void) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);
  draw();
  ctx.restore();
}

/** A white card with rows of text, the plain "screen" this style uses. */
function card(ctx: Ctx, x: number, y: number, p: number, w: number, rows: Array<[string, number, string?]>) {
  popped(ctx, x, y, p, () => {
    const h = rows.reduce((sum, [, size]) => sum + size * 1.6, 60);
    blob(ctx, "#fff", () => ctx.roundRect(-w / 2, -h / 2, w, h, 26), 8);
    let at = -h / 2 + 30;
    for (const [text, size, color] of rows) {
      write(ctx, text, 0, at + size * 0.8, size, color ?? INK);
      at += size * 1.6;
    }
  });
}

/** Lying in a bed at the left, head on the pillow. */
function inBed(ctx: Ctx, s: SceneState, name: string, pose: Partial<ThinPose>) {
  bed(ctx, 120, 860, "#B5838D");
  ctx.save();
  ctx.translate(860, FLOOR - 215);
  ctx.rotate(-Math.PI / 2);
  drawThin(ctx, 0, 0, LOOKS[name], { t: s.t, face: 1, scale: SIZE, ...pose });
  ctx.restore();
  blob(ctx, "#B5838D", () => ctx.roundRect(380, FLOOR - 320, 620, 130, 30), 8);
}

function kitchen(ctx: Ctx) {
  paleRoom(ctx, "#E3EADF");
  blob(ctx, "#CBB89D", () => ctx.rect(-800, 860, W + 1600, FLOOR - 860), 8);
  blob(ctx, "#E9E3D5", () => ctx.rect(-800, 840, W + 1600, 36), 8);
}

function fridge(ctx: Ctx, x: number) {
  blob(ctx, "#F1F1EE", () => ctx.roundRect(x - 150, FLOOR - 700, 300, 700, 26), 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x - 150, FLOOR - 450);
  ctx.lineTo(x + 150, FLOOR - 450);
  ctx.stroke();
  blob(ctx, "#ADB5BD", () => ctx.roundRect(x + 100, FLOOR - 620, 16, 110, 8), 0);
}

/** The listener's flat stare once the punch has landed. */
const after = (s: SceneState) => s.t >= s.spans[s.spans.length - 1].end + 0.15;

// ─── Scenes ───────────────────────────────────────────────────────────────────

/** Meena's "seafood diet": she sees food, and eats it. */
export function seafoodDiet(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 480, y: 700, zoom: 1.12 }]));
  kitchen(ctx);
  if (line === 4) {
    blob(ctx, "#B08968", () => ctx.rect(120, FLOOR - 420, 520, 34), 8);
    blob(ctx, "#9C6644", () => ctx.rect(150, FLOOR - 386, 30, 386), 0);
    blob(ctx, "#9C6644", () => ctx.rect(580, FLOOR - 386, 30, 386), 0);
  }
  thin(ctx, s, "Meena", L, 1, {
    mood: line === 4 ? "happy" : line === 2 ? "deadpan" : "proud",
    arm: line === 0 ? "point" : line === 4 ? "hold" : "down",
    holding: line === 4 ? (c) => write(c, "🍗", 10, -20, 90) : undefined,
  });
  thin(ctx, s, "Riya", R, -1, {
    mood: after(s) ? "deadpan" : line === 4 ? "shocked" : line === 3 ? "normal" : "happy",
    arm: after(s) ? "facepalm" : line === 1 ? "clasp" : "down",
  });
  if (line === 0) shout(ctx, "STRICT DIET 🥗", 560, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD166", 80);
  if (line === 1) thought(ctx, 640, 280, 300, 220, t, l1.start + 0.2, l1.end + 0.2, [760, 380], (c) => write(c, "🐟🦐", 0, 0, 90));
  if (line === 3) mark(ctx, "?", R, 370, t, l3.start + 0.1);
  if (line === 4) {
    ["🍕", "🍔", "🍟", "🍩", "🍰"].forEach((food, i) => popped(ctx, 210 + i * 95, FLOOR - 470, easeOutBack((k - 0.1 - i * 0.08) / 0.15), () => write(ctx, food, 0, 0, 80)));
    shout(ctx, "SEE FOOD 👀 → EAT IT 😋", 540, 250, easeOutBack((k - 0.55) / 0.2), "#FFD166", 64, -0.04, 940);
  }
  ctx.restore();
}

/** Phone down, nothing to do — so the dishes are waiting. */
export function dishesWaiting(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, , , p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  if (line < 4 || k < 0.45) {
    camera(ctx, t, follow(s, [{ at: p.start, x: L + 60, y: 640, zoom: 1.3 }]));
    paleRoom(ctx);
    thin(ctx, s, "Mom", L, 1, {
      mood: line === 2 || line === 4 ? "proud" : "normal",
      arm: line === 0 ? "point" : line === 4 ? "point" : "down",
    });
    thin(ctx, s, "Meena", R, -1, {
      mood: line === 0 ? "deadpan" : line === 1 ? "sad" : line === 4 ? "shocked" : "happy",
      arm: line === 0 ? "hold" : "down",
      holding: line === 0 ? (c) => phone(c, t, 0.8, -0.3) : undefined,
    });
    if (line === 0) shout(ctx, "PHONE DOWN! 📵", 540, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD166", 80);
    if (line === 1) popped(ctx, R - 60, FLOOR - 330, easeOutBack((t - l1.start) / 0.3), () => phone(ctx, t, 0.8, Math.PI / 2));
    if (line === 3) shout(ctx, "FREE 😌", R, 250, easeOutBack((t - s.spans[3].start - 0.2) / 0.3), "#80ED99", 80);
  } else {
    // The sink, piled to the ceiling.
    camera(ctx, t, [{ at: p.start + (p.end - p.start) * 0.45, x: 540, y: 680, zoom: 1.05, move: 0 }], kick(t, p.start + (p.end - p.start) * 0.45, 0.3) * 0.4);
    kitchen(ctx);
    blob(ctx, "#ADB5BD", () => ctx.rect(330, 850, 420, 40), 8);
    for (let i = 0; i < 14; i++) {
      const wob = Math.sin(t * 3 + i) * (i * 1.5);
      blob(ctx, i % 3 ? "#fff" : "#CDE7F0", () => ellipse(ctx, 540 + wob, 830 - i * 38, 140 - (i % 2) * 20, 22), 7);
    }
    thin(ctx, s, "Meena", 820, -1, { mood: after(s) ? "deadpan" : "sad", arm: "down" });
    shout(ctx, "THE DISHES 🍽️", 540, 250, easeOutBack((k - 0.5) / 0.2), "#FFD166", 84);
  }
  ctx.restore();
}

/** A simple dog, sitting, its tail wagging; origin at its feet. */
function dog(ctx: Ctx, t: number, paper: boolean) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-90, -80);
  ctx.lineTo(-150, -140 + Math.sin(t * 14) * 30);
  ctx.stroke();
  ctx.strokeStyle = "#C9A27E";
  ctx.lineWidth = 6;
  ctx.stroke();
  blob(ctx, "#C9A27E", () => ellipse(ctx, -20, -90, 100, 80), 8);
  blob(ctx, "#C9A27E", () => circle(ctx, 70, -200, 75), 8);
  blob(ctx, "#8D6E63", () => ellipse(ctx, 20, -230, 26, 55, 0.4), 7);
  blob(ctx, "#fff", () => circle(ctx, 90, -215, 18), 5);
  blob(ctx, INK, () => circle(ctx, 95, -213, 7), 0);
  blob(ctx, INK, () => circle(ctx, 140, -185, 12), 0);
  if (paper) {
    ctx.save();
    ctx.translate(140, -150);
    ctx.rotate(0.2);
    blob(ctx, "#fff", () => ctx.rect(-10, -10, 90, 110), 6);
    write(ctx, "HW", 35, 40, 30);
    ctx.restore();
  }
  ctx.restore();
}

/** Tara bought a dog so it could eat the homework — cheaper than doing it. */
export function dogHomework(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 480, y: 720, zoom: 1.1 }]));
  classroom(ctx);
  thin(ctx, s, "Tara", L, 1, {
    mood: line === 4 || line === 2 ? "proud" : "happy",
    arm: line === 0 ? "point" : line === 4 ? "up" : "down",
    jump: line === 4 ? Math.abs(Math.sin((t - p.start) * 7)) * 14 : 0,
  });
  thin(ctx, s, "Teacher", R, -1, {
    mood: after(s) ? "deadpan" : line === 3 || line === 4 ? "shocked" : "deadpan",
    arm: after(s) ? "facepalm" : line === 1 ? "point" : "down",
  });
  if (line === 0) shout(ctx, "DOG ATE IT 🐶", 540, 250, easeOutBack((t - l0.start - 0.4) / 0.3), "#FFD166", 80);
  if (line === 2) shout(ctx, "…UNTIL THIS MORNING", 540, 250, easeOutBack((t - l2.start - 0.6) / 0.3), "#FFD166", 60, -0.04, 940);
  if (line === 3) mark(ctx, "?!", R, 370, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    const run = easeOut((k - 0.05) / 0.35);
    ctx.save();
    ctx.translate(-200 + run * 700, FLOOR);
    dog(ctx, t, k < 0.7);
    ctx.restore();
    if (k > 0.7) write(ctx, "😋", 590, FLOOR - 330, 70);
    shout(ctx, "CHEAPER! 💰", 540, 250, easeOutBack((k - 0.6) / 0.2), "#80ED99", 90);
  }
  ctx.restore();
}

/** The sign said "go slow", so Riya came to school very, very slowly. */
export function goSlow(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  const roadSign = (x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    blob(ctx, "#8D99AE", () => ctx.rect(-12, 0, 24, 420), 7);
    ctx.rotate(Math.PI / 4);
    blob(ctx, "#FFD166", () => ctx.roundRect(-130, -130, 260, 260, 20), 9);
    ctx.rotate(-Math.PI / 4);
    write(ctx, "SCHOOL", 0, -40, 40);
    write(ctx, "AHEAD", 0, 6, 40);
    write(ctx, "GO SLOW", 0, 56, 34, "#E63946");
    ctx.restore();
  };
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s));
    classroom(ctx);
    thin(ctx, s, "Riya", L, 1, { mood: line === 2 ? "proud" : "normal", arm: line === 2 ? "point" : "down" });
    thin(ctx, s, "Teacher", R, -1, { mood: line === 3 ? "deadpan" : "normal", arm: line === 1 ? "point" : "down" });
    if (line === 0) shout(ctx, "LATE ⏰", 540, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FF3B5C", 90);
    if (line === 2) roadSign(560, 220, easeOutBack((t - l2.start - 0.4) / 0.3) * 0.9);
    if (line === 3) mark(ctx, "?", R, 370, t, l3.start + 0.1);
  } else {
    // This morning: crawling past the sign, a snail overtaking her.
    camera(ctx, t, [{ at: p.start, x: 540, y: 700, zoom: 1.05, move: 0 }]);
    paleRoom(ctx, "#DCE8EE");
    blob(ctx, "#B7C4A5", () => ctx.rect(-800, FLOOR - 120, W + 1600, 120), 0);
    roadSign(800, FLOOR - 420, 1);
    const crawl = (t - p.start) * 25;
    drawThin(ctx, 260 + crawl, FLOOR, RIYA, { t, scale: SIZE, talk: talkOf(s, "Riya"), mood: "proud", face: 1, jump: Math.abs(Math.sin(t * 2)) * 4 });
    write(ctx, "🐌", 420 + (t - p.start) * 70, FLOOR - 40, 80);
    shout(ctx, "V E R Y   S L O W 🐌", 540, 250, easeOutBack((k - 0.5) / 0.2), "#FFD166", 64, -0.04, 940);
  }
  ctx.restore();
}

/** Ten alarms, woke up every time — and snoozed every one. */
export function tenAlarms(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s));
    paleRoom(ctx);
    thin(ctx, s, "Meena", L, 1, { mood: line === 2 ? "proud" : "happy", arm: line === 0 ? "up" : "down" });
    thin(ctx, s, "Tara", R, -1, { mood: line === 3 || line === 1 ? "happy" : "normal", arm: line === 3 ? "clasp" : "down" });
    if (line === 0) {
      for (let i = 0; i < 10; i++) popped(ctx, 200 + (i % 5) * 170, 140 + Math.floor(i / 5) * 140, easeOutBack((t - l0.start - 0.2 - i * 0.12) / 0.25), () => write(ctx, "⏰", 0, 0, 80));
    }
    if (line === 2) shout(ctx, "EVERY TIME! ✅", 540, 250, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 80);
    if (line === 3) shout(ctx, "EARLY BIRD? 🐦", 600, 250, easeOutBack((t - l3.start - 0.2) / 0.3), "#FFD166", 70);
  } else {
    camera(ctx, t, [{ at: p.start, x: 540, y: 720, zoom: 1.08, move: 0 }]);
    paleRoom(ctx);
    const ringing = (t * 1.6) % 1 < 0.45;
    inBed(ctx, s, "Meena", { mood: ringing ? "deadpan" : "sleep", talk: talkOf(s, "Meena"), arm: ringing ? "up" : "down" });
    alarmClock(ctx, 120, FLOOR - 420, t, ringing ? 1 : 0);
    const snoozes = Math.min(10, Math.floor(clamp01(k) * 10) + 1);
    card(ctx, 640, 230, easeOutBack((k - 0.1) / 0.2), 460, [[`SNOOZE x${snoozes}`, 56, "#E63946"]]);
    if (!ringing) zzz(ctx, 260, FLOOR - 560, t);
    shout(ctx, "SNOOZE CHAMPION 🏆", 540, 420, easeOutBack((k - 0.65) / 0.2), "#FFD166", 70, -0.04, 940);
  }
  ctx.restore();
}

/** The whole syllabus in an hour: she read the chapter titles. */
export function titlesOnly(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 540, y: 660, zoom: 1.08 }]));
  paleRoom(ctx);
  const book = (c: Ctx) => {
    blob(c, "#457B9D", () => c.roundRect(-20, -150, 130, 170, 10), 7);
    write(c, "📖", 45, -65, 60);
  };
  thin(ctx, s, "Tara", L, 1, {
    mood: line === 4 || line === 0 ? "proud" : "happy",
    arm: line === 0 ? "up" : line === 2 ? "hold" : "down",
    holding: line === 2 ? book : undefined,
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 7)) * 16 : 0,
  });
  thin(ctx, s, "Riya", R, -1, {
    mood: after(s) ? "deadpan" : line === 3 || line === 1 ? "shocked" : "normal",
    arm: after(s) ? "facepalm" : "down",
  });
  if (line === 0) shout(ctx, "SYLLABUS: 1 HOUR ⏱️", 540, 250, easeOutBack((t - l0.start - 0.4) / 0.3), "#FFD166", 70, -0.04, 940);
  if (line === 2) shout(ctx, "EVERY CHAPTER", 540, 250, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 70);
  if (line === 3) mark(ctx, "?!", R, 370, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    const rows: Array<[string, number, string?]> = [["CH 1: Cells", 44], ["CH 2: Atoms", 44], ["CH 3: Energy", 44], ["CH 4: Plants", 44]];
    const shown = Math.min(4, Math.floor(clamp01((k - 0.15) / 0.5) * 4) + 1);
    card(ctx, 540, 250, easeOutBack((k - 0.05) / 0.2), 560, rows.map(([text, size], i) => [`${text} ${i < shown ? "✅" : "  "}`, size, i < shown ? "#2A9D8F" : "#ADB5BD"]));
    shout(ctx, "TITLES ONLY ⚡", 540, 50, easeOutBack((k - 0.7) / 0.2), "#FFD166", 80);
  }
  ctx.restore();
}

/** Room cleaned in five minutes: lights off — no mess you can see. */
export function lightsOff(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 540, y: 700, zoom: 1.08 }]));
  paleRoom(ctx);
  mess(ctx, 560, FLOOR, 1.1, t);
  thin(ctx, s, "Meena", L, 1, {
    mood: line === 4 || line === 2 ? "proud" : "happy",
    arm: line === 0 ? "up" : line === 2 ? "point" : "down",
  });
  thin(ctx, s, "Mom", R, -1, {
    mood: line === 1 ? "shocked" : line === 3 ? "normal" : "happy",
    arm: line === 1 ? "clasp" : "down",
  });
  if (line === 0) shout(ctx, "ROOM CLEAN ✨", 540, 250, easeOutBack((t - l0.start - 0.4) / 0.3), "#80ED99", 80);
  if (line === 1) mark(ctx, "!", R, 370, t, l1.start + 0.1, "#FF3B5C");
  if (line === 2) shout(ctx, "A PLAN 😏", 420, 250, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD166", 80);
  if (line === 3) mark(ctx, "?", R, 370, t, l3.start + 0.1);
  if (line === 4) {
    // Click: the room goes dark, only their eyes left.
    const dark = clamp01((k - 0.35) / 0.08);
    if (dark > 0) {
      ctx.fillStyle = `rgba(15,14,24,${dark * 0.94})`;
      ctx.fillRect(-800, -800, W + 1600, 3600);
      for (const [x, face] of [[L, 1], [R, -1]] as const) {
        for (const ex of [-12, 96]) blob(ctx, "#fff", () => ellipse(ctx, x + face * ex * SIZE, FLOOR - 840 * SIZE, 23, after(s) && x === R ? 10 : 26), 0);
      }
      write(ctx, "💡❌", 540, 300, 90);
    }
    shout(ctx, "NO MESS 😎", 540, 250, easeOutBack((k - 0.55) / 0.2), "#FFD166", 90);
  }
  ctx.restore();
}

/** Her Wi-Fi password is "incorrect", so the screen tells her when she forgets. */
export function passwordIncorrect(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 540, y: 660, zoom: 1.08 }]));
  paleRoom(ctx);
  thin(ctx, s, "Riya", L, 1, {
    mood: line === 4 || line === 2 ? "proud" : "normal",
    arm: line === 2 ? "up" : line === 4 ? "point" : "down",
  });
  thin(ctx, s, "Meena", R, -1, {
    mood: after(s) ? "deadpan" : line === 1 || line === 3 ? "normal" : "happy",
    arm: after(s) ? "facepalm" : "down",
  });
  if (line === 0) card(ctx, 540, 260, easeOutBack((t - l0.start - 0.3) / 0.3), 560, [["📶 Wi-Fi password", 40], ["incorrect", 56, "#2A9D8F"]]);
  if (line === 2) {
    shout(ctx, "GENIUS 🧠", 520, 250, easeOutBack((t - l2.start - 0.3) / 0.3), "#FFD166", 90);
    burst(ctx, L, FLOOR - 860, 200, t, l2.start + 0.3);
  }
  if (line === 3) mark(ctx, "?", R, 370, t, l3.start + 0.1);
  if (line === 4) {
    const typed = Math.min(8, Math.floor(clamp01(k / 0.35) * 8));
    card(ctx, 540, 250, easeOutBack(k / 0.15), 620, [
      ["📶 Password", 40],
      ["•".repeat(typed) || " ", 56],
      [k > 0.45 ? "Your password is incorrect" : " ", 36, "#E63946"],
    ]);
    if (k > 0.45) pulseRing(ctx, 540, 340, 330, t, s.spans[4].start + (p.end - p.start) * 0.5);
    shout(ctx, "FREE HINT ✅", 540, 50, easeOutBack((k - 0.7) / 0.2), "#80ED99", 80);
  }
  ctx.restore();
}

/** Lost so much at the gym — money. Three months paid, never went. */
export function gymMoney(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  const dumbbell = (c: Ctx) => {
    blob(c, "#495057", () => c.rect(-70, -10, 140, 20), 6);
    for (const x of [-80, 80]) blob(c, "#2B2D42", () => c.roundRect(x - 18, -40, 36, 80, 8), 6);
  };
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 540, y: 660, zoom: 1.08 }]));
  paleRoom(ctx);
  thin(ctx, s, "Riya", L, 1, {
    mood: line === 4 || line === 2 ? "sad" : "proud",
    arm: line === 0 ? "up" : "down",
    holding: line === 0 ? dumbbell : undefined,
  });
  thin(ctx, s, "Tara", R, -1, {
    mood: after(s) ? "deadpan" : line === 4 ? "shocked" : "happy",
    arm: line === 3 ? "clasp" : "down",
  });
  if (line === 0) shout(ctx, "GYM GIRL 💪", 540, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD166", 80);
  if (line === 2) shout(ctx, "LOST SO MUCH…", 520, 250, easeOutBack((t - l2.start - 0.3) / 0.3), "#80ED99", 70);
  if (line === 3) write(ctx, "⚖️", R - 120, 220, 90);
  if (line === 4) {
    card(ctx, 540, 250, easeOutBack((k - 0.1) / 0.2), 640, [
      ["🏋️ GYM MEMBERSHIP", 40],
      ["Paid: 3 months ✅", 44, "#2A9D8F"],
      [k > 0.45 ? "Visits: 0 ❌" : " ", 48, "#E63946"],
    ]);
    shout(ctx, "LOST: MONEY 💸", 540, 50, easeOutBack((k - 0.65) / 0.2), "#FFD166", 84);
  }
  ctx.restore();
}

/** Proud she never touched the chocolates — she ate the ice cream instead. */
export function iceCreamInstead(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const k = share(s);
  const tub = (c: Ctx) => {
    blob(c, "#F1F1EE", () => {
      c.moveTo(-60, -120);
      c.lineTo(60, -120);
      c.lineTo(45, 0);
      c.lineTo(-45, 0);
      c.closePath();
    }, 7);
    write(c, "🍨", 0, -60, 50);
  };
  ctx.save();
  camera(ctx, t, follow(s, [{ at: p.start, x: 440, y: 680, zoom: 1.15 }]));
  kitchen(ctx);
  fridge(ctx, 540);
  thin(ctx, s, "Tara", L, 1, {
    mood: line === 4 ? "happy" : "proud",
    arm: line === 0 ? "up" : line === 4 ? "hold" : "down",
    holding: line === 4 && k > 0.3 ? tub : undefined,
  });
  if (line === 4 && k > 0.3) {
    // Ice cream on her cheek.
    blob(ctx, "#FFC8DD", () => ellipse(ctx, L + 60, FLOOR - 735 * SIZE, 20, 11), 5);
  }
  thin(ctx, s, "Mom", R, -1, {
    mood: after(s) ? "deadpan" : line === 4 ? "shocked" : line === 3 ? "happy" : "normal",
    arm: after(s) ? "facepalm" : line === 3 ? "clasp" : "down",
  });
  if (line === 0) shout(ctx, "BE PROUD 😇", 540, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD166", 84);
  if (line === 2) card(ctx, 540, 300, easeOutBack((t - l2.start - 0.3) / 0.3), 420, [["🍫🍫🍫", 70], ["NOT TOUCHED ✅", 40, "#2A9D8F"]]);
  if (line === 3) shout(ctx, "GOOD GIRL! 🥰", 640, 250, easeOutBack((t - l3.start - 0.2) / 0.3), "#80ED99", 74);
  if (line === 4) shout(ctx, "ICE CREAM ✅😋", 540, 250, easeOutBack((k - 0.55) / 0.2), "#FFD166", 84);
  ctx.restore();
}
