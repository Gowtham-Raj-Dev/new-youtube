/**
 * "Tamil Nadu Varalaaru" — Ulagam Ippo's first video, told by the host, a
 * little boy. Every line with the Tamil he says, what he does, the picture(s)
 * behind it, and the text that animates over it. A take is one Gemini
 * recording of a chapter: one narrator, read straight through. The plan in
 * words is "Ulagam Ippo/Videos/01 Tamil Nadu Varalaaru/script.md".
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── Intro: the host big on screen ──
  L(1, "k1", "brihadeeswarar", "ஹாய் ஹாய் ஹாய்! வணக்கம் நண்பர்களே!", { host: "big", action: "wave", fx: "sparkles", overlay: { kind: "title", text: "வணக்கம்! 👋", small: "உலகம் இப்போ" } }),
  L(2, "k1", "brihadeeswarar", "இது தான் என்னோட முதல் வீடியோ! எனக்கு ரொம்ப ரொம்ப சந்தோஷமா இருக்கு!", { action: "celebrate", fx: "confetti", overlay: { kind: "stamp", text: "என் முதல் வீடியோ! 🎉" } }),
  L(3, "k1", "brihadeeswarar", "அதனால, உங்ககிட்ட ஒரு சின்ன ரெக்வெஸ்ட். வீடியோ ஆரம்பிக்கிறதுக்கு முன்னாடியே, கீழ இருக்கிற சப்ஸ்க்ரைப் பட்டனை அழுத்தி, பக்கத்துல இருக்கிற பெல் ஐகானையும் க்ளிக் பண்ணிடுங்க!", { action: "point-down", overlay: { kind: "cta", buttons: ["subscribe", "bell"], text: "ஒரு சின்ன ரெக்வெஸ்ட் 🥺" } }),
  L(4, "k1", "brihadeeswarar", "மறக்காம சப்ஸ்க்ரைப் பண்ணிடுங்க, சரியா? ப்ளீஸ்!", { action: "please", fx: "hearts", overlay: { kind: "title", text: "மறக்காம SUBSCRIBE! 🙏" } }),
  L(5, "k1", "shore-temple", "சரி! இன்னைக்கு நாம ஒரு டைம் மெஷின்ல ஏறி, ஆயிரக்கணக்கான வருஷம் பின்னாடி போகப் போறோம்!", { action: "excited", overlay: { kind: "warp", text: "⏳ டைம் மெஷின்" } }),
  L(6, "k1", "shore-temple", "எங்க தெரியுமா? நம்ம தமிழ்நாட்டோட வரலாறுக்குள்ள! சங்க காலத்துல இருந்து, இன்னைக்கு வரைக்கும்.", { action: "point", overlay: { kind: "title", text: "தமிழ்நாடு வரலாறு", small: "சங்க காலம் ➡️ இன்று" } }),
  L(7, "k1", ["meenakshi", "brihadeeswarar-2", "vellore-fort", "fort-st-george"], "ராஜாக்கள், பெரிய பெரிய கோயில்கள், போர்கள், வீரர்கள்... எல்லாமே இருக்கு. கடைசி வரைக்கும் பாருங்க, நிறைய பேருக்கு தெரியாத சூப்பர் உண்மைகள் இருக்கு! ரெடியா? போலாம்!", { host: "corner", action: "thumbs", overlay: { kind: "list", items: ["👑 ராஜாக்கள்", "🛕 கோயில்கள்", "⚔️ போர்கள்", "🚀 போலாம்!"] } }),

  // ── 1. The oldest beginnings ──
  L(8, "k2", "tamil-nadu-map", "முதல்ல ஒரு கேள்வி. உலகத்துல இன்னைக்கும் பேசப்படுற, மிகப் பழமையான மொழிகள்ல ஒண்ணு எது தெரியுமா?", { chapter: "பழமையான தொடக்கம்", action: "think", overlay: { kind: "type", text: "❓ மிகப் பழமையான மொழி எது?" } }),
  L(9, "k2", "palm-leaf", "ஆமா! நம்ம தமிழ் தான்!", { action: "proud", fx: "sparkles", overlay: { kind: "stamp", text: "தமிழ்! 🏆" } }),
  L(10, "k2", "keezhadi", "சிவகங்கை பக்கத்துல, கீழடின்னு ஒரு ஊர் இருக்கு. அங்க மண்ணை தோண்டி தோண்டி, ஆராய்ச்சி பண்ணிட்டு இருக்காங்க.", { action: "point", overlay: { kind: "pin", text: "கீழடி", small: "சிவகங்கை மாவட்டம்" } }),
  L(11, "k2", "keezhadi-2", "அங்க கிடைச்ச பொருட்கள் எவ்ளோ பழசு தெரியுமா? கிட்டத்தட்ட ரெண்டாயிரத்து அறுநூறு வருஷம்!", { sub: "அங்க கிடைச்ச பொருட்கள் எவ்ளோ பழசு தெரியுமா? கிட்டத்தட்ட 2600 வருஷம்!", action: "surprised", overlay: { kind: "year", value: 2600, suffix: " வருஷம்", label: "எவ்ளோ பழசு? 😮" } }),
  L(12, "k2", "tamil-brahmi", "செங்கல் வீடுகள், உறை கிணறுகள், தமிழ் எழுத்து எழுதின பானை ஓடுகள்... அப்பவே அங்க ஒரு முழு நகரமே இருந்திருக்கு!", { action: "nod", overlay: { kind: "list", items: ["🧱 செங்கல் வீடுகள்", "🕳️ உறை கிணறுகள்", "✍️ தமிழ் எழுத்து"] } }),
  L(13, "k2", "adichanallur", "தூத்துக்குடி பக்கத்துல இருக்கிற ஆதிச்சநல்லூர்லயும், பழங்கால மக்கள் பயன்படுத்தின பெரிய பெரிய தாழிகள் கிடைச்சிருக்கு.", { action: "point", overlay: { kind: "pin", text: "ஆதிச்சநல்லூர் 🏺", small: "தூத்துக்குடி" } }),
  L(14, "k2", "keezhadi-2", "அப்போவே நம்ம முன்னோர்கள், படிச்சவங்க, ரொம்ப ஸ்மார்ட்டானவங்க!", { action: "thumbs", overlay: { kind: "title", text: "நம்ம முன்னோர்கள் = 🧠 SMART" } }),

  // ── 2. The Sangam age ──
  L(15, "k3", "tamil-nadu-map", "அடுத்து, சங்க காலம். கிட்டத்தட்ட ரெண்டாயிரத்து முன்னூறு வருஷத்துக்கு முன்னாடி.", { chapter: "சங்க காலம்", sub: "அடுத்து, சங்க காலம். கிட்டத்தட்ட 2300 வருஷத்துக்கு முன்னாடி.", action: "wave", overlay: { kind: "year", value: 2300, suffix: " வருஷம் முன்", label: "சங்க காலம் 📜" } }),
  L(16, "k3", "tamil-nadu-map", "அப்போ தமிழ்நாட்டை, மூணு பெரிய ராஜ குடும்பங்கள் ஆண்டாங்க. சேரர், சோழர், பாண்டியர்! இவங்க தான் மூவேந்தர்கள்.", { action: "count", overlay: { kind: "list", items: ["👑 சேரர்", "👑 சோழர்", "👑 பாண்டியர்"] } }),
  L(17, "k3", "tamil-nadu-map", "ஒவ்வொருத்தருக்கும் ஒரு சின்னம் இருக்கு. சேரருக்கு வில், சோழருக்கு புலி, பாண்டியருக்கு மீன்!", { action: "roar", overlay: { kind: "list", items: ["🏹 வில்", "🐅 புலி", "🐟 மீன்"] } }),
  L(18, "k3", "palm-leaf", "இந்த காலத்துல, புலவர்கள் நிறைய அழகான பாடல்கள் எழுதினாங்க. அதுக்கு பேரு தான், சங்க இலக்கியம்.", { action: "read", overlay: { kind: "card", text: "சங்க இலக்கியம்", small: "புலவர்களின் பாடல்கள்", icon: "📜" } }),
  L(19, "k3", "thiruvalluvar", "அப்புறம், திருவள்ளுவர் எழுதின திருக்குறள். ஆயிரத்து முன்னூத்தி முப்பது குறள்கள்! இன்னைக்கும் உலகம் முழுக்க படிக்கிறாங்க.", { sub: "அப்புறம், திருவள்ளுவர் எழுதின திருக்குறள். 1330 குறள்கள்! இன்னைக்கும் உலகம் முழுக்க படிக்கிறாங்க.", action: "proud", overlay: { kind: "year", value: 1330, suffix: " குறள்கள்", label: "திருக்குறள் 📖" } }),
  L(20, "k3", "ship", "அப்போவே தமிழர்கள் பெரிய வியாபாரிகள். மிளகு, முத்து, துணி எல்லாம் கப்பல்ல ஏத்தி, ரோம் நாடு வரைக்கும் அனுப்பினாங்க!", { action: "point", overlay: { kind: "route", from: "தமிழகம்", to: "ரோம் 🏛️", icons: ["🌶️", "🦪", "🧵"] } }),
  L(21, "k3", "roman-coins", "புதுச்சேரி பக்கத்துல இருக்கிற அரிக்கமேட்டுல, ரோமானிய பொருட்கள் கூட கிடைச்சிருக்கு. செம்மையா இல்ல?", { action: "surprised", overlay: { kind: "card", text: "அரிக்கமேடு", small: "ரோமானிய பொருட்கள்", icon: "🪙" } }),

  // ── 3. Pallavas ──
  L(22, "k4", "kailasanathar", "சங்க காலம் முடிஞ்சதுக்கு அப்புறம், களப்பிரர் காலம்னு ஒரு மர்மமான காலம் வந்துச்சு. அதைப் பத்தி, நமக்கு அதிகமா தெரியாது!", { chapter: "பல்லவர்கள்", action: "shrug", overlay: { kind: "type", text: "களப்பிரர் காலம் = மர்மம் ❓" } }),
  L(23, "k4", "kailasanathar", "அப்புறம் வந்தாங்க, பல்லவர்கள்! அவங்க தலைநகரம், காஞ்சிபுரம்.", { action: "point", overlay: { kind: "pin", text: "காஞ்சிபுரம்", small: "பல்லவர் தலைநகரம்" } }),
  L(24, "k4", "pancha-rathas", "பல்லவர்களுக்கு, கல்லுல சிற்பம் செதுக்கறதுன்னா அவ்ளோ பிடிக்கும்!", { action: "chisel", overlay: { kind: "morph", from: "🪨 கல்", to: "✨ கலை" } }),
  L(25, "k4", ["pancha-rathas", "arjuna-penance", "shore-temple"], "மாமல்லபுரத்துல இருக்கிற ஐந்து ரதங்கள், அர்ஜுனன் தபசு, கடற்கரை கோயில்... எல்லாமே அவங்க செஞ்சது தான்!", { action: "point", overlay: { kind: "list", items: ["🪨 ஐந்து ரதங்கள்", "🗿 அர்ஜுனன் தபசு", "🌊 கடற்கரை கோயில்"] } }),
  L(26, "k4", "shore-temple", "நரசிம்மவர்மன்னு ஒரு ராஜா. அவருக்கு இன்னொரு பேரு, மாமல்லன். அவர் பேர்ல இருந்து தான், மாமல்லபுரம்னு பேர் வந்துச்சு!", { action: "idea", overlay: { kind: "morph", from: "மாமல்லன்", to: "மாமல்லபுரம்" } }),
  L(27, "k4", "shore-temple", "இன்னைக்கு, இந்த இடம் யுனெஸ்கோ உலக பாரம்பரிய சின்னம்!", { action: "clap", overlay: { kind: "stamp", text: "UNESCO 🏛️", small: "உலக பாரம்பரிய சின்னம்" } }),

  // ── 4. The Cholas ──
  L(28, "k5", "brihadeeswarar", "இப்போ, என்னோட ஃபேவரைட் பகுதி! சோழர்கள்!", { chapter: "சோழப் பேரரசு", action: "excited", fx: "sparkles", overlay: { kind: "title", text: "என் FAVOURITE ❤️", small: "சோழர்கள் 🐅" } }),
  L(29, "k5", "chola-map", "ஒன்பதாம் நூற்றாண்டுல, விஜயாலய சோழன் தஞ்சாவூரை பிடிச்சாரு. அங்க இருந்து, சோழர்கள் மறுபடியும் பெரிய சக்தியா வளர்ந்தாங்க.", { sub: "9-ஆம் நூற்றாண்டுல, விஜயாலய சோழன் தஞ்சாவூரை பிடிச்சாரு. அங்க இருந்து, சோழர்கள் மறுபடியும் பெரிய சக்தியா வளர்ந்தாங்க.", action: "point", overlay: { kind: "card", text: "விஜயாலய சோழன்", small: "தஞ்சாவூர் · 9-ஆம் நூற்றாண்டு", icon: "⚔️" } }),
  L(30, "k5", "rajaraja", "அவங்கள்லயே ரொம்ப பெரிய ராஜா, ராஜராஜ சோழன்!", { action: "crown", overlay: { kind: "title", text: "ராஜராஜ சோழன் 👑" } }),
  L(31, "k5", "brihadeeswarar", "அவர் கட்டினது தான், தஞ்சை பெரிய கோயில். ஆயிரத்து பத்தாம் வருஷம் கட்டி முடிச்சாங்க.", { sub: "அவர் கட்டினது தான், தஞ்சை பெரிய கோயில். கி.பி. 1010-ல கட்டி முடிச்சாங்க.", action: "point", overlay: { kind: "year", value: 1010, prefix: "கி.பி. ", label: "தஞ்சை பெரிய கோயில் 🛕" } }),
  L(32, "k5", "brihadeeswarar-2", "யோசிச்சு பாருங்க! ஆயிரம் வருஷம் தாண்டியும், இன்னும் கம்பீரமா நிக்குது!", { action: "look-up", overlay: { kind: "stamp", text: "1000+ வருஷம்! 🕰️" } }),
  L(33, "k5", "brihadeeswarar-2", "அதோட விமானம், கிட்டத்தட்ட இருநூத்தி பதினாறு அடி உயரம்!", { sub: "அதோட விமானம், கிட்டத்தட்ட 216 அடி உயரம்!", action: "surprised", overlay: { kind: "year", value: 216, suffix: " அடி", label: "விமானத்தின் உயரம்", ruler: true } }),
  L(34, "k5", "gangaikonda", "அவரோட மகன், ராஜேந்திர சோழன், அப்பாவையே மிஞ்சிட்டாரு!", { action: "fist", overlay: { kind: "card", text: "ராஜேந்திர சோழன்", small: "ராஜராஜனின் மகன்", icon: "💪" } }),
  L(35, "k5", "gangaikonda", "கங்கை ஆறு வரைக்கும் போய் ஜெயிச்சாரு. அந்த வெற்றிக்காக, கங்கைகொண்ட சோழபுரம்னு ஒரு புது தலைநகரமே கட்டினாரு!", { action: "celebrate", overlay: { kind: "title", text: "கங்கைகொண்ட சோழபுரம்", small: "புதிய தலைநகரம் 🏆" } }),

  // ── 4b. The Cholas, the navy and the village vote ──
  L(36, "k6", "chola-map", "அவரோட கப்பல் படை, கடலைத் தாண்டி, இந்தோனேசியா, மலேசியா பக்கம் வரைக்கும் போச்சு!", { action: "point", overlay: { kind: "route", from: "சோழ நாடு", to: "🇮🇩 🇲🇾", icons: ["⚔️", "🚩"] } }),
  L(37, "k6", "uthiramerur", "இன்னொரு சூப்பர் விஷயம் சொல்லட்டுமா?", { action: "whisper", overlay: { kind: "type", text: "🤫 ஒரு ரகசியம்..." } }),
  L(38, "k6", "uthiramerur", "உத்திரமேரூர் கல்வெட்டுல, குடவோலை முறைன்னு ஒண்ணு எழுதியிருக்கு.", { action: "point", overlay: { kind: "card", text: "குடவோலை முறை", small: "உத்திரமேரூர் கல்வெட்டு", icon: "🗳️" } }),
  L(39, "k6", "uthiramerur", "தகுதியானவங்க பேரை ஓலையில எழுதி, ஒரு குடத்துல போடுவாங்க. ஒரு சின்னப் பையனை கூப்பிட்டு, ஒரு ஓலையை எடுக்கச் சொல்லுவாங்க. என்னை மாதிரி ஒரு சின்னப் பையன்!", { action: "jump", overlay: { kind: "list", items: ["✍️ ஓலையில் பெயர்", "🏺 குடத்தில்", "👦 என்னை மாதிரி பையன்!"] } }),
  L(40, "k6", "uthiramerur", "அப்படித் தான், கிராம சபைக்கு ஆட்களை தேர்ந்தெடுத்தாங்க. ஆயிரம் வருஷத்துக்கு முன்னாடியே!", { action: "proud", overlay: { kind: "stamp", text: "1000 வருஷம் முன்பே! 🤯", small: "கிராம சபை தேர்வு" } }),
  L(41, "k6", "nataraja", "சோழர் காலத்து நடராஜர் வெண்கலச் சிலைகள், இன்னைக்கும் உலகம் முழுக்க மியூசியம்கள்ல இருக்கு.", { action: "dance", overlay: { kind: "card", text: "சோழர் வெண்கலம்", small: "நடராஜர் சிலை", icon: "✨" } }),
  L(42, "k6", "brihadeeswarar", "இதுவரைக்கும் பிடிச்சிருக்கா? அப்போ ஒரு லைக் போட்டுடுங்க! இன்னும் சப்ஸ்க்ரைப் பண்ணலைன்னா, இப்பவே பண்ணிடுங்க!", { action: "thumbs", fx: "hearts", overlay: { kind: "cta", buttons: ["like", "subscribe", "bell"], text: "பிடிச்சிருக்கா? 😊" } }),

  // ── 5. Pandyas, the Sultans and the Nayaks ──
  L(43, "k7", "meenakshi", "பதிமூணாம் நூற்றாண்டுல, பாண்டியர்கள் மறுபடியும் பெரிய சக்தியா வந்தாங்க. மதுரை தான் அவங்க தலைநகரம்.", { chapter: "பாண்டியர் முதல் நாயக்கர் வரை", sub: "13-ஆம் நூற்றாண்டுல, பாண்டியர்கள் மறுபடியும் பெரிய சக்தியா வந்தாங்க. மதுரை தான் அவங்க தலைநகரம்.", action: "point", overlay: { kind: "pin", text: "மதுரை", small: "பாண்டியர் தலைநகரம் 🐟" } }),
  L(44, "k7", "madurai", "மார்கோ போலோன்னு ஒரு வெளிநாட்டுப் பயணி வந்து, பாண்டிய நாட்டோட முத்துக்களையும் செல்வத்தையும் பார்த்து, அசந்து போய் எழுதியிருக்காரு!", { action: "surprised", fx: "sparkles", overlay: { kind: "card", text: "மார்கோ போலோ", small: "முத்துக்களைப் பார்த்து அசந்தார்", icon: "🧭" } }),
  L(45, "k7", "madurai", "அப்புறம், டெல்லி சுல்தான் படைகள், தெற்கு நோக்கி படையெடுத்து வந்தாங்க.", { action: "scared", overlay: { kind: "route", from: "டெல்லி", to: "மதுரை", icons: ["⚔️", "🐎"] } }),
  L(46, "k7", "madurai", "அதுக்கு அப்புறம் விஜயநகரப் பேரரசு வந்துச்சு. அவங்க சார்பா இங்க ஆட்சி செஞ்சவங்க தான், நாயக்கர்கள்.", { action: "nod", overlay: { kind: "morph", from: "விஜயநகரம்", to: "நாயக்கர்கள்" } }),
  L(47, "k7", "thirumalai-mahal", "திருமலை நாயக்கர் கட்டின மஹால், இன்னைக்கும் மதுரையில கம்பீரமா இருக்கு.", { action: "point", overlay: { kind: "title", text: "திருமலை நாயக்கர் மஹால்", small: "மதுரை" } }),
  L(48, "k7", "meenakshi", "மீனாட்சி அம்மன் கோயிலோட பல உயரமான கோபுரங்கள், நாயக்கர் காலத்துல தான் பெருசா கட்டப்பட்டது.", { action: "look-up", overlay: { kind: "card", text: "மீனாட்சி அம்மன் கோயில்", small: "உயர்ந்த கோபுரங்கள்", icon: "🛕" } }),

  // ── 6. The Europeans and the first revolts ──
  L(49, "k8", "tranquebar", "அப்புறம், கடல் வழியா வெளிநாட்டுக்காரங்க வர ஆரம்பிச்சாங்க. போர்ச்சுகீசியர், டச்சு, டேனிஷ், பிரெஞ்சு, ஆங்கிலேயர்!", { chapter: "வெளிநாட்டவர் வருகை", action: "look-up", overlay: { kind: "list", items: ["🇵🇹", "🇳🇱", "🇩🇰", "🇫🇷", "🇬🇧"] } }),
  L(50, "k8", "fort-st-george", "ஆயிரத்து அறுநூத்தி முப்பத்தி ஒம்பதுல, ஆங்கிலேயர்கள் கடற்கரையில ஒரு சின்ன இடம் வாங்கி, புனித ஜார்ஜ் கோட்டையை கட்டினாங்க.", { sub: "1639-ல, ஆங்கிலேயர்கள் கடற்கரையில ஒரு சின்ன இடம் வாங்கி, புனித ஜார்ஜ் கோட்டையை கட்டினாங்க.", action: "point", overlay: { kind: "year", value: 1639, prefix: "கி.பி. ", label: "புனித ஜார்ஜ் கோட்டை 🏰" } }),
  L(51, "k8", "chennai", "அந்த சின்ன இடம் தான், பின்னாடி மெட்ராஸா வளர்ந்து, இன்னைக்கு நம்ம சென்னை!", { action: "surprised", overlay: { kind: "morph", from: "மெட்ராஸ்", to: "சென்னை 🏙️" } }),
  L(52, "k8", "vellore-fort", "ஆனா நம்ம ஆளுங்க சும்மா இருக்கல! ஆங்கிலேயர்களை எதிர்த்து, ரொம்ப முன்னாடியே போராடினாங்க!", { action: "fist", overlay: { kind: "stamp", text: "சும்மா இருக்கல! 💪" } }),
  L(53, "k8", "velu-nachiyar", "சிவகங்கை ராணி வேலு நாச்சியார், ஆங்கிலேயர்களோட சண்டை போட்டு, தன்னோட நாட்டை திரும்ப மீட்டாங்க!", { action: "salute", overlay: { kind: "card", text: "வேலு நாச்சியார்", small: "சிவகங்கை ராணி", icon: "👸" } }),
  L(54, "k8", "kattabomman", "வீரபாண்டிய கட்டபொம்மன், வரி கட்ட மாட்டேன்னு தைரியமா நின்னாரு. ஆயிரத்து எழுநூத்தி தொண்ணூத்தி ஒம்பதுல, அவரை தூக்கிலிட்டாங்க.", { sub: "வீரபாண்டிய கட்டபொம்மன், வரி கட்ட மாட்டேன்னு தைரியமா நின்னாரு. 1799-ல, அவரை தூக்கிலிட்டாங்க.", action: "sad", overlay: { kind: "year", value: 1799, prefix: "கி.பி. ", label: "வீரபாண்டிய கட்டபொம்மன்" } }),
  L(55, "k8", "vellore-fort", "மருது சகோதரர்கள், வேலூர் புரட்சி... இதெல்லாம், ஆயிரத்து எண்ணூத்தி ஐம்பத்தி ஏழு சிப்பாய் கலகத்துக்கு முன்னாடியே நடந்தது!", { sub: "மருது சகோதரர்கள், வேலூர் புரட்சி... இதெல்லாம், 1857 சிப்பாய் கலகத்துக்கு முன்னாடியே நடந்தது!", action: "proud", overlay: { kind: "list", items: ["⚔️ மருது சகோதரர்கள்", "🏰 வேலூர் புரட்சி", "⏮️ 1857-க்கு முன்பே!"] } }),

  // ── 7. Freedom and Tamil Nadu ──
  L(56, "k9", "voc", "இருபதாம் நூற்றாண்டுல, சுதந்திரப் போராட்டத்துலயும், தமிழ்நாடு முன்னாடி நின்னுச்சு.", { chapter: "சுதந்திரப் போராட்டம்", sub: "20-ஆம் நூற்றாண்டுல, சுதந்திரப் போராட்டத்துலயும், தமிழ்நாடு முன்னாடி நின்னுச்சு.", action: "salute", overlay: { kind: "title", text: "சுதந்திரப் போராட்டம் 🇮🇳" } }),
  L(57, "k9", "voc", "வ. உ. சிதம்பரனார், ஆங்கிலேயர்களுக்கு போட்டியா, நம்ம சொந்த கப்பல் கம்பெனியையே ஆரம்பிச்சாரு. அதனால தான் அவரு, கப்பலோட்டிய தமிழன்!", { action: "point", overlay: { kind: "card", text: "கப்பலோட்டிய தமிழன்", small: "வ. உ. சிதம்பரனார்", icon: "🚢" } }),
  L(58, "k9", "bharathi", "பாரதியார், தன்னோட பாட்டுகளால, மக்களுக்கு சுதந்திர தைரியம் கொடுத்தாரு.", { action: "proud", overlay: { kind: "card", text: "மகாகவி பாரதியார்", small: "பாட்டால் சுதந்திர தைரியம்", icon: "🔥" } }),
  L(59, "k9", "flag", "திருப்பூர் குமரன், அடி வாங்கினாலும், கையில இருந்த கொடியை கீழ விடவே இல்ல!", { action: "salute", overlay: { kind: "card", text: "கொடி காத்த குமரன்", small: "திருப்பூர் குமரன்", icon: "🇮🇳" } }),
  L(60, "k9", "flag", "ஆயிரத்து தொள்ளாயிரத்து நாற்பத்தி ஏழுல, இந்தியாவுக்கு சுதந்திரம் கிடைச்சுது!", { sub: "1947-ல, இந்தியாவுக்கு சுதந்திரம் கிடைச்சுது!", action: "celebrate", fx: "confetti", overlay: { kind: "year", value: 1947, label: "சுதந்திரம்! 🇮🇳" } }),
  L(61, "k9", "school", "காமராஜர் முதலமைச்சரா இருந்தப்போ, ஊர் ஊருக்கு பள்ளிக்கூடம் திறந்தாரு. பசங்க பசியோட படிக்கக் கூடாதுன்னு, மதிய உணவு திட்டத்தையும் பெருசாக்கினாரு.", { action: "eat", overlay: { kind: "list", items: ["🏫 ஊர் ஊருக்கு பள்ளி", "🍛 மதிய உணவு"] } }),
  L(62, "k9", "secretariat", "ஆயிரத்து தொள்ளாயிரத்து அறுபத்தி ஒம்பது, ஜனவரி பதினாலாம் தேதி, மெட்ராஸ் மாநிலத்துக்கு தமிழ்நாடுன்னு பேர் வந்துச்சு! அப்போ முதலமைச்சர், அண்ணா.", { sub: "1969, ஜனவரி 14-ஆம் தேதி, மெட்ராஸ் மாநிலத்துக்கு தமிழ்நாடுன்னு பேர் வந்துச்சு! அப்போ முதலமைச்சர், அண்ணா.", action: "clap", fx: "confetti", overlay: { kind: "morph", from: "மெட்ராஸ் மாநிலம்", to: "தமிழ்நாடு 🎉" } }),

  // ── Today, and goodbye ──
  L(63, "k10", "chennai", "இன்னைக்கு தமிழ்நாடு, கார் தொழிற்சாலைகள், சாஃப்ட்வேர், படிப்பு, மருத்துவம்னு, எல்லாத்துலயும் முன்னாடி இருக்கு!", { chapter: "இன்றைய தமிழ்நாடு", action: "thumbs", overlay: { kind: "list", items: ["🚗 கார்", "💻 சாஃப்ட்வேர்", "🎓 படிப்பு", "🏥 மருத்துவம்"] } }),
  L(64, "k10", ["keezhadi", "brihadeeswarar", "chennai"], "கீழடி மண் பானையில இருந்து, தஞ்சை பெரிய கோயில் வரைக்கும், இன்னைக்கு சென்னை வரைக்கும்... நம்ம கதை இன்னும் தொடருது!", { host: "big", action: "proud", fx: "sparkles", overlay: { kind: "title", text: "நம்ம கதை தொடருது..." } }),
  L(65, "k10", "brihadeeswarar", "அவ்ளோ தான் நண்பர்களே! என்னோட முதல் வீடியோ உங்களுக்கு பிடிச்சிருந்தா, ஒரு லைக் போடுங்க.", { action: "thumbs", overlay: { kind: "cta", buttons: ["like"], text: "பிடிச்சிருந்தா LIKE 👍" } }),
  L(66, "k10", "brihadeeswarar", "உங்க ஃப்ரெண்ட்ஸ், ஃபேமிலி எல்லாருக்கும் ஷேர் பண்ணுங்க.", { action: "share", overlay: { kind: "cta", buttons: ["share"], text: "ஃப்ரெண்ட்ஸ், ஃபேமிலிக்கு 📤" } }),
  L(67, "k10", "brihadeeswarar", "அடுத்த வீடியோல எதைப் பத்தி பேசலாம்? நீங்களே கமெண்ட்ல சொல்லுங்க! நான் எல்லா கமெண்ட்டையும் படிப்பேன்!", { action: "think", overlay: { kind: "comment", text: "அடுத்து இதைப் பத்தி பேசுங்க! 🙋" } }),
  L(68, "k10", "brihadeeswarar", "இது என்னோட முதல் வீடியோ. உங்க சப்போர்ட் தான் எனக்கு எல்லாமே! மறக்காம சப்ஸ்க்ரைப் பண்ணிடுங்க, பெல் ஐகானையும் அழுத்திடுங்க!", { action: "please", fx: "hearts", overlay: { kind: "cta", buttons: ["subscribe", "bell"], text: "உங்க சப்போர்ட் தான் எல்லாமே ❤️" } }),
  L(69, "k10", "brihadeeswarar", "மறுபடியும் அடுத்த வீடியோல சந்திப்போம். டாட்டா! பை பை!", { action: "wave", fx: "confetti", overlay: { kind: "title", text: "டாட்டா! பை பை! 👋" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  brihadeeswarar: { q: "Brihadeeswarar Temple Thanjavur" },
  "brihadeeswarar-2": { q: "Thanjavur Big Temple vimana" },
  "shore-temple": { q: "Shore Temple Mahabalipuram" },
  meenakshi: { q: "Meenakshi Amman Temple", file: "File:S-TN-34 Meenakshi Amman Temple South Gopuram enriched with delicate Stucco works.jpg" },
  "fort-st-george": { q: "Fort St. George Chennai" },
  keezhadi: { q: "Keezhadi excavation" },
  "keezhadi-2": { q: "Keeladi excavation site" },
  "tamil-brahmi": { q: "Tamil Brahmi inscription" },
  adichanallur: { q: "Adichanallur urn" },
  "tamil-nadu-map": { q: "South India in Sangam Period", file: "File:South India in Sangam Period.jpg" },
  "palm-leaf": { q: "Palm leaf Tholkaapiam", file: "File:Palm leaf - Tamil Tholkaapiam.JPG" },
  thiruvalluvar: { q: "Thiruvalluvar Statue Kanyakumari" },
  ship: { q: "dhow sailing ship ocean" },
  "roman-coins": { q: "Roman coins found in India" },
  kailasanathar: { q: "Kailasanathar Temple Kanchipuram" },
  "pancha-rathas": { q: "Pancha Rathas Mahabalipuram" },
  "arjuna-penance": { q: "Descent of the Ganges Mahabalipuram" },
  "chola-map": { q: "Chola empire map Rajendra" },
  rajaraja: { q: "Brihadeeswarar Temple Thanjavur", file: "File:Brihadisvara Temple during Maha Shivaratri-WUS03611 (edit).jpg" },
  gangaikonda: { q: "Gangaikonda Cholapuram temple" },
  uthiramerur: { q: "Uthiramerur temple", file: "File:Vaikunta Perumal temple Uthiramerur Panorama (2).jpg" },
  nataraja: { q: "Chola bronze Nataraja" },
  madurai: { q: "Madurai city view temple towers" },
  "thirumalai-mahal": { q: "Thirumalai Nayak Palace Madurai" },
  tranquebar: { q: "Dansborg Tranquebar" },
  chennai: { q: "Chennai skyline" },
  "vellore-fort": { q: "Vellore Fort" },
  "velu-nachiyar": { q: "Velu Nachiyar stamp", file: "File:Velu Nachchiyar 2008 stamp of India.jpg" },
  kattabomman: { q: "Veerapandiya Kattabomman" },
  voc: { q: "V. O. Chidambaram Pillai", file: "File:V. O. Chidambaram Pillai.jpg" },
  bharathi: { q: "Subramania Bharati", file: "File:Subramanya Bharathi.jpg" },
  flag: { q: "Flag of India waving" },
  school: { q: "Tamil Nadu school children classroom" },
  secretariat: { q: "Tamil Nadu Secretariat", file: "File:Tamil Nadu legislative assembly-secretariat complex as seen from Chennai MRTS.JPG" },
  marina: { q: "Marina Beach Chennai", file: "File:Marina beach, Chennai aerial view.jpg" },
};

/** Each Short's last line: what the next part is about, and that the full video is on the channel. */
const SHORT_ENDS: ExLine[] = [
  L(9001, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, சங்க காலம் பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9002, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, பல்லவர்கள் பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9003, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, சோழர்கள் பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9004, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, பாண்டியர்களும் நாயக்கர்களும் பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9005, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, வெளிநாட்டுக்காரங்க வந்த கதை பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9006, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, சுதந்திரப் போராட்டம் பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9007, "e1", "brihadeeswarar", "அடுத்த பாகத்துல, இன்றைய தமிழ்நாடு பத்தி பேசலாம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. சப்ஸ்க்ரைப் பண்ணிடுங்க!"),
  L(9008, "e1", "brihadeeswarar", "இது தான் கடைசி பாகம்! முழு வீடியோ நம்ம சேனல்ல இருக்கு. அடுத்து எதைப் பத்தி பேசலாம்னு கமெண்ட்ல சொல்லுங்க!"),
];

export const TN_HISTORY: ExVideo = {
  slug: "01 Tamil Nadu Varalaaru",
  title: "தமிழ்நாடு வரலாறு",
  lines: LINES,
  extraLines: SHORT_ENDS,
  images: IMAGES,
  ...HOST_VOICE,
};
