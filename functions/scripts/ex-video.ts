/**
 * Renders an Ulagam Ippo video with its recorded narration (silent where a line
 * has none yet).
 *
 *   npm run ex-video                  1440p → Ulagam Ippo/Videos/<video>/<title>.mp4
 *   npm run ex-video -- --sheet=24    a sheet of frames across the video → TEST_OUT/ex-sheet-*.jpg
 *   npm run ex-video -- --at=3,40     single frames → TEST_OUT/ex-<t>.jpg
 *   npm run ex-video -- --chapters    YouTube chapters
 *   npm run ex-video -- --thumb       thumbnail.jpg
 *   npm run ex-video -- --test        720p, quick
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { build, CHANNEL_DIR, framePainter, renderExplainer, TALL, videoDir, voicePieces, WIDE } from "../src/explainer/explainer";
import { pickVideo } from "../src/explainer/videos";

async function main() {
  const args = process.argv.slice(2);
  const v = pickVideo();
  const voices = voicePieces(v);
  const b = build(v, voices);
  console.log(`${Object.keys(voices).length}/${v.lines.length} lines voiced · ${b.duration.toFixed(1)} s (${(b.duration / 60).toFixed(1)} min)`);
  const test = resolve(process.env.TEST_OUT ?? join(tmpdir(), "ex-test"));
  await mkdir(test, { recursive: true });
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  if (args.includes("--chapters")) {
    for (const c of b.chapters) console.log(`${clock(c.at)} ${c.name}`);
    return;
  }

  if (args.includes("--thumb")) {
    // 1280×720: the video's picture, the host on the right, lines of big Tamil (video 01: the big temple).
    const thumb = v.thumb ?? {
      visual: "brihadeeswarar",
      lines: [{ text: "தமிழ்நாடு", size: 190, fill: "#FFD400" }, { text: "வரலாறு", size: 190, fill: "#FFFFFF" }, { text: "2600 வருஷ கதை 😮", size: 96, fill: "#FFFFFF" }],
    };
    const { canvas, ctx, paint, fps } = await framePainter({ ...b, lines: b.lines.map((l) => ({ ...l, overlay: undefined })) }, 720);
    paint(Math.round(0.7 * fps));
    ctx.setTransform(1280 / 1920, 0, 0, 720 / 1080, 0, 0);
    // Clear the frame of its subtitle and badge: the picture again, then the text.
    const bg = await loadImage(join(videoDir(v), "images", `${thumb.visual}.jpg`));
    const s = Math.max(1920 / bg.width, 1080 / bg.height);
    ctx.drawImage(bg, (1920 - bg.width * s) / 2, (1080 - bg.height * s) / 2, bg.width * s, bg.height * s);
    const shade = ctx.createLinearGradient(0, 0, 1920, 0);
    if (v.look === "pulse" || v.look === "feed" || v.look === "night" || v.look === "paper" || v.look === "frost") {
      // The pulse, feed, night, paper and frost looks: the text side nearly solid dark, so the picture's own words never show through.
      const ink = v.look === "feed" ? "13,10,31" : v.look === "night" ? "7,11,30" : v.look === "paper" ? "27,33,64" : v.look === "frost" ? "10,26,42" : "14,17,23";
      shade.addColorStop(0, `rgba(${ink},0.97)`);
      shade.addColorStop(0.5, `rgba(${ink},0.88)`);
      shade.addColorStop(0.8, `rgba(${ink},0.25)`);
    } else {
      shade.addColorStop(0, "rgba(8,10,24,0.85)");
      shade.addColorStop(0.7, "rgba(8,10,24,0.2)");
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 1920, 1080);
    const host = await loadImage(join(CHANNEL_DIR, "host", "host.png"));
    // The story look gives the text more room: the host a little smaller, further right.
    const textW = v.look === "story" ? 1120 : 940;
    if (v.look === "story") ctx.drawImage(host, 1200, 200, 880, 880);
    else ctx.drawImage(host, 1060, 60, 1000, 1000);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const big = (text: string, y: number, size: number, fill: string) => {
      const face = v.look === "story" ? `"Story Head", "Tamil Bold"` : `"Tamil Bold", "ShortFlow Emoji"`;
      ctx.font = `${size}px ${face}`;
      // Kept left of the host.
      const w = ctx.measureText(text).width;
      if (w > textW) {
        size = Math.floor((size * textW) / w);
        ctx.font = `${size}px ${face}`;
      }
      ctx.lineWidth = size / 6;
      ctx.strokeStyle = "#1E1B2E";
      ctx.strokeText(text, 80, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, 80, y);
    };
    // The lines stacked around the middle, each as tall as its text.
    const total = thumb.lines.reduce((s, l) => s + l.size * 1.12, 0);
    let y = 540 - total / 2;
    for (const l of thumb.lines) {
      big(l.text, y + (l.size * 1.12) / 2, l.size, l.fill);
      y += l.size * 1.12;
    }
    await writeFile(join(videoDir(v), "thumbnail.jpg"), canvas.encodeSync("jpeg", 92));
    console.log(`→ ${join(videoDir(v), "thumbnail.jpg")}`);
    return;
  }

  const sheet = Number(args.find((a) => a.startsWith("--sheet="))?.slice(8) ?? 0);
  const at = args.find((a) => a.startsWith("--at="))?.slice(5);
  if (v.tall && sheet) {
    // A Short: portrait frames, 6 across.
    const { canvas, paint, fps } = await framePainter(b, 640, TALL);
    const times = Array.from({ length: sheet }, (_, i) => ((i + 0.5) / sheet) * b.duration);
    for (let s = 0; s * 12 < times.length; s++) {
      const out = createCanvas(360 * 6, 640 * 2);
      const octx = out.getContext("2d");
      times.slice(s * 12, s * 12 + 12).forEach((t, i) => {
        paint(Math.round(t * fps));
        octx.drawImage(canvas, (i % 6) * 360, Math.floor(i / 6) * 640);
        octx.fillStyle = "#000";
        octx.fillRect((i % 6) * 360, Math.floor(i / 6) * 640, 70, 28);
        octx.fillStyle = "#fff";
        octx.font = "20px sans-serif";
        octx.fillText(t.toFixed(1), (i % 6) * 360 + 6, Math.floor(i / 6) * 640 + 21);
      });
      await writeFile(join(test, `ex-sheet-${s + 1}.jpg`), out.encodeSync("jpeg", 82));
    }
    console.log(`→ ${test}`);
    return;
  }
  if (sheet || at) {
    const { canvas, paint, fps } = await framePainter(b, Number(process.env.AT_HEIGHT ?? (v.tall ? 960 : 360)), v.tall ? TALL : WIDE);
    if (at) {
      for (const t of at.split(",").map(Number)) {
        paint(Math.round(t * fps));
        await writeFile(join(test, `ex-${t}.jpg`), canvas.encodeSync("jpeg", 85));
      }
      console.log(`→ ${test}`);
      return;
    }
    const times = Array.from({ length: sheet }, (_, i) => ((i + 0.5) / sheet) * b.duration);
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
      await writeFile(join(test, `ex-sheet-${s + 1}.jpg`), out.encodeSync("jpeg", 80));
    }
    console.log(`→ ${test}`);
    return;
  }

  const work = await mkdtemp(join(tmpdir(), "ex-render-"));
  try {
    const quick = args.includes("--test");
    // --sample=0,20: just those seconds, to a file of its own — the full video is left alone.
    const sample = args.find((a) => a.startsWith("--sample="))?.slice(9).split(",").map(Number);
    const name = sample ? `sample ${sample[0]}-${sample[1]}s.mp4` : quick ? `${v.slug} (test).mp4` : `${v.slug.replace(/^\d+ /, "")}.mp4`;
    const file = join(videoDir(v), name);
    const started = Date.now();
    // A Short renders 1080×1920 (test 540×960).
    const height = v.tall ? (quick ? 960 : 1920) : quick ? 720 : 1440;
    await renderExplainer(b, file, work, height, sample && { from: sample[0], to: sample[1] }, v.tall ? TALL : WIDE);
    console.log(`→ ${file} in ${((Date.now() - started) / 60000).toFixed(1)} min`);
  } finally {
    await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => {});
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
