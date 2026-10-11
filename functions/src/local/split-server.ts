// The PC helper: cuts videos into vertical Shorts with FFmpeg on this machine,
// so no cloud compute is paid for. The web app (on localhost) hands it a
// Storage download URL, polls for progress, then fetches the finished files and
// uploads them itself. Never deployed — run with `npm run helper`.
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { BANNER_POSITIONS, CROP_MODES, MAX_SHORT_SECONDS, MIN_SHORT_SECONDS, OUTPUT_QUALITIES, bannerHeight, planSegments, type BannerPosition, type CropMode, type OutputQuality, type Segment } from "@shortflow/shared";
import { detectCrop, detectEncoder, grabFrameJpeg, probeMedia, renderShort, type BannerImage, type CropRect } from "../lib/media";

const PORT = 4777;
/** Only ever fetch sources from Firebase Storage (or its local emulator). */
const SOURCE_HOSTS = ["firebasestorage.googleapis.com", "127.0.0.1"];
/** Finished files are deleted this long after a job ends, in case the browser never collects them. */
const KEEP_MS = 60 * 60 * 1000;

interface Job {
  dir: string;
  status: "working" | "done" | "failed";
  stage: string;
  done: number;
  total: number;
  parts: Array<Segment & { durationSec: number; hasThumbnail: boolean }>;
  error: string | null;
}

const jobs = new Map<string, Job>();

/** Shorts cut at the same time. More than this and they fight over the CPU and memory. */
const PARALLEL = 4;
/** A GPU encoder if this PC has one — several times faster than software. */
const encoderReady = detectEncoder().then((encoder) => (console.log(`Video encoder: ${encoder}`), encoder));

/** What the browser sends for a banner: where the image is and its pixel size. */
interface BannerRequest {
  url: string;
  width: number;
  height: number;
}

function isAllowedSource(url: unknown): url is string {
  try {
    return SOURCE_HOSTS.includes(new URL(String(url)).hostname);
  } catch {
    return false;
  }
}

function isBannerRequest(value: unknown): value is BannerRequest {
  const b = value as BannerRequest | null;
  return typeof b === "object" && b !== null && isAllowedSource(b.url) && b.width > 0 && b.height > 0;
}

async function download(url: string, path: string, what: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Couldn't fetch the ${what} (${res.status}).`);
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(path));
}

/** A label written on every Short. `{n}` becomes the part number and `{total}` the number of parts. */
interface LabelRequest {
  template: string;
  /** Where its centre goes, as 0–1 shares of the frame's width and height. */
  x: number;
  y: number;
}

function isLabelRequest(value: unknown): value is LabelRequest {
  const l = value as LabelRequest | null;
  const share = (n: unknown) => typeof n === "number" && n >= 0 && n <= 1;
  return typeof l === "object" && l !== null && typeof l.template === "string" && l.template.length <= 40 && share(l.x) && share(l.y);
}

async function runJob(
  job: Job,
  sourceUrl: string,
  shortDuration: number,
  cropMode: CropMode,
  quality: OutputQuality,
  bannerRequests: Partial<Record<BannerPosition, BannerRequest>>,
  labelRequest: LabelRequest | null,
) {
  const labelFor = (part: number, total: number) =>
    labelRequest && { text: labelRequest.template.replaceAll("{n}", String(part)).replaceAll("{total}", String(total)), x: labelRequest.x, y: labelRequest.y };
  job.stage = "Fetching the video";
  const source = join(job.dir, "source");
  await download(sourceUrl, source, "video");

  const banners: Partial<Record<BannerPosition, BannerImage>> = {};
  for (const position of BANNER_POSITIONS) {
    const request = bannerRequests[position];
    if (!request) continue;
    const path = join(job.dir, `banner-${position}`);
    await download(request.url, path, "banner");
    banners[position] = { path, height: bannerHeight(request.width, request.height) };
  }

  const probe = await probeMedia({ url: source });
  if (!probe) throw new Error("This file isn't a playable video.");
  const segments = planSegments(probe.durationSec, shortDuration);
  job.total = segments.length;
  const crop = await detectCrop({ url: source }, probe);
  if (crop) console.log(`Removing black bars: keeping ${crop.width}x${crop.height} of ${probe.width}x${probe.height}`);

  // Several Shorts are cut at once; each worker takes the next uncut segment.
  const encoder = await encoderReady;
  const parts: Job["parts"] = [];
  let next = 0;
  job.stage = `Cutting Shorts 0 / ${segments.length}`;
  const worker = async () => {
    while (next < segments.length) {
      const segment = segments[next++];
      const part = segment.index + 1;
      const durationSec = Math.round((segment.endSec - segment.startSec) * 100) / 100;
      const out = join(job.dir, `${part}.mp4`);
      await renderShort({ url: source }, { startSec: segment.startSec, durationSec, cropMode, quality, banners, encoder, crop, label: labelFor(part, segments.length) }, out);

      const frame = await grabFrameJpeg({ url: out }, Math.min(1, durationSec / 2)).catch(() => null);
      if (frame) await pipeline(Readable.from(frame), createWriteStream(join(job.dir, `${part}.jpg`)));

      parts[segment.index] = { ...segment, durationSec, hasThumbnail: Boolean(frame) };
      job.done++;
      job.stage = `Cutting Shorts ${job.done} / ${segments.length}`;
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, segments.length) }, worker));
  job.parts = parts;
  await rm(source, { force: true });
  job.stage = "Done";
  job.status = "done";
}

function discard(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  void rm(job.dir, { recursive: true, force: true });
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

async function startSplit(req: IncomingMessage, res: ServerResponse) {
  const { url, shortDuration, cropMode, quality, banners, label } = await readJson(req);
  const validLength = typeof shortDuration === "number" && Number.isInteger(shortDuration) && shortDuration >= MIN_SHORT_SECONDS && shortDuration <= MAX_SHORT_SECONDS;
  const requested = (banners ?? {}) as Partial<Record<BannerPosition, unknown>>;
  const validBanners = BANNER_POSITIONS.every((position) => requested[position] == null || isBannerRequest(requested[position]));
  if (!isAllowedSource(url) || !validLength || !validBanners || (label != null && !isLabelRequest(label)) || !CROP_MODES.includes(cropMode as CropMode) || !OUTPUT_QUALITIES.includes(quality as OutputQuality)) {
    console.warn("Refused a split request:", { url: String(url).slice(0, 60), shortDuration, cropMode, quality });
    return send(res, 400, { error: "Bad request." });
  }
  const bannerRequests: Partial<Record<BannerPosition, BannerRequest>> = {};
  for (const position of BANNER_POSITIONS) if (isBannerRequest(requested[position])) bannerRequests[position] = requested[position];

  const id = randomUUID();
  const dir = join(tmpdir(), "shortflow-helper", id);
  await mkdir(dir, { recursive: true });
  const job: Job = { dir, status: "working", stage: "Starting", done: 0, total: 0, parts: [], error: null };
  jobs.set(id, job);
  console.log(`[${id}] cutting into ${shortDuration}s Shorts (${cropMode}, ${quality})`);

  runJob(job, url, shortDuration, cropMode as CropMode, quality as OutputQuality, bannerRequests, isLabelRequest(label) ? label : null)
    .then(() => console.log(`[${id}] done: ${job.parts.length} Shorts`))
    .catch((error) => {
      console.error(`[${id}] failed:`, error);
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
    })
    .finally(() => setTimeout(() => discard(id), KEEP_MS).unref());

  send(res, 200, { jobId: id });
}

/** Remembered per file, so reopening a video's preview doesn't measure it again. */
const frames = new Map<string, Promise<{ width: number; height: number; crop: CropRect | null } | null>>();

/** For the preview: the source's frame size and where its real picture is, read straight from the URL. */
async function measureFrame(req: IncomingMessage, res: ServerResponse) {
  const { url } = await readJson(req);
  if (!isAllowedSource(url)) return send(res, 400, { error: "Bad request." });

  const key = new URL(url).pathname;
  let pending = frames.get(key);
  if (!pending) {
    pending = probeMedia({ url }).then(async (probe) => (probe ? { width: probe.width, height: probe.height, crop: await detectCrop({ url }, probe) } : null));
    frames.set(key, pending);
    pending.catch(() => frames.delete(key));
  }
  const frame = await pending;
  return frame ? send(res, 200, frame) : send(res, 422, { error: "Not a playable video." });
}

async function sendFile(res: ServerResponse, job: Job, name: string) {
  const path = join(job.dir, name);
  const info = await stat(path).catch(() => null);
  if (!info) return send(res, 404, { error: "Not found." });
  res.writeHead(200, { "Content-Type": name.endsWith(".mp4") ? "video/mp4" : "image/jpeg", "Content-Length": info.size });
  createReadStream(path).pipe(res);
}

const server = createServer((req, res) => {
  // Only pages served from this machine may talk to the helper.
  const origin = req.headers.origin ?? "";
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return void res.writeHead(204).end();

  const path = new URL(req.url ?? "/", "http://helper").pathname;
  const match = /^\/jobs\/([\w-]+)(?:\/(\d+\.(?:mp4|jpg)))?$/.exec(path);
  const job = match ? jobs.get(match[1]) : undefined;

  Promise.resolve()
    .then(() => {
      if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });
      if (req.method === "POST" && path === "/split") return startSplit(req, res);
      if (req.method === "POST" && path === "/frame") return measureFrame(req, res);
      if (!match || !job) return send(res, 404, { error: "Not found." });
      if (req.method === "DELETE" && !match[2]) return discard(match[1]), send(res, 200, { ok: true });
      if (req.method === "GET" && match[2]) return sendFile(res, job, match[2]);
      if (req.method === "GET") return send(res, 200, { status: job.status, stage: job.stage, done: job.done, total: job.total, parts: job.parts, error: job.error });
      return send(res, 405, { error: "Method not allowed." });
    })
    .catch((error) => {
      console.error(error);
      if (!res.headersSent) send(res, 500, { error: "The helper hit a problem." });
    });
});

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE" ? `Port ${PORT} is in use — the helper is probably already running.` : error);
  process.exit(1);
});
server.listen(PORT, "127.0.0.1", () => console.log(`ShortFlow PC helper ready on http://127.0.0.1:${PORT} — keep this window open while you generate Shorts.`));
