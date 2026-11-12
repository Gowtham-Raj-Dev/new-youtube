/**
 * Uploads an Ulagam Ippo video's Shorts (its Shorts/ folder: "NN name.mp4" + "NN name.txt")
 * straight to YouTube, Private with a publish time each (YouTube makes them Public then),
 * with the title, description and tags from each .txt. Uses the channel's connection in the app.
 *
 *   npm run ex-shorts-to-youtube -- <folder no.> <first day YYYY-MM-DD> <HH:mm[,HH:mm…]>          dry run (shows the plan)
 *   npm run ex-shorts-to-youtube -- <folder no.> <first day YYYY-MM-DD> <HH:mm[,HH:mm…]> --go     uploads
 *
 * Options: --only=1,3 (just those parts), --full=<videoId> (adds the full video's link to each description).
 * Slots go one per time per day, in part order. Writes Shorts/youtube.json; parts already in it are skipped,
 * so after a quota stop just run it again (next day) — remaining parts get the next free slots you give.
 */
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, fitYoutubeTags } from "@shortflow/shared";
import { CHANNEL_DIR } from "../src/explainer/explainer";
import { decrypt } from "../src/lib/crypto";

const PROJECT = "fir-4b5dc";
const VIDEOS = join(CHANNEL_DIR, "Videos");
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
/** Small pieces with a long wait: the uplink here can be very slow. Multiple of 256 KiB. */
const CHUNK = 2 * 1024 * 1024;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ist = (ms: number) => new Date(ms + IST_OFFSET_MS).toISOString().replace("T", " ").slice(0, 16);

async function gcp(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

interface Part {
  no: number;
  mp4: string;
  size: number;
  title: string;
  description: string;
  tags: string[];
}

function readPart(dir: string, mp4: string, fullId?: string): Part {
  const txt = mp4.replace(/\.mp4$/, ".txt");
  if (!existsSync(join(dir, txt))) throw new Error(`No ${txt}`);
  const details = readFileSync(join(dir, txt), "utf8").replace(/\r/g, "");
  const title = /TITLE:?\n(.+)\n/.exec(details)![1].trim();
  let description = /DESCRIPTION:?\n([\s\S]+?)\n\nTAGS:?\n/.exec(details)![1].trim();
  if (fullId) description = description.replace(/(👉 முழு வீடியோ[^\n]*)/, `$1\n▶ https://youtu.be/${fullId}`);
  const tags = fitYoutubeTags(/TAGS:?\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30));
  const hashtags = (title + " " + description).match(/#[^\s#]+/g) ?? [];
  if (title.length > 100 || description.length > 5000 || hashtags.length > 15) {
    throw new Error(`${txt}: over YouTube's limits (title ${title.length}/100, description ${description.length}/5000, ${hashtags.length}/15 hashtags)`);
  }
  return { no: Number(mp4.slice(0, 2)), mp4, size: statSync(join(dir, mp4)).size, title, description, tags };
}

async function upload(yt: string, file: string, part: Part, publishAt: number): Promise<string> {
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${yt}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(part.size) },
    body: JSON.stringify({
      snippet: { title: part.title, description: part.description, tags: part.tags, categoryId: "27", defaultLanguage: "ta", defaultAudioLanguage: "ta" },
      status: { privacyStatus: "private", publishAt: new Date(publishAt).toISOString(), selfDeclaredMadeForKids: false, embeddable: true },
    }),
  });
  if (!start.ok) {
    const body = await start.text();
    throw Object.assign(new Error(`Upload start: ${start.status} ${body.slice(0, 300)}`), { quota: /quota|uploadLimitExceeded/i.test(body) });
  }
  const session = start.headers.get("location")!;

  const fd = openSync(file, "r");
  let offset = 0;
  let fails = 0;
  let lastLog = Date.now();
  try {
    while (true) {
      try {
        const end = Math.min(offset + CHUNK, part.size) - 1;
        const buf = Buffer.alloc(end - offset + 1);
        readSync(fd, buf, 0, buf.length, offset);
        const res = await fetch(session, {
          method: "PUT",
          headers: { Authorization: `Bearer ${yt}`, "Content-Type": "video/mp4", "Content-Range": `bytes ${offset}-${end}/${part.size}` },
          body: new Uint8Array(buf),
          signal: AbortSignal.timeout(600_000),
        });
        if (res.status === 308) {
          const r = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
          offset = r ? Number(r[1]) + 1 : 0;
          fails = 0;
        } else if (res.ok) {
          return ((await res.json()) as { id: string }).id;
        } else if (res.status >= 500 || res.status === 429) {
          throw new Error(`HTTP ${res.status}`);
        } else {
          throw Object.assign(new Error(`Upload refused: ${res.status} ${(await res.text()).slice(0, 300)}`), { fatal: true });
        }
      } catch (error: any) {
        if (error.fatal || ++fails > 10) throw error;
        console.log(`  piece failed (${String(error).slice(0, 60)}), resuming`);
        await pause(5000 * fails);
        const res = await fetch(session, { method: "PUT", headers: { Authorization: `Bearer ${yt}`, "Content-Range": `bytes */${part.size}` } }).catch(() => null);
        if (res?.status === 308) {
          const r = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
          offset = r ? Number(r[1]) + 1 : 0;
        } else if (res?.ok) {
          return ((await res.json()) as { id: string }).id;
        }
      }
      if (Date.now() - lastLog > 60_000) {
        lastLog = Date.now();
        console.log(`  uploading… ${((offset / part.size) * 100).toFixed(0)}% (${(offset / 1e6).toFixed(0)}/${(part.size / 1e6).toFixed(0)} MB)`);
      }
    }
  } finally {
    closeSync(fd);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map(Number);
  const fullId = args.find((a) => a.startsWith("--full="))?.slice(7);
  const [folderArg, firstDay, timesArg] = args.filter((a) => !a.startsWith("--"));
  if (!folderArg || !firstDay || !timesArg) throw new Error("Usage: ex-shorts-to-youtube <folder no.> <YYYY-MM-DD> <HH:mm[,HH:mm…]> [--go] [--only=1,2] [--full=<videoId>]");

  const name = readdirSync(VIDEOS).find((f) => f === folderArg || f.startsWith(`${folderArg} `));
  if (!name) throw new Error(`No video folder ${folderArg} in ${VIDEOS}`);
  const dir = join(VIDEOS, name, "Shorts");
  const doneFile = join(dir, "youtube.json");
  const done: Record<string, { videoId: string; url: string; title: string; publishAt: string; uploadedAt: string }> = existsSync(doneFile) ? JSON.parse(readFileSync(doneFile, "utf8")) : {};

  const parts = readdirSync(dir)
    .filter((f) => /^\d\d .+\.mp4$/.test(f))
    .sort()
    .map((f) => readPart(dir, f, fullId))
    .filter((p) => !done[p.mp4] && (!only || only.includes(p.no)));
  for (const f of Object.keys(done)) console.log(`already up: ${f} → ${done[f].url} (public ${ist(Date.parse(done[f].publishAt))} IST)`);
  if (!parts.length) return console.log("Nothing left to upload.");

  // One slot per given time per day, from the first day, skipping ones too close to now.
  const [y, m, d] = firstDay.split("-").map(Number);
  const times = timesArg.split(",");
  const slots: number[] = [];
  for (let day = 0; slots.length < parts.length; day++) {
    for (const time of times) {
      const [hh, mm] = time.split(":").map(Number);
      const at = Date.UTC(y, m - 1, d + day, hh, mm) - IST_OFFSET_MS;
      if (at > Date.now() + 30 * 60 * 1000 && slots.length < parts.length) slots.push(at);
    }
  }
  for (const [i, p] of parts.entries()) {
    console.log(`${ist(slots[i])} IST · ${p.mp4} (${(p.size / 1e6).toFixed(0)} MB) · "${p.title}" (${p.title.length}/100) · ${p.description.length}/5000 · ${p.tags.length} tags`);
  }

  // Google access as the Firebase CLI user, for Firestore, Secret Manager and the functions' settings.
  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "ui-cred-"));
  const credFile = join(credDir, "adc.json");
  writeFileSync(credFile, JSON.stringify({
    type: "authorized_user",
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: cli.tokens.refresh_token,
    quota_project_id: PROJECT,
  }));
  process.on("exit", () => rmSync(credDir, { recursive: true, force: true }));
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credFile;
  process.env.GOOGLE_CLOUD_PROJECT = PROJECT;
  const credential = applicationDefault();
  initializeApp({ credential, projectId: PROJECT });
  const gToken = (await credential.getAccessToken()).access_token;
  const db = getFirestore();

  // The Ulagam Ippo channel's connection in the app.
  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
  const conn = connections.docs.find((c) => /ulagam/i.test(`${c.get("channelTitle")} ${c.get("channelHandle")}`));
  if (!conn) throw new Error(`Ulagam Ippo isn't connected in the app. Connected: ${connections.docs.map((c) => c.get("channelTitle")).join(", ")}`);

  const secret = async (id: string) =>
    Buffer.from((await gcp(gToken, `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${id}/versions/latest:access`)).payload.data, "base64").toString("utf8").trim();
  const fns = await gcp(gToken, `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/-/functions?pageSize=200`);
  const clientId = (fns.functions as any[]).map((f) => f.serviceConfig?.environmentVariables?.YOUTUBE_OAUTH_CLIENT_ID).find(Boolean);
  if (!clientId) throw new Error("YOUTUBE_OAUTH_CLIENT_ID not found on the deployed functions.");
  const cred = await db.collection(COLLECTIONS.youtubeCredentials).doc(conn.id).get();
  if (!cred.exists) throw new Error(`No credentials for ${conn.id}`);
  const refreshToken = decrypt(cred.get("encryptedRefreshToken"), await secret("TOKEN_ENCRYPTION_KEY"), conn.id);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: await secret("YOUTUBE_OAUTH_CLIENT_SECRET"), grant_type: "refresh_token" }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) throw new Error(`Token refresh failed: ${tokenJson.error}`);
  const yt = tokenJson.access_token;

  const me = await gcp(yt, "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true");
  const channel = me.items?.[0];
  console.log(`channel: ${channel?.snippet?.title} (${channel?.id})`);
  if (!/ulagam/i.test(String(channel?.snippet?.title))) throw new Error("That isn't the Ulagam Ippo channel.");
  const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (uploads) {
    const recent = await gcp(yt, `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&maxResults=10&playlistId=${uploads}`);
    console.log("recent uploads on the channel:");
    for (const it of recent.items ?? []) console.log(`  ${it.snippet.resourceId.videoId} · ${it.status?.privacyStatus} · ${it.snippet.title}`);
  }
  if (!go) return console.log("DRY RUN — add --go to upload");

  for (const [i, p] of parts.entries()) {
    console.log(`→ ${p.mp4} (public ${ist(slots[i])} IST)`);
    let videoId: string;
    try {
      videoId = await upload(yt, join(dir, p.mp4), p, slots[i]);
    } catch (error: any) {
      if (error.quota) {
        console.log(`STOPPED: YouTube's daily upload quota/limit reached. ${parts.length - i} left — run again tomorrow with new dates.`);
        return;
      }
      throw error;
    }
    done[p.mp4] = { videoId, url: `https://youtube.com/shorts/${videoId}`, title: p.title, publishAt: new Date(slots[i]).toISOString(), uploadedAt: new Date().toISOString() };
    writeFileSync(doneFile, JSON.stringify(done, null, 2));
    console.log(`  uploaded → https://youtube.com/shorts/${videoId} · scheduled Public ${ist(slots[i])} IST`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
