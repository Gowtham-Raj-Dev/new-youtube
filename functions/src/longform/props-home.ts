import type { SKRSContext2D } from "@napi-rs/canvas";
import { FLOOR, INK, blob, circle, ellipse, drawPerson, type Look } from "../auto/cartoon";

/** Household things for the long videos, in the Shorts' flat style. */

type Ctx = SKRSContext2D;
const FONT = `"ShortFlow Bold"`;

/** A front door in a frame; `open` 0–1 swings it in. */
export function frontDoor(ctx: Ctx, x: number, open: number) {
  blob(ctx, "#3A2E39", () => ctx.rect(x - 130, FLOOR - 560, 260, 560));
  ctx.strokeStyle = "#8D5B3B";
  ctx.lineWidth = 26;
  ctx.strokeRect(x - 130, FLOOR - 560, 260, 560);
  const w = 260 * (1 - open * 0.75);
  blob(ctx, "#A9744F", () => ctx.rect(x - 130, FLOOR - 560, w, 560));
  blob(ctx, "#FFD166", () => circle(ctx, x - 130 + w - 30, FLOOR - 280, 12), 5);
}

/** A pressure cooker on the stove; `shake` 0–1 rattles it and puffs steam from the whistle. */
export function cooker(ctx: Ctx, x: number, y: number, t: number, shake: number) {
  ctx.save();
  ctx.translate(x + Math.sin(t * 70) * 5 * shake, y);
  blob(ctx, "#CED4DA", () => ctx.roundRect(-90, -150, 180, 150, [20, 20, 30, 30]));
  blob(ctx, "#ADB5BD", () => ctx.roundRect(-100, -170, 200, 30, 12));
  blob(ctx, "#2B2D42", () => ctx.roundRect(70, -165, 120, 22, 10));
  blob(ctx, "#2B2D42", () => ctx.roundRect(-14, -215 - shake * 14 * Math.abs(Math.sin(t * 40)), 28, 46, 8));
  if (shake > 0.1) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const ph = (t * 2.5 + i / 6) % 1;
      ctx.globalAlpha = (1 - ph) * shake;
      ctx.beginPath();
      circle(ctx, Math.sin(i * 2 + t) * 30 * ph, -230 - ph * 260, 20 + ph * 50);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A gas stove top. */
export function stoveTop(ctx: Ctx, x: number, y: number, t: number, flames: boolean[]) {
  blob(ctx, "#495057", () => ctx.roundRect(x - 260, y - 30, 520, 50, 12));
  for (const [i, on] of flames.entries()) {
    if (!on) continue;
    const fx = x - 130 + i * 260;
    blob(ctx, "#FF7B3A", () => ellipse(ctx, fx, y - 36, 60, 12 + Math.sin(t * 20 + i) * 3), 0);
    blob(ctx, "#4CC9F0", () => ellipse(ctx, fx, y - 32, 40, 6), 0);
  }
}

/** A kadaai (wok); `smoke` 0–1 from a wisp to a black cloud; `burnt` darkens the oil. */
export function kadaai(ctx: Ctx, x: number, y: number, t: number, smoke: number, burnt = false) {
  ctx.save();
  ctx.translate(x, y);
  blob(ctx, "#343A40", () => {
    ctx.moveTo(-110, -60);
    ctx.quadraticCurveTo(0, 30, 110, -60);
    ctx.closePath();
  });
  blob(ctx, burnt ? "#111" : "#F4A261", () => ellipse(ctx, 0, -58, 96, 12), 0);
  blob(ctx, "#343A40", () => ctx.roundRect(100, -70, 26, 16, 6), 5);
  blob(ctx, "#343A40", () => ctx.roundRect(-126, -70, 26, 16, 6), 5);
  for (let i = 0; i < Math.round(smoke * 9); i++) {
    const ph = (t * 0.5 + i / 9) % 1;
    ctx.fillStyle = `rgba(40,40,45,${(1 - ph) * (0.3 + smoke * 0.5)})`;
    ctx.beginPath();
    circle(ctx, Math.sin(i * 2.3 + t) * 50 * (1 + ph), -90 - ph * 700 * (0.4 + smoke), 30 + ph * 110 * smoke);
    ctx.fill();
  }
  ctx.restore();
}

/** A steel pot, filled with watery kanji when `kanji`. */
export function pot(ctx: Ctx, kanji: boolean, steam = 0, t = 0) {
  blob(ctx, "#CED4DA", () => ctx.roundRect(-80, -100, 160, 100, [10, 10, 26, 26]));
  if (kanji) blob(ctx, "#F8F9FA", () => ellipse(ctx, 0, -96, 74, 12), 4);
  if (steam > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 8;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.8 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * steam;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) ctx.lineTo(-40 + i * 40 + Math.sin(k + t * 4) * 8, -110 - ph * 80 - k * 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** A front-loading washing machine; `spin` 0–1 shakes it and whirls the clothes behind its glass. */
export function washingMachine(ctx: Ctx, x: number, t: number, spin: number, colours: string[]) {
  ctx.save();
  ctx.translate(x + Math.sin(t * 60) * 6 * spin, FLOOR);
  blob(ctx, "#F8F9FA", () => ctx.roundRect(-150, -380, 300, 380, 18));
  blob(ctx, "#DEE2E6", () => ctx.rect(-150, -380, 300, 70));
  blob(ctx, "#4CC9F0", () => circle(ctx, 90, -345, 14), 4);
  blob(ctx, "#ADB5BD", () => circle(ctx, 0, -170, 110));
  ctx.save();
  ctx.beginPath();
  circle(ctx, 0, -170, 92);
  ctx.clip();
  ctx.fillStyle = "#BDE0FE";
  ctx.fillRect(-100, -270, 200, 200);
  const a = t * 14 * spin;
  colours.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ellipse(ctx, Math.cos(a + i * 2.1) * 45, -170 + Math.sin(a + i * 2.1) * 45, 46, 26, a + i);
    ctx.fill();
  });
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  circle(ctx, 0, -170, 92);
  ctx.stroke();
  ctx.restore();
}

/** A shirt held by its shoulders: white, pink, or pink with bleached white patches. */
export function shirt(ctx: Ctx, colour: string, patches = false) {
  blob(ctx, colour, () => {
    ctx.moveTo(-70, 0);
    ctx.lineTo(-20, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(20, 0);
    ctx.lineTo(70, 0);
    ctx.lineTo(120, 70);
    ctx.lineTo(80, 92);
    ctx.lineTo(60, 64);
    ctx.lineTo(60, 170);
    ctx.lineTo(-60, 170);
    ctx.lineTo(-60, 64);
    ctx.lineTo(-80, 92);
    ctx.lineTo(-120, 70);
    ctx.closePath();
  });
  if (patches) {
    ctx.fillStyle = "#fff";
    for (const [px, py, rx, ry] of [[-25, 60, 26, 18], [28, 100, 20, 28], [-10, 140, 30, 14], [40, 40, 14, 12]]) {
      ctx.beginPath();
      ellipse(ctx, px, py, rx, ry, px);
      ctx.fill();
    }
  }
}

/** A towel hanging from the hand, swaying; striped at the ends like a real one. */
export function towel(ctx: Ctx, colour = "#E63946", t = 0) {
  const sway = Math.sin(t * 8) * 18;
  blob(ctx, colour, () => {
    ctx.moveTo(-50, -10);
    ctx.lineTo(50, -10);
    ctx.quadraticCurveTo(60 + sway, 90, 45 + sway * 1.5, 190);
    ctx.lineTo(-55 + sway * 1.5, 190);
    ctx.quadraticCurveTo(-60 + sway, 90, -50, -10);
    ctx.closePath();
  });
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 8;
  for (const y of [160, 175]) {
    ctx.beginPath();
    ctx.moveTo(-52 + sway * 1.4, y);
    ctx.lineTo(46 + sway * 1.4, y);
    ctx.stroke();
  }
}

/** A water jug, tipped by `tip` 0–1, pouring when tipped far enough. */
export function jug(ctx: Ctx, tip: number) {
  ctx.save();
  ctx.rotate(-tip * 1.4);
  blob(ctx, "#4CC9F0", () => {
    ctx.moveTo(-40, -110);
    ctx.lineTo(40, -110);
    ctx.lineTo(55, 20);
    ctx.lineTo(-55, 20);
    ctx.closePath();
  });
  blob(ctx, "#BDE0FE", () => ctx.rect(-36, -60, 72, 70), 0);
  ctx.restore();
}

/** A big steel spoon. */
export function spoon(ctx: Ctx) {
  blob(ctx, "#CED4DA", () => ctx.roundRect(-8, -120, 16, 110, 6), 5);
  blob(ctx, "#CED4DA", () => ellipse(ctx, 0, -135, 26, 18), 5);
}

/** Chithi's house for the valaikaappu: pink walls, a marigold garland, banana trees at the sides. */
export function functionHall(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = "#FFC8DD";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  for (let x = 0; x < w; x += 90) ctx.fillRect(x, 0, 40, h);
  // Banana trees.
  for (const x of [40, w - 40]) {
    blob(ctx, "#52B788", () => ctx.rect(x - 14, 160, 28, h - 160));
    for (let i = 0; i < 4; i++) blob(ctx, "#40916C", () => ellipse(ctx, x + (i % 2 ? 50 : -50), 200 + i * 90, 70, 22, (i % 2 ? 0.5 : -0.5) + Math.sin(t * 2 + i) * 0.05), 5);
  }
  // A marigold garland across the top.
  for (let i = 0; i <= 14; i++) {
    const x = (i / 14) * w;
    const y = 90 + Math.sin((i / 14) * Math.PI) * 70;
    blob(ctx, i % 2 ? "#FF9F1C" : "#FFD400", () => circle(ctx, x, y, 20), 4);
  }
}

/** A bleach bottle. */
export function bleach(ctx: Ctx) {
  blob(ctx, "#F8F9FA", () => ctx.roundRect(-40, -110, 80, 120, 14));
  blob(ctx, "#4361EE", () => ctx.rect(-14, -136, 28, 26));
  blob(ctx, "#4361EE", () => ctx.rect(-30, -70, 60, 40), 0);
}

/** A tulsi maadam with its plant: `wilt` 0–1 droops and browns it; `plastic` makes it shiny and stiff, `fallen` tips it over. */
export function tulsi(ctx: Ctx, x: number, t: number, wilt: number, plastic = false, fallen = 0) {
  blob(ctx, "#E76F51", () => ctx.roundRect(x - 70, FLOOR - 230, 140, 230, 10));
  blob(ctx, "#F4A261", () => ctx.rect(x - 85, FLOOR - 250, 170, 30));
  ctx.save();
  ctx.translate(x, FLOOR - 250);
  // Tips over to the left, towards whoever is watering it.
  ctx.rotate(-fallen * 1.4);
  ctx.translate(0, -fallen * 20);
  const green = plastic ? "#2DC653" : wilt > 0.5 ? "#9C6644" : "#40916C";
  ctx.strokeStyle = plastic ? "#1B4332" : "#6B4226";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wilt * 60, -90, wilt * 120, -160 + wilt * 110);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const sway = plastic ? 0 : Math.sin(t * 2 + i) * 4;
    const lx = wilt * 120 * k * k + (i % 2 ? 26 : -26) + sway;
    const ly = -160 * k + wilt * 110 * k * k;
    blob(ctx, green, () => ellipse(ctx, lx, ly, 26, 14, (i % 2 ? 0.5 : -0.5) + wilt * 1.2), 5);
  }
  if (plastic) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(-20, -120, 10, 30);
  }
  ctx.restore();
}

/** A sofa. */
export function sofa(ctx: Ctx, x: number, w = 520, colour = "#6A4C93") {
  blob(ctx, colour, () => ctx.roundRect(x, FLOOR - 330, w, 170, 30));
  blob(ctx, colour, () => ctx.roundRect(x - 20, FLOOR - 220, w + 40, 150, 30));
  blob(ctx, "#8D5B3B", () => ctx.rect(x + 20, FLOOR - 70, 26, 70));
  blob(ctx, "#8D5B3B", () => ctx.rect(x + w - 46, FLOOR - 70, 26, 70));
}

/** A fridge; `open` 0–1 swings its door, showing the shelves. */
export function fridge(ctx: Ctx, x: number, open: number, inside?: (c: Ctx) => void) {
  blob(ctx, "#E9ECEF", () => ctx.roundRect(x - 120, FLOOR - 560, 240, 560, 18));
  if (open > 0) {
    blob(ctx, "#F8F9FA", () => ctx.rect(x - 105, FLOOR - 540, 210, 520), 6);
    ctx.fillStyle = "#BDE0FE";
    for (const y of [FLOOR - 420, FLOOR - 280, FLOOR - 140]) ctx.fillRect(x - 105, y, 210, 8);
    if (inside) {
      ctx.save();
      ctx.translate(x, FLOOR - 290);
      inside(ctx);
      ctx.restore();
    }
  }
  const w = 240 * (1 - open * 0.8);
  blob(ctx, "#DEE2E6", () => ctx.roundRect(x - 120, FLOOR - 560, w, 560, 18));
  blob(ctx, "#ADB5BD", () => ctx.roundRect(x - 120 + w - 34, FLOOR - 420, 14, 120, 6), 5);
}

/** A small oven on a stand; `open` shows what's inside; `smoke` from its door. */
export function oven(ctx: Ctx, x: number, t: number, open: number, smoke: number) {
  blob(ctx, "#8D5B3B", () => ctx.rect(x - 130, FLOOR - 300, 260, 300));
  blob(ctx, "#343A40", () => ctx.roundRect(x - 140, FLOOR - 500, 280, 200, 16));
  blob(ctx, open > 0.5 ? "#111" : "#495057", () => ctx.roundRect(x - 120, FLOOR - 480, 180, 160, 10), 6);
  blob(ctx, "#ADB5BD", () => circle(ctx, x + 95, FLOOR - 440, 14), 4);
  blob(ctx, "#ADB5BD", () => circle(ctx, x + 95, FLOOR - 380, 14), 4);
  for (let i = 0; i < Math.round(smoke * 8); i++) {
    const ph = (t * 0.5 + i / 8) % 1;
    ctx.fillStyle = `rgba(40,40,45,${(1 - ph) * 0.6 * smoke})`;
    ctx.beginPath();
    circle(ctx, x - 30 + Math.sin(i * 2 + t) * 40, FLOOR - 480 - ph * 400, 26 + ph * 80);
    ctx.fill();
  }
}

/** A steel beero (cupboard); `open` swings its doors, `drop` 0–1 drops the shirt out. */
export function beero(ctx: Ctx, x: number, open: number, drop: number) {
  blob(ctx, "#8D99AE", () => ctx.roundRect(x - 150, FLOOR - 640, 300, 640, 10));
  if (open > 0) {
    blob(ctx, "#2B2D42", () => ctx.rect(x - 140, FLOOR - 630, 280, 620), 0);
    ctx.fillStyle = "#E9C46A";
    ctx.fillRect(x - 130, FLOOR - 300, 260, 60);
  }
  const w = 150 * (1 - open * 0.85);
  blob(ctx, "#ADB5BD", () => ctx.rect(x - 150, FLOOR - 640, w, 640));
  blob(ctx, "#ADB5BD", () => ctx.rect(x + 150 - w, FLOOR - 640, w, 640));
  if (open === 0) {
    // A steel almirah: the mirror on one door, the handle and lock on the other.
    blob(ctx, "#E0FBFC", () => ctx.roundRect(x - 125, FLOOR - 580, 90, 300, 10), 5);
    blob(ctx, "#6C757D", () => ctx.roundRect(x + 20, FLOOR - 380, 18, 80, 6), 4);
    blob(ctx, "#FFD166", () => circle(ctx, x + 29, FLOOR - 270, 10), 3);
  }
  if (drop > 0) {
    ctx.save();
    ctx.translate(x, FLOOR - 300 + drop * 260);
    ctx.rotate(drop * 0.6);
    ctx.scale(0.8, 0.8);
    shirt(ctx, "#FF8FAB", true);
    ctx.restore();
  }
}

/** A broom (vaarukol), held at its tied end. */
export function broom(ctx: Ctx) {
  ctx.save();
  ctx.rotate(-0.4);
  ctx.strokeStyle = "#C9A227";
  ctx.lineWidth = 5;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(i * 9, -260);
    ctx.stroke();
  }
  blob(ctx, "#E63946", () => ctx.roundRect(-16, -40, 32, 50, 8), 5);
  ctx.restore();
}

/** A slipper (cheruppu). */
export function slipper(ctx: Ctx) {
  blob(ctx, "#FF7B3A", () => ellipse(ctx, 0, 0, 60, 26));
  ctx.strokeStyle = "#2B2D42";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-20, -20);
  ctx.lineTo(10, 0);
  ctx.lineTo(-20, 20);
  ctx.stroke();
}

/** A box of sweets with a ribbon. */
export function sweetBox(ctx: Ctx, open = false) {
  blob(ctx, "#FFB703", () => ctx.roundRect(-70, -10, 140, 80, 10));
  if (open) {
    for (let i = 0; i < 6; i++) blob(ctx, i % 2 ? "#F4A261" : "#E9C46A", () => circle(ctx, -45 + (i % 3) * 45, 10 + Math.floor(i / 3) * 30, 16), 4);
  } else {
    blob(ctx, "#E63946", () => ctx.rect(-8, -10, 16, 80), 0);
    blob(ctx, "#E63946", () => ctx.rect(-70, 22, 140, 14), 0);
  }
}

/** A travel bag held by its handle. */
export function travelBag(ctx: Ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(0, 20, 26, Math.PI, 0);
  ctx.stroke();
  blob(ctx, "#6A4C93", () => ctx.roundRect(-80, 20, 160, 120, 20));
}

/** A chips packet, crimped at both ends, with CHIPS on it. */
export function chips(ctx: Ctx) {
  blob(ctx, "#FFD400", () => {
    ctx.moveTo(-60, -10);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-60 + i * 20, i % 2 ? -22 : -10);
    ctx.lineTo(60, 150);
    for (let i = 6; i >= 0; i--) ctx.lineTo(-60 + i * 20, i % 2 ? 162 : 150);
    ctx.closePath();
  });
  blob(ctx, "#E63946", () => ctx.roundRect(-46, 40, 92, 50, 10), 0);
  ctx.font = `30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("CHIPS", 0, 67);
}

/** A wall clock showing `hours` (e.g. 4.5 for half past four). */
export function wallClock(ctx: Ctx, x: number, y: number, hours: number, r = 70) {
  blob(ctx, "#fff", () => circle(ctx, x, y, r));
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  const minute = (hours % 1) * Math.PI * 2 - Math.PI / 2;
  const hour = ((hours % 12) / 12) * Math.PI * 2 - Math.PI / 2;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(minute) * r * 0.75, y + Math.sin(minute) * r * 0.75);
  ctx.stroke();
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hour) * r * 0.5, y + Math.sin(hour) * r * 0.5);
  ctx.stroke();
}

/** A big phone floating in, showing someone on a call (`who` drawn as a bust). */
export function callBubble(ctx: Ctx, x: number, y: number, p: number, t: number, who: Look, talk: number, label: string, video = true) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p, p);
  ctx.rotate(Math.sin(t * 1.5) * 0.02);
  blob(ctx, "#2B2D42", () => ctx.roundRect(-150, -240, 300, 480, 36));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-130, -210, 260, 400, 22);
  ctx.clip();
  ctx.fillStyle = video ? "#FFD6A5" : "#2B2D42";
  ctx.fillRect(-130, -210, 260, 400);
  if (video) drawPerson(ctx, 0, 560, who, { t, talk, face: 1, mood: "normal", scale: 0.9 });
  else {
    ctx.fillStyle = "#4CC9F0";
    ctx.beginPath();
    circle(ctx, 0, -40, 70 + talk * 12);
    ctx.fill();
  }
  ctx.restore();
  ctx.font = `30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(label, 0, 215);
  ctx.restore();
}
