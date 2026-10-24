/**
 * Renders "Amma Oorukku Pona Oru Naal" with its recorded voices (silent where
 * a line has none yet).
 *
 *   npm run long-video                     1440p → Videos/01 …/Amma Oorukku Pona Oru Naal.mp4
 *   npm run long-video -- --sheet=24       a sheet of 24 frames across the video → TEST_OUT/long-sheet-*.jpg
 *   npm run long-video -- --at=12.5,40     single frames at those seconds → TEST_OUT/long-<t>.jpg
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { buildEpisode } from "../src/longform/amma-oorukku-video";
import { framePainter, renderEpisode } from "../src/longform/episode";

const DIR = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Videos", "01 Amma Oorukku Pona Oru Naal");

function pieces(): Record<string, Buffer> {
  const file = join(DIR, "voice", "splits.json");
  if (!existsSync(file)) return {};
  const splits = JSON.parse(readFileSync(file, "utf8")) as Record<string, Array<{ n: string; from: number; to: number }>>;
  const out: Record<string, Buffer> = {};
  for (const [take, parts] of Object.entries(splits)) {
    const pcm = readFileSync(join(DIR, "voice", `${take}.pcm`));
    for (const { n, from, to } of parts) out[n] = pcm.subarray(from, to);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const voices = pieces();
  const ep = buildEpisode(voices);
  console.log(`${Object.keys(voices).length} lines voiced · ${ep.duration.toFixed(1)} s (${(ep.duration / 60).toFixed(1)} min)`);
  const test = resolve(process.env.TEST_OUT ?? join(tmpdir(), "mim-test"));

  // --check: paints every frame small, to find one that throws before a long render does.
  if (args.includes("--check")) {
    const { paint, fps } = framePainter(ep, 180);
    for (let f = 0; f < Math.ceil(ep.duration * fps); f++) {
      try {
        paint(f);
      } catch (error) {
        console.log(`frame ${f} (${(f / fps).toFixed(2)} s): ${String(error)}`);
        console.log((error as Error).stack?.split("\n").slice(1, 4).join("\n"));
        return;
      }
    }
    console.log("every frame paints");
    return;
  }

  // --thumb: the YouTube thumbnail, 1280×720: the cold open's broom moment with a big caption.
  if (args.some((a) => a.startsWith("--thumb"))) {
    const { canvas, paint, fps } = framePainter(ep, 720);
    // The cold open where all three are in the picture: Amma with the broom, the boys running.
    paint(Math.round(Number(args.find((a) => a.startsWith("--thumb="))?.slice(8) ?? 4.0) * fps));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1280 / 1920, 0, 0, 720 / 1080, 0, 0);
    // Cover the subtitle with a band, then the caption on it.
    ctx.fillStyle = "#141224";
    ctx.fillRect(0, 820, 1920, 260);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const caption = (text: string, y: number, size: number, colour: string) => {
      ctx.font = `${size}px "ShortFlow Bold", "ShortFlow Emoji"`;
      ctx.lineWidth = size / 5;
      ctx.strokeStyle = "#1E1B2E";
      ctx.strokeText(text, 960, y);
      ctx.fillStyle = colour;
      ctx.fillText(text, 960, y);
    };
    caption("AMMA SEEKIRAM VANDHUTTAANGA 😱", 950, 86, "#FFD400");
    await writeFile(join(DIR, "thumbnail.jpg"), canvas.encodeSync("jpeg", 92));
    console.log(`→ ${join(DIR, "thumbnail.jpg")}`);
    return;
  }

  // --chapters: YouTube chapter times, from the cards.
  if (args.includes("--chapters")) {
    const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    for (const card of ep.cards) console.log(`${clock(card.at)} ${card.text}`);
    return;
  }

  const sheet = Number(args.find((a) => a.startsWith("--sheet="))?.slice(8) ?? 0);
  const at = args.find((a) => a.startsWith("--at="))?.slice(5);
  if (sheet || at) {
    const { canvas, paint, fps } = framePainter(ep, 360);
    const times = at ? at.split(",").map(Number) : Array.from({ length: sheet }, (_, i) => ((i + 0.5) / sheet) * ep.duration);
    if (at) {
      for (const t of times) {
        paint(Math.round(t * fps));
        await writeFile(join(test, `long-${t}.jpg`), canvas.encodeSync("jpeg", 85));
      }
      return;
    }
    // Sheets of 4 × 3 frames, 640×360 each.
    for (let s = 0; s * 12 < times.length; s++) {
      const out = createCanvas(640 * 4, 360 * 3);
      const octx = out.getContext("2d");
      times.slice(s * 12, s * 12 + 12).forEach((t, i) => {
        paint(Math.round(t * fps));
        octx.drawImage(canvas, (i % 4) * 640, Math.floor(i / 4) * 360);
        octx.fillStyle = "#000";
        octx.fillRect((i % 4) * 640, Math.floor(i / 4) * 360, 90, 34);
        octx.fillStyle = "#fff";
        octx.font = "24px sans-serif";
        octx.fillText(t.toFixed(1), (i % 4) * 640 + 8, Math.floor(i / 4) * 360 + 26);
      });
      await writeFile(join(test, `long-sheet-${s + 1}.jpg`), out.encodeSync("jpeg", 80));
    }
    return;
  }

  const work = await mkdtemp(join(tmpdir(), "mim-long-"));
  try {
    const file = join(DIR, "Amma Oorukku Pona Oru Naal.mp4");
    const started = Date.now();
    await renderEpisode(ep, file, work, 1440);
    console.log(`→ ${file} in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  } finally {
    // Windows can hold the temp files a moment longer; a leftover temp folder is no reason to fail.
    await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => {});
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
