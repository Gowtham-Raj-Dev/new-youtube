/**
 * "Mango, Curry, Catamaran… எல்லாமே தமிழ் வார்த்தைகளா?!" — Ulagam Ippo's tenth video.
 * English words that came from Tamil (and its sister Malayalam), how they travelled
 * (Portuguese, Dutch, British ships), two famous theories told as theories, and the
 * swap the other way (bus, ticket). New "paper" look (a notebook page, taped photos
 * flipping, the `word` card) and "bright" music. Same boy host and voice; soft
 * subscribe ask; 5+ min. Ends teasing video 11 (the Ice House on the Marina).
 *
 * Facts kept straight (checked 2026-11-20):
 * - mango: Portuguese "manga", from Malayalam māṅṅa / Tamil māṅkāy; the Portuguese
 *   reached the Kozhikode (Calicut) coast with Vasco da Gama in 1498.
 * - curry: from Tamil கறி (a spiced side dish), via Portuguese "caril" in the 1500s.
 * - mulligatawny: Tamil மிளகுத் தண்ணீர் "pepper water"; British in Madras took it home as a soup.
 * - catamaran: Tamil கட்டுமரம் "tied wood", the Coromandel fishermen's log raft; now any twin-hulled boat.
 * - coir: Malayalam kayar / Tamil கயிறு "rope", via Portuguese "cairo".
 * - betel: via Portuguese "betel", from Malayalam veṯṯila / Tamil வெற்றிலை.
 * - teak: via Portuguese "teca", from Malayalam tēkka / Tamil தேக்கு.
 * - corundum: from Tamil குருந்தம் (kuruntam, ruby); ruby and sapphire are corundum; 9 on
 *   the Mohs scale, after diamond (10). Used in sandpaper / grinding.
 * - peacock: Hebrew "tukki" (1 Kings 10:22, Solomon's ships, ~3000 years ago) — a
 *   proposed loan from Tamil தோகை (Caldwell, Klein, Shulman); disputed. Said as "some scholars".
 * - anaconda: first recorded 1693 for a Ceylon snake; theories: Tamil "ஆனை கொன்றான்"
 *   (Yule & Burnell) or Sinhala henakandaya (Ferguson). Unsettled — said as such.
 *   Anacondas themselves live in South America.
 * - Roman trade with the Tamil coast: pepper; Arikamedu near Puducherry.
 * - The British East India Company's Madras settlement: 1639.
 * - Quiz: tea from Chinese (Hokkien tê), tomato from Nahuatl tomatl (Mexico), teak from தேக்கு.
 *   Old British spellings: Tuticorin (தூத்துக்குடி), Trichinopoly (திருச்சிராப்பள்ளி).
 * Not used (weak or unclear sources): ginger, rice, orange; cheroot left out (a kid host
 * and a cigar).
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── The hook ──
  L(1, "k1", "mango", "மேங்கோ. கறி. கேட்டமரான். இதெல்லாம் இங்கிலீஷ் வார்த்தைன்னு தானே நினைக்கிறீங்க?", { host: "big", action: "think", sub: "Mango. Curry. Catamaran. இதெல்லாம் இங்கிலீஷ் வார்த்தைன்னு தானே நினைக்கிறீங்க?", overlay: { kind: "list", items: ["Mango", "Curry", "Catamaran"] } }),
  L(2, "k1", "mango", "இல்லவே இல்ல! இது எல்லாமே, நம்ம தமிழ்ல இருந்து போன வார்த்தைகள்!", { action: "excited", overlay: { kind: "stamp", text: "எல்லாமே தமிழ்!" } }),
  L(3, "k1", "ship", "கப்பல்ல ஏறி, கடல் தாண்டி, உலகம் முழுக்கப் போன, நம்ம வார்த்தைகளோட கதையை, இன்னைக்குப் பார்க்கலாம்.", { action: "point", overlay: { kind: "flow", items: ["தமிழ் வார்த்தை", "கப்பல்", "உலகம் முழுக்க"] } }),
  L(4, "k1", "ship", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். இந்த மாதிரி வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. பிடிச்சா மட்டும் போதும்!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "கட்டாயம் இல்ல" } }),

  // ── Mango ──
  L(5, "k2", "kozhikode", "ஆயிரத்து நானூத்தி தொண்ணூத்தி எட்டு. போர்த்துகீசியக் கப்பல்கள், முதல் தடவையா கேரளக் கரையில, கோழிக்கோட்டுக்கு வந்து இறங்குது.", { chapter: "மாங்காய் போன கதை", host: "corner", sub: "1498. போர்த்துகீசியக் கப்பல்கள், முதல் தடவையா கேரளக் கரையில, கோழிக்கோட்டுக்கு வந்து இறங்குது.", action: "point", overlay: { kind: "year", value: 1498, label: "போர்த்துகீசியர் வருகை" } }),
  L(6, "k2", "spices", "அவங்க தேடி வந்தது, மிளகு, ஏலக்காய் மாதிரி வாசனைப் பொருட்கள். ஆனா, இங்க ஒரு பழத்தைச் சாப்பிட்டதும், அசந்து போயிட்டாங்க!", { action: "surprised", overlay: { kind: "list", items: ["மிளகு", "ஏலக்காய்", "ஒரு பழம்?"] } }),
  L(7, "k2", "mango-tree", "அது தான் நம்ம மாங்காய்! மலையாளத்துல மாங்கா. போர்த்துகீசியர்கள் அதை, மாங்கான்னு எடுத்துக்கிட்டாங்க.", { action: "eat", overlay: { kind: "word", ta: "மாங்காய்", en: "Manga", label: ["தமிழ்", "போர்த்துகீசு"], at: 0.55 } }),
  L(8, "k2", "mango", "அப்புறம் இங்கிலீஷ்காரங்க வந்தப்போ, அந்த மாங்கா, மேங்கோ ஆயிடுச்சு! இன்னைக்கு உலகம் முழுக்க, இந்தப் பேர் தான்.", { sub: "அப்புறம் இங்கிலீஷ்காரங்க வந்தப்போ, அந்த மாங்கா, Mango ஆயிடுச்சு! இன்னைக்கு உலகம் முழுக்க, இந்தப் பேர் தான்.", action: "celebrate", overlay: { kind: "word", ta: "மாங்காய்", en: "Mango", via: "manga · போர்த்துகீசு", at: 0.35 } }),

  // ── Kitchen words ──
  L(9, "k3", "curry", "அடுத்து, சமையல் கட்டு! வெளிநாட்டுல எந்த இந்திய சாப்பாட்டைப் பார்த்தாலும், கறின்னு தான் சொல்றாங்க.", { chapter: "சமையல் கட்டு வார்த்தைகள்", sub: "அடுத்து, சமையல் கட்டு! வெளிநாட்டுல எந்த இந்திய சாப்பாட்டைப் பார்த்தாலும், Curry-ன்னு தான் சொல்றாங்க.", action: "eat", overlay: { kind: "title", text: "Curry", small: "எல்லா சாப்பாடும் கறி!" } }),
  L(10, "k3", "curry", "நம்ம ஊர்ல, கறின்னா, மசாலா போட்டு சமைச்ச ஒரு தொடுகறி. அந்த வார்த்தையை, போர்த்துகீசியர்கள் அப்படியே எடுத்துக்கிட்டுப் போனாங்க.", { action: "nod", overlay: { kind: "word", ta: "கறி", en: "Curry", via: "caril · போர்த்துகீசு", at: 0.6 } }),
  L(11, "k3", "rasam", "இதை விட சூப்பர் ஒண்ணு இருக்கு. மிளகுத் தண்ணீர். அதாவது, நம்ம ரசம் மாதிரி ஒரு காரமான தண்ணீர்.", { action: "idea", overlay: { kind: "title", text: "மிளகுத் தண்ணீர்", small: "நம்ம ரசம் மாதிரி" } }),
  L(12, "k3", "soup", "மெட்ராஸ்ல இருந்த பிரிட்டிஷ்காரங்களுக்கு, இது ரொம்பப் பிடிச்சுப் போச்சு. இங்கிலாந்துக்கே எடுத்துட்டுப் போய், அதை ஒரு சூப் ஆக்கிட்டாங்க!", { action: "surprised", overlay: { kind: "flow", items: ["மெட்ராஸ்", "இங்கிலாந்து", "சூப்!"] } }),
  L(13, "k3", "soup", "அதோட இங்கிலீஷ் பேரு, முலிகடாவ்னி. கேட்கவே காமெடியா இருக்குல்ல? ஆனா அது, நம்ம மிளகுத் தண்ணீர் தான்!", { sub: "அதோட இங்கிலீஷ் பேரு, Mulligatawny. கேட்கவே காமெடியா இருக்குல்ல? ஆனா அது, நம்ம மிளகுத் தண்ணீர் தான்!", action: "shrug", overlay: { kind: "word", ta: "மிளகுத் தண்ணீர்", en: "Mulligatawny", at: 0.25 } }),

  // ── Sea words ──
  L(14, "k4", "kattumaram", "இப்போ கடலுக்குப் போகலாம். நம்ம மீனவர்கள், மரக்கட்டைகளை கயிறால கட்டி, ஒரு படகு செய்வாங்க. அதுக்குப் பேரு, கட்டுமரம்.", { chapter: "கடல் வார்த்தைகள்", action: "point", overlay: { kind: "flow", items: ["மரம்", "கயிறால கட்டு", "கட்டுமரம்"] } }),
  L(15, "k4", "kattumaram", "சோழமண்டலக் கடற்கரையில, இதைப் பார்த்த ஐரோப்பியர்கள், கட்டுமரம்ங்கிற பேரையே எடுத்துக்கிட்டாங்க.", { action: "nod", overlay: { kind: "word", ta: "கட்டுமரம்", en: "Catamaran", at: 0.5 } }),
  L(16, "k4", "catamaran", "இன்னைக்கு உலகம் முழுக்க, ரெண்டு அடிப்பாகம் இருக்கிற வேகமான படகுகள், பெரிய பெரிய கப்பல்கள் கூட, கேட்டமரான் தான்!", { sub: "இன்னைக்கு உலகம் முழுக்க, ரெண்டு அடிப்பாகம் இருக்கிற வேகமான படகுகள், பெரிய பெரிய கப்பல்கள் கூட, Catamaran தான்!", action: "excited", overlay: { kind: "morph", from: "மீனவர் கட்டுமரம்", to: "உலக Catamaran!" } }),
  L(17, "k4", "coir", "அந்தக் கட்டுமரத்தைக் கட்டின கயிறு இருக்கே? தேங்காய் நார்ல செய்யுற அந்தக் கயிறுக்கும், இங்கிலீஷ்ல பேரு, காயர்!", { sub: "அந்தக் கட்டுமரத்தைக் கட்டின கயிறு இருக்கே? தேங்காய் நார்ல செய்யுற அந்தக் கயிறுக்கும், இங்கிலீஷ்ல பேரு, Coir!", action: "surprised", overlay: { kind: "word", ta: "கயிறு", en: "Coir", via: "kayar · மலையாளம்", at: 0.7 } }),

  // ── Shop words ──
  L(18, "k5", "betel", "கல்யாண வீட்டுல, கடைசியா கொடுக்கிற வெற்றிலை இருக்கே? அதுக்கு இங்கிலீஷ்ல பேரு, பீட்டல்.", { chapter: "கடைத் தெரு வார்த்தைகள்", sub: "கல்யாண வீட்டுல, கடைசியா கொடுக்கிற வெற்றிலை இருக்கே? அதுக்கு இங்கிலீஷ்ல பேரு, Betel.", action: "point", overlay: { kind: "word", ta: "வெற்றிலை", en: "Betel", via: "போர்த்துகீசு", at: 0.75 } }),
  L(19, "k5", "teak", "வீட்டுக் கதவு, நாற்காலி செய்யுற தேக்கு மரம்? அதுவும் போர்த்துகீசியர் வழியா போய், டீக் ஆச்சு!", { sub: "வீட்டுக் கதவு, நாற்காலி செய்யுற தேக்கு மரம்? அதுவும் போர்த்துகீசியர் வழியா போய், Teak ஆச்சு!", action: "nod", overlay: { kind: "word", ta: "தேக்கு", en: "Teak", via: "teca · போர்த்துகீசு", at: 0.7 } }),
  L(20, "k5", "ruby", "இப்போ ஒரு மாணிக்கக் கல் ரகசியம். தமிழ்ல சிவப்புக் கல்லுக்கு, குருந்தம்னு ஒரு பேர் இருக்கு.", { action: "whisper", overlay: { kind: "title", text: "குருந்தம்", small: "சிவப்புக் கல்" } }),
  L(21, "k5", "ruby", "அதுல இருந்து வந்தது தான், கொரண்டம்ங்கிற இங்கிலீஷ் வார்த்தை. வைரத்துக்கு அடுத்து, உலகத்துலயே கடினமான கல் இது தான்!", { sub: "அதுல இருந்து வந்தது தான், Corundum-ங்கிற இங்கிலீஷ் வார்த்தை. வைரத்துக்கு அடுத்து, உலகத்துலயே கடினமான கல் இது தான்!", action: "surprised", overlay: { kind: "word", ta: "குருந்தம்", en: "Corundum", small: "வைரத்துக்கு அடுத்த கடினமான கல்", at: 0.2 } }),
  L(22, "k5", "friends", "இதெல்லாம் உங்களுக்குப் புதுசா இருந்தா, ஒரு லைக் போடுங்க. தமிழ் பிடிச்ச ஒரு நண்பருக்கு, ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "நண்பருக்கு SHARE" } }),

  // ── 3000 years ago: the peacock ──
  L(23, "k6", "peacock", "இப்போ, இன்னும் பின்னாடி போகலாம். சுமார் மூவாயிரம் வருஷத்துக்கு முன்னாடி!", { chapter: "3000 வருஷ மயில் தோகை", sub: "இப்போ, இன்னும் பின்னாடி போகலாம். சுமார் 3000 வருஷத்துக்கு முன்னாடி!", action: "look-up", overlay: { kind: "year", value: 3000, suffix: " வருஷம்", label: "முன்னாடி" } }),
  L(24, "k6", "old-ship", "பைபிள்ல, சாலமன் ராஜாவோட கப்பல்கள், தங்கம், யானைத் தந்தம், குரங்குகள், அப்புறம் மயில்களைக் கொண்டு வந்ததா ஒரு குறிப்பு இருக்கு.", { action: "read", overlay: { kind: "list", items: ["தங்கம்", "யானைத் தந்தம்", "குரங்குகள்", "மயில்கள்"] } }),
  L(25, "k6", "peacock", "அந்த ஹீப்ரு மொழியில, மயிலுக்கு பேரு, துக்கி. இது நம்ம தமிழ் வார்த்தை, தோகையில இருந்து வந்ததுன்னு, சில அறிஞர்கள் சொல்றாங்க.", { action: "think", overlay: { kind: "word", ta: "தோகை", en: "Tukki", label: ["தமிழ்", "ஹீப்ரு"], at: 0.3 } }),
  L(26, "k6", "peacock", "இது இன்னும் ஒரு கருத்து தான். உறுதியா சொல்ல முடியாது. ஆனா உண்மையா இருந்தா, அவ்ளோ பழைய காலத்துலயே, தமிழ் வார்த்தை கடல் தாண்டிப் போயிருக்கு!", { action: "shrug", overlay: { kind: "stamp", text: "ஒரு கருத்து மட்டும்", small: "உறுதி இல்ல" } }),

  // ── The anaconda mystery ──
  L(27, "k7", "anaconda", "அடுத்து ஒரு மர்மம். அனகோண்டா! உலகத்துலயே பெரிய பாம்புகள்ல ஒண்ணு. அது இருக்கிறது, தென் அமெரிக்காவுல.", { chapter: "அனகோண்டா மர்மம்", sub: "அடுத்து ஒரு மர்மம். Anaconda! உலகத்துலயே பெரிய பாம்புகள்ல ஒண்ணு. அது இருக்கிறது, தென் அமெரிக்காவுல.", action: "scared", overlay: { kind: "pin", text: "தென் அமெரிக்கா", small: "அனகோண்டா வீடு" } }),
  L(28, "k7", "python", "ஆனா, அந்தப் பேரு முதல்ல, இலங்கையில இருந்த ஒரு மலைப்பாம்புக்குத் தான் வச்சாங்களாம்!", { action: "surprised", overlay: { kind: "morph", from: "தென் அமெரிக்கா?", to: "இலங்கை பாம்பு!" } }),
  L(29, "k7", "elephant", "ஒரு கருத்துப்படி, அது தமிழ்ல, ஆனை கொன்றான். அதாவது, யானையைக் கொன்றது!", { action: "roar", overlay: { kind: "word", ta: "ஆனை கொன்றான்", en: "Anaconda", small: "யானையைக் கொன்றது?", at: 0.35 } }),
  L(30, "k7", "anaconda", "இன்னொரு கருத்து, அது சிங்கள வார்த்தைன்னு சொல்லுது. இன்னைக்கு வரைக்கும், இது முடிவாகாத ஒரு மர்மம் தான்!", { action: "think", overlay: { kind: "list", items: ["தமிழ்: ஆனை கொன்றான்?", "சிங்களம்: ஒரு பாம்புப் பேர்?"] } }),

  // ── How words travel ──
  L(31, "k8", "spices", "சரி, இந்த வார்த்தைகள் எல்லாம் எப்படி இவ்ளோ தூரம் போச்சு? ஒரே பதில். வியாபாரம்!", { chapter: "வார்த்தைகள் எப்படிப் போச்சு?", action: "idea", overlay: { kind: "title", text: "வியாபாரம்!" } }),
  L(32, "k8", "roman-coins", "ரெண்டாயிரம் வருஷத்துக்கு முன்னாடியே, ரோமானியர்கள் நம்ம கடற்கரைக்கு வந்து, மிளகு வாங்கினாங்க. புதுச்சேரி பக்கத்துல, அரிக்கமேடுல, அவங்க விட்டுட்டுப் போன பொருட்கள் கிடைச்சிருக்கு.", { sub: "2000 வருஷத்துக்கு முன்னாடியே, ரோமானியர்கள் நம்ம கடற்கரைக்கு வந்து, மிளகு வாங்கினாங்க. புதுச்சேரி பக்கத்துல, அரிக்கமேடுல, அவங்க விட்டுட்டுப் போன பொருட்கள் கிடைச்சிருக்கு.", action: "point", overlay: { kind: "pin", text: "அரிக்கமேடு", small: "ரோம் வியாபாரம்" } }),
  L(33, "k8", "fort", "அப்புறம் போர்த்துகீசியர், டச்சுக்காரங்க, பிரிட்டிஷ்காரங்க. ஆயிரத்து அறுநூத்தி முப்பத்தி ஒம்பதுல, மெட்ராஸ்லயே பிரிட்டிஷ் கம்பெனி வந்து உட்கார்ந்துடுச்சு.", { sub: "அப்புறம் போர்த்துகீசியர், டச்சுக்காரங்க, பிரிட்டிஷ்காரங்க. 1639-ல, மெட்ராஸ்லயே பிரிட்டிஷ் கம்பெனி வந்து உட்கார்ந்துடுச்சு.", action: "count", overlay: { kind: "flow", items: ["போர்த்துகீசு", "டச்சு", "பிரிட்டிஷ்"] } }),
  L(34, "k8", "market", "பொருள் வாங்கும் போது, அதோட பேரையும் சேர்த்து வாங்கிட்டுப் போனாங்க. அப்படித் தான், நம்ம வார்த்தைகள் உலகம் சுத்துச்சு!", { action: "nod", overlay: { kind: "morph", from: "பொருள் மட்டும்", to: "பொருள் + பேரு!" } }),
  L(35, "k8", "bus", "ஆனா ஒரு ட்விஸ்ட்! இப்போ நாம, பஸ், டிக்கெட், போன்னு, தினமும் இங்கிலீஷ் வார்த்தைகளை பேசுறோம்.", { sub: "ஆனா ஒரு ட்விஸ்ட்! இப்போ நாம, Bus, Ticket, Phone-ன்னு, தினமும் இங்கிலீஷ் வார்த்தைகளை பேசுறோம்.", action: "surprised", overlay: { kind: "list", items: ["Bus", "Ticket", "Phone"] } }),
  L(36, "k8", "bus", "அப்போ கணக்கு சரியாப் போச்சு! மொழிகள், ஒண்ணுக்கொண்ணு கொடுத்து வாங்கித் தான் வளருது.", { action: "proud", overlay: { kind: "flow", items: ["தமிழ்", "கொடுத்து வாங்கல்", "இங்கிலீஷ்"] } }),

  // ── A little quiz (added for length, its own take) ──
  L(41, "k10", "tea", "சரி, இப்போ ஒரு சின்ன க்விஸ்! இந்த மூணு இங்கிலீஷ் வார்த்தைகள்ல, எது தமிழ்ல இருந்து வந்தது?", { chapter: "ஒரு சின்ன க்விஸ்!", action: "think", overlay: { kind: "list", items: ["Tea", "Tomato", "Teak"] } }),
  L(42, "k10", "tea", "டீ? டொமேட்டோ? இல்ல டீக்? யோசிங்க! பதில் தெரிஞ்சா, கமெண்ட்லயும் போடுங்க.", { sub: "Tea? Tomato? இல்ல Teak? யோசிங்க! பதில் தெரிஞ்சா, கமெண்ட்லயும் போடுங்க.", action: "count", overlay: { kind: "type", text: "யோசிங்க..." } }),
  L(43, "k10", "tomato", "டீ, சீனாவுல இருந்து வந்த வார்த்தை. டொமேட்டோ, மெக்சிகோ பக்கத்து பழைய மொழியில இருந்து வந்தது.", { sub: "Tea, சீனாவுல இருந்து வந்த வார்த்தை. Tomato, மெக்சிகோ பக்கத்து பழைய மொழியில இருந்து வந்தது.", action: "shrug", overlay: { kind: "list", items: ["Tea: சீனா", "Tomato: மெக்சிகோ"] } }),
  L(44, "k10", "teak", "சரியான பதில், டீக்! நம்ம தேக்கு தான். கொஞ்சம் முன்னாடி தான் சொன்னேன், ஞாபகம் இருக்கா?", { sub: "சரியான பதில், Teak! நம்ம தேக்கு தான். கொஞ்சம் முன்னாடி தான் சொன்னேன், ஞாபகம் இருக்கா?", action: "celebrate", overlay: { kind: "stamp", text: "Teak = தேக்கு!" } }),
  L(45, "k10", "tuticorin", "இன்னொரு ஆச்சரியம். பழைய இங்கிலீஷ் மேப்ல, நம்ம ஊர் பேருங்களே மாறிப் போயிருக்கு. தூத்துக்குடி, டூட்டிகொரின் ஆச்சு!", { sub: "இன்னொரு ஆச்சரியம். பழைய இங்கிலீஷ் மேப்ல, நம்ம ஊர் பேருங்களே மாறிப் போயிருக்கு. தூத்துக்குடி, Tuticorin ஆச்சு!", action: "surprised", overlay: { kind: "word", ta: "தூத்துக்குடி", en: "Tuticorin", label: ["நம்ம பேரு", "அவங்க பேரு"], at: 0.7 } }),
  L(46, "k10", "trichy", "திருச்சிராப்பள்ளி, டிரிச்சினாபொலி ஆச்சு! நம்ம வாயில வந்த பேரு, அவங்க வாயில வேற மாதிரி ஆயிடுச்சு. மாங்காய், மேங்கோ ஆன மாதிரியே!", { sub: "திருச்சிராப்பள்ளி, Trichinopoly ஆச்சு! நம்ம வாயில வந்த பேரு, அவங்க வாயில வேற மாதிரி ஆயிடுச்சு. மாங்காய், Mango ஆன மாதிரியே!", action: "nod", overlay: { kind: "word", ta: "திருச்சிராப்பள்ளி", en: "Trichinopoly", label: ["நம்ம பேரு", "அவங்க பேரு"], at: 0.2 } }),

  // ── Goodbye ──
  L(37, "k9", "mango", "அடுத்த தடவை, மேங்கோ ஜூஸ் குடிக்கும் போது, ஞாபகம் வச்சுக்கோங்க. அந்தப் பேருக்குள்ள, நம்ம தமிழ் இருக்கு!", { chapter: "கடைசியா ஒரு விஷயம்", host: "big", sub: "அடுத்த தடவை, Mango ஜூஸ் குடிக்கும் போது, ஞாபகம் வச்சுக்கோங்க. அந்தப் பேருக்குள்ள, நம்ம தமிழ் இருக்கு!", action: "proud", overlay: { kind: "title", text: "பேருக்குள்ள தமிழ்!" } }),
  L(38, "k9", "kattumaram", "இன்னும் எந்த இங்கிலீஷ் வார்த்தை, தமிழ்ல இருந்து வந்ததுன்னு உங்களுக்குத் தெரியும்? கமெண்ட்ல சொல்லுங்க!", { action: "think", overlay: { kind: "type", text: "உங்களுக்குத் தெரிஞ்ச வார்த்தை?" } }),
  L(39, "k9", "marina", "அடுத்த வீடியோல, சென்னை பீச்ல இருக்கிற ஒரு பழைய கட்டடத்தோட, யாருக்கும் தெரியாத கதை. வேற எதைப் பத்தி பேசலாம்னும் கமெண்ட்ல சொல்லுங்க.", { action: "whisper", overlay: { kind: "title", text: "அடுத்தது: மெரினா ரகசியம்", small: "COMMENT பண்ணுங்க" } }),
  L(40, "k9", "marina", "வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. பை பை! டாட்டா!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "டாட்டா!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. Objects over faces. */
const IMAGES: ExVideo["images"] = {
  mango: { q: "mangoes fruit basket" },
  "mango-tree": { q: "mango tree with fruits" },
  ship: { q: "Portuguese carrack ship painting" },
  kozhikode: { q: "Kappad beach Kozhikode" },
  spices: { q: "black pepper spice" },
  curry: { q: "South Indian meals banana leaf" },
  rasam: { q: "rasam" },
  soup: { q: "mulligatawny soup" },
  kattumaram: { q: "kattumaram" },
  catamaran: { q: "catamaran ferry" },
  coir: { q: "coir rope" },
  betel: { q: "betel leaves" },
  teak: { q: "teak wood" },
  ruby: { q: "corundum ruby crystal" },
  friends: { q: "Tamil books" },
  peacock: { q: "Indian peacock feathers display" },
  "old-ship": { q: "Phoenician war galley relief", file: "File:Relief depicting thin gypsum wall panel shows a Phoenician war galley sailing down the Euphrates River.jpg" },
  anaconda: { q: "green anaconda" },
  python: { q: "Python molurus", file: "File:Python molurus molurus 2.jpg" },
  elephant: { q: "Sri Lankan elephant" },
  "roman-coins": { q: "Roman coins found in India" },
  fort: { q: "Fort St. George Chennai", file: "File:Fort St. George, Chennai, India (14409686273).jpg" },
  market: { q: "spice market India" },
  bus: { q: "Tamil Nadu government bus" },
  marina: { q: "Marina Beach Chennai", file: "File:Chennai Marina beach panorama1.jpg" },
  tea: { q: "tea leaves cup" },
  tomato: { q: "tomatoes" },
  tuticorin: { q: "Thoothukudi beach sea" },
  trichy: { q: "Rockfort Tiruchirappalli" },
};

export const TAMIL_WORDS: ExVideo = {
  slug: "10 English-la Tamil Vaarthaigal",
  title: "Mango, Curry, Catamaran… எல்லாமே தமிழ் வார்த்தைகளா?!",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "paper",
  music: "bright",
  thumb: {
    visual: "mango",
    lines: [
      { text: "MANGO · CURRY", size: 120, fill: "#FFB627" },
      { text: "எல்லாமே", size: 150, fill: "#F7F7F2" },
      { text: "தமிழ்!", size: 190, fill: "#FF6B6B" },
    ],
  },
  ...HOST_VOICE,
};
