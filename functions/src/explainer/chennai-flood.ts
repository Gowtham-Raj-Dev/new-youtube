/**
 * "சென்னை ஏன் ஒவ்வொரு வருஷமும் மூழ்குது?" — Ulagam Ippo's fifth video, the same
 * boy host and voice, story look. Hook first, subscribe ask after it (the
 * user's channel review, 2026-11-13: views low, open on the question).
 *
 * Facts kept straight: Chennai is flat and low, on the coast; the Cooum, Adyar
 * and Kosasthalaiyar carry rain to the sea, and high tides / storm surge slow
 * their outfall. Old chain-linked eris (tanks) overflow one into the next.
 * T. Nagar was laid out in the 1920s on the drained Long Tank (Mambalam tank);
 * Valluvar Kottam (1976) stands on part of the Nungambakkam lake. Pallikaranai
 * marsh: widely reported to have lost ~90% of its area (≈5,500 ha → ~600–700
 * ha); Ramsar site since 2022. Most of Chennai's rain comes with the north-east
 * monsoon (Oct–Dec). 1 Dec 2015: Tambaram ≈ 49 cm in one day. 2019: the four
 * reservoirs ran dry ("Day Zero"), tanker queues. TN made rainwater harvesting
 * compulsory for buildings in 2003.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── Hook: the host big, the question first ──
  L(1, "k1", "flood-street", "ஒரு நிமிஷம் யோசிச்சுப் பாருங்க. நீங்க இப்போ நிக்கிற இடம், நூறு வருஷத்துக்கு முன்னாடி, ஒரு பெரிய ஏரியா இருந்திருக்கலாம்!", { sub: "ஒரு நிமிஷம் யோசிச்சுப் பாருங்க. நீங்க இப்போ நிக்கிற இடம், 100 வருஷத்துக்கு முன்னாடி, ஒரு பெரிய ஏரியா இருந்திருக்கலாம்!", host: "big", action: "think", overlay: { kind: "type", text: "இது ஒரு ஏரியா இருந்துச்சு..." } }),
  L(2, "k1", "lake", "சென்னையில நிறைய இடங்கள், அப்படித்தான். அதனால தான், ஒவ்வொரு மழைக்கும், தண்ணி திரும்ப தன்னோட வீட்டைத் தேடி வருது!", { action: "surprised", overlay: { kind: "title", text: "தண்ணி தன் வீட்டைத் தேடி வருது!" } }),
  L(3, "k1", "flood-car", "சென்னை ஏன் ஒவ்வொரு வருஷமும் மூழ்குது? இன்னைக்கு, அஞ்சு காரணங்களைப் பார்க்கலாம்!", { action: "count", overlay: { kind: "stamp", text: "5 காரணங்கள்", small: "சென்னை ஏன் மூழ்குது?" } }),
  L(4, "k1", "chennai-skyline", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். நீங்க இன்னும் சப்ஸ்க்ரைப் பண்ணலைன்னா, இப்பவே பண்ணிடுங்க. சரி, வாங்க ஆரம்பிக்கலாம்!", { action: "wave", overlay: { kind: "title", text: "SUBSCRIBE பண்ணிடுங்க", small: "உலகம் இப்போ" } }),

  // ── 1. A flat city by the sea ──
  L(5, "k2", "chennai-aerial", "முதல் காரணம். சென்னை, ரொம்ப தட்டையான ஊர். கடலுக்கு ரொம்ப பக்கத்துல, கொஞ்சம் தான் உயரத்துல இருக்கு.", { chapter: "தட்டையான ஊர்", host: "corner", action: "point", overlay: { kind: "title", text: "தட்டையான ஊர்", small: "கடலுக்கு பக்கத்துல, கொஞ்சம் உயரம்" } }),
  L(6, "k2", "chennai-aerial", "மலை ஊர்ல, தண்ணி வேகமா கீழே ஓடிடும். ஆனா சென்னையில, தண்ணி ரொம்ப மெதுவா தான் நகரும்.", { action: "think", overlay: { kind: "morph", from: "மலை ஊர்: வேகம்", to: "சென்னை: மெதுவா" } }),
  L(7, "k2", "adyar", "கூவம், அடையாறு, கொசஸ்தலையாறுன்னு, மூணு ஆறுகள், தண்ணியை கடலுக்கு கொண்டு போகணும்.", { action: "count", overlay: { kind: "list", items: ["கூவம்", "அடையாறு", "கொசஸ்தலையாறு"] } }),
  L(8, "k2", ["sea-waves", "cooum-mouth"], "ஆனா, புயல் நேரத்துல, கடல் அலை உயர்ந்து நிக்கும். அப்போ, ஆத்து தண்ணி கடலுக்குள்ள போக முடியாம, திரும்ப ஊருக்குள்ளயே வந்துடும்!", { action: "scared", overlay: { kind: "type", text: "கடல் வழியை அடைக்குது!" } }),

  // ── 2. The lost lakes ──
  L(9, "k3", "lake", "ரெண்டாவது காரணம் தான், ரொம்ப முக்கியம். காணாமப் போன ஏரிகள்!", { chapter: "காணாமப் போன ஏரிகள்", action: "whisper", overlay: { kind: "title", text: "காணாமப் போன ஏரிகள்" } }),
  L(10, "k3", "eri", "அந்தக் காலத்து ராஜாக்கள், ஒரு அருமையான ஐடியா வச்சிருந்தாங்க. ஏரிகளை, ஒரு சங்கிலி மாதிரி இணைச்சாங்க.", { action: "idea", overlay: { kind: "title", text: "ஏரிச் சங்கிலி", small: "ஒரு ஏரி → அடுத்த ஏரி" } }),
  L(11, "k3", "eri", "ஒரு ஏரி நிரம்பினா, மீதி தண்ணி, அடுத்த ஏரிக்கு போகும். மழைத் தண்ணியை சேமிக்க, இது ஒரு சூப்பர் சிஸ்டம்!", { sub: "ஒரு ஏரி நிரம்பினா, மீதி தண்ணி, அடுத்த ஏரிக்கு போகும். மழைத் தண்ணியை சேமிக்க, இது ஒரு சூப்பர் system!", action: "thumbs", overlay: { kind: "route", from: "ஏரி", to: "அடுத்த ஏரி" } }),
  L(12, "k3", "chennai-skyline", "ஆனா ஊர் பெருசாக பெருசாக, ஏரிகளை மூடி, வீடுகளும், ரோடுகளும் கட்டினோம்.", { action: "sad", overlay: { kind: "morph", from: "ஏரி", to: "கட்டடம்" } }),
  L(13, "k3", "t-nagar", "உங்களுக்கு தெரியுமா? இப்போ இருக்கிற தி. நகர், ஒரு காலத்துல, லாங் டேங்க்னு ஒரு பெரிய ஏரி!", { sub: "உங்களுக்கு தெரியுமா? இப்போ இருக்கிற தி. நகர், ஒரு காலத்துல, \"Long Tank\"னு ஒரு பெரிய ஏரி!", action: "surprised", overlay: { kind: "pin", text: "தி. நகர்", small: "ஒரு காலத்துல Long Tank ஏரி" } }),
  L(14, "k3", "valluvar-kottam", "வள்ளுவர் கோட்டம் கட்டியிருக்கிறதும், நுங்கம்பாக்கம் ஏரி இருந்த இடத்துல தான்!", { action: "point", overlay: { kind: "pin", text: "வள்ளுவர் கோட்டம்", small: "நுங்கம்பாக்கம் ஏரி இருந்த இடம்" } }),
  L(15, "k3", "flood-street", "ஏரியை மூடலாம். ஆனா, மழை அந்த இடத்தை மறக்காது!", { action: "nod", overlay: { kind: "stamp", text: "மழை மறக்காது!" } }),

  // ── 3. Chennai's sponge ──
  L(16, "k4", "pallikaranai", "மூணாவது காரணம். பள்ளிக்கரணை சதுப்பு நிலம்.", { chapter: "சென்னையோட ஸ்பாஞ்ச்", action: "point", overlay: { kind: "pin", text: "பள்ளிக்கரணை", small: "சதுப்பு நிலம்" } }),
  L(17, "k4", "pallikaranai", "இது, சென்னையோட ஒரு பெரிய ஸ்பாஞ்ச் மாதிரி. மழைத் தண்ணியை, அப்படியே உறிஞ்சி வச்சுக்கும்.", { sub: "இது, சென்னையோட ஒரு பெரிய sponge மாதிரி. மழைத் தண்ணியை, அப்படியே உறிஞ்சி வச்சுக்கும்.", action: "idea", overlay: { kind: "title", text: "சென்னையோட SPONGE" } }),
  L(18, "k4", "omr", "ஆனா, இந்த சதுப்பு நிலத்துல, பத்துல ஒன்பது பங்கு, காணாமப் போச்சு! கட்டடங்கள், ரோடுகள், குப்பை கொட்டுற இடம்னு, எல்லாம் அதுக்கு மேல தான் வந்துடுச்சு.", { sub: "ஆனா, இந்த சதுப்பு நிலத்துல, 10-ல 9 பங்கு, காணாமப் போச்சு! கட்டடங்கள், ரோடுகள், குப்பை கொட்டுற இடம்னு, எல்லாம் அதுக்கு மேல தான் வந்துடுச்சு.", action: "sad", overlay: { kind: "year", value: 90, suffix: "%", label: "சதுப்பு நிலம் காணாமப் போச்சு", ruler: true } }),
  L(19, "k4", "flood-car", "ஸ்பாஞ்ச் இல்லைன்னா, தண்ணி எங்கே போகும்? நேரா, நம்ம தெருவுக்கு தான்!", { sub: "Sponge இல்லைன்னா, தண்ணி எங்கே போகும்? நேரா, நம்ம தெருவுக்கு தான்!", action: "shrug", overlay: { kind: "type", text: "நேரா நம்ம தெருவுக்கு!" } }),
  L(20, "k4", "chennai-skyline", "இந்த விஷயம் உங்களுக்கு புதுசா இருந்தா, ஒரு லைக் போடுங்க! சென்னையில இருக்கிற உங்க ஃப்ரெண்ட்ஸுக்கு, ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "சென்னை ஃப்ரெண்ட்ஸுக்கு SHARE" } }),

  // ── 4. Blocked drains ──
  L(21, "k5", "drain", "நாலாவது காரணம். நம்ம மழைநீர் வடிகால்கள்.", { chapter: "அடைச்சுக்கிட்ட வடிகால்", action: "point-down", overlay: { kind: "title", text: "மழைநீர் வடிகால்" } }),
  L(22, "k5", "plastic", "மழைத் தண்ணி போற கால்வாய்கள்ல, பிளாஸ்டிக் கவர், பாட்டில், குப்பைன்னு, நிறைய அடைச்சுக்குது.", { action: "sad", overlay: { kind: "list", items: ["பிளாஸ்டிக் கவர்", "பாட்டில்", "குப்பை"] } }),
  L(23, "k5", "drain", "நிறைய இடங்கள்ல, வடிகால்கள், ஒண்ணோட ஒண்ணு சரியா இணைக்கப்படல. அப்போ, தண்ணி ஓட வழியே இல்லாம, ரோட்டுலயே நின்னுடுது.", { action: "think", overlay: { kind: "type", text: "தண்ணிக்கு வழியே இல்ல!" } }),
  L(24, "k5", "plastic", "நாம தூக்கிப் போடுற, ஒரு சின்ன கவர் கூட, வெள்ளத்துக்கு ஒரு காரணம் தான்!", { action: "nod", overlay: { kind: "stamp", text: "ஒரு சின்ன கவர் கூட!" } }),

  // ── 5. A month's rain in a day ──
  L(25, "k6", "cyclone", "அஞ்சாவது காரணம். மழை வர்ற விதம்.", { chapter: "ஒரே நாள்ல கொட்டுற மழை", action: "look-up", overlay: { kind: "title", text: "மழை வர்ற விதம்" } }),
  L(26, "k6", "rain", "சென்னைக்கு வருஷத்துல வர்ற மழையில, பெரும்பாலும், அக்டோபர்ல இருந்து டிசம்பர் வரைக்கும், வடகிழக்கு பருவமழையில தான் வருது.", { action: "point", overlay: { kind: "title", text: "வடகிழக்கு பருவமழை", small: "அக்டோபர் – டிசம்பர்" } }),
  L(27, "k6", "cyclone", "கூடவே புயலும் வந்துட்டா, சில நாள்லயே, மொத்த மழையும் கொட்டித் தீர்த்துடும்!", { action: "scared", overlay: { kind: "type", text: "சில நாள்லயே கொட்டித் தீர்க்கும்!" } }),
  L(28, "k6", "flood-2015", "ரெண்டாயிரத்து பதினஞ்சு, டிசம்பர் ஒண்ணாம் தேதி. தாம்பரத்துல, ஒரே நாள்ல, கிட்டத்தட்ட நாப்பத்தொம்பது சென்டிமீட்டர் மழை பெஞ்சுது!", { sub: "2015, டிசம்பர் 1-ம் தேதி. தாம்பரத்துல, ஒரே நாள்ல, கிட்டத்தட்ட 49 சென்டிமீட்டர் மழை பெஞ்சுது!", action: "surprised", overlay: { kind: "year", value: 49, suffix: " செ.மீ.", label: "தாம்பரம் · ஒரே நாள் · 1 டிசம்பர் 2015", ruler: true } }),
  L(29, "k6", "flood-relief", "அந்த வெள்ளத்தை, சென்னை மக்கள், இன்னும் மறக்கல.", { action: "sad", overlay: { kind: "title", text: "2015 சென்னை வெள்ளம்" } }),

  // ── The twist: the same city goes dry ──
  L(30, "k7", "dry-lake", "இப்போ, ஒரு ஆச்சரியமான விஷயம் சொல்றேன். இதே சென்னையில, ரெண்டாயிரத்து பத்தொன்பதுல, குடிக்கவே தண்ணி இல்ல!", { chapter: "வெள்ளமும் வறட்சியும்", sub: "இப்போ, ஒரு ஆச்சரியமான விஷயம் சொல்றேன். இதே சென்னையில, 2019-ல, குடிக்கவே தண்ணி இல்ல!", action: "surprised", overlay: { kind: "year", value: 2019, label: "சென்னை தண்ணீர் பஞ்சம்" } }),
  L(31, "k7", "dry-lake", "ஏரிகள் எல்லாம் வத்திப் போச்சு. லாரி தண்ணிக்காக, மக்கள் குடங்களோட வரிசையில நின்னாங்க.", { action: "sad", overlay: { kind: "title", text: "ஏரிகள் வத்திப் போச்சு" } }),
  L(32, "k7", "dry-lake", "மழைக்காலத்துல வெள்ளம். கோடையில வறட்சி. ஏன் தெரியுமா? வர்ற தண்ணியை சேமிக்க, நம்மகிட்ட இடமே இல்ல!", { action: "shrug", overlay: { kind: "morph", from: "மழைக்காலம்: வெள்ளம்", to: "கோடை: வறட்சி" } }),

  // ── What we can do, and goodbye ──
  L(33, "k8", "lake", "அப்போ என்ன பண்ணலாம்? ஏரிகளை சுத்தம் பண்ணி, திரும்ப உயிர் கொடுக்கணும்.", { chapter: "நாம என்ன பண்ணலாம்?", action: "idea", overlay: { kind: "title", text: "ஏரிகளுக்கு உயிர் கொடுப்போம்" } }),
  L(34, "k8", "pallikaranai", "ரெண்டாயிரத்து இருபத்தி ரெண்டுல, பள்ளிக்கரணை சதுப்பு நிலத்துக்கு, ராம்சார்ங்கிற, உலக அளவு பாதுகாப்பு கிடைச்சிருக்கு. இது ஒரு நல்ல ஆரம்பம்!", { sub: "2022-ல, பள்ளிக்கரணை சதுப்பு நிலத்துக்கு, \"ராம்சார்\"ங்கிற, உலக அளவு பாதுகாப்பு கிடைச்சிருக்கு. இது ஒரு நல்ல ஆரம்பம்!", action: "thumbs", overlay: { kind: "title", text: "ராம்சார் பாதுகாப்பு", small: "பள்ளிக்கரணை · 2022" } }),
  L(35, "k8", "rain-harvest", "வீட்டுல, மழைநீர் சேகரிப்பு, கண்டிப்பா இருக்கணும். பிளாஸ்டிக்கை, கால்வாய்ல போடவே கூடாது.", { action: "count", overlay: { kind: "list", items: ["ஏரிகளைக் காப்போம்", "மழைநீர் சேகரிப்பு", "பிளாஸ்டிக் வேண்டாம்"] } }),
  L(36, "k8", "rain", "மழை, நம்ம எதிரி இல்ல நண்பர்களே. அதுக்கு இடம் கொடுக்காதது தான், பிரச்சனை!", { host: "big", action: "proud", overlay: { kind: "title", text: "மழை நம்ம எதிரி இல்ல!" } }),
  L(37, "k8", "chennai-skyline", "உங்க ஏரியாவுல, மழைக்கு தண்ணி தேங்குதா? கமெண்ட்ல சொல்லுங்க!", { action: "think", overlay: { kind: "type", text: "உங்க ஏரியாவுல தண்ணி தேங்குதா?" } }),
  L(38, "k8", "chennai-skyline", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்? அதையும் கமெண்ட்ல சொல்லுங்க. நான் எல்லா கமெண்ட்டையும் படிப்பேன்!", { action: "nod", overlay: { kind: "type", text: "அடுத்த வீடியோ? கமெண்ட்ல சொல்லுங்க" } }),
  L(39, "k8", "chennai-skyline", "இந்த வீடியோ பிடிச்சிருந்தா, லைக் பண்ணுங்க, சப்ஸ்க்ரைப் பண்ணுங்க. மறுபடியும் சந்திப்போம். டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "LIKE · SUBSCRIBE", small: "டாட்டா! பை பை!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  "flood-street": { q: "Chennai floods 2015", file: "File:Chennai-floods-2015-dec-7.jpg" },
  "flood-car": { q: "Chennai floods 2015", file: "File:Chennai-floods-2015-dec-5.jpg" },
  "flood-2015": { q: "Aerial view of Chennai during floods", file: "File:Aerial view of Chennai during floods.jpg" },
  "flood-relief": { q: "2015 South Indian floods Chennai", file: "File:Indian Navy relief efforts during the 2015 floods in Chennai (01).jpg" },
  "cooum-mouth": { q: "Cooum River joining the Bay of Bengal", file: "File:Cooum River joining the Bay of Bengal.jpg" },
  lake: { q: "Chembarambakkam lake" },
  eri: { q: "Vedanthangal lake", file: "File:Vedanthangal Lake View TN Dec21 D72 21860.jpg" },
  "chennai-skyline": { q: "Chennai skyline" },
  "chennai-aerial": { q: "Chennai aerial view" },
  adyar: { q: "Adyar river Chennai" },
  "sea-waves": { q: "Marina beach Chennai waves" },
  "t-nagar": { q: "T. Nagar Chennai Ranganathan Street" },
  "valluvar-kottam": { q: "Valluvar Kottam Chennai" },
  pallikaranai: { q: "Pallikaranai marsh" },
  omr: { q: "Old Mahabalipuram Road IT corridor Chennai" },
  drain: { q: "Chennai flood water logging", file: "File:Chennai flood water logging near ofice nandanam5.jpg" },
  plastic: { q: "waste pollution in drain", file: "File:Waste pollution in drain at umuzocha Awka Anambra state.jpg" },
  cyclone: { q: "Cyclone Michaung satellite" },
  rain: { q: "heavy rain Chennai" },
  "dry-lake": { q: "Vellalore lake dried", file: "File:Vellalore lake in dried condition 01.jpg" },
  "rain-harvest": { q: "rainwater harvesting India" },
};

export const CHENNAI_FLOOD: ExVideo = {
  slug: "05 Chennai Vellam",
  title: "சென்னை ஏன் ஒவ்வொரு வருஷமும் மூழ்குது?",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "story",
  thumb: {
    visual: "flood-street",
    lines: [
      { text: "இது ஏரியா", size: 190, fill: "#FFF6E6" },
      { text: "இருந்துச்சு!", size: 190, fill: "#E8B75A" },
      { text: "சென்னை ஏன் மூழ்குது?", size: 110, fill: "#FFF6E6" },
    ],
  },
  ...HOST_VOICE,
};
