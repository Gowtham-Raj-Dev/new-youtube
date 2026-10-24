import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { SHORT_WIDTH } from "@shortflow/shared";
import { INK, easeOutBack, talkEnvelope, type SceneState } from "../auto/cartoon";
import { calmMusic } from "../auto/music";
import { loadFonts, run, type Line } from "../auto/render";
import { sfxTrack, type SfxEvent } from "../auto/sfx";

/**
 * Renders a full-length 16:9 cartoon episode. Scenes are drawn in the same
 * world as the Shorts (1080 wide, floor at 1210); the landscape frame looks at
 * it wider. Drawn in 1920×1080 units and scaled to the output size.
 */

export const LW = 1920;
export const LH = 1080;
const FPS = 30;
const RATE = 24_000;

export interface EpisodeLine extends Line {
  start: number;
  end: number;
}

export interface EpisodeCard {
  at: number;
  /** e.g. "☀️ Kaalai 6 mani". */
  text: string;
  length: number;
  /** The video's title, big in the middle; otherwise a small time badge in the corner. */
  title?: boolean;
}

export interface Episode {
  title: string;
  lines: EpisodeLine[];
  cards: EpisodeCard[];
  /** 24 kHz mono 16-bit PCM of all the voices, in place. */
  voice: Buffer;
  sfx: SfxEvent[];
  duration: number;
  /** Draws the world at `s.t`, in the Shorts' coordinates; the frame centres and frames it. */
  scene: (ctx: SKRSContext2D, s: SceneState) => void;
  handle: string;
}

function wavOf(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Over the running scene, never instead of it: the title as a big sticker in
 * the middle, or the time of day as a badge popping in at the top left.
 */
function drawCard(ctx: SKRSContext2D, card: EpisodeCard, t: number) {
  const local = t - card.at;
  const p = easeOutBack(local / 0.35);
  const out = Math.min(1, Math.max(0, (card.length - local) / 0.3));
  ctx.save();
  ctx.globalAlpha = out;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (card.title) {
    ctx.translate(LW / 2, 430);
    ctx.scale(p, p);
    ctx.rotate(-0.03);
    ctx.font = `110px "ShortFlow Bold", "ShortFlow Emoji"`;
    const width = ctx.measureText(card.text).width;
    const fit = Math.min(1, 1600 / width);
    ctx.scale(fit, fit);
    ctx.fillStyle = "#FFD400";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.roundRect(-width / 2 - 60, -95, width + 120, 190, 60);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.lineWidth = 20;
    ctx.strokeText(card.text, 0, 6);
    ctx.fillStyle = "#fff";
    ctx.fillText(card.text, 0, 6);
  } else {
    ctx.font = `52px "ShortFlow Bold", "ShortFlow Emoji"`;
    const width = ctx.measureText(card.text).width;
    ctx.translate(60 - (1 - Math.min(1, local / 0.3)) * (width + 140), 70);
    ctx.fillStyle = "#FFD400";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(0, -46, width + 70, 92, 46);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.lineWidth = 12;
    ctx.strokeText(card.text, 35, 3);
    ctx.fillStyle = "#fff";
    ctx.fillText(card.text, 35, 3);
  }
  ctx.restore();
}

/** How large the world is drawn in the 16:9 frame: feet at y ≈ 884, heads well below the top. */
const WORLD_ZOOM = 0.95;
const SPEAKER_ICON: Record<string, string> = { Amma: "👩", Naan: "🙋", Machan: "🤪" };
const SUB_FONT = `"ShortFlow Bold", "ShortFlow Emoji"`;

const normWord = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * The subtitle for a long video: the whole line, at most two rows, in a band
 * under the people; the speaker's name above it. Its key word is yellow.
 */
function drawSubtitle(ctx: SKRSContext2D, lines: EpisodeLine[], t: number) {
  let line: EpisodeLine | undefined;
  for (const l of lines) if (t >= l.start - 0.05 && t < l.end + 0.6) line = l;
  const shade = ctx.createLinearGradient(0, 860, 0, LH);
  shade.addColorStop(0, "rgba(20,18,36,0)");
  shade.addColorStop(0.35, "rgba(20,18,36,0.7)");
  shade.addColorStop(1, "rgba(20,18,36,0.85)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 860, LW, LH - 860);
  if (!line) return;
  const name = /^([A-Za-z]+):/.exec(line.screen)?.[1] ?? "";
  const words = line.screen.replace(/^[A-Za-z]+:\s*/, "").split(/\s+/).filter(Boolean);
  const pop = easeOutBack((t - line.start + 0.05) / 0.2);
  const fade = Math.min(1, Math.max(0, (line.end + 0.6 - t) / 0.2));

  // Two rows at most: smaller type for a long line.
  let size = 56;
  let rows: string[][] = [];
  for (; size >= 40; size -= 4) {
    ctx.font = `${size}px ${SUB_FONT}`;
    rows = [[]];
    for (const word of words) {
      const row = rows[rows.length - 1];
      if (row.length && ctx.measureText([...row, word].join(" ")).width > 1500) rows.push([word]);
      else row.push(word);
    }
    if (rows.length <= 2) break;
  }
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.translate(LW / 2, 0);
  // The speaker's tag.
  if (name) {
    ctx.font = `34px ${SUB_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tag = `${SPEAKER_ICON[name] ?? "🗣️"} ${name}`;
    const w = ctx.measureText(tag).width + 44;
    ctx.fillStyle = "rgba(20,18,36,0.9)";
    ctx.beginPath();
    ctx.roundRect(-w / 2, rows.length > 1 ? 892 : 922, w, 52, 26);
    ctx.fill();
    ctx.fillStyle = "#3EE8FF";
    ctx.fillText(tag, 0, (rows.length > 1 ? 892 : 922) + 27);
  }
  ctx.font = `${size}px ${SUB_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  const space = ctx.measureText(" ").width;
  const lineH = size * 1.2;
  const top = rows.length > 1 ? 975 : 1005;
  rows.forEach((row, r) => {
    const widths = row.map((w) => ctx.measureText(w).width);
    let x = -(widths.reduce((a, b) => a + b, 0) + space * (row.length - 1)) / 2;
    row.forEach((word, i) => {
      ctx.save();
      ctx.translate(x + widths[i] / 2, top + r * lineH);
      ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop);
      ctx.lineWidth = 12;
      ctx.strokeStyle = INK;
      ctx.strokeText(word, -widths[i] / 2, 0);
      ctx.fillStyle = normWord(word.split("-")[0]) === normWord(line!.highlight) ? "#FFD400" : "#fff";
      ctx.fillText(word, -widths[i] / 2, 0);
      ctx.restore();
      x += widths[i] + space;
    });
  });
  ctx.restore();
}

/** A canvas at `height`p and a function that draws frame `f` of the episode on it. */
export function framePainter(ep: Episode, height: number) {
  loadFonts();
  const scale = height / LH;
  const width = Math.round(LW * scale);
  const voice = Buffer.concat([ep.voice, Buffer.alloc(Math.max(0, Math.round(ep.duration * RATE) * 2 - ep.voice.length))]);
  const voiceWav = wavOf(voice, RATE);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const talk = talkEnvelope(voiceWav, FPS, ep.duration);
  const spans = ep.lines.map(({ start, end }) => ({ start, end }));
  const speakers = ep.lines.map((l) => /^([A-Za-z]+):/.exec(l.screen)?.[1] ?? "Naan");
  const paint = (f: number) => {
    const t = f / FPS;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LW, LH);
    const card = ep.cards.find((c) => t >= c.at && t < c.at + c.length);
    {
      const frame = ctx.getTransform();
      ctx.save();
      // The Shorts' world, framed for 16:9: its point (540, 806) a little above the frame's middle,
      // so whole bodies fit with room above the heads and the feet stay clear of the subtitles.
      ctx.translate(LW / 2, 500);
      ctx.scale(WORLD_ZOOM, WORLD_ZOOM);
      ctx.translate(-SHORT_WIDTH / 2, -806);
      ep.scene(ctx, { t, spans, speakers, talk: talk[f] ?? 0, duration: ep.duration, frame });
      ctx.restore();
      drawSubtitle(ctx, ep.lines, t);
    }
    if (card) drawCard(ctx, card, t);
    // The channel's handle, small in the corner.
    ctx.font = `30px "ShortFlow Semi"`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(ep.handle, LW - 36, 30);
    // In from black at the start, out to black at the end.
    const fade = Math.max(1 - Math.min(1, t / 0.6), Math.min(1, Math.max(0, (t - (ep.duration - 0.8)) / 0.8)));
    if (fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, LW, LH);
    }
  };
  return { canvas, paint, voiceWav, width, height, fps: FPS };
}

/** Renders the episode to an H.264/AAC MP4 at `height`p (1440 for 2560×1440). */
export async function renderEpisode(ep: Episode, outPath: string, workDir: string, height = 1440) {
  const { canvas, paint, voiceWav, width } = framePainter(ep, height);
  const frames = Math.ceil(ep.duration * FPS);
  const voicePath = join(workDir, "voice.wav");
  const musicPath = join(workDir, "music.wav");
  const sfxPath = join(workDir, "sfx.wav");
  await writeFile(voicePath, voiceWav);
  await writeFile(musicPath, calmMusic(ep.duration + 0.5, 3));
  await writeFile(sfxPath, sfxTrack(ep.duration + 0.5, ep.sfx));

  // The picture in one-minute parts: a part whose ffmpeg falls over is made again, not the whole video.
  const PART = 60 * FPS;
  const parts: string[] = [];
  for (let from = 0, i = 0; from < frames; from += PART, i++) {
    const to = Math.min(frames, from + PART);
    const part = join(workDir, `part-${i}.mp4`);
    for (let attempt = 1; ; attempt++) {
      try {
        await run(
          [
            "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${width}x${height}`, "-r", String(FPS), "-i", "pipe:0",
            "-an", "-c:v", "libx264", "-preset", "medium", "-tune", "animation", "-crf", "17", "-pix_fmt", "yuv420p", "-profile:v", "high",
            part,
          ],
          async (write) => {
            for (let f = from; f < to; f++) {
              paint(f);
              await write(Buffer.from(canvas.data()));
            }
          },
        );
        break;
      } catch (error) {
        if (attempt >= 3) throw error;
        console.log(`part ${i + 1} failed (${String(error).slice(0, 80)}), making it again`);
      }
    }
    parts.push(part);
    console.log(`part ${i + 1} of ${Math.ceil(frames / PART)} done`);
  }
  const list = join(workDir, "parts.txt");
  await writeFile(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));

  // Then the parts joined, with the voices, music and sounds.
  await run(
    [
      "-f", "concat", "-safe", "0", "-i", list,
      "-i", voicePath, "-i", musicPath, "-i", sfxPath,
      "-filter_complex",
      `[1:a]aresample=48000,highpass=f=70,acompressor=threshold=-18dB:ratio=3,volume=1.6,aformat=channel_layouts=stereo,asplit[voice][key];` +
        `[2:a]volume=0.45[music];[music][key]sidechaincompress=threshold=0.04:ratio=3:attack=30:release=500[bed];` +
        `[3:a]aformat=channel_layouts=stereo,volume=1.1[fx];` +
        `[voice][bed][fx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.95[a]`,
      "-map", "0:v", "-map", "[a]",
      "-c:v", "copy",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
      "-movflags", "+faststart", "-t", ep.duration.toFixed(2),
      outPath,
    ],
  );
}
