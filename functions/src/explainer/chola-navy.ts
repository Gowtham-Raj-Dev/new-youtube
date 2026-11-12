/**
 * "சோழர் கப்பல் படை: இந்தோனேசியா, மலேசியா வரை!" — Ulagam Ippo's third video,
 * the same boy host and voice, in the new story look (serif Tamil headings,
 * gold-on-navy glass panels, fades instead of pops; user, 2026-11-06).
 *
 * Facts kept straight: Rajaraja I (985–1014) built the navy — Kandalur Salai,
 * northern Sri Lanka, the Maldives ("முந்நீர்ப் பழந்தீவு பன்னீராயிரம்"). The 1025
 * Srivijaya expedition (Kadaram/Kedah, Srivijaya/Palembang, Ilangasogam,
 * Mayirudingam, Ilamuridesam, Manakkavaram/Nicobar; king Sangrama
 * Vijayottungavarman taken, the jewelled Vidyadhara gate) was led by his son
 * Rajendra I (1014–1044), per his Tanjore inscription. Before that the two were
 * friends: the Srivijaya king built the Chudamani Vihara at Nagapattinam and
 * Rajaraja granted it a village (Larger Leiden plates). A raid, not a long rule.
 * Chola embassies are in Song Chinese records; the Lobu Tua (Barus, Sumatra)
 * Tamil inscription of the Ainnurruvar guild is dated 1088.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── Intro: the host big on screen ──
  L(1, "k1", "monsoon", "ஹாய் நண்பர்களே! வணக்கம்! உலகம் இப்போ சேனலுக்கு வெல்கம்!", { host: "big", action: "wave", overlay: { kind: "title", text: "வணக்கம்!", small: "உலகம் இப்போ" } }),
  L(2, "k1", "sea", "ஆயிரம் வருஷத்துக்கு முன்னாடி, நம்ம தமிழ்நாட்டுல இருந்து, ஒரு பெரிய கப்பல் படை கிளம்புச்சு.", { sub: "1000 வருஷத்துக்கு முன்னாடி, நம்ம தமிழ்நாட்டுல இருந்து, ஒரு பெரிய கப்பல் படை கிளம்புச்சு.", action: "look-up", overlay: { kind: "type", text: "1000 வருஷத்துக்கு முன்னாடி..." } }),
  L(3, "k1", "ship", "கடலைத் தாண்டி, இன்னைக்கு இருக்கிற இந்தோனேசியா, மலேசியா வரைக்கும் போச்சு!", { action: "excited", overlay: { kind: "title", text: "இந்தோனேசியா · மலேசியா", small: "கடலைத் தாண்டி" } }),
  L(4, "k1", "ship", "அது யாரோட படை தெரியுமா? நம்ம சோழர்களோட கப்பல் படை!", { action: "proud", overlay: { kind: "stamp", text: "சோழர் கப்பல் படை" } }),
  L(5, "k1", "big-temple", "கதைக்கு போறதுக்கு முன்னாடி, நீங்க இன்னும் சப்ஸ்க்ரைப் பண்ணலைன்னா, இப்பவே சப்ஸ்க்ரைப் பண்ணிடுங்க. பெல் ஐகானையும் அழுத்திடுங்க!", { action: "please", overlay: { kind: "title", text: "SUBSCRIBE பண்ணிடுங்க", small: "பெல் ஐகானையும் அழுத்துங்க" } }),
  L(6, "k1", "big-temple", "இந்த வீடியோல, அந்த கப்பல் படையை யார் உருவாக்கினாங்க, ஏன் அவ்ளோ தூரம் போனாங்க, எப்படி போனாங்கன்னு, ஒரு கதை மாதிரி சொல்றேன். வாங்க!", { host: "corner", action: "point", overlay: { kind: "list", items: ["யார்?", "ஏன்?", "எப்படி?"] } }),

  // ── 1. Rajaraja ──
  L(7, "k2", "rajaraja", "முதல்ல, ஒரு ராஜாவைப் பத்தி தெரிஞ்சுக்கணும். அவர் பேரு, அருள்மொழி வர்மன்.", { chapter: "ராஜராஜ சோழன்", action: "point", overlay: { kind: "title", text: "அருள்மொழி வர்மன்" } }),
  L(8, "k2", "rajaraja", "பொன்னியின் செல்வன் கதை கேட்டிருக்கீங்களா? அந்த பொன்னியின் செல்வன், இவர் தான்!", { action: "surprised", overlay: { kind: "morph", from: "பொன்னியின் செல்வன்", to: "ராஜராஜ சோழன்" } }),
  L(9, "k2", "rajaraja", "கி.பி. தொள்ளாயிரத்து எண்பத்தி அஞ்சுல, இவர் ராஜா ஆனாரு. அப்போ இருந்து, இவருக்கு பேரு, ராஜராஜ சோழன்.", { sub: "கி.பி. 985-ல, இவர் ராஜா ஆனாரு. அப்போ இருந்து, இவருக்கு பேரு, ராஜராஜ சோழன்.", action: "crown", overlay: { kind: "year", value: 985, prefix: "கி.பி. ", label: "ராஜராஜன் ராஜா ஆனார்" } }),
  L(10, "k2", "big-temple", "தஞ்சாவூர் பெரிய கோவில் தெரியும் இல்லையா? அதைக் கட்டினது, இவர் தான்!", { action: "proud", overlay: { kind: "title", text: "தஞ்சை பெரிய கோவில்", small: "கி.பி. 1010" } }),
  L(11, "k2", "ship", "ஆனா, ராஜராஜன் கோவில் மட்டும் கட்டல. ஒரு வலிமையான கப்பல் படையையும் உருவாக்கினாரு.", { action: "fist", overlay: { kind: "title", text: "வலிமையான கப்பல் படை" } }),
  L(12, "k2", "sea", "ஏன்னா, அவருக்கு ஒரு விஷயம் நல்லா புரிஞ்சுது. கடல் யார் கையில இருக்கோ, வியாபாரமும், பணமும், அவங்க கையில தான் இருக்கும்!", { action: "idea", overlay: { kind: "type", text: "கடல் யார் கையிலோ, வியாபாரம் அவங்க கையில!" } }),

  // ── 2. The first wins at sea ──
  L(13, "k3", "kerala-coast", "ராஜராஜனோட கப்பல் படை, முதல்ல கேரளா கடற்கரையில, காந்தளூர் சாலைங்கிற இடத்துல, சேரர்களோட கப்பல்களை தோற்கடிச்சுது.", { chapter: "முதல் கடல் வெற்றிகள்", action: "fist", overlay: { kind: "pin", text: "காந்தளூர் சாலை", small: "கேரளா கடற்கரை" } }),
  L(14, "k3", "chola-map", "அடுத்து, கடலைத் தாண்டி, இலங்கை! இலங்கையோட வடக்கு பகுதியை, சோழ படை ஜெயிச்சுது.", { action: "point", overlay: { kind: "route", from: "தமிழ்நாடு", to: "இலங்கை" } }),
  L(15, "k3", "polonnaruwa", "இலங்கையில, பொலன்னறுவைங்கிற ஊர்ல, சோழர்கள் கட்டின சிவன் கோவில், இன்னைக்கும் இருக்கு!", { action: "look-up", overlay: { kind: "pin", text: "பொலன்னறுவை", small: "இலங்கை · சோழர் கட்டிய சிவன் கோவில்" } }),
  L(16, "k3", "maldives", "அதுக்கப்புறம், இன்னும் தூரம். நடுக்கடல்ல இருக்கிற மாலத்தீவுகள்!", { action: "excited", overlay: { kind: "route", from: "தமிழ்நாடு", to: "மாலத்தீவு" } }),
  L(17, "k3", "maldives", "கல்வெட்டுல, முந்நீர் பழந்தீவு பன்னீராயிரம்னு எழுதியிருக்காங்க. அதாவது, கடல்ல இருக்கிற பன்னிரண்டாயிரம் பழைய தீவுகள்!", { sub: "கல்வெட்டுல, \"முந்நீர்ப் பழந்தீவு பன்னீராயிரம்\"னு எழுதியிருக்காங்க. அதாவது, கடல்ல இருக்கிற 12,000 பழைய தீவுகள்!", action: "read", overlay: { kind: "title", text: "முந்நீர்ப் பழந்தீவு பன்னீராயிரம்", small: "கடலில் 12,000 பழைய தீவுகள்" } }),

  // ── 3. Rajendra ──
  L(18, "k4", "gangaikonda", "கி.பி. ஆயிரத்து பதினாலுல, ராஜராஜனோட மகன், ராஜேந்திர சோழன் ராஜா ஆனாரு.", { chapter: "மகன் ராஜேந்திர சோழன்", sub: "கி.பி. 1014-ல, ராஜராஜனோட மகன், ராஜேந்திர சோழன் ராஜா ஆனாரு.", action: "crown", overlay: { kind: "year", value: 1014, prefix: "கி.பி. ", label: "ராஜேந்திரன் ராஜா ஆனார்" } }),
  L(19, "k4", "gangaikonda", "அப்பா ஆரம்பிச்சதை, மகன் இன்னும் பெருசா ஆக்கினாரு.", { action: "nod", overlay: { kind: "morph", from: "அப்பா ராஜராஜன்", to: "மகன் ராஜேந்திரன்" } }),
  L(20, "k4", "ganga", "இலங்கை முழுசையும் ஜெயிச்சாரு. வடக்கே, கங்கை நதி வரைக்கும் படை அனுப்பினாரு.", { action: "point", overlay: { kind: "list", items: ["இலங்கை முழுசும்", "வடக்கே கங்கை வரை"] } }),
  L(21, "k4", "gangaikonda", "அதனால, அவருக்கு கங்கைகொண்ட சோழன்னு பேர். கங்கைகொண்ட சோழபுரம்னு, ஒரு புது தலைநகரமே கட்டினாரு!", { action: "proud", overlay: { kind: "title", text: "கங்கைகொண்ட சோழபுரம்", small: "புதிய தலைநகரம்" } }),
  L(22, "k4", "sea", "ஆனா, எல்லாத்தையும் விட பெரிய சாகசம், இனிமே தான் வருது!", { action: "whisper", overlay: { kind: "type", text: "பெரிய சாகசம், இனிமே தான்..." } }),

  // ── 4. Why cross the sea ──
  L(23, "k5", "palembang", "அந்த காலத்துல, சுமத்ரா தீவுல, ஸ்ரீவிஜயம்னு ஒரு பெரிய ராஜ்ஜியம் இருந்துச்சு. அந்த இடம், இன்னைக்கு இந்தோனேசியா.", { chapter: "ஏன் கடலைத் தாண்டினாங்க?", action: "point", overlay: { kind: "pin", text: "ஸ்ரீவிஜயம்", small: "சுமத்ரா, இன்றைய இந்தோனேசியா" } }),
  L(24, "k5", "malacca", "சீனாவுக்கு போற கப்பல்கள் எல்லாம், மலாக்கா நீரிணைங்கிற, ஒரு குறுகலான கடல் வழியா தான் போகணும். அந்த வழியை, ஸ்ரீவிஜயம் தான் கட்டுப்படுத்துச்சு.", { action: "think", overlay: { kind: "title", text: "மலாக்கா நீரிணை", small: "சீனாவுக்கு போகும் கடல் வழி" } }),
  L(25, "k5", "nagapattinam", "சுவாரஸ்யமான விஷயம் என்னன்னா, முதல்ல ரெண்டு நாடும் ஃப்ரெண்ட்ஸ் தான்! ஸ்ரீவிஜய ராஜா, நம்ம நாகப்பட்டினத்துல, ஒரு புத்த விகாரையே கட்டினாரு. ராஜராஜன், அதுக்கு ஒரு கிராமத்தையே கொடுத்தாரு!", { action: "surprised", overlay: { kind: "title", text: "சூடாமணி விகாரை", small: "நாகப்பட்டினம் · ஸ்ரீவிஜய ராஜா கட்டியது" } }),
  L(26, "k5", "malacca", "ஆனா காலப்போக்குல, உறவு கெட்டுப் போச்சு. அந்த கடல் வழியில, நம்ம வியாபாரிகளுக்கு பிரச்சனைகள் வந்துச்சுன்னு, வரலாற்று ஆசிரியர்கள் சொல்றாங்க.", { action: "sad", overlay: { kind: "morph", from: "நண்பர்கள்", to: "எதிரிகள்" } }),
  L(27, "k5", "china-ship", "நம்ம வியாபாரிகள், மிளகு, துணி, முத்து எல்லாம் கொண்டு போய், சீனாவுல பட்டும், பீங்கானும் வாங்கிட்டு வருவாங்க.", { action: "nod", overlay: { kind: "route", from: "தமிழ்நாடு", to: "சீனா" } }),
  L(28, "k5", "china-ship", "அந்த வியாபாரம் தடைப்பட்டா, சோழ நாட்டுக்கே பெரிய நஷ்டம். அதனால, ராஜேந்திரன் ஒரு பெரிய முடிவு எடுத்தாரு.", { action: "fist", overlay: { kind: "stamp", text: "பெரிய முடிவு!" } }),
  L(29, "k5", "big-temple", "இதுவரைக்கும் கதை பிடிச்சிருக்கா? ஒரு லைக் போடுங்க! உங்க ஃப்ரெண்ட்ஸுக்கும் ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "பிடிச்சிருந்தா LIKE", small: "ஃப்ரெண்ட்ஸுக்கு SHARE" } }),

  // ── 5. 1025: the voyage ──
  L(30, "k6", "ship", "கி.பி. ஆயிரத்து இருபத்தி அஞ்சு. சோழ கப்பல் படை, கடலைத் தாண்டி கிளம்புச்சு!", { chapter: "கி.பி. 1025 கடல் பயணம்", sub: "கி.பி. 1025. சோழ கப்பல் படை, கடலைத் தாண்டி கிளம்புச்சு!", action: "excited", overlay: { kind: "year", value: 1025, prefix: "கி.பி. ", label: "கடல் பயணம் தொடங்கியது" } }),
  L(31, "k6", "chola-map", "நாகப்பட்டினம் மாதிரி துறைமுகங்கள்ல இருந்து, வங்காள விரிகுடாவைத் தாண்டி, ஆயிரக்கணக்கான கிலோமீட்டர் பயணம்!", { action: "point", overlay: { kind: "route", from: "நாகப்பட்டினம்", to: "கடாரம்" } }),
  L(32, "k6", "sea", "அப்போ எஞ்சின் கிடையாது. அப்புறம் எப்படி போனாங்க?", { action: "think", overlay: { kind: "type", text: "எஞ்சின் இல்லாம எப்படி?" } }),
  L(33, "k6", "monsoon", "காத்து! பருவக்காற்று! வருஷத்துல சில மாசங்கள்ல, காத்து ஒரு பக்கமா வீசும். அந்த காத்துல, பாய்மரக் கப்பல்கள் வேகமா போகும்.", { action: "idea", overlay: { kind: "title", text: "பருவக்காற்று", small: "Monsoon Winds" } }),
  L(34, "k6", "monsoon", "காத்து திசை மாறும் போது, திரும்பி வருவாங்க. ராத்திரியில, நட்சத்திரங்களைப் பார்த்து வழி கண்டுபிடிப்பாங்க.", { action: "look-up", overlay: { kind: "list", items: ["காற்றின் திசை", "நட்சத்திரங்கள்"] } }),

  // ── 6. Kadaram ──
  L(35, "k7", "bujang", "சோழ படை, ஸ்ரீவிஜய ராஜ்ஜியத்தோட, பல துறைமுகங்களை ஒண்ணு ஒண்ணா ஜெயிச்சுது.", { chapter: "கடாரம் கொண்டான்", action: "fist", overlay: { kind: "title", text: "ஒண்ணு ஒண்ணா வெற்றி" } }),
  L(36, "k7", "bujang", "கடாரம்னா, இன்னைக்கு மலேசியாவுல இருக்கிற கெடா. ஸ்ரீவிஜயம்னா, இன்னைக்கு இந்தோனேசியாவுல இருக்கிற பாலெம்பாங் பக்கம்.", { action: "point", overlay: { kind: "list", items: ["கடாரம் = கெடா, மலேசியா", "ஸ்ரீவிஜயம் = பாலெம்பாங், இந்தோனேசியா"] } }),
  L(37, "k7", "palembang", "இன்னும் நிறைய இடங்கள். இலங்காசோகம், மாயிருடிங்கம், இலாமுரிதேசம், மாநக்கவாரம். மாநக்கவாரம்னா, இன்னைக்கு நிக்கோபார் தீவுகள்!", { action: "count", overlay: { kind: "list", items: ["இலங்காசோகம்", "மாயிருடிங்கம்", "இலாமுரிதேசம்", "மாநக்கவாரம் = நிக்கோபார்"] } }),
  L(38, "k7", "palembang", "ஸ்ரீவிஜய ராஜா, சங்கிராம விஜயோத்துங்கவர்மனை பிடிச்சாங்க. அவங்க அரண்மனையோட, ரத்தினக் கற்கள் பதிச்ச பெரிய வாசலையும் எடுத்துட்டு வந்தாங்க!", { action: "surprised", overlay: { kind: "title", text: "சங்கிராம விஜயோத்துங்கவர்மன்", small: "பிடிபட்ட ஸ்ரீவிஜய ராஜா" } }),
  L(39, "k7", "inscription", "இதெல்லாம் நமக்கு எப்படி தெரியும்? தஞ்சை பெரிய கோவில் சுவத்துல, இந்த வெற்றியை, கல்வெட்டா எழுதி வச்சிருக்காங்க!", { action: "read", overlay: { kind: "type", text: "கல்வெட்டு சொல்லுது!" } }),
  L(40, "k7", "gangaikonda", "அதனால, ராஜேந்திரனுக்கு இன்னொரு பேரும் உண்டு. கடாரம் கொண்டான்!", { action: "crown", overlay: { kind: "stamp", text: "கடாரம் கொண்டான்!", small: "ராஜேந்திர சோழன்" } }),

  // ── 7. What came after, and goodbye ──
  L(41, "k8", "sea", "ஆனா ஒரு முக்கியமான உண்மை. சோழர்கள், இந்தோனேசியா, மலேசியாவை, பல வருஷம் ஆட்சி பண்ணல. அது ஒரு வெற்றிகரமான கடல் படையெடுப்பு.", { chapter: "அப்புறம் என்ன ஆச்சு?", action: "nod", overlay: { kind: "title", text: "நீண்ட ஆட்சி இல்ல", small: "ஒரு வெற்றிகரமான படையெடுப்பு" } }),
  L(42, "k8", "ship", "ஜெயிச்சுட்டு, திரும்பி வந்துட்டாங்க. ஆனா அதுக்கப்புறம், தமிழ் வியாபாரிகளுக்கு, அந்த கடல் வழி திறந்துச்சு.", { action: "thumbs", overlay: { kind: "morph", from: "தடை", to: "திறந்த கடல் வழி" } }),
  L(43, "k8", "china-ship", "சோழர்கள், சீனாவுக்கு தூதர்களையும் அனுப்பினாங்க. சீன வரலாற்று புத்தகங்கள்லயே, இது எழுதியிருக்கு!", { action: "read", overlay: { kind: "title", text: "சீனாவுக்கு சோழ தூதர்கள்", small: "சீன வரலாற்று ஆவணங்களில்" } }),
  L(44, "k8", "chola-map", "இந்தோனேசியாவுல, சுமத்ரா தீவுல, ஐந்நூற்றுவர்ங்கிற தமிழ் வியாபாரிகள் சங்கம், ஆயிரத்து எண்பத்தி எட்டுல எழுதின, ஒரு தமிழ் கல்வெட்டு கிடைச்சிருக்கு!", { sub: "இந்தோனேசியாவுல, சுமத்ரா தீவுல, ஐந்நூற்றுவர்ங்கிற தமிழ் வியாபாரிகள் சங்கம், 1088-ல எழுதின, ஒரு தமிழ் கல்வெட்டு கிடைச்சிருக்கு!", action: "surprised", overlay: { kind: "title", text: "சுமத்ராவில் தமிழ் கல்வெட்டு", small: "கி.பி. 1088 · ஐந்நூற்றுவர்" } }),
  L(45, "k8", "big-temple", "நினைச்சுப் பாருங்க. ஆயிரம் வருஷத்துக்கு முன்னாடி, மேப் இல்ல, ஜிபிஎஸ் இல்ல, எஞ்சின் இல்ல. ஆனாலும் நம்ம தமிழர்கள், கடலைத் தாண்டி போய், சரித்திரம் படைச்சாங்க!", { sub: "நினைச்சுப் பாருங்க. 1000 வருஷத்துக்கு முன்னாடி, மேப் இல்ல, GPS இல்ல, எஞ்சின் இல்ல. ஆனாலும் நம்ம தமிழர்கள், கடலைத் தாண்டி போய், சரித்திரம் படைச்சாங்க!", host: "big", action: "proud", overlay: { kind: "title", text: "மேப் இல்ல · GPS இல்ல · எஞ்சின் இல்ல" } }),
  L(46, "k8", "big-temple", "உங்களுக்கு பிடிச்ச சோழ ராஜா யாரு? ராஜராஜனா, ராஜேந்திரனா? கமெண்ட்ல சொல்லுங்க!", { action: "think", overlay: { kind: "type", text: "ராஜராஜனா? ராஜேந்திரனா?" } }),
  L(47, "k8", "big-temple", "அடுத்த வீடியோல எதைப் பத்தி பேசலாம்? அதையும் கமெண்ட்ல சொல்லுங்க. நான் எல்லா கமெண்ட்டையும் படிப்பேன்!", { action: "nod", overlay: { kind: "type", text: "அடுத்த வீடியோ? கமெண்ட்ல சொல்லுங்க" } }),
  L(48, "k8", "big-temple", "இந்த வீடியோ பிடிச்சிருந்தா, லைக் பண்ணுங்க, சப்ஸ்க்ரைப் பண்ணுங்க, பெல் ஐகானையும் அழுத்திடுங்க!", { action: "please", overlay: { kind: "title", text: "LIKE · SUBSCRIBE · BELL" } }),
  L(49, "k8", "big-temple", "மறுபடியும் அடுத்த வீடியோல சந்திப்போம். டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "டாட்டா! பை பை!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  sea: { q: "Sunset Waves At Turtle Bay", file: "File:Sunset Waves At Turtle Bay (175599379).jpeg" },
  ship: { q: "Baghlah sailing ship", file: "File:Baghlah sailing ship.jpg" },
  "big-temple": { q: "Brihadeeswarar Temple Thanjavur" },
  rajaraja: { q: "Statue of Rajaraja", file: "File:Statue of Rajaraja.jpg" },
  "kerala-coast": { q: "Kerala coast sea boats" },
  polonnaruwa: { q: "Shiva Devale Polonnaruwa" },
  maldives: { q: "Maldives islands aerial" },
  gangaikonda: { q: "Gangaikonda Cholapuram view", file: "File:Gangaikonda Cholapuram view.jpg" },
  ganga: { q: "Ganges river Varanasi ghats" },
  palembang: { q: "Musi River Palembang" },
  malacca: { q: "Strait of Malacca ships" },
  nagapattinam: { q: "Nagapattinam beach" },
  "china-ship": { q: "Song dynasty ship Quanzhou" },
  monsoon: { q: "dhow sailing", file: "File:A dhow sailing on Lake Victoria.jpg" },
  bujang: { q: "Candi Batu Pahat Bujang Valley", file: "File:Candi Batu Pahat of Bujang Valley.jpg" },
  inscription: { q: "Brihadeeswarar temple inscription Tamil" },
  "chola-map": { q: "Rajendra Chola territories map", file: "File:Rajendra territories cl.png" },
};

export const CHOLA_NAVY: ExVideo = {
  slug: "03 Cholar Kappal Padai",
  title: "சோழர் கப்பல் படை: இந்தோனேசியா, மலேசியா வரை!",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "story",
  thumb: {
    visual: "monsoon",
    lines: [
      { text: "சோழர்", size: 190, fill: "#FFF6E6" },
      { text: "கப்பல் படை", size: 170, fill: "#FFF6E6" },
      { text: "இந்தோனேசியா வரை!", size: 140, fill: "#E8B75A" },
      { text: "1000 வருஷத்துக்கு முன்னாடி", size: 80, fill: "#FFF6E6" },
    ],
  },
  ...HOST_VOICE,
};
