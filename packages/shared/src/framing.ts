/**
 * Where the Short's own video sits in the space the banners and the reaction
 * video leave (its "slot"). The user sets how big it is and moves it up/down
 * and left/right; whatever it doesn't cover is black or a blurred copy.
 * The PC helper (FFmpeg), the browser renderer and the web preview all place
 * the picture with `placePicture()`, so what is previewed is what is made.
 */
export interface Framing {
  /** Width of the picture as a share of the frame's width: 1 = edge to edge, 2 = twice as wide (sides cut off). */
  zoom: number;
  /** 0 = picture against the left edge (or its left side shown), 1 = right; 0.5 = centred. */
  x: number;
  /** 0 = picture against the top of the slot (or its top shown), 1 = bottom; 0.5 = centred. */
  y: number;
}

export const FRAMING_ZOOM_MIN = 0.3;
export const FRAMING_ZOOM_MAX = 8;

export function isFraming(value: unknown): value is Framing {
  const f = value as Framing | null;
  const share = (n: unknown) => typeof n === "number" && n >= 0 && n <= 1;
  return typeof f === "object" && f !== null && typeof f.zoom === "number" && f.zoom >= FRAMING_ZOOM_MIN && f.zoom <= FRAMING_ZOOM_MAX && share(f.x) && share(f.y);
}

/** Zoom at which a `pw`×`ph` picture shows whole in a `slotW`×`slotH` slot. */
export function wholeZoom(pw: number, ph: number, slotW: number, slotH: number): number {
  return Math.min(1, (slotH * pw) / (ph * slotW));
}

/** Zoom at which a `pw`×`ph` picture covers a `slotW`×`slotH` slot completely (sides or top/bottom cut off). */
export function fillZoom(pw: number, ph: number, slotW: number, slotH: number): number {
  return Math.max(1, (slotH * pw) / (ph * slotW));
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of the picture that shows (`source`, in picture pixels) and where it
 * lands in the slot (`dest`, in slot pixels). `covers` says the slot is filled.
 */
export function placePicture(pw: number, ph: number, slotW: number, slotH: number, framing: Framing): { source: Rect; dest: Rect; covers: boolean } {
  const width = slotW * framing.zoom;
  const scale = width / pw;
  const height = ph * scale;
  const left = (slotW - width) * framing.x;
  const top = (slotH - height) * framing.y;
  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(slotW, left + width);
  const y1 = Math.min(slotH, top + height);
  return {
    dest: { x: x0, y: y0, width: Math.max(0, x1 - x0), height: Math.max(0, y1 - y0) },
    source: { x: (x0 - left) / scale, y: (y0 - top) / scale, width: Math.max(0, x1 - x0) / scale, height: Math.max(0, y1 - y0) / scale },
    covers: x0 <= 0.5 && y0 <= 0.5 && x1 >= slotW - 0.5 && y1 >= slotH - 0.5,
  };
}
