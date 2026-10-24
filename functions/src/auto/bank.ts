/**
 * The content bank for the daily black-screen comedy Shorts: no AI writes them.
 * Each script is a short relatable situation in a few lines, then a funny twist
 * for a punch line. Every Short opens with one of the like/subscribe hooks.
 *
 * Every line is [voice, screen, highlight]:
 * - voice: spoken Tamil in Tamil script, for the Tamil text-to-speech voice;
 * - screen: the same in Tanglish, shown as subtitles;
 * - highlight: the word of `screen` drawn in yellow ("" for none). "gift" also matches "gift-nu".
 */

import { YOUTUBE_TAG_CHARS_SAFE, fitYoutubeTags } from "@shortflow/shared";
import { MORE_AMMA, MORE_FRIENDS, MORE_MIDDLE, MORE_OFFICE } from "./bank-more";

export type Say = readonly [voice: string, screen: string, highlight: string];

export type Series = "middle" | "office" | "amma" | "friends";

export const SERIES: Record<
  Series,
  {
    label: string;
    voice: string;
    /** Added to the YouTube title, e.g. "Machan Logic 😂". */
    titleTag: string;
    /** The line that asks viewers to tag someone or comment. */
    cta: string;
    hashtags: string[];
    tags: string[];
  }
> = {
  middle: {
    label: "Middle Class Diaries",
    voice: "ta-IN-Chirp3-HD-Charon",
    titleTag: "Middle Class Comedy 😂",
    cta: "Unga veetla Appa-vum ipdi dhaana? Comment pannunga, Appa-ku share pannunga! 👇",
    hashtags: ["#middleclass", "#appacomedy", "#middleclasscomedy"],
    tags: ["middle class comedy", "appa comedy tamil", "middle class problems tamil", "appa paiyan comedy", "tamil family comedy"],
  },
  office: {
    label: "Office Reality",
    voice: "ta-IN-Chirp3-HD-Aoede",
    titleTag: "Office Comedy 😂",
    cta: "Unga office-la ipdi oru colleague irukkaangala? Avangala tag pannunga! 👇",
    hashtags: ["#officecomedy", "#corporatelife", "#itlife"],
    tags: ["office comedy tamil", "it employee comedy", "corporate comedy tamil", "boss comedy", "office memes tamil"],
  },
  amma: {
    label: "Amma vs Naan",
    voice: "ta-IN-Chirp3-HD-Puck",
    titleTag: "Amma vs Naan 😂",
    cta: "Unga Amma-vum ipdi dhaana? Amma-ku share pannunga! 👇",
    hashtags: ["#ammacomedy", "#ammavsnaan", "#ammasentiment"],
    tags: ["amma comedy", "amma paiyan comedy", "amma vs son comedy tamil", "tamil family comedy", "amma alaparaigal"],
  },
  friends: {
    label: "Friends & Life",
    voice: "ta-IN-Chirp3-HD-Charon",
    titleTag: "Machan Logic 😂",
    cta: "Ungalukkum ipdi oru machan irukkaana? Avanai tag pannunga! 👇",
    hashtags: ["#machan", "#friendscomedy", "#nanban"],
    tags: ["friends comedy tamil", "machan comedy", "nanban comedy", "friendship comedy tamil", "college comedy tamil"],
  },
};

const CHANNEL_TAGS = [
  "tamil comedy",
  "tamil comedy shorts",
  "tamil funny video",
  "tamil shorts",
  "moolai illa machan",
  "tamil jokes",
  "funny tamil",
  "tamil memes",
  "comedy shorts",
  "tamil whatsapp status comedy",
];
const CHANNEL_HASHTAGS = ["#tamilcomedy", "#tamilshorts", "#moolaiillamachan", "#tamilfunny", "#comedyshorts", "#shorts", "#trending", "#viral"];

/**
 * YouTube title, description and tags for a script: a hook title with
 * hashtags, a description of about a hundred words with the whole dialogue,
 * a call to tag a friend and the channel's hashtags, and search tags.
 */
function metadataFor(script: BankScript): { title: string; description: string; tags: string[] } {
  if (script.hook) return hookedMetadata(script, script.hook);
  const series = SERIES[script.series];
  const full = `${script.title} | ${series.titleTag} #shorts #tamilcomedy`;
  const title = full.length <= 100 ? full : `${script.title} #shorts #tamilcomedy`.slice(0, 100);
  const dialogue = [...script.lines, script.punch].map(([, screen]) => screen).join("\n");
  const punch = script.punch[1].replace(/^[A-Za-z]+:\s*/, "");
  const description = [
    `😂 ${punch}`,
    "",
    series.cta,
    "",
    dialogue,
    "",
    "Moolai Illa Machan – dhinamum Tamil comedy Shorts 😂 Friends, Amma, Office, Middle class life… ellaame namma life dhaan!",
    "🔔 Subscribe pannunga – daily sirippu guarantee",
    "👍 Like pannunga, unga machan-ku share pannunga",
    "💬 Comment-la unga reaction sollunga",
    "",
    [...CHANNEL_HASHTAGS.slice(0, 3), ...series.hashtags, ...CHANNEL_HASHTAGS.slice(3)].join(" "),
  ].join("\n");
  // The title's own words help search too: "phone charge", "swimming class"…
  const words = script.title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]{3,}$/.test(w))
    .map((w) => w.toLowerCase());
  // YouTube allows 500 characters of tags, counting quotes around multi-word ones.
  const tags = fitYoutubeTags([words.join(" "), `${words.join(" ")} comedy`, ...CHANNEL_TAGS, ...series.tags], YOUTUBE_TAG_CHARS_SAFE);
  return { title, description, tags };
}

/** The series' hashtag for the cartoon Shorts, shown with the channel's. */
const SERIES_HASHTAG: Record<Series, string> = { middle: "#middleclasscomedy", office: "#officecomedy", amma: "#ammacomedy", friends: "#friendscomedy" };

/**
 * Title, description and tags for a script with a hook: the hook as the title,
 * the first two description lines (all Shorts show) as a hook and a nudge to
 * watch to the end, a handful of hashtags, and the joke's own search words
 * leading the tags.
 */
function hookedMetadata(script: BankScript, hook: string): { title: string; description: string; tags: string[] } {
  const series = SERIES[script.series];

  // Title: the hook, the channel and hashtags, filled to 90–99 characters.
  const TITLE_HASHTAGS = ["#tamilcomedy", "#shorts", "#funny"];
  let title = hook;
  for (const piece of [" | Moolai Illa Machan 😂", ...TITLE_HASHTAGS.map((h) => ` ${h}`), " 🤣", " 🔥"]) {
    if (title.length >= 90) break;
    if ((title + piece).length <= 99) title += piece;
  }
  const inTitle = TITLE_HASHTAGS.filter((h) => title.includes(h));

  // Hashtags: YouTube ignores every hashtag on a video with more than 15, so title and description share 15.
  const hashtags = [
    "#tamilcomedy", "#shorts", "#funny", "#moolaiillamachan", SERIES_HASHTAG[script.series], "#tamilshorts", "#tamil", "#comedy",
    "#tamilfunny", "#comedyshorts", "#youtubeshorts", "#shortsfeed", "#trending", "#viral", "#tamilcartoon",
  ].filter((h) => !inTitle.includes(h)).slice(0, 15 - inTitle.length);

  const dialogue = [...script.lines, script.punch].map(([, screen]) => screen.replace(/\s*😂$/, "")).join("\n");
  const keywords = script.keywords ?? [];
  const who = script.series === "amma" ? "Amma" : script.series === "office" ? "office friends" : script.series === "middle" ? "family" : "machan";
  const description = [
    `${hook} 😂`,
    "Kadaisi line-ah miss pannaadheenga 👇 Last-la thaan twist!",
    "",
    "🎬 Inniku comedy:",
    dialogue,
    "",
    series.cta,
    `😂 Video pidichaa LIKE pannunga, unga ${who} kitta SHARE pannunga!`,
    "🔔 Dhinamum pudhu comedy — SUBSCRIBE pannunga, bell icon-ah on pannunga.",
    "💬 Comment-la sollunga: unga life-la idhu maadhiri nadandhirukkaa?",
    "",
    "📺 Moolai Illa Machan pathi:",
    "Moolai Illa Machan oru Tamil cartoon comedy channel. Namma veetla, office-la, friends kooda dhinamum nadakkura chinna chinna comedy-ah 15 seconds cartoon-aa kaattuvom. Friends & Life, Amma vs Naan, Office Reality, Middle Class Diaries — ellaame namma life dhaan!",
    "",
    `🔎 ${[...keywords, "tamil comedy", "tamil cartoon comedy", "tanglish comedy shorts", "tamil funny shorts"].join(", ")}`,
    "",
    hashtags.join(" "),
  ].join("\n");

  // Tags: the joke's own search words first, then the channel's, kept well under YouTube's
  // 500 characters as YouTube counts them (commas, and quotes around multi-word tags).
  const tags = fitYoutubeTags([
    ...keywords,
    "tamil comedy", "தமிழ் காமெடி", "tamil comedy shorts", "tamil cartoon comedy", "moolai illa machan", ...series.tags,
    "tamil funny shorts", "tanglish comedy", "animated comedy tamil", "tamil jokes", "tamil comedy video", "tamil funny video",
    "comedy shorts tamil", "tamil shorts", "tamil whatsapp status comedy", "new tamil comedy", "tamil memes", "நகைச்சுவை",
    "funny shorts", "comedy shorts", "tamil cartoon", "cartoon comedy", "tamil trending shorts", "tamil viral shorts", "shorts tamil",
  ], YOUTUBE_TAG_CHARS_SAFE);
  return { title, description, tags };
}

/** The first emoji in `text` (a whole one, with its skin tone or joiners), or null. */
export function firstEmoji(text: string): string | null {
  for (const { segment } of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(text)) {
    if (/\p{Extended_Pictographic}/u.test(segment)) return segment;
  }
  return null;
}

export interface BankScript {
  series: Series;
  /** YouTube title, without " #shorts". */
  title: string;
  /** A curiosity hook used as the YouTube title instead of `title`, e.g. "5 alarm vechen… appuram enna aachu? ⏰". */
  hook?: string;
  /** What people would search to find this joke, e.g. "wifi password comedy"; they lead the tags. */
  keywords?: string[];
  lines: Say[];
  punch: Say;
}

const MIDDLE: Omit<BankScript, "series">[] = [
  {
    title: "₹199 order… ₹312 bill 😭",
    lines: [
      ["நூத்தி தொண்ணூத்தி ஒன்பது ரூபாய்க்கு, சாப்பாடு ஆர்டர் பண்ணப் போனேன்.", "199 rupees-ku saapadu order panna ponen", "199"],
      ["டெலிவரி ஃபீ. பிளாட்ஃபார்ம் ஃபீ. மழை ஃபீ.", "Delivery fee. Platform fee. Mazhai fee.", "mazhai"],
      ["கடைசியா பில்லு. முன்னூத்தி பன்னெண்டு ரூபாய்.", "Final bill... 312 rupees", "312"],
    ],
    punch: ["அதுக்கு அப்புறம், அம்மா சமையலுக்கு ஃபைவ் ஸ்டார் ரேட்டிங் குடுத்தேன்.", "Adhukku apram Amma samayal-ku 5 star rating kuduthen ⭐", "rating"],
  },
  {
    title: "50% offer-ku poi maatikitten 😅",
    lines: [
      ["ஐம்பது பர்சென்ட் ஆஃபர் னு கடைக்கு போனேன்.", "50% offer-nu kadaikku ponen", "offer"],
      ["ரெண்டு வாங்குனா தான் ஆஃபராம்.", "Rendu vaanginaa dhaan offer-aam", "rendu"],
      ["தேவையில்லாத ரெண்டு சாமான் வாங்கிட்டு வந்தேன்.", "Thevai illaadha rendu saamaan vaangitu vandhen", "thevai"],
    ],
    punch: ["கடைக்காரன் சிரிச்சான். நான் தான் இந்த மாசத்தோட கஸ்டமர் ஆஃப் தி மன்த்.", "Kadaikaaran sirichaan. Naan dhaan \"customer of the month\" 🏆", "month"],
  },
  {
    title: "Salary vandhuchu… 3 naal-la poyiduchu 💸",
    lines: [
      ["சாலரி கிரெடிட் ஆச்சு னு மெசேஜ் வந்துச்சு.", "Salary credit aachu-nu message vandhuchu", "salary"],
      ["இ எம் ஐ, ரென்ட், கரண்ட் பில்.", "EMI, rent, current bill...", "EMI"],
      ["மூணு நாள்ல அக்கவுண்ட் ஜீரோ.", "Moonu naal-la account zero", "zero"],
    ],
    punch: ["நாலாவது நாள்ல இருந்து, அம்மா பர்ஸ்ல இருந்து வொர்க் பண்றேன்.", "4-vadhu naal-la irundhu \"work from Amma purse\" 👛", "purse"],
  },
  {
    title: "AC pottom… current bill paathom 🥵",
    lines: [
      ["வெயில் தாங்க முடியாம ஏசி போட்டோம்.", "Veyil thaanga mudiyaama AC pottom", "AC"],
      ["மாச கடைசில கரண்ட் பில் வந்துச்சு.", "Maasa kadaisila current bill vandhuchu", "bill"],
      ["இப்போ ஏசி இல்லாமலே வேர்க்குது.", "Ippo AC illaamale verkkudhu", "verkkudhu"],
    ],
    punch: ["இப்போ ஏசி ரிமோட்டை அப்பா லாக்கர்ல வெச்சிருக்காரு.", "Ippo AC remote Appa-voda locker-la 🔒", "locker"],
  },
  {
    title: "Moi ezhudhuradhu oru kalai 😂",
    lines: [
      ["கல்யாணத்துக்கு மொய் எழுதணும்.", "Kalyanathukku moi ezhudhanum", "moi"],
      ["ஐநூறு வெச்சா கம்மி. ஆயிரம் வெச்சா வலி.", "500 vechaa kammi. 1000 vechaa vali.", "vali"],
      ["கடைசியா ஐநூத்தி ஒண்ணு வெச்சோம்.", "Kadaisiyaa 501 vechom", "501"],
    ],
    punch: ["அந்த ஒரு ரூபாய் தான், எங்க ஃபேமிலியோட இன்ட்ரஸ்ட்.", "Andha 1 rupee dhaan enga family-oda interest 😂", "interest"],
  },
  {
    title: "12 maasa EMI, 3 maasathula screen poyiduchu 📱",
    lines: [
      ["புது போன் வாங்க பன்னெண்டு மாச இ எம் ஐ போட்டேன்.", "Pudhu phone-ku 12 maasa EMI pottaen", "EMI"],
      ["மூணு மாசத்துல ஸ்கிரீன் உடைஞ்சுது.", "Moonu maasathula screen udanjuchu", "screen"],
      ["இன்னும் ஒன்பது மாசம் இ எம் ஐ இருக்கு.", "Innum 9 maasam EMI irukku", "9"],
    ],
    punch: ["இப்போ உடைஞ்ச ஸ்க்ரீன்லயும், இ எம் ஐ ரிமைண்டர் மட்டும் க்ளியரா தெரியுது.", "Udanja screen-la kooda EMI reminder mattum clear-ah theriyudhu 📱", "EMI"],
  },
  {
    title: "Relatives vandhaanga… 10 nimisham dhaan 🍬",
    lines: [
      ["சொந்தக்காரங்க வர்றாங்க னு மெசேஜ் வந்துச்சு.", "Relatives varraanga-nu message vandhuchu", "relatives"],
      ["வீடு முழுக்க க்ளீன் பண்ணி, ஸ்வீட் வாங்கி வெச்சோம்.", "Veedu full-ah clean panni, sweet vaangi vechom", "sweet"],
      ["அவங்க பத்து நிமிஷம் இருந்துட்டு கிளம்பிட்டாங்க.", "Avanga 10 nimisham irundhutu kelambittaanga", "10"],
    ],
    punch: ["இப்போ ஸ்வீட் வேணும்னா, சொந்தக்காரங்க வர்றாங்க னு நானே மெசேஜ் அனுப்புறேன்.", "Ippo sweet venum-na \"relatives varraanga\"-nu naane message anuppuren 😎", "naane"],
  },
  {
    title: "Petrol ₹100-ku… bike-ku diet 🏍️",
    lines: [
      ["பெட்ரோல் நூறு ரூபாய்க்கு போடுங்க.", "Petrol 100 rupees-ku podunga", "100"],
      ["மீட்டரையே பாத்துட்டு இருந்தேன்.", "Meter-aye paathutu irundhen", "meter"],
      ["பைக்குக்கு இன்னைக்கு டயட் தான்.", "Bike-ku inniku diet dhaan", "diet"],
    ],
    punch: ["இப்போ நானும் பைக்கும் சேர்ந்து வாக்கிங் போறோம்.", "Ippo naanum bike-um serndhu walking porom 🏍️🚶", "walking"],
  },
  {
    title: "Cart-la 10 items… vaanginadhu delivery charge 🛒",
    lines: [
      ["கார்ட்ல பத்து ஐட்டம் போட்டேன்.", "Cart-la 10 items pottaen", "10"],
      ["டோட்டல் பாத்ததும் ஒன்பது ஐட்டம் ரிமூவ் பண்ணேன்.", "Total paathadhum 9 items remove pannen", "remove"],
      ["கடைசியா டெலிவரி சார்ஜ்க்கு தான் காசு கட்டினேன்.", "Kadaisiyaa delivery charge-ku dhaan kaasu katten", "delivery"],
    ],
    punch: ["இப்போ கார்ட்டை கனவு லிஸ்ட்டா வெச்சிருக்கேன். கனவுக்கு டெலிவரி சார்ஜ் இல்ல.", "Ippo cart dhaan en kanavu list. Kanavu-ku delivery charge illa 😌", "kanavu"],
  },
  {
    title: "Menu card-la price mattum dhaan paappom 😎",
    lines: [
      ["ஹோட்டல்ல மெனு கார்டு திறந்தேன்.", "Hotel-la menu card thirandhen", "menu"],
      ["டிஷ் பேரு பாக்காம, விலை மட்டும் பாத்தேன்.", "Dish per paakaama, price mattum paathen", "price"],
      ["கடைசியா, ஒரு ப்ளேட் இட்லி.", "Kadaisiyaa... oru plate idli", "idli"],
    ],
    punch: ["வெயிட்டர் கூட, இட்லி தானே சார் னு முன்னாடியே எழுதிட்டான்.", "Waiter-e \"Idli dhaane sir?\"-nu munnadiye ezhudhittaan 😂", "idli"],
  },
];

const OFFICE: Omit<BankScript, "series">[] = [
  {
    title: "\"Just 5 minute meeting\" 🙃",
    lines: [
      ["ஜஸ்ட் அஞ்சு நிமிஷ மீட்டிங் தான், னு சொன்னாங்க.", "\"Just 5 minute meeting dhaan\"-nu sonnaanga", "5"],
      ["ஒரு மணி நேரம் ஆச்சு.", "1 mani neram aachu", "1"],
      ["கடைசியா முடிவு பண்ணது. அடுத்த மீட்டிங் டேட்.", "Kadaisiyaa decide pannadhu... next meeting date", "next"],
    ],
    punch: ["அடுத்த மீட்டிங்கோட அஜெண்டா: இந்த மீட்டிங்கை பத்தி பேசுறது.", "Next meeting agenda: indha meeting-ah pathi pesuradhu 🙃", "agenda"],
  },
  {
    title: "Monday kaalai: innum 5 nimisham 😴",
    lines: [
      ["ஞாயிறு ராத்திரி: நாளைக்கு சீக்கிரம் எழுந்திருவேன்.", "Sunday night: naalaiku seekiram ezhundhiruven", "seekiram"],
      ["திங்கள் காலைல: இன்னும் அஞ்சு நிமிஷம்.", "Monday kaalaila: innum 5 nimisham", "5"],
      ["ஆபீஸுக்கு அரை மணி நேரம் லேட்.", "Office-ku 30 minutes late", "late"],
    ],
    punch: ["இப்போ என் அலாரமே, இன்னும் அஞ்சு நிமிஷம் னு சொல்லுது.", "Ippo en alarm-e \"innum 5 nimisham\"-nu solludhu ⏰", "alarm"],
  },
  {
    title: "Boss: idhu romba urgent 🔥",
    lines: [
      ["பாஸ்: இது ரொம்ப அர்ஜென்ட்.", "Boss: idhu romba urgent", "urgent"],
      ["ராத்திரி பதினொரு மணி வரைக்கும் பண்ணி அனுப்புனேன்.", "Night 11 mani varaikkum panni anuppinen", "11"],
      ["பாஸ் ரிப்ளை: அடுத்த வாரம் பாக்கலாம்.", "Boss reply: next week paakalaam", "next"],
    ],
    punch: ["இப்போ பாஸ் அர்ஜென்ட் னு சொன்னா, நான் நெக்ஸ்ட் வீக் தான் ரிப்ளை பண்றேன்.", "Ippo boss \"urgent\" sonnaa, naan next week reply panren 😌", "week"],
  },
  {
    title: "Appraisal: nalla pannirukka… hike 3% 😐",
    lines: [
      ["அப்ரைசல் மீட்டிங்குக்கு ரெடி ஆனேன்.", "Appraisal meeting-ku ready aanen", "appraisal"],
      ["பாஸ்: நீ நல்லா பண்ணிருக்க.", "Boss: nee nalla pannirukka", "nalla"],
      ["ஹைக்: மூணு பர்சென்ட்.", "Hike: 3 percent", "3"],
    ],
    punch: ["அந்த மூணு பர்சென்ட் ஹைக்ல, தினமும் ஒரு எக்ஸ்ட்ரா டீ குடிக்கலாம்.", "Andha 3% hike-la dhinamum oru extra tea kudikkalaam ☕", "tea"],
  },
  {
    title: "Work from home = work from bed 🛏️",
    lines: [
      ["வொர்க் ஃப்ரம் ஹோம் னு சொன்னாங்க.", "Work from home-nu sonnaanga", "home"],
      ["காலைல ஒன்பதுல இருந்து ராத்திரி பத்து வரைக்கும் கால்ஸ்.", "Kaalai 9 to night 10 varaikkum calls", "calls"],
      ["வீட்ல இருந்தும் வீட்ல இல்ல.", "Veetla irundhum veetla illa", "illa"],
    ],
    punch: ["இப்போ அம்மாவே, அவன் ஆபீஸ்ல இருக்கான் னு சொல்றாங்க. நான் பக்கத்து ரூம்ல.", "Amma: \"Avan office-la irukkaan\"... naan pakkathu room-la 🛏️", "room"],
  },
  {
    title: "Oru naal leave… 2 varusham aachu 🏖️",
    lines: [
      ["ஒரு நாள் லீவ் கேட்டேன்.", "Oru naal leave kettaen", "leave"],
      ["பாஸ்: ப்ராஜெக்ட் முடிஞ்சதும் எடுங்க.", "Boss: project mudinjadhum edunga", "project"],
      ["ப்ராஜெக்ட் முடியவே இல்ல. ரெண்டு வருஷம் ஆச்சு.", "Project mudiyave illa... 2 varusham aachu", "2"],
    ],
    punch: ["லீவ் அப்ரூவ் ஆச்சு. ரிட்டையர்மென்டுக்கு அப்புறம்.", "Leave approve aachu... retirement-ku apram 👴", "retirement"],
  },
  {
    title: "Thappa \"Reply all\" amukkitten 😱",
    lines: [
      ["தப்பா ரிப்ளை ஆல் அமுக்கிட்டேன்.", "Thappa \"Reply all\" amukkitten", "reply"],
      ["ஃபுல் ஆபீஸும் பாத்துடுச்சு.", "Full office-um paathuduchu", "full"],
      ["இப்போ எல்லாரும் என்னை பாத்து சிரிக்கிறாங்க.", "Ippo ellaarum ennai paathu sirikkiraanga", "sirikkiraanga"],
    ],
    punch: ["இப்போ ஆபீஸ்ல என் பேரே ரிப்ளை ஆல் தான்.", "Ippo office-la en per-e \"Reply All\" 😭", "per"],
  },
  {
    title: "Lunch 1 mani… saapadu 3 mani 🍱",
    lines: [
      ["லஞ்ச் ப்ரேக் ஒரு மணி னு சொன்னாங்க.", "Lunch break 1 mani-nu sonnaanga", "1"],
      ["சரியா ஒரு மணிக்கு ஒரு கால்.", "Correct-ah 1 mani-ku oru call", "call"],
      ["மூணு மணிக்கு ஆறிப்போன சாப்பாடு.", "3 mani-ku aaripona saapadu", "aaripona"],
    ],
    punch: ["என் லஞ்ச் பாக்ஸ் கூட, மீட்டிங் முடியட்டும் னு வெயிட் பண்ணுது.", "En lunch box kooda \"meeting mudiyattum\"-nu wait pannudhu 🍱", "wait"],
  },
  {
    title: "Interview: 5 varushathula enga irupeenga? 🤔",
    lines: [
      ["இன்டர்வியூல கேட்டாங்க: அஞ்சு வருஷத்துல எங்க இருப்பீங்க?", "Interview: 5 varushathula enga irupeenga?", "5"],
      ["நான்: இதே கம்பெனில தான்.", "Naan: idhe company-la dhaan", "company"],
      ["மனசுக்குள்ள: வேற கம்பெனில.", "Manasukkulla: vera company-la", "vera"],
    ],
    punch: ["இன்டர்வியூ எடுத்தவரே, அடுத்த மாசம் வேற கம்பெனிக்கு போயிட்டாரு.", "Interview eduthavare adutha maasam vera company-ku poitaaru 😂", "vera"],
  },
  {
    title: "Naan panna work… avanukku clap 👏",
    lines: [
      ["நான் பண்ண வேலையை,", "Naan panna work-ah...", "work"],
      ["மீட்டிங்ல டீம்மேட், நான் பண்ணேன் னு சொன்னான்.", "Meeting-la teammate \"naan pannen\"-nu sonnaan", "teammate"],
      ["பாஸ் அவனுக்கு க்ளாப்.", "Boss avanukku clap", "clap"],
    ],
    punch: ["இப்போ நான் பேசுனா, அவன் நானும் னு சொல்றான்.", "Ippo naan pesinaa, avan \"naanum!\"-nu solraan 🙄", "naanum"],
  },
];

const AMMA: Omit<BankScript, "series">[] = [
  {
    title: "Amma: phone-ah keezha vai 📵",
    lines: [
      ["அம்மா: ஃபோனை கீழ வை!", "Amma: Phone-ah keezha vai!", "keezha"],
      ["சரி னு கீழ வெச்சேன்.", "Sari-nu keezha vechen", "vechen"],
      ["அம்மா: சும்மா தானே இருக்க. கடைக்கு போ.", "Amma: Summa thaane irukka... kadaikku po", "kadaikku"],
    ],
    punch: ["இப்போ ஃபோனோட ரூம்ல ஒளிஞ்சிருக்கேன்.", "Ippo phone-oda room-la olinjirukken 🙈", "olinjirukken"],
  },
  {
    title: "Amma-voda \"konjam\" 🍚",
    lines: [
      ["அம்மா: சாப்டியா?", "Amma: Saaptiya?", "saaptiya"],
      ["நான்: சாப்டேன் மா.", "Naan: Saapten Ma", "saapten"],
      ["அம்மா: இன்னும் கொஞ்சம் சாப்டு.", "Amma: Innum konjam saapdu", "konjam"],
    ],
    punch: ["அந்த கொஞ்சத்துக்கு அப்புறம், நான் நடக்க கூட முடியல.", "Andha \"konjam\"-ku apram naan nadakka kooda mudiyala 🫃", "nadakka"],
  },
  {
    title: "Amma GPS > Google Maps 📍",
    lines: [
      ["நான்: அம்மா, என் சார்ஜர் எங்க?", "Naan: Amma, en charger enga?", "charger"],
      ["அம்மா: கண்ணு முன்னாடி தான் இருக்கு.", "Amma: Kannu munnadi dhaan irukku", "kannu"],
      ["அம்மா வந்து ஒரே செகண்ட்ல எடுத்து குடுத்தாங்க.", "Amma vandhu oru second-la eduthu kuduthaanga", "second"],
    ],
    punch: ["இப்போ எதை தேடுனாலும், முதல்ல அம்மாவை தான் தேடுறேன்.", "Ippo edha thedinaalum, mudhalla Amma-va dhaan thedren 😂", "Amma"],
  },
  {
    title: "Night 12 mani phone… kaalaila lecture 🌙",
    lines: [
      ["ராத்திரி பன்னெண்டு மணிக்கு ஃபோன் பாத்துட்டு இருந்தேன்.", "Night 12 mani-ku phone paathutu irundhen", "12"],
      ["அம்மா: தூங்கு, கண்ணு கெட்டுப்போகும்.", "Amma: Thoongu, kannu kettupogum", "thoongu"],
      ["காலைல: ஏன் இவ்ளோ லேட்டா எழுந்த?", "Kaalaila: yen ivlo late-ah ezhundha?", "late"],
    ],
    punch: ["இப்போ அம்மா ராத்திரி பதினொரு மணிக்கு வைஃபை பாஸ்வேர்டை மாத்திடுறாங்க.", "Ippo Amma night 11 mani-ku WiFi password-ah maathiduraanga 📵", "WiFi"],
  },
  {
    title: "Pakkathu veetu paiyan America-la 🇺🇸",
    lines: [
      ["அம்மா: பக்கத்து வீட்டு பையன் அமெரிக்கால இருக்கான்.", "Amma: Pakkathu veetu paiyan America-la irukkaan", "America"],
      ["நான்: அவன் அங்க தனியா சமைச்சு சாப்டுறான் மா.", "Naan: Avan anga thaniyaa samaichu saapdraan Ma", "thaniyaa"],
      ["அம்மா: நீ முதல்ல ஒரு தோசை ஊத்து.", "Amma: Nee mudhalla oru dosa oothu", "dosa"],
    ],
    punch: ["இப்போ அந்த அமெரிக்கா பையனே, எங்க அம்மா கிட்ட தோசை ரெசிபி கேக்குறான்.", "Ippo andha America paiyan-e en Amma kitta dosa recipe kekkuraan 😂", "recipe"],
  },
  {
    title: "Amma weather report ☔",
    lines: [
      ["மழை வரும் னு அம்மா குடை குடுத்தாங்க.", "Mazhai varum-nu Amma kodai kuduthaanga", "kodai"],
      ["நான்: வேணாம் மா, மழை வராது.", "Naan: Venaam Ma, mazhai varaadhu", "varaadhu"],
      ["முழுசா நனைஞ்சு வீட்டுக்கு வந்தேன்.", "Muzhusaa nanainju veettukku vandhen", "nanainju"],
    ],
    punch: ["வெதர் ஆப்பை டெலீட் பண்ணிட்டேன். அம்மா ஆப் இருக்கு.", "Weather app-ah delete panniten. Amma app irukku ☔", "Amma"],
  },
  {
    title: "Konjam kaaichal… Amma full treatment 🤒",
    lines: [
      ["கொஞ்சம் காய்ச்சல்.", "Konjam kaaichal...", "kaaichal"],
      ["அம்மா: ரசம், கஷாயம், கம்பளி, சாமி கும்புடு.", "Amma: Rasam, kashayam, kambali, saami kumbudu", "rasam"],
      ["ரெண்டு நாள்ல சரி ஆயிடுச்சு.", "Rendu naal-la sari aayiduchu", "sari"],
    ],
    punch: ["டாக்டரே அம்மா கிட்ட கஷாயம் ரெசிபி கேட்டாரு.", "Doctor-e Amma kitta kashayam recipe kettaaru 😂", "kashayam"],
  },
  {
    title: "\"Naalaiku clean pannuren\" 🧹",
    lines: [
      ["அம்மா: ரூமை க்ளீன் பண்ணு.", "Amma: Room-ah clean pannu", "clean"],
      ["நான்: நாளைக்கு பண்றேன்.", "Naan: Naalaiku pannuren", "naalaiku"],
      ["மறுநாள் அம்மாவே க்ளீன் பண்ணாங்க. கூடவே ஒரு லெக்சர்.", "Marunaal Amma-ve clean pannaanga. Koodave oru lecture", "lecture"],
    ],
    punch: ["அதுக்கு அப்புறம், நாளைக்கு ங்குற வார்த்தையே வீட்ல பேன்.", "Adhukku apram \"naalaiku\" word-e veetla ban 🚫", "ban"],
  },
  {
    title: "Mudhal salary-la Amma-ku saree 🥹",
    lines: [
      ["முதல் சாலரில அம்மாவுக்கு புடவை வாங்கினேன்.", "Mudhal salary-la Amma-ku saree vaanginen", "saree"],
      ["அம்மா: எதுக்கு இவ்ளோ செலவு?", "Amma: Edhukku ivlo selavu?", "selavu"],
      ["ஆனா ஃபங்ஷன்ல எல்லாருக்கும் காட்டினாங்க.", "Aana function-la ellaarukkum kaattinaanga", "ellaarukkum"],
    ],
    punch: ["இப்போ அந்த புடவை கதை, சொந்தக்காரங்க எல்லாருக்கும் மனப்பாடம்.", "Ippo andha saree kadhai relatives ellaarukkum manapaadam 😂", "manapaadam"],
  },
  {
    title: "Amma ooril illa… kitchen full mess 🍳",
    lines: [
      ["அம்மா ஊர்ல இல்ல. நானே சமைக்க போனேன்.", "Amma ooril illa. Naane samaikka ponen", "samaikka"],
      ["உப்பு கம்மி, காரம் அதிகம், அடுப்படி ஃபுல் மெஸ்.", "Uppu kammi, kaaram adhigam, kitchen full mess", "mess"],
      ["அம்மா ஃபோன்ல: நூடுல்ஸ் போட்டுக்கோ டா.", "Amma phone-la: Noodles pottukko da", "noodles"],
    ],
    punch: ["இப்போ அம்மா ஊருக்கு போனா, நானும் கூடவே போயிடுறேன்.", "Ippo Amma ooruku ponaa, naanum koodave poiduren 🧳", "koodave"],
  },
];

const FRIENDS: Omit<BankScript, "series">[] = [
  {
    title: "\"Machan 500 kudu, naalaikku tharen\" 💸",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், ஒரு ஐநூறு குடு. நாளைக்கு தரேன்.", "Friend: Machan 500 kudu, naalaikku tharen", "500"],
      ["ரெண்டு வருஷம் ஆச்சு.", "Rendu varusham aachu...", "rendu"],
      ["இப்போ அவன், இன்ஸ்டால கோவா ட்ரிப் போட்டோ போடறான்.", "Ippo avan Insta-la Goa trip photo podraan", "goa"],
    ],
    punch: ["அந்த கோவா போட்டோல, என் ஐநூறு ரூபாயும் சிரிச்சுட்டு இருக்கு.", "Andha Goa photo-la en 500 rupees-um sirichitu irukku 🏖️", "500"],
  },
  {
    title: "Sunday trip confirm… naan mattum bus stand-la 🚌",
    lines: [
      ["ஃப்ரெண்ட்ஸ் க்ரூப்ல: ஞாயிறு ட்ரிப் கன்ஃபர்ம்!", "Friends group-la: Sunday trip confirm!", "confirm"],
      ["சனிக்கிழமை ராத்திரி: மச்சான், கொஞ்சம் வேலை.", "Saturday night: \"Machan konjam vela\"", "vela"],
      ["ஞாயிறு: நான் மட்டும் பஸ் ஸ்டாண்ட்ல.", "Sunday: naan mattum bus stand-la", "mattum"],
    ],
    punch: ["அடுத்த ட்ரிப்புக்கு, நான் தான் முதல்ல கொஞ்சம் வேலை னு சொல்லப் போறேன்.", "Next trip-ku naan dhaan mudhalla \"konjam vela\" 😎", "mudhalla"],
  },
  {
    title: "\"ok\" nu reply… naan full overthinking 🤯",
    lines: [
      ["ஃப்ரெண்ட் மெசேஜுக்கு ஓகே னு மட்டும் ரிப்ளை பண்ணான்.", "Friend-oda reply: \"ok\"", "ok"],
      ["நான்: கோவமா இருக்கானோ? நான் என்ன தப்பு பண்ணேன்?", "Naan: Kovama irukkaano? Enna thappu pannen?", "thappu"],
      ["அவன்: மச்சான், நெட்வொர்க் இல்ல டா.", "Avan: Machan network illa da", "network"],
    ],
    punch: ["அந்த நெட்வொர்க் இல்லாத ஓகேக்கு, நான் மூணு நாள் தூங்கல.", "Andha network illaadha \"ok\"-ku naan 3 naal thoongala 😵", "thoongala"],
  },
  {
    title: "January gym… February fees mattum 🏋️",
    lines: [
      ["ஜனவரி ஒண்ணு: இந்த வருஷம் ஜிம்!", "January 1: indha varusham gym!", "gym"],
      ["ஜனவரி மூணு: கொஞ்சம் உடம்பு வலி.", "January 3: konjam udambu vali", "vali"],
      ["பிப்ரவரி: ஜிம் ஃபீஸ் மட்டும் கட்டுறேன்.", "February: gym fees mattum katturen", "fees"],
    ],
    punch: ["ஜிம் ஓனர் இப்போ என்னை பெஸ்ட் கஸ்டமர் னு சொல்றாரு. வராத கஸ்டமர்.", "Gym owner: \"Best customer!\"... varaadha customer 😂", "best"],
  },
  {
    title: "Bike kadan kuduthen… petrol zero ⛽",
    lines: [
      ["ஃப்ரெண்ட் பைக் கேட்டான்.", "Friend bike kettaan", "bike"],
      ["திருப்பி குடுத்தான். பெட்ரோல் ஜீரோ.", "Thiruppi kuduthaan. Petrol zero.", "zero"],
      ["கூடவே ஒரு புது ஸ்க்ராட்ச்.", "Koodave oru pudhu scratch", "scratch"],
    ],
    punch: ["இப்போ அவன் பைக் கேட்டா, நான் சைக்கிளை குடுக்குறேன்.", "Ippo avan bike kettaa, naan cycle kudukkuren 🚲", "cycle"],
  },
  {
    title: "Group photo-la naan mattum kann moodi 📸",
    lines: [
      ["க்ரூப் போட்டோ எடுத்தோம்.", "Group photo eduthom", "photo"],
      ["எல்லாரும் நல்லா இருக்காங்க. நான் மட்டும் கண்ணை மூடிட்டு.", "Ellaarum super. Naan mattum kann moodi", "moodi"],
      ["அந்த போட்டோவை தான் க்ரூப் டி பி யா வெச்சாங்க.", "Andha photo dhaan group DP", "DP"],
    ],
    punch: ["அந்த போட்டோவை என் கல்யாண ஃப்ளெக்ஸ்ல போடுவாங்களோ னு பயமா இருக்கு.", "Andha photo-va en kalyana flex-la poduvaangalo-nu bayama irukku 😱", "flex"],
  },
  {
    title: "\"Inniku en treat\"… bill vandhadhum escape 🏃",
    lines: [
      ["ஹோட்டல்ல, இன்னைக்கு என் ட்ரீட் னு சொன்னான்.", "Hotel-la: \"Inniku en treat\"-nu sonnaan", "treat"],
      ["பில் வந்ததும் அவன் பாத்ரூம் போயிட்டான்.", "Bill vandhadhum avan bathroom poitaan", "bathroom"],
      ["கடைசில நான் தான் கட்டினேன்.", "Kadaisila naan dhaan katten", "katten"],
    ],
    punch: ["இப்போ அவன் ட்ரீட் னு சொன்னா, நான் முதல்ல பாத்ரூம் போயிடுறேன்.", "Ippo avan \"treat\" sonnaa, naan mudhalla bathroom poiduren 🏃", "bathroom"],
  },
  {
    title: "Full night counselling… next day pudhu love 💔➡️❤️",
    lines: [
      ["ஃப்ரெண்ட்: லவ் ஃபெயிலியர், நான் சோகமா இருக்கேன்.", "Friend: Love failure, naan sogama irukken", "sogama"],
      ["நான் ராத்திரி முழுக்க கவுன்சிலிங்.", "Naan full night counselling", "counselling"],
      ["மறுநாள் அவன் புது லவ் ஸ்டோரி ஸ்டார்ட்.", "Marunaal avan pudhu love story start", "pudhu"],
    ],
    punch: ["இப்போ அவனோட லவ் ஸ்டோரிக்கு, நான் தான் பர்மனென்ட் கவுன்சிலர். ஃபீஸ் இல்ல.", "Ippo avan love story-ku naan permanent counsellor. Fees illa 😑", "fees"],
  },
  {
    title: "Midnight surprise… avan 9 mani-ke thookam 🎂",
    lines: [
      ["ஃப்ரெண்ட் பர்த்டேக்கு சர்ப்ரைஸ் ப்ளான்.", "Friend birthday-ku surprise plan", "surprise"],
      ["மிட்நைட் கேக், பலூன், எல்லாம் ரெடி.", "Midnight cake, balloon, ellaam ready", "cake"],
      ["அவன் ஒன்பது மணிக்கே தூங்கிட்டான்.", "Avan 9 mani-kke thoongittaan", "9"],
    ],
    punch: ["கேக்கை நாங்களே சாப்டுட்டோம். பர்த்டே பாய் தூங்கிட்டான்.", "Cake-ah naangale saapittom. Birthday boy thoongittaan 🎂😴", "naangale"],
  },
  {
    title: "Insta-la ellaarum Goa… naan rasam saadham 🍛",
    lines: [
      ["இன்ஸ்டாகிராம் ஓபன் பண்ணேன்.", "Instagram open pannen", "Instagram"],
      ["எல்லாரும் கோவா, மணாலி, துபாய்.", "Ellaarum Goa, Manali, Dubai", "Dubai"],
      ["நான்: வீட்ல ரசம் சாதம்.", "Naan: veetla rasam saadham", "rasam"],
    ],
    punch: ["ஆனா அவங்களும் கோவால இருந்து, அம்மா ரசம் மிஸ் பண்றேன் னு ஸ்டோரி போடுறாங்க.", "Aana avanga Goa-la irundhu \"Amma rasam miss panren\"-nu story 😂", "miss"],
  },
];

/** Interleaved middle, office, amma, friends, … so the Shorts of a day are four different series. */
export const BANK: BankScript[] = (() => {
  const lists: Array<[Series, Omit<BankScript, "series">[]]> = [
    ["middle", [...MIDDLE, ...MORE_MIDDLE]],
    ["office", [...OFFICE, ...MORE_OFFICE]],
    ["amma", [...AMMA, ...MORE_AMMA]],
    ["friends", [...FRIENDS, ...MORE_FRIENDS]],
  ];
  const out: BankScript[] = [];
  const longest = Math.max(...lists.map(([, list]) => list.length));
  for (let i = 0; i < longest; i++) {
    for (const [series, list] of lists) if (list[i]) out.push({ series, ...list[i] });
  }
  return out;
})();

export type LineKind = "story" | "punch";

/**
 * The voices of the people in the stories. A line whose subtitle starts with
 * "Amma:", "Boss:" and so on is spoken by that person, without the name.
 */
const CAST: Record<string, string> = {
  amma: "ta-IN-Chirp3-HD-Kore",
  appa: "ta-IN-Chirp3-HD-Iapetus",
  boss: "ta-IN-Chirp3-HD-Fenrir",
  manager: "ta-IN-Chirp3-HD-Fenrir",
  friend: "ta-IN-Chirp3-HD-Puck",
  avan: "ta-IN-Chirp3-HD-Puck",
  hr: "ta-IN-Chirp3-HD-Aoede",
  client: "ta-IN-Chirp3-HD-Enceladus",
  doctor: "ta-IN-Chirp3-HD-Schedar",
  mama: "ta-IN-Chirp3-HD-Orus",
  police: "ta-IN-Chirp3-HD-Alnilam",
  salesman: "ta-IN-Chirp3-HD-Achird",
  relatives: "ta-IN-Chirp3-HD-Gacrux",
  machan: "ta-IN-Chirp3-HD-Puck",
  colleague: "ta-IN-Chirp3-HD-Algenib",
  uncle: "ta-IN-Chirp3-HD-Orus",
  trainer: "ta-IN-Chirp3-HD-Schedar",
  kadaikaarar: "ta-IN-Chirp3-HD-Achird",
};

/** Who says a line, from its subtitle: "Amma: …" → Amma's voice. */
function speakerVoice(screen: string, narrator: string): string | undefined {
  const name = /^([A-Za-z]+):/.exec(screen)?.[1]?.toLowerCase();
  const voice = name ? CAST[name] : undefined;
  return voice && voice !== narrator ? voice : undefined;
}

export interface PlannedLine {
  say: Say;
  kind: LineKind;
  /** What the voice says: the line without its speaker's name when a character says it. */
  spoken: string;
  /** The character's voice; none means the narrator. */
  voice?: string;
  /** Who says it, e.g. "Machan"; a line without a name is Naan's. */
  speaker: string;
}

export interface PlannedShort {
  script: BankScript;
  /** In speaking order: the story, then the punch. */
  lines: PlannedLine[];
  /** The narrator's voice. */
  voice: string;
  /** Gemini voice for each speaker, e.g. { Machan: "Puck", Naan: "Charon" }. */
  geminiVoices: Record<string, string>;
  label: string;
  /** Shown big above the story: the emoji of the script's title. */
  emoji: string | null;
  title: string;
  description: string;
  tags: string[];
}

/** The Short for position `n` of a channel's run through the bank. */
export function planShort(n: number): PlannedShort {
  return planScript(BANK[n % BANK.length]);
}

/** The Short for `script`: straight into the dialogue, no opener. */
export function planScript(script: BankScript): PlannedShort {
  const series = SERIES[script.series];
  const nameOf = (screen: string) => /^([A-Za-z]+):/.exec(screen)?.[1] ?? "Naan";
  const cast = [...new Set([...script.lines, script.punch].map(([, screen]) => nameOf(screen)))];
  const line = (say: Say, kind: LineKind): PlannedLine => {
    const named = /^[A-Za-z]+:/.test(say[1]);
    // In a dialogue the name is a tag on screen, never read out.
    return { say, kind, voice: speakerVoice(say[1], series.voice), speaker: nameOf(say[1]), spoken: named ? say[0].replace(/^[^:]{1,24}:\s*/, "") : say[0] };
  };
  // Gemini's voices share the Chirp voices' names.
  const geminiVoices: Record<string, string> = {};
  for (const name of cast) {
    const voice = (CAST[name.toLowerCase()] ?? series.voice).replace(/^ta-IN-Chirp3-HD-/, "");
    // Two people never share a voice.
    geminiVoices[name] = Object.values(geminiVoices).includes(voice) ? (voice === "Charon" ? "Puck" : "Charon") : voice;
  }
  const { title, description, tags } = metadataFor(script);
  return {
    script,
    lines: [
      ...script.lines.map((say) => line(say, "story")),
      line(script.punch, "punch"),
    ],
    voice: series.voice,
    geminiVoices,
    label: series.label,
    emoji: firstEmoji(script.title),
    title,
    description,
    tags,
  };
}
