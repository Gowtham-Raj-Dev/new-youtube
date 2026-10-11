/** Shorts are rendered on this canvas. */
export const SHORT_WIDTH = 1080;
export const SHORT_HEIGHT = 1920;

/** A banner is scaled to the full width; taller than this it is shrunk to fit, so the video always keeps some room. */
export const BANNER_MAX_HEIGHT = 800;
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;

export const BANNER_POSITIONS = ["top", "bottom"] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];

export const BANNER_IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type BannerImageType = keyof typeof BANNER_IMAGE_TYPES;

/** Height in canvas pixels (always even, as H.264 needs) of an image `width`×`height` used as a banner. */
export function bannerHeight(width: number, height: number): number {
  const scaled = Math.round((SHORT_WIDTH * height) / width);
  return Math.max(2, Math.min(BANNER_MAX_HEIGHT, scaled - (scaled % 2)));
}
