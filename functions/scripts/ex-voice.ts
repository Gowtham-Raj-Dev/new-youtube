/**
 * Records an Ulagam Ippo video's narration with Gemini, one take per chapter,
 * and cuts each take into its lines.
 *
 * Takes are kept for good in "Ulagam Ippo/Videos/<video>/voice/<take>.pcm"; a
 * saved take is never recorded again. Where each line sits in its take goes to
 * voice/splits.json.
 *
 *   npm run ex-voice              records missing takes, then splits all
 *   npm run ex-voice -- t2 t3     only these takes
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { videoDir, type ExLine } from "../src/explainer/explainer";
import { pickVideo } from "../src/explainer/videos";
import { geminiSpeech, splitAtLongestPauses, splitAtPauses } from "../src/auto/voice";

const BYTES_PER_SECOND = 48_000;

/** Where the speech is: past the silence at either end, in 20 ms windows. */
function speechBounds(pcm: Buffer) {
  const W = 480;
  const loud: boolean[] = [];
  for (let w = 0; (w + 1) * W * 2 <= pcm.length; w++) {
    let sum = 0;
    for (let i = 0; i < W; i++) sum += (pcm.readInt16LE((w * W + i) * 2) / 32768) ** 2;
    loud.push(Math.sqrt(sum / W) >= 0.0126);
  }
  const first = Math.max(0, loud.indexOf(true));
  const last = loud.lastIndexOf(true) + 1;
  return { from: first * W * 2, to: last * W * 2 };
}

/** Pieces of `pcm`, one per line; null when no cut comes out even. */
function split(pcm: Buffer, lines: ExLine[]): Buffer[] | null {
  // A take of one line is that line, past the silence at either end.
  if (lines.length === 1) {
    const { from, to } = speechBounds(pcm);
    return [pcm.subarray(Math.max(0, from - 4800), Math.min(pcm.length, to + 4800))];
  }
  const letters = lines.map((l) => l.tamil.length);
  const even = (parts: Buffer[] | null) => {
    if (!parts || parts.length !== lines.length) return false;
    const per = parts.reduce((s, p) => s + p.length, 0) / letters.reduce((s, n) => s + n, 0);
    return parts.every((p, i) => p.length >= BYTES_PER_SECOND * 0.4 && p.length / (letters[i] * per) > 0.5 && p.length / (letters[i] * per) < 1.8);
  };
  const a = splitAtPauses(pcm, letters);
  if (even(a)) return a;
  const b = splitAtLongestPauses(pcm, lines.length);
  return even(b) ? b : null;
}

async function main() {
  const v = pickVideo();
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const dir = join(videoDir(v), "voice");
  await mkdir(dir, { recursive: true });
  const secret = await readFile(resolve(__dirname, "..", ".secret.local"), "utf8");
  const keys = [...secret.matchAll(/^GEMINI_API_KEY\w*=(.+)$/gm)].map((m) => m[1].trim());
  const splitsFile = join(dir, "splits.json");
  const splits: Record<string, Array<{ n: number; from: number; to: number }>> = existsSync(splitsFile) ? JSON.parse(await readFile(splitsFile, "utf8")) : {};
  const all = [...v.lines, ...(v.extraLines ?? [])];
  const takes = [...new Set(all.map((l) => l.take))].filter((t) => !only.length || only.includes(t));

  for (const take of takes) {
    const lines = all.filter((l) => l.take === take);
    const file = join(dir, `${take}.pcm`);
    if (!existsSync(file)) {
      let pcm: Buffer | null = null;
      // Each key in turn: a key whose day is used up gives 429, so the next one is tried.
      for (const key of keys) {
        for (let attempt = 1; !pcm && attempt <= 3; attempt++) {
          try {
            pcm = await geminiSpeech(key, [{ text: `${v.style}\n\n${lines.map((l) => l.tamil).join("\n")}`, speaker: "Narrator" }], { Narrator: v.narrator });
          } catch (error) {
            const s = String(error);
            console.log(`${take}: ${s.slice(0, 140)}`);
            if (/429/.test(s) && /day|daily|PerDay/i.test(s)) break;
            if (!/429|fetch failed|ECONNRESET|ETIMEDOUT|500|503/.test(s)) break;
            await new Promise((r) => setTimeout(r, /429/.test(s) ? 65_000 : 10_000));
          }
        }
        if (pcm) break;
      }
      if (!pcm) {
        console.error(`${take}: recording FAILED`);
        continue;
      }
      // Saved first, so a take is never lost or paid for twice.
      await writeFile(file, pcm);
      console.log(`${take}: recorded ${(pcm.length / BYTES_PER_SECOND).toFixed(1)} s`);
    }
    const pcm = await readFile(file);
    const manual = join(dir, `${take}.splits.json`);
    let parts: Buffer[] | null;
    if (existsSync(manual)) {
      // Seconds per line, by hand, when the pauses fool the cutting.
      const spans = JSON.parse(await readFile(manual, "utf8")) as Array<[number, number]>;
      parts = spans.map(([a, b]) => pcm.subarray(Math.round(a * 24_000) * 2, Math.round(b * 24_000) * 2));
    } else parts = split(pcm, lines);
    if (!parts) {
      // A narrator's pauses inside a sentence can look like those between: share the speech out by length.
      const { from, to } = speechBounds(pcm);
      const letters = lines.map((l) => l.tamil.length);
      const total = letters.reduce((s, n) => s + n, 0);
      let at = from;
      parts = letters.map((n) => {
        const len = Math.round((((to - from) * n) / total) / 2) * 2;
        const part = pcm.subarray(at, at + len);
        at += len;
        return part;
      });
      console.log(`${take}: no clean cut — shared out by length (check timing)`);
    }
    splits[take] = parts.map((part, i) => {
      const from = part.byteOffset - pcm.byteOffset;
      return { n: lines[i].n, from, to: from + part.length };
    });
    console.log(`${take}: ${parts.map((p, i) => `${lines[i].n}=${(p.length / BYTES_PER_SECOND).toFixed(1)}s`).join(" ")}`);
    await writeFile(splitsFile, JSON.stringify(splits, null, 1));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
