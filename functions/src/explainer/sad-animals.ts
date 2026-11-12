/**
 * "Top 3 சோகமான விலங்கு கதைகள்" — Ulagam Ippo's first Short of its own (9:16,
 * ~40 s), modelled on a viral "top 3" countdown the user sent (2026-11-09):
 * the same boy host and voice, story look, big gold 3 · 2 · 1 cards.
 *
 * Facts kept straight:
 * 3. Deep-sea anglerfish (ceratioids): the female's glowing lure (esca) in the
 *    dark; in some species the tiny male bites a female, fuses for good and
 *    shares her blood ("sexual parasitism").
 * 2. The Adélie penguin in Werner Herzog's "Encounters at the End of the World"
 *    (2007): it left the colony and the sea, walking towards the mountains
 *    inland; scientist David Ainley says that brought back it would head
 *    straight out again. No food there — certain death.
 * 1. Orca J35 "Tahlequah" (Southern Residents, July 2018): her calf lived about
 *    half an hour; she carried it 17 days, ~1,600 km (1,000 miles). Orcas are
 *    the largest member of the dolphin family.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── Hook: the host big, a glimpse of all three ──
  L(1, "k1", ["penguin", "orca", "anglerfish"], "உலகத்துலயே ரொம்ப சோகமான மூணு விலங்கு கதைகள்! நம்பர் ஒண்ணு, மனசை உடைச்சிடும்!", { host: "big", action: "sad", overlay: { kind: "title", text: "TOP 3", small: "சோகமான விலங்கு கதைகள்" } }),

  // ── 3. Anglerfish ──
  L(2, "k2", "anglerfish", "ஆழ்கடல் இருட்டுல வாழுது, ஆங்லர் மீன்.", { chapter: "ஆங்லர் மீன்", host: "corner", action: "point", overlay: { kind: "title", text: "ஆழ்கடல் இருட்டு", small: "தலையில் ஒரு விளக்கு" } }),
  L(3, "k2", "anglerfish-pair", "ஆண் மீன், பெண் மீனை கடிச்சு, அதோட உடம்போடவே கலந்துடும்!", { action: "surprised", overlay: { kind: "morph", from: "ஆண் மீன்", to: "பெண் மீனின் ஒரு பகுதி" } }),

  // ── 2. The penguin ──
  L(4, "k3", "penguin", "ஒரு பென்குயின், கூட்டத்தையும் கடலையும் விட்டுட்டு, தனியா மலையை நோக்கி நடந்துச்சு.", { chapter: "தனியா போன பென்குயின்", action: "sad", overlay: { kind: "title", text: "தனியா... மலையை நோக்கி" } }),
  L(5, "k3", "antarctic-mountains", "அங்க சாப்பாடே இல்ல. ஆனாலும் திரும்பிப் பார்க்கவே இல்ல.", { action: "whisper", overlay: { kind: "type", text: "திரும்பிப் பார்க்கவே இல்ல..." } }),

  // ── 1. The orca mother ──
  L(6, "k4", "orca", "ஓர்கா அம்மாவோட குட்டி, பிறந்த அரை மணி நேரத்துல இறந்துடுச்சு.", { chapter: "அம்மா ஓர்கா", action: "sad", overlay: { kind: "title", text: "ஓர்கா அம்மா", small: "டால்பின் குடும்பத்திலேயே பெரியது" } }),
  L(7, "k4", "orca-pod", "அந்த அம்மா, பதினேழு நாள், குட்டியை தூக்கிக்கிட்டே நீந்துச்சு!", { sub: "அந்த அம்மா, 17 நாள், குட்டியை தூக்கிக்கிட்டே நீந்துச்சு!", action: "sad", overlay: { kind: "year", value: 17, suffix: " நாள்", label: "1,600 கி.மீ. தூரம்" } }),
  L(8, "k4", "orca-pod", "எந்த கதை மனசை தொட்டுச்சு? கமெண்ட்ல சொல்லுங்க, சப்ஸ்க்ரைப் பண்ணுங்க!", { host: "big", action: "please", overlay: { kind: "title", text: "கமெண்ட்ல சொல்லுங்க", small: "SUBSCRIBE பண்ணுங்க" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  anglerfish: { q: "Melanocetus johnsonii humpback anglerfish" },
  "anglerfish-pair": { q: "anglerfish Melanocetus" },
  penguin: { q: "Adelie penguin" },
  "antarctic-mountains": { q: "Antarctica mountains ice landscape" },
  orca: { q: "Orcinus orca mother and calf" },
  "orca-pod": { q: "Southern resident killer whales" },
};

export const SAD_ANIMALS: ExVideo = {
  slug: "04 Top 3 Soga Vilangugal",
  title: "Top 3 சோகமான விலங்கு கதைகள்",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "story",
  tall: true,
  countdown: true,
  chapterGap: 1.1,
  ...HOST_VOICE,
};
