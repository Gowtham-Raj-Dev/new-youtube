import { SHORT_HEIGHT, SHORT_WIDTH } from "@shortflow/shared";
import { fontOf, loadTextFonts } from "./text-fonts";

/**
 * Text boxes put on every Short: a box the user places and sizes by its four
 * corners; the text wraps inside it and shrinks to fit when it is too long.
 * Drawn on a canvas by the browser (so Tamil comes out right), the same way
 * for the preview, for the browser renderer and — as a picture — for the PC helper.
 */
export interface TextBox {
  id: string;
  /** `{n}` the part number, `{total}` how many parts, `{title}` the video's title. New lines are kept. */
  text: string;
  /** Box position and size, as 0–1 shares of the 1080×1920 frame. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Letter size on the 1080-wide frame. Smaller when the text needs it to fit. */
  size: number;
  font: string;
  color: string;
  /** `box`: a coloured box behind the text. `none`: just the text, with an outline so it reads on any picture. */
  background: "none" | "box";
  backgroundColor: string;
  /** 0–1. */
  backgroundOpacity: number;
  align: "left" | "center" | "right";
  outline: boolean;
}

export interface TextVars {
  n: number;
  total: number;
  title: string;
}

export const fillText = (template: string, vars: TextVars) =>
  template.replaceAll("{n}", String(vars.n)).replaceAll("{total}", String(vars.total)).replaceAll("{title}", vars.title);

/** Whether the text differs from one Short to the next. */
export const changesPerPart = (boxes: TextBox[]) => boxes.some((b) => b.text.includes("{n}") || b.text.includes("{total}"));

const newId = () => Math.random().toString(36).slice(2, 10);

export function newTextBox(kind: "part" | "title" | "plain" = "plain"): TextBox {
  const base: TextBox = {
    id: newId(),
    text: "Your text",
    x: 0.08,
    y: 0.72,
    w: 0.84,
    h: 0.1,
    size: 64,
    font: "catamaran",
    color: "#ffffff",
    background: "none",
    backgroundColor: "#000000",
    backgroundOpacity: 0.6,
    align: "center",
    outline: true,
  };
  if (kind === "part") return { ...base, text: "Part {n}", x: 0.32, y: 0.24, w: 0.36, h: 0.06, size: 60, background: "box", outline: false };
  if (kind === "title") return { ...base, text: "{title}", x: 0.05, y: 0.06, w: 0.9, h: 0.12, size: 64 };
  return base;
}

// ─── Remembered between visits, so every video gets the same text unless it is changed ───

const KEY = "shortflow:text-boxes";

function isBox(value: unknown): value is TextBox {
  const b = value as TextBox | null;
  const share = (n: unknown) => typeof n === "number" && n >= 0 && n <= 1;
  return typeof b === "object" && b !== null && typeof b.id === "string" && typeof b.text === "string" && share(b.x) && share(b.y) && share(b.w) && share(b.h) && typeof b.size === "number";
}

export function readTextBoxes(): TextBox[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;
    if (Array.isArray(saved)) return saved.filter(isBox).map((b) => ({ ...newTextBox(), ...b }));
  } catch {
    // Nothing saved, or storage is off.
  }
  return [newTextBox("part")];
}

export function rememberTextBoxes(boxes: TextBox[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(boxes));
  } catch {
    // Storage off or full: just not remembered.
  }
}

// ─── Drawing ───

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
/** Letters as people see them — a Tamil letter with its vowel sign stays in one piece. */
const graphemes = (word: string) => (segmenter ? [...segmenter.segment(word)].map((s) => s.segment) : [...word]);

/** Breaks `text` into lines no wider than `max`; a word too long for a line is broken between letters. */
function wrap(ctx: Ctx, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const tried = line ? `${line} ${word}` : word;
      if (ctx.measureText(tried).width <= max) {
        line = tried;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= max) {
        line = word;
        continue;
      }
      line = "";
      for (const letter of graphemes(word)) {
        if (line && ctx.measureText(line + letter).width > max) {
          lines.push(line);
          line = letter;
        } else line += letter;
      }
    }
    lines.push(line);
  }
  return lines;
}

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

/** Draws the boxes on a canvas `width`×`height` (the Short's shape, any size). */
export function drawTextBoxes(ctx: Ctx, boxes: TextBox[], vars: TextVars, width: number, height: number) {
  const scale = width / SHORT_WIDTH;
  for (const box of boxes) {
    const text = fillText(box.text, vars).trim();
    const bx = box.x * width;
    const by = box.y * height;
    const bw = box.w * width;
    const bh = box.h * height;
    const font = fontOf(box.font);
    let size = box.size * scale;
    let lines: string[] = [];
    let pad = 0;
    // The biggest letters up to the chosen size that let the text fit the box.
    for (let tries = 0; tries < 40; tries++) {
      ctx.font = `${font.weight} ${size}px ${font.family}`;
      pad = box.background === "box" ? size * 0.3 : box.outline ? size * 0.12 : 0;
      lines = text ? wrap(ctx, text, Math.max(1, bw - 2 * pad)) : [];
      const tall = lines.length * size * 1.25 + 2 * pad;
      const wide = Math.max(0, ...lines.map((l) => ctx.measureText(l).width)) + 2 * pad;
      if ((tall <= bh && wide <= bw + 0.5) || size <= 8 * scale) break;
      size *= 0.94;
    }

    ctx.save();
    if (box.background === "box") {
      ctx.fillStyle = hexToRgba(box.backgroundColor, box.backgroundOpacity);
      const r = Math.min(bh / 2, size * 0.28);
      ctx.beginPath();
      if ("roundRect" in ctx) ctx.roundRect(bx, by, bw, bh, r);
      else (ctx as CanvasRenderingContext2D).rect(bx, by, bw, bh);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
    ctx.textBaseline = "middle";
    ctx.textAlign = box.align;
    const lineHeight = size * 1.25;
    const x = box.align === "left" ? bx + pad : box.align === "right" ? bx + bw - pad : bx + bw / 2;
    let y = by + (bh - lines.length * lineHeight) / 2 + lineHeight / 2;
    for (const line of lines) {
      if (box.outline) {
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(2 * scale, size * 0.14);
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = box.color;
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    ctx.restore();
  }
}

/** The boxes on a see-through 1080×1920 picture, for laying over a Short. Null when there is nothing to draw. */
export async function renderTextLayer(boxes: TextBox[], vars: TextVars): Promise<OffscreenCanvas | null> {
  const used = boxes.filter((b) => fillText(b.text, vars).trim());
  if (used.length === 0) return null;
  await loadTextFonts(used.map((b) => b.font));
  const canvas = new OffscreenCanvas(SHORT_WIDTH, SHORT_HEIGHT);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawTextBoxes(ctx, used, vars, SHORT_WIDTH, SHORT_HEIGHT);
  return canvas;
}

/** The same picture as PNG, base64 — the form the PC helper takes it in. */
export async function textLayerPng(canvas: OffscreenCanvas): Promise<string> {
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
