import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import {
  FLOOR, INK, blob, burst, camera, clamp01, drawPerson, easeOut, ellipse, easeOutBack, flies, kick, lineAt, mark, mess, phone, room, stink, sweat,
  talkOf, type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import {
  alarmClock, ammaHall, bed, bike, biryani, chickenLeg, fan, friendsRoom, kitchen, list, noodleBowl, noodlePacket, poolSide, router, shout,
  shoppingBag, stove, street, swimGear, table, tv, wind, zzz,
} from "./props";

/** Scenes for the Day 1 batch: F2, F4, F5, F7, F8, A1, A3, A7, A12, A13. */

type Ctx = SKRSContext2D;

export const NAAN: Look = { skin: "#B97A50", shirt: "#3A86FF", pants: "#3B3B4F", hair: "short" };
export const MACHAN: Look = { skin: "#C98B5E", shirt: "#FF7B3A", pants: "#2F3E66", hair: "messy" };
export const AMMA: Look = { skin: "#C68A60", shirt: "#E63946", pants: "#000", hair: "bun", saree: "#2A9D8F", bindi: true };

/** A person on the floor at `x`, their mouth moving with their own lines. */
function person(ctx: Ctx, s: SceneState, name: string, look: Look, x: number, face: 1 | -1, pose: Partial<Pose> = {}) {
  drawPerson(ctx, x, FLOOR, look, { t: s.t, talk: talkOf(s, name), face, ...pose });
}

/** The camera leaning towards whoever speaks each story line, then `extra` for the punch. */
function follow(s: SceneState, at: Record<string, number>, extra: Shot[] = [], zoom = 1.15): Shot[] {
  const story = s.spans.slice(0, -1).map((span, i) => ({ at: span.start - 0.15, x: 540 + ((at[s.speakers[i]] ?? 540) - 540) * 0.45, y: 740, zoom }));
  return [...story, ...extra];
}

/** Seconds into line `i`, and its share of the punch line spoken so far. */
const into = (s: SceneState, i: number) => s.t - s.spans[i].start;
const punchShare = (s: SceneState) => {
  const p = s.spans[s.spans.length - 1];
  return (s.t - p.start) / (p.end - p.start);
};

/** F2 · He joined swimming class but won't get in the water till he can swim. */
export function swimming(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, , , l3, p] = s.spans;
  const line = lineAt(s);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 260, Naan: 820 }, [{ at: p.start, x: 540, y: 780, zoom: 1.05 }]));
  poolSide(ctx, t);
  const strokes = line === 4;
  person(ctx, s, "Machan", MACHAN, 260, 1, {
    mood: strokes ? "happy" : line === 0 ? "proud" : "normal",
    arm: strokes ? (Math.floor(t * 5) % 2 ? "up" : "point") : line === 0 ? "up" : "down",
    jump: strokes ? Math.abs(Math.sin(t * 10)) * 14 : 0,
  });
  swimGear(ctx, 260, 1, 0);
  person(ctx, s, "Naan", NAAN, 840, -1, {
    mood: t >= p.end ? "sad" : strokes ? "shocked" : line === 3 ? "confused" : line === 1 ? "happy" : "normal",
    arm: t >= p.end ? "facepalm" : line === 1 ? "point" : line === 3 ? "scratch" : "down",
  });
  if (line === 3) mark(ctx, "?", 840, 470, t, l3.start + 0.1);
  if (strokes) shout(ctx, "DRY SWIMMING!", 540, 330, easeOutBack((t - p.start - 0.3) / 0.3), "#4CC9F0", 72);
  if (t >= p.end) sweat(ctx, 760, 620, t, p.end);
  ctx.restore();
}

/** F4 · A "strict diet" of biryani: protein from the chicken, energy from the rice. */
export function biryaniDiet(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, [
    ...follow(s, { Machan: 230, Naan: 850 }),
    { at: l2.start, x: 480, y: 700, zoom: 1.3 },
    { at: l3.start, x: 600, y: 740, zoom: 1.15 },
    { at: p.start, x: 480, y: 720, zoom: 1.2 },
  ]);
  friendsRoom(ctx);
  table(ctx, 360, 340);
  biryani(ctx, 530, FLOOR - 370, t);
  const eating = line >= 2;
  person(ctx, s, "Machan", MACHAN, 230, 1, {
    mood: line === 4 ? "happy" : "proud",
    arm: line === 4 ? "up" : eating ? "hold" : "thumb",
    holding: eating ? (c) => chickenLeg(c, 20, -10, -1.1) : undefined,
  });
  person(ctx, s, "Naan", NAAN, 850, -1, {
    mood: t >= p.end ? "sad" : line === 3 || line === 4 ? "shocked" : line === 1 ? "happy" : "normal",
    arm: t >= p.end ? "facepalm" : line === 3 ? "cheeks" : "down",
  });
  if (line === 3) mark(ctx, "?!", 850, 460, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    shout(ctx, "PROTEIN", 380, 420, easeOutBack((share - 0.1) / 0.15), "#FF7B3A", 76, -0.1);
    shout(ctx, "ENERGY", 640, 560, easeOutBack((share - 0.4) / 0.15), "#FFD400", 76, 0.08);
    shout(ctx, "PERFECT BALANCE!", 540, 300, easeOutBack((share - 0.75) / 0.15), "#80ED99", 70, -0.04);
  }
  ctx.restore();
}

/** F5 · Five alarms, all switched off, and back to sleep. */
export function fiveAlarms(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const clocks = [330, 430, 530, 630, 730];
  const shelf = () => {
    blob(ctx, "#8D5B3B", () => ctx.rect(260, 640, 560, 26));
    clocks.forEach((cx, i) => {
      const pop = easeOutBack((t - l0.start - 0.2 - i * 0.22) / 0.3);
      if (pop <= 0) return;
      ctx.save();
      ctx.translate(cx, 590);
      ctx.scale(pop * 0.8, pop * 0.8);
      const off = line === 4 && share > 0.15 + i * 0.12;
      alarmClock(ctx, 0, 0, t + i, line === 4 && !off ? 1 : 0, off);
      ctx.restore();
    });
  };

  ctx.save();
  if (line < 4) {
    camera(ctx, t, follow(s, { Machan: 230, Naan: 850 }, [], 1.1));
    friendsRoom(ctx);
    shelf();
    bed(ctx, 420, 520);
    person(ctx, s, "Machan", MACHAN, 230, 1, { mood: "proud", arm: line === 2 ? "up" : line === 0 ? "thumb" : "down" });
    person(ctx, s, "Naan", NAAN, 850, -1, { mood: line === 3 ? "happy" : "normal" });
    if (line === 3) mark(ctx, "?", 850, 470, t, l3.start + 0.1);
  } else {
    // What really happened: in bed, every alarm switched off, and asleep again.
    camera(ctx, t, [{ at: p.start, x: 540, y: 760, zoom: 1.1, move: 0 }], kick(t, p.start, 0.3) * 0.4);
    friendsRoom(ctx);
    shelf();
    bed(ctx, 200, 720);
    ctx.save();
    ctx.translate(870, FLOOR - 225);
    ctx.rotate(-Math.PI / 2);
    drawPerson(ctx, 0, 0, MACHAN, { t, mood: share > 0.75 ? "sleep" : "normal", face: 1, arm: share > 0.15 && share < 0.75 ? "up" : "down" });
    ctx.restore();
    blob(ctx, "#E76F51", () => ctx.roundRect(470, FLOOR - 330, 420, 140, 30));
    if (share > 0.75) zzz(ctx, 360, FLOOR - 420, t);
    ctx.fillStyle = "rgba(20,20,70,0.25)";
    ctx.fillRect(-600, -600, W + 1200, H + 1200);
  }
  ctx.restore();
}

/** F7 · Mileage 60 km — once. After that he pushes. */
export function mileage(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , , l3, p] = s.spans;
  const line = lineAt(s);
  const push = Math.max(0, t - p.start - 0.2);
  const bikeX = 560 + push * 160;
  ctx.save();
  camera(ctx, t, [
    ...follow(s, { Machan: 230, Naan: 880 }, [], 1.05),
    { at: p.start, x: 560, y: 760, zoom: 1.05 },
    { at: p.start + 0.4, x: 640, y: 760, zoom: 1.05, move: 3 },
  ]);
  street(ctx, t);
  bike(ctx, bikeX, FLOOR, t, push > 0 ? 1 : 0);
  person(ctx, s, "Machan", MACHAN, line === 4 ? bikeX - 330 : 230, 1, {
    mood: line === 4 ? "sad" : line === 2 ? "normal" : "proud",
    arm: line === 4 ? "point" : line === 0 ? "thumb" : "down",
    run: line === 4 && push > 0 ? push * 0.35 : undefined,
  });
  if (line === 4) sweat(ctx, bikeX - 420, 640, t, p.start + 0.4);
  person(ctx, s, "Naan", NAAN, 880, -1, {
    mood: t >= p.end ? "laugh" : line === 3 ? "confused" : line === 1 ? "happy" : "normal",
    arm: line === 1 ? "thumb" : line === 3 ? "scratch" : "down",
  });
  if (line >= 0 && line <= 1) shout(ctx, "60 KM!", 560, 640, easeOutBack((t - l0.start - 0.5) / 0.3), "#FFD400", 96);
  if (line === 3) mark(ctx, "?", 880, 470, t, l3.start + 0.1);
  ctx.restore();
}

/** F8 · The new WiFi password is "Kekkaadha". */
export function wifiPassword(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  ctx.save();
  camera(ctx, t, follow(s, { Machan: 260, Naan: 820 }, [{ at: p.start, x: 540, y: 700, zoom: 1.1 }]));
  friendsRoom(ctx);
  blob(ctx, "#8D5B3B", () => ctx.rect(440, 700, 200, 22));
  router(ctx, 540, 690, t);
  person(ctx, s, "Machan", MACHAN, 260, 1, {
    mood: line === 4 ? "laugh" : line === 2 ? "proud" : "happy",
    arm: line === 2 ? "point" : line === 0 ? "thumb" : "down",
  });
  person(ctx, s, "Naan", NAAN, 820, -1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 3 ? "confused" : "normal",
    arm: t >= p.end ? "facepalm" : "hold",
    holding: t >= p.end ? undefined : (c) => phone(c, t, 0.7),
  });
  if (line === 2) mark(ctx, "?", 820, 470, t, l2.start + 0.4);
  if (line === 3) mark(ctx, "!", 820, 470, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    // The password box on screen, typed letter by letter.
    const pop = easeOutBack((share - 0.35) / 0.15);
    if (pop > 0) {
      ctx.save();
      ctx.translate(540, 380);
      ctx.scale(pop, pop);
      blob(ctx, "#fff", () => ctx.roundRect(-330, -110, 660, 220, 30));
      ctx.font = `40px "ShortFlow Bold"`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#6C757D";
      ctx.fillText("WiFi Password", -290, -55);
      blob(ctx, "#E9ECEF", () => ctx.roundRect(-290, -15, 580, 90, 16), 6);
      const word = "KEKKAADHA";
      const shown = word.slice(0, Math.ceil(clamp01((share - 0.45) / 0.35) * word.length));
      ctx.font = `60px "ShortFlow Bold"`;
      ctx.fillStyle = INK;
      ctx.fillText(shown + ((t * 2) % 1 < 0.5 ? "|" : ""), -265, 32);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** A1 · "Put the phone down." "Done." "So you're free?" "Yes." "Then go to the shop!" */
export function phoneDown(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, l1, , , p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const down = t >= l1.start + 0.4;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 260, Amma: 830 }, [{ at: p.start, x: 600, y: 760, zoom: 1.12 }]));
  ammaHall(ctx, t);
  table(ctx, 430, 220, 300, "#A9744F");
  ctx.save();
  if (down) {
    ctx.translate(540, FLOOR - 345);
    ctx.rotate(Math.PI / 2);
    phone(ctx, t, 0.6);
  }
  ctx.restore();
  person(ctx, s, "Naan", NAAN, 260, 1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 1 ? "happy" : "normal",
    arm: down ? "down" : "hold",
    holding: down ? undefined : (c) => phone(c, t, 0.6),
  });
  if (t >= p.end) sweat(ctx, 360, 640, t, p.end);
  const giving = line === 4;
  person(ctx, s, "Amma", AMMA, 830, -1, {
    mood: giving ? "happy" : line === 2 ? "proud" : "normal",
    arm: giving ? "point" : line === 0 ? "point" : "down",
    holding: giving
      ? (c) => {
          shoppingBag(c);
          c.save();
          c.translate(0, 160);
          list(c, 40 + easeOut(share) * 420);
          c.restore();
        }
      : undefined,
  });
  ctx.restore();
}

/** A3 · Room cleaned in minutes: everything pushed under the bed. */
export function roomClean(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const lift = line === 4 ? easeOutBack((share - 0.4) / 0.3) * 150 + Math.sin(t * 30) * 4 * clamp01((share - 0.4) * 5) : 0;
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 230, Amma: 870 }, [{ at: p.start + (p.end - p.start) * 0.35, x: 640, y: 900, zoom: 1.2 }], 1.1), kick(t, p.start + (p.end - p.start) * 0.4, 0.4) * 0.6);
  room(ctx, "#B5E48C", "#3D405B", "rgba(255,255,255,0.12)");
  // The junk under the bed, showing once the bed rises off it.
  if (lift > 2) {
    mess(ctx, 690, FLOOR + 10, 1.05, t);
    stink(ctx, 690, FLOOR - 220, t);
    flies(ctx, 690, FLOOR - 160, t, 4);
  }
  ctx.save();
  ctx.translate(0, -lift);
  bed(ctx, 430, 520, "#4361EE");
  ctx.restore();
  // Sparkles while it looks clean.
  if (line < 4) {
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.8 + i * 0.37) % 1;
      const sx = 380 + ((i * 173) % 560);
      const sy = 520 + ((i * 97) % 380);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(Math.sin(ph * Math.PI), Math.sin(ph * Math.PI));
      blob(ctx, "#fff", () => {
        ctx.moveTo(0, -30);
        ctx.quadraticCurveTo(0, 0, 30, 0);
        ctx.quadraticCurveTo(0, 0, 0, 30);
        ctx.quadraticCurveTo(0, 0, -30, 0);
        ctx.quadraticCurveTo(0, 0, 0, -30);
      }, 0);
      ctx.restore();
    }
  }
  person(ctx, s, "Naan", NAAN, 230, 1, {
    mood: line === 4 ? "happy" : "proud",
    arm: line === 0 && t > l0.start ? "thumb" : line === 4 ? "point" : "down",
  });
  person(ctx, s, "Amma", AMMA, 870, -1, {
    mood: line === 4 && share > 0.4 ? "shocked" : line === 3 ? "confused" : line === 1 ? "happy" : "normal",
    arm: line === 4 && share > 0.4 ? "cheeks" : "down",
  });
  if (line === 3) mark(ctx, "?", 870, 470, t, l3.start + 0.1);
  if (line === 4 && share > 0.5) mark(ctx, "!!", 870, 450, t, p.start + (p.end - p.start) * 0.5, "#FF3B5C");
  ctx.restore();
}

/** A7 · TV off, fan off — "go sit outside, the breeze is free!" */
export function freeBreeze(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  ctx.save();
  if (line < 4) {
    const stopAt = l2.start + 0.6;
    const x = clamp01((t - stopAt) / 1.6);
    const angle = 9 * Math.min(t, stopAt) + 9 * 1.6 * (x - (x * x) / 2);
    camera(ctx, t, follow(s, { Naan: 250, Amma: 830 }, [], 1.1));
    ammaHall(ctx, t);
    tv(ctx, 540, t, t < l1.start + 0.4);
    burst(ctx, 540, FLOOR - 335, 140, t, l1.start + 0.4, "#fff");
    fan(ctx, 540, 260, t, angle);
    person(ctx, s, "Naan", NAAN, 250, 1, { mood: line === 3 ? "sad" : "normal", arm: line === 3 ? "scratch" : "down" });
    if (line === 3) sweat(ctx, 160, 640, t, l3.start);
    person(ctx, s, "Amma", AMMA, 830, -1, { mood: "normal", arm: line === 0 || line === 2 ? "point" : "down" });
  } else {
    // Outside: Amma at the door, Naan sent out into the wind.
    camera(ctx, t, [{ at: p.start, x: 540, y: 780, zoom: 1.05, move: 0 }]);
    street(ctx, t);
    blob(ctx, "#FFD6A5", () => ctx.rect(-600, 300, 760, FLOOR - 300));
    blob(ctx, "#3A2E39", () => ctx.rect(40, 640, 240, FLOOR - 640));
    person(ctx, s, "Amma", AMMA, 160, 1, { mood: "happy", arm: "point" });
    person(ctx, s, "Naan", NAAN, 720, -1, { mood: "sad", arm: "down", shiver: 0.15 });
    wind(ctx, 700, 760, t);
    shout(ctx, "KAATHU FREE!", 600, 380, easeOutBack((punchShare(s) - 0.6) / 0.2), "#80ED99", 84);
  }
  const flash = kick(t, p.start, 0.25);
  ctx.restore();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** A13 · On a diet, so Amma makes small dosas instead — ten of them. */
export function chinnaDosa(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  // In the punch the small dosas land on the plate one by one, ten of them.
  const landed = line === 4 ? Math.min(10, Math.floor(clamp01((share - 0.05) / 0.85) * 10) + 1) : 0;
  const stackTop = FLOOR - 380 - landed * 26;
  ctx.save();
  camera(ctx, t, [
    ...follow(s, { Naan: 230, Amma: 850 }),
    { at: p.start, x: 540, y: 700, zoom: 1.15 },
  ], kick(t, p.end, 0.3) * 0.4);
  kitchen(ctx);
  // The stove with a flat tawa, and a small dosa on it while Amma makes them.
  blob(ctx, "#ADB5BD", () => ctx.roundRect(560, 840, 280, 50, 10));
  blob(ctx, "#FF7B3A", () => ellipse(ctx, 700, 832, 70, 12 + Math.sin(t * 20) * 3), 0);
  blob(ctx, "#2B2D42", () => ellipse(ctx, 700, 815, 120, 22));
  if (line >= 2) blob(ctx, "#F4A261", () => ellipse(ctx, 700 + Math.sin(t * 3) * 6, 808, 40, 9), 5);
  table(ctx, 360, 360);
  blob(ctx, "#fff", () => ellipse(ctx, 540, FLOOR - 375, 130, 26));
  for (let i = 0; i < landed; i++) {
    const drop = i === landed - 1 && line === 4 ? 1 - easeOut(((share - 0.05) * 10 / 0.85 - i) / 0.5) : 0;
    smallDosa(ctx, 540 + Math.sin(i * 1.7) * 14, FLOOR - 395 - i * 26 - drop * 200);
  }
  if (line === 4) {
    shout(ctx, `${landed}`, 540, stackTop - 120, easeOutBack(((share - 0.05) * 10 / 0.85 - (landed - 1)) / 0.3), "#FFD400", 110);
    if (t >= p.end) shout(ctx, "x10 DIET!", 540, 330, easeOutBack((t - p.end) / 0.3), "#80ED99", 84, -0.05);
  }

  person(ctx, s, "Naan", NAAN, 230, 1, {
    mood: t >= p.end ? "sad" : line === 4 ? "shocked" : line === 3 || line === 0 ? "happy" : "proud",
    arm: t >= p.end ? "facepalm" : line === 1 ? "point" : line === 3 ? "thumb" : line === 4 ? "cheeks" : "down",
  });
  person(ctx, s, "Amma", AMMA, 850, -1, {
    mood: line === 4 ? "happy" : line === 1 ? "normal" : "happy",
    arm: line === 0 || line === 2 ? "hold" : line === 4 ? "point" : "down",
    holding: line === 0 ? (c) => dosaPlate(c) : line === 2 ? (c) => smallDosa(c, 0, -10) : undefined,
  });
  if (line === 1) shout(ctx, "DIET!", 260, 380, easeOutBack((t - l1.start - 0.3) / 0.3), "#80ED99", 80);
  if (line === 0) burst(ctx, 640, 780, 110, t, l0.start + 0.2);
  if (line === 3) burst(ctx, 230, 600, 120, t, l3.start + 0.1, "#80ED99");
  ctx.restore();
}

/** A small folded dosa, lying flat. */
function smallDosa(ctx: Ctx, x: number, y: number) {
  blob(ctx, "#E9A23B", () => {
    ctx.moveTo(x - 60, y);
    ctx.quadraticCurveTo(x, y - 34, x + 60, y);
    ctx.quadraticCurveTo(x, y + 14, x - 60, y);
  }, 6);
}

/** A plate with one big rolled dosa, held out. */
function dosaPlate(ctx: Ctx) {
  blob(ctx, "#fff", () => ellipse(ctx, 0, 0, 120, 24));
  blob(ctx, "#E9A23B", () => {
    ctx.moveTo(-110, -6);
    ctx.lineTo(110, -6);
    ctx.lineTo(90, -46);
    ctx.lineTo(-90, -46);
    ctx.closePath();
  }, 6);
}

/** A12 · Two-minute noodles, burnt: the recipe said nothing about water. */
export function noodles(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [, l1, , l3, p] = s.spans;
  const line = lineAt(s);
  const share = punchShare(s);
  const smoke = clamp01((t - l1.start + 0.5) / 6);
  ctx.save();
  camera(ctx, t, follow(s, { Naan: 230, Amma: 850 }, [{ at: p.start, x: 560, y: 680, zoom: 1.15 }]));
  kitchen(ctx);
  stove(ctx, 560, 880, t, smoke);
  person(ctx, s, "Naan", NAAN, 230, 1, {
    mood: "proud",
    arm: "hold",
    holding: (c) => {
      c.translate(10, -20);
      noodleBowl(c, true);
    },
  });
  person(ctx, s, "Amma", AMMA, 850, -1, {
    mood: t >= p.end ? "sad" : line === 3 || line === 4 ? "shocked" : line === 1 ? "confused" : "normal",
    arm: t >= p.end ? "facepalm" : line === 1 ? "cheeks" : "down",
    shiver: line === 1 ? 0.2 : 0,
  });
  if (line === 1) mark(ctx, "?", 850, 470, t, l1.start + 0.2);
  if (line === 3) mark(ctx, "!", 850, 470, t, l3.start + 0.1, "#FF3B5C");
  if (line === 4) {
    const pop = easeOutBack((share - 0.15) / 0.2);
    if (pop > 0) noodlePacket(ctx, 560, 400, pop * 1.6);
    shout(ctx, "WATER?", 560, 700, easeOutBack((share - 0.7) / 0.2), "#4CC9F0", 80, 0.05);
  }
  ctx.restore();
}
