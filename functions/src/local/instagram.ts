// Instagram, for the PC helper: lists the videos on a profile and passes their
// files on to the app. Instagram turns away anything that isn't a real, signed-in
// browser, so the helper uses one: the user signs in once in a browser window,
// and a profile is then read by opening its page in a hidden browser on this PC
// and collecting what Instagram sends it. The sign-in is kept on this PC and used
// nowhere but instagram.com. What Instagram sends changes without notice, which
// is the first thing to check if this stops working.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const HOME = join(process.env.APPDATA ?? homedir(), "ShortFlow Helper");
const SESSION_FILE = join(HOME, "instagram-session");
/** The ids of the videos already added as Shorts, so a profile looked at again can leave them out. */
const ADDED_FILE = join(HOME, "instagram-added.json");
/** The throwaway browser profile the sign-in window runs in, so it never touches the user's own browser. */
const LOGIN_DIR = join(HOME, "instagram-login");
/** Throwaway profiles of the hidden browser, one folder per profile looked at. */
const VIEW_ROOT = join(HOME, "instagram-browser");
/** How long the sign-in window is left open for. */
const LOGIN_WAIT_MS = 10 * 60 * 1000;
/** The hidden browser is closed once nothing has asked it for more videos for this long. */
const VIEW_IDLE_MS = 10 * 60 * 1000;
/** How long Instagram gets to show a profile's first posts, and each further batch of them. */
const FIRST_PAGE_WAIT_SEC = 30;
const MORE_WAIT_SEC = 20;
/** Batches of posts read in a row when they hold nothing but photos, before answering anyway. */
const PAGES_PER_REQUEST = 3;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
/** Where Instagram keeps its videos and pictures. Nothing else is ever fetched for the app. */
const FILE_HOSTS = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;
/** Names in an Instagram address that are pages of the site, not profiles. */
const NOT_PROFILES = ["p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct"];

/** Something the user can act on; `message` is shown to them as it is. 401 means the sign-in needs redoing. */
export class InstagramError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface InstagramVideo {
  id: string;
  /** The post's short code, as in instagram.com/reel/<code>. */
  code: string;
  caption: string;
  /** 0 when Instagram didn't say. */
  durationSec: number;
  width: number;
  height: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  /** Milliseconds. */
  takenAt: number;
  /** Already added as a Short from this PC. */
  added: boolean;
}

export interface InstagramPage {
  username: string;
  fullName: string;
  videos: InstagramVideo[];
  /** Hand back to get the next page; null on the last one. */
  next: string | null;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const wipe = (dir: string) => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 }).catch(() => undefined);

/** Read from disk once; null when none is saved. */
let session: string | null | undefined;

async function readSession() {
  if (session === undefined) session = (await readFile(SESSION_FILE, "utf8").catch(() => "")).trim() || null;
  return session;
}

export async function hasSession() {
  return (await readSession()) !== null;
}

/** Accepts the cookie's value however it was copied: bare, as `sessionid=…;`, or with its `%3A`s already turned into colons. */
export async function saveSession(pasted: unknown) {
  const value = String(pasted ?? "").trim().replace(/^sessionid\s*=\s*/i, "").replace(/;.*$/, "").replace(/^"|"$/g, "").replaceAll(":", "%3A");
  if (!/^[\w%.-]{20,400}$/.test(value)) throw new InstagramError(400, "That doesn't look like a sessionid. Copy only the value of the cookie named “sessionid”.");
  closeViewer();
  await mkdir(HOME, { recursive: true });
  await writeFile(SESSION_FILE, value, "utf8");
  session = value;
}

export async function clearSession() {
  closeViewer();
  await rm(SESSION_FILE, { force: true });
  session = null;
}

/** Read from disk once. */
let added: Set<string> | undefined;

async function readAdded() {
  if (!added) {
    const saved: unknown = await readFile(ADDED_FILE, "utf8").then(JSON.parse).catch(() => []);
    added = new Set(Array.isArray(saved) ? saved.map(String) : []);
  }
  return added;
}

/** Remembers videos as added to Shorts. It is kept on this PC, apart from the sign-in, so signing out doesn't forget it. */
export async function rememberAdded(ids: unknown) {
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every((id) => typeof id === "string" && /^[\w-]{1,64}$/.test(id))) throw new InstagramError(400, "Bad request.");
  const known = await readAdded();
  for (const id of ids) known.add(id);
  await mkdir(HOME, { recursive: true });
  await writeFile(ADDED_FILE, JSON.stringify([...known]), "utf8");
}

// What the browser and Instagram send is read loosely: only the handful of fields used here are relied on.

/** A Chrome or Edge started by the helper, driven over its debugging socket. */
interface Browser {
  /** Resolves with nothing if the browser has gone. */
  call: (method: string, params?: object, page?: string) => Promise<any>;
  listen: (handler: (event: { method?: string; params?: any }) => void) => void;
  gone: () => boolean;
  close: () => void;
}

/** Chrome or Edge on this PC; Edge comes with Windows, so there is nearly always one. */
function findBrowser() {
  const roots = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter((root): root is string => Boolean(root));
  const windows = roots.flatMap((root) => [join(root, "Google", "Chrome", "Application", "chrome.exe"), join(root, "Microsoft", "Edge", "Application", "msedge.exe")]);
  const exe = [...windows, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(existsSync);
  if (!exe) throw new InstagramError(500, "Chrome or Edge wasn't found on this PC. Install one of them and try again.");
  return exe;
}

async function openBrowser(dir: string, flags: string[]): Promise<Browser> {
  const exe = findBrowser();
  await mkdir(dir, { recursive: true });
  // Port 0 lets the browser pick a free port for its debugging socket; it writes which one into its profile folder.
  const child = spawn(exe, ["--remote-debugging-port=0", `--user-data-dir=${dir}`, "--no-first-run", "--no-default-browser-check", ...flags], { stdio: "ignore" });
  let gone = false;
  const answers = new Map<number, (result: any) => void>();
  const left = () => {
    gone = true;
    for (const answer of answers.values()) answer(undefined);
    answers.clear();
  };
  child.once("exit", left);
  child.once("error", left);

  let endpoint = "";
  for (let tries = 0; !endpoint && !gone && tries < 100; tries++) {
    const [port, path] = (await readFile(join(dir, "DevToolsActivePort"), "utf8").catch(() => "")).split("\n");
    if (port && path) endpoint = `ws://127.0.0.1:${port.trim()}${path.trim()}`;
    else await pause(200);
  }
  const failed = new InstagramError(500, "Couldn't open a browser on this PC. Close any stuck Chrome or Edge windows and try again.");
  if (!endpoint) {
    child.kill();
    throw failed;
  }
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(failed);
  }).catch((error) => {
    child.kill();
    throw error;
  });

  let asked = 0;
  const handlers: Array<Parameters<Browser["listen"]>[0]> = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id === undefined) return handlers.forEach((handler) => handler(message));
    answers.get(message.id)?.(message.result);
    answers.delete(message.id);
  };
  return {
    call: (method, params = {}, page) =>
      new Promise((resolve) => {
        if (gone) return resolve(undefined);
        answers.set(++asked, resolve);
        socket.send(JSON.stringify({ id: asked, method, params, ...(page ? { sessionId: page } : {}) }));
      }),
    listen: (handler) => void handlers.push(handler),
    gone: () => gone,
    close: () => {
      if (gone) return;
      socket.close();
      child.kill();
    },
  };
}

export interface LoginState {
  status: "idle" | "waiting" | "done" | "failed";
  error: string | null;
}

let login: LoginState = { status: "idle", error: null };

export const loginState = () => login;

/**
 * Opens Instagram's own sign-in page in a browser window and waits for the user
 * to sign in there — password, codes and all stay between them and Instagram.
 * Once signed in, the session cookie is read from that window and saved, and the window closes.
 */
async function runLogin() {
  closeViewer();
  await wipe(LOGIN_DIR);
  const browser = await openBrowser(LOGIN_DIR, ["--window-size=520,820", "--app=https://www.instagram.com/accounts/login/"]);
  const timer = setTimeout(browser.close, LOGIN_WAIT_MS);
  try {
    // Instagram sets `sessionid` only once the sign-in — including any code it asks for — has gone through.
    while (true) {
      const cookies: Array<{ name: string; value: string; domain: string }> = (await browser.call("Storage.getCookies"))?.cookies ?? [];
      if (browser.gone()) throw new InstagramError(408, "The sign-in window was closed before you signed in.");
      const found = cookies.find((cookie) => cookie.name === "sessionid" && cookie.value && /(^|\.)instagram\.com$/.test(cookie.domain));
      if (found) {
        await saveSession(found.value);
        return void browser.call("Browser.close");
      }
      await pause(1500);
    }
  } finally {
    clearTimeout(timer);
    // Left a moment to close by itself, so the profile folder isn't in use when it is deleted.
    setTimeout(() => {
      browser.close();
      void wipe(LOGIN_DIR);
    }, 2000).unref();
  }
}

/** Starts a sign-in unless one is already waiting. How it is going is asked for with `loginState`. */
export function startLogin(): LoginState {
  if (login.status === "waiting") return login;
  login = { status: "waiting", error: null };
  runLogin().then(
    () => (login = { status: "done", error: null }),
    (error) => {
      console.error("Instagram sign-in failed:", error);
      login = { status: "failed", error: error instanceof InstagramError ? error.message : "The sign-in didn't go through. Try again, or paste a sessionid instead." };
    },
  );
  return login;
}

/** The profile's name out of a link, an @name or a bare name. */
function usernameFrom(profile: unknown) {
  let name = String(profile ?? "").trim();
  if (/instagram\.com/i.test(name)) {
    try {
      const [first, second] = new URL(/^https?:/i.test(name) ? name : `https://${name}`).pathname.split("/").filter(Boolean);
      // A stories link names the profile second: instagram.com/stories/<name>/…
      name = (first === "stories" ? second : first) ?? "";
    } catch {
      name = "";
    }
  }
  name = name.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(name) || NOT_PROFILES.includes(name.toLowerCase())) throw new InstagramError(400, "That isn't a profile link. Paste one like instagram.com/username, or just the username.");
  return name;
}

/** A video's length, which Instagram only states inside its streaming manifest, as `PT1M5.3S`. */
function durationOf(item: any) {
  if (Number(item.video_duration) > 0) return Number(item.video_duration);
  const [, hours, minutes, seconds] = /mediaPresentationDuration="PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?"/.exec(String(item.video_dash_manifest ?? "")) ?? [];
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
}

/** The videos in one post: itself if it is a video, or the videos among the slides of a carousel. */
function videosOf(post: any): InstagramVideo[] {
  const media: any[] = post.media_type === 8 ? (post.carousel_media ?? []) : [post];
  return media.flatMap((item) => {
    const versions: any[] = item.media_type === 2 ? (item.video_versions ?? []) : [];
    const best = [...versions].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    if (!best?.url) return [];
    return [
      {
        id: String(item.pk ?? item.id),
        code: String(post.code ?? ""),
        caption: String(post.caption?.text ?? ""),
        durationSec: durationOf(item),
        width: Number(best.width) || 0,
        height: Number(best.height) || 0,
        videoUrl: String(best.url),
        thumbnailUrl: item.image_versions2?.candidates?.[0]?.url ?? null,
        takenAt: (Number(post.taken_at) || 0) * 1000,
        added: false,
      },
    ];
  });
}

/** One batch of a profile's posts, as Instagram sent it to the page. */
interface Batch {
  videos: InstagramVideo[];
  more: boolean;
}

/** The hidden browser with one profile's page open. Scrolling it makes Instagram send the next batch of posts. */
interface Viewer {
  username: string;
  fullName: string;
  browser: Browser;
  page: string;
  dir: string;
  /** Batches that have arrived and not been handed to the app yet. */
  arrived: Batch[];
  /** Posts already in a batch: Instagram sends some batches twice. */
  seen: Set<string>;
  idle: NodeJS.Timeout | null;
}

let viewer: Viewer | null = null;

function closeViewer() {
  const closing = viewer;
  if (!closing) return;
  viewer = null;
  if (closing.idle) clearTimeout(closing.idle);
  closing.browser.close();
  void wipe(closing.dir);
}

// Closing the helper takes its hidden browser with it.
process.once("exit", closeViewer);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.once(signal, () => process.exit(0));

async function openViewer(username: string): Promise<Viewer> {
  const sessionId = await readSession();
  if (!sessionId) throw new InstagramError(401, "Log in to Instagram first.");
  closeViewer();
  // Folders left by a helper that was closed mid-way are cleared out here.
  await wipe(VIEW_ROOT);

  const dir = join(VIEW_ROOT, randomUUID());
  const browser = await openBrowser(dir, ["--headless=new", "--window-size=1200,1600", "--mute-audio", "about:blank"]);
  const opened: Viewer = { username, fullName: "", browser, page: "", dir, arrived: [], seen: new Set(), idle: null };
  viewer = opened;

  await browser.call("Storage.setCookies", { cookies: [{ name: "sessionid", value: sessionId, domain: ".instagram.com", path: "/", secure: true, httpOnly: true, expires: Math.round(Date.now() / 1000) + 365 * 24 * 3600 }] });
  const { targetId } = (await browser.call("Target.createTarget", { url: "about:blank" })) ?? {};
  opened.page = (await browser.call("Target.attachToTarget", { targetId, flatten: true }))?.sessionId ?? "";
  if (!opened.page) throw new InstagramError(500, "Couldn't open a browser on this PC. Close any stuck Chrome or Edge windows and try again.");
  // A hidden browser names itself as one; Instagram is shown the ordinary name instead.
  const { userAgent } = (await browser.call("Browser.getVersion")) ?? {};
  if (userAgent) await browser.call("Emulation.setUserAgentOverride", { userAgent: String(userAgent).replace("HeadlessChrome", "Chrome") }, opened.page);
  await browser.call("Network.enable", {}, opened.page);

  // The page fetches its posts in batches; each answer is read as it lands.
  const answers = new Set<string>();
  browser.listen(({ method, params }) => {
    if (method === "Network.responseReceived" && /\/graphql/.test(params.response?.url ?? "")) answers.add(params.requestId);
    if (method !== "Network.loadingFinished" || !answers.delete(params.requestId)) return;
    void browser.call("Network.getResponseBody", { requestId: params.requestId }, opened.page).then((answer) => {
      let data: any;
      try {
        data = JSON.parse(answer?.base64Encoded ? Buffer.from(answer.body, "base64").toString("utf8") : answer?.body)?.data;
      } catch {
        return;
      }
      const timeline = data?.xdt_api__v1__feed__user_timeline_graphql_connection;
      if (!Array.isArray(timeline?.edges)) return;
      const sent: any[] = timeline.edges.map((edge: any) => edge?.node).filter(Boolean);
      const posts = sent.filter((post) => !opened.seen.has(String(post.pk ?? post.id)));
      for (const post of posts) opened.seen.add(String(post.pk ?? post.id));
      const more = Boolean(timeline.page_info?.has_next_page);
      // A repeat of a batch says nothing new, unless it is the one that says the profile has ended.
      if (posts.length === 0 && sent.length > 0 && more) return;
      opened.fullName ||= String(sent.find((post) => post.user?.full_name)?.user.full_name ?? "");
      opened.arrived.push({ videos: posts.flatMap(videosOf), more });
    });
  });

  await browser.call("Page.navigate", { url: `https://www.instagram.com/${username}/` }, opened.page);
  return opened;
}

async function evaluate(view: Viewer, expression: string) {
  return (await view.browser.call("Runtime.evaluate", { expression, returnByValue: true }, view.page))?.result?.value;
}

/** Why a profile's page is showing no posts, read off the page itself. Null if nothing on it explains it (yet). */
async function problemWith(view: Viewer): Promise<InstagramError | "empty" | null> {
  if (view.browser.gone()) return new InstagramError(502, "The hidden browser reading Instagram was closed. Try again.");
  const url = String((await evaluate(view, "location.href")) ?? "");
  const text = String((await evaluate(view, "document.body ? document.body.innerText.slice(0, 4000) : ''")) ?? "");
  if (/\/accounts\/login/.test(url)) return new InstagramError(401, "Instagram has signed this account out. Log in to Instagram again.");
  if (/\/(challenge|accounts\/suspended|accounts\/disabled)/.test(url)) return new InstagramError(401, "Instagram wants this account confirmed. Open instagram.com in your browser, finish what it asks, then log in here again.");
  if (/this page isn.t available/i.test(text)) return new InstagramError(404, "No Instagram profile by that name.");
  if (/this account is private/i.test(text)) return new InstagramError(403, `@${view.username} is a private profile. The Instagram account you logged in with has to follow it first.`);
  if (/no posts yet/i.test(text)) return "empty";
  return null;
}

/** The next batch of posts to arrive, or null if none does in time. */
async function nextBatch(view: Viewer, waitSec: number): Promise<Batch | null> {
  for (let waited = 0; waited < waitSec * 4; waited++) {
    const batch = view.arrived.shift();
    if (batch) return batch;
    if (view.browser.gone()) return null;
    await pause(250);
  }
  return null;
}

/**
 * The batch after the ones already read. Scrolling the page to its end is what makes
 * Instagram send it; the page doesn't always notice the first time, so it is scrolled
 * again — with a nudge back up to re-arm it — until a batch lands or time runs out.
 */
async function moreBatch(view: Viewer): Promise<Batch | null> {
  for (let tries = 0; tries < MORE_WAIT_SEC / 2 && !view.browser.gone(); tries++) {
    if (view.arrived.length === 0) {
      await evaluate(view, "window.scrollBy(0, -800)");
      await pause(250);
      await evaluate(view, "window.scrollTo(0, document.documentElement.scrollHeight)");
    }
    const batch = await nextBatch(view, 2);
    if (batch) return batch;
  }
  return null;
}

/** One profile is read at a time: a second request waits for the first. */
let queue: Promise<unknown> = Promise.resolve();

/** A page of the videos a profile has posted, newest first. `cursor` is the `next` of the page before. */
export function listProfile(profile: unknown, cursor: unknown): Promise<InstagramPage> {
  const turn = queue.then(() => readProfile(profile, cursor));
  queue = turn.catch(() => undefined);
  return turn;
}

async function readProfile(profile: unknown, cursor: unknown): Promise<InstagramPage> {
  const username = usernameFrom(profile);
  if (login.status === "waiting") throw new InstagramError(409, "Finish logging in to Instagram first.");

  let view: Viewer;
  let batch: Batch | null = null;
  if (cursor) {
    // More of a profile comes from the page that is already open on it.
    if (!viewer || viewer.username !== username || viewer.browser.gone()) throw new InstagramError(410, "This list has gone stale. Press Show videos to load it again.");
    view = viewer;
    batch = await moreBatch(view);
    if (!batch) throw new InstagramError(502, "Instagram didn't send more videos. Try Load more again in a moment.");
  } else {
    view = await openViewer(username);
    try {
      for (let waited = 0; !batch && waited < FIRST_PAGE_WAIT_SEC; waited++) {
        batch = await nextBatch(view, 1);
        // The page is given a few seconds to load before its text is taken to mean anything.
        const problem = !batch && waited >= 4 ? await problemWith(view) : null;
        if (problem === "empty") batch = { videos: [], more: false };
        else if (problem) throw problem;
      }
      if (!batch) throw new InstagramError(502, "Instagram didn't show this profile's posts. Try again in a moment.");
    } catch (error) {
      closeViewer();
      throw error;
    }
  }

  // A batch of nothing but photos would look like the end, so a few are read until a video turns up.
  const videos = [...batch.videos];
  let more = batch.more;
  for (let extra = 1; extra < PAGES_PER_REQUEST && more && videos.length === 0; extra++) {
    const further = await moreBatch(view);
    if (!further) break;
    videos.push(...further.videos);
    more = further.more;
  }

  if (view.idle) clearTimeout(view.idle);
  if (more) view.idle = setTimeout(() => viewer === view && closeViewer(), VIEW_IDLE_MS).unref();
  else if (viewer === view) closeViewer();
  const known = await readAdded();
  return { username, fullName: view.fullName, videos: videos.map((video) => ({ ...video, added: known.has(video.id) })), next: more ? username : null };
}

/** Passes one of Instagram's own video or picture files through to the app, which can't fetch them itself. */
export async function pipeInstagramFile(url: unknown, res: ServerResponse) {
  // A video is usually handed on to another of Instagram's servers; each hop is checked to be one of them.
  let upstream: Response | null = null;
  let next = String(url);
  for (let hop = 0; hop < 4; hop++) {
    let target: URL;
    try {
      target = new URL(next);
    } catch {
      throw new InstagramError(400, "Bad request.");
    }
    if (target.protocol !== "https:" || !FILE_HOSTS.test(target.hostname)) throw new InstagramError(400, "Bad request.");
    upstream = await fetch(target, { redirect: "manual", headers: { "User-Agent": USER_AGENT } }).catch(() => null);
    const location = upstream && upstream.status >= 300 && upstream.status < 400 ? upstream.headers.get("location") : null;
    if (!location) break;
    void upstream?.body?.cancel();
    next = new URL(location, target).href;
    upstream = null;
  }
  // The links in a list stop working after some hours.
  if (!upstream?.ok || !upstream.body) throw new InstagramError(502, "Instagram didn't hand over the file. Show the profile's videos again and retry.");

  const length = upstream.headers.get("content-length");
  res.writeHead(200, {
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    ...(length ? { "Content-Length": length } : {}),
    "Cache-Control": "private, max-age=3600",
  });
  await pipeline(Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]), res);
}
