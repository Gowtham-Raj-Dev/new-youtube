import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import { FLOOR, blob, burst, camera, circle, clamp01, drawPerson, easeOut, easeOutBack, kick, phone, sweat, talkOf, type Look, type SceneState } from "./cartoon";
import { shout, street } from "./props";
import { MACHAN, NAAN } from "./scenes-day1";

/** Scenes acted out over real comedy audio clips (not our own voices). */

type Ctx = SKRSContext2D;

const FRIEND: Look = { skin: "#A86B45", shirt: "#2DC653", pants: "#3B3B4F", hair: "messy", hairColor: "#3A2618" };

/** A yellow star, for the ones circling a dizzy head. */
function star(ctx: Ctx, x: number, y: number, r: number) {
  blob(ctx, "#FFD400", () => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }, 6);
}

/** Two streams of tears arcing out from the eyes of someone facing right at `x`. */
function tears(ctx: Ctx, x: number, t: number) {
  ctx.save();
  ctx.fillStyle = "#4CC9F0";
  for (const [ex, dir] of [[x - 24, -1], [x + 60, 1]] as const) {
    for (let i = 0; i < 9; i++) {
      const ph = (t * 1.6 + i / 9) % 1;
      const dx = dir * ph * 170;
      const dy = -40 * Math.sin(ph * Math.PI) + ph * ph * 260;
      ctx.globalAlpha = 1 - ph * 0.6;
      ctx.beginPath();
      circle(ctx, ex + dx, FLOOR - 540 + dy, 13 - ph * 5);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A cricket bat, held by its handle. */
function bat(ctx: Ctx) {
  ctx.save();
  ctx.rotate(-0.5);
  blob(ctx, "#8D5B3B", () => ctx.roundRect(-8, -70, 16, 80, 6), 6);
  blob(ctx, "#E9C46A", () => ctx.roundRect(-22, -250, 44, 190, 12));
  ctx.restore();
}

/**
 * "Yenda dei, enakunne varuveengalaada? … patta idathulaye vandhu pattu panreenga?"
 * Machan, his toe already bandaged, gets hit on that same toe three times:
 * a cricket ball, a friend's foot, a falling phone.
 */
export function pattaIdathulaye(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, l1, l2, p] = s.spans;
  const hit1 = l0.start + 0.02;
  const hit2 = l2.start + (l2.end - l2.start) * 0.62;
  const hit3 = p.start + (p.end - p.start) * 0.45;
  const cryFrom = p.end - 0.3;
  const shake = Math.max(kick(t, hit1, 0.4), kick(t, hit2, 0.4), kick(t, hit3, 0.5));

  // The toe: swelling and throbbing more with every hit.
  const hits = [hit1, hit2, hit3].filter((h) => t >= h).length;
  const throb = 1 + 0.08 * hits + (hits ? Math.max(0, Math.sin(t * 9)) * 0.06 * hits : 0);
  const toeX = 480;
  const toeY = FLOOR - 14;

  ctx.save();
  camera(ctx, t, [
    { at: hit1 - 0.05, x: 520, y: 840, zoom: 1.12, move: 0.2 },
    { at: l1.start, x: 430, y: 700, zoom: 1.3, move: 0.4 },
    { at: l2.start, x: 600, y: 780, zoom: 1.05, move: 0.4 },
    { at: hit2 - 0.1, x: 520, y: 900, zoom: 1.2, move: 0.2 },
    { at: p.start - 0.1, x: toeX, y: 1185, zoom: 2.1, move: 0.5 },
    { at: cryFrom, x: 440, y: 720, zoom: 1.3, move: 0.4 },
  ], shake * 0.9);
  street(ctx, t);

  // The friends, laughing; one walks over and treads on the toe.
  const walkIn = clamp01((t - (hit2 - 0.9)) / 0.8);
  const walkOut = clamp01((t - (hit2 + 0.5)) / 0.8);
  const friendX = 870 - easeOut(walkIn) * 330 + easeOut(walkOut) * 330;
  drawPerson(ctx, 1010, FLOOR, FRIEND, { t, mood: t > hit1 + 0.2 ? "laugh" : "happy", face: -1, arm: "up" });

  const jump = (h: number) => (t >= h ? Math.max(0, Math.sin(clamp01((t - h) / 0.45) * Math.PI)) * 70 : 0);
  const justHit = [hit1, hit2, hit3].some((h) => t >= h && t < h + 0.6);
  const crying = t >= cryFrom;
  drawPerson(ctx, 420, FLOOR, MACHAN, {
    t,
    talk: talkOf(s, "Machan"),
    mood: t < hit1 ? "happy" : justHit ? "shocked" : "sad",
    face: 1,
    arm: crying ? "cheeks" : justHit ? "up" : t >= l2.start || (t >= l0.start + 0.9 && t < l1.start) ? "point" : "down",
    jump: Math.max(jump(hit1), jump(hit2), jump(hit3)),
    shiver: t >= l2.start && !justHit ? 0.25 : 0,
  });
  // The bandage on the toe, red where it hurts.
  ctx.save();
  ctx.translate(toeX, toeY - Math.max(jump(hit1), jump(hit2), jump(hit3)));
  ctx.scale(throb, throb);
  blob(ctx, "#fff", () => ctx.roundRect(-38, -20, 76, 38, 16), 6);
  blob(ctx, `rgba(230,57,70,${0.5 + 0.12 * hits})`, () => circle(ctx, 18, -2, 9 + hits * 2), 0);
  ctx.restore();

  drawPerson(ctx, friendX, FLOOR, NAAN, {
    t,
    mood: t > hit1 + 0.2 ? "laugh" : "happy",
    face: walkOut > 0 && walkOut < 1 ? 1 : -1,
    arm: "hold",
    holding: bat,
    run: (walkIn > 0 && walkIn < 1) || (walkOut > 0 && walkOut < 1) ? t * 0.5 : undefined,
    jump: t >= hit2 - 0.15 && t < hit2 ? 20 : 0,
  });

  // The cricket ball, flying in from the right to land on the toe.
  const ballP = (t - (hit1 - 0.4)) / 0.4;
  if (ballP > 0 && ballP < 1.8) {
    const p1 = Math.min(1, ballP);
    let bx = 1250 + (toeX + 10 - 1250) * p1;
    let by = 650 + (toeY - 20 - 650) * p1 - Math.sin(p1 * Math.PI) * 180;
    if (ballP > 1) {
      bx += (ballP - 1) * 500;
      by -= Math.sin((ballP - 1) * Math.PI) * 150;
    }
    blob(ctx, "#D62828", () => circle(ctx, bx, by, 22), 6);
  }

  // The phone, dropping onto the toe.
  const dropP = (t - (hit3 - 0.35)) / 0.35;
  if (dropP > 0) {
    const dp = Math.min(1, dropP);
    ctx.save();
    ctx.translate(toeX + 6, toeY - 520 + 470 * dp * dp + (dropP > 1 ? 0 : 0));
    ctx.rotate(dp * 2.2 + (dropP > 1 ? 0.3 : 0));
    ctx.scale(0.7, 0.7);
    phone(ctx, t, 0.5);
    ctx.restore();
  }

  burst(ctx, toeX, toeY - 10, 90, t, hit1);
  burst(ctx, toeX, toeY - 10, 90, t, hit2, "#FF3B5C");
  burst(ctx, toeX, toeY - 10, 70, t, hit3, "#FF3B5C");
  if (t >= hit1 && t < hit1 + 1.2) shout(ctx, "THUD!", toeX + 150, toeY - 170, easeOutBack((t - hit1) / 0.25), "#FFD400", 80, -0.12);
  if (t >= hit2 && t < hit2 + 1.1) shout(ctx, "AAAH!", 420, 540, easeOutBack((t - hit2) / 0.25), "#FF3B5C", 90, 0.08);
  // Dizzy stars after the first hit.
  if (t >= l1.start - 0.2 && t < l2.start + 0.4) {
    for (let i = 0; i < 4; i++) {
      const a = t * 4 + (i * Math.PI) / 2;
      star(ctx, 436 + Math.cos(a) * 130, FLOOR - 700 + Math.sin(a) * 30, 22);
    }
  }
  if (t >= l2.start && !justHit && !crying) sweat(ctx, 330, 640, t, l2.start);
  if (crying) tears(ctx, 420, t);
  ctx.restore();

  // The punch, over everything: "PATTA IDATHULAYE!"
  if (t >= hit3) shout(ctx, "PATTA IDATHULAYE!", W / 2, 400, easeOutBack((t - hit3) / 0.3), "#FFD400", 96, -0.05);
  const flash = kick(t, hit3, 0.18);
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * 0.7})`;
    ctx.fillRect(0, 0, W, H);
  }
}
