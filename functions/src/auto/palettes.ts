/** Colour moods for AI Shorts. The script writer picks one by name. */
export interface Palette {
  /** Background gradient, top to bottom. */
  top: string;
  bottom: string;
  /** Soft glowing shapes drifting behind the text. */
  glows: [string, string, string];
  /** The highlighted word, the progress bar and the line art. */
  accent: string;
  /** Text on the accent colour. */
  onAccent: string;
}

export const PALETTES = {
  sunrise: { top: "#2b0f3a", bottom: "#0c0716", glows: ["#ff7a59", "#ffb347", "#d6336c"], accent: "#ffb347", onAccent: "#1a0b12" },
  ocean: { top: "#062a45", bottom: "#030b16", glows: ["#1fb6ff", "#21d4b4", "#3a5bff"], accent: "#3ee8d0", onAccent: "#04201d" },
  violet: { top: "#24104f", bottom: "#08060f", glows: ["#8b6cff", "#c86bff", "#4b6bff"], accent: "#b9a4ff", onAccent: "#140a2e" },
  forest: { top: "#0d2e22", bottom: "#040d09", glows: ["#2fd47c", "#a3e635", "#14b8a6"], accent: "#a3e635", onAccent: "#0d1a05" },
  ember: { top: "#3a0d0d", bottom: "#0d0505", glows: ["#ff4d4d", "#ff8a3d", "#ffd23f"], accent: "#ffd23f", onAccent: "#211800" },
  midnight: { top: "#101a3a", bottom: "#05070f", glows: ["#4f7cff", "#9a6bff", "#2ec5ff"], accent: "#ffd166", onAccent: "#1f1600" },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
export const PALETTE_NAMES = Object.keys(PALETTES) as [PaletteName, ...PaletteName[]];
