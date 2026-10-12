import { spawn } from "node:child_process";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Readable } from "node:stream";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";
import * as logger from "firebase-functions/logger";
import { getStorage } from "firebase-admin/storage";
import { SHORT_HEIGHT, SHORT_WIDTH, type CropMode, type OutputQuality, type ReactionFit, type ReactionPosition } from "@shortflow/shared";

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

const CRF: Record<OutputQuality, number> = { standard: 26, high: 23, max: 20 };

/** Filter graph that turns the frames on pad `source` into 1080×`height`, ending in `[out]`. */
function frameFilter(source: string, cropMode: CropMode, height: number, out: string): string {
  const size = `${SHORT_WIDTH}:${height}`;
  switch (cropMode) {
    case "fit":
      return `[${source}]scale=${size}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=bilinear,pad=${size}:(ow-iw)/2:(oh-ih)/2,setsar=1[${out}]`;
    case "blur": {
      // Blurring a quarter-size copy looks the same once scaled up, and costs a fraction of the CPU.
      const small = `${SHORT_WIDTH / 4}:${2 * Math.round(height / 8)}`;
      return [
        `[${source}]split=2[bgsrc][fgsrc]`,
        `[bgsrc]scale=${small}:force_original_aspect_ratio=increase,crop=${small},boxblur=10:2,scale=${size}:flags=fast_bilinear[bg]`,
        `[fgsrc]scale=${size}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=bilinear[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[${out}]`,
      ].join(";");
    }
    default:
      // `center`. Smart framing isn't built yet and falls back to it.
      return `[${source}]scale=${size}:force_original_aspect_ratio=increase:flags=bilinear,crop=${size},setsar=1[${out}]`;
  }
}

/** An image laid across the top or bottom of the Short, at the canvas height `bannerHeight()` gives it. */
export interface BannerImage {
  path: string;
  height: number;
}

/** A reaction video on disk, with the strip height `reactionHeight()` gives it. */
export interface ReactionVideo {
  path: string;
  height: number;
  /** `top`: under the top banner, above the video. `bottom`: under the video, above the bottom banner. */
  position: ReactionPosition;
  fit: ReactionFit;
  /** With `fill`, which part of it is kept: 0 is its top, 1 its bottom. */
  focus: number;
}

export interface ShortRender {
  startSec: number;
  durationSec: number;
  cropMode: CropMode;
  quality: OutputQuality;
  /** The video fills whatever is left between the banners. */
  banners?: { top?: BannerImage; bottom?: BannerImage };
  /** A second video in a strip next to the top or bottom banner, looped to the Short's length and muted. The video gets the space that is left. */
  reaction?: ReactionVideo | null;
  /** Defaults to libx264, which works everywhere. */
  encoder?: VideoEncoder;
  /** The part of the source frame that is real picture, from `detectCrop()`. */
  crop?: CropRect | null;
  /** Text burned onto the Short, centred on (`x`, `y`) — each a 0–1 share of the frame's width and height. */
  label?: { text: string; x: number; y: number } | null;
}

/** Label text size and the padding of the dark box behind it, in canvas pixels. The web preview mirrors these. */
const LABEL_FONT_SIZE = 60;
const LABEL_BOX = 22;

/**
 * Bold system font for labels. Only the PC helper draws labels, and it runs on
 * the user's Windows or Mac. The drive colon is escaped for ffmpeg's filter syntax.
 */
const LABEL_FONT = process.platform === "win32" ? "C\\:/Windows/Fonts/arialbd.ttf" : "/System/Library/Fonts/Supplemental/Arial Bold.ttf";

export interface CropRect {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Finds black bars baked into the picture (a widescreen film inside a 16:9
 * file, say) by sampling three moments, and returns the area without them.
 * Null when there are no bars worth removing. The widest area seen wins, so a
 * dark scene can't make it crop into the picture.
 */
export async function detectCrop(input: MediaInput, probe: Pick<ProbeResult, "durationSec" | "width" | "height">): Promise<CropRect | null> {
  if (!ffmpegPath) return null;
  let left = probe.width;
  let top = probe.height;
  let right = 0;
  let bottom = 0;
  for (const at of [0.2, 0.5, 0.8]) {
    const { stderr } = await run(
      ffmpegPath,
      ["-hide_banner", "-nostats", "-v", "info", "-ss", (probe.durationSec * at).toFixed(2), "-i", input.url, "-frames:v", "12", "-vf", "cropdetect=limit=24:round=2:reset=0", "-an", "-f", "null", "-"],
      60_000,
    );
    const found = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    if (!found) continue;
    const [width, height, x, y] = found.slice(1).map(Number);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + width);
    bottom = Math.max(bottom, y + height);
  }

  const crop = { width: right - left, height: bottom - top, x: left, y: top };
  const sensible = crop.width >= probe.width / 2 && crop.height >= probe.height / 2;
  const worthIt = crop.width < probe.width * 0.97 || crop.height < probe.height * 0.97;
  return sensible && worthIt ? crop : null;
}

/** H.264 encoders, fastest first: the three GPU ones, then software. */
export const VIDEO_ENCODERS = ["h264_nvenc", "h264_amf", "h264_qsv", "libx264"] as const;
export type VideoEncoder = (typeof VIDEO_ENCODERS)[number];

function encoderArgs(encoder: VideoEncoder, quality: OutputQuality): string[] {
  const q = String(CRF[quality]);
  switch (encoder) {
    case "h264_nvenc":
      return ["-c:v", encoder, "-preset", "p3", "-rc", "vbr", "-cq", q, "-b:v", "0", "-pix_fmt", "nv12"];
    case "h264_amf":
      return ["-c:v", encoder, "-quality", "speed", "-rc", "cqp", "-qp_i", q, "-qp_p", q, "-pix_fmt", "nv12"];
    case "h264_qsv":
      return ["-c:v", encoder, "-preset", "veryfast", "-global_quality", q, "-pix_fmt", "nv12"];
    default:
      return ["-c:v", "libx264", "-preset", "superfast", "-crf", q, "-pix_fmt", "yuv420p"];
  }
}

/** The fastest encoder this machine can actually run, found by encoding one second with each. */
export async function detectEncoder(): Promise<VideoEncoder> {
  if (!ffmpegPath) return "libx264";
  for (const encoder of VIDEO_ENCODERS) {
    if (encoder === "libx264") break;
    const { code } = await run(
      ffmpegPath,
      ["-v", "error", "-f", "lavfi", "-i", `testsrc2=size=${SHORT_WIDTH}x${SHORT_HEIGHT}:rate=30:duration=1`, ...encoderArgs(encoder, "high"), "-f", "null", "-"],
      30_000,
    ).catch(() => ({ code: 1 }));
    if (code === 0) return encoder;
  }
  return "libx264";
}

/** Cuts one segment out of `input` and writes it to `outPath` as a vertical H.264/AAC MP4. Throws MediaToolError. */
export async function renderShort(input: MediaInput, render: ShortRender, outPath: string): Promise<void> {
  if (!ffmpegPath) throw new MediaToolError("ffmpeg binary not available on this platform.");

  const { top, bottom } = render.banners ?? {};
  const { reaction } = render;
  const topHeight = top?.height ?? 0;
  const bottomHeight = bottom?.height ?? 0;
  const videoHeight = SHORT_HEIGHT - topHeight - bottomHeight - (reaction?.height ?? 0);
  // A reaction strip at the top pushes the video down by its height.
  const videoY = topHeight + (reaction?.position === "top" ? reaction.height : 0);
  const images: string[] = [];
  // Black bars baked into the source go first, so the picture itself is what gets framed.
  const { crop } = render;
  const cropped = crop ? `[0:v]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}[picture];` : "";
  let filter = cropped + frameFilter(crop ? "picture" : "0:v", render.cropMode, videoHeight, "framed");
  let composed = "framed";
  if (top || bottom || reaction) {
    // Canvas with the video in its slot, then each banner scaled to fit its strip and laid over it.
    filter += `;[framed]pad=${SHORT_WIDTH}:${SHORT_HEIGHT}:0:${videoY}:black[base0]`;
    composed = "base0";
    for (const [banner, y] of [[top, 0], [bottom, SHORT_HEIGHT - bottomHeight]] as const) {
      if (!banner) continue;
      images.push("-i", banner.path);
      const n = images.length / 2;
      const strip = `${SHORT_WIDTH}:${banner.height}`;
      filter += `;[${n}:v]scale=${strip}:force_original_aspect_ratio=decrease,pad=${strip}:(ow-iw)/2:(oh-ih)/2:black[banner${n}];[${composed}][banner${n}]overlay=0:${y}[base${n}]`;
      composed = `base${n}`;
    }
  }
  // The reaction video plays on repeat in its strip; the output is cut at the Short's own length (`-t` below).
  const looped: string[] = [];
  if (reaction) {
    looped.push("-stream_loop", "-1", "-i", reaction.path);
    const n = images.length / 2 + 1;
    const strip = `${SHORT_WIDTH}:${reaction.height}`;
    const framed =
      reaction.fit === "fit"
        ? `scale=${strip}:force_original_aspect_ratio=decrease:force_divisible_by=2:flags=bilinear,pad=${strip}:(ow-iw)/2:(oh-ih)/2:black`
        : `scale=${strip}:force_original_aspect_ratio=increase:flags=bilinear,crop=${strip}:(iw-ow)/2:(ih-oh)*${Math.min(1, Math.max(0, reaction.focus)).toFixed(3)}`;
    filter += `;[${n}:v]${framed},setsar=1[reaction];[${composed}][reaction]overlay=0:${reaction.position === "top" ? topHeight : SHORT_HEIGHT - bottomHeight - reaction.height}[withreaction]`;
    composed = "withreaction";
  }

  // The label ("Part 3") is centred on the point the user dragged it to, kept clear of the frame's edges.
  const { label } = render;
  const text = label?.text.replace(/[^\p{L}\p{N} #.\-–/!?&+]/gu, "").trim();
  let drawLabel = "";
  if (label && text) {
    const edge = LABEL_BOX + 12;
    const x = `max(${edge},min(w-text_w-${edge},${Math.round(SHORT_WIDTH * label.x)}-text_w/2))`;
    const y = `max(${edge},min(h-text_h-${edge},${Math.round(SHORT_HEIGHT * label.y)}-text_h/2))`;
    drawLabel = `drawtext=fontfile='${LABEL_FONT}':text='${text}':fontsize=${LABEL_FONT_SIZE}:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=${LABEL_BOX}:x='${x}':y='${y}',`;
  }
  filter += `;[${composed}]${drawLabel}setsar=1[v]`;

  const { code, signal, stderr } = await run(
    ffmpegPath,
    [
      "-v", "error", "-y",
      "-ss", render.startSec.toFixed(2), "-t", render.durationSec.toFixed(2), "-i", input.url,
      ...images, ...looped,
      "-filter_complex", filter, "-map", "[v]", "-map", "0:a:0?",
      ...(reaction ? ["-t", render.durationSec.toFixed(2)] : []),
      ...encoderArgs(render.encoder ?? "libx264", render.quality), "-r", "30",
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
