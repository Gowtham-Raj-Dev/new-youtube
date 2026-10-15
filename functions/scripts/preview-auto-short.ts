/**
 * Renders a sample AI Short on this machine, without Claude or Text-to-Speech:
 * a fixed script with silent narration. For checking the animation.
 *
 *   npm run preview-auto -- <output folder> [palette]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PALETTES, type PaletteName } from "../src/auto/palettes";
import { renderShort } from "../src/auto/render";
import { silentNarration } from "../src/auto/voice";

const SAMPLE = [
  { screen: "Unoda periya enemy nee dhaan", highlight: "enemy" },
  { screen: "Naalaiku pannalam nu solra andha voice", highlight: "naalaiku" },
  { screen: "Indha nimisham start pannu, chinna step podhum", highlight: "start" },
  { screen: "Daily konjam konjam, oru naal periya maatram", highlight: "maatram" },
  { screen: "Daily motivation ku follow pannunga", highlight: "follow" },
];

async function main() {
  const out = resolve(process.argv[2] ?? ".local/preview");
  const paletteName = (process.argv[3] ?? "violet") as PaletteName;
  await mkdir(out, { recursive: true });

  const narration = silentNarration([2.6, 3.2, 3.6, 3.4, 2.4]);
  const started = Date.now();
  const short = await renderShort(
    {
      scenes: SAMPLE.map((line, i) => ({ ...line, ...narration.spans[i] })),
      narration,
      palette: PALETTES[paletteName],
      label: "Daily Motivation",
      handle: "@shortflow",
      seed: 7,
    },
    out,
  );
  await writeFile(join(out, "thumbnail.jpg"), short.thumbnail);
  console.log(`Rendered ${short.durationSec.toFixed(1)} s in ${((Date.now() - started) / 1000).toFixed(1)} s → ${join(out, "short.mp4")}`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
