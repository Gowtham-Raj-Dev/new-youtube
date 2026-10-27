/**
 * Puts the 31 Saucer Siege gameplay Shorts (games.codelove.in/scripts/build-saucer-gameplay-shorts.mjs) on the
 * CodeLove channel's Shorts page in the app as "ready", each with its own title, description and tags.
 * They are not booked: the user queues them in the app. Ids run ep01…ep31, so the page lists them in order.
 *
 *   npm run saucer-shorts                 shows what it would do
 *   npm run saucer-shorts -- --go         uploads them and adds them
 *   npm run saucer-shorts -- --go --update   also rewrites the title/description/tags of ones still "ready"
 *
 * Metadata follows the channel rules in Moolai Illa Machan/README.md: title 90–99 characters, description over
 * 1000, tags about 490 (at most 30), and exactly 15 hashtags across title and description.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { COLLECTIONS, SHORT_HEIGHT, SHORT_WIDTH, fitYoutubeTags, storagePaths } from "@shortflow/shared";

const PROJECT = "fir-4b5dc";
const SHORTS = resolve(__dirname, "..", "..", "..", "z-video-files", "games.codelove.in", "saucer-siege", "shorts");
const GAME_URL = "https://games.codelove.in/saucer-siege";

const MAPS = [
  { name: "Greenwood Meadow", difficulty: "Easy", waves: 15, first: 1, about: "Green kaadu naduvula oru valaindha path" },
  { name: "Riverford", difficulty: "Medium", waves: 18, first: 9, about: "Naduvula aaru odura map, path rendu thadava cross aagudhu" },
  { name: "Frost Pass", difficulty: "Hard", waves: 20, first: 19, about: "Snow map, fast UFOs, idhu dhaan hardest" },
];
type Kind = "open" | "boss" | "won" | "waves";
/** Each EP: the hook its title opens with, and what it shows. */
const EPISODES: Record<number, [string, Kind]> = {
  1: ["🛸 UFO Attack Start! Towers Vechu Stop Pannalaam 💥", "open"],
  2: ["😱 Giant Mothership Vandhuduchu! Towers Thaangumaa", "boss"],
  3: ["💥 UFO Swarm Attack! Oru Saucer Kooda Thappikka Koodaadhu", "waves"],
  4: ["😍 Semma Satisfying Tower Defense! Saucers vs Towers", "waves"],
  5: ["🛸 Mothership vs Towers - Yaaru Jeyippaanga", "boss"],
  6: ["⚡ 2x Speed-la UFO Wave Clear! Semma Satisfying", "waves"],
  7: ["😎 20 Lives-um Safe! Perfect Defense Strategy", "waves"],
  8: ["🏆 Map 1 Clear! 20 Lives Safe 3 Stars ⭐⭐⭐", "won"],
  9: ["🌊 River Map-la UFO Attack! 18 Waves Thaangumaa", "open"],
  10: ["💀 Boss UFO Attack! Oru Life Kooda Poga Koodaadhu", "boss"],
  11: ["🔥 Cannon Splash Damage! UFO Kootam Gone 💥", "waves"],
  12: ["🎯 Ballista Perfect Aim! Ovvoru UFO-vum Down", "waves"],
  13: ["🔥 Mothership-a Oda Vechom! 2x Speed Defense", "boss"],
  14: ["😱 Fast Scouts Vandhaanga! Towers Pidikkumaa", "waves"],
  15: ["💪 Wave After Wave! Oru Life Kooda Pogala", "waves"],
  16: ["😨 Indha Boss UFO-va Stop Panna Mudiyumaa", "boss"],
  17: ["🛸 UFO Rain! Towers Non-Stop Firing 🔥", "waves"],
  18: ["🏆 River Map Clear! 3 Stars ⭐⭐⭐ Zero Damage", "won"],
  19: ["❄️ Hardest Map! 20 Waves UFO Attack 😱", "open"],
  20: ["🧊 Frost Pass-la Fast UFOs! Semma Tough", "waves"],
  21: ["🛸 Mega Mothership Incoming! Full Power Towers 💥", "boss"],
  22: ["🛡️ Armoured UFOs vs Cannon - Yaaru Win", "waves"],
  23: ["⚡ Beam Saucers Alert! Careful-ah Defend Pannanum", "waves"],
  24: ["😱 Frost Pass Mothership! Romba Strong", "boss"],
  25: ["💥 Tower Upgrade Panna Idhu Dhaan Result", "waves"],
  26: ["🎮 Free Game-la Perfect Run! Neenga Try Pannunga", "waves"],
  27: ["⚡ Boss Wave! Ellaa Towers-um Fire 🔥", "boss"],
  28: ["😍 Most Satisfying Tower Defense in Tamil", "waves"],
  29: ["🔥 Last 4 Waves! Tension Ah Irukku 😬", "waves"],
  30: ["🏁 Final Boss Mothership! Last Fight 😱", "boss"],
  31: ["🏆 Full Game Complete! Final Map 3 Stars ⭐⭐⭐", "won"],
};
const SHOWS: Record<Kind, string> = {
  open: "Pudhu map start! Mudhal towers vechu, mudhal waves-ah eppadi thadukkurom-nu paarunga.",
  boss: "Giant mothership varudhu – romba health, slow-ah aanaa strong-ah varum. Ellaa towers-um serndhu adichaa thaan down aagum!",
  won: "Last wave mudinjudhu – map clear! 20 lives-um safe, 3 stars ⭐⭐⭐. Victory screen varaikkum paarunga.",
  waves: "Wave mela wave varudhu – scouts, armoured, beam saucers. Oru saucer kooda end-ku poga koodaadhu!",
};
const TAILS = (n: number) => [` • Saucer Siege Tamil Gameplay EP ${n} #shorts #tamilgaming`, ` • Saucer Siege Tamil EP ${n} #shorts #tamilgaming`, ` • Saucer Siege Tamil Gameplay EP ${n} #shorts`, ` • Saucer Siege Tamil EP ${n} #shorts`];
const HASHTAGS = ["#SaucerSiege", "#TowerDefense", "#TamilGaming", "#tamilgameplay", "#gaming", "#mobilegames", "#freegames", "#strategygames", "#ufo", "#tamilshorts", "#gamingshorts", "#youtubeshorts", "#shortsfeed", "#trending", "#viral", "#tamil"];
const TAGS_COMMON = [
  "saucer siege", "saucer siege gameplay", "tower defense", "tower defense game", "tamil gameplay", "tamil gaming",
  "தமிழ் கேமிங்", "tower defense tamil", "ufo game", "ufo attack game", "free games", "free online games",
  "browser games", "mobile games", "3d games", "strategy games", "tamil shorts", "gaming shorts",
  "satisfying games", "codelove games", "games codelove", "tamil games", "best tower defense game", "td game", "shorts",
];
const TAGS_KIND: Record<Kind, string[]> = {
  open: ["new game tamil", "tower defense start"],
  boss: ["mothership", "boss fight", "boss ufo"],
  won: ["map clear", "3 stars", "level complete"],
  waves: ["ufo waves", "wave defense"],
};

function ffmpeg(args: string[]) {
  return spawnSync(ffmpegPath as unknown as string, ["-hide_banner", ...args], { encoding: "utf8" }).stderr;
}

function metadata(n: number) {
  const [hook, kind] = EPISODES[n];
  const m = [...MAPS].reverse().find((x) => n >= x.first)!;
  const mapNo = MAPS.indexOf(m) + 1;
  const parts = (MAPS[mapNo]?.first ?? 32) - m.first;
  const part = n - m.first + 1;
  const title = TAILS(n).map((tail) => hook + tail).find((t) => t.length <= 99) ?? (hook + TAILS(n).at(-1)).slice(0, 100);
  const inTitle = title.match(/#\w+/g)?.map((h) => h.toLowerCase()) ?? [];
  const tags = HASHTAGS.filter((h) => !inTitle.includes(h.toLowerCase())).slice(0, 15 - inTitle.length);
  const description = [
    `${hook} 👇`,
    `Saucer Siege EP ${n} of 31 – Map ${mapNo}/3 ${m.name} (${m.difficulty}), part ${part}/${parts}. ${SHOWS[kind]}`,
    "",
    `🎮 Indha game-ah FREE-ah vilayaadunga (download venaam): ${GAME_URL}`,
    "",
    "🛸 Saucer Siege pathi:",
    "Saucer Siege oru free 3D tower defense game. UFO saucers path vazhiya varum – neenga Ballista, Cannon, Catapult, Turret towers vechu avangala stop pannanum. Oru saucer kooda end-ku poga koodaadhu! 3 maps (Greenwood Meadow, Riverford, Frost Pass), 53 waves, giant motherships. Mobile, PC – browser-laye direct-ah vilayaadalaam.",
    `${m.name}: ${m.about}, ${m.waves} waves.`,
    "",
    "✅ Full game 2x speed-la – 20/20 lives, ovvoru map-um 3 stars ⭐⭐⭐",
    "✅ Tamil commentary-oda ovvoru wave-um",
    "✅ EP 1 to EP 31 – full game-um Shorts-aa, channel-la ellaa EP-um irukku",
    "",
    "😍 Video pidichaa LIKE pannunga, friends kitta SHARE pannunga!",
    "🔔 Dhinamum pudhu Tamil gameplay – SUBSCRIBE pannunga, bell icon-ah on pannunga.",
    "💬 Comment-la sollunga: neenga entha tower-ah first vaanguveenga? Ballista-vaa, Cannon-aa?",
    "",
    "🎮 Innum neraya free games: https://games.codelove.in",
    "",
    "🔎 tower defense tamil, ufo game tamil, saucer siege gameplay, free tower defense game, tamil gaming shorts, mobile strategy game, browser games tamil",
    "",
    tags.join(" "),
  ].join("\n");
  const keywords = fitYoutubeTags([`saucer siege ep ${n}`, `saucer siege ${m.name.toLowerCase()}`, ...TAGS_KIND[kind], ...TAGS_COMMON], 490);
  return { title, description, tags: keywords };
}

async function main() {
  const args = process.argv.slice(2);
  const go = args.includes("--go");
  const update = args.includes("--update");
  const files = readdirSync(SHORTS).filter((f) => /^\d\d - .*\.mp4$/.test(f)).sort();
  if (files.length !== 31) throw new Error(`Expected 31 shorts in ${SHORTS}, found ${files.length}`);
  // --preview[=n]: only the metadata (all EPs' sizes, and EP n in full), without the app.
  const preview = args.find((a) => a.startsWith("--preview"));
  if (preview) {
    for (let n = 1; n <= 31; n++) {
      const meta = metadata(n);
      const tagChars = meta.tags.reduce((s, t, i) => s + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
      console.log(`EP ${String(n).padStart(2)} title ${meta.title.length} · desc ${meta.description.length} · ${meta.tags.length} tags/${tagChars} ch · ${(meta.title + meta.description).match(/#\w+/g)?.length ?? 0} hashtags · ${meta.title}`);
    }
    const n = Number(preview.split("=")[1] ?? 2);
    const meta = metadata(n);
    console.log(`\n--- EP ${n} ---\n${meta.title}\n\n${meta.description}\n\nTAGS: ${meta.tags.join(", ")}`);
    return;
  }

  const cli = JSON.parse(readFileSync(join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const credDir = mkdtempSync(join(tmpdir(), "ss-cred-"));
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
  initializeApp({ credential: applicationDefault(), projectId: PROJECT, storageBucket: `${PROJECT}.firebasestorage.app` });
  const db = getFirestore();

  const connections = await db.collection(COLLECTIONS.youtubeConnections).where("status", "==", "connected").get();
  const channel = connections.docs.find((c) => /codelove/i.test(`${c.get("channelHandle") ?? ""} ${String(c.get("channelTitle") ?? "").replace(/\s+/g, "")}`));
  if (!channel) {
    console.log("Connected channels:", connections.docs.map((c) => `${c.get("channelTitle")} (${c.get("channelHandle")})`).join(", "));
    throw new Error("The CodeLove channel isn't connected in the app.");
  }
  const userId = String(channel.get("userId"));
  const videoId = `saucer_${channel.id}`;
  const videoRef = db.collection(COLLECTIONS.videos).doc(videoId);
  console.log(`Channel: ${channel.get("channelTitle")} (${channel.get("channelHandle")}) · status ${channel.get("status")}${go ? "" : " · DRY RUN"}`);

  const bucket = getStorage().bucket();
  let added = 0;
  for (const file of files) {
    const n = Number(file.slice(0, 2));
    const meta = metadata(n);
    const shortId = `${videoId}_ep${String(n).padStart(2, "0")}`;
    const shortRef = db.collection(COLLECTIONS.shorts).doc(shortId);
    const existing = await shortRef.get();
    const hashtags = (meta.title + meta.description).match(/#\w+/g)?.length ?? 0;
    const tagChars = meta.tags.reduce((s, t, i) => s + t.length + (/\s/.test(t) ? 2 : 0) + (i ? 1 : 0), 0);
    console.log(`\nEP ${n}: "${meta.title}" (${meta.title.length}) · desc ${meta.description.length} · ${meta.tags.length} tags/${tagChars} ch · ${hashtags} hashtags`);
    if (existing.exists) {
      if (existing.get("status") === "ready" && update && go) {
        await shortRef.update({ title: meta.title, description: meta.description, tags: meta.tags });
        console.log("  already ready — metadata updated");
      } else console.log(`  already ${existing.get("status")} in the app, left alone`);
      continue;
    }
    if (!go) continue;

    const path = join(SHORTS, file);
    const found = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpeg(["-i", path]));
    const durationSec = found ? Number(found[1]) * 3600 + Number(found[2]) * 60 + Number(found[3]) : 30;
    const videoPath = storagePaths.shortVideo(userId, shortId);
    const thumbnailPath = storagePaths.shortThumbnail(userId, shortId);
    const work = mkdtempSync(join(tmpdir(), "ss-thumb-"));
    const thumb = join(work, "thumb.jpg");
    ffmpeg(["-y", "-ss", "6", "-i", path, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", thumb]);
    // In pieces with retries: this connection drops large uploads.
    for (let attempt = 1; ; attempt++) {
      try {
        await bucket.upload(path, { destination: videoPath, resumable: true, chunkSize: 4 * 1024 * 1024, timeout: 60_000, metadata: { contentType: "video/mp4" } });
        break;
      } catch (error) {
        if (attempt >= 8) throw error;
        console.log(`  upload failed (${String(error).slice(0, 60)}), trying again`);
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
    const hasThumb = existsSync(thumb);
    if (hasThumb) await bucket.file(thumbnailPath).save(readFileSync(thumb), { contentType: "image/jpeg", resumable: false });
    rmSync(work, { recursive: true, force: true });

    const now = FieldValue.serverTimestamp();
    const videoExists = (await videoRef.get()).exists;
    const batch = db.batch();
    batch.set(
      videoRef,
      {
        userId,
        title: "Saucer Siege — Tamil gameplay Shorts",
        fileName: "saucer-siege-gameplay",
        storagePath: "",
        contentType: "video/mp4",
        fileSize: 0,
        status: "completed",
        uploadedAt: now,
        durationSec: null,
        width: SHORT_WIDTH,
        height: SHORT_HEIGHT,
        thumbnailPath,
        processingStartedAt: null,
        processingCompletedAt: now,
        activeJobId: null,
        errorMessage: null,
        sourceDeletedAt: now,
        connectionId: channel.id,
        shortsCount: FieldValue.increment(1),
        ...(videoExists ? {} : { createdAt: now }),
      },
      { merge: true },
    );
    batch.set(shortRef, {
      userId,
      videoId,
      segmentIndex: n - 1,
      startSec: 0,
      endSec: durationSec,
      durationSec,
      storagePath: videoPath,
      thumbnailPath: hasThumb ? thumbnailPath : null,
      cropMode: "fit",
      status: "ready",
      createdAt: now,
      title: meta.title,
      description: meta.description,
      tags: meta.tags,
      privacy: "public",
      categoryId: "20", // Gaming
      publishAt: null,
      youtubeVideoId: null,
      publishedAt: null,
      errorMessage: null,
      connectionId: channel.id,
    });
    await batch.commit();
    added++;
    console.log(`  uploaded → ${shortId} (ready)`);
  }
  console.log(`\n${go ? `${added} added` : "Dry run — add --go to upload"}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
