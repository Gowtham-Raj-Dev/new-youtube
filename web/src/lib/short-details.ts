import { youtubeTagChars as tagChars, type PrivacyStatus, type SettingsDoc } from "@shortflow/shared";

// YouTube's limits; the same as in lib/shorts.ts and firestore.rules (not imported from there, which would loop back through the splitters).
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 5000;
const TAGS_MAX = 30;

/**
 * What YouTube shows for each Short, set once for all the Shorts cut from a
 * video. `{n}` is the part number (1, 2…), `{part}` the same with a leading
 * zero (01, 02…), `{total}` how many parts and `{title}` the name given below.
 */
export interface ShortDetails {
  /** What `{title}` stands for — usually a short name for the video. */
  name: string;
  title: string;
  description: string;
  tags: string[];
  privacy: PrivacyStatus;
}

export interface PartDetails {
  title: string;
  description: string;
  tags: string[];
  privacy: PrivacyStatus;
}

function fill(template: string, name: string, n: number, total: number) {
  return template
    .replaceAll("{videoTitle}", name)
    .replaceAll("{title}", name)
    .replaceAll("{part}", String(n).padStart(2, "0"))
    .replaceAll("{n}", String(n))
    .replaceAll("{total}", String(total));
}

/** YouTube refuses `<` and `>` in titles and descriptions. */
const clean = (text: string) => text.replace(/[<>]/g, "");

/**
 * The title of part `n`, never over YouTube's 100 characters. When it is too
 * long, the name is shortened — never "Part 3" — so the parts stay numbered.
 */
/**
 * The longest start of `text` within `max` — counted as the database and the
 * Shorts editor count (an emoji is 2), without splitting a letter or an emoji.
 */
function fit(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  for (const ch of text) {
    if (out.length + ch.length > max) break;
    out += ch;
  }
  return out;
}

export function partTitle(details: Pick<ShortDetails, "name" | "title">, n: number, total: number): string {
  const tidy = (s: string) => clean(s).replace(/\s+/g, " ").trim();
  const name = tidy(details.name);
  let title = tidy(fill(details.title, name, n, total));
  if (title.length > TITLE_MAX) {
    const without = tidy(fill(details.title, "", n, total)).length;
    const uses = (details.title.match(/\{(title|videoTitle)\}/g) ?? []).length;
    const room = uses > 0 ? Math.floor((TITLE_MAX - without - uses * 2) / uses) : 0;
    if (room > 3) title = tidy(fill(details.title, fit(name, room).trim() + "…", n, total));
    title = fit(title, TITLE_MAX);
  }
  return title || `Part ${n}`;
}

export function partDetails(details: ShortDetails, n: number, total: number): PartDetails {
  return {
    title: partTitle(details, n, total),
    description: fit(clean(fill(details.description, details.name.trim(), n, total)), DESCRIPTION_MAX),
    tags: details.tags.slice(0, TAGS_MAX),
    privacy: details.privacy,
  };
}

/** A tidier name from a file name: no download-site prefix, underscores or "1080P" at the end. */
export function nameFromVideoTitle(title: string): string {
  return title
    .replace(/^\s*[\w-]+\.(com|net|in|org|io|app)\s*/i, "")
    .replace(/_/g, " ")
    .replace(/\b(1080|720|480|360|2160)p\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Remembered per channel, so each channel keeps its own description and tags ───

const key = (channel: string | null | undefined) => `shortflow:details:${channel || "default"}`;

export function readDetails(channel: string | null | undefined, publishing: SettingsDoc["publishing"], videoTitle: string): ShortDetails {
  const fallback: ShortDetails = {
    name: nameFromVideoTitle(videoTitle) || videoTitle,
    title: publishing.titleTemplate.includes("{") ? publishing.titleTemplate.replaceAll("{videoTitle}", "{title}") : "{title} | Part {n}",
    description: publishing.defaultDescription,
    tags: publishing.defaultTags,
    privacy: publishing.defaultPrivacy,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key(channel)) ?? "null") as Partial<ShortDetails> | null;
    if (!saved) return fallback;
    return {
      name: fallback.name, // the name belongs to this video, not the channel
      title: typeof saved.title === "string" && saved.title.trim() ? saved.title : fallback.title,
      description: typeof saved.description === "string" ? saved.description : fallback.description,
      tags: Array.isArray(saved.tags) ? saved.tags.filter((t): t is string => typeof t === "string").slice(0, TAGS_MAX) : fallback.tags,
      privacy: saved.privacy === "public" || saved.privacy === "unlisted" || saved.privacy === "private" ? saved.privacy : fallback.privacy,
    };
  } catch {
    return fallback;
  }
}

export function rememberDetails(channel: string | null | undefined, details: ShortDetails) {
  try {
    const { name: _name, ...kept } = details; // eslint-disable-line @typescript-eslint/no-unused-vars -- the name is per video
    localStorage.setItem(key(channel), JSON.stringify(kept));
  } catch {
    // Storage off or full: just not remembered.
  }
}

/** What is wrong with these details for YouTube, or null when they are fine. */
export function detailsProblem(details: ShortDetails, total: number): string | null {
  if (!details.title.trim()) return "Give the Shorts a title.";
  const longest = Math.max(0, ...Array.from({ length: Math.max(1, total) }, (_, i) => fill(details.description, details.name, i + 1, total).length));
  if (longest > DESCRIPTION_MAX) return `The description is too long (${longest} of ${DESCRIPTION_MAX} characters).`;
  if (tagChars(details.tags) > 500) return "The tags are too long for YouTube (500 characters in all).";
  return null;
}
