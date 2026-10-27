import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import { FLOOR, INK, blob, camera, circle, clamp01, easeOutBack, ellipse, kick, lineAt, mark, talkOf, type SceneState } from "./cartoon";
import { shout, zzz } from "./props";

/**
 * A second, "thin" cartoon style for the Shorts: big round heads, heavy
 * eyelids, stick limbs, black mitten hands and big shoes on a pale, muted
 * world — deadpan faces carry the joke. Our own characters, not anyone else's.
 */

type Ctx = SKRSContext2D;
type Pt = [number, number];

export interface ThinLook {
  skin: string;
  /** The eyelids' tint. */
  lid: string;
  dress: string;
  legs: string;
  shoes: string;
  hair: string;
  /** "pony" a ponytail, "bun" a bun, "short" short hair, "bob" a bob to the jaw, "pigtails" two bunches. */
  style: "pony" | "bun" | "short" | "bob" | "pigtails";
  lashes?: boolean;
  glasses?: boolean;
  freckles?: boolean;
}

export type ThinMood = "normal" | "happy" | "sad" | "shocked" | "sleep" | "proud" | "deadpan";
export type ThinArm = "down" | "hold" | "point" | "up" | "facepalm" | "clasp";

export interface ThinPose {
  t: number;
  talk?: number;
  mood?: ThinMood;
  face?: 1 | -1;
  arm?: ThinArm;
  jump?: number;
  scale?: number;
  /** Leaning forward from the feet, in radians. */
  lean?: number;
  holding?: (ctx: Ctx) => void;
}

const LINE = 8;

function stick(ctx: Ctx, pts: Pt[], color: string, width: number) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
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

function armPose(arm: ThinArm, t: number, front: boolean): [Pt, Pt] {
  const sway = Math.sin(t * 2) * 4;
  // Hanging just outside the dress, so both hands always show.
  const hanging: [Pt, Pt] = [[-82, -480], [-112 - sway, -370]];
  switch (arm) {
    case "hold": return front ? [[95, -470], [150, -555]] : [[-20, -470], [70, -545]];
    case "point": return front ? [[120, -590], [225, -640]] : hanging;
    case "up": return front ? [[95, -720], [115, -860]] : hanging;
    case "facepalm": return front ? [[115, -560], [70, -770]] : hanging;
    case "clasp": return front ? [[95, -500], [40, -600]] : [[-10, -500], [30, -600]];
    default: return front ? [[82, -480], [112 + sway, -370]] : hanging;
  }
}

/** A thin-style person standing at `x` with their feet on `y`. */
export function drawThin(ctx: Ctx, x: number, y: number, look: ThinLook, pose: ThinPose) {
  const { t, talk = 0, mood = "normal", face = 1, arm = "down" } = pose;
  const scale = pose.scale ?? 1;
  const bob = talk > 0.05 ? -talk * 6 : Math.sin(t * 2.2 + x) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ellipse(ctx, 0, 6, 120, 18);
  ctx.fill();
  ctx.translate(0, -(pose.jump ?? 0));
  ctx.rotate((pose.lean ?? 0) * face);
  ctx.scale(face, 1);

  // Stick legs and big shoes.
  for (const side of [-1, 1]) {
    stick(ctx, [[side * 26, -300], [side * 26, -40]], look.legs, 20);
    blob(ctx, look.shoes, () => ellipse(ctx, side * 26 + 26, -24, 58, 28), LINE);
  }
  ctx.translate(0, bob);

  // A long, plain dress.
  blob(ctx, look.dress, () => {
    ctx.moveTo(-58, -630);
    ctx.lineTo(58, -630);
    ctx.lineTo(108, -290);
    ctx.lineTo(-108, -290);
    ctx.closePath();
  }, LINE);
  stick(ctx, [[0, -625], [0, -680]], look.skin, 26);

  // The back arm over the dress too, so it isn't lost behind it.
  const [backE, backH] = armPose(arm, t, false);
  stick(ctx, [[-44, -605], backE, backH], look.skin, 16);
  blob(ctx, INK, () => ellipse(ctx, backH[0], backH[1], 22, 26), 0);

  drawThinHead(ctx, look, mood, talk, t);

  const [frontE, frontH] = armPose(arm, t, true);
  stick(ctx, [[44, -605], frontE, frontH], look.skin, 16);
  blob(ctx, INK, () => ellipse(ctx, frontH[0], frontH[1], 22, 26), 0);
  if (pose.holding) {
    ctx.save();
    ctx.translate(frontH[0], frontH[1]);
    pose.holding(ctx);
    ctx.restore();
  }
  ctx.restore();
}

function drawThinHead(ctx: Ctx, look: ThinLook, mood: ThinMood, talk: number, t: number) {
  const hx = 10;
  const hy = -830;
  if (look.style === "pony") {
    blob(ctx, look.hair, () => {
      ctx.moveTo(-90, hy - 110);
      ctx.quadraticCurveTo(-230, hy - 60 + Math.sin(t * 3) * 6, -190, hy + 190);
      ctx.quadraticCurveTo(-150, hy + 60, -120, hy - 40);
      ctx.closePath();
    }, LINE);
  }
  if (look.style === "bun") blob(ctx, look.hair, () => circle(ctx, hx - 60, hy - 150, 60), LINE);
  if (look.style === "bob") blob(ctx, look.hair, () => ctx.roundRect(hx - 178, hy - 130, 356, 230, [150, 150, 40, 40]), LINE);
  if (look.style === "pigtails") {
    for (const side of [-1, 1]) {
      const swing = Math.sin(t * 4 + side) * 0.08;
      ctx.save();
      ctx.translate(hx + side * 150, hy - 40);
      ctx.rotate(side * (0.5 + swing));
      blob(ctx, look.hair, () => ellipse(ctx, 0, 70, 52, 95), LINE);
      ctx.restore();
      blob(ctx, "#F28482", () => circle(ctx, hx + side * 148, hy - 40, 18), 6);
    }
  }
  blob(ctx, look.skin, () => circle(ctx, hx - 128, hy + 20, 30), LINE);
  blob(ctx, look.skin, () => circle(ctx, hx, hy, 150), LINE);
  // Hair over the top of the head.
  blob(ctx, look.hair, () => {
    ctx.arc(hx, hy, 154, Math.PI * 1.0, Math.PI * 1.85);
    ctx.quadraticCurveTo(hx + 20, hy - 90, hx - 60, hy - 70);
    ctx.quadraticCurveTo(hx - 120, hy - 50, hx - 154, hy);
    ctx.closePath();
  }, LINE);

  // The big eyes and their heavy lids.
  const fx = hx + 30;
  const lid = mood === "sleep" ? 1 : mood === "shocked" ? 0.08 : mood === "happy" ? 0.35 : mood === "deadpan" ? 0.6 : mood === "proud" ? 0.55 : 0.42;
  const blink = mood !== "sleep" && mood !== "shocked" && (t * 0.27) % 1 < 0.04;
  for (const [i, ex] of [fx - 52, fx + 56].entries()) {
    const ey = hy - 10;
    blob(ctx, "#fff", () => ellipse(ctx, ex, ey, 46, 58), 0);
    const look2 = mood === "shocked" ? 0 : 10;
    blob(ctx, INK, () => circle(ctx, ex + look2, ey + 12, mood === "shocked" ? 7 : 10), 0);
    ctx.save();
    ctx.beginPath();
    ellipse(ctx, ex, ey, 46, 58);
    ctx.clip();
    const tilt = mood === "sad" ? (i ? 14 : -14) : 0;
    const lidY = ey - 58 + 116 * (blink ? 1 : lid);
    ctx.fillStyle = look.lid;
    ctx.beginPath();
    ctx.moveTo(ex - 60, ey - 70);
    ctx.lineTo(ex + 60, ey - 70);
    ctx.lineTo(ex + 60, lidY + tilt);
    ctx.lineTo(ex - 60, lidY - tilt);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(ex - 60, lidY - tilt);
    ctx.lineTo(ex + 60, lidY + tilt);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ellipse(ctx, ex, ey, 46, 58);
    ctx.stroke();
    if (look.lashes) {
      ctx.lineWidth = 5;
      const side = i ? 1 : -1;
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + side * (0.7 + k * 0.25);
        ctx.beginPath();
        ctx.moveTo(ex + Math.cos(a) * 46, ey + Math.sin(a) * 58);
        ctx.lineTo(ex + Math.cos(a) * 64, ey + Math.sin(a) * 74);
        ctx.stroke();
      }
    }
    if (mood === "sad") {
      const drop = ((t * 0.9 + i * 0.4) % 1) * 90;
      blob(ctx, "#8FD8FF", () => ellipse(ctx, ex + (i ? 30 : -30), ey + 60 + drop, 9, 14), 4);
    }
  }
  if (look.glasses) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    for (const ex of [fx - 52, fx + 56]) {
      ctx.beginPath();
      circle(ctx, ex, hy - 10, 66);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(fx - 52 + 66, hy - 14);
    ctx.lineTo(fx + 56 - 66, hy - 14);
    ctx.moveTo(fx - 52 - 66, hy - 14);
    ctx.lineTo(hx - 140, hy - 24);
    ctx.stroke();
  }
  if (look.freckles) {
    ctx.fillStyle = "rgba(160,90,60,0.7)";
    for (const [dx, dy] of [[-70, 70], [-52, 82], [-86, 86], [96, 70], [114, 82], [80, 86]]) {
      ctx.beginPath();
      circle(ctx, fx + dx, hy + dy, 5);
      ctx.fill();
    }
  }
  // Brows.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  for (const [i, ex] of [fx - 52, fx + 56].entries()) {
    const lift = mood === "shocked" ? 26 : 0;
    const tilt = mood === "sad" ? (i ? -12 : 12) : mood === "deadpan" ? 0 : 0;
    ctx.beginPath();
    ctx.moveTo(ex - 26, hy - 90 - lift + tilt);
    ctx.lineTo(ex + 26, hy - 90 - lift - tilt);
    ctx.stroke();
  }
  // Nose.
  ctx.beginPath();
  ctx.arc(fx + 10, hy + 62, 10, -Math.PI * 0.3, Math.PI * 0.6);
  ctx.stroke();
  // Mouth.
  const mx = fx + 8;
  const my = hy + 100;
  if (talk > 0.06) {
    const open = 10 + 30 * talk;
    blob(ctx, "#5C1424", () => ellipse(ctx, mx, my, 20 + 6 * talk, open / 2), 6);
  } else if (mood === "shocked") {
    blob(ctx, "#5C1424", () => ellipse(ctx, mx, my + 4, 14, 22), 6);
  } else {
    ctx.lineWidth = 7;
    ctx.beginPath();
    if (mood === "happy" || mood === "proud") ctx.arc(mx, my - 18, 26, Math.PI * 0.2, Math.PI * 0.8);
    else if (mood === "sad") ctx.arc(mx, my + 20, 20, Math.PI * 1.2, Math.PI * 1.8);
    else {
      ctx.moveTo(mx - 18, my);
      ctx.lineTo(mx + 18, my);
    }
    ctx.stroke();
  }
}

// ─── Sample: "Favourite student" ──────────────────────────────────────────────

export const MEENA: ThinLook = { skin: "#E8C9A8", lid: "#E9C46A", dress: "#A3B18A", legs: "#E8C9A8", shoes: "#3D405B", hair: "#6D597A", style: "pony", lashes: true };
export const MOM: ThinLook = { skin: "#D9B08C", lid: "#C9A27E", dress: "#B5838D", legs: "#D9B08C", shoes: "#3D405B", hair: "#3D2C2E", style: "bun", lashes: true };

function thin(ctx: Ctx, s: SceneState, name: string, look: ThinLook, x: number, face: 1 | -1, pose: Partial<ThinPose> = {}) {
  drawThin(ctx, x, FLOOR, look, { t: s.t, talk: talkOf(s, name), face, ...pose });
}

/** A pale, plain room: the style keeps the background quiet. */
export function paleRoom(ctx: Ctx, wall = "#ECEAE4") {
  ctx.fillStyle = wall;
  ctx.fillRect(-800, -800, W + 1600, H + 1600);
  ctx.fillStyle = "#D8D4CA";
  ctx.fillRect(-800, FLOOR, W + 1600, H);
  ctx.strokeStyle = "rgba(30,27,46,0.25)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-800, FLOOR);
  ctx.lineTo(W + 800, FLOOR);
  ctx.stroke();
}

export function classroom(ctx: Ctx) {
  paleRoom(ctx);
  // Small, between the two people, so heads and the words above them stay clear.
  blob(ctx, "#52796F", () => ctx.roundRect(440, 760, 200, 190, 12), LINE);
  ctx.font = `40px "ShortFlow Bold", "ShortFlow Emoji"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("MATHS", 540, 820);
  ctx.fillText("2+2=?", 540, 890);
}

function write(ctx: Ctx, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `${size}px "ShortFlow Bold", "ShortFlow Emoji"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** Meena says she's the teacher's favourite: she never disturbs the class — she sleeps through it. */
export function favouriteStudent(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const [l0, , l2, l3, p] = s.spans;
  const line = lineAt(s);
  const share = (t - p.start) / (p.end - p.start);
  const done = t >= p.end + 0.2;
  // Wide and still like the Day 1 Shorts: people smaller, words only in the band above their heads.
  const size = 0.75;
  ctx.save();
  if (line < 4) {
    paleRoom(ctx);
    thin(ctx, s, "Mom", MOM, 320, 1, {
      mood: line === 3 ? "happy" : line === 1 ? "proud" : "normal",
      arm: line === 3 ? "clasp" : "down",
      scale: size,
    });
    thin(ctx, s, "Meena", MEENA, 760, -1, {
      mood: line === 2 ? "proud" : "happy",
      arm: line === 0 ? "up" : line === 2 ? "point" : "down",
      jump: line === 0 ? Math.abs(Math.sin((t - l0.start) * 7)) * 18 : 0,
      scale: size,
    });
    if (line === 0) shout(ctx, "FAVOURITE ⭐", 540, 250, easeOutBack((t - l0.start - 0.3) / 0.3), "#FFD166", 84);
    if (line === 1) mark(ctx, "?", 320, 370, t, s.spans[1].start + 0.1);
    if (line === 2) shout(ctx, "NEVER DISTURBS 🤫", 540, 250, easeOutBack((t - l2.start - 0.4) / 0.3), "#80ED99", 70);
    if (line === 3) shout(ctx, "GOOD GIRL 🥰", 540, 250, easeOutBack((t - l3.start - 0.2) / 0.3), "#FFD166", 76);
  } else if (!done) {
    // In class: head down on the desk, fast asleep.
    camera(ctx, t, [], kick(t, p.start, 0.25) * 0.2);
    paleRoom(ctx);
    blob(ctx, "#52796F", () => ctx.roundRect(340, 380, 400, 230, 12), LINE);
    write(ctx, "MATHS", 540, 450, 52, "rgba(255,255,255,0.85)");
    write(ctx, "2 + 2 = ?", 540, 540, 52, "rgba(255,255,255,0.85)");
    // Slumped forward from behind the desk, head resting on its top.
    drawThin(ctx, 800, FLOOR, MEENA, { t, mood: "sleep", face: -1, lean: 0.8, arm: "down", scale: size });
    blob(ctx, "#B08968", () => ctx.rect(220, FLOOR - 340, 700, 34), LINE);
    blob(ctx, "#9C6644", () => ctx.rect(250, FLOOR - 306, 640, 306), LINE);
    zzz(ctx, 300, FLOOR - 480, t);
    shout(ctx, "SLEEPING 😴", 540, 250, easeOutBack((share - 0.45) / 0.2), "#FFD166", 84);
  } else {
    // Back home: Mom's slow, flat stare.
    paleRoom(ctx);
    thin(ctx, s, "Mom", MOM, 540, 1, { mood: "deadpan", arm: "down", scale: size });
    shout(ctx, "…", 540, 330, clamp01((t - p.end - 0.4) / 0.2), "#FFD166", 110);
  }
  ctx.restore();
}
