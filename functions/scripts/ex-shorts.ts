/**
 * Cuts an Ulagam Ippo video into vertical Shorts, one per chapter (the intro
 * goes with the first), with the same recorded voice: the Short's own picture
 * layout, its part number at the top and an end card sending viewers to the
 * full video. → "Ulagam Ippo/Videos/<video>/Shorts/<n> <chapter>.mp4"
 *
 *   npm run ex-shorts                    lists the parts and their lengths
 *   npm run ex-shorts -- 1               renders part 1 (1080×1920)
 *   npm run ex-shorts -- 1 --sheet       a sheet of 12 frames → TEST_OUT
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { build, framePainter, renderExplainer, TALL, videoDir, voicePieces, type Built, type ExLine, type ExVideo } from "../src/explainer/explainer";
import { pickVideo } from "../src/explainer/videos";

const RATE = 24_000;
const END_CARD = 2.6;

/** The lines of each part: the intro and the first chapter together, then a chapter each. */
function parts(v: ExVideo): ExLine[][] {
  const out: ExLine[][] = [];
  v.lines.forEach((l, i) => {
    // A new part at every chapter but the first, which joins the intro.
    if (i === 0 || (l.chapter && v.lines.slice(0, i).some((p) => p.chapter))) out.push([]);
    out[out.length - 1].push(l);
  });
  return out;
}

function buildPart(v: ExVideo, lines: ExLine[], no: number, count: number): Built {
  // After the first part the host starts in the corner (sliding there from big as the chapter card shows).
  const own = lines.map((l, i) => (i === 0 && no > 1 && !l.host ? { ...l, host: "corner" as const } : l));
  const voices = voicePieces(v);
  const b = build({ ...v, lines: own }, voices);
  // Chapter numbers as in the full video.
  for (const l of b.lines) if (l.chapterNo) l.chapterNo = no;
  // The end card, spoken by the host: what the next part is about, the full video is on the channel, subscribe.
  const last = b.lines[b.lines.length - 1];
  const start = last.end + 0.5;
  const ending = v.extraLines?.find((l) => l.n === 9000 + no);
  const voice = ending && voices[ending.n];
  const length = voice ? voice.length / (RATE * 2) : END_CARD;
  b.lines.push({
    ...(ending ?? { n: 9000 + no, take: "end", tamil: "" }),
    visual: Array.isArray(last.visual) ? last.visual[last.visual.length - 1] : last.visual,
    sub: ending?.sub ?? ending?.tamil,
    action: "point-down",
    // Clean look: plain text, no cursor clicking buttons, no emoji.
    overlay: v.clean
      ? { kind: "title", text: no < count ? `அடுத்து: பாகம் ${no + 1}` : "முழு வீடியோ Channel-ல!", small: "SUBSCRIBE பண்ணுங்க" }
      : { kind: "cta", buttons: ["subscribe", "bell"], text: no < count ? `அடுத்து: பாகம் ${no + 1} 👉` : "முழு வீடியோ 👉 Channel-ல!" },
    start,
    end: start + length,
  });
  b.duration = start + length + 1.2;
  b.voice = Buffer.concat([b.voice, Buffer.alloc(Math.max(0, Math.ceil(b.duration * RATE) * 2 - b.voice.length))]);
  voice?.copy(b.voice, Math.round(start * RATE) * 2);
  return b;
}

async function main() {
  const args = process.argv.slice(2);
  const v = pickVideo();
  const all = parts(v);
  const no = Number(args.find((a) => /^\d+$/.test(a)) ?? 0);
  if (!no) {
    all.forEach((lines, i) => {
      const b = buildPart(v, lines, i + 1, all.length);
      console.log(`${i + 1}. ${lines.find((l) => l.chapter)?.chapter ?? ""} · lines ${lines[0].n}–${lines[lines.length - 1].n} · ${b.duration.toFixed(1)} s`);
    });
    return;
  }
  const lines = all[no - 1];
  const b = buildPart(v, lines, no, all.length);
  const frame = { ...TALL, tag: `${v.title} · பாகம் ${no}/${all.length}` };
  // Without the characters Windows file names can't have (a chapter like "இந்தியாவுக்கு என்ன?").
  const name = `${String(no).padStart(2, "0")} ${lines.find((l) => l.chapter)?.chapter ?? v.title}`.replace(/[?<>:"/\\|*]/g, "").trim();
  console.log(`${name} · ${b.duration.toFixed(1)} s`);

  if (args.includes("--sheet")) {
    const test = resolve(process.env.TEST_OUT ?? join(tmpdir(), "ex-test"));
    await mkdir(test, { recursive: true });
    const { canvas, paint, fps } = await framePainter(b, 640, frame);
    const out = createCanvas(360 * 6, 640 * 2);
    const octx = out.getContext("2d");
    for (let i = 0; i < 12; i++) {
      const t = ((i + 0.5) / 12) * b.duration;
      paint(Math.round(t * fps));
      octx.drawImage(canvas, (i % 6) * 360, Math.floor(i / 6) * 640);
      octx.fillStyle = "#000";
      octx.fillRect((i % 6) * 360, Math.floor(i / 6) * 640, 70, 28);
      octx.fillStyle = "#fff";
      octx.font = "20px sans-serif";
      octx.fillText(t.toFixed(1), (i % 6) * 360 + 6, Math.floor(i / 6) * 640 + 21);
    }
    await writeFile(join(test, `short-${no}.jpg`), out.encodeSync("jpeg", 82));
    console.log(`→ ${join(test, `short-${no}.jpg`)}`);
    return;
  }

  const dir = join(videoDir(v), "Shorts");
  await mkdir(dir, { recursive: true });
  const work = await mkdtemp(join(tmpdir(), "ex-short-"));
  try {
    const file = join(dir, `${name}.mp4`);
    const started = Date.now();
    await renderExplainer(b, file, work, 1920, undefined, frame, 10 + no);
    console.log(`→ ${file} in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  } finally {
    await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => {});
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
