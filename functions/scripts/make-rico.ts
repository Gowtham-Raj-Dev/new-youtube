/**
 * The thin-style ("Rico" folder) Shorts, in English, into
 * "Moolai Illa Machan/Shorts/Rico/Day <n>/NN-<id>.mp4" with a .txt of YouTube
 * title, description and tags (day 0, the first sample, goes in Rico/ itself).
 * Voices are kept in Rico/voice/<id>.pcm: recorded once, never again.
 *
 *   npm run make-rico -- <day> [id]          4K with the Gemini voice
 *   npm run make-rico -- <day> [id] --test   1080p, silent, into TEST_OUT
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { YOUTUBE_TAG_CHARS_SAFE, fitYoutubeTags, youtubeTagChars } from "@shortflow/shared";
import type { Scene } from "../src/auto/cartoon";
import { renderShort } from "../src/auto/render";
import { favouriteStudent } from "../src/auto/rico";
import {
  RICO_VOICES, dishesWaiting, dogHomework, goSlow, gymMoney, iceCreamInstead, lightsOff, passwordIncorrect, seafoodDiet, tenAlarms, titlesOnly,
} from "../src/auto/rico-day1";
import { geminiSpeech, narrationFromPcm, silentNarration, splitDialogue } from "../src/auto/voice";

const ROOT = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Shorts", "Rico");
const ENDING = resolve(__dirname, "..", ".local", "ending-laugh-5s.mp4");

interface RicoShort {
  id: string;
  day: number;
  scene: Scene;
  /** Curiosity title: never gives the punch away. */
  hook: string;
  keywords: string[];
  /** Speaker, what they say, the word to highlight; the last line is the punch. */
  lines: Array<[string, string, string]>;
}

const SHORTS: RicoShort[] = [
  {
    id: "seafood-diet", day: 1, scene: seafoodDiet,
    hook: "She's on a strict seafood diet… wait for it 🐟", keywords: ["diet joke", "food comedy"],
    lines: [
      ["Meena", "Okay so, I'm on a strict seafood diet now.", "seafood"],
      ["Riya", "Ooh, nice! Like fish and prawns?", "fish"],
      ["Meena", "Nope.", "nope"],
      ["Riya", "Then what?", "what"],
      ["Meena", "I see food… and I eat it.", "eat"],
    ],
  },
  {
    id: "dishes-waiting", day: 1, scene: dishesWaiting,
    hook: "Mom said put the phone down… it was a trap 📵", keywords: ["mom comedy", "phone addiction joke"],
    lines: [
      ["Mom", "Meena. Phone. Down. Now.", "down"],
      ["Meena", "Ugh, fine. It's down.", "fine"],
      ["Mom", "So you're not doing anything right now?", "anything"],
      ["Meena", "Nope. Totally free.", "free"],
      ["Mom", "Perfect. The dishes are waiting!", "dishes"],
    ],
  },
  {
    id: "dog-homework", day: 1, scene: dogHomework,
    hook: "The dog ate her homework… but she doesn't have a dog?! 🐶", keywords: ["homework excuse", "school comedy"],
    lines: [
      ["Tara", "Miss, my dog ate my homework.", "dog"],
      ["Teacher", "Tara, you don't have a dog.", "dog"],
      ["Tara", "I didn't. Until this morning.", "morning"],
      ["Teacher", "Wait… you bought a dog?", "bought"],
      ["Tara", "Yep! Way cheaper than doing the homework.", "cheaper"],
    ],
  },
  {
    id: "go-slow", day: 1, scene: goSlow,
    hook: "Late to school again… her excuse is actually logical 🐌", keywords: ["late to school", "excuse comedy"],
    lines: [
      ["Riya", "Sorry I'm late, Miss. I was following a sign.", "sign"],
      ["Teacher", "What sign?", "sign"],
      ["Riya", "It said, school ahead, go slow.", "slow"],
      ["Teacher", "And?", "and"],
      ["Riya", "So I went very… very… slow.", "slow"],
    ],
  },
  {
    id: "ten-alarms", day: 1, scene: tenAlarms,
    hook: "She set 10 alarms and woke up every time… so what happened? ⏰", keywords: ["alarm joke", "morning comedy"],
    lines: [
      ["Meena", "I set ten alarms this morning.", "ten"],
      ["Tara", "Whoa. Did you wake up?", "wake"],
      ["Meena", "Every. Single. Time.", "every"],
      ["Tara", "So you got up super early!", "early"],
      ["Meena", "No, I just got really good at snoozing.", "snoozing"],
    ],
  },
  {
    id: "titles-only", day: 1, scene: titlesOnly,
    hook: "She finished the whole syllabus in ONE hour… how? 📚", keywords: ["exam study joke", "student comedy"],
    lines: [
      ["Tara", "I finished the whole syllabus in one hour!", "hour"],
      ["Riya", "One hour? How?", "how"],
      ["Tara", "I read every single chapter.", "chapter"],
      ["Riya", "Every page?!", "page"],
      ["Tara", "Just the titles. I'm a very fast reader.", "titles"],
    ],
  },
  {
    id: "lights-off", day: 1, scene: lightsOff,
    hook: "Messy room cleaned in 5 minutes… her secret plan 🧹", keywords: ["messy room", "cleaning comedy"],
    lines: [
      ["Meena", "Mom, I cleaned my whole room!", "cleaned"],
      ["Mom", "In five minutes?", "five"],
      ["Meena", "I had a plan.", "plan"],
      ["Mom", "What plan?", "plan"],
      ["Meena", "I turned off the lights. No mess.", "lights"],
    ],
  },
  {
    id: "password-incorrect", day: 1, scene: passwordIncorrect,
    hook: "Her Wi-Fi password is genius… or is it? 📶", keywords: ["wifi password joke", "smart girl comedy"],
    lines: [
      ["Riya", "I changed my Wi-Fi password to, incorrect.", "incorrect"],
      ["Meena", "Why would you do that?", "why"],
      ["Riya", "Because it's genius.", "genius"],
      ["Meena", "How is that genius?", "how"],
      ["Riya", "When I forget it, the screen says, your password is incorrect!", "incorrect"],
    ],
  },
  {
    id: "gym-money", day: 1, scene: gymMoney,
    hook: "3 months at the gym and she lost so much… 💪", keywords: ["gym joke", "fitness comedy"],
    lines: [
      ["Riya", "I joined a gym three months ago!", "gym"],
      ["Tara", "Ooh! How's it going?", "going"],
      ["Riya", "I've lost so much.", "lost"],
      ["Tara", "Weight?", "weight"],
      ["Riya", "Money. I never actually went.", "money"],
    ],
  },
  {
    id: "ice-cream", day: 1, scene: iceCreamInstead,
    hook: "She didn't touch the chocolates… Mom should be proud? 🍫", keywords: ["mom comedy", "ice cream joke"],
    lines: [
      ["Tara", "Mom, you should be really proud of me.", "proud"],
      ["Mom", "Why's that?", "why"],
      ["Tara", "I didn't touch the chocolates in the fridge.", "chocolates"],
      ["Mom", "Aww, good girl!", "good"],
      ["Tara", "I ate the ice cream instead.", "ice cream"],
    ],
  },
  {
    // The first sample, now the day's 11th Short.
    id: "favourite-student", day: 1, scene: favouriteStudent,
    hook: "Teacher's favourite student… but why? 😴", keywords: ["school comedy", "teacher student joke"],
    lines: [
      ["Meena", "Mom, my teacher says I'm her favourite student!", "favourite"],
      ["Mom", "Really? Why?", "why"],
      ["Meena", "Because I never disturb the class.", "disturb"],
      ["Mom", "Aww, that's so good!", "good"],
      ["Meena", "Yeah, I sleep through all of it!", "sleep"],
    ],
  },
];

/**
 * YouTube title, description and tags by the channel's rules (docs/youtube-metadata-rules.md):
 * title 90–99 characters, description over 1000, tags near YouTube's 500, and exactly
 * 15 hashtags across title and description (over 15 and YouTube ignores them all).
 */
function metadata({ hook, keywords, lines }: RicoShort) {
  const TITLE_HASHTAGS = ["#shorts", "#funny", "#comedy"];
  let title = hook;
  for (const piece of [" | Funny Animation 😂", ...TITLE_HASHTAGS.map((h) => ` ${h}`), " 🤣", " 🔥"]) {
    if (title.length >= 90) break;
    if ((title + piece).length <= 99) title += piece;
  }
  const inTitle = TITLE_HASHTAGS.filter((h) => title.includes(h));
  const hashtags = [
    "#shorts", "#funny", "#comedy", "#animation", "#cartoon", "#funnyshorts", "#comedyshorts", "#animatedshorts", "#relatable",
    "#jokes", "#schoollife", "#momlife", "#youtubeshorts", "#shortsfeed", "#viral", "#trending", "#lol",
  ].filter((h) => !inTitle.includes(h)).slice(0, 15 - inTitle.length);
  const script = lines.map(([who, text]) => `${who === "Teacher" ? "Miss Rose" : who}: ${text}`).join("\n");
  const description = [
    `${hook} 😂`,
    "Wait for the last line 👇 the twist is at the end!",
    "",
    "🎬 Today's comedy:",
    script,
    "",
    "Tag the friend who would actually say this! 👇",
    "😂 LIKE if it made you laugh, and SHARE it with your bestie, your sister or your mom.",
    "🔔 SUBSCRIBE and turn on the bell: a new animated comedy short every day.",
    "💬 Comment below: has this ever happened to you? Who is the Meena, Riya or Tara in your gang?",
    "",
    "📺 About these shorts:",
    "Meena (always sleepy), Riya (glasses, too smart for her own good), Tara (pure chaos), their Mom and Miss Rose the teacher. Tiny animated comedy about school, home, best friends and mom life, told in 15 seconds with a twist you won't see coming.",
    "",
    `🔎 ${[...keywords, "funny animation", "animated comedy shorts", "relatable jokes", "school comedy", "mom and daughter comedy", "clean comedy"].join(", ")}`,
    "",
    hashtags.join(" "),
  ].join("\n");
  const tags = fitYoutubeTags([
    ...keywords,
    "funny shorts", "comedy shorts", "animated comedy", "funny animation", "cartoon comedy", "animation shorts", "relatable comedy",
    "short jokes", "clean jokes", "school comedy", "mom and daughter comedy", "girls comedy", "best friends comedy", "family comedy",
    "funny cartoon", "animated shorts", "comedy animation", "funny videos", "jokes in english", "english comedy shorts", "viral shorts",
    "trending shorts", "moolai illa machan",
  ], YOUTUBE_TAG_CHARS_SAFE);
  return { title, description, tags, text: `TITLE\n${title}\n\nDESCRIPTION\n${description}\n\nTAGS\n${tags.join(", ")}\n` };
}

async function main() {
  const args = process.argv.slice(2);
  const test = args.includes("--test");
  const [dayArg, only] = args.filter((a) => !a.startsWith("--"));
  const day = Number(dayArg ?? 0);
  const out = test ? resolve(process.env.TEST_OUT ?? join(tmpdir(), "rico-test")) : day ? join(ROOT, `Day ${day}`) : ROOT;
  const voiceDir = join(ROOT, "voice");
  await mkdir(out, { recursive: true });
  await mkdir(voiceDir, { recursive: true });
  const shorts = SHORTS.filter((x) => x.day === day);
  // --meta: only rewrites each video's .txt (title, description, tags), no render.
  if (args.includes("--meta")) {
    for (const [i, short] of shorts.entries()) {
      const { title, description, tags, text } = metadata(short);
      await writeFile(join(out, `${String(i + 1).padStart(2, "0")}-${short.id}.txt`), text);
      const hashtags = `${title} ${description}`.match(/#\w+/g) ?? [];
      console.log(`${short.id}: title ${title.length} · description ${description.length} · hashtags ${hashtags.length} · tags ${tags.length} (${youtubeTagChars(tags)} chars)`);
    }
    return;
  }
  const failed: string[] = [];
  for (const [i, short] of shorts.entries()) {
    if (only && !only.split(",").includes(short.id)) continue;
    try {
      await makeOne(i, short, day, test, out, voiceDir);
    } catch (error) {
      failed.push(short.id);
      console.error(`${short.id}: FAILED — ${String(error).split("\n")[0]}`);
    }
  }
  if (failed.length) {
    console.error(`Failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

async function makeOne(i: number, short: RicoShort, day: number, test: boolean, out: string, voiceDir: string) {
  const last = short.lines.length - 1;
  const lines = short.lines.map(([speaker, text], k) => ({ text, speaker, pauseBefore: k === last ? 0.6 : 0 }));
  let narration;
  if (test) {
    narration = silentNarration(lines, lines.map((l) => Math.max(1.2, l.text.length * 0.07)));
  } else {
    const take = join(voiceDir, `${short.id}.pcm`);
    if (!existsSync(take)) {
      // Every GEMINI_API_KEY* in turn: when one's daily quota is used up, the next one records.
      const keys = [...(await readFile(resolve(__dirname, "..", ".secret.local"), "utf8")).matchAll(/^GEMINI_API_KEY\w*=(.+)$/gm)].map((m) => m[1].trim());
      if (!keys.length) throw new Error("GEMINI_API_KEY is missing from functions/.secret.local");
      const voices = Object.fromEntries([...new Set(short.lines.map(([who]) => who))].map((who) => [who, RICO_VOICES[who]]));
      let audio: Buffer | undefined;
      for (const [k, key] of keys.entries()) {
        try {
          audio = await geminiSpeech(key, lines, voices);
          break;
        } catch (error) {
          if (!String(error).includes("429") || k === keys.length - 1) throw error;
        }
      }
      await writeFile(take, audio!);
      console.log(`${short.id}: voice recorded → ${take}`);
    }
    const pcm = await readFile(take);
    const cutsFile = join(voiceDir, `${short.id}.splits.json`);
    const parts = existsSync(cutsFile)
      ? (JSON.parse(await readFile(cutsFile, "utf8")) as Array<[number, number]>).map(([from, to]) => pcm.subarray(Math.round(from * 24_000) * 2, Math.round(to * 24_000) * 2))
      : splitDialogue(pcm, lines);
    narration = narrationFromPcm(lines, parts);
  }
  const name = day ? `${String(i + 1).padStart(2, "0")}-${short.id}` : short.id;
  const work = await mkdtemp(join(tmpdir(), "rico-"));
  try {
    const video = await renderShort(
      {
        lines: short.lines.map(([speaker, text, highlight], k) => ({ screen: `${speaker}: ${text}${k === last ? " 😂" : ""}`, highlight, kind: k === last ? ("punch" as const) : ("story" as const) })),
        narration,
        label: "",
        emoji: "😂",
        handle: "@MoolaiIllaMachan",
        seed: i,
        endingPath: test ? null : ENDING,
        scene: short.scene,
        scale: test ? 1 : 2,
      },
      work,
    );
    await writeFile(join(out, `${name}.mp4`), video.video);
    if (!test && day) await writeFile(join(out, `${name}.txt`), metadata(short).text);
    console.log(`${name} · ${video.durationSec.toFixed(1)} s → ${join(out, `${name}.mp4`)}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
