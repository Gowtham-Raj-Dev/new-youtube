import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_WIDTH as W } from "@shortflow/shared";
import {
  FLOOR, INK, blob, burst, camera, circle, clamp01, drawPerson, easeOut, easeOutBack, ellipse, kick, lineAt, mark, phone, pulseRing, room, sack,
  sweat, talkOf, thought, type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import { ammaHall, bed, friendsRoom, shoppingBag, shout, sign, stove, street, table, tv, zzz } from "./props";
import { AMMA, MACHAN, NAAN } from "./scenes-day1";

/** Scenes for the Day 3 batch: F25, A2, F10, A20, F17, A26, F22, A17, F28, A27. */

type Ctx = SKRSContext2D;
const FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;

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

function night(ctx: Ctx, alpha = 0.3) {
  ctx.fillStyle = `rgba(20,20,70,${alpha})`;
  ctx.fillRect(-600, -600, W + 1200, 3200);
}

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

/** Lying on the bed at the left, head on the pillow, as in F26. */
function lyingDown(ctx: Ctx, s: SceneState, look: Look, pose: Partial<Pose>) {
  ctx.save();
  ctx.translate(870, FLOOR - 225);
  ctx.rotate(-Math.PI / 2);
  drawPerson(ctx, 0, 0, look, { t: s.t, face: 1, ...pose });
  ctx.restore();
}

// ─── Things ───────────────────────────────────────────────────────────────────

/** A small tear-off calendar showing `word`. */
function calendar(ctx: Ctx, word: string) {
  blob(ctx, "#fff", () => ctx.roundRect(-110, -120, 220, 250, 14));
  blob(ctx, "#E63946", () => ctx.roundRect(-110, -120, 220, 60, [14, 14, 0, 0]));
  write(ctx, word, 0, 40, word.length > 6 ? 34 : 46);
}

/** A banknote, its origin at the centre. */
function note(ctx: Ctx, text: string) {
  blob(ctx, "#B5E48C", () => ctx.roundRect(-95, -50, 190, 100, 10), 7);
  blob(ctx, "rgba(255,255,255,0.5)", () => circle(ctx, -45, 0, 28), 0);
  write(ctx, text, 30, 3, 44);
}

/** A cup of coffee with steam, its origin at the bottom. */
function coffee(ctx: Ctx, t: number, steam = true) {
  blob(ctx, "#fff", () => ctx.roundRect(-38, -80, 76, 80, [6, 6, 20, 20]));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(44, -44, 18, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  blob(ctx, "#6F4E37", () => ellipse(ctx, 0, -76, 30, 7), 0);
  if (!steam) return;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.8 + i / 2) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) ctx.lineTo(-12 + i * 24 + Math.sin(k + t * 5) * 8, -95 - ph * 50 - k * 10);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A closed book, lying flat or held, its origin at the centre. */
function book(ctx: Ctx, color = "#2A9D8F", title = "") {
  blob(ctx, color, () => ctx.roundRect(-70, -95, 140, 190, 10));
  blob(ctx, "#fff", () => ctx.rect(-70, 70, 140, 14), 0);
  if (title) write(ctx, title, 0, -20, 30, "#fff");
}

/** A mark sheet held up: the marks and a stamp. */
function markSheet(ctx: Ctx, marks: string, stamp: string) {
  blob(ctx, "#fff", () => ctx.roundRect(-90, -230, 180, 230, 8), 7);
  ctx.strokeStyle = "#ADB5BD";
  ctx.lineWidth = 5;
  for (let y = -200; y < -110; y += 22) {
    ctx.beginPath();
    ctx.moveTo(-66, y);
    ctx.lineTo(66, y);
    ctx.stroke();
  }
  write(ctx, marks, 0, -80, 38);
  ctx.save();
  ctx.translate(30, -30);
  ctx.rotate(-0.2);
  ctx.strokeStyle = "#2DC653";
  ctx.lineWidth = 6;
  ctx.strokeRect(-56, -20, 112, 40);
  write(ctx, stamp, 0, 2, 28, "#2DC653");
  ctx.restore();
}

/** A TV remote, its origin at the middle. */
function remote(ctx: Ctx) {
  blob(ctx, "#2B2D42", () => ctx.roundRect(-26, -80, 52, 160, 18));
  blob(ctx, "#E63946", () => circle(ctx, 0, -52, 10), 0);
  for (let i = 0; i < 6; i++) blob(ctx, "#ADB5BD", () => circle(ctx, -12 + (i % 2) * 24, -16 + Math.floor(i / 2) * 26, 7), 0);
}

/** A purse, open when `open`. */
function purse(ctx: Ctx, open: boolean) {
  blob(ctx, "#9D4EDD", () => ctx.roundRect(-70, -30, 140, 90, 20));
  if (open) blob(ctx, "#B5E48C", () => ctx.rect(-40, -60, 80, 40), 6);
  blob(ctx, "#F4C542", () => circle(ctx, 0, -30, 12), 6);
}

/** A magnifying glass, its handle at the origin. */
function magnifier(ctx: Ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 20;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-40, -70);
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.fillStyle = "rgba(189,224,254,0.45)";
  ctx.beginPath();
  circle(ctx, -70, -130, 60);
  ctx.fill();
  ctx.stroke();
}

/** A friendly robot, its feet at the origin. */
function robot(ctx: Ctx, t: number, apron = false) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, -300);
  ctx.lineTo(0, -350);
  ctx.stroke();
  blob(ctx, "#FF3B5C", () => circle(ctx, 0, -360, 16), 6);
  blob(ctx, "#CED4DA", () => ctx.roundRect(-90, -300, 180, 140, 30));
  const blink = (t * 0.4) % 1 < 0.06;
  for (const ex of [-38, 38]) blob(ctx, "#4CC9F0", () => ellipse(ctx, ex, -235, 18, blink ? 3 : 18), 5);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-36, -195, 72, 14, 7), 0);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-75, -150, 150, 150, 20));
  if (apron) blob(ctx, "#FFAFCC", () => ctx.roundRect(-55, -130, 110, 130, 12), 6);
  else blob(ctx, "#4CC9F0", () => circle(ctx, 0, -85, 20), 6);
}

/** A big phone screen card: a header and rows popping in one by one. */
function screenCard(ctx: Ctx, x: number, y: number, pop: number, header: string, draw: (ctx: Ctx) => void) {
  popped(ctx, x, y, pop, () => {
    blob(ctx, "#2B2D42", () => ctx.roundRect(-270, -280, 540, 560, 40));
    blob(ctx, "#F1FAEE", () => ctx.roundRect(-240, -250, 480, 500, 20), 0);
    blob(ctx, "#2A9D8F", () => ctx.roundRect(-240, -250, 480, 80, [20, 20, 0, 0]), 0);
    write(ctx, header, 0, -208, 40, "#fff");
    draw(ctx);
  });
}

/** A trip van facing right, with people at its windows; `riders` lists who sits at which of the 5 windows. */
function van(ctx: Ctx, x: number, t: number, riders: Array<[number, Look, Pose["mood"]]>) {
  const y = FLOOR - 40 + Math.sin(t * 16) * 3;
  blob(ctx, "#FFD166", () => ctx.roundRect(x - 400, y - 400, 800, 360, [50, 110, 20, 20]));
  blob(ctx, "#E76F51", () => ctx.rect(x - 400, y - 150, 800, 34), 0);
  const windows = [0, 1, 2, 3, 4].map((i) => x - 370 + i * 145);
  for (const [i, wx] of windows.entries()) {
    const top = y - 370;
    const w = i === 4 ? 150 : 120;
    blob(ctx, "#BDE0FE", () => ctx.roundRect(wx, top, w, 150, i === 4 ? [10, 60, 10, 10] : 12), 7);
    const rider = riders.find(([at]) => at === i);
    if (rider) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(wx, top, w, 150, 12);
      ctx.clip();
      drawPerson(ctx, wx + w / 2, top + 75 + 270 + 10, rider[1], { t, mood: rider[2], face: 1, scale: 0.5 });
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(wx, top, w, 150, i === 4 ? [10, 60, 10, 10] : 12);
      ctx.stroke();
    }
  }
  sign(ctx, x - 80, y - 85, "KODAI TRIP 🌴", "#2A9D8F", "#fff", 34);
  for (const wx of [x - 240, x + 250]) {
    blob(ctx, INK, () => circle(ctx, wx, y - 20, 62), 0);
    blob(ctx, "#ADB5BD", () => circle(ctx, wx, y - 20, 26), 0);
  }
}

const DRIVER: Look = { skin: "#A86B45", shirt: "#C9A66B", pants: "#3B3B4F", hair: "short", mustache: true };
const KADAIKAARAR: Look = { skin: "#B5764A", shirt: "#F8F9FA", pants: "#3B3B4F", hair: "short", mustache: true };

/** A street-corner shop: an awning, a counter with jars, and its board. */
function kadai(ctx: Ctx, x: number) {
  blob(ctx, "#F6BD60", () => ctx.rect(x - 330, FLOOR - 760, 660, 760));
  blob(ctx, "#6D4C41", () => ctx.rect(x - 290, FLOOR - 560, 580, 360), 0);
  for (let i = 0; i < 6; i++) {
    blob(ctx, i % 2 ? "#fff" : "#E63946", () => {
      ctx.moveTo(x - 360 + i * 120, FLOOR - 660);
      ctx.lineTo(x - 240 + i * 120, FLOOR - 660);
      ctx.lineTo(x - 240 + i * 120, FLOOR - 580);
      ctx.quadraticCurveTo(x - 300 + i * 120, FLOOR - 540, x - 360 + i * 120, FLOOR - 580);
      ctx.closePath();
    }, 7);
  }
  for (const [i, color] of ["#FFB703", "#E63946", "#80ED99", "#4CC9F0"].entries()) {
    blob(ctx, "#fff", () => ctx.roundRect(x - 240 + i * 130, FLOOR - 470, 90, 110, 16), 6);
    blob(ctx, color, () => ctx.roundRect(x - 230 + i * 130, FLOOR - 430, 70, 64, 10), 0);
  }
  blob(ctx, "#A9744F", () => ctx.rect(x - 330, FLOOR - 220, 660, 220));
  sign(ctx, x, FLOOR - 710, "ANNACHI KADAI", "#2B2D42", "#FFD166", 40);
}

/** A storeroom wall with stacked sacks. */
function godown(ctx: Ctx) {
  room(ctx, "#D4A373", "#6B5B4B", "rgba(0,0,0,0.05)");
  sign(ctx, 540, 260, "GODOWN", "#2B2D42", "#FFD166", 52);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 3 - (row > 1 ? 1 : 0); i++) {
      ctx.save();
      ctx.translate(720 + i * 130 + row * 30, FLOOR - 40 - row * 150);
      ctx.scale(0.75, 0.75);
      blob(ctx, "#B08968", () => ctx.roundRect(-90, -160, 180, 170, 40));
      write(ctx, "50KG", 0, -70, 34, "#7F5539");
      ctx.restore();
    }
  }
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

/** F25 · Ten thumbs up in the group — and only Machan and the driver on the van. */
export function tripConfirm(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }, [{ at: l2.start, x: 540, y: 660, zoom: 1.1 }]));
    friendsRoom(ctx);
    person(ctx, s, "Machan", MACHAN, 250, 1, {
      mood: line === 0 || line === 2 ? "happy" : "proud",
      arm: line === 0 ? "up" : "hold",
      holding: line === 0 ? undefined : (c) => phone(c, t, 0.9),
      jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 16 : 0,
    });
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 3 ? "confused" : line === 1 ? "happy" : "normal",
      arm: line === 3 ? "scratch" : line === 1 ? "thumb" : "down",
    });
    if (line === 0) shout(ctx, "TRIP! 10 PER 🚐", 540, 380, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD400", 80);
    if (line >= 2) {
      // The group chat filling up with thumbs.
      const shown = Math.min(10, Math.floor(clamp01((t - l2.start - 0.2) / 1.4) * 10) + 1);
      screenCard(ctx, 540, 520, easeOutBack((t - l2.start) / 0.3) * 0.9, "TRIP GANG 🌴", (c) => {
        for (let i = 0; i < shown; i++) write(c, "👍", -170 + (i % 5) * 85, -70 + Math.floor(i / 5) * 110, 70);
        write(c, `${shown}/10 CONFIRM ✅`, 0, 170, 40, "#2A9D8F");
      });
    }
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  } else {
    // The van on the trip day: just Machan and the driver.
    camera(ctx, t, [{ at: p.start, x: 540, y: 760, zoom: 1.05, move: 0 }]);
    street(ctx, t, false);
    van(ctx, 540, t, [[1, MACHAN, share > 0.4 ? "sad" : "normal"], [4, DRIVER, "normal"]]);
    pulseRing(ctx, 375, FLOOR - 335, 110, t, p.start + (p.end - p.start) * 0.35);
    shout(ctx, "10 👍 … 0 AALU!", 540, 360, easeOutBack((share - 0.55) / 0.2), "#FF3B5C", 90, -0.05, 940);
  }
  ctx.restore();
}

/** A2 · Sent to the shop to wait for a call — then Amma forgets what she wanted. */
export function kadaiList(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 3) {
    camera(ctx, t, follow(s, { Naan: 250, Amma: 840 }, [], 1.12));
    ammaHall(ctx, t);
    person(ctx, s, "Naan", NAAN, 250, 1, {
      mood: line === 1 ? "confused" : line === 2 ? "sad" : "normal",
      arm: line >= 1 ? "hold" : "down",
      holding: line >= 1 ? shoppingBag : undefined,
    });
    person(ctx, s, "Amma", AMMA, 840, -1, {
      mood: "normal",
      arm: line === 0 ? "point" : line === 2 ? "hold" : "down",
      holding: line === 2 ? (c) => phone(c, t, 0.7) : undefined,
    });
    if (line === 0) shout(ctx, "KADAIKKU PO! 🛒", 540, 380, easeOutBack((t - l0.start - 0.3) / 0.3), "#FF7B3A", 80);
    if (line === 1) mark(ctx, "?", 250, 470, t, l1.start + 0.1);
    if (line === 2) shout(ctx, "PHONE PANREN 📞", 560, 380, easeOutBack((t - l2.start - 0.3) / 0.3), "#4CC9F0", 72);
  } else if (line === 3 || share > 0.55) {
    // At the shop, phone to his ear, waiting for the list.
    camera(ctx, t, [{ at: l3.start, x: 540, y: 760, zoom: 1.05, move: 0 }]);
    street(ctx, t, false);
    kadai(ctx, 700);
    drawPerson(ctx, 760, FLOOR - 210, KADAIKAARAR, { t, mood: line === 4 ? "confused" : "normal", face: -1, scale: 0.8 });
    blob(ctx, "#A9744F", () => ctx.rect(370, FLOOR - 220, 660, 220));
    const done = t >= p.end;
    person(ctx, s, "Naan", NAAN, 260, 1, {
      mood: line === 4 ? (done ? "sad" : "shocked") : "normal",
      arm: done ? "facepalm" : "cheeks",
      holding: done ? undefined : (c) => phone(c, t, 0.4, -0.3),
    });
    // "A few minutes later…" over the cut.
    const card = 1 - easeOut((t - l3.start - 1.2) / 0.3);
    if (line === 3) popped(ctx, 540, 300, Math.min(easeOutBack((t - l3.start) / 0.3), card), () => sign(ctx, 0, 0, "⏱️ 10 NIMISHAM KAZHICHU…", "#2B2D42", "#fff", 44));
    if (line === 4) {
      sweat(ctx, 170, 620, t, p.start + (p.end - p.start) * 0.6);
      shout(ctx, "VANDHUDU?! 😩", 540, 330, easeOutBack((share - 0.75) / 0.15), "#FF3B5C", 96);
    }
  } else {
    // Amma at home on the call, the list gone from her head.
    camera(ctx, t, [{ at: p.start, x: 600, y: 720, zoom: 1.2, move: 0 }]);
    ammaHall(ctx, t);
    person(ctx, s, "Amma", AMMA, 720, -1, { mood: "confused", arm: "hold", holding: (c) => phone(c, t, 0.7) });
    thought(ctx, 430, 420, 380, 340, t, p.start + 0.2, Infinity, [650, 560], (c) => {
      blob(c, "#fff", () => c.rect(-80, -120, 160, 240), 6);
      write(c, "LIST", 0, -80, 36);
      write(c, "???", 0, 20, 70, "#E63946");
    });
  }
  ctx.restore();
}

/** F10 · "My strength? I can lift 50 kg" — and he got the job: carrying sacks. */
export function interviewStrength(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }));
    friendsRoom(ctx);
    person(ctx, s, "Machan", MACHAN, 250, 1, {
      mood: line === 2 ? "proud" : "normal",
      arm: line === 2 ? "up" : line === 0 ? "point" : "down",
    });
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 3 ? "happy" : line === 2 ? "shocked" : "normal",
      arm: line === 3 ? "thumb" : "down",
    });
    // The interview, remembered: a desk and a big question.
    thought(ctx, 560, 380, 520, 360, t, l0.start + 0.3, l0.end + 0.2, [280, 560], (c) => {
      c.fillStyle = "#E9ECEF";
      c.fillRect(-260, -180, 520, 360);
      blob(c, "#8D5B3B", () => c.rect(-200, 40, 400, 40), 6);
      drawPerson(c, 120, 130, { skin: "#C68A60", shirt: "#2B2D42", pants: "#2B2D42", hair: "short" }, { t, face: -1, scale: 0.4 });
      write(c, "STRENGTH?", -40, -110, 52, "#E63946");
    });
    if (line === 2) {
      shout(ctx, "50 KG 💪", 560, 380, easeOutBack((t - l2.start - 0.4) / 0.3), "#FFD400", 100);
      burst(ctx, 420, 560, 120, t, l2.start + 0.4);
    }
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  } else {
    // The job: carrying 50 kg sacks in a godown.
    camera(ctx, t, [{ at: p.start, x: 520, y: 740, zoom: 1.1, move: 0 }]);
    godown(ctx);
    person(ctx, s, "Machan", MACHAN, 330, 1, {
      mood: share > 0.5 ? "sad" : "proud",
      arm: "hold",
      holding: sack,
    });
    if (share > 0.5) sweat(ctx, 220, 620, t, p.start + (p.end - p.start) * 0.5);
    shout(ctx, "JOB KIDAICHIDUCHU! 🎉", 540, 420, easeOutBack(share / 0.2) * (1 - easeOut((share - 0.45) / 0.1)), "#80ED99", 70, -0.05, 940);
    shout(ctx, "MOOTTAI THOOKKURA JOB 😵", 540, 420, easeOutBack((share - 0.55) / 0.2), "#FF7B3A", 64, -0.05, 960);
  }
  ctx.restore();
}

/** A20 · Chatting all night with an AI — Amma only wants to know if she can cook. */
export function aiPonnu(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 250, Amma: 840 }, [{ at: p.start, x: 640, y: 720, zoom: 1.15 }], 1.12));
  ammaHall(ctx, t);
  night(ctx, 0.28);
  const done = t >= p.end;
  person(ctx, s, "Naan", NAAN, 250, 1, {
    mood: done ? "sad" : line === 3 ? "shocked" : line === 4 ? "shocked" : "happy",
    arm: done ? "facepalm" : "hold",
    holding: done ? undefined : (c) => phone(c, t, 0.5),
  });
  person(ctx, s, "Amma", AMMA, 840, -1, {
    mood: line === 2 ? "laugh" : line === 4 ? "proud" : line === 0 ? "confused" : "normal",
    arm: line === 0 || line === 4 ? "point" : line === 2 ? "cheeks" : "down",
    jump: line === 2 ? Math.abs(Math.sin((t - l2.start) * 9)) * 14 : 0,
  });
  if (line === 0) {
    // The chat glowing on his phone.
    for (const [i, text] of ["Hi 😊", "Good night? 🌙", "Innum pesalaam! ❤️"].entries()) {
      popped(ctx, 470, 420 + i * 110, easeOutBack((t - l0.start - 0.2 - i * 0.4) / 0.3), () => sign(ctx, 0, 0, text, i % 2 ? "#fff" : "#80ED99", INK, 36));
    }
  }
  if (line === 1) shout(ctx, "AI 🤖", 520, 380, easeOutBack((t - l1.start - 0.3) / 0.3), "#4CC9F0", 110);
  if (line === 2) shout(ctx, "PONNAA? 😍", 640, 380, easeOutBack((t - l2.start - 0.2) / 0.3), "#FF8FAB", 96);
  if (line === 3) {
    screenCard(ctx, 520, 520, easeOutBack((t - l3.start) / 0.3) * 0.8, "AI CHAT", (c) => {
      c.save();
      c.translate(0, 200);
      robot(c, t);
      c.restore();
    });
  }
  if (line === 4) {
    thought(ctx, 560, 380, 480, 400, t, p.start + 0.2, Infinity, [800, 560], (c) => {
      c.fillStyle = "#CDEAC0";
      c.fillRect(-240, -200, 480, 400);
      c.save();
      c.translate(-80, 170);
      c.scale(0.8, 0.8);
      robot(c, t, true);
      c.restore();
      stove(c, 120, 150, t, 0.2);
    });
    shout(ctx, "SAMAIKKA THERIYUMAA? 🍳", 540, 700, easeOutBack((share - 0.6) / 0.2), "#FFD400", 64, -0.04, 960);
  }
  ctx.restore();
}

/** F17 · Runs 5 km daily — from tomorrow. Today he's watching how to run. */
export function daily5km(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }));
    friendsRoom(ctx);
    person(ctx, s, "Machan", MACHAN, 250, 1, {
      mood: line === 2 ? "happy" : "proud",
      arm: line === 2 ? "point" : "down",
      run: line === 0 ? t - l0.start : undefined,
    });
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 3 ? "confused" : line >= 1 ? "happy" : "normal",
      arm: line === 3 ? "scratch" : line === 1 ? "thumb" : "down",
    });
    if (line === 0) shout(ctx, "DAILY 5 KM 🏃", 540, 380, easeOutBack((t - l0.start - 0.3) / 0.3), "#80ED99", 90);
    if (line === 2) popped(ctx, 560, 470, easeOutBack((t - l2.start - 0.3) / 0.3) * 0.9, () => calendar(ctx, "NAALAI"));
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  } else {
    // Lying on the bed watching a "how to run" video.
    camera(ctx, t, [{ at: p.start, x: 540, y: 740, zoom: 1.08, move: 0 }]);
    friendsRoom(ctx);
    bed(ctx, 200, 720);
    lyingDown(ctx, s, MACHAN, { mood: "happy", talk: talkOf(s, "Machan"), arm: "hold", holding: (c) => phone(c, t, 0.6) });
    blob(ctx, "#E76F51", () => ctx.roundRect(470, FLOOR - 330, 420, 140, 30));
    popped(ctx, 540, 520, easeOutBack((share - 0.15) / 0.25), () => {
      blob(ctx, "#111", () => ctx.roundRect(-300, -190, 600, 380, 24));
      // A tiny runner on the video, running in place.
      drawPerson(ctx, -40, 90, MACHAN, { t, face: 1, scale: 0.3, run: t });
      blob(ctx, "#FF0000", () => ctx.roundRect(120, -40, 110, 76, 20), 0);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(160, -20);
      ctx.lineTo(195, -2);
      ctx.lineTo(160, 16);
      ctx.fill();
      write(ctx, "Eppadi odradhu? 🏃", 0, -140, 40, "#fff");
      blob(ctx, "#555", () => ctx.rect(-270, 150, 540, 10), 0);
      blob(ctx, "#FF0000", () => ctx.rect(-270, 150, 540 * clamp01(share), 10), 0);
    });
    shout(ctx, "INNAIKKU: YOUTUBE RUN 📱", 540, 900, easeOutBack((share - 0.6) / 0.2), "#FFD400", 64, -0.04, 960);
  }
  ctx.restore();
}

/** A26 · Amma has 50 — so give 60, and write 10 down as a loan. */
export function pocketMoney(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 250, Amma: 840 }, [{ at: p.start, x: 500, y: 720, zoom: 1.15 }]));
  ammaHall(ctx, t);
  const done = t >= p.end;
  person(ctx, s, "Naan", NAAN, 250, 1, {
    mood: line === 4 || line === 2 ? "proud" : line === 3 ? "happy" : "normal",
    arm: line === 0 ? "hold" : line === 2 ? "point" : line === 4 ? "thumb" : "down",
  });
  person(ctx, s, "Amma", AMMA, 840, -1, {
    mood: done ? "shocked" : line === 4 ? "shocked" : line === 1 || line === 2 ? "confused" : "normal",
    arm: done ? "facepalm" : line === 4 ? "cheeks" : line >= 1 ? "hold" : "down",
    holding: !done && line >= 1 && line < 4 ? (c) => purse(c, line === 3) : undefined,
  });
  if (line === 0) shout(ctx, "KAASU VENUM 🙏", 540, 380, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD400", 80);
  if (line === 1) mark(ctx, "?", 840, 470, t, l1.start + 0.1);
  if (line === 2) mark(ctx, "😏", 250, 470, t, l2.start + 0.3);
  if (line === 3) popped(ctx, 640, 480, easeOutBack((t - l3.start - 0.2) / 0.3) * 1.4, () => note(ctx, "₹50"));
  if (line === 4) {
    popped(ctx, 520, 360, easeOutBack((share - 0.05) / 0.25) * 1.4, () => note(ctx, "₹60"));
    popped(ctx, 560, 560, easeOutBack((share - 0.5) / 0.2), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-190, -90, 380, 180, 12));
      ctx.strokeStyle = "#ADB5BD";
      ctx.lineWidth = 4;
      for (let y = -40; y < 90; y += 40) {
        ctx.beginPath();
        ctx.moveTo(-160, y);
        ctx.lineTo(160, y);
        ctx.stroke();
      }
      write(ctx, "KADAN 📝", 0, -50, 44, "#E63946");
      write(ctx, "Naan → Amma: ₹10", 0, 30, 36);
    });
  }
  ctx.restore();
}

/** F22 · Coffee keeps him awake — so he drank three, happily, and slept. */
export function coffeeNight(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }));
    friendsRoom(ctx);
    if (line === 2) {
      night(ctx, 0.25);
      table(ctx, 400, 300, 300);
      for (let i = 0; i < 3; i++) {
        popped(ctx, 460 + i * 90, FLOOR - 330, easeOutBack((t - l2.start - 0.5 - i * 0.3) / 0.3), () => coffee(ctx, t + i));
      }
      shout(ctx, "x3 ☕", 560, 620, easeOutBack((t - l2.start - 1.4) / 0.3), "#FFD400", 90);
    }
    person(ctx, s, "Machan", MACHAN, 250, 1, {
      mood: line === 2 ? "proud" : "happy",
      arm: line === 0 || line === 2 ? "hold" : "down",
      holding: line === 0 || line === 2 ? (c) => { c.translate(0, 40); coffee(c, t); } : undefined,
    });
    person(ctx, s, "Naan", NAAN, 840, -1, {
      mood: line === 3 ? "confused" : line === 1 ? "happy" : "normal",
      arm: line === 1 ? "hold" : line === 3 ? "scratch" : "down",
      holding: line === 1 ? (c) => book(c, "#2A9D8F", "📖") : undefined,
    });
    if (line === 0) shout(ctx, "NO THOOKAM ☕", 540, 380, easeOutBack((t - l0.start - 0.5) / 0.3), "#FF7B3A", 80);
    if (line === 1) shout(ctx, "NIGHT STUDY! 📚", 560, 380, easeOutBack((t - l1.start - 0.4) / 0.3), "#4CC9F0", 72);
    if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  } else {
    // Last night: fast asleep, the book shut and three empty cups.
    camera(ctx, t, [{ at: p.start, x: 540, y: 760, zoom: 1.08, move: 0 }], kick(t, p.start, 0.3) * 0.3);
    friendsRoom(ctx);
    bed(ctx, 200, 720);
    lyingDown(ctx, s, MACHAN, { mood: share > 0.35 ? "sleep" : "happy", talk: share > 0.35 ? 0 : talkOf(s, "Machan") });
    blob(ctx, "#E76F51", () => ctx.roundRect(470, FLOOR - 330, 420, 140, 30));
    ctx.save();
    ctx.translate(640, FLOOR - 350);
    ctx.rotate(-0.2);
    book(ctx, "#2A9D8F", "📖");
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(960 + (i % 2) * 70, FLOOR - 20 - Math.floor(i / 2) * 0);
      ctx.rotate(i === 2 ? 1.4 : 0);
      coffee(ctx, t, false);
      ctx.restore();
    }
    night(ctx, 0.3);
    if (share > 0.35) zzz(ctx, 300, FLOOR - 450, t);
    shout(ctx, "3 COFFEE… FULL THOOKAM 😴", 540, 380, easeOutBack((share - 0.6) / 0.2), "#FFD400", 64, -0.04, 960);
  }
  ctx.restore();
}

/** A17 · A haircut you can't even see — and the "invisible cut" cost extra. */
export function invisibleHaircut(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 250, Amma: 820 }, [{ at: p.start, x: 520, y: 720, zoom: 1.15 }]));
  ammaHall(ctx, t);
  const done = t >= p.end;
  person(ctx, s, "Naan", NAAN, 250, 1, {
    mood: line === 0 || line === 2 || line === 4 ? "proud" : "normal",
    arm: line === 0 ? "scratch" : line === 2 ? "thumb" : line === 4 ? "hold" : "down",
    holding: line === 4 ? (c) => {
      c.translate(10, -40);
      blob(c, "#fff", () => c.rect(-10, -90, 130, 170), 6);
      write(c, "BILL", 55, -60, 30);
      write(c, "₹200", 55, 0, 34, "#E63946");
    } : undefined,
  });
  person(ctx, s, "Amma", AMMA, 820, -1, {
    mood: done ? "shocked" : line === 4 ? "shocked" : line === 1 ? "confused" : "normal",
    arm: done ? "facepalm" : line === 1 ? "hold" : line === 4 ? "cheeks" : "down",
    holding: line === 1 ? magnifier : undefined,
  });
  if (line === 0) {
    burst(ctx, 250, 420, 150, t, l0.start + 0.4);
    shout(ctx, "NEW HAIRCUT ✂️", 560, 360, easeOutBack((t - l0.start - 0.4) / 0.3), "#FFD400", 80);
  }
  if (line === 1) mark(ctx, "?", 820, 450, t, l1.start + 0.4);
  if (line === 2) shout(ctx, "STYLE 😎", 520, 380, easeOutBack((t - l2.start - 0.2) / 0.3), "#4CC9F0", 100);
  if (line === 3) mark(ctx, "₹?", 820, 450, t, l3.start + 0.1, "#80ED99");
  if (line === 4) {
    popped(ctx, 540, 400, easeOutBack((share - 0.3) / 0.25), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-300, -150, 600, 300, 20));
      write(ctx, "✂️ SALOON BILL", 0, -100, 44, "#2A9D8F");
      write(ctx, "Cutting ₹100", -260, -30, 38, INK, "left");
      write(ctx, "Theriyaama ₹100", -260, 30, 38, "#E63946", "left");
      write(ctx, "= ₹200", 260, 100, 44, INK, "right");
    });
    if (share > 0.85) shout(ctx, "EXTRA CHARGE! 💸", 540, 700, easeOutBack((share - 0.85) / 0.15), "#FF3B5C", 76);
  }
  ctx.restore();
}

/** F28 · Passed with exactly the pass mark — why waste marks? */
export function justPass(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 250, Naan: 840 }, [{ at: p.start, x: 470, y: 720, zoom: 1.18 }]));
  friendsRoom(ctx);
  const done = t >= p.end;
  person(ctx, s, "Machan", MACHAN, 250, 1, {
    mood: line === 4 ? "proud" : "happy",
    arm: line === 4 ? "thumb" : "hold",
    holding: line === 4 ? undefined : (c) => markSheet(c, "35/100", "PASS"),
    jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 8)) * 16 : 0,
  });
  person(ctx, s, "Naan", NAAN, 840, -1, {
    mood: done ? "sad" : line === 3 || line === 4 ? "shocked" : line === 1 ? "happy" : "normal",
    arm: done ? "facepalm" : line === 3 ? "cheeks" : line === 1 ? "thumb" : "down",
  });
  if (line === 0) shout(ctx, "PASS! ✅", 560, 380, easeOutBack((t - l0.start - 0.3) / 0.3), "#80ED99", 110);
  if (line === 2) {
    popped(ctx, 560, 470, easeOutBack((t - l2.start - 0.2) / 0.3), () => {
      blob(ctx, "#fff", () => ctx.roundRect(-250, -120, 500, 240, 20));
      write(ctx, "MARK: 35", 0, -50, 56);
      write(ctx, "PASS MARK: 35", 0, 40, 46, "#E63946");
    });
  }
  if (line === 3) mark(ctx, "?!", 840, 470, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    shout(ctx, "MARK WASTE ILLA ♻️", 540, 330, easeOutBack((share - 0.4) / 0.2), "#FFD400", 76, -0.04, 940);
    shout(ctx, "65 MARK SAVED 😎", 560, 520, easeOutBack((share - 0.75) / 0.15), "#80ED99", 64, 0.05);
  }
  ctx.restore();
}

/** A27 · The remote is right in front of the eyes — his own. */
export function remoteKannu(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const lifted = line === 4 && share > 0.25;
  ctx.save();
  camera(ctx, t, [...follow(s, { Naan: 250, Amma: 840 }), { at: p.start + (p.end - p.start) * 0.25, x: 330, y: 640, zoom: 1.45 }]);
  ammaHall(ctx, t);
  tv(ctx, 560, t, false);
  const done = t >= p.end;
  person(ctx, s, "Naan", NAAN, 250, 1, {
    mood: lifted ? "proud" : "normal",
    arm: "hold",
    holding: (c) => {
      // Hidden at his chest, then up in front of his eyes.
      const up = lifted ? easeOutBack((share - 0.25) / 0.2) : 0;
      c.translate(-110 * up, -110 * up);
      c.rotate(-0.3 + up * 0.3);
      remote(c);
    },
  });
  person(ctx, s, "Amma", AMMA, 840, -1, {
    mood: done ? "shocked" : line === 1 || line === 3 ? "confused" : "normal",
    arm: done ? "facepalm" : line === 1 ? "cheeks" : line === 3 ? "scratch" : "down",
  });
  if (line === 0) shout(ctx, "REMOTE 📺", 560, 380, easeOutBack((t - l0.start - 0.4) / 0.3), "#4CC9F0", 90);
  if (line === 1) shout(ctx, "ENGA?! 👀", 620, 380, easeOutBack((t - l1.start - 0.3) / 0.3), "#FF7B3A", 90);
  if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  if (lifted) {
    pulseRing(ctx, 290, FLOOR - 545, 140, t, p.start + (p.end - p.start) * 0.35);
    shout(ctx, "EN KANNU MUNNADI! 👀", 330, 330, easeOutBack((share - 0.55) / 0.2), "#FFD400", 60, -0.05, 640);
  }
  ctx.restore();
}
