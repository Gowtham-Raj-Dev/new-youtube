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
 * What happens to the seconds left over when the video isn't a whole number of Shorts long:
 * `own` makes them a shorter Short of their own, `last` adds them to the last Short,
 * `last2` shares them between the last two, `all` shares them between every Short
 * (so all come out the same length), and `drop` leaves them out.
 */
export const TAIL_MODES = ["own", "last", "last2", "all", "drop"] as const;
export type TailMode = (typeof TAIL_MODES)[number];

/** How many Shorts share the leftover in each mode that lengthens Shorts. */
const TAIL_SHARERS: Partial<Record<TailMode, number>> = { last: 1, last2: 2, all: Number.POSITIVE_INFINITY };

/** Seconds left after the last full-length Short; 0 when the video divides evenly (or is shorter than one Short). */
export function leftoverSeconds(durationSec: number, shortDuration: number): number {
  if (!(shortDuration > 0) || durationSec < shortDuration) return 0;
  const rest = durationSec - Math.floor(durationSec / shortDuration + 1e-6) * shortDuration;
  return rest < 0.05 ? 0 : Math.round(rest * 100) / 100;
}

/** False when `tail` would stretch a Short past YouTube's limit; `planSegments` then falls back to `own`. */
export function tailModeFits(durationSec: number, shortDuration: number, tail: TailMode): boolean {
  const sharers = TAIL_SHARERS[tail];
  if (!sharers) return true;
  const full = Math.floor(durationSec / shortDuration + 1e-6);
  return shortDuration + leftoverSeconds(durationSec, shortDuration) / Math.min(sharers, full) <= MAX_SHORT_SECONDS;
}

/**
 * Fixed-length cuts: one Short every `shortDuration` seconds, with the remainder handled as `tail` says.
 * A 2:00 video at 30s gives four; a 1:24 video at 60s gives 0:00–1:00 and 1:00–1:24, or with `last` just 0:00–1:24.
 */
export function planSegments(durationSec: number, shortDuration: number, tail: TailMode = "own"): Segment[] {
  const segments: Segment[] = [];
  if (!(shortDuration > 0) || !(durationSec > 0)) return segments;
  const rest = leftoverSeconds(durationSec, shortDuration);
  const sharers = TAIL_SHARERS[tail];

  if (rest > 0 && sharers && tailModeFits(durationSec, shortDuration, tail)) {
    // The last few Shorts each run a little longer, and the final one ends exactly where the video does.
    const full = Math.floor(durationSec / shortDuration + 1e-6);
    const stretched = Math.min(sharers, full);
    const extra = rest / stretched;
    let start = 0;
    for (let index = 0; index < full; index++) {
      const length = shortDuration + (index >= full - stretched ? extra : 0);
      const end = index === full - 1 ? durationSec : Math.round((start + length) * 100) / 100;
      segments.push({ index, startSec: start, endSec: end });
      start = end;
    }
    return segments;
  }

  for (let start = 0; start < durationSec; start += shortDuration) {
    const end = Math.min(start + shortDuration, durationSec);
    const partial = end - start < shortDuration - 0.05;
    if (segments.length > 0 && partial && (tail === "drop" || end - start < MIN_TAIL_SEC)) break;
    segments.push({ index: segments.length, startSec: start, endSec: end });
  }
  return segments;
}

/**
 * `{videoId}_{run}_001`, `_002`, … `run` names one press of Generate, so cutting
 * a video again adds a new set instead of colliding with the Shorts already made.
 * Must match the id pattern in firestore.rules.
 */
export function shortIdFor(videoId: string, run: string, segmentIndex: number): string {
  return `${videoId}_${run}_${String(segmentIndex + 1).padStart(3, "0")}`;
}

/**
 * The `videoId` of Shorts the user uploaded ready-made from their own files —
 * they were not cut from any video. firestore.rules accepts exactly this value.
 */
export function directUploadVideoId(uid: string): string {
  return `upload-${uid}`;
}

/** A short id for one Generate run; later runs sort after earlier ones. */
export function newRunId(now = Date.now()): string {
  return Math.floor(now / 1000).toString(36);
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
