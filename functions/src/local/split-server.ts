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
import { CROP_MODES, MAX_SHORT_SECONDS, MIN_SHORT_SECONDS, OUTPUT_QUALITIES, planSegments, type CropMode, type OutputQuality, type Segment } from "@shortflow/shared";
import { grabFrameJpeg, probeMedia, renderShort } from "../lib/media";

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

async function runJob(job: Job, sourceUrl: string, shortDuration: number, cropMode: CropMode, quality: OutputQuality) {
  job.stage = "Fetching the video";
  const res = await fetch(sourceUrl);
  if (!res.ok || !res.body) throw new Error(`Couldn't fetch the video (${res.status}).`);
  const source = join(job.dir, "source");
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(source));

  const probe = await probeMedia({ url: source });
  if (!probe) throw new Error("This file isn't a playable video.");
  const segments = planSegments(probe.durationSec, shortDuration);
  job.total = segments.length;

  for (const segment of segments) {
    const part = segment.index + 1;
    job.stage = `Cutting Short ${part} / ${segments.length}`;
    const durationSec = Math.round((segment.endSec - segment.startSec) * 100) / 100;
    const out = join(job.dir, `${part}.mp4`);
    await renderShort({ url: source }, { startSec: segment.startSec, durationSec, cropMode, quality }, out);

    const frame = await grabFrameJpeg({ url: out }, Math.min(1, durationSec / 2)).catch(() => null);
    if (frame) await pipeline(Readable.from(frame), createWriteStream(join(job.dir, `${part}.jpg`)));

    job.parts.push({ ...segment, durationSec, hasThumbnail: Boolean(frame) });
    job.done = part;
  }
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
  const { url, shortDuration, cropMode, quality } = await readJson(req);
  let host = "";
  try {
    host = new URL(String(url)).hostname;
  } catch {
    // falls through to the check below
  }
  const validLength = typeof shortDuration === "number" && Number.isInteger(shortDuration) && shortDuration >= MIN_SHORT_SECONDS && shortDuration <= MAX_SHORT_SECONDS;
  if (!SOURCE_HOSTS.includes(host) || !validLength || !CROP_MODES.includes(cropMode as CropMode) || !OUTPUT_QUALITIES.includes(quality as OutputQuality)) {
    return send(res, 400, { error: "Bad request." });
  }

  const id = randomUUID();
  const dir = join(tmpdir(), "shortflow-helper", id);
  await mkdir(dir, { recursive: true });
  const job: Job = { dir, status: "working", stage: "Starting", done: 0, total: 0, parts: [], error: null };
  jobs.set(id, job);

  runJob(job, String(url), shortDuration, cropMode as CropMode, quality as OutputQuality)
    .catch((error) => {
      console.error(`[${id}] failed:`, error);
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
    })
    .finally(() => setTimeout(() => discard(id), KEEP_MS).unref());

  send(res, 200, { jobId: id });
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
