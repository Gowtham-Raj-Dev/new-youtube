// The PC helper: cuts videos into vertical Shorts with FFmpeg on this machine,
// so no cloud compute is paid for. The web app (on localhost) hands it a
// Storage download URL, polls for progress, then fetches the finished files and
// uploads them itself. Never deployed — run with `npm run helper`.
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  BANNER_POSITIONS,
  CROP_MODES,
  MAIN_VIDEO_PERCENT_MIN,
  MAX_SHORT_SECONDS,
  MIN_SHORT_SECONDS,
  OUTPUT_QUALITIES,
  REACTION_FITS,
  REACTION_PERCENT_MAX,
  REACTION_PERCENT_MIN,
  REACTION_POSITIONS,
  SHORT_HEIGHT,
  TAIL_MODES,
  VOICE_PITCH_MAX,
  VOICE_PITCH_MIN,
  bannerHeight,
  isFraming,
  planSegments,
  reactionHeight,
  type BannerPosition,
  type CropMode,
  type Framing,
  type OutputQuality,
  type ReactionLook,
  type Segment,
  type TailMode,
} from "@shortflow/shared";
import { InstagramError, clearSession, hasSession, listProfile, loginState, pipeInstagramFile, readLink, rememberAdded, saveSession, startLogin } from "./instagram";
import { changeVoicePitch, detectCrop, detectEncoder, grabFrameJpeg, probeMedia, renderShort, trimVideo, type BannerImage, type CropRect, type ReactionVideo } from "../lib/media";

/** SHORTFLOW_PORT is for trying a second helper beside a running one; the app always looks on 4777. */
const PORT = Number(process.env.SHORTFLOW_PORT) || 4777;
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

async function fetchBanners(job: Job, requests: Partial<Record<BannerPosition, BannerRequest>>) {
  const banners: Partial<Record<BannerPosition, BannerImage>> = {};
  for (const position of BANNER_POSITIONS) {
    const request = requests[position];
    if (!request) continue;
    const path = join(job.dir, `banner-${position}`);
    await download(request.url, path, "banner");
    banners[position] = { path, height: bannerHeight(request.width, request.height) };
  }
  return banners;
}

/** The banners asked for, or null if any of them isn't a usable request. */
function parseBanners(value: unknown): Partial<Record<BannerPosition, BannerRequest>> | null {
  const requested = (value ?? {}) as Partial<Record<BannerPosition, unknown>>;
  const banners: Partial<Record<BannerPosition, BannerRequest>> = {};
  for (const position of BANNER_POSITIONS) {
    const request = requested[position];
    if (request == null) continue;
    if (!isBannerRequest(request)) return null;
    banners[position] = request;
  }
  return banners;
}

/** Registers a job with a folder of its own, and reports how `work` ends. */
function openJob(id: string, dir: string, work: (job: Job) => Promise<void>) {
  const job: Job = { dir, status: "working", stage: "Starting", done: 0, total: 0, parts: [], error: null };
  jobs.set(id, job);
  work(job)
    .then(() => console.log(`[${id}] done: ${job.parts.length} Shorts`))
    .catch((error) => {
      console.error(`[${id}] failed:`, error);
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
    })
    .finally(() => setTimeout(() => discard(id), KEEP_MS).unref());
}

/** Reaction videos the browser has handed over, by id. One is reused for every Short of an import. */
const reactions = new Map<string, { path: string; hasAudio: boolean }>();
const REACTION_DIR = join(tmpdir(), "shortflow-helper", "reactions");
/** A forgotten reaction video is deleted after this long; an import of hundreds of Shorts fits well inside it. */
const REACTION_KEEP_MS = 24 * 60 * 60 * 1000;

/** What the browser sends to put a reaction video on a Short: which one, and how it sits in its strip. */
interface ReactionRequest extends Omit<ReactionLook, "position" | "sound"> {
  id: string;
  /** Left out by older versions of the app, which only knew the bottom. */
  position?: ReactionLook["position"];
  /** Left out by older versions of the app, which never used the reaction video's sound. */
  sound?: boolean;
}

function isReactionRequest(value: unknown): value is ReactionRequest {
  const r = value as ReactionRequest | null;
  return (
    typeof r === "object" && r !== null && typeof r.id === "string" && reactions.has(r.id) &&
    typeof r.percent === "number" && r.percent >= REACTION_PERCENT_MIN && r.percent <= REACTION_PERCENT_MAX &&
    (r.position === undefined || REACTION_POSITIONS.includes(r.position)) &&
    (r.sound === undefined || typeof r.sound === "boolean") &&
    REACTION_FITS.includes(r.fit) && typeof r.focus === "number" && r.focus >= 0 && r.focus <= 1
  );
}

/** The reaction video asked for, ready to render, after checking it leaves the Short's own video enough room. */
function prepareReaction(request: ReactionRequest | null, banners: Partial<Record<BannerPosition, BannerImage>>): ReactionVideo | null {
  const held = request && reactions.get(request.id);
  if (request && !held) throw new Error("The reaction video is gone. Choose it again.");
  const reaction = request && held ? { path: held.path, sound: Boolean(request.sound) && held.hasAudio, height: reactionHeight(request.percent), position: request.position ?? "bottom", fit: request.fit, focus: request.focus } : null;
  const taken = (banners.top?.height ?? 0) + (banners.bottom?.height ?? 0) + (reaction?.height ?? 0);
  if (SHORT_HEIGHT - taken < (SHORT_HEIGHT * MAIN_VIDEO_PERCENT_MIN) / 100 - 2) throw new Error("The banners and the reaction video leave too little room for the Short itself.");
  return reaction;
}

function discardReaction(id: string) {
  const held = reactions.get(id);
  if (!held) return;
  reactions.delete(id);
  void rm(held.path, { force: true });
}

/** Keeps the reaction video in the request body, and answers with the id to ask for it by. */
async function saveReaction(req: IncomingMessage, res: ServerResponse) {
  const id = randomUUID();
  const path = join(REACTION_DIR, id);
  await mkdir(REACTION_DIR, { recursive: true });
  try {
    await pipeline(req, createWriteStream(path));
  } catch (error) {
    void rm(path, { force: true });
    throw error;
  }
  const probe = await probeMedia({ url: path });
  if (!probe) {
    void rm(path, { force: true });
    return send(res, 422, { error: "Not a playable video." });
  }
  reactions.set(id, { path, hasAudio: probe.hasAudio });
  setTimeout(() => discardReaction(id), REACTION_KEEP_MS).unref();
  send(res, 200, { id });
}

/**
 * Long videos the browser hands over straight from the user's PC, by id — they
 * never go to the cloud. Kept until the app lets go of them (or a day passes),
 * so a video can be cut again without sending it twice.
 */
const sources = new Map<string, { path: string; size: number }>();
const SOURCE_DIR = join(tmpdir(), "shortflow-helper", "sources");

function discardSource(id: string) {
  const held = sources.get(id);
  if (!held) return;
  sources.delete(id);
  void rm(held.path, { force: true });
}

/** Keeps the long video in the request body; answers with the id to cut it by. `key` lets the same file be found again. */
async function saveSource(req: IncomingMessage, res: ServerResponse, key: string | null) {
  const id = key && /^[\w-]{6,80}$/.test(key) ? key : randomUUID();
  const expected = Number(req.headers["content-length"] ?? 0);
  const held = sources.get(id);
  if (held && held.size === expected && (await stat(held.path).catch(() => null))?.size === expected) {
    // Already here: drain the body and reuse it.
    req.resume();
    return send(res, 200, { id });
  }
  discardSource(id);
  const path = join(SOURCE_DIR, id);
  await mkdir(SOURCE_DIR, { recursive: true });
  try {
    await pipeline(req, createWriteStream(path));
  } catch (error) {
    void rm(path, { force: true });
    throw error;
  }
  const size = (await stat(path)).size;
  sources.set(id, { path, size });
  setTimeout(() => discardSource(id), REACTION_KEEP_MS).unref();
  console.log(`Holding a video from this PC (${Math.round(size / 1048576)} MB)`);
  send(res, 200, { id });
}

/** The black-bar crop the app measured, or undefined to measure it here. Null means none. */
function parseCrop(value: unknown): CropRect | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const c = value as CropRect;
  const whole = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0;
  return typeof c === "object" && whole(c.width) && whole(c.height) && whole(c.x) && whole(c.y) && c.width >= 16 && c.height >= 16 ? c : undefined;
}

/** Puts banners and a reaction video on a ready-made Short already saved as the job's source. It is re-framed in the space left, not cut. */
async function runWrap(job: Job, cropMode: CropMode, quality: OutputQuality, bannerRequests: Partial<Record<BannerPosition, BannerRequest>>, reactionRequest: ReactionRequest | null) {
  const source = join(job.dir, "source");
  job.total = 1;
  job.stage = "Fetching the banners";
  const banners = await fetchBanners(job, bannerRequests);
  const reaction = prepareReaction(reactionRequest, banners);

  const probe = await probeMedia({ url: source });
  if (!probe) throw new Error("This file isn't a playable video.");

  job.stage = "Rendering";
  const out = join(job.dir, "1.mp4");
  await renderShort({ url: source }, { startSec: 0, durationSec: probe.durationSec, cropMode, quality, banners, reaction, sourceHasAudio: probe.hasAudio, encoder: await encoderReady }, out);

  const frame = await grabFrameJpeg({ url: out }, Math.min(1, probe.durationSec / 2)).catch(() => null);
  if (frame) await pipeline(Readable.from(frame), createWriteStream(join(job.dir, "1.jpg")));

  job.parts = [{ index: 0, startSec: 0, endSec: probe.durationSec, durationSec: probe.durationSec, hasThumbnail: Boolean(frame) }];
  job.done = 1;
  await rm(source, { force: true });
  job.stage = "Done";
  job.status = "done";
}

async function runJob(
  job: Job,
  /** A Storage URL to fetch, or the path of a video held from this PC. */
  from: { url: string } | { path: string },
  shortDuration: number,
  cropMode: CropMode,
  quality: OutputQuality,
  bannerRequests: Partial<Record<BannerPosition, BannerRequest>>,
  labelRequest: LabelRequest | null,
  tail: TailMode,
  reactionRequest: ReactionRequest | null,
  framing: Framing | null,
  measuredCrop: CropRect | null | undefined,
  /** Text layers drawn by the app, base64 PNG: one per part, or one for every part. */
  overlays: string[],
  pitch: number,
) {
  // Written once; each Short takes its own (or the shared one).
  const overlayPaths: string[] = [];
  for (const [i, png] of overlays.entries()) {
    const path = join(job.dir, `text-${i}.png`);
    await writeFile(path, Buffer.from(png, "base64"));
    overlayPaths.push(path);
  }
  const overlayFor = (index: number) => (overlayPaths.length === 0 ? null : (overlayPaths[index] ?? overlayPaths[overlayPaths.length - 1]));
  const labelFor = (part: number, total: number) =>
    labelRequest && { text: labelRequest.template.replaceAll("{n}", String(part)).replaceAll("{total}", String(total)), x: labelRequest.x, y: labelRequest.y };
  let source: string;
  if ("path" in from) {
    source = from.path;
  } else {
    job.stage = "Fetching the video";
    source = join(job.dir, "source");
    await download(from.url, source, "video");
  }
  const banners = await fetchBanners(job, bannerRequests);
  const reaction = prepareReaction(reactionRequest, banners);

  const probe = await probeMedia({ url: source });
  if (!probe) throw new Error("This file isn't a playable video.");
  const segments = planSegments(probe.durationSec, shortDuration, tail);
  job.total = segments.length;
  // The app's own measurement wins, so the Shorts match its preview; it must lie inside the frame.
  const fits = (c: CropRect) => c.x + c.width <= probe.width && c.y + c.height <= probe.height;
  const crop = measuredCrop === undefined || (measuredCrop && !fits(measuredCrop)) ? await detectCrop({ url: source }, probe) : measuredCrop;
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
      await renderShort(
        { url: source },
        { startSec: segment.startSec, durationSec, cropMode, quality, banners, reaction, sourceHasAudio: probe.hasAudio, encoder, crop, label: labelFor(part, segments.length), framing, sourceSize: probe, overlay: overlayFor(segment.index), pitch },
        out,
      );

      const frame = await grabFrameJpeg({ url: out }, Math.min(1, durationSec / 2)).catch(() => null);
      if (frame) await pipeline(Readable.from(frame), createWriteStream(join(job.dir, `${part}.jpg`)));

      parts[segment.index] = { ...segment, durationSec, hasThumbnail: Boolean(frame) };
      job.done++;
      job.stage = `Cutting Shorts ${job.done} / ${segments.length}`;
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, segments.length) }, worker));
  job.parts = parts;
  // A video held from this PC stays for another cut until the app lets go of it.
  if (!("path" in from)) await rm(source, { force: true });
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
  const { url, sourceId, shortDuration, cropMode, quality, banners, label, tail = "own", reaction = null, framing = null, crop: cropValue, overlays = [], pitch = 1 } = await readJson(req);
  const validOverlays = Array.isArray(overlays) && overlays.length <= 1000 && overlays.every((o) => typeof o === "string" && o.length < 12_000_000 && /^[A-Za-z0-9+/=]+$/.test(o));
  const validPitch = typeof pitch === "number" && pitch >= VOICE_PITCH_MIN && pitch <= VOICE_PITCH_MAX;
  const validLength = typeof shortDuration === "number" && Number.isInteger(shortDuration) && shortDuration >= MIN_SHORT_SECONDS && shortDuration <= MAX_SHORT_SECONDS;
  const bannerRequests = parseBanners(banners);
  const held = typeof sourceId === "string" ? sources.get(sourceId) : undefined;
  if (typeof sourceId === "string" && !held) return send(res, 410, { error: "The video isn't held any more. Send it again." });
  const crop = parseCrop(cropValue);
  if (
    (!held && !isAllowedSource(url)) || !validLength || !bannerRequests || (label != null && !isLabelRequest(label)) || (reaction !== null && !isReactionRequest(reaction)) ||
    (framing !== null && !isFraming(framing)) || (cropValue != null && crop === undefined) || !validOverlays || !validPitch ||
    !TAIL_MODES.includes(tail as TailMode) || !CROP_MODES.includes(cropMode as CropMode) || !OUTPUT_QUALITIES.includes(quality as OutputQuality)
  ) {
    console.warn("Refused a split request:", { url: String(url).slice(0, 60), shortDuration, cropMode, quality, framing });
    return send(res, 400, { error: "Bad request." });
  }

  const id = randomUUID();
  const dir = join(tmpdir(), "shortflow-helper", id);
  await mkdir(dir, { recursive: true });
  console.log(`[${id}] cutting ${held ? "a video from this PC" : "a video"} into ${shortDuration}s Shorts (${cropMode}${isFraming(framing) ? `, size ${Math.round(framing.zoom * 100)}%` : ""}, ${quality})`);
  openJob(id, dir, (job) =>
    runJob(
      job,
      held ? { path: held.path } : { url: url as string },
      shortDuration,
      cropMode as CropMode,
      quality as OutputQuality,
      bannerRequests,
      isLabelRequest(label) ? label : null,
      tail as TailMode,
      isReactionRequest(reaction) ? reaction : null,
      isFraming(framing) ? framing : null,
      crop,
      overlays as string[],
      pitch as number,
    ),
  );

  send(res, 200, { jobId: id });
}

/**
 * Banners for a Short the user already has as a file. The MP4 is the request
 * body; the framing, quality and banners ride in the query string.
 */
async function startWrap(req: IncomingMessage, res: ServerResponse, query: URLSearchParams) {
  const cropMode = query.get("cropMode");
  const quality = query.get("quality");
  let bannerRequests: ReturnType<typeof parseBanners> = null;
  try {
    bannerRequests = parseBanners(JSON.parse(query.get("banners") ?? "{}"));
  } catch {
    // Not JSON: refused below.
  }
  let reaction: unknown = null;
  try {
    reaction = JSON.parse(query.get("reaction") ?? "null");
  } catch {
    reaction = undefined; // Not JSON: refused below.
  }
  const reactionRequest = isReactionRequest(reaction) ? reaction : null;
  const nothingToAdd = bannerRequests !== null && Object.keys(bannerRequests).length === 0 && !reactionRequest;
  if (!bannerRequests || (reaction !== null && !reactionRequest) || nothingToAdd || !CROP_MODES.includes(cropMode as CropMode) || !OUTPUT_QUALITIES.includes(quality as OutputQuality)) {
    console.warn("Refused a banner request:", { cropMode, quality });
    return send(res, 400, { error: "Bad request." });
  }

  const id = randomUUID();
  const dir = join(tmpdir(), "shortflow-helper", id);
  await mkdir(dir, { recursive: true });
  try {
    await pipeline(req, createWriteStream(join(dir, "source")));
  } catch (error) {
    void rm(dir, { recursive: true, force: true });
    throw error;
  }
  console.log(`[${id}] adding ${reactionRequest ? "a reaction video" : "banners"} to a Short (${cropMode}, ${quality})`);
  openJob(id, dir, (job) => runWrap(job, cropMode as CropMode, quality as OutputQuality, bannerRequests, reactionRequest));

  send(res, 200, { jobId: id });
}

/**
 * A Short's voice pitched up or down, sent straight back as the response. The
 * app sends the Short's Storage URL and the pitch (0.6–1.6; 1 = an untouched copy).
 */
async function changeVoice(req: IncomingMessage, res: ServerResponse) {
  const { url, pitch } = await readJson(req);
  if (!isAllowedSource(url) || typeof pitch !== "number" || !(pitch >= 0.6 && pitch <= 1.6)) {
    console.warn("Refused a voice request:", { url: String(url).slice(0, 60), pitch });
    return send(res, 400, { error: "Bad request." });
  }
  const dir = join(tmpdir(), "shortflow-helper", randomUUID());
  await mkdir(dir, { recursive: true });
  const out = join(dir, "voice.mp4");
  try {
    console.log(pitch === 1 ? "copying a Short's original voice" : `changing a Short's voice (pitch ×${pitch})`);
    await changeVoicePitch({ url }, out, pitch);
    const info = await stat(out);
    res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": info.size });
    await pipeline(createReadStream(out), res);
  } finally {
    void rm(dir, { recursive: true, force: true });
  }
}

/** A Short cut down to `startSec`…`endSec`, sent straight back as the response; its length is in `X-Duration`. */
async function trimShort(req: IncomingMessage, res: ServerResponse) {
  const { url, startSec, endSec } = await readJson(req);
  const ok = isAllowedSource(url) && typeof startSec === "number" && typeof endSec === "number" && startSec >= 0 && endSec - startSec >= 0.5 && endSec - startSec <= MAX_SHORT_SECONDS + 1;
  if (!ok) {
    console.warn("Refused a trim request:", { url: String(url).slice(0, 60), startSec, endSec });
    return send(res, 400, { error: "Bad request." });
  }
  const dir = join(tmpdir(), "shortflow-helper", randomUUID());
  await mkdir(dir, { recursive: true });
  const out = join(dir, "trimmed.mp4");
  try {
    console.log(`trimming a Short to ${startSec.toFixed(2)}–${endSec.toFixed(2)}s`);
    await trimVideo({ url }, out, startSec, endSec, await encoderReady);
    const probe = await probeMedia({ url: out });
    const info = await stat(out);
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": info.size,
      "X-Duration": String(probe?.durationSec ?? endSec - startSec),
      "Access-Control-Expose-Headers": "X-Duration",
    });
    await pipeline(createReadStream(out), res);
  } finally {
    void rm(dir, { recursive: true, force: true });
  }
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

/** Instagram: the saved session, a profile's videos, and their files. What goes wrong is answered in words the app shows as they are. */
async function instagram(req: IncomingMessage, res: ServerResponse, path: string, query: URLSearchParams) {
  try {
    if (path === "/instagram/session" && req.method === "GET") return send(res, 200, { saved: await hasSession() });
    if (path === "/instagram/session" && req.method === "POST") return await saveSession((await readJson(req)).sessionId), send(res, 200, { saved: true });
    if (path === "/instagram/session" && req.method === "DELETE") return await clearSession(), send(res, 200, { saved: false });
    if (path === "/instagram/login" && req.method === "GET") return send(res, 200, loginState());
    if (path === "/instagram/login" && req.method === "POST") return send(res, 200, startLogin());
    // Listing is a POST so that only the app can ask: a page elsewhere can't send one here without naming itself.
    if (path === "/instagram/profile" && req.method === "POST") {
      const { profile, cursor } = await readJson(req);
      return send(res, 200, await listProfile(profile, cursor));
    }
    if (path === "/instagram/link" && req.method === "POST") return send(res, 200, await readLink((await readJson(req)).link));
    if (path === "/instagram/added" && req.method === "POST") return await rememberAdded((await readJson(req)).ids), send(res, 200, { ok: true });
    if (path === "/instagram/file" && req.method === "GET") return await pipeInstagramFile(query.get("url"), res);
    return send(res, 404, { error: "Not found." });
  } catch (error) {
    if (!(error instanceof InstagramError)) throw error;
    if (!res.headersSent) send(res, error.status, { error: error.message });
  }
}

/**
 * The deployed app's addresses, comma-separated. The downloadable helper has
 * them built in (see scripts/pack-helper.mjs); run from source, only this machine's pages are let in.
 */
const APP_ORIGINS = (process.env.SHORTFLOW_ORIGINS ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);

const isAllowedOrigin = (origin: string) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || APP_ORIGINS.includes(origin);

const server = createServer((req, res) => {
  // Only the app — on this machine, or at its own address — may talk to the helper. Any other website is turned away.
  const origin = req.headers.origin ?? "";
  if (origin && !isAllowedOrigin(origin)) return void res.writeHead(403).end();
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // Browsers ask before letting a public page reach this PC; this says the helper expects it.
  res.setHeader("Access-Control-Allow-Private-Network", "true");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") return void res.writeHead(204).end();

  const { pathname: path, searchParams } = new URL(req.url ?? "/", "http://helper");
  const match = /^\/jobs\/([\w-]+)(?:\/(\d+\.(?:mp4|jpg)))?$/.exec(path);
  const job = match ? jobs.get(match[1]) : undefined;

  Promise.resolve()
    .then(() => {
      if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });
      if (req.method === "POST" && path === "/split") return startSplit(req, res);
      if (req.method === "POST" && path === "/wrap") return startWrap(req, res, searchParams);
      if (req.method === "POST" && path === "/frame") return measureFrame(req, res);
      if (req.method === "POST" && path === "/voice") return changeVoice(req, res);
      if (req.method === "POST" && path === "/trim") return trimShort(req, res);
      if (req.method === "POST" && path === "/reactions") return saveReaction(req, res);
      if (req.method === "POST" && path === "/sources") return saveSource(req, res, searchParams.get("key"));
      const sourceKey = /^\/sources\/([\w-]+)$/.exec(path)?.[1];
      if (req.method === "DELETE" && sourceKey) return discardSource(sourceKey), send(res, 200, { ok: true });
      if (path.startsWith("/instagram/")) return instagram(req, res, path, searchParams);
      const reactionId = /^\/reactions\/([\w-]+)$/.exec(path)?.[1];
      if (req.method === "DELETE" && reactionId) return discardReaction(reactionId), send(res, 200, { ok: true });
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
  // Opened by double-click, the window would vanish with the message; leave it up long enough to read.
  setTimeout(() => process.exit(1), process.env.SHORTFLOW_ORIGINS ? 8000 : 0);
});
server.listen(PORT, "127.0.0.1", () => console.log(`ShortFlow PC helper ready on http://127.0.0.1:${PORT} — keep this window open while you generate Shorts.`));
