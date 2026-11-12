/**
 * Fetches the pictures of an Ulagam Ippo video from Wikimedia Commons (free
 * licences only) into "Ulagam Ippo/Videos/<video>/images/<key>.jpg", with who
 * made each one and its licence in images/credits.json for the description.
 *
 *   npm run ex-images                 fetches the missing ones
 *   npm run ex-images -- ship flag    fetches these again (the next search result, with --next)
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { videoDir } from "../src/explainer/explainer";
import { pickVideo } from "../src/explainer/videos";

const UA = "UlagamIppoVideoMaker/1.0 (personal YouTube channel; Wikimedia Commons free images)";
const FREE = /^(public domain|pd|cc0|cc by(-sa)? [0-9.]+|cc by(-sa)?|cc-by(-sa)?-[0-9.]+|gfdl|godl|attribution)/i;

interface Found {
  title: string;
  thumb: string;
  width: number;
  height: number;
  artist: string;
  license: string;
  page: string;
}

const strip = (html: string) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function search(q: string, file?: string): Promise<Found[]> {
  const params = new URLSearchParams({
    action: "query", format: "json", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1920",
    ...(file ? { titles: file } : { generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "12" }),
  });
  let body = "";
  // Commons turns away quick runs of requests with a plain-text page: wait and ask again.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "User-Agent": UA } }).catch(() => null);
    body = res ? await res.text() : "";
    if (body.startsWith("{")) break;
    await new Promise((r) => setTimeout(r, 15_000 * attempt));
  }
  const json = JSON.parse(body) as { query?: { pages?: Record<string, { index?: number; title: string; imageinfo?: Array<Record<string, any>> }> } };
  const pages = Object.values(json.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const out: Found[] = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !/jpeg|png/.test(ii.mime)) continue;
    const meta = ii.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value ?? "");
    if (!FREE.test(license)) continue;
    // A pinned file is wanted as it is: old portraits are small.
    if (ii.width < (file ? 350 : 800)) continue;
    out.push({ title: p.title, thumb: ii.thumburl ?? ii.url, width: ii.width, height: ii.height, artist: strip(meta.Artist?.value ?? "unknown"), license, page: ii.descriptionurl });
  }
  return out;
}

async function main() {
  const v = pickVideo();
  const args = process.argv.slice(2);
  const next = args.includes("--next");
  const only = args.filter((a) => !a.startsWith("--"));
  const dir = join(videoDir(v), "images");
  await mkdir(dir, { recursive: true });
  const creditsFile = join(dir, "credits.json");
  const credits: Record<string, Found> = existsSync(creditsFile) ? JSON.parse(await readFile(creditsFile, "utf8")) : {};

  for (const [key, { q, file }] of Object.entries(v.images)) {
    const out = join(dir, `${key}.jpg`);
    if (only.length ? !only.includes(key) : existsSync(out)) continue;
    try {
      const found = await search(q, file);
      // Prefer wide pictures for the background; --next skips the one we have.
      const wide = [...found.filter((f) => f.width / f.height >= 1.2), ...found.filter((f) => f.width / f.height < 1.2)];
      const pick = next ? wide.find((f) => f.title !== credits[key]?.title) : wide[0];
      if (!pick) {
        console.log(`${key}: nothing free found for "${q}"`);
        continue;
      }
      const img = await fetch(pick.thumb, { headers: { "User-Agent": UA } });
      if (!img.ok) throw new Error(`download ${img.status}`);
      await writeFile(out, Buffer.from(await img.arrayBuffer()));
      credits[key] = pick;
      console.log(`${key}: ${pick.title} (${pick.license})`);
      await writeFile(creditsFile, JSON.stringify(credits, null, 1));
    } catch (error) {
      console.log(`${key}: FAILED ${String(error).slice(0, 120)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
