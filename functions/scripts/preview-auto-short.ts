/**
 * Renders AI Shorts from the content bank on this machine, without Text-to-Speech:
 * silent narration timed like speech, with the real music, hook and ending clip.
 * For checking the look and timing before deploying.
 *
 *   npm run preview-auto -- <output folder> [first script number] [how many] [ending clip.mp4]
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { BANK, planShort } from "../src/auto/bank";
import { renderShort } from "../src/auto/render";
import { silentNarration } from "../src/auto/voice";

async function main() {
  const out = resolve(process.argv[2] ?? ".local/preview");
  const first = Number(process.argv[3] ?? 0);
  const count = Number(process.argv[4] ?? 4);
  const ending = process.argv[5] ? resolve(process.argv[5]) : null;
  await mkdir(out, { recursive: true });

  for (let n = first; n < first + count; n++) {
    const plan = planShort(n);
    const lines = plan.lines.map(({ spoken, voice, kind }) => ({ text: spoken, voice, pauseBefore: kind === "punch" ? 0.6 : 0 }));
    // Roughly how long the Tamil voice takes to say each line.
    const narration = silentNarration(lines, lines.map((l) => Math.max(1.4, l.text.length * 0.075)));
    const work = await mkdtemp(join(tmpdir(), "ai-short-preview-"));
    const started = Date.now();
    try {
      const short = await renderShort(
        {
          lines: plan.lines.map(({ say, kind }) => ({ screen: say[1], highlight: say[2], kind })),
          narration,
          label: plan.label,
          emoji: plan.emoji,
          handle: "@MoolaiIllaMachan",
          seed: n,
          endingPath: ending,
        },
        work,
      );
      const name = `${String(n).padStart(2, "0")}-${plan.script.series}`;
      await writeFile(join(out, `${name}.mp4`), short.video);
      console.log(`#${n} of ${BANK.length} · ${plan.title} · ${short.durationSec.toFixed(1)} s in ${((Date.now() - started) / 1000).toFixed(1)} s → ${join(out, `${name}.mp4`)}`);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
