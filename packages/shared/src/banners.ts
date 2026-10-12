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

/** How much of the Short's height a reaction video may take, in percent. */
export const REACTION_PERCENT_MIN = 20;
export const REACTION_PERCENT_MAX = 50;
export const REACTION_PERCENT_DEFAULT = 35;
/** The Short's own video always keeps at least this much of the height, in percent. */
export const MAIN_VIDEO_PERCENT_MIN = 25;

export const REACTION_FITS = ["fill", "fit"] as const;
export type ReactionFit = (typeof REACTION_FITS)[number];

/** Where the reaction strip goes: above the Short's own video, or below it. */
export const REACTION_POSITIONS = ["top", "bottom"] as const;
export type ReactionPosition = (typeof REACTION_POSITIONS)[number];

/** A reaction video played in a strip above or below the Short's own video, looped for as long as the Short runs. */
export interface ReactionLook {
  position: ReactionPosition;
  /** Height of the strip as a share of the Short, in percent. */
  percent: number;
  /** `fill` crops the reaction video to cover the strip; `fit` shows all of it, on black. */
  fit: ReactionFit;
  /** With `fill`, which part is kept: 0 is the top of the reaction video, 1 the bottom. */
  focus: number;
  /** Whether the reaction video's own sound is heard, mixed in with the Short's. Off, only the Short is heard. */
  sound: boolean;
}

/** Height in canvas pixels (always even, as H.264 needs) of a reaction strip covering `percent` of the Short. */
export function reactionHeight(percent: number): number {
  const clamped = Math.min(REACTION_PERCENT_MAX, Math.max(REACTION_PERCENT_MIN, percent || REACTION_PERCENT_MIN));
  return 2 * Math.round((SHORT_HEIGHT * clamped) / 200);
}

/** Height in canvas pixels (always even, as H.264 needs) of an image `width`×`height` used as a banner. */
export function bannerHeight(width: number, height: number): number {
  const scaled = Math.round((SHORT_WIDTH * height) / width);
  return Math.max(2, Math.min(BANNER_MAX_HEIGHT, scaled - (scaled % 2)));
}
