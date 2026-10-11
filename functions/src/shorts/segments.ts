export interface Segment {
  index: number;
  startSec: number;
  endSec: number;
}

/** A leftover shorter than this isn't worth a Short of its own. */
const MIN_TAIL_SEC = 5;

/** Fixed-length cuts: one Short every `shortDuration` seconds, plus the remainder. A 1:24 video at 60s gives 0:00–1:00 and 1:00–1:24. */
export function planSegments(durationSec: number, shortDuration: number): Segment[] {
  const segments: Segment[] = [];
  for (let start = 0; start < durationSec; start += shortDuration) {
    const end = Math.min(start + shortDuration, durationSec);
    if (segments.length > 0 && end - start < MIN_TAIL_SEC) break;
    segments.push({ index: segments.length, startSec: start, endSec: end });
  }
  return segments;
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
