/**
 * Uploads a finished CodeLove guide video straight to the CodeLove YouTube channel (Public, English),
 * with the title, description and tags from youtube.txt and thumbnail.jpg from the same folder.
 * Uses the CodeLove channel's connection in the app for access (same as ex-to-youtube).
 *
 *   npm run codelove-to-youtube -- "<folder with one .mp4 + youtube.txt + thumbnail.jpg>" [<YYYY-MM-DD> <HH:mm>]   dry run
 *     with a day and time (India time): uploaded Private now, YouTube makes it Public then (thumbnail set at once)
 *   npm run codelove-to-youtube -- "<folder>" --go                                                uploads
 *   npm run codelove-to-youtube -- "<folder>" --thumb                                             thumbnail only
 *
 * Writes youtube.json in the folder; a second run refuses to upload it again.
 */
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS, fitYoutubeTags } from "@shortflow/shared";
import { decrypt } from "../src/lib/crypto";

const PROJECT = "fir-4b5dc";
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
  const thumbOnly = args.includes("--thumb");
  const [folder, day = "", time = ""] = args.filter((a) => !a.startsWith("--"));
  let publishAt = 0;
  if (day && time) {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    publishAt = Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000;
    if (!thumbOnly && publishAt < Date.now() + 15 * 60 * 1000) throw new Error("That time is too soon or already past.");
  }
  if (!folder || !existsSync(folder)) throw new Error('Usage: codelove-to-youtube "<folder>" [--go | --thumb]');

  const doneFile = join(folder, "youtube.json");
  if (existsSync(doneFile) && !thumbOnly) throw new Error(`Already uploaded: ${readFileSync(doneFile, "utf8")}`);
  if (thumbOnly && !existsSync(doneFile)) throw new Error("--thumb needs an uploaded video (youtube.json).");
  const mp4 = readdirSync(folder).find((f) => f.endsWith(".mp4"));
  if (!mp4 || !existsSync(join(folder, "youtube.txt"))) throw new Error(`No .mp4 and youtube.txt in ${folder}`);
  const details = readFileSync(join(folder, "youtube.txt"), "utf8").replace(/\r/g, "");
  const title = /TITLE\n(.+)\n/.exec(details)![1].trim();
  const description = /DESCRIPTION\n([\s\S]+?)\n\nTAGS\n/.exec(details)![1].trim();
  const tags = fitYoutubeTags(/TAGS\n(.+)/.exec(details)![1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 30));
  const hashtags = (title + " " + description).match(/#[^\s#]+/g) ?? [];
  // optional CATEGORY line (YouTube category id): 20 Gaming, 28 Science & Technology (default)
  const categoryId = /CATEGORY\n(\d+)/.exec(details)?.[1] ?? "28";
  const thumb = join(folder, "thumbnail.jpg");
  if (!existsSync(thumb) || statSync(thumb).size > 2 * 1024 * 1024) throw new Error("thumbnail.jpg missing or over 2 MB.");
  const size = statSync(join(folder, mp4)).size;
  console.log(`${mp4} (${(size / 1e6).toFixed(0)} MB) · "${title}" (${title.length}/100) · description ${description.length}/5000 · ${tags.length} tags · ${hashtags.length} hashtags · ${publishAt ? `public at ${day} ${time} IST` : "PUBLIC now"}`);
  if (title.length > 100 || description.length > 5000 || hashtags.length > 15 || /[<>]/.test(title + description)) throw new Error("Metadata over YouTube's limits (or has < >).");

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "clyt-cred-"));
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

  const secret = async (id: string) =>
    Buffer.from((await gcp(gToken, `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${id}/versions/latest:access`)).payload.data, "base64").toString("utf8").trim();
  const fns = await gcp(gToken, `https://cloudfunctions.googleapis.com/v2/projects/${PROJECT}/locations/-/functions?pageSize=200`);
  const clientId = (fns.functions as any[]).map((f) => f.serviceConfig?.environmentVariables?.YOUTUBE_OAUTH_CLIENT_ID).find(Boolean);
  if (!clientId) throw new Error("YOUTUBE_OAUTH_CLIENT_ID not found on the deployed functions.");

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
  const channel = connections.docs.find((c) => /codelove/i.test(`${c.get("channelHandle") ?? ""} ${String(c.get("channelTitle") ?? "").replace(/\s+/g, "")}`));
  if (!channel) throw new Error(`The CodeLove channel isn't connected in the app. Connected: ${connections.docs.map((c) => c.get("channelTitle")).join(", ")}`);
  const cred = await db.collection(COLLECTIONS.youtubeCredentials).doc(channel.id).get();
  if (!cred.exists) throw new Error(`No credentials for ${channel.id}`);
  const refreshToken = decrypt(cred.get("encryptedRefreshToken"), await secret("TOKEN_ENCRYPTION_KEY"), channel.id);
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
  if (!/code\s*love/i.test(String(channelTitle))) throw new Error("That isn't the CodeLove channel.");

  const setThumb = async (videoId: string) => {
    const t = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${yt}`, "Content-Type": "image/jpeg" },
      body: new Uint8Array(readFileSync(thumb)),
    });
    console.log(t.ok ? "thumbnail set" : `thumbnail FAILED: ${t.status} ${(await t.text()).slice(0, 300)}`);
  };
  if (thumbOnly) return setThumb((JSON.parse(readFileSync(doneFile, "utf8")) as { videoId: string }).videoId);
  if (!go) return console.log("DRY RUN — add --go to upload");

  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${yt}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(size) },
    body: JSON.stringify({
      snippet: { title, description, tags, categoryId, defaultLanguage: "en", defaultAudioLanguage: "en" },
      status: publishAt
        ? { privacyStatus: "private", publishAt: new Date(publishAt).toISOString(), selfDeclaredMadeForKids: false, embeddable: true }
        : { privacyStatus: "public", selfDeclaredMadeForKids: false, embeddable: true },
    }),
  });
  if (!start.ok) throw new Error(`Upload start: ${start.status} ${(await start.text()).slice(0, 300)}`);
  const session = start.headers.get("location")!;

  const fd = openSync(join(folder, mp4), "r");
  let offset = 0;
  let fails = 0;
  let videoId = "";
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
      } else if (res.status >= 500 || res.status === 429) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        throw Object.assign(new Error(`Upload refused: ${res.status} ${(await res.text()).slice(0, 300)}`), { fatal: true });
      }
    } catch (error: any) {
      if (error.fatal || ++fails > 10) throw error;
      console.log(`piece failed (${String(error).slice(0, 60)}), resuming`);
      await pause(5000 * fails);
      const res = await fetch(session, { method: "PUT", headers: { Authorization: `Bearer ${yt}`, "Content-Range": `bytes */${size}` } }).catch(() => null);
      if (res?.status === 308) {
        const r = /bytes=0-(\d+)/.exec(res.headers.get("range") ?? "");
        offset = r ? Number(r[1]) + 1 : 0;
      } else if (res?.ok) {
        videoId = ((await res.json()) as { id: string }).id;
      }
    }
    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      console.log(`uploading… ${((offset / size) * 100).toFixed(0)}%`);
    }
  }
  closeSync(fd);
  writeFileSync(doneFile, JSON.stringify({ videoId, url: `https://youtu.be/${videoId}`, ...(publishAt ? { publishAt: new Date(publishAt).toISOString() } : { privacy: "public" }), uploadedAt: new Date().toISOString() }, null, 2));
  console.log(`uploaded → https://youtu.be/${videoId}`);
  await setThumb(videoId);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
