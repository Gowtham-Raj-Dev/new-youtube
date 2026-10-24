import type { SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_HEIGHT as H, SHORT_WIDTH as W } from "@shortflow/shared";
import { FLOOR, INK, blob, circle, ellipse, room } from "./cartoon";

/** Places and things for the illustrated scenes, in the same flat style as cartoon.ts. */

type Ctx = SKRSContext2D;
/** Poppins for the words, colour emoji for the rest; both registered by render.ts. */
const FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;

// ─── Places ───────────────────────────────────────────────────────────────────

/** Machan's room: blue walls, a window and a poster. */
export function friendsRoom(ctx: Ctx) {
  room(ctx, "#4CC9F0", "#2B2D42", "rgba(255,255,255,0.08)");
  ctx.fillStyle = "#BDE0FE";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.fillRect(760, 260, 230, 260);
  ctx.strokeRect(760, 260, 230, 260);
  ctx.beginPath();
  ctx.moveTo(875, 260);
  ctx.lineTo(875, 520);
  ctx.moveTo(760, 390);
  ctx.lineTo(990, 390);
  ctx.stroke();
  ctx.fillStyle = "#FFD166";
  ctx.fillRect(90, 300, 170, 220);
  ctx.strokeRect(90, 300, 170, 220);
}

/** The family's hall: peach walls, a clock and a photo frame. */
export function ammaHall(ctx: Ctx, t: number) {
  room(ctx, "#FFD6A5", "#6D4C41", "rgba(255,255,255,0.18)");
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.fillStyle = "#FFF1E6";
  ctx.fillRect(780, 300, 170, 140);
  ctx.strokeRect(780, 300, 170, 140);
  ctx.beginPath();
  ctx.arc(150, 400, 70, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(150, 400);
  ctx.lineTo(150 + Math.cos(t * 0.8) * 46, 400 + Math.sin(t * 0.8) * 46);
  ctx.moveTo(150, 400);
  ctx.lineTo(150, 360);
  ctx.stroke();
}

/** A kitchen: tiles and a counter along the back wall. */
export function kitchen(ctx: Ctx) {
  room(ctx, "#CDEAC0", "#5E548E", "rgba(255,255,255,0)");
  ctx.strokeStyle = "rgba(30,27,46,0.12)";
  ctx.lineWidth = 4;
  for (let y = 300; y < 900; y += 80) {
    ctx.beginPath();
    ctx.moveTo(-600, y);
    ctx.lineTo(W + 600, y);
    ctx.stroke();
  }
  blob(ctx, "#B08968", () => ctx.rect(-600, 900, W + 1200, FLOOR - 900));
  blob(ctx, "#DDB892", () => ctx.rect(-600, 880, W + 1200, 40));
}

/** Outside: sky, a road and a tree. */
export function street(ctx: Ctx, t: number, tree = true) {
  ctx.fillStyle = "#8ECAE6";
  ctx.fillRect(-600, -600, W + 1200, FLOOR + 600);
  for (const [cx, cy, s] of [[200, 320, 1], [760, 220, 0.8], [1250, 300, 1.1]] as const) {
    const x = ((cx + t * 12) % (W + 700)) - 300;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    circle(ctx, x, cy, 50 * s);
    circle(ctx, x + 55 * s, cy - 20 * s, 60 * s);
    circle(ctx, x + 115 * s, cy, 48 * s);
    ctx.fill();
  }
  ctx.fillStyle = "#90BE6D";
  ctx.fillRect(-600, FLOOR - 140, W + 1200, 140);
  ctx.fillStyle = "#495057";
  ctx.fillRect(-600, FLOOR, W + 1200, H);
  ctx.fillStyle = "#F8F9FA";
  for (let x = -600; x < W + 600; x += 200) ctx.fillRect(x, FLOOR + 120, 110, 16);
  ctx.fillStyle = INK;
  ctx.fillRect(-600, FLOOR - 8, W + 1200, 16);
  if (tree) {
    blob(ctx, "#7F5539", () => ctx.rect(880, 560, 70, FLOOR - 560));
    blob(ctx, "#52B788", () => {
      circle(ctx, 915, 520, 150);
    });
    blob(ctx, "#40916C", () => circle(ctx, 860, 470, 70), 0);
  }
}

/** A swimming pool's edge: tiles, the water and a ladder. */
export function poolSide(ctx: Ctx, t: number) {
  // The pool lies behind the people, between the far wall and the deck they stand on.
  const top = 800;
  const deck = FLOOR - 50;
  room(ctx, "#E0FBFC", "#C2DFE3", "rgba(152,193,217,0.25)");
  ctx.fillStyle = "#3A86FF";
  ctx.fillRect(-600, top, W + 1200, deck - top);
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 8;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    for (let x = -600; x < W + 600; x += 20) {
      const y = top + 40 + i * 62 + Math.sin(x * 0.03 + t * 3 + i) * 8;
      if (x === -600) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(-600, top - 6, W + 1200, 12);
  blob(ctx, "#F1FAEE", () => ctx.rect(-600, deck, W + 1200, FLOOR - deck));
  // The ladder and a "deep water" sign.
  ctx.strokeStyle = "#ADB5BD";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(560, top - 120);
  ctx.lineTo(560, top + 200);
  ctx.moveTo(640, top - 120);
  ctx.lineTo(640, top + 200);
  for (let y = top - 60; y < top + 200; y += 70) {
    ctx.moveTo(560, y);
    ctx.lineTo(640, y);
  }
  ctx.stroke();
  sign(ctx, 600, 520, "DEEP 10 FT", "#E63946");
}

// ─── Things ───────────────────────────────────────────────────────────────────

/** A board on the wall with words on it. */
export function sign(ctx: Ctx, x: number, y: number, text: string, color = "#fff", ink = "#fff", size = 44) {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const w = ctx.measureText(text).width + 60;
  blob(ctx, color, () => ctx.roundRect(x - w / 2, y - size, w, size * 2, 16));
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 3);
  ctx.restore();
}

/** Words that pop out over the scene, outlined like a sticker. */
export function shout(ctx: Ctx, text: string, x: number, y: number, p: number, color = "#FFD400", size = 90, tilt = -0.06, maxWidth = Infinity) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(p, p);
  ctx.font = `${size}px ${FONT}`;
  // Too wide for its room: smaller, never cut off.
  const width = ctx.measureText(text).width;
  if (width > maxWidth) ctx.scale(maxWidth / width, maxWidth / width);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 18;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A bed against the wall, its head at the left. */
export function bed(ctx: Ctx, x: number, w = 520, blanket = "#E76F51") {
  blob(ctx, "#8D5B3B", () => ctx.roundRect(x, FLOOR - 330, 40, 330, 10));
  blob(ctx, "#A9744F", () => ctx.roundRect(x, FLOOR - 190, w, 140, 14));
  blob(ctx, "#8D5B3B", () => ctx.rect(x + w - 40, FLOOR - 60, 30, 60));
  blob(ctx, "#8D5B3B", () => ctx.rect(x + 10, FLOOR - 60, 30, 60));
  blob(ctx, "#fff", () => ctx.roundRect(x + 50, FLOOR - 250, 150, 70, 30));
  blob(ctx, blanket, () => ctx.roundRect(x + 160, FLOOR - 240, w - 170, 70, 20));
}

/** An alarm clock; `ring` 0–1 shakes it and draws its ringing lines. */
export function alarmClock(ctx: Ctx, x: number, y: number, t: number, ring: number, crossed = false) {
  ctx.save();
  ctx.translate(x + Math.sin(t * 80) * 6 * ring, y);
  ctx.rotate(Math.sin(t * 60) * 0.12 * ring);
  blob(ctx, "#E63946", () => circle(ctx, -36, -48, 18));
  blob(ctx, "#E63946", () => circle(ctx, 36, -48, 18));
  blob(ctx, "#E63946", () => circle(ctx, 0, 0, 52));
  blob(ctx, "#fff", () => circle(ctx, 0, 0, 38), 6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -26);
  ctx.moveTo(0, 0);
  ctx.lineTo(18, 8);
  ctx.stroke();
  if (ring > 0.1) {
    ctx.lineWidth = 7;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, 72, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5);
      ctx.stroke();
    }
  }
  if (crossed) {
    ctx.strokeStyle = "#2B2D42";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(-45, -45);
    ctx.lineTo(45, 45);
    ctx.moveTo(45, -45);
    ctx.lineTo(-45, 45);
    ctx.stroke();
  }
  ctx.restore();
}

/** A motorbike standing on the floor, facing right. */
export function bike(ctx: Ctx, x: number, y: number, t: number, rolling = 0) {
  ctx.save();
  ctx.translate(x, y);
  const wheel = (wx: number) => {
    blob(ctx, "#2B2D42", () => circle(ctx, wx, -70, 70));
    blob(ctx, "#ADB5BD", () => circle(ctx, wx, -70, 30), 6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    const a = rolling * t * 8;
    ctx.beginPath();
    ctx.moveTo(wx + Math.cos(a) * 30, -70 + Math.sin(a) * 30);
    ctx.lineTo(wx - Math.cos(a) * 30, -70 - Math.sin(a) * 30);
    ctx.stroke();
  };
  wheel(-170);
  wheel(170);
  blob(ctx, "#D62828", () => {
    ctx.moveTo(-200, -130);
    ctx.lineTo(-40, -200);
    ctx.lineTo(120, -190);
    ctx.lineTo(170, -110);
    ctx.lineTo(-120, -90);
    ctx.closePath();
  });
  blob(ctx, "#2B2D42", () => ctx.roundRect(-150, -230, 170, 40, 16));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(120, -190);
  ctx.lineTo(160, -290);
  ctx.lineTo(110, -300);
  ctx.stroke();
  blob(ctx, "#FFD166", () => circle(ctx, 190, -220, 22), 6);
  ctx.restore();
}

/** A WiFi router with blinking lights and signal arcs. */
export function router(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-50, -40);
  ctx.lineTo(-70, -130);
  ctx.moveTo(50, -40);
  ctx.lineTo(70, -130);
  ctx.stroke();
  blob(ctx, "#F8F9FA", () => ctx.roundRect(-110, -45, 220, 70, 18));
  for (let i = 0; i < 4; i++) blob(ctx, (t * 3 + i * 0.7) % 1 < 0.5 ? "#2DC653" : "#1B4332", () => circle(ctx, -60 + i * 40, -10, 9), 0);
  ctx.strokeStyle = "#3A86FF";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  for (let i = 1; i <= 3; i++) {
    ctx.globalAlpha = 0.4 + 0.6 * (((t * 2 - i * 0.3) % 1 + 1) % 1);
    ctx.beginPath();
    ctx.arc(0, -150, i * 40, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.restore();
}

/** A small table. */
export function table(ctx: Ctx, x: number, w: number, h = 330, top = "#BC6C25") {
  blob(ctx, "#8D5B3B", () => ctx.rect(x + 20, FLOOR - h, 30, h));
  blob(ctx, "#8D5B3B", () => ctx.rect(x + w - 50, FLOOR - h, 30, h));
  blob(ctx, top, () => ctx.roundRect(x, FLOOR - h - 30, w, 40, 10));
}

/** A big plate of biryani with chicken legs. */
export function biryani(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#fff", () => ellipse(ctx, 0, 0, 150, 40));
  blob(ctx, "#F4A261", () => {
    ctx.moveTo(-120, -10);
    ctx.quadraticCurveTo(-90, -110, 0, -120);
    ctx.quadraticCurveTo(90, -110, 120, -10);
    ctx.closePath();
  });
  ctx.fillStyle = "#FFE8A3";
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ellipse(ctx, -90 + ((i * 37) % 180), -20 - ((i * 23) % 80), 10, 5, i);
    ctx.fill();
  }
  chickenLeg(ctx, 40, -100, 0.6);
  // Steam.
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 8;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.7 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) ctx.lineTo(-50 + i * 50 + Math.sin(k + t * 4) * 10, -140 - ph * 80 - k * 10);
    ctx.stroke();
  }
  ctx.restore();
}

/** A chicken leg, its bone pointing up-left. */
export function chickenLeg(ctx: Ctx, x = 0, y = 0, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  blob(ctx, "#fff", () => ctx.roundRect(-70, -12, 60, 24, 12), 6);
  blob(ctx, "#fff", () => circle(ctx, -74, -12, 14), 6);
  blob(ctx, "#fff", () => circle(ctx, -74, 12, 14), 6);
  blob(ctx, "#BC6C25", () => ellipse(ctx, 30, 0, 55, 40));
  ctx.restore();
}

/** A stove with a pot, its smoke rising: `smoke` 0–1 from a wisp to a cloud. */
export function stove(ctx: Ctx, x: number, y: number, t: number, smoke: number) {
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-150, -40, 300, 50, 10));
  blob(ctx, "#FF7B3A", () => ellipse(ctx, 0, -48, 70, 14 + Math.sin(t * 20) * 3), 0);
  blob(ctx, "#495057", () => ctx.roundRect(-100, -160, 200, 115, [10, 10, 30, 30]));
  blob(ctx, "#495057", () => ctx.rect(-130, -150, 30, 16));
  blob(ctx, "#495057", () => ctx.rect(100, -150, 30, 16));
  for (let i = 0; i < 4 + Math.round(smoke * 6); i++) {
    const ph = (t * 0.45 + i / 7) % 1;
    const r = 30 + ph * 80 * (0.4 + smoke);
    ctx.fillStyle = `rgba(52,58,64,${(1 - ph) * (0.35 + smoke * 0.5)})`;
    ctx.beginPath();
    circle(ctx, Math.sin(i * 2.3 + t) * 40 * (1 + ph), -180 - ph * 600 * (0.5 + smoke), r);
    ctx.fill();
  }
  ctx.restore();
}

/** A bowl of noodles, black when burnt. */
export function noodleBowl(ctx: Ctx, burnt: boolean) {
  blob(ctx, "#fff", () => {
    ctx.moveTo(-70, -10);
    ctx.lineTo(70, -10);
    ctx.quadraticCurveTo(60, 60, 0, 60);
    ctx.quadraticCurveTo(-60, 60, -70, -10);
  });
  ctx.strokeStyle = burnt ? "#212529" : "#FFD166";
  ctx.lineWidth = 9;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-55, -10 - i * 6);
    for (let k = 0; k < 6; k++) ctx.quadraticCurveTo(-45 + k * 20, -40 - i * 6, -35 + k * 20, -10 - i * 6);
    ctx.stroke();
  }
}

/** A noodle packet showing "2 MIN". */
export function noodlePacket(ctx: Ctx, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  blob(ctx, "#FFB703", () => ctx.roundRect(-110, -140, 220, 280, 20));
  blob(ctx, "#E63946", () => ctx.roundRect(-90, -110, 180, 90, 14));
  ctx.font = `64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("2 MIN", 0, -62);
  ctx.save();
  ctx.translate(0, 60);
  noodleBowl(ctx, false);
  ctx.restore();
  ctx.restore();
}

/** A TV on a stand; when on, its screen flickers with colour. */
export function tv(ctx: Ctx, x: number, t: number, on: boolean) {
  blob(ctx, "#8D5B3B", () => ctx.roundRect(x - 170, FLOOR - 200, 340, 200, 10));
  blob(ctx, "#2B2D42", () => ctx.roundRect(x - 190, FLOOR - 470, 380, 250, 16));
  ctx.fillStyle = on ? ["#4CC9F0", "#F72585", "#FFD166", "#80ED99"][Math.floor(t * 2) % 4] : "#111";
  ctx.fillRect(x - 165, FLOOR - 450, 330, 210);
}

/** A ceiling fan, spinning at `speed` (0 stopped). */
export function fan(ctx: Ctx, x: number, y: number, t: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(0, -400);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.scale(1, 0.32);
  ctx.rotate(angle);
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3);
    blob(ctx, "#F8F9FA", () => ctx.roundRect(20, -32, 260, 64, 30), 7);
  }
  blob(ctx, "#ADB5BD", () => circle(ctx, 0, 0, 44), 7);
  ctx.restore();
}

/** A folded sweater, held at its shoulders. */
export function sweater(ctx: Ctx, color = "#9D4EDD") {
  blob(ctx, color, () => {
    ctx.moveTo(-70, 0);
    ctx.lineTo(70, 0);
    ctx.lineTo(120, 70);
    ctx.lineTo(80, 90);
    ctx.lineTo(60, 60);
    ctx.lineTo(60, 160);
    ctx.lineTo(-60, 160);
    ctx.lineTo(-60, 60);
    ctx.lineTo(-80, 90);
    ctx.lineTo(-120, 70);
    ctx.closePath();
  });
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 5;
  for (let y = 40; y < 160; y += 30) {
    ctx.beginPath();
    ctx.moveTo(-55, y);
    ctx.lineTo(55, y);
    ctx.stroke();
  }
}

/** Snowflakes falling around a spot. */
export function snow(ctx: Ctx, x: number, y: number, t: number, w = 300) {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  for (let i = 0; i < 14; i++) {
    const fx = x - w / 2 + ((i * 97) % w) + Math.sin(t * 2 + i) * 12;
    const fy = y - 300 + ((t * 90 + i * 53) % 420);
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(fx - Math.cos(a) * 12, fy - Math.sin(a) * 12);
      ctx.lineTo(fx + Math.cos(a) * 12, fy + Math.sin(a) * 12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A shopping bag. */
export function shoppingBag(ctx: Ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 30, 30, Math.PI, 0);
  ctx.stroke();
  blob(ctx, "#F4A261", () => ctx.roundRect(-60, 30, 120, 130, 10));
}

/** A shopping list unrolling downwards to `length` pixels. */
export function list(ctx: Ctx, length: number) {
  blob(ctx, "#fff", () => ctx.rect(-50, 0, 100, length), 6);
  ctx.strokeStyle = "#ADB5BD";
  ctx.lineWidth = 5;
  for (let y = 22; y < length - 10; y += 24) {
    ctx.beginPath();
    ctx.moveTo(-34, y);
    ctx.lineTo(24 - ((y * 7) % 30), y);
    ctx.stroke();
  }
}

/** A swim ring around the waist and goggles: drawn over a standing person at `x`. */
export function swimGear(ctx: Ctx, x: number, face: 1 | -1, bob: number) {
  ctx.save();
  ctx.translate(x, FLOOR + bob);
  ctx.scale(face, 1);
  blob(ctx, "#FF006E", () => ellipse(ctx, 0, -250, 140, 46));
  ctx.fillStyle = "#fff";
  for (const sx of [-90, 0, 90]) ctx.fillRect(sx - 14, -270, 28, 40);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ellipse(ctx, 0, -250, 140, 46);
  ctx.stroke();
  // Goggles over the eyes.
  ctx.strokeStyle = "#3A86FF";
  ctx.lineWidth = 12;
  for (const ex of [-24, 60]) {
    ctx.beginPath();
    ellipse(ctx, ex, -546, 34, 30);
    ctx.stroke();
  }
  ctx.restore();
}

/** "Z z z" drifting up from a sleeper. */
export function zzz(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.font = `70px ${FONT}`;
  ctx.textAlign = "center";
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.6 + i / 3) % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    const zx = x + ph * 90 + Math.sin(ph * 6) * 15;
    const zy = y - ph * 200;
    ctx.font = `${40 + ph * 50}px ${FONT}`;
    ctx.strokeText("Z", zx, zy);
    ctx.fillText("Z", zx, zy);
  }
  ctx.restore();
}

/** Speed lines and wind blowing across. */
export function wind(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const ph = (t * 1.2 + i / 5) % 1;
    const wx = x - 300 + ph * 600;
    const wy = y + i * 70 - 140;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(wx + 60, wy - 20, wx + 120, wy);
    ctx.stroke();
  }
  ctx.restore();
}
