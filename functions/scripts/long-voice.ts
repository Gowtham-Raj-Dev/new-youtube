/**
 * Records the voices of "Amma Oorukku Pona Oru Naal" with Gemini, one take per
 * pair of speakers, and cuts each take back into its lines.
 *
 * Takes are kept for good in "Moolai Illa Machan/Videos/01 …/voice/<take>.pcm";
 * a saved take is never recorded again. Where each line sits in its take is
 * written to voice/splits.json.
 *
 *   npm run long-voice              records missing takes, then splits all
 *   npm run long-voice -- g2 g3     only these takes
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { LINES, VOICES, type LongLine } from "../src/longform/amma-oorukku";
import { geminiSpeech, splitAtLongestPauses, splitAtPauses } from "../src/auto/voice";

const DIR = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Videos", "01 Amma Oorukku Pona Oru Naal", "voice");
const BYTES_PER_SECOND = 48_000;

/** Lines in the order they are spoken in their take; a take's speakers must alternate. */
const ORDER: Record<string, string[]> = { g6: ["43", "44", "45", "66", "56", "57", "58"] };

export function takeLines(take: string): LongLine[] {
  const lines = LINES.filter((l) => l.take === take);
  const order = ORDER[take];
  return order ? order.map((n) => lines.find((l) => l.n === n)!) : lines;
}

/** Pieces of `pcm`, one per line: the usual split, or the turns, whichever comes out even. */
function split(pcm: Buffer, lines: LongLine[]): Buffer[] | null {
  const letters = lines.map((l) => l.tamil.length);
  const even = (parts: Buffer[] | null) => {
    if (!parts || parts.length !== lines.length) return false;
    const per = parts.reduce((s, p) => s + p.length, 0) / letters.reduce((s, n) => s + n, 0);
    // Short lines like "Kanji?" take longer per letter, so the range is wide.
    return parts.every((p, i) => p.length >= BYTES_PER_SECOND * 0.2 && p.length / (letters[i] * per) > 0.3 && p.length / (letters[i] * per) < 4);
  };
  const a = splitAtPauses(pcm, letters);
  if (even(a)) return a;
  const b = splitAtLongestPauses(pcm, lines.length);
  return even(b) ? b : null;
}

/**
 * Cuts at the quiet moment nearest each of `anchors` (seconds where one line
 * ends and the next begins, e.g. from a transcript), within 0.8 s of it.
 */
function splitAtAnchors(pcm: Buffer, anchors: number[]): Buffer[] | null {
  const W = 480; // 20 ms
  const quiet: boolean[] = [];
  for (let w = 0; (w + 1) * W * 2 <= pcm.length; w++) {
    let sum = 0;
    for (let i = 0; i < W; i++) sum += (pcm.readInt16LE((w * W + i) * 2) / 32768) ** 2;
    quiet.push(Math.sqrt(sum / W) < 0.0126);
  }
  const first = quiet.findIndex((q) => !q);
  let last = quiet.length - 1;
  while (last > 0 && quiet[last]) last--;
  const runs: Array<{ from: number; to: number }> = [];
  for (let w = first; w <= last; ) {
    if (!quiet[w]) { w++; continue; }
    const from = w;
    while (w <= last && quiet[w]) w++;
    if (w - from >= 4) runs.push({ from, to: w });
  }
  const cuts = anchors.map((a) => {
    const at = a / 0.02;
    const near = runs.filter((r) => Math.abs((r.from + r.to) / 2 - at) < 40).sort((x, y) => Math.abs((x.from + x.to) / 2 - at) - Math.abs((y.from + y.to) / 2 - at))[0];
    return near ?? null;
  });
  if (cuts.some((c) => !c)) return null;
  const bounds = [first, ...cuts.flatMap((c) => [c!.from, c!.to]), last + 1];
  const parts: Buffer[] = [];
  for (let i = 0; i <= anchors.length; i++) parts.push(pcm.subarray(bounds[i * 2] * W * 2, bounds[i * 2 + 1] * W * 2));
  return parts;
}

async function main() {
  const anchorArgs = Object.fromEntries(
    process.argv.slice(2).filter((a) => a.startsWith("--anchors=")).map((a) => {
      const [take, list] = a.slice(10).split(":");
      return [take, list.split(",").map(Number)];
    }),
  ) as Record<string, number[]>;
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const takes = [...new Set(LINES.map((l) => l.take))].filter((t) => !only.length || only.includes(t));
  await mkdir(DIR, { recursive: true });
  const key = (await readFile(resolve(__dirname, "..", ".secret.local"), "utf8")).match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  const splitsFile = join(DIR, "splits.json");
  const splits: Record<string, Array<{ n: string; from: number; to: number }>> = existsSync(splitsFile) ? JSON.parse(await readFile(splitsFile, "utf8")) : {};

  for (const take of takes) {
    const lines = takeLines(take);
    const file = join(DIR, `${take}.pcm`);
    if (!existsSync(file)) {
      if (!key) throw new Error("GEMINI_API_KEY is missing from functions/.secret.local");
      try {
        // The free tier also limits requests per minute: on a 429, wait a minute and try again.
        let pcm: Buffer | null = null;
        for (let attempt = 1; !pcm; attempt++) {
          try {
            pcm = await geminiSpeech(key, lines.map((l) => ({ text: l.tamil, speaker: l.speaker })), VOICES);
          } catch (error) {
            const limited = /429/.test(String(error));
            if ((!limited && !/fetch failed|ECONNRESET|ETIMEDOUT/.test(String(error))) || attempt >= 4) throw error;
            console.log(`${take}: ${limited ? "rate limited" : "network dropped"}, trying again`);
            await new Promise((r) => setTimeout(r, limited ? 65_000 : 10_000));
          }
        }
        // Saved first, so a take is never lost or paid for twice.
        await writeFile(file, pcm);
        console.log(`${take}: recorded ${(pcm.length / BYTES_PER_SECOND).toFixed(1)} s`);
      } catch (error) {
        console.error(`${take}: recording FAILED — ${String(error).slice(0, 160)}`);
        continue;
      }
    }
    const pcm = await readFile(file);
    // Where a transcript says the lines change, cut there; otherwise the usual way.
    const parts = anchorArgs[take] ? splitAtAnchors(pcm, anchorArgs[take]) : split(pcm, lines);
    if (!parts) {
      console.error(`${take}: couldn't cut into its ${lines.length} lines — needs a look`);
      continue;
    }
    // Where each piece sits in the take, in bytes.
    splits[take] = parts.map((part, i) => {
      const from = part.byteOffset - pcm.byteOffset;
      return { n: lines[i].n, from, to: from + part.length };
    });
    console.log(`${take}: ${parts.map((p, i) => `${lines[i].n}=${(p.length / BYTES_PER_SECOND).toFixed(1)}s`).join(" ")}`);
  }
  await writeFile(splitsFile, JSON.stringify(splits, null, 1));
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
