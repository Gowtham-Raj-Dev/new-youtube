export interface Segment {
  index: number;
  startSec: number;
  endSec: number;
}

/** Shortest and longest Short the user may ask for. YouTube treats up to 3 minutes as a Short. */
export const MIN_SHORT_SECONDS = 5;
export const MAX_SHORT_SECONDS = 180;
export const SHORT_LENGTH_PRESETS = [15, 30, 45, 60, 90] as const;

/** A leftover shorter than this isn't worth a Short of its own. */
const MIN_TAIL_SEC = 5;

/**
 * Fixed-length cuts: one Short every `shortDuration` seconds, plus the remainder.
 * A 2:00 video at 30s gives four; a 1:24 video at 60s gives 0:00–1:00 and 1:00–1:24.
 */
export function planSegments(durationSec: number, shortDuration: number): Segment[] {
  const segments: Segment[] = [];
  if (!(shortDuration > 0)) return segments;
  for (let start = 0; start < durationSec; start += shortDuration) {
    const end = Math.min(start + shortDuration, durationSec);
    if (segments.length > 0 && end - start < MIN_TAIL_SEC) break;
    segments.push({ index: segments.length, startSec: start, endSec: end });
  }
  return segments;
}

/** `{videoId}_001`, `_002`, … — one id per part, so the same part is never made twice. */
export function shortIdFor(videoId: string, segmentIndex: number): string {
  return `${videoId}_${String(segmentIndex + 1).padStart(3, "0")}`;
}

/** Fills `{videoTitle}`, `{part}` (01, 02, …) and `{total}`, within YouTube's 100-character title limit. */
export function shortTitle(template: string, videoTitle: string, part: number, total: number): string {
  const title = template
    .replaceAll("{videoTitle}", videoTitle)
    .replaceAll("{part}", String(part).padStart(2, "0"))
    .replaceAll("{total}", String(total))
    .replace(/[<>]/g, "") // YouTube rejects angle brackets in titles
    .trim();
  return title.slice(0, 100) || `Part ${part}`;
}

/** Download name for a Short's file: readable, and safe in a Content-Disposition header. */
export function shortFileName(title: string): string {
  const safe = title.replace(/[^\w\- ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return `${safe || "short"}.mp4`;
}
