/**
 * "மெரினாவுல ஒரு ஐஸ் குடோன்! அமெரிக்காவுல இருந்து கப்பல்ல வந்த ஐஸ்" — Ulagam Ippo's
 * eleventh video: the Ice House on the Marina (today Vivekanandar Illam) and the
 * Boston ice trade that built it. New "frost" look (frosted window, melting picture
 * changes, chapters frozen in a block of ice) and "voyage" music (6/8 sea song).
 * Same boy host and voice; soft subscribe ask; 5+ min.
 *
 * Facts kept straight (checked 2026-11-20):
 * - Frederic Tudor of Boston, the "Ice King", shipped New England pond ice round the
 *   world; jailed for debt in his early, failing years (1810s).
 * - Ice was cut from frozen ponds in winter (saws, horse-drawn ice ploughs) and packed
 *   in sawdust / wood shavings (about 2 ft for the India run).
 * - The Tuscany left Boston 12 May 1833 with ~180 tons and reached Calcutta ~6 Sep 1833
 *   (about 4 months) with ~100 tons left. Round Africa's Cape of Good Hope.
 * - Thoreau, Walden (1854): "the sweltering inhabitants of Charleston and New Orleans, of
 *   Madras and Bombay and Calcutta, drink at my well" — Walden Pond ice went to India.
 * - The Madras Ice House was built in 1842 by Tudor's business, on the Marina, to store
 *   the ice. Madras had no proper harbour then: ships anchored offshore, masula boats
 *   carried cargo through the surf.
 * - Machine-made ice ended the trade; around 1880 the building was sold to Biligiri
 *   Iyengar, who renamed it Castle Kernan (after Justice Kernan).
 * - Swami Vivekananda stayed there 6–15 Feb 1897 on his return from the West (Chicago
 *   Parliament of Religions, 1893).
 * - Named Vivekanandar Illam in 1963; leased to the Ramakrishna Math in 1997 for a
 *   permanent exhibition.
 * Not used: an unverified widows'-home story; exact ice prices.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── The hook ──
  L(1, "k1", "ice-house", "சென்னை மெரினா பீச். இந்த வெள்ளைக் கட்டடத்தை, நீங்க பார்த்திருப்பீங்க.", { host: "big", action: "point", overlay: { kind: "pin", text: "மெரினா பீச்", small: "சென்னை" } }),
  L(2, "k1", "ice-house", "இன்னைக்கு இதுக்குப் பேரு, விவேகானந்தர் இல்லம். ஆனா, நூத்தி எண்பது வருஷத்துக்கு முன்னாடி, இது ஒரு ஐஸ் குடோன்!", { sub: "இன்னைக்கு இதுக்குப் பேரு, விவேகானந்தர் இல்லம். ஆனா, 180 வருஷத்துக்கு முன்னாடி, இது ஒரு ஐஸ் குடோன்!", action: "surprised", overlay: { kind: "morph", from: "விவேகானந்தர் இல்லம்", to: "ஐஸ் குடோன்!" } }),
  L(3, "k1", "ice-blocks", "அந்த ஐஸ் எங்க இருந்து வந்தது தெரியுமா? அமெரிக்காவுல இருந்து! கப்பல்ல! நாலு மாசப் பயணம்!", { action: "excited", overlay: { kind: "flow", items: ["அமெரிக்கா", "4 மாசம் கப்பல்", "மெட்ராஸ்"] } }),
  L(4, "k1", "matka", "ஃப்ரிட்ஜ் இல்ல, கரண்ட் இல்ல. அப்படி ஒரு காலத்துல, இது எப்படி நடந்தது? வாங்க, பார்க்கலாம்.", { action: "think", overlay: { kind: "type", text: "இது எப்படி நடந்தது?" } }),
  L(5, "k1", "ice-house", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். இந்த மாதிரி வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. பிடிச்சா மட்டும் போதும்!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "கட்டாயம் இல்ல" } }),

  // ── Madras without ice ──
  L(6, "k2", "old-madras", "ஆயிரத்து எண்ணூறுகள்ல, மெட்ராஸ். வெயில் கொளுத்துது. ஃபேன் இல்ல, ஃப்ரிட்ஜ் இல்ல.", { chapter: "ஐஸ் இல்லாத மெட்ராஸ்", host: "corner", sub: "1800-கள்ல, மெட்ராஸ். வெயில் கொளுத்துது. ஃபேன் இல்ல, ஃப்ரிட்ஜ் இல்ல.", action: "sad", overlay: { kind: "list", items: ["ஃபேன் இல்ல", "ஃப்ரிட்ஜ் இல்ல", "கரண்டே இல்ல"] } }),
  L(7, "k2", "matka", "தண்ணியைக் குளிர வைக்க, மண் பானை தான் ஒரே வழி. ஆனா, ஜில்லுன்னு ஐஸ் போட்ட ஒரு டிரிங்க்? அது ஒரு கனவு!", { action: "shrug", overlay: { kind: "morph", from: "மண் பானைத் தண்ணி", to: "ஐஸ் டிரிங்க்? கனவு!" } }),
  L(8, "k2", "old-madras", "இங்க இருந்த பிரிட்டிஷ்காரங்க, இந்த வெயில் தாங்க முடியாம, தவிச்சாங்க. ஐஸ் கிடைச்சா, எவ்ளோ காசு வேணும்னாலும் தரத் தயார்!", { action: "please", overlay: { kind: "meter", label: "வெயில்", from: 0.5, to: 0.98, small: "தாங்கவே முடியல!" } }),
  L(9, "k2", "ice-blocks", "ஆனா, நம்ம ஊர்ல பனியே பெய்யாது. அப்போ ஐஸ், எங்க இருந்து கிடைக்கும்?", { action: "think", overlay: { kind: "title", text: "ஐஸ் எங்க கிடைக்கும்?" } }),

  // ── The Ice King ──
  L(10, "k3", "frozen-pond", "அதே நேரத்துல, அமெரிக்காவுல, பாஸ்டன் நகரம். குளிர் காலத்துல, அங்க இருக்கிற குளங்கள் எல்லாம், ஐஸ் கட்டியா உறைஞ்சு போயிடும்.", { chapter: "பனிக்கட்டி ராஜா", action: "point", overlay: { kind: "pin", text: "பாஸ்டன், அமெரிக்கா", small: "உறைஞ்ச குளங்கள்" } }),
  L(11, "k3", "tudor", "அங்க, ஃப்ரெட்ரிக் டியூடர்ங்கிற ஒருத்தருக்கு, ஒரு வித்தியாசமான ஐடியா வந்தது. இந்த ஐஸை வெட்டி, சூடான நாடுகளுக்குக் கப்பல்ல அனுப்பி விக்கலாம்!", { action: "idea", overlay: { kind: "title", text: "ஃப்ரெட்ரிக் டியூடர்", small: "ஐஸ் வியாபாரி" } }),
  L(12, "k3", "tudor", "எல்லாரும் சிரிச்சாங்க. ஐஸை கப்பல்ல அனுப்புனா, தண்ணியா தான் போய் சேரும்னு! ஆரம்பத்துல நஷ்டம் மேல நஷ்டம். கடன் கட்ட முடியாம, ஜெயிலுக்குக் கூட போனாரு.", { action: "sad", overlay: { kind: "list", items: ["எல்லாரும் சிரிச்சாங்க", "நஷ்டம்", "ஜெயில்!"] } }),
  L(13, "k3", "tudor", "ஆனா, அவர் விடவே இல்ல. கடைசியில, உலகமே அவரை, ஐஸ் ராஜான்னு கூப்பிட்டது!", { action: "crown", overlay: { kind: "stamp", text: "ஐஸ் ராஜா!" } }),

  // ── Cutting the ice ──
  L(14, "k4", "ice-harvest", "குளிர் காலத்துல, உறைஞ்ச குளத்து மேல, ஆட்களும் குதிரைகளும் இறங்குவாங்க. பெரிய ரம்பத்தால, ஐஸை சதுரம் சதுரமா வெட்டுவாங்க.", { chapter: "குளத்துல ஐஸ் அறுவடை", action: "chisel", overlay: { kind: "flow", items: ["உறைஞ்ச குளம்", "ரம்பம்", "ஐஸ் கட்டிகள்"] } }),
  L(15, "k4", "ice-harvest", "ஒவ்வொரு கட்டியும், நம்ம அளவு பெரிசு! அதை அடுக்கி, பெரிய ஐஸ் வீடுகள்ல, சேர்த்து வைப்பாங்க.", { action: "surprised", overlay: { kind: "title", text: "நம்ம அளவு ஐஸ் கட்டி!" } }),
  L(16, "k4", "walden", "இன்னொரு ஆச்சரியம். அமெரிக்காவோட பிரபல எழுத்தாளர், தோரோ, வால்டன்ங்கிற குளத்துப் பக்கத்துல வாழ்ந்தாரு. அவர் குளத்து ஐஸும், இப்படி வெட்டி அனுப்பப்பட்டது.", { action: "point", overlay: { kind: "pin", text: "வால்டன் குளம்", small: "எழுத்தாளர் தோரோ" } }),
  L(17, "k4", "walden", "அவர் தன் புத்தகத்துல எழுதினாரு. மெட்ராஸ், பம்பாய், கல்கத்தா மக்கள், என் குளத்துத் தண்ணியைக் குடிக்கிறாங்க!", { action: "read", overlay: { kind: "list", items: ["மெட்ராஸ்", "பம்பாய்", "கல்கத்தா"] } }),
  L(18, "k4", "book", "யோசிச்சுப் பாருங்க. அமெரிக்காவோட ஒரு புகழ் பெற்ற புத்தகத்துல, நம்ம மெட்ராஸ் பேரு இருக்கு!", { action: "proud", overlay: { kind: "stamp", text: "புத்தகத்துல மெட்ராஸ்!" } }),

  // ── Four months at sea ──
  L(19, "k5", "clipper", "இப்போ பெரிய சவால். ஐஸ், உருகாம, நாலு மாசம் கடல்ல எப்படிப் போகும்?", { chapter: "நாலு மாசக் கடல் பயணம்", action: "think", overlay: { kind: "title", text: "உருகாம எப்படி?" } }),
  L(20, "k5", "sawdust", "ரகசியம், மரத்தூள்! ஐஸ் கட்டிகளை நெருக்கமா அடுக்கி, சுத்தியும் ரெண்டு அடி அளவுக்கு, மரத்தூள் போட்டு மூடுவாங்க. அது வெப்பத்தை உள்ள விடாது.", { action: "idea", overlay: { kind: "flow", items: ["ஐஸ் கட்டி", "மரத்தூள்", "உருகாது!"] } }),
  L(21, "k5", "cape", "கப்பல், அட்லாண்டிக் கடலைத் தாண்டி, ஆப்பிரிக்காவைச் சுத்தி, இந்தியப் பெருங்கடலுக்கு வரும். ரெண்டு தடவை, பூமத்திய ரேகையைக் கடக்கணும்!", { action: "point", overlay: { kind: "flow", items: ["பாஸ்டன்", "ஆப்பிரிக்கா", "இந்தியா"] } }),
  L(22, "k5", "clipper", "ஆயிரத்து எண்ணூத்தி முப்பத்தி மூணு. முதல் கப்பல், நூத்தி எண்பது டன் ஐஸோட கிளம்புச்சு.", { sub: "1833. முதல் கப்பல், 180 டன் ஐஸோட கிளம்புச்சு.", action: "count", overlay: { kind: "year", value: 180, suffix: " டன்", label: "கிளம்பும் போது" } }),
  L(23, "k5", "clipper", "நாலு மாசம் கழிச்சு, கல்கத்தா போய்ச் சேர்ந்தப்போ, கிட்டத்தட்ட நூறு டன் ஐஸ், உருகாம அப்படியே இருந்தது! மக்கள் ஆச்சரியப்பட்டுப் போயிட்டாங்க.", { sub: "4 மாசம் கழிச்சு, கல்கத்தா போய்ச் சேர்ந்தப்போ, கிட்டத்தட்ட 100 டன் ஐஸ், உருகாம அப்படியே இருந்தது! மக்கள் ஆச்சரியப்பட்டுப் போயிட்டாங்க.", action: "celebrate", overlay: { kind: "year", value: 100, suffix: " டன்", label: "சேர்ந்த போது, மீதி" } }),
  L(24, "k5", "friends", "இதெல்லாம் உங்களுக்குப் புதுசா இருந்தா, ஒரு லைக் போடுங்க. சென்னையை லவ் பண்ற ஒரு நண்பருக்கு, ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "நண்பருக்கு SHARE" } }),

  // ── The ice house on the Marina ──
  L(25, "k6", "masula", "கொஞ்ச வருஷத்துல, மெட்ராஸுக்கும் ஐஸ் கப்பல்கள் வர ஆரம்பிச்சது. ஆனா அப்போ, மெட்ராஸ்ல ஒழுங்கான துறைமுகமே இல்ல!", { chapter: "மெரினாவுல ஒரு ஐஸ் வீடு", action: "surprised", overlay: { kind: "title", text: "துறைமுகமே இல்ல!" } }),
  L(26, "k6", "masula", "கப்பல் கடல்லயே நின்னுடும். அலைகளுக்கு நடுவுல, மசூலா படகுகள்ல, ஐஸ் கட்டிகள் கரைக்கு வரும்.", { action: "point", overlay: { kind: "flow", items: ["கப்பல்", "மசூலா படகு", "கரை"] } }),
  L(27, "k6", "ice-house", "அந்த ஐஸை சேமிக்க, ஆயிரத்து எண்ணூத்தி நாப்பத்தி ரெண்டுல, கடற்கரை ஓரமா, இந்தக் கட்டடத்தைக் கட்டினாங்க.", { sub: "அந்த ஐஸை சேமிக்க, 1842-ல, கடற்கரை ஓரமா, இந்தக் கட்டடத்தைக் கட்டினாங்க.", action: "proud", overlay: { kind: "year", value: 1842, label: "ஐஸ் ஹவுஸ் கட்டினது" } }),
  L(28, "k6", "ice-house", "தடிமனான சுவர்கள், ஜன்னல்கள் கம்மி. வெளியே வெயில் கொளுத்தினாலும், உள்ள குளுகுளுன்னு இருக்கும். மக்கள் இதை, ஐஸ் ஹவுஸ்னு கூப்பிட்டாங்க.", { action: "nod", overlay: { kind: "list", items: ["தடிமனான சுவர்", "ஜன்னல் கம்மி", "உள்ள குளுகுளு"] } }),
  L(29, "k6", "iced-drink", "பணக்காரங்களும், அதிகாரிகளும் இங்க ஐஸ் வாங்கினாங்க. ஜில்லுன்னு டிரிங்க்ஸ், சாப்பாட்டைக் கெடாம வைக்க, காய்ச்சல் வந்தவங்களுக்குக் கூட.", { action: "eat", overlay: { kind: "list", items: ["ஜில் டிரிங்க்ஸ்", "சாப்பாடு கெடாம", "காய்ச்சலுக்கு"] } }),
  L(30, "k6", "iced-drink", "ஆனா விலை ரொம்ப அதிகம். சாதாரண மக்களுக்கு, ஐஸ் ஒரு கனவாவே இருந்தது.", { action: "sad", overlay: { kind: "morph", from: "எல்லாருக்கும் ஐஸ்?", to: "பணக்காரங்களுக்கு மட்டும்!" } }),

  // ── The ice melts away ──
  L(31, "k7", "ice-machine", "அப்புறம் ஒரு பெரிய மாற்றம். மெஷின்லயே ஐஸ் செய்யலாம்னு, கண்டுபிடிச்சாங்க!", { chapter: "ஐஸ் கதை முடிஞ்சது", action: "idea", overlay: { kind: "title", text: "மெஷின் ஐஸ்!" } }),
  L(32, "k7", "ice-machine", "நம்ம ஊர்லயே ஐஸ் தொழிற்சாலைகள் வந்ததும், நாலு மாசம் கப்பல்ல ஐஸ் கொண்டு வர, யாருக்கும் அவசியமே இல்லாம போச்சு.", { action: "shrug", overlay: { kind: "morph", from: "4 மாசக் கப்பல் ஐஸ்", to: "பக்கத்து ஃபேக்டரி ஐஸ்" } }),
  L(33, "k7", "ice-house", "ஆயிரத்து எண்ணூத்தி எண்பது வாக்குல, அந்த வியாபாரமே முடிஞ்சு போச்சு. ஐஸ் ஹவுஸ், காலியா நின்னுச்சு.", { sub: "1880 வாக்குல, அந்த வியாபாரமே முடிஞ்சு போச்சு. ஐஸ் ஹவுஸ், காலியா நின்னுச்சு.", action: "sad", overlay: { kind: "year", value: 1880, label: "வியாபாரம் முடிஞ்சது" } }),
  L(34, "k7", "castle", "அப்போ, பிலிகிரி ஐயங்கார்ங்கிற ஒருத்தர், இந்தக் கட்டடத்தை வாங்கினாரு. ஒரு நீதிபதியோட பேர்ல, இதுக்கு, கேஸில் கெர்னன்னு பேரு வச்சாரு.", { sub: "அப்போ, பிலிகிரி ஐயங்கார்ங்கிற ஒருத்தர், இந்தக் கட்டடத்தை வாங்கினாரு. ஒரு நீதிபதியோட பேர்ல, இதுக்கு, Castle Kernan-னு பேரு வச்சாரு.", action: "point", overlay: { kind: "morph", from: "ஐஸ் ஹவுஸ்", to: "Castle Kernan" } }),

  // ── Vivekananda comes ──
  L(35, "k8", "chicago", "இப்போ கதையில ஒரு பெரிய ட்விஸ்ட்! ஆயிரத்து எண்ணூத்தி தொண்ணூத்தி மூணுல, அமெரிக்காவுல, சிகாகோ மேடையில, ஒரு இந்தியர் பேசின பேச்சு, உலகத்தையே திரும்பிப் பார்க்க வச்சது.", { chapter: "விவேகானந்தர் வந்தாரு", sub: "இப்போ கதையில ஒரு பெரிய ட்விஸ்ட்! 1893-ல, அமெரிக்காவுல, சிகாகோ மேடையில, ஒரு இந்தியர் பேசின பேச்சு, உலகத்தையே திரும்பிப் பார்க்க வச்சது.", action: "surprised", overlay: { kind: "pin", text: "சிகாகோ, 1893", small: "உலக மத மாநாடு" } }),
  L(36, "k8", "vivekananda", "அவர் தான், சுவாமி விவேகானந்தர்! பல வருஷம் கழிச்சு, அவர் இந்தியா திரும்பி வந்தாரு.", { action: "proud", overlay: { kind: "title", text: "சுவாமி விவேகானந்தர்" } }),
  L(37, "k8", "ice-house", "ஆயிரத்து எண்ணூத்தி தொண்ணூத்தி ஏழு, பிப்ரவரி. மெட்ராஸுக்கு வந்தப்போ, அவர் ஒன்பது நாள் தங்கினது, இதே கட்டடத்துல தான்!", { sub: "1897, பிப்ரவரி. மெட்ராஸுக்கு வந்தப்போ, அவர் 9 நாள் தங்கினது, இதே கட்டடத்துல தான்!", action: "excited", overlay: { kind: "year", value: 9, suffix: " நாள்", label: "1897-ல இங்க தங்கினாரு" } }),
  L(38, "k8", "ice-blocks", "யோசிங்க. அமெரிக்காவுல இருந்து வந்த ஐஸுக்காகக் கட்டின வீட்டுல, அமெரிக்காவுல இருந்து திரும்பி வந்தவர் தங்கினாரு!", { action: "think", overlay: { kind: "flow", items: ["அமெரிக்க ஐஸ்", "இதே வீடு", "அமெரிக்காவுல இருந்து விவேகானந்தர்"] } }),
  L(39, "k8", "ice-house", "அதனால தான், ஆயிரத்து தொளாயிரத்து அறுபத்தி மூணுல, இதுக்கு, விவேகானந்தர் இல்லம்னு பேரு வச்சாங்க.", { sub: "அதனால தான், 1963-ல, இதுக்கு, விவேகானந்தர் இல்லம்னு பேரு வச்சாங்க.", action: "nod", overlay: { kind: "morph", from: "Castle Kernan", to: "விவேகானந்தர் இல்லம்" } }),

  // ── Today ──
  L(40, "k9", "museum", "இன்னைக்கு அங்க, அவரோட வாழ்க்கையைப் பத்தி, ஒரு கண்காட்சி இருக்கு. யார் வேணும்னாலும் போய்ப் பார்க்கலாம்.", { chapter: "இன்னைக்கு", action: "point", overlay: { kind: "pin", text: "விவேகானந்தர் இல்லம்", small: "இன்னைக்கு ஒரு கண்காட்சி" } }),
  L(41, "k9", "timeline", "ஒரே கட்டடம். ஐஸ் குடோன், அப்புறம் ஒரு பெரியவரோட வீடு, இப்போ விவேகானந்தர் இல்லம்.", { action: "count", overlay: { kind: "flow", items: ["ஐஸ் குடோன்", "Castle Kernan", "விவேகானந்தர் இல்லம்"] } }),
  L(42, "k9", "fridge", "இன்னைக்கு நம்ம வீட்டு ஃப்ரிட்ஜ்லயே, ஐஸ் சும்மா கிடைக்குது. ஆனா ஒரு காலத்துல, அது நாலு மாசம், கடல் தாண்டி வந்த, ஒரு பொக்கிஷம்!", { action: "proud", overlay: { kind: "morph", from: "ஃப்ரிட்ஜ் ஐஸ்", to: "கடல் தாண்டின பொக்கிஷம்!" } }),
  L(43, "k9", "marina", "அடுத்த தடவை, மெரினா போனா, அந்தக் கட்டடத்தைப் பார்த்து, இந்தக் கதையை, கூட வர்றவங்களுக்குச் சொல்லுங்க!", { action: "share", overlay: { kind: "title", text: "மெரினா போனா சொல்லுங்க!" } }),

  // ── Goodbye ──
  L(44, "k10", "marina", "சென்னையில, இந்த மாதிரி கதை இருக்கிற, வேற எந்தக் கட்டடம் உங்களுக்குத் தெரியும்? கமெண்ட்ல சொல்லுங்க!", { chapter: "டாட்டா!", host: "big", action: "think", overlay: { kind: "type", text: "உங்க ஊர் கட்டடக் கதை?" } }),
  L(45, "k10", "ice-house", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்னும் சொல்லுங்க. வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க.", { action: "nod", overlay: { kind: "title", text: "அடுத்த வீடியோ? COMMENT", small: "பிடிச்சா SUBSCRIBE" } }),
  L(46, "k10", "ice-blocks", "ஜில்லுன்னு ஒரு டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "ஜில்லுன்னு டாட்டா!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. Objects over faces. */
const IMAGES: ExVideo["images"] = {
  "ice-house": { q: "Vivekanandar Illam Chennai" },
  "ice-blocks": { q: "ice blocks" },
  "old-madras": { q: "Madras Fort St George painting", file: "File:William Daniell - Madras, or Fort St. George, in the Bay of Bengal -- A Squall Passing Off - Google Art Project.jpg" },
  matka: { q: "clay water pot India" },
  "frozen-pond": { q: "frozen pond Massachusetts winter" },
  tudor: { q: "Frederic Tudor" },
  "ice-harvest": { q: "ice harvesting", file: "File:NSRW Ice Harvesting - sawing.jpg" },
  walden: { q: "Walden Pond" },
  book: { q: "Walden Thoreau title page" },
  clipper: { q: "East Indiaman ship painting", file: "File:Portrait of the East Indiaman Neptune in two positions off the Downs.jpg" },
  sawdust: { q: "sawdust wood shavings" },
  cape: { q: "Cape of Good Hope painting", file: "File:Thomas Whitcombe - View of Cape Town, Table Bay, Cape of Good Hope.jpg" },
  friends: { q: "Chennai Marina lighthouse" },
  masula: { q: "Masula boat Madras" },
  "iced-drink": { q: "glass of water with ice cubes" },
  "ice-machine": { q: "ice factory" },
  castle: { q: "Vivekanandar Illam" },
  chicago: { q: "World's Parliament of Religions 1893" },
  vivekananda: { q: "Swami Vivekananda 1893", file: "File:Swami Vivekananda 1893 Scanned Image.jpg" },
  museum: { q: "Vivekanandar Illam museum" },
  timeline: { q: "Vivekanandar Illam front" },
  fridge: { q: "ice cube tray freezer" },
  marina: { q: "Marina Beach Chennai", file: "File:Chennai Marina beach panorama1.jpg" },
};

export const ICE_HOUSE: ExVideo = {
  slug: "11 Marina Ice House",
  title: "மெரினாவுல ஒரு ஐஸ் குடோன்! அமெரிக்காவுல இருந்து கப்பல்ல வந்த ஐஸ்",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "frost",
  music: "voyage",
  thumb: {
    visual: "ice-house",
    lines: [
      { text: "மெரினாவுல", size: 120, fill: "#F7F7F2" },
      { text: "ஐஸ் குடோன்!", size: 170, fill: "#8FE3FF" },
      { text: "அமெரிக்காவுல இருந்து!", size: 96, fill: "#FF8A3D" },
    ],
  },
  ...HOST_VOICE,
};
