/**
 * "போன் நம்ம மூளையை எப்படி கட்டிப் போடுது?" — Ulagam Ippo's eighth video:
 * phone / Shorts addiction and the brain. Same boy host and voice; a new look
 * (the user wants each video different). Soft subscribe ask, 5+ min.
 *
 * Facts kept straight (checked 2026-11-16):
 * - EY (with FICCI) media & entertainment report, March 2025: Indians averaged
 *   about 5 hours a day on smartphones in 2024, ~70% of it on social media,
 *   games and video; 1.1 trillion hours in all (= 1.1 lakh crore hours).
 * - Dopamine: a brain chemical tied to wanting / reward-seeking (said simply).
 * - Variable rewards (unpredictable, like a slot machine), endless feeds and
 *   autoplay keep people scrolling; more time = more ads (the business model).
 * - Gloria Mark (UC Irvine): average time on one screen before switching was
 *   ~2.5 min in 2004, ~47 s in studies from 2016–2020 (information workers).
 * - Ophir, Nass & Wagner, Stanford 2009: heavy media multitaskers were worse
 *   at filtering out irrelevant information.
 * - Evening screen light can delay melatonin ("studies say", "can").
 * - The prefrontal cortex keeps maturing into the mid-20s (~25).
 * - WHO 2019: no sedentary screen time under 2 years; 2–4 years at most 1 hour a day.
 * - Nomophobia = fear of being without a phone; phantom vibrations are common.
 * - 20-20-20 rule for eyes (American Academy of Ophthalmology).
 * - NIMHANS Bengaluru SHUT clinic (Service for Healthy Use of Technology), since 2014.
 *   Tele-MANAS 14416: free 24×7 government mental-health helpline.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── The hook ──
  L(1, "k1", "phone-hand", "ஒரு ஷார்ட்ஸ் மட்டும் பார்க்கலாம்னு, போனை எடுப்பீங்க. அப்புறம் பார்த்தா, ஒரு மணி நேரம் ஓடிப் போயிருக்கும்!", { host: "big", action: "surprised", overlay: { kind: "title", text: "ஒண்ணு மட்டும் தான்...", small: "அப்புறம் 1 மணி நேரம்!" } }),
  L(2, "k1", "phone-hand", "இது உங்களுக்கும் நடந்திருக்கா? இது உங்க தப்பு மட்டும் இல்ல. உங்க மூளையோட வேலையும், அந்த ஆப்போட டிசைனும் தான் காரணம்!", { action: "think", overlay: { kind: "morph", from: "என் தப்பு மட்டுமா?", to: "மூளை + ஆப் டிசைன்" } }),
  L(3, "k1", "brain", "இன்னைக்கு, போன் நம்ம மூளையை எப்படிக் கட்டிப் போடுதுன்னு, உள்ள போய்ப் பார்க்கலாம். கடைசியில, அதுல இருந்து தப்பிக்க, அஞ்சு சூப்பர் வழிகளும் இருக்கு!", { action: "idea", overlay: { kind: "list", items: ["மூளையோட ரகசியம்", "ஆப்போட ட்ரிக்", "தப்பிக்க 5 வழிகள்"] } }),
  L(4, "k1", "brain", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். இந்த மாதிரி வீடியோ உங்களுக்குப் பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. கட்டாயம் இல்ல, பிடிச்சா மட்டும் போதும்!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "கட்டாயம் இல்ல" } }),

  // ── 1. How much time ──
  L(5, "k2", "phones-india", "முதல்ல, ஒரு கணக்கு. இந்தியாவுல, ஒருத்தர் ஒரு நாளைக்கு, சராசரியா அஞ்சு மணி நேரம், போன்லயே இருக்காங்களாம்!", { chapter: "எவ்ளோ நேரம் போன்ல?", host: "corner", sub: "முதல்ல, ஒரு கணக்கு. இந்தியாவுல, ஒருத்தர் ஒரு நாளைக்கு, சராசரியா 5 மணி நேரம், போன்லயே இருக்காங்களாம்!", action: "surprised", overlay: { kind: "year", value: 5, suffix: " மணி நேரம் / நாள்", label: "இந்தியா சராசரி" } }),
  L(6, "k2", "phone-notifications", "அதுல கிட்டத்தட்ட எழுபது சதவீதம், சோஷியல் மீடியா, கேம்ஸ், வீடியோக்கள் தான்!", { sub: "அதுல கிட்டத்தட்ட 70 சதவீதம், சோஷியல் மீடியா, கேம்ஸ், வீடியோக்கள் தான்!", action: "count", overlay: { kind: "meter", label: "சோஷியல் மீடியா · கேம்ஸ் · வீடியோ", from: 0.05, to: 0.7, small: "70%" } }),
  L(7, "k2", "hourglass", "இரண்டாயிரத்து இருபத்தி நாலுல மட்டும், இந்தியர்கள் எல்லாரும் சேர்ந்து, போன்ல செலவழிச்ச நேரம், ஒரு லட்சத்து பத்தாயிரம் கோடி மணி நேரம்!", { sub: "2024-ல மட்டும், இந்தியர்கள் எல்லாரும் சேர்ந்து, போன்ல செலவழிச்ச நேரம், 1,10,000 கோடி மணி நேரம்!", action: "scared", overlay: { kind: "year", value: 110_000, suffix: " கோடி மணி நேரம்", label: "2024 · இந்தியா முழுக்க" } }),
  L(8, "k2", "hourglass", "சரி, ஏன் இப்படி போனை கீழ வைக்கவே முடியல? நம்ம மூளைக்குள்ள போய்ப் பார்க்கலாம்!", { action: "whisper", overlay: { kind: "type", text: "ஏன் கீழ வைக்கவே முடியல?" } }),

  // ── 2. The brain's secret ──
  L(9, "k3", "dopamine", "நம்ம மூளையில, டோபமைன்னு ஒரு கெமிக்கல் இருக்கு.", { chapter: "மூளையோட ரகசியம்: டோபமைன்", action: "point", overlay: { kind: "title", text: "டோபமைன்", small: "Dopamine" } }),
  L(10, "k3", "brain", "ஏதாவது நல்லது கிடைக்கப் போகுதுன்னு தோணும் போது, இந்த டோபமைன் சுரக்கும். இன்னும் வேணும், இன்னும் வேணும்னு, நம்மைத் திரும்பத் திரும்பத் தேட வைக்கும்.", { action: "idea", overlay: { kind: "flow", items: ["எதிர்பார்ப்பு", "டோபமைன்", "இன்னும் வேணும்!"] } }),
  L(11, "k3", "kids-play", "இது நல்ல விஷயம் தான். சாப்பாடு, விளையாட்டு, நண்பர்கள், இதுக்கெல்லாம், இது தான் நம்மைத் தூண்டுது.", { action: "thumbs", overlay: { kind: "list", items: ["சாப்பாடு", "விளையாட்டு", "நண்பர்கள்"] } }),
  L(12, "k3", "phone-notifications", "ஆனா போன், இந்த டோபமைனை, நாள் முழுக்க, திரும்பத் திரும்பத் தூண்டி விடுது. ஒவ்வொரு லைக், ஒவ்வொரு நோட்டிஃபிகேஷன், ஒவ்வொரு புது வீடியோ!", { action: "surprised", overlay: { kind: "list", items: ["ஒரு புது லைக்", "ஒரு நோட்டிஃபிகேஷன்", "இன்னொரு புது வீடியோ"] } }),

  // ── 3. The app's trick ──
  L(13, "k4", "slot-machine", "இப்போ, ஒரு பெரிய ரகசியம். உங்க போன் ஆப்ஸ், ஒரு சூதாட்ட மெஷின் மாதிரி வேலை செய்யுது!", { chapter: "ஆப்போட ட்ரிக்", action: "scared", overlay: { kind: "stamp", text: "சூதாட்ட மெஷின்!" } }),
  L(14, "k4", "slot-machine", "சூதாட்ட மெஷின்ல, எப்போ பரிசு விழும்னு தெரியாது. அதனால தான், இன்னொரு தடவை, இன்னொரு தடவைன்னு, இழுத்துக்கிட்டே இருப்பாங்க.", { action: "shrug", overlay: { kind: "title", text: "எப்போ பரிசு? தெரியாது!" } }),
  L(15, "k4", "phone-hand", "ஷார்ட்ஸ்லயும் அதே தான். அடுத்த வீடியோ சூப்பரா இருக்குமா? தெரியாது. அதனால, ஸ்க்ரோல், ஸ்க்ரோல், ஸ்க்ரோல்!", { action: "point-down", overlay: { kind: "type", text: "ஸ்க்ரோல்... ஸ்க்ரோல்... ஸ்க்ரோல்..." } }),
  L(16, "k4", "phone-hand", "அதோட, இந்த ஃபீடுக்கு முடிவே கிடையாது. ஒரு வீடியோ முடிஞ்சதும், அடுத்தது தானா ஓட ஆரம்பிச்சிடும். நிறுத்துற இடமே இல்ல!", { action: "count", overlay: { kind: "list", items: ["முடிவே இல்லாத ஃபீடு", "தானா ஓடுற அடுத்த வீடியோ", "நிறுத்த இடமே இல்ல"] } }),
  L(17, "k4", "billboards", "இது தற்செயல் இல்ல. நீங்க எவ்ளோ நேரம் இருக்கீங்களோ, அவ்ளோ விளம்பரம், அவ்ளோ காசு, அந்த கம்பெனிகளுக்கு!", { action: "idea", overlay: { kind: "flow", items: ["உங்க நேரம்", "விளம்பரம்", "கம்பெனிக்கு காசு"] } }),
  L(18, "k4", "friends", "இந்த விஷயம் உங்களுக்குப் புதுசா இருந்தா, ஒரு லைக் போடுங்க. எப்பவும் போன்லயே இருக்கிற, ஒரு நண்பருக்கு ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "நண்பருக்கு SHARE" } }),

  // ── 4. Attention ──
  L(19, "k5", "office-screen", "சரி, இதனால என்ன ஆகுது? முதல் பாதிப்பு, நம்ம கவனம்!", { chapter: "கவனம் சிதறுது", action: "think", overlay: { kind: "title", text: "கவனம் சிதறுது", small: "பாதிப்பு 1" } }),
  L(20, "k5", "office-screen", "அமெரிக்காவுல, குளோரியா மார்க்னு ஒரு விஞ்ஞானி, மக்கள் ஒரு ஸ்க்ரீன்ல, எவ்ளோ நேரம் கவனம் வைக்கிறாங்கன்னு, பல வருஷமா அளந்தாங்க.", { action: "point", overlay: { kind: "type", text: "ஒரு ஸ்க்ரீன்ல எவ்ளோ நேரம்?" } }),
  L(21, "k5", "stopwatch", "இரண்டாயிரத்து நாலுல, கிட்டத்தட்ட இரண்டரை நிமிஷம். சமீபத்திய ஆய்வுகள்ல? வெறும் நாப்பத்தியேழு வினாடி தான்!", { sub: "2004-ல, கிட்டத்தட்ட இரண்டரை நிமிஷம். சமீபத்திய ஆய்வுகள்ல? வெறும் 47 வினாடி தான்!", action: "surprised", overlay: { kind: "morph", from: "2004: 2½ நிமிஷம்", to: "இப்போ: 47 வினாடி!" } }),
  L(22, "k5", "multitask", "ஒரே நேரத்துல நிறைய விஷயம் பார்க்கிறவங்க, தேவையில்லாததை ஒதுக்கி வைக்கிறதுல, இன்னும் கஷ்டப்பட்டாங்கன்னு, ஒரு ஸ்டான்ஃபோர்ட் ஆய்வு சொல்லுது.", { action: "shrug", overlay: { kind: "title", text: "மல்டிடாஸ்கிங் = குழப்பம்", small: "Stanford ஆய்வு, 2009" } }),
  L(23, "k5", "study-desk", "படிக்கும் போது, பக்கத்துல போன் இருந்தா, ஒவ்வொரு டிங்குக்கும், மனசு அங்க ஓடிடும். திரும்பப் படிப்புல கவனம் வைக்க, நேரம் ஆகும்.", { action: "sad", overlay: { kind: "meter", label: "படிப்புல கவனம்", from: 0.85, to: 0.3, small: "ஒவ்வொரு டிங்குக்கும் குறையுது" } }),

  // ── 5. Sleep ──
  L(24, "k6", "night-phone", "ரெண்டாவது பாதிப்பு, தூக்கம்.", { chapter: "தூக்கம் கெடுது", action: "sad", overlay: { kind: "title", text: "தூக்கம் கெடுது", small: "பாதிப்பு 2" } }),
  L(25, "k6", "night-phone", "ராத்திரி படுக்கையில, இன்னும் ஒரே ஒரு வீடியோன்னு பார்த்துக்கிட்டே இருந்தா, தூங்குற நேரம் தள்ளிப் போயிடும்.", { action: "whisper", overlay: { kind: "morph", from: "இன்னும் ஒரே ஒரு வீடியோ", to: "மணி ஒண்ணு ஆயிடுச்சு!" } }),
  L(26, "k6", "melatonin", "போனோட வெளிச்சம், தூக்கத்துக்கு உதவுற, மெலடோனின்ங்கிற ஹார்மோனையும், தாமதப்படுத்தலாம்னு, ஆய்வுகள் சொல்லுது.", { action: "point", overlay: { kind: "title", text: "மெலடோனின் தாமதம்", small: "தூக்க ஹார்மோன்" } }),
  L(27, "k6", "alarm", "தூக்கம் குறைஞ்சா, காலையில எரிச்சல், சோர்வு, படிப்புல கவனம் இருக்காது. அப்புறம், அந்த சோர்வைப் போக்க, மறுபடியும் போன்!", { action: "shrug", overlay: { kind: "flow", items: ["தூக்கம் குறைவு", "சோர்வு", "மறுபடியும் போன்"] } }),

  // ── 6. Children's brains ──
  L(28, "k7", "child-tablet", "மூணாவது பாதிப்பு, ரொம்ப முக்கியம். குழந்தைங்களோட மூளை.", { chapter: "குழந்தைங்க மூளை", action: "surprised", overlay: { kind: "title", text: "குழந்தைங்க மூளை", small: "பாதிப்பு 3" } }),
  L(29, "k7", "brain", "நம்ம மூளையில, நெத்திக்குப் பின்னாடி இருக்கிற பகுதி தான், போதும், நிறுத்துன்னு, பிரேக் போடுற வேலையைப் பார்க்குது.", { action: "point", overlay: { kind: "title", text: "மூளையோட பிரேக்", small: "முன் மூளை · Prefrontal cortex" } }),
  L(30, "k7", "brain", "அந்த பிரேக், முழுசா வளர்ந்து முடிய, கிட்டத்தட்ட இருபத்தியஞ்சு வயசு ஆகுமாம்!", { sub: "அந்த பிரேக், முழுசா வளர்ந்து முடிய, கிட்டத்தட்ட 25 வயசு ஆகுமாம்!", action: "count", overlay: { kind: "year", value: 25, suffix: " வயசு", label: "பிரேக் முழுசா வளர" } }),
  L(31, "k7", "child-tablet", "அதனால தான், எங்களை மாதிரி பசங்களுக்கு, போனை கீழ வைக்கிறது, ரொம்பக் கஷ்டம்.", { action: "sad", overlay: { kind: "type", text: "அதனால தான் நிறுத்த முடியல..." } }),
  L(32, "k7", "who", "உலக சுகாதார நிறுவனம் சொல்றது: ரெண்டு வயசுக்குள்ள குழந்தைக்கு, ஸ்க்ரீனே வேண்டாம். ரெண்டுல இருந்து நாலு வயசு வரைக்கும், ஒரு நாளைக்கு, ஒரு மணி நேரத்துக்கு மேல வேண்டாம்.", { action: "nod", overlay: { kind: "list", items: ["2 வயசுக்குள்ள: ஸ்க்ரீன் வேண்டாம்", "2–4 வயசு: 1 மணி நேரம் மட்டும்"] } }),
  L(33, "k7", "child-tablet", "சாப்பிடும் போதும், அழும் போதும், குழந்தை கையில போனைக் குடுக்கிறது, ஈஸி தான். ஆனா, அது பழக்கமா மாறிடும்.", { action: "please", overlay: { kind: "stamp", text: "ஈஸி, ஆனா ஆபத்து!" } }),

  // ── 7. Are you hooked? ──
  L(34, "k8", "lock-screen", "சரி, நீங்க போனுக்கு அடிமையாயிட்டீங்களான்னு, எப்படித் தெரிஞ்சுக்கிறது? இந்த அறிகுறிகளைப் பாருங்க.", { chapter: "நீங்க மாட்டிக்கிட்டீங்களா?", action: "think", overlay: { kind: "title", text: "அறிகுறிகள்", small: "செக் பண்ணுங்க" } }),
  L(35, "k8", "lock-screen", "காலையில கண் முழிச்சதும், முதல் வேலை போன் தான். எந்தக் காரணமும் இல்லாம, சும்மா சும்மா அன்லாக் பண்றது.", { action: "count", overlay: { kind: "list", items: ["கண் முழிச்சதும் போன்", "சும்மா சும்மா அன்லாக்"] } }),
  L(36, "k8", "low-battery", "போன் அதிராமலேயே, அதிர்ற மாதிரி தோணுறது. போன் கையில இல்லன்னா, ஒரு பதட்டம்.", { action: "scared", overlay: { kind: "list", items: ["அதிராமலே அதிர்ற மாதிரி", "போன் இல்லன்னா பதட்டம்"] } }),
  L(37, "k8", "low-battery", "இதுக்கு பேர் கூட இருக்கு! போன் இல்லாம இருக்கப் பயப்படுறதுக்கு, நோமோஃபோபியான்னு சொல்றாங்க.", { action: "surprised", overlay: { kind: "title", text: "நோமோஃபோபியா", small: "No-mobile-phobia" } }),
  L(38, "k8", "sunrise-walk", "இதுல ரெண்டு மூணு உங்களுக்கு இருந்தா, கவலைப்படாதீங்க. இது ஒரு பழக்கம் தான். பழக்கத்தை மாத்த முடியும்!", { action: "nod", overlay: { kind: "morph", from: "அடிமை ஆயிட்டேன்...", to: "மாத்த முடியும்!" } }),

  // ── 8. Five ways out ──
  L(39, "k9", "phone-settings", "இப்போ, போனை நம்ம கட்டுப்பாட்டுல வைக்க, அஞ்சு சூப்பர் வழிகள்!", { chapter: "தப்பிக்க 5 வழிகள்", action: "idea", overlay: { kind: "title", text: "5 வழிகள்", small: "இன்னைக்கே ட்ரை பண்ணுங்க" } }),
  L(40, "k9", "phone-settings", "ஒண்ணு: தேவையில்லாத நோட்டிஃபிகேஷன் எல்லாத்தையும், ஆஃப் பண்ணுங்க. டிங் வரலைன்னா, ஆசையும் வராது.", { action: "point", overlay: { kind: "pin", text: "நோட்டிஃபிகேஷன் OFF", small: "வழி 1" } }),
  L(41, "k9", "phone-charging", "ரெண்டு: தூங்கப் போறதுக்கு, ஒரு மணி நேரம் முன்னாடி, போன் வேண்டாம். போனை படுக்கை அறைக்கு வெளியே, சார்ஜ் போடுங்க.", { action: "nod", overlay: { kind: "pin", text: "படுக்கை அறையில போன் இல்ல", small: "வழி 2" } }),
  L(42, "k9", "hourglass", "மூணு: சோஷியல் மீடியா ஆப்ஸுக்கு, டைமர் வச்சுக்கோங்க. நேரம் முடிஞ்சா, ஆப் தானா நின்னுடும்.", { action: "count", overlay: { kind: "pin", text: "ஆப் டைமர்", small: "வழி 3" } }),
  L(43, "k10", "banana-leaf", "நாலு: சாப்பிடும் போதும், குடும்பத்தோட பேசும் போதும், போன் வேண்டாம்.", { action: "please", overlay: { kind: "pin", text: "சாப்பாட்டு நேரம் = போன் இல்லாத நேரம்", small: "வழி 4" } }),
  L(44, "k10", "kids-play", "அஞ்சு: போனுக்குப் பதிலா, ஒரு புது பழக்கம். விளையாட்டு, புத்தகம், நடை, ஓவியம். மூளைக்கு உண்மையான சந்தோஷம் கிடைக்கும்!", { action: "thumbs", overlay: { kind: "list", items: ["விளையாட்டு", "புத்தகம்", "நடை", "ஓவியம்"] } }),
  L(45, "k10", "eye", "அதோட, ஒவ்வொரு இருபது நிமிஷத்துக்கும், இருபது அடி தூரத்துல இருக்கிற ஒண்ணை, இருபது வினாடி பாருங்க. கண்ணுக்கு நல்லது!", { sub: "அதோட, ஒவ்வொரு 20 நிமிஷத்துக்கும், 20 அடி தூரத்துல இருக்கிற ஒண்ணை, 20 வினாடி பாருங்க. கண்ணுக்கு நல்லது!", action: "point", overlay: { kind: "title", text: "20 · 20 · 20", small: "கண்ணுக்கு ஓய்வு" } }),
  L(46, "k10", "handset", "இதெல்லாம் செஞ்சும் முடியலைன்னா, வெட்கப்படாதீங்க. பெங்களூரு நிம்ஹான்ஸ்ல, இதுக்குன்னே, ஷட் கிளினிக்னு ஒரு சேவை இருக்கு. அரசாங்கத்தோட இலவச உதவி எண், ஒண்ணு நாலு நாலு ஒண்ணு ஆறுலயும் பேசலாம்.", { sub: "இதெல்லாம் செஞ்சும் முடியலைன்னா, வெட்கப்படாதீங்க. பெங்களூரு NIMHANS-ல, இதுக்குன்னே, SHUT கிளினிக்னு ஒரு சேவை இருக்கு. அரசாங்கத்தோட இலவச உதவி எண் 14416-லயும் பேசலாம்.", action: "point", overlay: { kind: "title", text: "14416", small: "Tele-MANAS · NIMHANS SHUT கிளினிக்" } }),

  // ── A small request, and goodbye ──
  L(47, "k11", "father-son", "நானும் ஒரு சின்னப் பையன் தான். எனக்கும் போன் ரொம்பப் பிடிக்கும்.", { chapter: "ஒரு சின்ன வேண்டுகோள்", host: "big", action: "think", overlay: { kind: "type", text: "எனக்கும் போன் பிடிக்கும்..." } }),
  L(48, "k11", "father-son", "ஆனா அப்பா, அம்மா, எப்பவும் போன்லயே இருந்தா, எங்களுக்குக் கொஞ்சம் கஷ்டமா இருக்கு. எங்க கூடயும் கொஞ்சம் பேசுங்க, விளையாடுங்க.", { action: "please", overlay: { kind: "title", text: "எங்க கூடயும் பேசுங்க" } }),
  L(49, "k11", "sunrise-walk", "போன் ஒரு நல்ல கருவி தான். ஆனா, நாம தான் போனை யூஸ் பண்ணணும். போன் நம்மை யூஸ் பண்ணக் கூடாது!", { action: "nod", overlay: { kind: "morph", from: "போன் நம்மை யூஸ் பண்ணுது", to: "நாம போனை யூஸ் பண்ணணும்!" } }),
  L(50, "k11", "sunrise-walk", "இந்த வீடியோவை, எப்பவும் போன்லயே இருக்கிற ஒருத்தருக்கு அனுப்புங்க. ஆனா, அனுப்பிட்டு, போனைக் கொஞ்சம் கீழ வச்சிடுங்க!", { action: "share", overlay: { kind: "type", text: "அனுப்பிட்டு, போனை கீழ வைங்க!" } }),
  L(51, "k11", "sunrise-walk", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்? கமெண்ட்ல சொல்லுங்க. வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. மறுபடியும் சந்திப்போம். டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "அடுத்த வீடியோ? COMMENT", small: "பிடிச்சா SUBSCRIBE · டாட்டா!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. Objects over faces. */
const IMAGES: ExVideo["images"] = {
  "phone-hand": { q: "smartphone in hand" },
  brain: { q: "Blausen 0102 Brain Motor Sensory" },
  "phones-india": { q: "mobile phone shop India" },
  "phone-notifications": { q: "android smartphone home screen" },
  hourglass: { q: "hourglass sand" },
  dopamine: { q: "Dopamine 3D balls" },
  "kids-play": { q: "children playing cricket street India" },
  "slot-machine": { q: "slot machines casino" },
  billboards: { q: "Times Square billboards night" },
  friends: { q: "friends silhouette sunset" },
  "office-screen": { q: "computer workstation monitor keyboard" },
  stopwatch: { q: "stopwatch" },
  multitask: { q: "laptop and smartphone on desk" },
  "study-desk": { q: "student studying with books" },
  "night-phone": { q: "smartphone in bed at night" },
  melatonin: { q: "Melatonin molecule" },
  alarm: { q: "alarm clock morning" },
  "child-tablet": { q: "child using tablet computer" },
  who: { q: "World Health Organization headquarters Geneva" },
  "lock-screen": { q: "smartphone lock screen" },
  "low-battery": { q: "smartphone lying on table" },
  "sunrise-walk": { q: "Marina beach sunrise Chennai" },
  "phone-settings": { q: "smartphone settings screen" },
  "phone-charging": { q: "smartphone charging cable" },
  "banana-leaf": { q: "South Indian meal banana leaf" },
  eye: { q: "human eye iris macro" },
  handset: { q: "telephone handset" },
  "father-son": { q: "father son silhouette" },
};

export const PHONE: ExVideo = {
  slug: "08 Phone Addiction",
  title: "போன் நம்ம மூளையை எப்படி கட்டிப் போடுது?",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "feed",
  music: "lofi",
  thumb: {
    visual: "phone-hand",
    lines: [
      { text: "ஒரு ஷார்ட்ஸ் தான்...", size: 130, fill: "#F7F7F2" },
      { text: "1 மணி நேரம் போச்சு!", size: 150, fill: "#C6F432" },
      { text: "மூளையோட ட்ரிக்", size: 120, fill: "#FF3E8A" },
    ],
  },
  ...HOST_VOICE,
};
