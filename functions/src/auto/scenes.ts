import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import {
  FLOOR, INK, camera, charger, drawPerson, dust, easeOut, flies, kick, lineAt, mark, mess, phone, pulseRing, room,
  sack, stink, sweat, switchboard, talkOf, thought, burst, type Look, type Scene, type SceneState,
} from "./cartoon";

/**
 * The illustrated scenes, one per script, keyed by the script's id. Each acts
 * out its dialogue line by line, timed to when the lines are heard.
 */

type Ctx = SKRSContext2D;

const NAAN: Look = { skin: "#B97A50", shirt: "#3A86FF", pants: "#3B3B4F", hair: "short" };
const MACHAN: Look = { skin: "#C98B5E", shirt: "#FF7B3A", pants: "#2F3E66", hair: "messy" };
const AMMA: Look = { skin: "#C68A60", shirt: "#E63946", pants: "#000", hair: "bun", saree: "#2A9D8F", bindi: true };
const THIEF: Look = { skin: "#A87148", shirt: "#2B2D42", pants: "#2B2D42", hair: "beanie", stripes: "#EDEDED", mask: true, mustache: true };

/** F1 · Machan's phone won't charge: the switch is on, but the phone was never connected. */
function charge(ctx: Ctx, s: SceneState) {
  const { t, spans } = s;
  const [l0, l1, l2, l3, p] = spans;
  const line = lineAt(s);
  const pressAt = l2.start + 0.45;
  const pressing = t >= l2.start + 0.15 && t < l2.start + 0.95;
  const reveal = p.start + (p.end - p.start) * 0.45;

  ctx.save();
  camera(ctx, t, [
    { at: l0.start - 0.2, x: 390, y: 720, zoom: 1.2 },
    { at: l1.start, x: 560, y: 640, zoom: 1.3 },
    { at: l2.start, x: 480, y: 620, zoom: 1.35 },
    { at: l3.start, x: 540, y: 806, zoom: 1 },
    { at: p.start, x: 520, y: 880, zoom: 1.1, move: 0.8 },
  ], kick(t, p.end + 0.05, 0.4) * 0.6);

  room(ctx, "#4CC9F0", "#2B2D42", "rgba(255,255,255,0.08)");
  // A window and a poster, so the wall isn't bare.
  ctx.fillStyle = "#BDE0FE";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.fillRect(760, 180, 230, 260);
  ctx.strokeRect(760, 180, 230, 260);
  ctx.beginPath();
  ctx.moveTo(875, 180);
  ctx.lineTo(875, 440);
  ctx.moveTo(760, 310);
  ctx.lineTo(990, 310);
  ctx.stroke();
  ctx.fillStyle = "#FFD166";
  ctx.fillRect(90, 220, 170, 220);
  ctx.strokeRect(90, 220, 170, 220);

  switchboard(ctx, 540, 520, t >= pressAt ? 1 : 0);
  burst(ctx, 595, 520, 70, t, pressAt);
  charger(ctx, [485, 528], [600, FLOOR - 6], t);

  const machanMood = t >= p.start ? "happy" : t >= l2.start + 0.95 ? "proud" : line <= 0 ? "sad" : "normal";
  drawPerson(ctx, 270, FLOOR, MACHAN, {
    t,
    talk: talkOf(s, "Machan"),
    mood: machanMood,
    face: 1,
    arm: pressing ? "up" : "hold",
    holding: (c) => phone(c, t, 0.02, line <= 0 && t < l1.start ? Math.sin(t * 24) * 0.14 : 0),
  });

  const naanMood = t >= p.end + 0.05 ? "sad" : t >= p.start ? "shocked" : line === 3 ? "confused" : "normal";
  drawPerson(ctx, 830, FLOOR, NAAN, {
    t,
    talk: talkOf(s, "Naan"),
    mood: naanMood,
    face: -1,
    arm: t >= p.end + 0.05 ? "facepalm" : t >= p.start ? "down" : line === 1 ? "point" : line === 3 ? "scratch" : "down",
  });

  if (line === 3) {
    mark(ctx, "?", 830, 470, t, l3.start + 0.1);
    mark(ctx, "?", 930, 520, t, l3.start + 0.35, "#FFD400", 80);
  }
  // The joke: the cable's end lies on the floor and the phone is in his hand.
  pulseRing(ctx, 600, FLOOR - 14, 80, t, reveal);
  pulseRing(ctx, 420, 790, 115, t, reveal + 0.15);
  if (t >= p.end + 0.05) sweat(ctx, 745, 640, t, p.end + 0.05);
  ctx.restore();
}

/** A28 · "Did a thief come?" — he came, saw the room, and ran. */
function thirudan(ctx: Ctx, s: SceneState) {
  const { t, spans } = s;
  const [l0, l1, l2, l3, p] = spans;
  const line = lineAt(s);

  if (t >= p.start) return thiefRuns(ctx, s);

  ctx.save();
  camera(ctx, t, [
    { at: l0.start - 0.2, x: 420, y: 760, zoom: 1.15 },
    { at: l1.start, x: 700, y: 640, zoom: 1.15 },
    { at: l2.start, x: 330, y: 740, zoom: 1.3 },
    { at: l3.start, x: 790, y: 700, zoom: 1.35 },
  ], kick(t, l3.start + 0.05, 0.3) * 0.5);

  room(ctx, "#FFD6A5", "#6D4C41", "rgba(255,255,255,0.18)");
  // A photo frame and a wall clock.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.fillStyle = "#FFF1E6";
  ctx.fillRect(780, 230, 170, 140);
  ctx.strokeRect(780, 230, 170, 140);
  ctx.beginPath();
  ctx.arc(150, 330, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(150, 330);
  ctx.lineTo(150 + Math.cos(t * 0.8) * 46, 330 + Math.sin(t * 0.8) * 46);
  ctx.moveTo(150, 330);
  ctx.lineTo(150, 290);
  ctx.stroke();

  // Naan's room: the door is open and the mess is spilling out.
  ctx.fillStyle = "#3A2E39";
  ctx.fillRect(410, 650, 260, FLOOR - 650);
  ctx.strokeStyle = "#8D5B3B";
  ctx.lineWidth = 24;
  ctx.strokeRect(410, 650, 260, FLOOR - 650);
  ctx.fillStyle = "#A9744F";
  ctx.beginPath();
  ctx.moveTo(410, 650);
  ctx.lineTo(330, 680);
  ctx.lineTo(330, FLOOR - 20);
  ctx.lineTo(410, FLOOR);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = INK;
  ctx.stroke();
  mess(ctx, 560, FLOOR + 14, 0.75, t);
  stink(ctx, 540, 900, t);
  flies(ctx, 540, 870, t, 3);

  // His bag, just back from the village.
  ctx.fillStyle = "#6A4C93";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(40, FLOOR - 200, 140, 200, 18);
  ctx.fill();
  ctx.stroke();

  drawPerson(ctx, 230, FLOOR, NAAN, {
    t,
    talk: talkOf(s, "Naan"),
    mood: line >= 2 ? "proud" : "normal",
    face: 1,
    arm: line <= 0 ? "point" : "down",
  });

  const scared = line === 1 || line === 2;
  drawPerson(ctx, 850, FLOOR, AMMA, {
    t,
    talk: talkOf(s, "Amma"),
    mood: line === 3 ? "shocked" : scared ? "scared" : "normal",
    face: -1,
    arm: line === 1 ? "cheeks" : line === 3 ? "up" : "down",
    shiver: line === 1 ? 0.35 : 0,
    jump: line === 3 ? 30 * (1 - easeOut((t - l3.start) / 0.5)) : 0,
  });

  // What Amma imagined: a thief tiptoeing in with his sack.
  thought(ctx, 690, 300, 400, 280, t, l1.start + 0.15, l2.start, [800, 620], (c) => {
    c.fillStyle = "#E7ECEF";
    c.fillRect(-250, -200, 500, 400);
    const x = -90 + ((t - l1.start) * 70) % 180;
    drawPerson(c, x, 115, THIEF, { t, face: 1, scale: 0.36, arm: "hold", holding: sack, run: t * 0.25 });
  });
  if (line === 3) mark(ctx, "!", 860, 400, t, l3.start + 0.05, "#FF3B5C", 150);
  ctx.restore();
}

/** The punch line, acted out in Naan's room: the thief walks in, sees it, and runs. */
function thiefRuns(ctx: Ctx, s: SceneState) {
  const { t, spans } = s;
  const p = spans[spans.length - 1];
  const len = p.end - p.start;
  const at = t - p.start;
  const stopAt = len * 0.28;
  const runAt = len * 0.62;
  const thiefX = at < stopAt ? -160 + (at / stopAt) * 520 : at < runAt ? 360 : 360 - (at - runAt) * 1000;

  ctx.save();
  camera(ctx, t, [
    { at: p.start, x: 540, y: 806, zoom: 1.05, move: 0 },
    { at: p.start + stopAt, x: 420, y: 760, zoom: 1.25, move: 0.3 },
    { at: p.start + runAt, x: 400, y: 806, zoom: 1.05, move: 0.4 },
  ], kick(t, p.start + stopAt, 0.3) * 0.6);

  room(ctx, "#9A8C98", "#3D405B", "rgba(0,0,0,0.06)");
  // The bed, unmade.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.fillStyle = "#6D597A";
  ctx.beginPath();
  ctx.roundRect(700, FLOOR - 230, 420, 230, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#F2CC8F";
  ctx.beginPath();
  ctx.moveTo(700, FLOOR - 230);
  ctx.quadraticCurveTo(820, FLOOR - 320, 900, FLOOR - 220);
  ctx.quadraticCurveTo(980, FLOOR - 300, 1120, FLOOR - 240);
  ctx.lineTo(1120, FLOOR - 120);
  ctx.quadraticCurveTo(900, FLOOR - 60, 700, FLOOR - 140);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  mess(ctx, 640, FLOOR + 16, 1.25, t);
  mess(ctx, 980, FLOOR - 200, 0.6, t + 1);
  stink(ctx, 600, 960, t, 4);
  stink(ctx, 960, 860, t + 0.5, 3);
  flies(ctx, 620, 900, t, 5);
  flies(ctx, 940, 820, t + 3, 3);

  const shocked = at >= stopAt;
  const running = at >= runAt;
  if (at >= stopAt + 0.15) {
    // He drops his sack.
    ctx.save();
    ctx.translate(430, FLOOR - 160 + Math.min(1, (at - stopAt - 0.15) / 0.2) * 0);
    ctx.rotate(0.5);
    sack(ctx);
    ctx.restore();
  }
  drawPerson(ctx, thiefX, FLOOR, THIEF, {
    t,
    mood: running ? "scared" : shocked ? "shocked" : "normal",
    face: running ? -1 : 1,
    arm: shocked && !running ? "cheeks" : "hold",
    holding: shocked ? undefined : sack,
    run: running ? at - runAt : at < stopAt ? at * 0.3 : undefined,
    shiver: shocked && !running ? 1 : 0,
    jump: shocked && !running ? 40 * (1 - easeOut((at - stopAt) / 0.35)) : 0,
  });
  if (shocked && !running) mark(ctx, "!!", thiefX + 20, 420, t, p.start + stopAt, "#FF3B5C", 140);
  if (shocked && !running) sweat(ctx, thiefX - 120, 620, t, p.start + stopAt);
  if (running) for (let k = 0; k < 6; k++) dust(ctx, thiefX + 120 + k * 150, FLOOR, t, p.start + runAt + k * 0.09);
  ctx.restore();

  // A white flash on the cut into the room.
  const flash = kick(t, p.start, 0.25);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export const SCENES: Record<string, Scene> = {
  "F1-charge": charge,
  "A28-thirudan": thirudan,
};
