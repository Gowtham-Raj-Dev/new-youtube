/**
 * Makes a day's illustrated Shorts into "Moolai Illa Machan/Day <n>/":
 * NN-<id>.mp4 and NN-<id>.txt (YouTube title, description and tags).
 *
 * Voice: each joke's Gemini take is kept for good in "Moolai Illa Machan/voice/<id>.pcm".
 * A saved take is always reused; a joke is recorded only when it has no take yet.
 * Changing a scene never records the voice again.
 *
 *   npm run make-videos -- <day> [id]          real videos
 *   npm run make-videos -- <day> [id] --test   silent, timed like speech, into the scratch folder given by TEST_OUT
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { planScript } from "../src/auto/bank";
import { EPISODES } from "../src/auto/episodes";
import { renderShort } from "../src/auto/render";
import { geminiSpeech, narrationFromPcm, silentNarration, splitDialogue } from "../src/auto/voice";

const ROOT = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Shorts");
const ENDING = resolve(__dirname, "..", ".local", "ending-laugh-5s.mp4");

async function main() {
  const args = process.argv.slice(2);
  const test = args.includes("--test");
  const [dayArg, only] = args.filter((a) => !a.startsWith("--"));
  const day = Number(dayArg);
  if (!day) throw new Error("Which day? e.g. npm run make-videos -- 1");
  const episodes = EPISODES.filter((e) => e.day === day);
  const out = test ? resolve(process.env.TEST_OUT ?? join(tmpdir(), "mim-test")) : join(ROOT, `Day ${day}`);
  const voiceDir = join(ROOT, "voice");
  await mkdir(out, { recursive: true });
  await mkdir(voiceDir, { recursive: true });

  const failed: string[] = [];
  for (const [i, episode] of episodes.entries()) {
    if (only && !only.split(",").includes(episode.id)) continue;
    // One joke going wrong doesn't stop the rest of the day.
    try {
      await makeOne(i, episode, test, out, voiceDir);
    } catch (error) {
      failed.push(episode.id);
      console.error(`${episode.id}: FAILED — ${String(error).split("\n")[0]}`);
    }
  }
  if (failed.length) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

async function makeOne(i: number, { id, script, scene }: (typeof EPISODES)[number], test: boolean, out: string, voiceDir: string) {
  {
    const plan = planScript(script);
    const lines = plan.lines.map(({ spoken, voice, speaker, kind }) => ({ text: spoken, voice, speaker, pauseBefore: kind === "punch" ? 0.6 : 0 }));
    let narration;
    if (test) {
      narration = silentNarration(lines, lines.map((l) => Math.max(1.2, l.text.length * 0.07)));
    } else {
      const take = join(voiceDir, `${id}.pcm`);
      if (!existsSync(take)) {
        const key = (await readFile(resolve(__dirname, "..", ".secret.local"), "utf8")).match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
        if (!key) throw new Error("GEMINI_API_KEY is missing from functions/.secret.local");
        // Saved before anything else, so the take is never lost or paid for twice.
        await writeFile(take, await geminiSpeech(key, lines, plan.geminiVoices));
        console.log(`${id}: voice recorded → ${take}`);
      }
      narration = narrationFromPcm(lines, splitDialogue(await readFile(take), lines));
    }

    const name = `${String(i + 1).padStart(2, "0")}-${id}`;
    const work = await mkdtemp(join(tmpdir(), "mim-"));
    try {
      const short = await renderShort(
        {
          lines: plan.lines.map(({ say, kind }) => ({ screen: say[1], highlight: say[2], kind })),
          narration,
          label: plan.label,
          emoji: plan.emoji,
          handle: "@MoolaiIllaMachan",
          seed: i,
          endingPath: test ? null : ENDING,
          scene,
          // The channel's videos are 4K; quick tests stay 1080p.
          scale: test ? 1 : 2,
        },
        work,
      );
      await writeFile(join(out, `${name}.mp4`), short.video);
      if (!test) await writeFile(join(out, `${name}.txt`), `TITLE\n${plan.title}\n\nDESCRIPTION\n${plan.description}\n\nTAGS\n${plan.tags.join(", ")}\n`);
      console.log(`${name} · ${short.durationSec.toFixed(1)} s → ${join(out, `${name}.mp4`)}`);
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
