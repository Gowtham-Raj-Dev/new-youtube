/** 30:42, or 1:02:03 for an hour or more. */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return "--:--";
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** YouTube's keyword limits: 30 tags here, 500 characters in all as YouTube counts them. */
export const YOUTUBE_TAGS_MAX = 30;
export const YOUTUBE_TAG_CHARS_MAX = 500;
/** What our own tag builders fill up to, leaving room under YouTube's 500. */
export const YOUTUBE_TAG_CHARS_SAFE = 450;

/**
 * How YouTube counts keywords towards its 500-character limit: commas between
 * tags, and a tag with a space counts its quotes too ("tamil comedy" is 14, not 12).
 * Counting only commas let 471 through that YouTube saw as 520 and rejected
 * with "invalid video keywords".
 */
export function youtubeTagChars(tags: string[]): number {
  return tags.reduce((sum, tag, i) => sum + tag.length + (/\s/.test(tag) ? 2 : 0) + (i > 0 ? 1 : 0), 0);
}

/**
 * Keywords YouTube will accept: no `<` `>` or commas, no `#`, no repeats, each
 * at most 100 characters, at most 30, and within `budget` characters as
 * YouTube counts them. Keeps them in order and skips any that won't fit.
 */
export function fitYoutubeTags(tags: string[], budget = YOUTUBE_TAG_CHARS_MAX): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.replace(/[<>,"]/g, "").replace(/^#+/, "").replace(/\s+/g, " ").trim();
    const key = tag.toLowerCase();
    if (!tag || tag.length > 100 || seen.has(key) || out.length >= YOUTUBE_TAGS_MAX) continue;
    if (youtubeTagChars([...out, tag]) > budget) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** 1.4 GB, 820 MB, 12 KB. */
export function formatBytes(bytes: number | null | undefined, fractionDigits = 1): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : value >= 100 ? 0 : fractionDigits)} ${units[unit]}`;
}
