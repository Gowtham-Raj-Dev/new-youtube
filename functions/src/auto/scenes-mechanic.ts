import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import {
  FLOOR, INK, blob, burst, camera, circle, clamp01, drawPerson, easeInOut, easeOut, easeOutBack, ellipse, kick, lineAt, mark, sweat, talkOf,
  type Look, type Pose, type SceneState, type Shot,
} from "./cartoon";
import { wallClock } from "../longform/props-home";
import { bike, shout, sign, street } from "./props";
import { MACHAN } from "./scenes-day1";

/**
 * "Area Mechanic" — a real comedy clip acted out over its own sound: the
 * mechanic who says "rendu naal" for 20 days, the RX 100 waiting since 1985,
 * the wiring that starts the wrong bike, and the scooter that blows up.
 */

type Ctx = SKRSContext2D;

const MECHANIC: Look = { skin: "#9C6440", shirt: "#F4F1EA", pants: "#22223B", hair: "messy", hairColor: "#1B1210" };
const THATHA: Look = { skin: "#B07A55", shirt: "#FFFFFF", pants: "#F1EFE6", hair: "short", hairColor: "#D9D9D9", mustache: true };
const THAMBI: Look = { skin: "#93603F", shirt: "#B5838D", pants: "#2B2D42", hair: "messy", hairColor: "#22160F" };
const SIR: Look = { skin: "#A8714B", shirt: "#C1121F", pants: "#3D405B", hair: "short", hairColor: "#1B1210", stripes: "#F8F9FA", mustache: true };
const YOUTUBER: Look = { skin: "#B98058", shirt: "#212529", pants: "#343A40", hair: "short", hairColor: "#1B1210" };
/** Machan's shirt on each visit: a new one every time he comes back for the bike. */
const VISITS = ["#FF7B3A", "#52B788", "#4361EE", "#9D4EDD"];

// ─── Places ───────────────────────────────────────────────────────────────────

/** The bunting strung across the shop, swaying a little. */
function bunting(ctx: Ctx, y: number, t: number) {
  const colours = ["#E63946", "#FFD166", "#06D6A0", "#118AB2", "#F78C6B"];
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-700, y);
  ctx.lineTo(W + 700, y);
  ctx.stroke();
  for (let i = 0, x = -680; x < W + 680; x += 90, i++) {
    const sway = Math.sin(t * 2 + i) * 5;
    blob(ctx, colours[i % colours.length], () => {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 70, y);
      ctx.lineTo(x + 35 + sway, y + 70);
      ctx.closePath();
    }, 5);
  }
}

/** A tyre seen from the side. */
function tyre(ctx: Ctx, x: number, y: number, r: number) {
  blob(ctx, "#2B2D42", () => circle(ctx, x, y, r));
  blob(ctx, "#6C757D", () => circle(ctx, x, y, r * 0.5), 6);
}

/** Inside the shop: tyres on the wall, cans on the shelves, bunting, the bulb, the board. */
function garage(ctx: Ctx, t: number, bulbOn = true) {
  ctx.fillStyle = "#D8CBB3";
  ctx.fillRect(-700, -700, W + 1400, FLOOR + 700);
  // Grime streaks on the wall.
  ctx.fillStyle = "rgba(90,70,40,0.12)";
  for (let x = -660; x < W + 660; x += 230) ctx.fillRect(x, 300, 60, FLOOR - 300);
  // The tin roof's edge.
  ctx.fillStyle = "#8D99AE";
  ctx.fillRect(-700, 0, W + 1400, 170);
  ctx.strokeStyle = "#5C677D";
  ctx.lineWidth = 8;
  for (let x = -700; x < W + 700; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 170);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(-700, 166, W + 1400, 12);
  sign(ctx, 540, 260, "AREA MECHANIC WORKS", "#E63946", "#fff", 46);
  bunting(ctx, 360, t);
  // Tyres hanging on the wall, left and right.
  for (const [x, y] of [[40, 600], [190, 650], [-300, 600], [1040, 600], [890, 650], [1380, 620]] as const) tyre(ctx, x, y, 80);
  // A shelf of oil cans.
  blob(ctx, "#7F5539", () => ctx.rect(-560, 900, 420, 26), 6);
  for (const [i, c] of ["#E63946", "#FFD166", "#2A9D8F", "#E63946", "#FFB703"].entries()) blob(ctx, c, () => ctx.roundRect(-540 + i * 80, 800, 60, 100, 8), 6);
  blob(ctx, "#7F5539", () => ctx.rect(1180, 950, 420, 26), 6);
  for (const [i, c] of ["#06D6A0", "#E63946", "#118AB2", "#FFD166"].entries()) blob(ctx, c, () => ctx.roundRect(1200 + i * 90, 850, 66, 100, 8), 6);
  // The bulb hanging from the roof.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(540, 178);
  ctx.lineTo(540, 450);
  ctx.stroke();
  if (bulbOn) {
    const glow = ctx.createRadialGradient(540, 480, 10, 540, 480, 160);
    glow.addColorStop(0, "rgba(255,240,170,0.9)");
    glow.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    circle(ctx, 540, 480, 160);
    ctx.fill();
  }
  blob(ctx, bulbOn ? "#FFF3B0" : "#ADB5BD", () => circle(ctx, 540, 482, 30), 6);
  // A greasy floor with oil stains.
  ctx.fillStyle = "#7D7468";
  ctx.fillRect(-700, FLOOR, W + 1400, H);
  ctx.fillStyle = "rgba(20,18,36,0.35)";
  for (const [x, rx] of [[150, 120], [700, 90], [1150, 140], [-300, 100]] as const) {
    ctx.beginPath();
    ellipse(ctx, x, FLOOR + 90, rx, 22);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(-700, FLOOR - 8, W + 1400, 16);
}

/** Outside the shop: the street, with the shop's open front at the left. */
function shopFront(ctx: Ctx, t: number) {
  street(ctx, t, false);
  // Houses along the street, and the wires overhead.
  for (const [x, w, h, c] of [[620, 300, 700, "#F4D35E"], [930, 320, 620, "#90E0EF"], [1240, 300, 760, "#F6BD60"]] as const) {
    blob(ctx, c, () => ctx.rect(x, FLOOR - 140 - h, w, h));
    for (let wy = FLOOR - 140 - h + 80; wy < FLOOR - 260; wy += 170) blob(ctx, "#5E6472", () => ctx.rect(x + 60, wy, 80, 100), 6);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  for (const y of [180, 230]) {
    ctx.beginPath();
    ctx.moveTo(-700, y);
    ctx.quadraticCurveTo(540, y + 90, W + 700, y);
    ctx.stroke();
  }
  // The shop: a wall, its sign and the dark open front.
  blob(ctx, "#D8CBB3", () => ctx.rect(-700, 260, 1240, FLOOR - 260));
  sign(ctx, 160, 350, "AREA MECHANIC WORKS", "#E63946", "#fff", 40);
  blob(ctx, "#3D3A4B", () => ctx.rect(-560, 430, 1000, FLOOR - 430));
  // The rolled-up shutter at the top of the opening, and tyres inside.
  blob(ctx, "#8D99AE", () => ctx.rect(-580, 410, 1040, 50), 6);
  tyre(ctx, -380, FLOOR - 120, 100);
  tyre(ctx, -150, FLOOR - 100, 90);
  bunting(ctx, 480, t);
}

/** Pink walls, a heart collage and a mic: someone's room across town. */
function pinkRoom(ctx: Ctx) {
  ctx.fillStyle = "#F7C6D9";
  ctx.fillRect(-700, -700, W + 1400, FLOOR + 700);
  ctx.fillStyle = "#EFA7C1";
  for (let x = -700; x < W + 700; x += 140) ctx.fillRect(x, -700, 60, FLOOR + 700);
  // The heart of photos.
  for (const [dx, dy] of [[-60, -40], [60, -40], [-110, 30], [0, 40], [110, 30], [-50, 110], [50, 110], [0, 180]] as const) {
    blob(ctx, "#fff", () => ctx.rect(800 + dx - 40, 470 + dy - 30, 80, 60), 5);
  }
  ctx.fillStyle = "#C9ADA7";
  ctx.fillRect(-700, FLOOR, W + 1400, H);
  ctx.fillStyle = INK;
  ctx.fillRect(-700, FLOOR - 8, W + 1400, 16);
}

// ─── Things ───────────────────────────────────────────────────────────────────

interface ScooterLook {
  face?: 1 | -1;
  /** Engine running: the body shakes and the exhaust puffs. */
  running?: number;
  /** The seat lifted open, 0–1. */
  seat?: number;
  /** An indicator blinking. */
  blink?: boolean;
  headlight?: boolean;
  /** Pushed along: the wheels turn. */
  rolling?: number;
}

/** A scooter (Activa style) standing on the floor, its front at the right. */
function scooter(ctx: Ctx, x: number, colour: string, t: number, o: ScooterLook = {}) {
  ctx.save();
  const run = o.running ?? 0;
  ctx.translate(x + Math.sin(t * 90) * 3 * run, FLOOR + Math.cos(t * 80) * 2 * run);
  ctx.scale(o.face ?? 1, 1);
  for (const wx of [-170, 170]) {
    blob(ctx, INK, () => circle(ctx, wx, -56, 56), 0);
    blob(ctx, "#ADB5BD", () => circle(ctx, wx, -56, 24), 6);
    const a = (o.rolling ?? 0) * t * 8;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a) * 24, -56 + Math.sin(a) * 24);
    ctx.lineTo(wx - Math.cos(a) * 24, -56 - Math.sin(a) * 24);
    ctx.stroke();
  }
  // The exhaust under the back, puffing when running.
  blob(ctx, "#6C757D", () => ctx.roundRect(-290, -78, 120, 26, 12), 6);
  if (run > 0) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 2 + i / 3) % 1;
      ctx.fillStyle = `rgba(200,200,200,${0.7 * (1 - ph)})`;
      ctx.beginPath();
      circle(ctx, -300 - ph * 120, -70 - ph * 40, 16 + ph * 26);
      ctx.fill();
    }
  }
  // The body: the round back, the floorboard, the front apron and mudguard.
  blob(ctx, colour, () => {
    ctx.moveTo(-250, -92);
    ctx.quadraticCurveTo(-270, -250, -120, -268);
    ctx.lineTo(30, -262);
    ctx.quadraticCurveTo(70, -160, 30, -92);
    ctx.closePath();
  });
  blob(ctx, "#2B2D42", () => ctx.roundRect(-10, -116, 150, 30, 10));
  blob(ctx, colour, () => {
    ctx.moveTo(110, -92);
    ctx.lineTo(205, -92);
    ctx.lineTo(250, -400);
    ctx.lineTo(165, -420);
    ctx.closePath();
  });
  blob(ctx, colour, () => {
    ctx.arc(170, -56, 72, Math.PI * 1.1, Math.PI * 1.9);
    ctx.closePath();
  });
  // Handlebar, mirror and headlight.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(205, -420);
  ctx.lineTo(120, -462);
  ctx.moveTo(190, -430);
  ctx.lineTo(175, -520);
  ctx.stroke();
  blob(ctx, "#ADB5BD", () => ellipse(ctx, 175, -540, 26, 20), 6);
  if (o.headlight) {
    const glow = ctx.createRadialGradient(250, -405, 5, 250, -405, 110);
    glow.addColorStop(0, "rgba(255,245,180,0.95)");
    glow.addColorStop(1, "rgba(255,245,180,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    circle(ctx, 250, -405, 110);
    ctx.fill();
  }
  blob(ctx, o.headlight ? "#FFF3B0" : "#E9ECEF", () => ellipse(ctx, 245, -405, 24, 20), 6);
  const blinkOn = o.blink && (t * 3) % 1 < 0.5;
  blob(ctx, blinkOn ? "#FFB703" : "#F4A261", () => ellipse(ctx, 222, -350, 13, 10), 5);
  if (blinkOn) burst(ctx, 222, -350, 30, (t * 3) % 1 * 0.25, 0, "#FFB703");
  // The seat, hinged at its front, lifting open.
  ctx.save();
  ctx.translate(40, -268);
  ctx.rotate(-(o.seat ?? 0) * 1.1);
  blob(ctx, INK, () => ctx.roundRect(-290, -36, 290, 40, 18));
  ctx.restore();
  ctx.restore();
}

/** Dust, cobwebs and a "1985" tag over the old RX 100 standing at `x`. */
function rx100(ctx: Ctx, x: number, t: number, run = 0) {
  ctx.save();
  ctx.translate(Math.sin(t * 90) * 3 * run, 0);
  bike(ctx, x, FLOOR, t);
  ctx.restore();
  ctx.fillStyle = "rgba(150,140,120,0.55)";
  ctx.beginPath();
  ctx.roundRect(x - 245, FLOOR - 310, 470, 300, 30);
  ctx.fill();
  // A cobweb from the handlebar to the seat.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  const [cx, cy] = [x + 60, FLOOR - 300];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.55 + i * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
    ctx.stroke();
  }
  for (const r of [40, 80, 115]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.55, Math.PI * 1.0);
    ctx.stroke();
  }
  sign(ctx, x - 40, FLOOR - 360, "RX 100 · 1985", "#FFD166", INK, 34);
}

/** A spanner, held by its handle. */
function spanner(ctx: Ctx) {
  ctx.save();
  ctx.rotate(-0.6);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-10, -150, 20, 150, 8), 6);
  blob(ctx, "#ADB5BD", () => {
    ctx.arc(0, -160, 26, Math.PI * 0.3, Math.PI * 2.7);
    ctx.closePath();
  }, 6);
  ctx.restore();
}

/** A bunch of keys on a ring. */
function keys(ctx: Ctx) {
  blob(ctx, "#FFD166", () => circle(ctx, 0, -20, 18), 6);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-8, -10, 16, 60, 4), 5);
}

/** A mixer grinder on the floor; `on` 0–1 spins and shakes it. */
function mixer(ctx: Ctx, x: number, t: number, on: number) {
  ctx.save();
  ctx.translate(x + Math.sin(t * 95) * 6 * on, FLOOR);
  ctx.rotate(Math.sin(t * 70) * 0.04 * on);
  blob(ctx, "#7B2CBF", () => ctx.roundRect(-110, -150, 220, 150, 24));
  blob(ctx, "#E0AAFF", () => circle(ctx, 0, -80, 26), 6);
  blob(ctx, "rgba(220,240,255,0.75)", () => {
    ctx.moveTo(-90, -150);
    ctx.lineTo(90, -150);
    ctx.lineTo(70, -360);
    ctx.lineTo(-70, -360);
    ctx.closePath();
  });
  blob(ctx, "#5A189A", () => ctx.roundRect(-80, -390, 160, 36, 12));
  // The blade, a blur when on.
  ctx.save();
  ctx.translate(0, -180);
  ctx.scale(Math.cos(t * 60 * on), 1);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-60, -8, 120, 16, 6), 5);
  ctx.restore();
  ctx.restore();
  if (on > 0.3) {
    ctx.strokeStyle = "#FFD400";
    ctx.lineWidth = 8;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x, FLOOR - 200, 170 + i * 40 + ((t * 300) % 40), side > 0 ? -0.4 : Math.PI - 0.4, side > 0 ? 0.4 : Math.PI + 0.4);
        ctx.stroke();
      }
    }
  }
}

/** A podcast mic on a stand. */
function mic(ctx: Ctx, x: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x, FLOOR - 200);
  ctx.lineTo(x - 60, FLOOR - 420);
  ctx.stroke();
  blob(ctx, "#343A40", () => ctx.roundRect(x - 100, FLOOR - 520, 70, 120, 34));
}

/** A jet plane flying right to left across the sky, `p` 0–1 its way across. */
function jet(ctx: Ctx, p: number, y: number) {
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.translate(W + 500 - p * (W + 1000), y);
  blob(ctx, "#F8F9FA", () => ctx.roundRect(-220, -40, 440, 80, 40));
  blob(ctx, "#118AB2", () => {
    ctx.moveTo(-40, 0);
    ctx.lineTo(80, 150);
    ctx.lineTo(130, 150);
    ctx.lineTo(70, 0);
    ctx.closePath();
  });
  blob(ctx, "#118AB2", () => {
    ctx.moveTo(150, -30);
    ctx.lineTo(220, -140);
    ctx.lineTo(250, -140);
    ctx.lineTo(220, -20);
    ctx.closePath();
  });
  for (let i = 0; i < 5; i++) blob(ctx, "#BDE0FE", () => circle(ctx, -140 + i * 55, -6, 13), 4);
  // Its trail.
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    circle(ctx, 260 + i * 70, 0, 26 - i * 3);
    ctx.fill();
  }
  ctx.restore();
}

/** A flame blasting out of an exhaust at (x, y), pointing left. */
function afterburner(ctx: Ctx, x: number, y: number, t: number, p: number) {
  if (p <= 0) return;
  const len = (260 + Math.sin(t * 50) * 30) * p;
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#FF7B3A", () => {
    ctx.moveTo(0, -34);
    ctx.quadraticCurveTo(-len * 0.6, -60, -len, 0);
    ctx.quadraticCurveTo(-len * 0.6, 60, 0, 34);
    ctx.closePath();
  }, 6);
  blob(ctx, "#FFD166", () => {
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(-len * 0.4, -30, -len * 0.7, 0);
    ctx.quadraticCurveTo(-len * 0.4, 30, 0, 20);
    ctx.closePath();
  }, 0);
  blob(ctx, "#4CC9F0", () => ellipse(ctx, -20, 0, 30, 14), 0);
  ctx.restore();
}

/** The shop's rolling shutter over the whole front, `down` 0–1 from the top. */
function shutter(ctx: Ctx, down: number) {
  if (down <= 0) return;
  const bottom = -700 + (FLOOR + 760) * down;
  ctx.fillStyle = "#9AA5B1";
  ctx.fillRect(-700, -700, W + 1400, bottom + 700);
  ctx.strokeStyle = "#6C7A89";
  ctx.lineWidth = 8;
  for (let y = bottom; y > -700; y -= 46) {
    ctx.beginPath();
    ctx.moveTo(-700, y);
    ctx.lineTo(W + 700, y);
    ctx.stroke();
  }
  blob(ctx, "#5C677D", () => ctx.rect(-700, bottom - 30, W + 1400, 30), 6);
  blob(ctx, "#2B2D42", () => ctx.roundRect(500, bottom - 26, 80, 22, 8), 0);
}

/** Sparks flying from loose wires at (x, y). */
function sparks(ctx: Ctx, x: number, y: number, t: number) {
  ctx.strokeStyle = "#FFD400";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9 + t * 13;
    const r = 20 + ((t * 7 + i * 0.37) % 1) * 70;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(a) * (r + 22), y + Math.sin(a) * (r + 22));
    ctx.stroke();
  }
}

/** A cartoon explosion at (x, y), `age` seconds since it went off. */
function explosion(ctx: Ctx, x: number, y: number, age: number) {
  if (age < 0) return;
  const grow = easeOutBack(age / 0.5);
  const fade = clamp01(1 - (age - 1.6) / 0.8);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(x, y);
  const puffs = (r: number, colour: string, line: number) => {
    blob(ctx, colour, () => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + age * 0.4;
        circle(ctx, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.55 - age * 30, r * 0.45);
      }
    }, line);
  };
  puffs(520 * grow, "#6C757D", 0);
  puffs(440 * grow, "#E63946", 8);
  puffs(320 * grow, "#FF7B3A", 0);
  puffs(200 * grow, "#FFD166", 0);
  ctx.restore();
}

/** A big "N DAYS LATER" card sliding in over the picture, for 1.6 s from `from`. */
function laterCard(ctx: Ctx, t: number, from: number, text: string) {
  const age = t - from;
  if (age < 0 || age > 1.7) return;
  const p = easeOutBack(age / 0.3) * (1 - easeOut((age - 1.4) / 0.3));
  ctx.save();
  ctx.fillStyle = `rgba(20,18,36,${0.55 * p})`;
  ctx.fillRect(0, 560, W, 300);
  shout(ctx, `📅 ${text}`, W / 2, 710, p, "#FFD400", 100, -0.04, 960);
  ctx.restore();
}

/** A white flash over the whole frame. */
function flash(ctx: Ctx, amount: number, colour = "255,255,255") {
  if (amount <= 0) return;
  ctx.fillStyle = `rgba(${colour},${amount})`;
  ctx.fillRect(0, 0, W, H);
}

/** The bill the mechanic writes as the customer talks: each row a part "to change"; `struck` rows crossed out. */
function bill(ctx: Ctx, x: number, y: number, rows: Array<{ text: string; price: number; struck?: boolean }>, cancelled: number, t: number) {
  if (!rows.length) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.04 + Math.sin(t * 1.5) * 0.01);
  const h = 130 + rows.length * 58;
  blob(ctx, "#FFFDF5", () => ctx.roundRect(-230, 0, 460, h, 14));
  ctx.font = `44px "ShortFlow Bold"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#E63946";
  ctx.fillText("BILL 🧾", 0, 42);
  ctx.font = `34px "ShortFlow Bold"`;
  rows.forEach((row, i) => {
    const ry = 104 + i * 58;
    ctx.fillStyle = row.struck ? "#ADB5BD" : INK;
    ctx.textAlign = "left";
    ctx.fillText(row.text, -200, ry);
    ctx.textAlign = "right";
    ctx.fillText(`₹${row.price}`, 200, ry);
    if (row.struck) {
      ctx.strokeStyle = "#E63946";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-205, ry);
      ctx.lineTo(205, ry);
      ctx.stroke();
    }
  });
  const total = rows.filter((r) => !r.struck).reduce((sum, r) => sum + r.price, 0);
  ctx.fillStyle = "#E63946";
  ctx.textAlign = "center";
  ctx.fillText(`TOTAL ₹${total}`, 0, h - 34);
  // The customer's big red cross over all of it.
  if (cancelled > 0) {
    ctx.strokeStyle = "#E63946";
    ctx.lineWidth = 22;
    ctx.lineCap = "round";
    const c = easeOut(cancelled);
    ctx.beginPath();
    ctx.moveTo(-200, 20);
    ctx.lineTo(-200 + 400 * c, 20 + (h - 40) * c);
    if (cancelled > 0.5) {
      const c2 = easeOut((cancelled - 0.5) * 2);
      ctx.moveTo(200, 20);
      ctx.lineTo(200 - 400 * c2, 20 + (h - 40) * c2);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A walking stick, held at its top. */
function stick(ctx: Ctx) {
  blob(ctx, "#8D5B3B", () => ctx.roundRect(-8, -10, 16, 220, 8), 6);
}

/** Smoke curling up from a burnt head at (x, y). */
function smoke(ctx: Ctx, x: number, y: number, t: number) {
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.8 + i / 4) % 1;
    ctx.fillStyle = `rgba(90,90,90,${0.6 * (1 - ph)})`;
    ctx.beginPath();
    circle(ctx, x + Math.sin(ph * 6 + i) * 30, y - ph * 220, 26 + ph * 40);
    ctx.fill();
  }
}

// ─── The scene ────────────────────────────────────────────────────────────────

const POCHADIYAN: Look = { skin: "#8A5A3C", shirt: "#577590", pants: "#2B2D42", hair: "short", hairColor: "#1B1210" };
const SIR_BURNT: Look = { ...SIR, skin: "#4A4A4A", shirt: "#2E2E2E", stripes: "#555", pants: "#222", hair: "messy", hairColor: "#111", mustache: false };
const MACHAN_SCOOTER = "#48CAE4";
const SIR_SCOOTER = "#8D99AE";
const THAMBI_SCOOTER = "#3D405B";

function person(ctx: Ctx, s: SceneState, name: string, look: Look, x: number, face: 1 | -1, pose: Partial<Pose> = {}) {
  drawPerson(ctx, x, FLOOR, look, { t: s.t, talk: talkOf(s, name), face, ...pose });
}

/** From `a` to `b` between `t0` and `t1`. */
const slide = (t: number, t0: number, t1: number, a: number, b: number) => a + (b - a) * easeInOut((t - t0) / (t1 - t0));
const between = (t: number, t0: number, t1: number) => t > t0 && t < t1;
/** Walking legs while moving between `t0` and `t1`. */
const walk = (t: number, t0: number, t1: number) => (between(t, t0, t1) ? t * 0.6 : undefined);
/** Who is talking now. */
const speaking = (s: SceneState) => {
  const i = lineAt(s);
  return i >= 0 && s.t <= s.spans[i].end + 0.3 ? s.speakers[i] : null;
};

/** 0–30.8 s · Machan arrives, waits half an hour, and leaves the scooter. */
function arrival(ctx: Ctx, s: SceneState) {
  const { t } = s;
  camera(ctx, t, [
    { at: 0, x: 500, y: 700, zoom: 0.9, move: 0 },
    { at: 7.6, x: 220, y: 760, zoom: 1.15, move: 0.3 },
    { at: 8.7, x: 500, y: 700, zoom: 0.9, move: 0.3 },
    { at: 11.8, x: 760, y: 740, zoom: 1.1, move: 0.4 },
    { at: 15.8, x: 480, y: 720, zoom: 1.0, move: 0.5 },
    { at: 19.4, x: 760, y: 740, zoom: 1.12, move: 0.4 },
    { at: 25.4, x: 380, y: 740, zoom: 1.08, move: 0.4 },
    { at: 28.8, x: 420, y: 700, zoom: 0.9, move: 0.5 },
  ]);
  shopFront(ctx, t);
  // The red bike the mechanic is busy with, just inside the shop.
  bike(ctx, -200, FLOOR, t);
  // The scooter: ridden in, parked, then rolled into the shop by the unseen Pochadiyan.
  const scooterX = t < 28.9 ? slide(t, 0.6, 2.4, 1600, 640) : slide(t, 28.9, 30.6, 640, -260);
  scooter(ctx, scooterX, MACHAN_SCOOTER, t, { face: -1, rolling: between(t, 0.6, 2.4) || between(t, 28.9, 30.6) ? 1 : 0 });

  const out = t >= 13.6;
  const mechX = slide(t, 13.6, 15.4, 120, 300);
  const talking = speaking(s);
  person(ctx, s, "Mechanic", MECHANIC, mechX, t < 7.6 ? -1 : t >= 28 && t < 30.2 ? -1 : 1, {
    mood: t < 7.6 ? "normal" : talking === "Machan" && out ? "confused" : t >= 25.5 && t < 28 ? "sad" : "normal",
    arm: t < 7.6 ? "hold" : t >= 28 && t < 30.2 ? "up" : talking === "Mechanic" ? "point" : out ? "down" : "hold",
    holding: t < 13.6 || between(t, 15.4, 25.5) ? spanner : undefined,
    run: walk(t, 13.6, 15.4),
  });
  const machanX = slide(t, 0.6, 2.4, 1860, 900);
  const waiting = between(t, 8.6, 12);
  person(ctx, s, "Machan", MACHAN, machanX, -1, {
    mood: waiting ? "sad" : t >= 19.5 && t < 25.5 ? "shocked" : t >= 28 ? "happy" : "normal",
    arm: t < 6.2 && t > 2.5 ? "up" : between(t, 6.2, 7.6) || between(t, 23.2, 25.4) ? "point" : waiting ? "cheeks" : t >= 19.5 && t < 23.2 ? "facepalm" : t >= 28.5 ? "up" : "down",
    run: walk(t, 0.6, 2.4),
  });
  if (waiting) {
    sweat(ctx, 820, 600, t, 8.6);
    wallClock(ctx, 720, 330, 4 + (t - 8.6) * 2.2, 80);
    shout(ctx, "⏳ HALF AN HOUR…", 760, 200, easeOutBack((t - 8.8) / 0.3), "#FFD400", 64, -0.04, 640);
  }
  if (t >= 6.3 && t < 7.6) mark(ctx, "!", 900, 330, t, 6.3, "#FF3B5C");
  if (between(t, 7.8, 9)) mark(ctx, "?", 220, 330, t, 7.8);
  if (between(t, 28, 30.3)) shout(ctx, "POCHADIYAA! 📢", 160, 360, easeOutBack((t - 28) / 0.25), "#FFD400", 70, -0.06, 640);
}

/** 30.8–71.4 s · "Rendu naal" for 20 days, the 1985 RX 100, and Thatha. */
function rendhuNaal(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const talking = speaking(s);
  const at = (who: string | null) => (who === "Mechanic" ? 300 : who === "Thatha" ? 860 : 640);
  const shots: Shot[] = [{ at: 30.8, x: 500, y: 720, zoom: 1.0, move: 0 }];
  for (let i = 10; i <= 25; i++) shots.push({ at: s.spans[i].start - 0.15, x: 480 + (at(s.speakers[i]) - 480) * 0.4, y: 740, zoom: 1.1, move: 0.4 });
  shots.push({ at: 54.4, x: -260, y: 760, zoom: 1.05, move: 0.8 }, { at: 57.2, x: 480, y: 740, zoom: 1.05, move: 0.6 }, { at: 61.8, x: 330, y: 700, zoom: 1.35, move: 0.2 }, { at: 63.6, x: 560, y: 720, zoom: 1.0, move: 0.5 });
  camera(ctx, t, shots, kick(t, 62, 0.4));
  garage(ctx, t);
  rx100(ctx, -420, t);

  // Machan's scooter, parked and gathering dust as the days go by.
  const days = t < 35.8 ? 0 : t < 41.1 ? 2 : t < 45.1 ? 6 : t < 47 ? 8 : 16;
  scooter(ctx, 860, MACHAN_SCOOTER, t, { face: -1 });
  if (days) {
    ctx.fillStyle = `rgba(150,140,120,${Math.min(0.6, days * 0.035)})`;
    ctx.beginPath();
    ctx.roundRect(570, FLOOR - 560, 580, 560, 40);
    ctx.fill();
  }

  // The mechanic, with something different in his hands on every visit.
  const busy = t < 37.8 ? spanner : t < 43 ? (c: Ctx) => {
    c.save();
    c.rotate(-0.3);
    blob(c, "#6C757D", () => c.roundRect(-30, -40, 260, 60, 28));
    c.restore();
  } : t < 47.1 ? spanner : (c: Ctx) => tyre(c, 0, -40, 90);
  person(ctx, s, "Mechanic", MECHANIC, 300, t >= 53.8 && t < 57.2 ? -1 : 1, {
    mood: t >= 58.5 && t < 64 ? "proud" : talking === "Machan" ? "confused" : "normal",
    arm: t >= 53.8 && t < 57.2 ? "point" : t >= 62 && t < 64 ? "up" : talking === "Mechanic" && t < 47 ? "thumb" : "hold",
    holding: t >= 53.8 && t < 64 ? undefined : busy,
  });
  // Pochadiyan, back from leave, asleep on the job.
  if (between(t, 42.9, 45.2)) {
    drawPerson(ctx, 90, FLOOR, POCHADIYAN, { t, mood: "sleep", face: 1, scale: 0.85 });
    // zzz
    shout(ctx, "Zzz", 150, 470, 1, "#fff", 56, -0.1);
  }

  // Machan comes back in a new shirt each time; away while the days pass.
  const visit = t < 36.2 ? 0 : t < 41.3 ? 1 : t < 47 ? 2 : 3;
  const here = t < 44.6 || t >= 48.3;
  if (here) {
    person(ctx, s, "Machan", { ...MACHAN, shirt: VISITS[visit] }, 640, t >= 48.5 && t < 53.6 ? 1 : -1, {
      mood: t >= 48.5 && t < 53.6 ? "shocked" : t >= 57.3 && t < 58.5 ? "confused" : t >= 58.5 && t < 64 ? "shocked" : t >= 68.5 ? "sad" : talking === "Mechanic" ? "sad" : "normal",
      arm: t >= 48.5 && t < 53.6 ? "point" : t >= 68.5 ? "facepalm" : talking === "Machan" ? "point" : "down",
      jump: t >= 48.5 && t < 48.9 ? 30 : 0,
      shiver: t >= 48.5 && t < 51 ? 0.3 : 0,
    });
  }
  if (t >= 51 && t < 53.6) shout(ctx, "1 INCH KOODA NAGARALA!", 640, 380, easeOutBack((t - 51.2) / 0.3), "#FF3B5C", 60, -0.05, 760);
  if (t >= 54.6 && t < 57.2) mark(ctx, "?", 640, 330, t, 55);

  // Thatha, waiting for his RX 100 since 1985.
  if (t >= 63.4) {
    const thathaX = t < 69.6 ? slide(t, 63.4, 64.6, 1500, 880) : slide(t, 69.6, 71.4, 880, 1500);
    person(ctx, s, "Thatha", THATHA, thathaX, t >= 69.6 ? 1 : -1, {
      mood: t >= 68.5 ? "sad" : "normal",
      arm: "hold",
      holding: stick,
      run: walk(t, 63.4, 64.6) ?? walk(t, 69.6, 71.4),
    });
    if (t >= 68.5 && t < 70.5) sweat(ctx, 960, 560, t, 68.5);
  }
  if (t >= 62 && t < 64) shout(ctx, "1985!!", 330, 330, easeOutBack((t - 62) / 0.25), "#FFD400", 120, -0.08);
  burst(ctx, 330, 330, 160, t, 62);
}

/** A customer pushing his dead scooter up to the shop; the mechanic sends him away. */
function thambiAtShop(ctx: Ctx, s: SceneState, from: number, leave: number, mechanicFace: 1 | -1, runAway = false) {
  const { t } = s;
  camera(ctx, t, [
    { at: from, x: 520, y: 720, zoom: 0.95, move: 0 },
    { at: from + 0.1, x: 560, y: 740, zoom: 1.05, move: 3 },
  ]);
  shopFront(ctx, t);
  bike(ctx, -200, FLOOR, t);
  const gone = runAway ? slide(t, leave, leave + 0.9, 0, 900) : slide(t, leave, leave + 1.6, 0, 700);
  const x = slide(t, from, from + 1.2, 1500, 700) + gone;
  scooter(ctx, x, THAMBI_SCOOTER, t, { face: t >= leave ? 1 : -1, rolling: 1 });
  person(ctx, s, "Mechanic", MECHANIC, 120, mechanicFace, {
    mood: "normal",
    arm: talkOf(s, "Mechanic") > 0 || speaking(s) === "Mechanic" ? "point" : "hold",
    holding: speaking(s) === "Mechanic" ? undefined : spanner,
  });
  person(ctx, s, "Thambi", THAMBI, x + 260, t >= leave ? 1 : -1, {
    mood: t >= leave ? (runAway ? "scared" : "sad") : speaking(s) === "Mechanic" ? "sad" : "normal",
    arm: speaking(s) === "Thambi" ? "up" : "down",
    run: walk(t, from, from + 1.2) ?? (t >= leave ? t * (runAway ? 1 : 0.5) : undefined),
  });
  if (runAway && t >= leave) {
    burst(ctx, x + 200, FLOOR - 300, 120, t, leave);
    shout(ctx, "💨", x - 150, FLOOR - 200, 1, "#fff", 90, 0);
  }
}

/** 77–96.6 s · Every problem is "maathanum" — and the bill keeps growing. */
function maathanum(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const talking = speaking(s);
  camera(ctx, t, [
    { at: 77, x: 520, y: 700, zoom: 0.98, move: 0 },
    { at: 89.3, x: 640, y: 720, zoom: 1.2, move: 0.3 },
    { at: 91, x: 360, y: 720, zoom: 1.2, move: 0.3 },
    { at: 92.4, x: 520, y: 700, zoom: 0.98, move: 0.4 },
  ], kick(t, 89.5, 0.35));
  garage(ctx, t);
  scooter(ctx, 860, SIR_SCOOTER, t, { face: -1 });
  person(ctx, s, "Mechanic", MECHANIC, 260, 1, {
    mood: talking === "Mechanic" ? "proud" : "normal",
    arm: talking === "Mechanic" ? "thumb" : "hold",
    holding: talking === "Mechanic" ? undefined : spanner,
  });
  const sirX = t < 94.8 ? slide(t, 76.6, 77.8, 1500, 620) : slide(t, 94.8, 96.6, 620, 1500);
  person(ctx, s, "Sir", SIR, sirX, t >= 94.8 ? 1 : -1, {
    mood: t >= 89.4 && t < 91.1 ? "shocked" : t >= 86.2 && t < 88.1 ? "confused" : t >= 92.5 ? "normal" : talking === "Mechanic" ? "confused" : "normal",
    arm: t >= 86.2 && t < 88.1 ? "scratch" : t >= 89.4 && t < 91.1 ? "point" : t >= 92.5 && t < 94.8 ? "up" : talking === "Sir" ? "point" : "down",
    run: walk(t, 76.6, 77.8) ?? walk(t, 94.8, 96.6),
  });
  const rows: Array<{ text: string; price: number; struck?: boolean }> = [];
  if (t >= 79.3) rows.push({ text: "Tyre + Tube", price: 1800 });
  if (t >= 82.9) rows.push({ text: "Brake shoe + cable", price: 950 });
  if (t >= 85.1) rows.push({ text: "Battery", price: 2400 });
  if (t >= 88.2) rows.push({ text: "Chain sprocket", price: 3200, struck: t >= 91.1 });
  if (t >= 91.1) rows.push({ text: "Belt", price: 1600 });
  bill(ctx, 430, 250, rows, clamp01((t - 93) / 0.8), t);
  if (t >= 89.4 && t < 91.2) mark(ctx, "?!", 640, 320, t, 89.5, "#FF3B5C", 130);
}

/** 100.9–123 s · The keys, the wrong bike starting, the jet, the shutter and the dead bulb. */
function wiring(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const jetOn = between(t, 109.2, 116.4);
  const shutterOn = between(t, 116.5, 121);
  camera(ctx, t, [
    { at: 100.9, x: 520, y: 700, zoom: 0.98, move: 0 },
    { at: 103.5, x: 60, y: 820, zoom: 1.1, move: 0.4 },
    { at: 104.3, x: 520, y: 700, zoom: 0.98, move: 0.4 },
    { at: 109.2, x: 700, y: 760, zoom: 1.05, move: 0.5 },
    { at: 116.4, x: 540, y: 640, zoom: 0.9, move: 0.4 },
    { at: 121, x: 540, y: 560, zoom: 1.05, move: 0.5 },
  ], jetOn ? 0.5 : kick(t, 103.5, 0.4));
  garage(ctx, t, false);
  // The FZ next to it, which starts when the scooter's key turns.
  const fzRuns = t >= 103.5;
  ctx.save();
  ctx.translate(Math.sin(t * 90) * 4 * (fzRuns ? 1 : 0), 0);
  bike(ctx, -120, FLOOR, t);
  ctx.restore();
  if (fzRuns) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 2 + i / 3) % 1;
      ctx.fillStyle = `rgba(200,200,200,${0.7 * (1 - ph)})`;
      ctx.beginPath();
      circle(ctx, -330 - ph * 120, FLOOR - 80 - ph * 40, 18 + ph * 30);
      ctx.fill();
    }
    if (t < 107.3) shout(ctx, "VROOM VROOM!", 60, 640, easeOutBack((t - 103.6) / 0.25), "#FF7B3A", 66, 0.06, 520);
  }
  scooter(ctx, 840, SIR_SCOOTER, t, { face: -1, blink: shutterOn, running: jetOn ? 1 : 0 });
  // Its exhaust (at the scooter's back, on the right) blasts flame like a jet engine.
  if (jetOn) {
    ctx.save();
    ctx.translate(840 + 270, FLOOR - 65);
    ctx.scale(-1, 1);
    afterburner(ctx, 0, 0, t, easeOut((t - 109.2) / 0.3));
    ctx.restore();
  }
  const talking = speaking(s);
  person(ctx, s, "Mechanic", MECHANIC, 300, 1, {
    mood: jetOn ? "scared" : t >= 107.3 ? "confused" : "normal",
    arm: between(t, 102, 103.4) ? "point" : t >= 107.3 && t < 109 ? "scratch" : jetOn ? "cheeks" : "down",
    holding: between(t, 102, 103.4) ? keys : undefined,
    shiver: jetOn ? 0.5 : 0,
  });
  const sirX = slide(t, 100.8, 101.8, 1500, 620);
  person(ctx, s, "Sir", SIR, sirX, t >= 103.4 && t < 108 ? -1 : -1, {
    mood: t >= 104.3 ? "shocked" : "normal",
    arm: t >= 103.4 && t < 104.4 ? "hold" : t >= 104.4 && t < 107.3 ? "point" : t >= 118.3 ? "up" : talking === "Sir" ? "point" : "down",
    holding: t >= 103.4 && t < 104.4 ? keys : undefined,
    run: walk(t, 100.8, 101.8),
    shiver: jetOn ? 0.4 : 0,
  });
  if (t >= 107.3 && t < 109) mark(ctx, "?", 300, 320, t, 107.4);
  if (t >= 121.1) mark(ctx, "?", 540, 380, t, 121.6, "#fff", 100);
  shutter(ctx, shutterOn ? 0.75 * (0.5 - 0.5 * Math.cos((t - 116.5) * 2.4)) : 0);
  // Screen space: the jet roaring across.
  ctx.restore();
  ctx.save();
  if (jetOn) {
    jet(ctx, (t - 109.6) / 3, 420);
    shout(ctx, "WHOOOOSH! 🛫", W / 2, 260, easeOutBack((t - 109.3) / 0.3), "#4CC9F0", 96, -0.05, 960);
  }
  if (shutterOn) shout(ctx, "⬆️ SHUTTER ⬇️", W / 2, 1150, easeOutBack((t - 118.4) / 0.3), "#FFD400", 70, 0.03, 900);
}

/** 123–125.8 s · Meanwhile, across town: the light switch turns on someone's mixer. */
function mixerRoom(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const on = t >= 124.3 ? 1 : 0;
  camera(ctx, t, [{ at: 123, x: 560, y: 760, zoom: 1.05, move: 0 }], on * 0.4);
  pinkRoom(ctx);
  mic(ctx, 680);
  person(ctx, s, "Youtuber", YOUTUBER, 400, 1, { mood: on ? "shocked" : "happy", arm: on ? "cheeks" : "down", jump: t >= 124.3 && t < 124.6 ? 40 : 0 });
  mixer(ctx, 880, t, on);
  ctx.restore();
  ctx.save();
  shout(ctx, "MEANWHILE… 🏠", W / 2, 300, easeOutBack((t - 123) / 0.25), "#FFD400", 70, -0.04);
  if (on) shout(ctx, "VRRRRRR!", 820, 560, easeOutBack((t - 124.3) / 0.2), "#E0AAFF", 90, 0.08);
}

/** 129.6–136.4 s · The customer tells him off; the words echo while he sits alone. */
function scolding(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const alone = t >= 133.6;
  camera(ctx, t, alone ? [{ at: 133.6, x: 540, y: 720, zoom: 1.0, move: 0 }, { at: 133.7, x: 540, y: 780, zoom: 1.25, move: 2.6 }] : [{ at: 129.6, x: 500, y: 740, zoom: 1.1, move: 0 }]);
  garage(ctx, t, !alone);
  if (!alone) {
    scooter(ctx, 980, SIR_SCOOTER, t, { face: -1 });
    person(ctx, s, "Mechanic", MECHANIC, 330, 1, { mood: "sad", arm: "down" });
    const sirX = slide(t, 132.6, 133.6, 640, 1500);
    person(ctx, s, "Sir", SIR, sirX, t >= 132.6 ? 1 : -1, { mood: "shocked", arm: t < 132.6 ? "point" : "down", shiver: t < 132.6 ? 0.35 : 0, run: walk(t, 132.6, 133.6) });
    return;
  }
  person(ctx, s, "Mechanic", MECHANIC, 540, 1, { mood: "sad", arm: "cheeks" });
  sweat(ctx, 430, 600, t, 133.8);
  // Dark, with a spotlight on him.
  const g = ctx.createRadialGradient(540, 900, 120, 540, 900, 700);
  g.addColorStop(0, "rgba(20,20,70,0)");
  g.addColorStop(1, "rgba(20,20,70,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(-700, -700, W + 1400, H + 1400);
  ctx.restore();
  ctx.save();
  const echo = (t - 133.6) % 1.2;
  ctx.globalAlpha = 1 - echo / 1.2;
  shout(ctx, "VELAI THERIYALANAA…", W / 2, 300 + echo * 40, 1 + echo * 0.2, "#fff", 70, -0.04, 900);
}

/** 136.4–150 s · The customer no shop could help; the mechanic fixes it in seconds. */
function fixIt(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const montage = t >= 147;
  camera(ctx, t, montage
    ? [{ at: 147, x: 560, y: 960, zoom: 1.4, move: 0 }]
    : [{ at: 136.4, x: 540, y: 720, zoom: 0.95, move: 0 }, { at: 143, x: 420, y: 740, zoom: 1.08, move: 0.4 }, { at: 145.3, x: 520, y: 720, zoom: 0.95, move: 0.4 }], montage ? 0.25 : 0);
  shopFront(ctx, t);
  const scooterX = 640;
  scooter(ctx, slide(t, 136.4, 137.4, 1300, scooterX), THAMBI_SCOOTER, t, { face: -1, rolling: between(t, 136.4, 137.4) ? 1 : 0, seat: montage ? easeOut((t - 147) / 0.3) : 0 });
  // The mechanic: sitting sad in the shop, then up, a pat on Sir's shoulder, and to the scooter.
  const mechX = montage ? 300 : t < 145.3 ? 60 : slide(t, 145.3, 146.8, 60, 420);
  person(ctx, s, "Mechanic", MECHANIC, mechX, 1, {
    mood: t < 145.3 ? "sad" : "proud",
    arm: montage ? "hold" : between(t, 145.6, 146.2) ? "point" : "down",
    holding: montage ? spanner : undefined,
    run: walk(t, 145.3, 146.8),
    shiver: montage ? 0.6 : 0,
  });
  person(ctx, s, "Sir", SIR, montage ? 1400 : 300, 1, {
    mood: t >= 143.2 ? "proud" : "normal",
    arm: between(t, 143.2, 145.3) ? "point" : "down",
  });
  person(ctx, s, "Thambi", THAMBI, slide(t, 136.4, 137.4, 1560, 900), -1, {
    mood: t >= 143.2 ? "confused" : "sad",
    arm: speaking(s) === "Thambi" ? "up" : "down",
    run: walk(t, 136.4, 137.4),
  });
  if (montage) {
    // Wires and sparks under the lifted seat, over everyone.
    ctx.strokeStyle = "#E63946";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(560, FLOOR - 270);
    ctx.bezierCurveTo(600, FLOOR - 380, 700, FLOOR - 200, 740, FLOOR - 300);
    ctx.stroke();
    ctx.strokeStyle = "#FFD166";
    ctx.beginPath();
    ctx.moveTo(580, FLOOR - 270);
    ctx.bezierCurveTo(640, FLOOR - 340, 680, FLOOR - 240, 760, FLOOR - 280);
    ctx.stroke();
    sparks(ctx, 650, FLOOR - 300, t);
    ctx.restore();
    ctx.save();
    shout(ctx, "⚡ 30 SECONDS! ⚡", W / 2, 300, easeOutBack((t - 147.1) / 0.25), "#FFD400", 84, -0.04, 960);
  }
}

/** 150–165 s · It starts; no money; Sir's own scooter starts too — and blows up. */
function boom(ctx: Ctx, s: SceneState) {
  const { t } = s;
  const bang = 162.4;
  camera(ctx, t, [
    { at: 150, x: 560, y: 720, zoom: 0.95, move: 0 },
    { at: 156.6, x: 700, y: 740, zoom: 1.05, move: 0.6 },
    { at: 159.8, x: 760, y: 760, zoom: 1.2, move: 1.5 },
    { at: bang, x: 640, y: 700, zoom: 0.9, move: 0.15 },
  ], Math.max(t >= 160 && t < bang ? 0.35 : 0, kick(t, bang, 1.2) * 1.4));
  shopFront(ctx, t);
  // Thambi's scooter, running; he rides off once he has had his say.
  const thambiGone = slide(t, 156.9, 158, 0, 1200);
  scooter(ctx, 640 + thambiGone, THAMBI_SCOOTER, t, { face: thambiGone > 0 ? 1 : -1, running: 1, headlight: true, rolling: thambiGone > 0 && thambiGone < 1200 ? 1 : 0 });
  person(ctx, s, "Thambi", THAMBI, 900 + thambiGone, thambiGone > 0 ? 1 : -1, {
    mood: t < 154.7 ? "laugh" : "shocked",
    arm: between(t, 151.5, 152.8) ? "hold" : between(t, 154.7, 156.8) ? "point" : "thumb",
    run: thambiGone > 0 && thambiGone < 1200 ? t : undefined,
  });
  // Sir's scooter, waiting at the kerb for its turn.
  const sirScooter = 760;
  const shaking = t >= 160 ? 1 + (t - 160) : 0;
  const blown = t >= bang;
  if (!blown) scooter(ctx, sirScooter + (t < 158 ? 600 : 0), SIR_SCOOTER, t, { face: -1, running: shaking });
  else if (t > bang + 0.6) scooter(ctx, sirScooter, "#2B2B2B", t, { face: -1 });
  // The mechanic walks off proud, then a little dance; the bang sends him running.
  const mechX = t < 152.9 ? 420 : t < bang ? slide(t, 152.9, 154.4, 420, 120) : slide(t, bang, bang + 1.2, 120, -400);
  person(ctx, s, "Mechanic", MECHANIC, mechX, t >= 152.9 && t < 154.4 ? -1 : 1, {
    mood: t >= 161.3 ? "scared" : t >= 152.9 ? "proud" : "happy",
    arm: t >= 161.3 ? "cheeks" : between(t, 152.9, 154.2) ? "thumb" : t >= 154.4 ? "up" : "down",
    run: walk(t, 152.9, 154.4) ?? (t >= bang ? t : undefined),
    jump: between(t, 154.4, 160) ? Math.abs(Math.sin(t * 6)) * 30 : t >= 161.3 && t < 161.7 ? 50 : 0,
  });
  // Sir: says his piece, walks to his scooter, turns the key… and comes out of the smoke burnt.
  const sirX = t < 157.8 ? 300 : slide(t, 157.8, 158.8, 300, sirScooter + 260);
  if (!blown || t > bang + 0.6) {
    person(ctx, s, "Sir", blown ? SIR_BURNT : SIR, sirX, -1, {
      mood: blown ? "shocked" : t >= 160 ? "scared" : "normal",
      arm: blown ? "down" : t >= 158.8 && t < 160.2 ? "hold" : between(t, 156.8, 157.8) ? "point" : "down",
      holding: t >= 158.8 && t < 160.2 ? keys : undefined,
      run: walk(t, 157.8, 158.8),
      shiver: t >= 160 && !blown ? 0.6 : 0,
    });
    if (blown) smoke(ctx, sirX + 20, FLOOR - 700, t);
  }
  if (t >= 160 && !blown) shout(ctx, "BRRRRRRR!", sirScooter, 520, easeOutBack((t - 160.1) / 0.25), "#FF7B3A", 70, 0.06, 560);
  explosion(ctx, sirScooter, FLOOR - 260, t - bang);
  ctx.restore();
  ctx.save();
  if (blown) shout(ctx, "💥 BOOM! 💥", W / 2, 360, easeOutBack((t - bang) / 0.25), "#FFD400", 130, -0.06, 960);
  flash(ctx, kick(t, bang, 0.3) * 0.9);
}

/** The whole clip, place by place as in the original. */
export function areaMechanic(ctx: Ctx, s: SceneState) {
  const { t } = s;
  ctx.save();
  if (t < 30.8) arrival(ctx, s);
  else if (t < 71.4) rendhuNaal(ctx, s);
  else if (t < 77) thambiAtShop(ctx, s, 71.4, 75.8, 1, true);
  else if (t < 96.6) maathanum(ctx, s);
  else if (t < 100.9) thambiAtShop(ctx, s, 96.6, 100.7, 1);
  else if (t < 123) wiring(ctx, s);
  else if (t < 125.8) mixerRoom(ctx, s);
  else if (t < 129.6) thambiAtShop(ctx, s, 125.8, 129.4, -1);
  else if (t < 136.4) scolding(ctx, s);
  else if (t < 150) fixIt(ctx, s);
  else boom(ctx, s);
  ctx.restore();
  laterCard(ctx, t, 35.8, "2 DAYS LATER");
  laterCard(ctx, t, 41.1, "6 DAYS LATER");
  laterCard(ctx, t, 45.1, "8 DAYS LATER");
  laterCard(ctx, t, 47.0, "16 DAYS LATER");
  // A quick white flash on each cut to a new day.
  for (const cut of [35.8, 41.1, 45.1, 47.0]) flash(ctx, kick(t, cut, 0.2) * 0.6);
}
