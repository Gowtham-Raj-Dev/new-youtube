import type { SKRSContext2D } from "@napi-rs/canvas";
import {
  FLOOR, INK, blob, burst, camera, clamp01, drawPerson, easeInOut, easeOut, easeOutBack, kick, onScreen, phone, room, sweat, talkOf,
  type Look, type Pose, type SceneState, type Shot,
} from "../auto/cartoon";
import { ammaHall, kitchen, shout, street, zzz } from "../auto/props";
import type { SfxEvent } from "../auto/sfx";
import { AMMA, MACHAN, NAAN } from "../auto/scenes-day1";
import { LINES } from "./amma-oorukku";
import type { Episode, EpisodeCard, EpisodeLine } from "./episode";
import {
  beero, bleach, broom, chips, cooker, fridge, frontDoor, functionHall, jug, kadaai, oven, pot, shirt, slipper, sofa, spoon, stoveTop,
  sweetBox, towel, travelBag, tulsi, wallClock, washingMachine,
} from "./props-home";

/**
 * "Amma Oorukku Pona Oru Naal" as an episode: when every line is heard, the
 * time cards between scenes, the sounds, and the scenes themselves.
 */

type Ctx = SKRSContext2D;
const RATE = 24_000;
const GAP = 0.5;
/** The cold open: a few seconds of the chase, before the title. */
const TEASER = 5.5;

const CARDS: Record<number, string> = {
  1: "☀️ Kaalai 6 mani",
  2: "🍳 Kaalai 8 mani",
  3: "📱 Kaalai 9 mani",
  4: "👕 Kaalai 11 mani",
  5: "🌿 Madhiyam 1 mani",
  6: "⏰ Saayangaalam 4 mani",
  7: "🏃 4 to 5 mani…",
  8: "🚪 Anju mani",
  9: "🌅 Konja neram kazhichu…",
};

/** Seconds of picture with no talking before or after a line: the visual gags. */
const BEFORE: Record<string, number> = { "1": 4.0, "20": 1.4, "37": 1.4, "43": 1.6, "56": 1.6, "69": 0.6 };
const AFTER: Record<string, number> = {
  "7": 4.0, "9": 2.2, "13": 8.0, "15": 3.0, "19": 2.6, "22": 1.2, "27": 2.2, "31": 4.0, "35": 2.0, "38": 1.2, "40": 3.0,
  "45": 4.4, "47": 0.4, "49": 2.0, "51": 2.0, "53": 2.0, "55": 2.6, "58": 1.6, "60": 1.4, "61b": 2.2, "62b": 1.6, "64": 4.0,
  "66": 7.5, "68": 1.2, "69": 7.0,
};

/** When each script line is heard: the start and end of its voice, by line number. */
type Times = Record<string, { start: number; end: number }>;

/**
 * Lays the episode out in time. `pieces` holds each line's recorded voice by
 * line number; without one, a line is silent for as long as it would take to say.
 */
export function buildEpisode(pieces: Record<string, Buffer>): Episode {
  const cards: EpisodeCard[] = [{ at: TEASER, text: "Amma Oorukku Pona Oru Naal 😱", length: 3.2, title: true }];
  const lines: EpisodeLine[] = [];
  const times: Times = {};
  const sceneStart: Record<number, number> = {};
  const voice: Array<{ at: number; pcm: Buffer }> = [];
  let at = TEASER + 3.2;
  let scene = 0;
  for (const line of LINES) {
    if (line.scene !== scene) {
      scene = line.scene;
      cards.push({ at, text: CARDS[scene], length: 3.2 });
      sceneStart[scene] = at;
      at += 2.6;
    }
    at += BEFORE[line.n] ?? 0;
    const pcm = pieces[line.n] ?? Buffer.alloc(Math.round(Math.max(0.8, line.tamil.length * 0.065) * RATE) * 2);
    const length = pcm.length / (RATE * 2);
    voice.push({ at, pcm });
    times[line.n] = { start: at, end: at + length };
    lines.push({ screen: `${line.speaker}: ${line.tanglish}`, highlight: line.highlight, kind: PUNCH.has(line.n) ? "punch" : "story", start: at, end: at + length });
    at += length + GAP + (AFTER[line.n] ?? 0);
  }
  const duration = at;

  // The cold open: the climax's "INGA VAANGA!" and "ODU!!" over the start of the chase, before the title.
  const offset = times["65"].start - 0.3;
  const teaser = ["66", "65"].map((n) => {
    const i = LINES.findIndex((l) => l.n === n);
    voice.push({ at: times[n].start - offset, pcm: voice[i].pcm });
    return { ...lines[i], start: times[n].start - offset, end: times[n].end - offset };
  });
  lines.unshift(teaser[1], teaser[0]);

  const pcm = Buffer.alloc(Math.ceil(duration * RATE) * 2);
  for (const v of voice) v.pcm.copy(pcm, Math.round(v.at * RATE) * 2);

  return {
    title: "Amma Oorukku Pona Oru Naal",
    lines,
    cards,
    voice: pcm,
    sfx: sounds(times, cards, offset),
    duration,
    handle: "@MoolaiIllaMachan",
    scene: (ctx, s) => drawScene(ctx, s.t < TEASER ? { ...s, t: s.t + offset } : s, times, sceneStart),
  };
}

/** Lines shown word by word with a shake, as punch lines. */
const PUNCH = new Set(["17", "36", "42", "55", "62b", "64", "66", "68"]);

function sounds(T: Times, cards: EpisodeCard[], teaserOffset: number): SfxEvent[] {
  const e: SfxEvent[] = cards.map((c) => ({ at: c.at, kind: "whoosh" }));
  const after = (n: string, d: number) => T[n].end + GAP + d;
  // The cold open's slap.
  e.push({ at: after("66", 2.0) - teaserOffset, kind: "thud" });
  e.push({ at: after("9", 0.1), kind: "doorbell" });
  // The cooker: two whistles counted, then the rest while they watch cricket.
  for (const d of [0.8, 1.8, 2.9, 3.6, 4.3, 5.0, 5.7, 6.4, 7.1]) e.push({ at: after("13", d), kind: "whistle" });
  for (const n of ["20", "37", "43"]) e.push({ at: T[n].start - 1.3, kind: "ring" });
  e.push({ at: after("31", 3.5), kind: "ding" });
  e.push({ at: after("45", 0.6), kind: "pop" }, { at: after("45", 1.4), kind: "pop" }, { at: after("45", 2.2), kind: "pop" }, { at: after("45", 3.0), kind: "pop" });
  for (let x = T["47"].start; x < T["55"].end + 2.4; x += 0.5) e.push({ at: x, kind: "tick" });
  e.push({ at: after("55", 2.0), kind: "doorbell" });
  e.push({ at: after("61b", 1.2), kind: "thud" }, { at: after("62b", 1.0), kind: "pop" });
  e.push({ at: after("66", 2.0), kind: "thud" }, { at: after("66", 5.6), kind: "thud" });
  for (const n of ["17", "36", "62b", "68"]) e.push({ at: T[n].end + 0.15, kind: "rimshot" });
  return e;
}

// ─── The scenes ───────────────────────────────────────────────────────────────

const PINK = "#FF8FAB";
/** How the world maps to the 16:9 frame at zoom 1 (see episode.ts). */
const K = 0.95;

type H = {
  s: SceneState;
  start: (n: string) => number;
  end: (n: string) => number;
  since: (n: string) => number;
  /** Seconds since the picture-only moment after line `n` began. */
  after: (n: string) => number;
  on: (n: string) => boolean;
  /** 0–1 over `length` seconds, `from` seconds into the moment after line `n`. */
  p: (n: string, from: number, length: number) => number;
  talk: (name: string) => number;
  /** Big words on the screen (1920×1080), popping in at `from`, never wider than the frame. */
  say: (text: string, x: number, y: number, from: number, color?: string, size?: number, tilt?: number, maxWidth?: number) => void;
};
type P = (name: string, look: Look, x: number, face: 1 | -1, pose?: Partial<Pose>) => void;

/** A shot whose world point `x` lands at screen x `sx` (so a split screen can sit on the left). */
const shotAt = (at: number, x: number, sx: number, y: number, zoom: number, move = 0.5): Shot => ({ at, x: x - (sx - 960) / (K * zoom), y, zoom, move });

function drawScene(ctx: Ctx, s: SceneState, T: Times, start: Record<number, number>) {
  const scene = [9, 8, 7, 6, 5, 4, 3, 2, 1].find((k) => s.t >= start[k] - 0.3) ?? 1;
  const h: H = {
    s,
    start: (n) => T[n].start,
    end: (n) => T[n].end,
    since: (n) => s.t - T[n].start,
    after: (n) => s.t - (T[n].end + GAP),
    on: (n) => s.t >= T[n].start - 0.05,
    p: (n, from, length) => clamp01((s.t - (T[n].end + GAP) - from) / length),
    talk: (name) => talkOf(s, name),
    say: (text, x, y, from, color = "#FFD400", size = 100, tilt = -0.05, maxWidth = 1750) => {
      const p = easeOutBack((s.t - from) / 0.3);
      if (p > 0) onScreen(ctx, s, () => shout(ctx, text, x, y, p, color, size, tilt, maxWidth));
    },
  };
  const person: P = (name, look, x, face, pose = {}) => drawPerson(ctx, x, FLOOR, look, { t: s.t, talk: name ? h.talk(name) : 0, face, ...pose });
  ctx.save();
  [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9][scene - 1](ctx, s.t, h, person);
  ctx.restore();
}

/**
 * Amma on the phone, on the left of a split screen at Chithi's house:
 * sliding in at `from`, out at `until`.
 */
function ammaPanel(ctx: Ctx, h: H, t: number, from: number, until: number, label: string, mood: Pose["mood"], carry?: (c: Ctx) => void) {
  const p = easeOut((t - from) / 0.4) * (1 - easeOut((t - until) / 0.4));
  if (p <= 0) return;
  onScreen(ctx, h.s, () => {
    ctx.save();
    ctx.translate(-680 * (1 - p), 0);
    ctx.beginPath();
    ctx.rect(0, 0, 660, 1080);
    ctx.save();
    ctx.clip();
    functionHall(ctx, 660, 1080, t);
    drawPerson(ctx, 330, 1010, AMMA, { t, talk: h.talk("Amma"), face: 1, mood, arm: "hold", holding: carry ?? ((c) => phone(c, t, 0.7)), scale: 1.05 });
    ctx.restore();
    ctx.fillStyle = INK;
    ctx.fillRect(656, 0, 12, 1080);
    ctx.font = `36px "ShortFlow Bold", "ShortFlow Emoji"`;
    const w = ctx.measureText(label).width + 50;
    ctx.fillStyle = "rgba(20,18,36,0.85)";
    ctx.beginPath();
    ctx.roundRect(30, 30, w, 64, 32);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 55, 63);
    ctx.restore();
  });
}

/** 6 AM: Naan asleep on his feet; Amma's four jobs; she leaves; "FREEDOM!"; Machan already at the door. */
function scene1(ctx: Ctx, t: number, h: H, person: P) {
  camera(ctx, t, [{ at: 0, x: 640, y: 806, zoom: 1, move: 0 }, { at: h.end("7") + 1.4, x: 560, y: 790, zoom: 1.1, move: 0.6 }]);
  ammaHall(ctx, t);
  const leave = h.p("7", 0, 1.3);
  const machanHere = h.p("9", 0.4, 0.3);
  frontDoor(ctx, 1150, leave > 0 && leave < 1 ? 1 : machanHere);
  // Amma comes in with her bag, talks, then leaves by the door.
  const arrive = clamp01((h.since("1") + 4) / 1.6);
  if (leave < 1) {
    const x = leave > 0 ? 760 + easeInOut(leave) * 440 : 1000 - easeInOut(arrive) * 240;
    person("Amma", AMMA, x, leave > 0 ? 1 : -1, { arm: h.on("5") && !h.on("7") ? "point" : "hold", holding: h.on("5") && !h.on("7") ? undefined : travelBag, run: arrive < 1 || leave > 0 ? t * 0.4 : undefined });
  }
  const asleep = !h.on("2");
  const free = h.p("7", 1.4, 0.3);
  person("Naan", NAAN, 320, 1, {
    mood: machanHere > 0 ? "laugh" : free > 0 ? "happy" : asleep ? "sleep" : "normal",
    arm: h.on("8") && machanHere === 0 ? "hold" : free > 0 && !h.on("8") ? "up" : "down",
    holding: h.on("8") && machanHere === 0 ? (c) => phone(c, t, 0.8) : undefined,
    jump: free > 0 && !h.on("8") ? Math.abs(Math.sin(t * 8)) * 60 : 0,
  });
  if (asleep) zzz(ctx, 360, 520, t);
  if (machanHere > 0) person("", MACHAN, 1150, -1, { mood: "happy", arm: "hold", holding: chips });
  if (free > 0 && !h.on("8")) for (let i = 0; i < 4; i++) burst(ctx, 200 + i * 120, 400 + (i % 2) * 80, 70, t, h.end("7") + GAP + 1.4 + i * 0.25, ["#FF3B5C", "#FFD400", "#4CC9F0", "#80ED99"][i]);

  // Amma's four jobs, ticking up as she lists them.
  if (h.on("5") && t < h.end("7") + GAP + 1.2) {
    const span = h.end("5") - h.start("5");
    const items = ["🍚 Rice", "👕 Thuni", "🌿 Chedi", "🔥 Gas OFF"];
    onScreen(ctx, h.s, () => {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(190, 60, 1540, 130, 30);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8;
      ctx.stroke();
    });
    const colours = ["#FF9F1C", "#4CC9F0", "#2DC653", "#FF3B5C"];
    // Four equal columns, each word no wider than its column.
    items.forEach((item, i) => h.say(item, 190 + 1540 * ((i + 0.5) / 4), 126, h.start("5") + span * (0.12 + i * 0.24), colours[i], 56, 0, 330));
  }
  if (free > 0 && !h.on("8")) h.say("FREEDOM! 🎉", 960, 170, h.end("7") + GAP + 1.4, "#80ED99", 130);
  if (h.on("9") && machanHere === 0) h.say("📞 Machan", 960, 170, h.start("8"), "#4CC9F0", 70, 0);
  if (machanHere > 0) h.say("Already vaasal-la! 😂", 960, 170, h.end("9") + GAP + 0.6, "#FFD400", 90);
}

/** 8 AM: the cooker filled to the brim; whistles lost to cricket; kanji; oil left on the flame. */
function scene2(ctx: Ctx, t: number, h: H, person: P) {
  const a13 = h.after("13");
  camera(ctx, t, [
    { at: 0, x: 600, y: 806, zoom: 1, move: 0 },
    { at: h.start("13"), x: 430, y: 760, zoom: 1.9, move: 0.4 },
    { at: h.end("13") + GAP + 2.4, x: 820, y: 720, zoom: 1.35, move: 0.5 },
    { at: h.start("14"), x: 600, y: 806, zoom: 1, move: 0.4 },
    { at: h.end("15") + GAP, x: 430, y: 780, zoom: 2.0, move: 0.3 },
    { at: h.start("17"), x: 600, y: 806, zoom: 1, move: 0.4 },
    { at: h.end("19") + GAP, x: 690, y: 800, zoom: 1.8, move: 0.3 },
    { at: h.end("19") + GAP + 1.3, x: 640, y: 806, zoom: 1, move: 0.5 },
  ]);
  kitchen(ctx);
  const lidOn = a13 > 0.8 && !h.on("16") && !(h.after("15") > 0);
  const kadaaiOn = h.after("19") > 0.3;
  stoveTop(ctx, 560, 880, t, [a13 > 0.8 && h.after("15") < 0, kadaaiOn]);
  // Filling the cooker to the brim, then the lid on and the whistles.
  if (lidOn) cooker(ctx, 430, 850, t, a13 > 2.4 ? 1 : Math.max(0, Math.sin((a13 - 0.8) * Math.PI)) * 0.6);
  else {
    const level = h.on("13") ? clamp01((h.since("13") + 0.2) / 2.2) : 0;
    const kanji = h.after("15") > 0.2;
    ctx.save();
    ctx.translate(430, 860);
    ctx.scale(1.15, 1.15);
    pot(ctx, kanji || level > 0.95, kanji ? 1 : 0, t);
    if (!kanji && level > 0) blob(ctx, "#4CC9F0", () => ctx.rect(-76, -10 - level * 86, 152, level * 86), 0);
    if (kanji) for (let i = 0; i < 5; i++) blob(ctx, "#fff", () => ctx.arc(-50 + i * 25, -100 - Math.abs(Math.sin(t * 6 + i)) * 10, 9, 0, Math.PI * 2), 3);
    ctx.restore();
    if (h.on("13") && !(a13 > 0.6)) {
      ctx.save();
      ctx.translate(530, 640);
      jug(ctx, 0.8);
      ctx.restore();
      ctx.strokeStyle = "#4CC9F0";
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(470, 650);
      ctx.quadraticCurveTo(440, 700, 440, 760);
      ctx.stroke();
    }
  }
  kadaai(ctx, 690, 860, t, kadaaiOn ? clamp01(h.after("19") / 8) * 0.7 : 0);
  if (kadaaiOn && h.after("19") < 1.3) burst(ctx, 690, 820, 80, t, h.end("19") + GAP + 0.3, "#FF7B3A");

  const watching = a13 > 2.4 && !h.on("14");
  person("Naan", NAAN, watching ? 720 : 180, watching ? 1 : 1, {
    mood: h.after("15") > 0 && !h.on("17") ? "shocked" : watching ? "happy" : "normal",
    arm: h.after("15") > 0 && !h.on("17") ? "cheeks" : "down",
  });
  const onPhone = watching || h.after("19") > 1.3;
  person("Machan", MACHAN, 940, -1, {
    mood: watching ? "laugh" : h.on("17") && !h.on("18") ? "proud" : "normal",
    arm: onPhone ? "hold" : h.on("19") ? "thumb" : "down",
    holding: onPhone ? (c) => phone(c, t, 0.6) : undefined,
  });
  if (h.on("13") && !(a13 > 0.6)) h.say("FULL-AA! 💧", 960, 170, h.start("13") + 0.4, "#4CC9F0", 110);
  if (a13 > 0.8 && a13 < 2.4) h.say(a13 < 1.8 ? "🔔 ONNU!" : "🔔 RENDU!", 960, 170, h.end("13") + GAP + (a13 < 1.8 ? 0.8 : 1.8), "#FFD400", 120);
  if (watching) {
    const count = 2 + [2.9, 3.6, 4.3, 5.0, 5.7, 6.4, 7.1].filter((x) => a13 >= x).length;
    h.say("SIX! 🏏", 1300, 200, h.end("13") + GAP + 2.6, "#80ED99", 110, 0.06);
    h.say(`🔔 x${count}`, 330, 200, h.end("13") + GAP + 2.4, "#FF3B5C", 120 + Math.sin(t * 20) * 4, -0.06);
  }
  if (h.after("15") > 0.2 && !h.on("17")) h.say("KANJI?! 😱", 960, 170, h.end("15") + GAP + 0.3, "#fff", 120);
}

/** 9 AM: Amma's video call on a split screen; smoke behind Naan; "saambraani"; the kadaai into water. */
function scene3(ctx: Ctx, t: number, h: H, person: P) {
  const out = h.after("27");
  camera(ctx, t, [shotAt(0, 760, 1290, 790, 1.15, 0), ...(out > 0.6 ? [{ at: h.end("27") + GAP + 0.6, x: 690, y: 780, zoom: 1.3, move: 0.4 }] : [])]);
  kitchen(ctx);
  stoveTop(ctx, 560, 880, t, [false, out < 0.6]);
  ctx.save();
  ctx.translate(430, 860);
  pot(ctx, true, 0.6, t);
  ctx.restore();
  kadaai(ctx, 690, 860, t, out > 0.6 ? Math.max(0, 1 - (out - 0.6) / 1.2) : clamp01(0.5 + h.since("20") / 18), true);
  if (out > 0.6 && out < 2.2) {
    ctx.fillStyle = `rgba(255,255,255,${1 - (out - 0.6) / 1.6})`;
    ctx.beginPath();
    ctx.arc(690, 700, 120 + (out - 0.6) * 320, 0, Math.PI * 2);
    ctx.fill();
  }
  const fanning = h.on("22") && !(out > 0.6);
  person("", MACHAN, 960, -1, { mood: "scared", arm: fanning ? "up" : "down", holding: fanning ? (c) => towel(c, "#4CC9F0", t) : undefined, jump: fanning ? Math.abs(Math.sin(t * 9)) * 20 : 0 });
  person("Naan", NAAN, 700, -1, { mood: h.on("26") ? "shocked" : h.on("22") ? "scared" : "happy", arm: "hold", holding: (c) => phone(c, t, 0.7), shiver: h.on("22") ? 0.2 : 0 });
  if (h.on("22")) sweat(ctx, 620, 620, t, h.start("22"));
  const amMood = h.on("26") ? "shocked" : h.on("22") ? "confused" : "happy";
  ammaPanel(ctx, h, t, h.start("20") - 1.3, h.end("27") + GAP + 0.1, "📹 Amma · Chithi veedu", amMood);
  if (h.on("27") && out < 0.2) h.say("📶 …hello? hello?", 1290, 170, h.start("27") + 0.4, "#fff", 70, 0);
  if (out > 0.6) h.say("SHHHHH! 💨", 960, 170, h.end("27") + GAP + 0.6, "#BDE0FE", 120);
}

/** 11 AM: everything in one wash; the white shirt comes out pink; bleach turns it into a map. */
function scene4(ctx: Ctx, t: number, h: H, person: P) {
  const a31 = h.after("31");
  camera(ctx, t, [
    { at: 0, x: 600, y: 806, zoom: 1, move: 0 },
    { at: h.start("29"), x: 600, y: 780, zoom: 1.3, move: 0.4 },
    { at: h.start("30"), x: 600, y: 806, zoom: 1, move: 0.4 },
    { at: h.end("31") + GAP + 0.6, x: 560, y: 920, zoom: 2.0, move: 0.4 },
    { at: h.start("32"), x: 300, y: 700, zoom: 1.6, move: 0.3 },
    { at: h.start("33"), x: 860, y: 700, zoom: 1.6, move: 0.3 },
    { at: h.start("34"), x: 300, y: 700, zoom: 1.6, move: 0.3 },
    { at: h.start("35"), x: 860, y: 700, zoom: 1.6, move: 0.3 },
    { at: h.end("35") + GAP, x: 360, y: 720, zoom: 2.0, move: 0.3 },
  ]);
  room(ctx, "#B8E0D2", "#495057", "rgba(255,255,255,0.12)");
  const spin = a31 > 0.6 && a31 < 3.4 ? 1 : 0;
  washingMachine(ctx, 560, t, spin, a31 > 0.4 ? ["#fff", "#E63946", PINK, "#E63946"] : ["#BDE0FE"]);
  const loaded = a31 > 0.4;
  const pink = h.on("32");
  const map = h.after("35") > 1.2;
  // Into the machine: shirt and towel arcing over.
  if (a31 > 0 && a31 < 0.5) {
    const p = a31 / 0.5;
    ctx.save();
    ctx.translate(260 + 300 * p, 700 - Math.sin(p * Math.PI) * 150 + p * 70);
    ctx.rotate(p * 4);
    shirt(ctx, "#fff");
    ctx.restore();
    ctx.save();
    ctx.translate(860 - 300 * p, 700 - Math.sin(p * Math.PI) * 150 + p * 70);
    ctx.rotate(-p * 4);
    towel(ctx, "#E63946", t);
    ctx.restore();
  }
  person("Naan", NAAN, 260, 1, {
    mood: map ? "sad" : pink ? "shocked" : "normal",
    arm: loaded && !pink ? "down" : "hold",
    holding: loaded && !pink ? undefined : (c) => { c.translate(20, -40); c.scale(1.2, 1.2); shirt(c, pink ? PINK : "#fff", map); },
  });
  const pouring = h.after("35") > 0 && h.after("35") < 1.4;
  person("Machan", MACHAN, 900, -1, {
    mood: h.on("33") && !h.on("34") ? "proud" : spin ? "happy" : h.on("34") && !h.on("35") ? "scared" : "normal",
    arm: h.on("35") && h.after("35") < 1.4 ? "hold" : loaded ? "down" : "hold",
    holding: h.on("35") && h.after("35") < 1.4 ? bleach : loaded ? undefined : (c) => towel(c, "#E63946", t),
  });
  // Bleach dripping onto the shirt.
  if (pouring) {
    ctx.fillStyle = "#E0FBFC";
    for (let i = 0; i < 6; i++) {
      const ph = (t * 2 + i / 6) % 1;
      ctx.beginPath();
      ctx.arc(330 + (i % 3) * 30, 420 + ph * 200, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (spin) h.say("🌀 SPIN!", 960, 170, h.end("31") + GAP + 0.6, "#4CC9F0", 110, 0.05);
  if (a31 > 3.4 && !h.on("32")) h.say("🔔 DING!", 960, 170, h.end("31") + GAP + 3.4, "#FFD400", 120);
  if (pink && !h.on("33")) h.say("PINK?! 😱", 1300, 200, h.start("32") + 0.3, PINK, 120);
  if (map) h.say("WORLD MAP! 🗺️", 960, 170, h.end("35") + GAP + 1.3, "#80ED99", 110);
}

/** 1 PM: Amma on a call about the tulsi; Machan pours hot kanji on it; it wilts. */
function scene5(ctx: Ctx, t: number, h: H, person: P) {
  camera(ctx, t, [shotAt(0, 760, 1290, 806, 1.05, 0), shotAt(h.start("40"), 900, 1290, 840, 1.5, 0.4), shotAt(h.start("41"), 760, 1290, 806, 1.05, 0.4)]);
  ammaHall(ctx, t);
  const pourAt = h.since("40") - 0.4;
  const wilt = clamp01((pourAt - 0.4) / 2.0);
  tulsi(ctx, 900, t, wilt);
  const walkIn = clamp01(h.after("38") / 1.1);
  const machanX = 1500 - easeOut(walkIn) * 380;
  const pouring = pourAt > 0 && pourAt < 1.6;
  person("Machan", MACHAN, machanX, -1, {
    mood: wilt > 0.6 ? "scared" : "proud",
    arm: pouring ? "point" : "hold",
    holding: (c) => { c.translate(0, -20); pot(c, true, 1, t); },
    run: walkIn > 0 && walkIn < 1 ? t * 0.5 : undefined,
  });
  if (pouring) {
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(machanX - 250, FLOOR - 500);
    ctx.quadraticCurveTo(machanX - 280, FLOOR - 430, 920, FLOOR - 380);
    ctx.stroke();
  }
  person("Naan", NAAN, 640, 1, { mood: h.on("41") ? "shocked" : "normal", arm: "hold", holding: (c) => phone(c, t, 0.7) });
  ammaPanel(ctx, h, t, h.start("37") - 1.3, h.end("42") + 1, "📞 Amma · Chithi veedu", h.on("40") ? "confused" : "normal");
  if (wilt > 0.8) h.say("PFFF… 🥀", 1290, 200, pourAt + h.start("40") + 0.4 + 1.6, "#9C6644", 110);
}

/** 4 PM: Amma is coming early; the mess, one picture after another; "Operation clean-up!" */
function scene6(ctx: Ctx, t: number, h: H, person: P) {
  const panelOut = h.end("45") + GAP + 0.1;
  camera(ctx, t, [t < panelOut + 0.2 ? shotAt(0, 760, 1290, 806, 1.05, 0) : { at: 0, x: 640, y: 806, zoom: 1, move: 0 }]);
  ammaHall(ctx, t);
  sofa(ctx, 520, 500);
  const panic = h.on("44");
  person("Naan", NAAN, 640, 1, { mood: panic ? "shocked" : "happy", arm: "hold", holding: (c) => phone(c, t, 0.6), shiver: panic ? 0.3 : 0 });
  person("Machan", MACHAN, 900, -1, { mood: h.on("46") ? "scared" : panic ? "shocked" : "laugh", arm: h.on("47") ? "up" : "hold", holding: h.on("47") ? undefined : chips });
  ammaPanel(ctx, h, t, h.start("43") - 1.5, panelOut, "📞 Amma · Function mudinjiduchu", "happy", (c) => sweetBox(c));
  // The mess, one picture after another, and the clock.
  const a = h.after("45");
  if (a > 0.4 && !h.on("46")) {
    const tiles: Array<[string, (c: Ctx) => void]> = [
      ["Kanji 🍚", (c) => { c.scale(1.4, 1.4); pot(c, true, 0.5, t); }],
      ["Karuppu kadaai", (c) => { c.scale(1.3, 1.3); kadaai(c, 0, 40, t, 0.2, true); }],
      ["Pink shirt 👕", (c) => { c.translate(0, -120); shirt(c, PINK, true); }],
      ["Sethu pona chedi 🥀", (c) => { c.scale(0.6, 0.6); c.translate(0, 110 - FLOOR); tulsi(c, 0, t, 1); }],
    ];
    onScreen(ctx, h.s, () => {
      ctx.fillStyle = "rgba(20,18,36,0.55)";
      ctx.fillRect(0, 0, 1920, 1080);
      tiles.forEach(([label, draw], i) => {
        const p = easeOutBack((a - 0.6 - i * 0.8) / 0.3);
        if (p <= 0) return;
        ctx.save();
        ctx.translate(255 + i * 470, 470);
        ctx.scale(p, p);
        ctx.rotate((i % 2 ? 1 : -1) * 0.04);
        blob(ctx, "#fff", () => ctx.roundRect(-210, -250, 420, 500, 26));
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-195, -235, 390, 380, 18);
        ctx.clip();
        ctx.fillStyle = "#FFF1E6";
        ctx.fillRect(-195, -235, 390, 380);
        ctx.translate(0, 60);
        draw(ctx);
        ctx.restore();
        shout(ctx, label, 0, 200, 1, "#2B2D42", 40, 0, 380);
        ctx.restore();
      });
    });
    h.say("⏰ 4:00", 960, 120, h.end("45") + GAP + 0.4, "#FF3B5C", 90, 0);
  }
  if (h.on("47")) h.say("OPERATION CLEAN-UP! 🧹", 960, 170, h.start("47") + 0.2, "#FFD400", 110);
}

/** 4 to 5 PM: hiding it all, against the clock. */
function scene7(ctx: Ctx, t: number, h: H, person: P) {
  const close = (n: string, x: number): Shot[] => [{ at: h.start(n), x, y: 860, zoom: 1.7, move: 0.3 }, { at: h.end(n) + GAP + 1.0, x: 640, y: 806, zoom: 1, move: 0.3 }];
  camera(ctx, t, [{ at: 0, x: 640, y: 806, zoom: 1, move: 0 }, ...close("49", -100), ...close("51", 220), ...close("53", 1260), ...close("55", 860)]);
  ammaHall(ctx, t);
  oven(ctx, -100, t, 0, 0);
  fridge(ctx, 220, 0);
  beero(ctx, 1260, 0, 0);
  const swapped = h.since("55") > 1.2;
  tulsi(ctx, 860, t, swapped ? 0 : 1, swapped);
  const fly = (n: string, draw: (c: Ctx) => void, fromX: number, toX: number, toY: number) => {
    const p = clamp01((h.since(n) - 0.2) / 0.9);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.translate(fromX + (toX - fromX) * easeInOut(p), FLOOR - 450 + (toY - (FLOOR - 450)) * p - Math.sin(p * Math.PI) * 220);
    ctx.rotate(p * 6);
    draw(ctx);
    ctx.restore();
  };
  fly("49", (c) => kadaai(c, 0, 40, t, 0, true), 500, -100, FLOOR - 400);
  fly("51", (c) => pot(c, true), 500, 220, FLOOR - 300);
  fly("53", (c) => { c.scale(0.7, 0.7); shirt(c, PINK, true); }, 500, 1260, FLOOR - 300);
  if (h.since("55") > 1.0 && h.since("55") < 1.6) burst(ctx, 860, FLOOR - 350, 120, t, h.start("55") + 1.0, "#80ED99");
  const done = h.after("55") > 0.6;
  person("Naan", NAAN, done ? 480 : 480 + Math.sin(t * 3) * 160, !done && Math.cos(t * 3) < 0 ? -1 : 1, { mood: done ? "happy" : "scared", run: done ? undefined : t });
  person("Machan", MACHAN, done ? 760 : 760 - Math.sin(t * 3.4) * 180, !done && Math.cos(t * 3.4) > 0 ? -1 : 1, { mood: done ? "happy" : "scared", run: done ? undefined : t });
  if (done) { sweat(ctx, 390, 620, t, 0); sweat(ctx, 860, 620, t, 0); }
  // The clock racing from 4:00 to 4:58.
  const progress = clamp01(h.since("47") / (h.since("47") - h.after("55") + 2.4));
  const mins = Math.floor(58 * progress);
  onScreen(ctx, h.s, () => {
    ctx.save();
    ctx.translate(1720, 150);
    wallClock(ctx, 0, 0, 4 + mins / 60, 90);
    ctx.restore();
    shout(ctx, `4:${String(mins).padStart(2, "0")}`, 1720, 290, 1, mins > 50 ? "#FF3B5C" : "#FFD400", 70, 0);
  });
}

/** 5 PM: Amma is back. Fridge, tulsi, beero, oven — then the broom, and the chase. */
function scene8(ctx: Ctx, t: number, h: H, person: P) {
  const chase = h.after("66");
  const chasing = chase > 0;
  const walk = (from: number, to: number, p: number) => from + (to - from) * easeInOut(p);
  // Amma's route: in from the right, to the fridge, the tulsi, the beero, then the oven.
  let ammaX = 1750;
  let face: 1 | -1 = -1;
  if (h.since("56") > -1.6) ammaX = walk(1750, 960, clamp01((h.since("56") + 1.6) / 1.4));
  if (h.after("58") > 0) ammaX = walk(960, 640, h.p("58", 0, 0.8));
  if (h.after("61b") > 0) { ammaX = walk(640, 990, h.p("61b", 0, 1.0)); face = 1; }
  if (h.after("62b") > 0) { ammaX = walk(990, 1310, h.p("62b", 0, 0.7)); face = 1; }
  if (h.after("64") > 0) { ammaX = walk(1310, 980, h.p("64", 0.5, 0.9)); face = -1; }
  const fridgeOpen = h.after("58") > 0.8 && h.after("61b") < 0.3 ? 1 : 0;
  const ovenOpen = h.after("64") > 1.6 ? 1 : 0;
  const shirtDrop = h.p("62b", 0.8, 0.5);
  const plantFall = h.p("61b", 1.2, 0.4);
  const boys = { x: 140, y: 720, zoom: 1.5, move: 0.3 };
  const amma = (x: number): Shot => ({ at: 0, x, y: 700, zoom: 1.5, move: 0.3 });
  camera(ctx, t, [
    { at: 0, x: 700, y: 806, zoom: 1, move: 0 },
    { ...boys, at: h.start("57") },
    { ...amma(960), at: h.start("58") },
    { at: h.end("58") + GAP + 0.6, x: 800, y: 820, zoom: 1.5, move: 0.4 },
    { ...boys, at: h.start("60") },
    { ...amma(640), at: h.start("61") },
    { ...boys, at: h.start("61b") },
    { at: h.end("61b") + GAP + 0.8, x: 1220, y: 880, zoom: 1.6, move: 0.4 },
    { ...amma(990), at: h.start("62") },
    { ...boys, at: h.start("62b") },
    { at: h.end("62b") + GAP + 0.6, x: 1400, y: 880, zoom: 1.5, move: 0.4 },
    { ...amma(1310), at: h.start("63") },
    { ...boys, at: h.start("64") },
    { at: h.end("64") + GAP, x: 960, y: 806, zoom: 1, move: 0.4 },
    { at: h.end("64") + GAP + 1.4, x: 1060, y: 820, zoom: 1.7, move: 0.4 },
    { ...amma(980), at: h.start("65"), zoom: 1.6 },
    { ...boys, at: h.start("66") },
    { at: h.end("66") + GAP, x: 640, y: 806, zoom: 0.95, move: 0.3 },
  ], chasing ? Math.max(kick(t, h.end("66") + GAP + 2.0, 0.4), kick(t, h.end("66") + GAP + 5.6, 0.4)) : h.on("65") ? kick(t, h.start("65"), 0.5) * 0.6 : 0);
  ammaHall(ctx, t);
  sofa(ctx, -100, 470);
  fridge(ctx, 760, fridgeOpen, (c) => pot(c, true));
  oven(ctx, 1000, t, ovenOpen, h.after("64") > 0 && !chasing ? clamp01(h.after("64") / 1.2) : ovenOpen ? 0.6 : 0);
  tulsi(ctx, 1220, t, 0, true, plantFall);
  beero(ctx, 1430, shirtDrop > 0 ? 1 : 0, shirtDrop);

  // The boys: on the sofa, then running for their lives (to the left, out of the house).
  const run = (base: number) => (chase < 2.0 ? base + Math.sin(chase * 3) * 60 : base - (chase - 2.0) * 700);
  const naanX = chasing ? run(20) : 20;
  const machanX = chasing ? run(240) : 240;
  const hit = chase > 2.0 && chase < 2.7;
  const nervous = h.on("59") && !chasing;
  person("Naan", NAAN, naanX, chasing ? -1 : 1, { mood: chasing ? "scared" : nervous ? "scared" : "happy", run: chasing ? t : undefined, shiver: nervous ? 0.25 : 0 });
  person("Machan", MACHAN, machanX, chasing ? -1 : 1, {
    mood: hit ? "shocked" : chasing ? "scared" : h.on("60") && !h.on("61") ? "proud" : nervous ? "scared" : "happy",
    run: chasing ? t : undefined,
    jump: hit ? 50 : 0,
  });
  if (nervous) { sweat(ctx, -70, 620, t, h.start("59")); sweat(ctx, 150, 620, t, h.start("59")); }

  // Amma: the sweet box, the spoon, the broom.
  const withBroom = h.after("64") > 2.4 || h.on("65");
  // She chases them to the door, then stays there and throws a slipper after them.
  const ammaChaseX = chasing ? Math.max(machanX + 260, 980 - chase * 520, 120) : ammaX;
  {
    person("Amma", AMMA, ammaChaseX, chasing ? -1 : face, {
      mood: h.on("61") || withBroom ? "shocked" : h.on("59") ? "confused" : "happy",
      arm: chase > 4.8 ? "point" : withBroom ? "up" : h.after("61b") > 0.8 && !h.on("62") ? "point" : h.on("59") && !h.on("62") ? "hold" : h.after("62b") > 0.6 && !h.on("64") ? "hold" : "down",
      holding: withBroom ? broom : h.after("61b") > 0 && !h.on("62") ? (c) => jug(c, h.p("61b", 0.9, 0.3) * 0.9) : h.on("59") && !(h.after("61b") > 0) ? spoon : !h.after("58") || h.after("58") < 0 ? (c) => sweetBox(c) : h.after("62b") > 1.1 && !h.on("64") ? (c) => { c.translate(0, -40); shirt(c, PINK, true); } : undefined,
      run: (chasing && ammaChaseX > 120) || (h.after("58") > 0 && h.after("58") < 0.8) ? t : undefined,
      jump: h.on("65") && !chasing ? Math.abs(Math.sin(t * 6)) * 20 : 0,
    });
  }
  if (hit) burst(ctx, machanX, 620, 140, t, h.end("66") + GAP + 2.0, "#FFD400");
  // The slipper, thrown after them.
  if (chase > 5.0 && chase < 5.7) {
    const p = (chase - 5.0) / 0.7;
    ctx.save();
    ctx.translate(250 - p * 900, 600 - Math.sin(p * Math.PI) * 260);
    ctx.rotate(-p * 12);
    slipper(ctx);
    ctx.restore();
  }
  if (h.on("61") && !h.on("61b")) h.say("KANJI?! 😤", 960, 170, h.start("61") + 0.3, "#fff", 110);
  if (h.after("61b") > 1.4 && !h.on("62b")) h.say("PLASTIC CHEDI?! 🌿", 960, 170, h.end("61b") + GAP + 1.5, "#80ED99", 110);
  if (h.after("62b") > 1.1 && !h.on("64")) h.say("PINK SHIRT?! 👕", 960, 170, h.end("62b") + GAP + 1.2, PINK, 110);
  if (h.after("64") > 1.6 && !h.on("65")) h.say("KADAAI?! 🔥", 960, 170, h.end("64") + GAP + 1.7, "#FF7B3A", 110);
  if (h.on("65") && !chasing) h.say("INGA VAANGA! 🧹", 960, 170, h.start("65") + 0.2, "#FF3B5C", 130);
  if (hit) h.say("PATAAK! 💥", 960, 200, h.end("66") + GAP + 2.0, "#FF3B5C", 130);
  if (chase > 5.6) h.say("TOK! 🩴", 300, 300, h.end("66") + GAP + 5.6, "#FF7B3A", 130);
}

/** After: out of breath on the street; Amma alone with the sweets. */
function scene9(ctx: Ctx, t: number, h: H, person: P) {
  if (!h.on("69")) {
    camera(ctx, t, [{ at: 0, x: 560, y: 790, zoom: 1.15, move: 0 }]);
    street(ctx, t);
    person("Naan", NAAN, 380, 1, { mood: "sad", arm: "cheeks" });
    person("Machan", MACHAN, 740, -1, { mood: "sad", arm: "scratch" });
    blob(ctx, "#E5989B", () => ctx.arc(760, FLOOR - 680, 30, 0, Math.PI * 2));
    sweat(ctx, 290, 620, t, 0);
    sweat(ctx, 830, 620, t, 0);
    return;
  }
  camera(ctx, t, [{ at: 0, x: 560, y: 790, zoom: 1.2, move: 0 }]);
  ammaHall(ctx, t);
  sofa(ctx, 300, 520);
  person("Amma", AMMA, 560, 1, { mood: h.talk("Amma") > 0.05 ? "happy" : "laugh", arm: "hold", holding: (c) => sweetBox(c, true) });
  const end = h.end("69") + GAP;
  h.say("Ungalukkum ipdi nadandhirukkaa? 👇", 960, 150, end + 0.6, "#FFD400", 80, 0);
  h.say("SUBSCRIBE 🔔", 960, 280, end + 1.2, "#FF3B5C", 100, -0.03);
}
