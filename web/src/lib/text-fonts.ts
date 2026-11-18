import { Catamaran, Mukta_Malar, Noto_Sans_Tamil } from "next/font/google";

/**
 * Fonts for the text on Shorts. All of them have Tamil and English letters,
 * and they are served with the site, so the preview and the finished Shorts use
 * exactly the same letters on every PC.
 */
const catamaran = Catamaran({ subsets: ["latin", "tamil"], weight: ["800"], display: "swap" });
const mukta = Mukta_Malar({ subsets: ["latin", "tamil"], weight: ["800"], display: "swap" });
const noto = Noto_Sans_Tamil({ subsets: ["latin", "tamil"], weight: ["700"], display: "swap" });

export const TEXT_FONTS = [
  { id: "catamaran", label: "Catamaran", family: catamaran.style.fontFamily, weight: 800 },
  { id: "mukta", label: "Mukta", family: mukta.style.fontFamily, weight: 800 },
  { id: "noto", label: "Noto Sans", family: noto.style.fontFamily, weight: 700 },
  { id: "system", label: "Arial", family: "Arial, 'Nirmala UI', sans-serif", weight: 700 },
] as const;

export type TextFontId = (typeof TEXT_FONTS)[number]["id"];

export const fontOf = (id: string) => TEXT_FONTS.find((f) => f.id === id) ?? TEXT_FONTS[0];

/** Waits until the fonts are ready to draw on a canvas (a canvas doesn't wait by itself). */
export async function loadTextFonts(ids: Iterable<string>) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([...new Set(ids)].map((id) => {
    const font = fontOf(id);
    return document.fonts.load(`${font.weight} 48px ${font.family}`, "தமிழ் Aa").catch(() => undefined);
  }));
}
