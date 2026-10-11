import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";
import * as logger from "firebase-functions/logger";
import { getStorage } from "firebase-admin/storage";
import type { CropMode, OutputQuality } from "@shortflow/shared";

/** Where ffmpeg reads from. Always a 127.0.0.1 URL, a local path in tests. */
export interface MediaInput {
  url: string;
}

export interface ProbeResult {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  videoCodec: string;
}

/** ffmpeg/ffprobe crashed or timed out — a server-side problem, not a bad file. */
export class MediaToolError extends Error {}

/** Any byte source that supports ranged reads (a Storage object, a local file in tests). */
export interface RangeSource {
  size: number;
  contentType: string;
  read: (start: number, end: number) => Readable;
}

/**
 * Serves `source` on 127.0.0.1 with HTTP Range support for the duration of `fn`.
 *
 * Why not hand ffmpeg a storage.googleapis.com URL: the static ffmpeg/ffprobe
 * builds segfault on DNS lookups (static glibc can't load NSS), and range reads
 * keep a 10 GB source from ever being downloaded in full.
 */
export async function withRangeServer<T>(source: RangeSource, fn: (input: MediaInput) => Promise<T>): Promise<T> {
  const { size } = source;
  const server = createServer((req, res) => {
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    let start = 0;
    let end = size - 1;
    if (range?.[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(Number(range[2]), size - 1);
    } else if (range?.[2]) {
      start = Math.max(0, size - Number(range[2])); // suffix range: last N bytes
    }
    if (start >= size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(range ? 206 : 200, {
      "Content-Type": source.contentType,
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = source.read(start, end);
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy()); // ffmpeg hangs up as soon as it has enough
    stream.pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn({ url: `http://127.0.0.1:${port}/source` });
  } finally {
    server.closeAllConnections();
    server.close();
  }
}

export async function withStorageSource<T>(bucket: string, name: string, fn: (input: MediaInput) => Promise<T>): Promise<T> {
  const file = getStorage().bucket(bucket).file(name);
  const [metadata] = await file.getMetadata();
  return withRangeServer(
    {
      size: Number(metadata.size),
      contentType: metadata.contentType ?? "application/octet-stream",
      read: (start, end) => file.createReadStream({ start, end, validation: false }),
    },
    fn,
  );
}

function run(bin: string, args: string[], timeoutMs: number) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: Buffer; stderr: string }>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new MediaToolError(`${bin} failed to start: ${error.message}`));
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout: Buffer.concat(stdout), stderr });
    });
  });
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  disposition?: { attached_pic?: number };
  tags?: { rotate?: string };
  side_data_list?: Array<{ rotation?: number }>;
}

/**
 * Duration and display size, or null if the input has no decodable video.
 * Throws MediaToolError if ffprobe itself crashes or hangs.
 */
export async function probeMedia(input: MediaInput): Promise<ProbeResult | null> {
  const { code, signal, stdout, stderr } = await run(
    ffprobe.path,
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", "-i", input.url],
    60_000,
  );
  if (signal) throw new MediaToolError(`ffprobe killed by ${signal}: ${stderr.slice(-300)}`);
  if (code !== 0) {
    logger.warn("ffprobe rejected input", { code, stderr: stderr.slice(-500) });
    return null;
  }

  const json = JSON.parse(stdout.toString("utf8")) as { streams?: FfprobeStream[]; format?: { duration?: string } };
  const streams = json.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  if (!video?.width || !video.height) return null;

  const durationSec = Number(json.format?.duration ?? video.duration);
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;

  // Phone footage is often stored landscape with a 90° rotation flag.
  const rotation = Math.abs(Number(video.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? video.tags?.rotate ?? 0)) % 180;
  const [width, height] = rotation === 90 ? [video.height, video.width] : [video.width, video.height];

  return {
    durationSec: Math.round(durationSec * 100) / 100,
    width,
    height,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
    videoCodec: video.codec_name ?? "unknown",
  };
}

const SHORT_SIZE = "1080:1920";
const CRF: Record<OutputQuality, number> = { standard: 26, high: 23, max: 20 };

/** Filter graph that turns any frame shape into 1080×1920, ending in `[v]`. */
function verticalFilter(cropMode: CropMode): string {
  switch (cropMode) {
    case "fit":
      return `[0:v]scale=${SHORT_SIZE}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${SHORT_SIZE}:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`;
    case "blur":
      return [
        "[0:v]split=2[bgsrc][fgsrc]",
        // Blurring a quarter-size copy looks the same once scaled up, and costs a fraction of the CPU.
        `[bgsrc]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=10:2,scale=${SHORT_SIZE}[bg]`,
        `[fgsrc]scale=${SHORT_SIZE}:force_original_aspect_ratio=decrease:force_divisible_by=2[fg]`,
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]",
      ].join(";");
    default:
      // `center`. Smart framing isn't built yet and falls back to it.
      return `[0:v]scale=${SHORT_SIZE}:force_original_aspect_ratio=increase,crop=${SHORT_SIZE},setsar=1[v]`;
  }
}

export interface ShortRender {
  startSec: number;
  durationSec: number;
  cropMode: CropMode;
  quality: OutputQuality;
}

/** Cuts one segment out of `input` and writes it to `outPath` as a vertical H.264/AAC MP4. Throws MediaToolError. */
export async function renderShort(input: MediaInput, render: ShortRender, outPath: string): Promise<void> {
  if (!ffmpegPath) throw new MediaToolError("ffmpeg binary not available on this platform.");
  const { code, signal, stderr } = await run(
    ffmpegPath,
    [
      "-v", "error", "-y",
      "-ss", render.startSec.toFixed(2), "-t", render.durationSec.toFixed(2), "-i", input.url,
      "-filter_complex", verticalFilter(render.cropMode), "-map", "[v]", "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", String(CRF[render.quality]), "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
      "-movflags", "+faststart", "-f", "mp4", outPath,
    ],
    10 * 60_000,
  );
  if (signal) throw new MediaToolError(`ffmpeg killed by ${signal}: ${stderr.slice(-300)}`);
  if (code !== 0) throw new MediaToolError(`ffmpeg exited ${code}: ${stderr.slice(-500)}`);
}

/** One JPEG frame at `atSec`, 640px wide; null if it can't be decoded. Input seeking keeps this to a few range reads. */
export async function grabFrameJpeg(input: MediaInput, atSec: number): Promise<Buffer | null> {
  if (!ffmpegPath) throw new MediaToolError("ffmpeg binary not available on this platform.");
  const { code, signal, stdout, stderr } = await run(
    ffmpegPath,
    ["-v", "error", "-ss", atSec.toFixed(2), "-i", input.url, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", "-c:v", "mjpeg", "-f", "image2", "pipe:1"],
    90_000,
  );
  if (signal) throw new MediaToolError(`ffmpeg killed by ${signal}: ${stderr.slice(-300)}`);
  return code === 0 && stdout.length > 0 ? stdout : null;
}
