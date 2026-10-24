/**
 * Cartoon videos over real comedy audio clips in "Moolai Illa Machan/Real Comedy/audio",
 * written to "Real Comedy/Video/<id>.mp4" (+ .txt with YouTube details). The clip's
 * own sound is used as it is; only the picture is ours.
 *
 *   npm run make-real -- <id>            4K
 *   npm run make-real -- <id> --test     1080p, quick
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import type { Scene } from "../src/auto/cartoon";
import type { Line } from "../src/auto/render";
import { renderShort } from "../src/auto/render";
import { areaMechanic } from "../src/auto/scenes-mechanic";
import { pattaIdathulaye } from "../src/auto/scenes-real";

const ROOT = resolve(__dirname, "..", "..", "Moolai Illa Machan", "Shorts", "Real Comedy");
const RATE = 24_000;

interface Clip {
  audio: string;
  label: string;
  /** Each spoken part: its subtitle ("Name: words"), the word to colour, and when it is heard (seconds in the clip). */
  lines: Array<Line & { start: number; end: number }>;
  scene: Scene;
  /** Silence added after the clip, for the last reaction. */
  tail: number;
  title: string;
  description: string;
  tags: string[];
}

const CLIPS: Record<string, Clip> = {
  "patta-idathulaye": {
    audio: "#vadivelufunny #vadivelmeme Vadivelu dialogue whatsapp status video #shorts.mp3",
    label: "Machan Bad Luck",
    lines: [
      { screen: "Machan: Yenda dei, enakunne varuveengalaada?", highlight: "enakunne", kind: "story", start: 0.49, end: 2.4 },
      { screen: "Machan: Aiyoo… 😫", highlight: "aiyoo", kind: "story", start: 2.4, end: 3.09 },
      { screen: "Machan: Enkitta sarasam panradhukke unga aatha appan ungalai pethu vidraangala?", highlight: "sarasam", kind: "story", start: 3.26, end: 5.87 },
      { screen: "Machan: Yenda ippadi patta idathulaye vandhu punch panreenga? 😭", highlight: "patta", kind: "punch", start: 6.26, end: 8.5 },
    ],
    scene: pattaIdathulaye,
    tail: 1.4,
    title: "Adi pattadhum adhe idathula thaan thirumba thirumba 😭 | Moolai Illa Machan 😂 #tamilcomedy #shorts",
    description: [
      "Adi pattadhum adhe idathula thaan thirumba thirumba 😭😂",
      "Kadaisi varaikkum paarunga 👇 Unga life-la idhu nadandhirukkaa?",
      "",
      "🎬 Machan kaal virala already bandage. Aanaa cricket ball, friend kaal, phone… ellaam adhe idathula!",
      "\"Yenda ippadi patta idathulaye vandhu punch panreenga?\" 😭",
      "",
      "Ungalukkum ipdi oru bad luck machan irukkaana? Avanai tag pannunga! 👇",
      "😂 Video pidichaa LIKE pannunga, friends kitta SHARE pannunga!",
      "🔔 Dhinamum pudhu comedy — SUBSCRIBE pannunga, bell icon-ah on pannunga.",
      "💬 Comment-la sollunga: ungalukku adi patta idathulaye thirumba adi pattirukkaa?",
      "",
      "📺 Moolai Illa Machan pathi:",
      "Moolai Illa Machan oru Tamil cartoon comedy channel. Namma veetla, office-la, friends kooda dhinamum nadakkura chinna chinna comedy-ah 15 seconds cartoon-aa kaattuvom. Friends & Life, Amma vs Naan, Office Reality, Middle Class Diaries — ellaame namma life dhaan!",
      "",
      "🔎 vadivelu comedy, patta idathulaye, vadivelu dialogue, tamil comedy, tamil cartoon comedy, bad luck comedy",
      "",
      "#vadivelu #vadivelucomedy #moolaiillamachan #tamilshorts #tamil #comedy #funny #tamilfunny #comedyshorts #youtubeshorts #shortsfeed #trending #viral",
    ].join("\n"),
    tags: [
      "vadivelu comedy", "patta idathulaye", "vadivelu dialogue", "vadivelu memes", "vadivelu comedy shorts", "bad luck comedy",
      "tamil comedy", "தமிழ் காமெடி", "வடிவேலு காமெடி", "tamil comedy shorts", "tamil cartoon comedy", "moolai illa machan",
      "friends comedy tamil", "machan comedy", "tamil funny shorts", "tanglish comedy", "animated comedy tamil", "tamil jokes",
      "tamil comedy video", "tamil funny video", "comedy shorts tamil", "tamil whatsapp status comedy", "tamil memes", "funny shorts",
      "tamil cartoon", "cartoon comedy", "vadivelu whatsapp status", "vadivelu funny",
    ],
  },
  "area-mechanic": {
    audio: "instagram_video_DdlwDWxhIfI_di3s3gd.mp4",
    label: "Area Mechanic",
    lines: [
      say("Machan: Anna!", "anna", 2.7, 3.4),
      say("Machan: Anna!", "anna", 3.9, 4.6),
      say("Machan: Anna… ungalathaan!", "ungalathaan", 6.3, 7.5),
      say("Mechanic: Enna?", "enna", 7.8, 8.5),
      say("Machan: Anna, vandi service pannanum na.", "service", 12.0, 13.4),
      say("Mechanic: Service-lam ippo panna mudiyaadhu pa. Vandi neraya irukku. Poittu apram vaanga.", "mudiyaadhu", 16.0, 19.4),
      say("Machan: Enna? Half an hour-aa wait pannittu irukken. Appo sollaama ippo vandhu solreenga?", "half", 19.5, 23.1),
      say("Machan: Adhellaam enakku theriyaadhu na, service panniye aaganum!", "aaganum", 23.2, 25.4),
      say("Mechanic: Sari pa, vittuttu po. Kaalaila vaa, panni vekkuren.", "kaalaila", 25.5, 28.0),
      say("Mechanic: Pochadiyaa! Andha vandiya eduthu ulla vidu pa!", "pochadiyaa", 28.0, 30.1),
      say("Machan: Anna, vandi ready panniyaachaa na?", "ready", 31.6, 33.4),
      say("Mechanic: Spare parts innum varala pa. Rendu naal kazhichu vaanga, ready aayidum.", "rendu", 33.5, 36.0),
      say("Machan: Vandi ready aayiducha illaiyaa na?", "ready", 36.3, 37.7),
      say("Mechanic: Indha Pochadiyan payyan leave pa. Rendu naalla vandhuduvaan, ready panni kuduthudren.", "leave", 37.8, 41.0),
      say("Machan: Anna, vandi ready aayiducha illaiyaa na?", "ready", 41.4, 42.9),
      say("Mechanic: Pochadiyan innaikku dhaan pa vandhaan. Rendu naalla ready panni kuduthudrom.", "innaikku", 43.0, 45.1),
      say("Mechanic: Rende naal pa, rendu naal.", "rende", 45.3, 47.0),
      say("Mechanic: Oru rende naal… oru rende naal pa.", "rende", 47.1, 48.4),
      say("Machan: Anna! Rendu naal rendu naal-nu sollittu 20 naal izhuthutteenga na!", "20", 48.5, 51.0),
      say("Machan: Vandi vitta edathula irundhu oru inch kooda nagarala! Eppo dhaan service start pannuveenga?", "inch", 51.0, 53.5),
      say("Mechanic: Adho nikkudhu paathiyaa RX 100? Andha vandi vandhadhu 1985.", "1985", 53.8, 56.9),
      say("Machan: Adhukku enna ippo?", "ippo", 57.3, 58.4),
      say("Mechanic: Thambi… andha vandi indha kadaikku vandhadhu 1985. Innum service mudiyala!", "1985", 58.5, 63.8),
      say("Thatha: Thambi, andha RX 100 ready pannittiyaa pa?", "RX", 64.0, 66.5),
      say("Mechanic: Poittu rendu naalla vaanga thaatha, vandi ready aayidum.", "rendu", 66.5, 68.4),
      say("Thatha: Aiyyo… innum rendu naalaa?", "rendu", 68.5, 70.3),
      say("Thambi: Anna! Vandi start aagala. Konjam check panreengalaa?", "start", 71.8, 74.9),
      say("Mechanic: Kadaila neraya vandi irukku pa, poittu apram vaa!", "apram", 75.0, 77.0),
      say("Sir: Kaathu adikkadi erangidudhu na, konjam ennannu check pannunga.", "kaathu", 77.0, 79.2),
      say("Mechanic: Tyre-um tube-um dhaan pa maathanum.", "maathanum", 79.2, 80.8),
      say("Sir: Brake-um konjam loose-aa irukku, sariyaa pudikka maatengudhu.", "brake", 80.9, 82.7),
      say("Mechanic: Brake shoe-um brake cable-um maathanum pa.", "maathanum", 82.8, 84.0),
      say("Sir: Starting trouble-um irukku na.", "starting", 84.0, 85.0),
      say("Mechanic: Battery maathanum pa.", "maathanum", 85.0, 86.2),
      say("Sir: Appadiyaa vishayam? Chain konjam loose-aa irukku.", "chain", 86.2, 88.1),
      say("Mechanic: Chain sprocket-a dhaan maathanum.", "maathanum", 88.1, 89.4),
      say("Sir: Yov! Scooter-la edhaiyyaa chain sprocket?", "scooter", 89.4, 91.1),
      say("Mechanic: Belt… belt maathanum pa.", "belt", 91.1, 92.5),
      say("Sir: Neenga edhaiyum maatha vendaam, adjust mattum panni vainga. Office mudichittu vandhu eduthukkuren.", "adjust", 92.5, 96.3),
      say("Thambi: Anna! Vandi mattum start aagala, konjam paarunga na.", "start", 97.0, 99.0),
      say("Mechanic: Vandiyellaam ippo paakka mudiyaadhu pa, poittu apram vaa.", "mudiyaadhu", 99.0, 100.7),
      say("Sir: Anna, vandi ready aayiducha na?", "ready", 101.0, 102.2),
      say("Mechanic: Ready pa, indhaa.", "ready", 102.2, 103.3),
      say("Sir: Enna?! Indha vandi on panna andha vandi start aagudhu?", "andha", 104.4, 107.3),
      say("Mechanic: Theriyaliye…", "theriyaliye", 107.3, 108.6),
      say("Sir: Ennada murukkunaa aeroplane sound-laam varudhu?", "aeroplane", 110.0, 112.0),
      say("Sir: Indicator pottaa shutter-laam mela yerudhu?!", "shutter", 118.4, 120.7),
      say("Sir: Light switch mattum onnum work aagala?", "light", 121.1, 122.7),
      say("Youtuber: Naal epdi pogudhu?", "naal", 123.2, 124.4),
      say("Thambi: Vandi start aagala…", "start", 126.3, 127.6),
      say("Mechanic: Owner kadaila illa pa, poittu apramaa vaa.", "owner", 127.7, 129.4),
      say("Sir: Velai theriyalanaa velai kathukittu vandhu seinga na!", "kathukittu", 129.8, 131.8),
      say("Sir: Summa arai kuraiyaa velai senju customer thalaila arukkaadheenga!", "customer", 132.0, 133.7),
      say("Sir: Velai theriyalanaa… velai kathukittu vandhu seinga…", "theriyalanaa", 133.8, 136.0),
      say("Thambi: Anna! Anna, vandi start aagala na.", "start", 136.7, 138.7),
      say("Thambi: Neraya kadaikku poi paathutten, start panna mudiyaadhu-nu sollittaanga na.", "neraya", 138.8, 141.3),
      say("Thambi: Konjam vandi start panni kudu na.", "kudu", 141.3, 142.8),
      say("Sir: Thambi! Alanjadhu dhaan alanjutta… adhaan nalla kadai!", "nalla", 143.2, 146.4),
      say("Mechanic: Vandiya start pannu pa, start aagum.", "aagum", 150.1, 151.4),
      say("Thambi: Anna, kaasu?", "kaasu", 151.5, 152.7),
      say("Mechanic: Kaasellaam vendaam.", "vendaam", 152.9, 154.2),
      say("Thambi: Ennanne… avara poi ippadi solliteengale nne?", "avara", 154.7, 156.8),
      say("Sir: Ennapaa… en vandi start pannaa enna ennamo aagudhu…", "ennamo", 156.8, 160.0),
    ],
    scene: areaMechanic,
    tail: 1.4,
    title: "Area Mechanic kitta vandi kuduthaa 'rendu naal'-nu 20 naal 😭🔧 | Moolai Illa Machan #shorts",
    description: [
      "Area Mechanic kitta vandi kuduthaa 'rendu naal'-nu 20 naal 😭🔧😂",
      "Kadaisi varaikkum paarunga 👇 Kadaisila oru BOOM irukku 💥",
      "",
      "🎬 Machan vandi service-ku kuduthaan. \"Rendu naal pa\" — 2 days, 6 days, 8 days, 16 days… vandi oru inch kooda nagarala!",
      "Kadaila oru RX 100 1985-la irundhu service-ku wait pannudhu 😭",
      "Innoru customer-ku ellaame \"maathanum\" — scooter-la chain sprocket kooda! Wiring panna, indicator pottaa shutter yerudhu, light switch pottaa oorula mixer odudhu ✈️🔌",
      "",
      "Ungalukkum ipdi oru area mechanic irukkaaru? Avarai tag pannunga! 👇",
      "😂 Video pidichaa LIKE pannunga, friends kitta SHARE pannunga!",
      "🔔 Dhinamum pudhu comedy — SUBSCRIBE pannunga, bell icon-ah on pannunga.",
      "💬 Comment-la sollunga: unga mechanic sonna 'rendu naal' evlo naal aachu?",
      "",
      "🎧 Audio: original Tamil comedy skit — all credit to its creators. Cartoon by Moolai Illa Machan.",
      "",
      "📺 Moolai Illa Machan pathi:",
      "Moolai Illa Machan oru Tamil cartoon comedy channel. Namma veetla, office-la, friends kooda dhinamum nadakkura chinna chinna comedy-ah cartoon-aa kaattuvom. Friends & Life, Amma vs Naan, Office Reality, Middle Class Diaries — ellaame namma life dhaan!",
      "",
      "🔎 area mechanic comedy, mechanic comedy tamil, bike service comedy, rendu naal comedy, tamil comedy, tamil cartoon comedy",
      "",
      "#mechanic #mechaniccomedy #moolaiillamachan #tamilshorts #tamil #comedy #funny #tamilfunny #comedyshorts #youtubeshorts #shortsfeed #trending #viral",
    ].join("\n"),
    tags: [
      "area mechanic comedy", "mechanic comedy tamil", "bike service comedy", "rendu naal comedy", "two wheeler mechanic comedy", "scooter comedy",
      "tamil comedy", "தமிழ் காமெடி", "மெக்கானிக் காமெடி", "tamil comedy shorts", "tamil cartoon comedy", "moolai illa machan",
      "machan comedy", "tamil funny shorts", "tanglish comedy", "animated comedy tamil", "tamil jokes", "rx100 comedy",
      "tamil comedy video", "tamil funny video", "comedy shorts tamil", "tamil whatsapp status comedy", "tamil memes", "funny shorts",
      "tamil cartoon", "cartoon comedy", "mechanic shop comedy",
    ],
  },
};

/** A story line heard from `start` to `end` seconds in the clip. */
function say(screen: string, highlight: string, start: number, end: number): Line & { start: number; end: number } {
  return { screen, highlight, kind: "story", start, end };
}

function wav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function main() {
  const args = process.argv.slice(2);
  const test = args.includes("--test");
  const id = args.find((a) => !a.startsWith("--")) ?? "";
  const clip = CLIPS[id];
  if (!clip) throw new Error(`Which clip? ${Object.keys(CLIPS).join(", ")}`);

  // The clip as 24 kHz mono, as the renderer's voice track, with a little silence after it.
  const decoded = spawnSync(ffmpegPath as unknown as string, ["-hide_banner", "-loglevel", "error", "-i", join(ROOT, "audio", clip.audio), "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  if (decoded.status !== 0) throw new Error(String(decoded.stderr));
  const pcm = Buffer.concat([decoded.stdout, Buffer.alloc(Math.round(clip.tail * RATE) * 2)]);
  const narration = { wav: wav(pcm), spans: clip.lines.map(({ start, end }) => ({ start, end })), durationSec: pcm.length / (RATE * 2) };

  const out = test ? resolve(process.env.TEST_OUT ?? join(tmpdir(), "mim-test")) : join(ROOT, "Video");
  const work = mkdtempSync(join(tmpdir(), "mim-real-"));
  try {
    const short = await renderShort(
      {
        lines: clip.lines.map(({ screen, highlight, kind }) => ({ screen, highlight, kind })),
        narration,
        label: clip.label,
        emoji: null,
        handle: "@MoolaiIllaMachan",
        seed: 7,
        endingPath: null,
        scene: clip.scene,
        scale: test ? 1 : 2,
      },
      work,
    );
    writeFileSync(join(out, `${id}.mp4`), short.video);
    if (!test) writeFileSync(join(out, `${id}.txt`), `TITLE\n${clip.title}\n\nDESCRIPTION\n${clip.description}\n\nTAGS\n${clip.tags.join(", ")}\n`);
    console.log(`${id} · ${short.durationSec.toFixed(1)} s → ${join(out, `${id}.mp4`)}`);
    console.log(`title ${clip.title.length} · description ${clip.description.length} · tags ${clip.tags.length} (${clip.tags.join(",").length} chars)`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
