/**
 * Uploads an Ulagam Ippo video straight to YouTube, Private with a publish time
 * (YouTube makes it Public then), with the title, description and tags from its
 * .txt and its custom thumbnail. Uses the channel's connection in the app for access.
 *
 *   npm run ex-to-youtube -- <connection id> <folder no.> <YYYY-MM-DD> <HH:mm>        dry run
 *   npm run ex-to-youtube -- <connection id> <folder no.> <YYYY-MM-DD> <HH:mm> --go   uploads
 *
 * Writes youtube.json in the video folder; a second run refuses to upload it again.
 */
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, fitYoutubeTags } from "@shortflow/shared";
import { CHANNEL_DIR } from "../src/explainer/explainer";
import { decrypt } from "../src/lib/crypto";

const PROJECT = "fir-4b5dc";
const VIDEOS = join(CHANNEL_DIR, "Videos");
/** Small pieces with a long wait: the uplink here can be very slow. Multiple of 256 KiB. */
const CHUNK = 2 * 1024 * 1024;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gcp(token: string, url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  // --unlisted: up now as Unlisted, no publish time (the user's ask for video 05, 2026-11-13).
  const unlisted = args.includes("--unlisted");
  const [connectionId, folderArg, day = "", time = ""] = args.filter((a) => !a.startsWith("--"));
  if (!connectionId || !folderArg || (!unlisted && (!day || !time))) throw new Error("Usage: ex-to-youtube <connection id> <folder no.> (<YYYY-MM-DD> <HH:mm> | --unlisted) [--go]");

  const name = readdirSync(VIDEOS).find((f) => f === folderArg || f.startsWith(`${folderArg} `));
  if (!name) throw new Error(`No video folder ${folderArg} in ${VIDEOS}`);
  const folder = join(VIDEOS, name);
  const doneFile = join(folder, "youtube.json");
  // --thumb: the video is up; only (re)try its thumbnail (YouTube rate-limits thumbnails).
  const thumbOnly = args.includes("--thumb");
  if (existsSync(doneFile) && !thumbOnly) throw new Error(`Already uploaded: ${readFileSync(doneFile, "utf8")}`);
  if (thumbOnly && !existsSync(doneFile)) throw new Error("--thumb needs an uploaded video (youtube.json).");
  const mp4s = readdirSync(folder).filter((f) => f.endsWith(".mp4") && !/^sample|\(test\)/.test(f));
  const mp4 = mp4s.find((f) => f.endsWith(" (upload).mp4")) ?? mp4s[0];
  const txt = readdirSync(folder).find((f) => f.endsWith(".txt"));
  if (!mp4 || !txt) throw new Error(`No .mp4 and .txt in ${folder}`);
  const details = readFileSync(join(folder, txt), "utf8").replace(/\r/g, "");
  const title = /TITLE:?\n(.+)\n/.exec(details)![1].trim();
  const description = /DESCRIPTION:?\n([\s\S]+?)\n\nTAGS:?\n/.exec(details)![1].trim();
  const tags = fitYoutubeTags(/TAGS:?\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30));
  const hashtags = (title + " " + description).match(/#[^\s#]+/g) ?? [];
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const publishAt = unlisted ? 0 : Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000;
  if (!thumbOnly && !unlisted && publishAt < Date.now() + 15 * 60 * 1000) throw new Error("That time is too soon or already past.");
  const thumb = join(folder, "thumbnail.jpg");
  if (!existsSync(thumb) || statSync(thumb).size > 2 * 1024 * 1024) throw new Error("thumbnail.jpg missing or over 2 MB.");
  const probe = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-i", join(folder, mp4)], { encoding: "utf8" }).stderr;
  const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe);
  const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 0;
  const size = statSync(join(folder, mp4)).size;
  console.log(`${mp4} (${(size / 1e6).toFixed(0)} MB, ${durationSec.toFixed(0)} s) · "${title}" (${title.length}/100) · description ${description.length}/5000 · ${tags.length} tags · ${hashtags.length} hashtags · ${unlisted ? "UNLISTED now" : `public at ${day} ${time} IST`}`);
  if (title.length > 100 || description.length > 5000 || hashtags.length > 15) throw new Error("Metadata over YouTube's limits.");

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

  const secret = async (id: string) =>
    Buffer.from((await gcp(gToken, `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${id}/versions/latest:access`)).payload.data, "base64").toString("utf8").trim();
  const fns = await gcp(gToken, `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/-/functions?pageSize=200`);
  const clientId = (fns.functions as any[]).map((f) => f.serviceConfig?.environmentVariables?.YOUTUBE_OAUTH_CLIENT_ID).find(Boolean);
  if (!clientId) throw new Error("YOUTUBE_OAUTH_CLIENT_ID not found on the deployed functions.");

  const cred = await getFirestore().collection(COLLECTIONS.youtubeCredentials).doc(connectionId).get();
  if (!cred.exists) throw new Error(`No credentials for ${connectionId}`);
  const refreshToken = decrypt(cred.get("encryptedRefreshToken"), await secret("TOKEN_ENCRYPTION_KEY"), connectionId);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: await secret("YOUTUBE_OAUTH_CLIENT_SECRET"), grant_type: "refresh_token" }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) throw new Error(`Token refresh failed: ${tokenJson.error}`);
  const yt = tokenJson.access_token;

  const me = await gcp(yt, "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true");
  const channelTitle = me.items?.[0]?.snippet?.title;
  console.log(`channel: ${channelTitle} (${me.items?.[0]?.id})`);
  if (!/ulagam/i.test(String(channelTitle))) throw new Error("That isn't the Ulagam Ippo channel.");
  if (thumbOnly) {
    const { videoId } = JSON.parse(readFileSync(doneFile, "utf8")) as { videoId: string };
    const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${yt}`, "Content-Type": "image/jpeg" },
      body: new Uint8Array(readFileSync(thumb)),
    });
    if (!t.ok) throw new Error(`thumbnail FAILED: ${t.status} ${(await t.text()).slice(0, 200)}`);
    return console.log(`thumbnail set on https://youtu.be/${videoId}`);
  }
  if (!go) return console.log("DRY RUN — add --go to upload");

  // Resumable upload, Private with publishAt.
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${yt}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size) },
    body: JSON.stringify({
      snippet: { title, description, tags, categoryId: "27", defaultLanguage: "ta", defaultAudioLanguage: "ta" },
      status: unlisted
        ? { privacyStatus: "unlisted", selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true }
        : { privacyStatus: "private", publishAt: new Date(publishAt).toISOString(), selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true },
    }),
  });
  if (!start.ok) throw new Error(`Upload start: ${start.status} ${(await start.text()).slice(0, 300)}`);
  const session = start.headers.get("location")!;

  const fd = openSync(join(folder, mp4), "r");
  let offset = 0;
  let fails = 0;
  let videoId = "";
  const began = Date.now();
  let lastLog = 0;
  while (!videoId) {
    try {
      const end = Math.min(offset + CHUNK, size) - 1;
      const buf = Buffer.alloc(end - offset + 1);
      readSync(fd, buf, 0, buf.length, offset);
      const res = await fetch(session, {
        method: "PUT",
        headers: { Authorization: `Bearer ${yt}`, "Content-Type": "video/mp4", "Content-Range": `bytes ${offset}-${end}/${size}` },
        body: new Uint8Array(buf),
        signal: AbortSignal.timeout(600_000),
      });
      if (res.status === 308) {
        const r = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
        offset = r ? Number(r[1]) + 1 : 0;
        fails = 0;
      } else if (res.ok) {
        videoId = ((await res.json()) as { id: string }).id;
        break;
      } else if (res.status >= 500 || res.status === 429) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        throw Object.assign(new Error(`Upload refused: ${res.status} ${(await res.text()).slice(0, 300)}`), { fatal: true });
      }
    } catch (error: any) {
      if (error.fatal || ++fails > 10) throw error;
      console.log(`piece failed (${String(error).slice(0, 60)}), resuming`);
      await pause(5000 * fails);
      // Ask where YouTube got to.
      const res = await fetch(session, { method: "PUT", headers: { Authorization: `Bearer ${yt}`, "Content-Range": `bytes */${size}` } }).catch(() => null);
      if (res?.status === 308) {
        const r = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
        offset = r ? Number(r[1]) + 1 : 0;
      } else if (res?.ok) {
        videoId = ((await res.json()) as { id: string }).id;
      }
    }
    if (Date.now() - lastLog > 60_000) {
      lastLog = Date.now();
      const mins = (Date.now() - began) / 60000;
      console.log(`uploading… ${((offset / size) * 100).toFixed(0)}% (${(offset / 1e6).toFixed(0)}/${(size / 1e6).toFixed(0)} MB, ${mins.toFixed(0)} min)`);
    }
  }
  closeSync(fd);
  writeFileSync(doneFile, JSON.stringify({ videoId, url: `https://youtu.be/${videoId}`, ...(unlisted ? { privacy: "unlisted" } : { publishAt: new Date(publishAt).toISOString() }), uploadedAt: new Date().toISOString() }, null, 2));
  console.log(`uploaded → https://youtu.be/${videoId}`);

  const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${yt}`, "Content-Type": "image/jpeg" },
    body: new Uint8Array(readFileSync(thumb)),
  });
  console.log(t.ok ? "thumbnail set" : `thumbnail FAILED: ${t.status} ${(await t.text()).slice(0, 300)}`);
  console.log(unlisted ? "Unlisted — only people with the link can see it" : `scheduled: Public at ${day} ${time} IST`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
