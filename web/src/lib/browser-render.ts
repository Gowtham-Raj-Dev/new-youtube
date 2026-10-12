import { SHORT_HEIGHT, SHORT_WIDTH, type BannerPosition, type CropMode, type OutputQuality, type ReactionLook } from "@shortflow/shared";
import type { VideoSample, WrappedCanvas } from "mediabunny";

/**
 * Renders a Short in the browser itself, for when the PC helper isn't running:
 * the browser's own video decoder and encoder (WebCodecs) do the work, so
 * nothing is installed and no cloud compute is used. It draws the same frame
 * the helper's FFmpeg graph does — see `renderShort()` in functions/src/lib/media.ts —
 * except that black bars baked into a source video are not detected and removed.
 */

/** A failure with a message fit to show the user. */
export class BrowserRenderError extends Error {}

export interface BrowserRenderJob {
  /** A file, or a URL that allows cross-origin ranged reads. */
  source: Blob | string;
  /** The part to keep, in seconds. `null` keeps the whole video. */
  trim: { startSec: number; endSec: number } | null;
  cropMode: CropMode;
  quality: OutputQuality;
  /** Each banner at the canvas height `bannerHeight()` gives it. */
  banners: Partial<Record<BannerPosition, { image: ImageBitmap; height: number }>>;
  /** Played on repeat in a strip above or below the Short's own video, `height` canvas pixels tall. */
  reaction: (Pick<ReactionLook, "position" | "fit" | "focus"> & { file: Blob; height: number }) | null;
  /** Text centred on (`x`, `y`), each a 0–1 share of the frame. */
  label: { text: string; x: number; y: number } | null;
}

export interface BrowserRenderResult {
  video: Blob;
  thumbnail: Blob | null;
  durationSec: number;
}

// Mirrors of the helper's label constants.
const LABEL_FONT_SIZE = 60;
const LABEL_BOX = 22;

let supported: Promise<boolean> | null = null;

/** Whether this browser can encode a Short by itself (it needs WebCodecs with H.264). */
export function canRenderInBrowser(): Promise<boolean> {
  supported ??= (async () => {
    if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined" || typeof OffscreenCanvas === "undefined") return false;
    try {
      const { canEncodeVideo } = await import("mediabunny");
      return await canEncodeVideo("avc", { width: SHORT_WIDTH, height: SHORT_HEIGHT });
    } catch {
      return false;
    }
  })();
  return supported;
}

/** The part of a `sw`×`sh` picture that fills a `dw`×`dh` box exactly; `focusY` picks which part when it is too tall. */
function coverRect(sw: number, sh: number, dw: number, dh: number, focusY = 0.5) {
  const scale = Math.max(dw / sw, dh / sh);
  const width = dw / scale;
  const height = dh / scale;
  return { x: (sw - width) / 2, y: (sh - height) * focusY, width, height };
}

/** Where a `sw`×`sh` picture sits when shown whole, centred, in a `dw`×`dh` box. */
function containRect(sw: number, sh: number, dw: number, dh: number) {
  const scale = Math.min(dw / sw, dh / sh);
  const width = sw * scale;
  const height = sh * scale;
  return { x: (dw - width) / 2, y: (dh - height) / 2, width, height };
}

/** Hands out the reaction video's frame for any moment of the Short, starting over each time it runs out. */
async function openReaction(file: Blob) {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await import("mediabunny");
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track || !(await track.canDecode())) throw new BrowserRenderError("Your browser can't play the reaction video. Use an MP4 file.");
  const duration = await track.computeDuration();
  const start = await track.getFirstTimestamp();
  if (!(duration - start > 0.05)) throw new BrowserRenderError("The reaction video is too short to use.");
  // A small pool: only the frame on screen and the one after it are ever held.
  const sink = new CanvasSink(track, { poolSize: 3 });

  let frames = sink.canvases(start);
  let current: WrappedCanvas | null = null;
  let next: WrappedCanvas | null = null;
  let ended = false;
  const pull = async () => {
    const step = await frames.next();
    ended = Boolean(step.done);
    next = step.done ? null : step.value;
  };

  return {
    width: track.displayWidth,
    height: track.displayHeight,
    async frameAt(sec: number): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
      const at = start + (sec % (duration - start));
      if (!current || at < current.timestamp) {
        // Wrapped round to the beginning (or the very first frame).
        await frames.return();
        frames = sink.canvases(start);
        current = null;
        await pull();
      }
      while (next && (next as WrappedCanvas).timestamp <= at) {
        current = next;
        if (ended) break;
        await pull();
      }
      current ??= next;
      return current?.canvas ?? null;
    },
    async close() {
      await frames.return();
      input.dispose();
    },
  };
}

/** Renders one Short. `onProgress` gets the share done, 0–1. Throws BrowserRenderError with a message for the user. */
export async function renderInBrowser(job: BrowserRenderJob, onProgress?: (share: number) => void): Promise<BrowserRenderResult> {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_VERY_HIGH, UrlSource } = await import("mediabunny");

  const input = new Input({ source: typeof job.source === "string" ? new UrlSource(job.source) : new BlobSource(job.source), formats: ALL_FORMATS });
  const reaction = job.reaction ? await openReaction(job.reaction.file) : null;
  try {
    const track = await input.getPrimaryVideoTrack().catch(() => null);
    if (!track) throw new BrowserRenderError("This file isn't a video your browser can read.");
    const sourceDuration = await input.computeDuration();

    const { top, bottom } = job.banners;
    const topHeight = top?.height ?? 0;
    const bottomHeight = bottom?.height ?? 0;
    const reactionHeight = job.reaction?.height ?? 0;
    const videoHeight = SHORT_HEIGHT - topHeight - bottomHeight - reactionHeight;
    // A reaction strip at the top sits under the top banner and pushes the video down by its height.
    const reactionOnTop = job.reaction?.position === "top";
    const videoY = topHeight + (reactionOnTop ? reactionHeight : 0);
    const reactionY = reactionOnTop ? topHeight : SHORT_HEIGHT - bottomHeight - reactionHeight;

    const canvas = new OffscreenCanvas(SHORT_WIDTH, SHORT_HEIGHT);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new BrowserRenderError("Your browser couldn't set up the drawing surface.");
    // The blurred background is drawn small first, as the helper does: it looks the same and costs far less.
    const small = new OffscreenCanvas(SHORT_WIDTH / 4, Math.max(2, Math.round(videoHeight / 4)));
    const smallCtx = small.getContext("2d", { alpha: false });
    const canBlur = "filter" in ctx;

    const labelText = job.label?.text.replace(/[^\p{L}\p{N} #.\-–/!?&+]/gu, "").trim();
    let thumbnail: Blob | null = null;
    let firstTimestamp: number | null = null;
    const length = job.trim ? job.trim.endSec - job.trim.startSec : sourceDuration;
    const thumbnailAt = Math.min(1, length / 2);

    const draw = async (sample: VideoSample) => {
      const sw = sample.displayWidth;
      const sh = sample.displayHeight;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, SHORT_WIDTH, SHORT_HEIGHT);

      // The Short's own picture, in the slot the banners and the reaction video leave.
      if (job.cropMode === "fit" || job.cropMode === "blur") {
        if (job.cropMode === "blur" && smallCtx) {
          const part = coverRect(sw, sh, small.width, small.height);
          sample.draw(smallCtx, part.x, part.y, part.width, part.height, 0, 0, small.width, small.height);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, videoY, SHORT_WIDTH, videoHeight);
          ctx.clip();
          if (canBlur) ctx.filter = "blur(24px)";
          // Drawn a little oversize so the blur's soft edge falls outside the slot.
          ctx.drawImage(small, -40, videoY - 40, SHORT_WIDTH + 80, videoHeight + 80);
          ctx.restore();
        }
        const place = containRect(sw, sh, SHORT_WIDTH, videoHeight);
        sample.draw(ctx, place.x, videoY + place.y, place.width, place.height);
      } else {
        // `center`; smart framing isn't built yet and falls back to it.
        const part = coverRect(sw, sh, SHORT_WIDTH, videoHeight);
        sample.draw(ctx, part.x, part.y, part.width, part.height, 0, videoY, SHORT_WIDTH, videoHeight);
      }

      for (const [banner, y] of [[top, 0], [bottom, SHORT_HEIGHT - bottomHeight]] as const) {
        if (!banner) continue;
        ctx.fillRect(0, y, SHORT_WIDTH, banner.height);
        const place = containRect(banner.image.width, banner.image.height, SHORT_WIDTH, banner.height);
        ctx.drawImage(banner.image, place.x, y + place.y, place.width, place.height);
      }

      if (reaction && job.reaction) {
        const y = reactionY;
        ctx.fillRect(0, y, SHORT_WIDTH, reactionHeight);
        const frame = await reaction.frameAt(Math.max(0, sample.timestamp - (firstTimestamp ?? sample.timestamp)));
        if (frame) {
          if (job.reaction.fit === "fit") {
            const place = containRect(frame.width, frame.height, SHORT_WIDTH, reactionHeight);
            ctx.drawImage(frame, place.x, y + place.y, place.width, place.height);
          } else {
            const part = coverRect(frame.width, frame.height, SHORT_WIDTH, reactionHeight, Math.min(1, Math.max(0, job.reaction.focus)));
            ctx.drawImage(frame, part.x, part.y, part.width, part.height, 0, y, SHORT_WIDTH, reactionHeight);
          }
        }
      }

      if (job.label && labelText) {
        ctx.font = `bold ${LABEL_FONT_SIZE}px Arial, sans-serif`;
        ctx.textBaseline = "top";
        const metrics = ctx.measureText(labelText);
        const width = metrics.width;
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || LABEL_FONT_SIZE;
        const edge = LABEL_BOX + 12;
        const x = Math.max(edge, Math.min(SHORT_WIDTH - width - edge, Math.round(SHORT_WIDTH * job.label.x) - width / 2));
        const y = Math.max(edge, Math.min(SHORT_HEIGHT - height - edge, Math.round(SHORT_HEIGHT * job.label.y) - height / 2));
        ctx.fillStyle = "rgb(0 0 0 / 0.6)";
        ctx.fillRect(x - LABEL_BOX, y - LABEL_BOX, width + 2 * LABEL_BOX, height + 2 * LABEL_BOX);
        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, x, y + metrics.actualBoundingBoxAscent);
        ctx.fillStyle = "#000";
      }
    };

    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input,
      output,
      trim: job.trim ? { start: job.trim.startSec, end: job.trim.endSec } : undefined,
      video: {
        codec: "avc",
        frameRate: 30,
        quality: job.quality === "max" ? QUALITY_VERY_HIGH : job.quality === "high" ? QUALITY_HIGH : QUALITY_MEDIUM,
        forceTranscode: true,
        // Phone footage carries a rotation flag; it has to be turned for real before it is drawn on.
        allowTransformationMetadata: false,
        processedWidth: SHORT_WIDTH,
        processedHeight: SHORT_HEIGHT,
        process: async (sample) => {
          firstTimestamp ??= sample.timestamp;
          await draw(sample);
          if (!thumbnail && sample.timestamp - firstTimestamp >= thumbnailAt - 0.02) {
            const still = new OffscreenCanvas(540, 960);
            still.getContext("2d")?.drawImage(canvas, 0, 0, 540, 960);
            thumbnail = await still.convertToBlob({ type: "image/jpeg", quality: 0.8 }).catch(() => null);
          }
          return canvas;
        },
      },
      showWarnings: false,
    });

    const lost = conversion.discardedTracks.filter((discarded) => discarded.reason !== "discarded_by_user");
    if (!conversion.isValid || lost.some((discarded) => discarded.track.type === "video")) {
      throw new BrowserRenderError("Your browser can't convert this video. Try Chrome or Edge on a computer, or use the PC helper.");
    }
    if (lost.some((discarded) => discarded.track.type === "audio")) {
      throw new BrowserRenderError("Your browser can't convert this video's sound. Try Chrome or Edge, or use the PC helper.");
    }

    conversion.onProgress = (progress) => onProgress?.(progress);
    await conversion.execute();

    const buffer = output.target.buffer;
    if (!buffer) throw new BrowserRenderError("The Short couldn't be rendered in this browser.");
    return { video: new Blob([buffer], { type: "video/mp4" }), thumbnail, durationSec: Math.round(length * 100) / 100 };
  } catch (error) {
    if (error instanceof BrowserRenderError) throw error;
    console.error("Browser render failed:", error);
    throw new BrowserRenderError("The Short couldn't be rendered in this browser. Try Chrome or Edge on a computer, or use the PC helper.");
  } finally {
    await reaction?.close().catch(() => undefined);
    input.dispose();
  }
}

/** Loads an image for drawing. The URL must allow cross-origin reads, or the browser won't let a video be made from it. */
export async function loadBitmap(url: string): Promise<ImageBitmap> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return await createImageBitmap(await res.blob());
  } catch {
    throw new BrowserRenderError("A banner couldn't be loaded for rendering in the browser. Check your connection — or the storage bucket isn't set up for it yet (see storage.cors.json).");
  }
}
