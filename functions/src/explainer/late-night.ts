/**
 * "ராத்திரி 2 மணி வரை முழிச்சிருந்தா, உடம்புல என்ன ஆகும்?" — Ulagam Ippo's ninth
 * video, a follow-on to 08 (phone addiction). Told as a story: the host's elder
 * brother Karthik stays up till 2 AM on his phone, and we follow his body hour by
 * hour, 10 PM to 7 AM, then what happens if it goes on every day, then 5 ways to
 * sleep well. New "night" look (a clock that fast-forwards on each chapter) and
 * "night" music. Same boy host and voice; soft subscribe ask; 5+ min.
 *
 * Facts kept straight (checked 2026-11-19):
 * - The body clock: the suprachiasmatic nucleus in the hypothalamus, set by light
 *   through the eyes. Melatonin rises in the evening as it gets dark; bright light
 *   at night (screens included) can suppress / delay it.
 * - Growth hormone: its biggest release comes in the first deep (slow-wave) sleep,
 *   soon after falling asleep — important for growing children.
 * - Memory: sleep helps consolidate the day's learning (hippocampus → cortex).
 * - Brain "cleaning": Xie et al., Science 2013 — in mice, fluid flushing waste out of
 *   the brain (glymphatic system) rose sharply during sleep. Said as "a study on mice".
 * - Spiegel et al., Ann Intern Med 2004: 2 nights of 4 h in bed (vs 10 h) → ghrelin
 *   (hunger) +28%, leptin (fullness) -18%, more hunger and appetite for carb-rich food.
 * - Williamson & Feyer 2000 (Australia/NZ): after 17–19 h awake, performance on some
 *   tests was equal to or worse than at a blood alcohol of 0.05%.
 *   7 AM → 2 AM = 19 h awake. 2 AM → 7 AM = 5 h at most.
 * - Yoo et al., Curr Biol 2007: after a night without sleep, the amygdala reacted
 *   ~60% more to upsetting pictures.
 * - Microsleeps: a few seconds of sleep while awake; deadly when driving.
 * - AASM 2016 consensus: 6–12 years 9–12 h, 13–18 years 8–10 h; adults 7 h or more.
 * - REM (dream) sleep is weighted to the last part of the night, so a late bedtime
 *   with a fixed wake time cuts mostly REM. REM helps emotional processing and creativity.
 * - Sleep debt: weekend catch-up sleep does not fully undo it (e.g. Depner et al. 2019).
 * - Prather et al., Sleep 2015: people sleeping under 6 h were ~4.2× more likely to
 *   catch a cold after exposure to the virus than those sleeping over 7 h.
 * - Long-term short sleep is linked to obesity, type 2 diabetes, heart disease and
 *   depression ("studies link", not "causes").
 * - Caffeine's half-life is about 5 hours; morning daylight sets the body clock;
 *   naps of ~20 minutes; see a doctor for long-running insomnia.
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── The hook ──
  L(1, "k1", "night-window", "ராத்திரி ரெண்டு மணி. வீடே தூங்கிட்டு இருக்கு. ஆனா, ஒரு ரூம்ல மட்டும், ஒரு போன் வெளிச்சம்.", { host: "big", action: "whisper", sub: "ராத்திரி 2 மணி. வீடே தூங்கிட்டு இருக்கு. ஆனா, ஒரு ரூம்ல மட்டும், ஒரு போன் வெளிச்சம்.", overlay: { kind: "title", text: "ராத்திரி 2 மணி", small: "எல்லாரும் தூங்கிட்டாங்க..." } }),
  L(2, "k1", "night-phone", "அது வேற யாரும் இல்ல. எங்க அண்ணன் கார்த்திக் தான்! தினமும் இதே கதை தான்.", { action: "shrug", overlay: { kind: "type", text: "தினமும் இதே கதை..." } }),
  L(3, "k1", "night-phone", "ஆனா, அண்ணன் முழிச்சிருக்கிற அந்த நேரத்துல, அவரோட உடம்புக்குள்ள, ஒரு பெரிய வேலை நடக்கணும். அது நடக்கல! அப்போ என்ன ஆகுது?", { action: "think", overlay: { kind: "morph", from: "நடக்க வேண்டிய வேலை", to: "நடக்கவே இல்ல!" } }),
  L(4, "k1", "moon", "இன்னைக்கு, ராத்திரி பத்து மணியில இருந்து, காலையில ஏழு மணி வரைக்கும், ஒவ்வொரு மணி நேரமா, உடம்புக்குள்ள என்ன நடக்குதுன்னு பார்க்கலாம்.", { action: "idea", sub: "இன்னைக்கு, ராத்திரி 10 மணியில இருந்து, காலையில 7 மணி வரைக்கும், ஒவ்வொரு மணி நேரமா, உடம்புக்குள்ள என்ன நடக்குதுன்னு பார்க்கலாம்.", overlay: { kind: "flow", items: ["இரவு 10", "நடு ராத்திரி", "2 மணி", "காலை 7"] } }),
  L(5, "k1", "moon", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். இந்த மாதிரி வீடியோ உங்களுக்குப் பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. பிடிச்சா மட்டும் போதும்!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "கட்டாயம் இல்ல" } }),

  // ── 10 PM: the body clock ──
  L(6, "k2", "sunset", "ராத்திரி பத்து மணி. நம்ம உடம்புக்குள்ள, ஒரு கடிகாரம் இருக்கு தெரியுமா?", { chapter: "உடம்புக்குள்ள ஒரு கடிகாரம்", clock: { time: "10:00", label: "இரவு" }, host: "corner", sub: "ராத்திரி 10 மணி. நம்ம உடம்புக்குள்ள, ஒரு கடிகாரம் இருக்கு தெரியுமா?", action: "surprised", overlay: { kind: "title", text: "உடம்போட கடிகாரம்", small: "Body clock" } }),
  L(7, "k2", "brain", "மூளையோட நடுவுல இருக்கிற, ஒரு சின்ன பகுதி தான் அந்த கடிகாரம். கண்ணுல படுற வெளிச்சத்தை வச்சு, இது பகல், இது ராத்திரின்னு, அது தெரிஞ்சுக்கும்.", { action: "point", overlay: { kind: "flow", items: ["வெளிச்சம்", "கண்", "மூளையோட கடிகாரம்"] } }),
  L(8, "k2", "melatonin", "இருட்ட ஆரம்பிச்சதும், மெலடோனின்ங்கிற தூக்க ஹார்மோன் சுரக்க ஆரம்பிக்கும். உடம்பு மெதுவா சொல்லும்: தூங்குற நேரம் வந்தாச்சு!", { action: "whisper", overlay: { kind: "title", text: "மெலடோனின்", small: "தூக்க ஹார்மோன்" } }),
  L(9, "k2", "phone-glow", "ஆனா அண்ணன் கையில, பளிச்சுன்னு போன். அந்த வெளிச்சம், இன்னும் பகல் தான்னு, மூளைக்குத் தப்பா சொல்லிடும். தூக்கம் தள்ளிப் போயிடும்.", { action: "shrug", overlay: { kind: "morph", from: "தூங்கு!", to: "இன்னும் பகல் தான்!" } }),
  L(10, "k2", "gaming", "பத்தாததுக்கு, ஒரு வீடியோ, இன்னொரு வீடியோ, சாட்டிங், கேம். மூளை சுறுசுறுப்பா இருக்கு. கண்ணை மூடவே தோணல.", { action: "count", overlay: { kind: "list", items: ["இன்னொரு வீடியோ", "சாட்டிங்", "ஒரு கேம்"] } }),

  // ── 11 PM: what sleep would have done ──
  L(11, "k3", "bed", "இப்போ ஒரு நிமிஷம் யோசிங்க. அண்ணன் பதினொரு மணிக்கே தூங்கியிருந்தா, உடம்புக்குள்ள என்ன நடந்திருக்கும்?", { chapter: "தூக்கத்துல நடக்கும் மேஜிக்", clock: { time: "11:00", label: "இரவு" }, sub: "இப்போ ஒரு நிமிஷம் யோசிங்க. அண்ணன் 11 மணிக்கே தூங்கியிருந்தா, உடம்புக்குள்ள என்ன நடந்திருக்கும்?", action: "think", overlay: { kind: "type", text: "11 மணிக்கே தூங்கியிருந்தா?" } }),
  L(12, "k3", "workshop", "தூக்கம்னா, உடம்பு சும்மா படுத்துக் கிடக்கிறது இல்ல. அது ஒரு பெரிய ரிப்பேர் கடை மாதிரி. ராத்திரி முழுக்க, வேலை நடக்கும்!", { action: "idea", overlay: { kind: "stamp", text: "ரிப்பேர் கடை!" } }),
  L(13, "k3", "height", "முதல் வேலை, வளர்ச்சி. தூங்க ஆரம்பிச்ச கொஞ்ச நேரத்துல வர்ற, ஆழ்ந்த தூக்கத்துல தான், வளர்ச்சி ஹார்மோன் நிறைய சுரக்குது. பசங்க வளர, இது ரொம்ப முக்கியம்!", { action: "point", overlay: { kind: "pin", text: "வளர்ச்சி ஹார்மோன்", small: "வேலை 1" } }),
  L(14, "k3", "books", "ரெண்டாவது வேலை, ஞாபகம். அன்னைக்கு படிச்சது, பார்த்தது எல்லாத்தையும், மூளை தூக்கத்துல தான், ஒழுங்கா அடுக்கி வைக்குது.", { action: "count", overlay: { kind: "pin", text: "ஞாபகம் சேமிப்பு", small: "வேலை 2" } }),
  L(15, "k3", "brain", "மூணாவது வேலை, சுத்தம். நாள் முழுக்க மூளையில சேர்ற குப்பையை, தூக்கத்துல ஒரு திரவம் கழுவி எடுக்குதுன்னு, எலிகள் மேல செஞ்ச ஒரு ஆய்வு காட்டுச்சு.", { action: "surprised", overlay: { kind: "pin", text: "மூளை சுத்தம்", small: "வேலை 3" } }),
  L(16, "k3", "phone-glow", "அண்ணன் முழிச்சிருந்தா? இந்த மூணு வேலையும், பாதியிலேயே நின்னுடும்!", { action: "scared", overlay: { kind: "title", text: "மூணு வேலையும் பாதியில!" } }),

  // ── Midnight: the hunger ──
  L(17, "k4", "noodles", "மணி பன்னெண்டு. திடீர்னு அண்ணனுக்கு, பயங்கரப் பசி! சமையல் கட்டுக்குப் போய், நூடுல்ஸ், பிஸ்கட், சிப்ஸ்!", { chapter: "நடு ராத்திரிப் பசி", clock: { time: "12:00", label: "நடு ராத்திரி" }, sub: "மணி 12. திடீர்னு அண்ணனுக்கு, பயங்கரப் பசி! சமையல் கட்டுக்குப் போய், நூடுல்ஸ், பிஸ்கட், சிப்ஸ்!", action: "surprised", overlay: { kind: "list", items: ["நூடுல்ஸ்", "பிஸ்கட்", "சிப்ஸ்"] } }),
  L(18, "k4", "fridge", "ஏன் இந்த நேரத்துல பசிக்குது? நம்ம உடம்புல, பசியைக் கூட்டுற ஒரு ஹார்மோனும், போதும்னு சொல்ற இன்னொரு ஹார்மோனும் இருக்கு.", { action: "think", overlay: { kind: "list", items: ["கிரெலின்: பசிக்குது!", "லெப்டின்: போதும்!"] } }),
  L(19, "k4", "fridge", "ஒரு ஆய்வுல, ரெண்டு நாள் வெறும் நாலு மணி நேரம் தூங்கினவங்களுக்கு, பசி ஹார்மோன், இருபத்தெட்டு சதவீதம் கூடிச்சு. போதும் ஹார்மோன், பதினெட்டு சதவீதம் குறைஞ்சுச்சு!", { sub: "ஒரு ஆய்வுல, 2 நாள் வெறும் 4 மணி நேரம் தூங்கினவங்களுக்கு, பசி ஹார்மோன், 28 சதவீதம் கூடிச்சு. போதும் ஹார்மோன், 18 சதவீதம் குறைஞ்சுச்சு!", action: "surprised", overlay: { kind: "list", items: ["பசி ஹார்மோன்: +28%", "போதும் ஹார்மோன்: -18%"] } }),
  L(20, "k4", "chips", "அதனால தான், தூக்கம் குறைஞ்சா, இனிப்பு, எண்ணெய், ஜங்க் ஃபுட் மேல ஆசை அதிகமாகுது. நாளாக நாளாக, எடையும் ஏறும்.", { action: "sad", overlay: { kind: "flow", items: ["தூக்கம் குறைவு", "பசி அதிகம்", "எடை ஏறும்"] } }),
  L(21, "k4", "friends", "இதெல்லாம் உங்களுக்குப் புதுசா இருந்தா, ஒரு லைக் போடுங்க. ராத்திரி லேட்டா தூங்குற, ஒரு நண்பருக்கு ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "நண்பருக்கு SHARE" } }),

  // ── 2 AM: the brain wobbles ──
  L(22, "k5", "clock", "மணி ரெண்டு. அண்ணன் காலையில ஏழு மணிக்கு எழுந்தாரு. அப்படின்னா, இப்போ பத்தொன்பது மணி நேரமா முழிச்சிருக்காரு!", { chapter: "மூளை தள்ளாடுது", clock: { time: "02:00", label: "நடு ராத்திரி" }, sub: "மணி 2. அண்ணன் காலையில 7 மணிக்கு எழுந்தாரு. அப்படின்னா, இப்போ 19 மணி நேரமா முழிச்சிருக்காரு!", action: "count", overlay: { kind: "year", value: 19, suffix: " மணி நேரம்", label: "தொடர்ந்து முழிச்சிருக்காரு" } }),
  L(23, "k5", "night-road", "ஆஸ்திரேலியாவுல ஒரு ஆய்வுல, பதினேழுல இருந்து பத்தொன்பது மணி நேரம் தூங்காம இருந்தவங்க, கொஞ்சம் மது குடிச்சவங்க அளவுக்கு தடுமாறினாங்களாம்!", { sub: "ஆஸ்திரேலியாவுல ஒரு ஆய்வுல, 17-ல இருந்து 19 மணி நேரம் தூங்காம இருந்தவங்க, கொஞ்சம் மது குடிச்சவங்க அளவுக்கு தடுமாறினாங்களாம்!", action: "scared", overlay: { kind: "stamp", text: "குடிச்ச மாதிரி தடுமாற்றம்!" } }),
  L(24, "k5", "study-desk", "கவனம் குறையும். ரியாக்ஷன் மெதுவாகும். சின்னச் சின்னத் தப்பு அதிகமாகும்.", { action: "count", overlay: { kind: "meter", label: "கவனம்", from: 0.85, to: 0.3, small: "முழிக்க முழிக்க குறையுது" } }),
  L(25, "k5", "storm", "ஒரு ராத்திரி முழுக்க தூங்காதவங்களுக்கு, மூளையில கோபம், பயம் வர்ற பகுதி, அறுபது சதவீதம் அதிகமா துடிச்சுதுன்னு, ஒரு ஆய்வு சொல்லுது. அதனால தான், சின்ன விஷயத்துக்கே எரிச்சல் வருது.", { sub: "ஒரு ராத்திரி முழுக்க தூங்காதவங்களுக்கு, மூளையில கோபம், பயம் வர்ற பகுதி, 60 சதவீதம் அதிகமா துடிச்சுதுன்னு, ஒரு ஆய்வு சொல்லுது. அதனால தான், சின்ன விஷயத்துக்கே எரிச்சல் வருது.", action: "sad", overlay: { kind: "year", value: 60, suffix: "% அதிகம்", label: "கோபம் · பயம் வர்ற பகுதி" } }),
  L(26, "k5", "night-road", "சில நேரம், கண் திறந்தபடியே, சில வினாடி தூங்கிடுவோம். இதுக்கு மைக்ரோ ஸ்லீப்னு பேரு. வண்டி ஓட்டும் போது இது நடந்தா, ரொம்ப ஆபத்து!", { action: "scared", overlay: { kind: "stamp", text: "மைக்ரோ ஸ்லீப்", small: "வண்டி ஓட்டும் போது ஆபத்து!" } }),

  // ── 7 AM: the alarm ──
  L(27, "k6", "alarm", "காலை ஏழு மணி. அலாரம் அடிக்குது. அண்ணன் தூங்கினது, வெறும் அஞ்சு மணி நேரம் தான்.", { chapter: "காலை அலாரம்", clock: { time: "07:00", label: "காலை" }, sub: "காலை 7 மணி. அலாரம் அடிக்குது. அண்ணன் தூங்கினது, வெறும் 5 மணி நேரம் தான்.", action: "sad", overlay: { kind: "year", value: 5, suffix: " மணி நேரம்", label: "தூங்கினது இவ்ளோ தான்" } }),
  L(28, "k6", "kids-sleep", "எங்க வயசுப் பசங்களுக்கு, ஒன்பதுல இருந்து பன்னெண்டு மணி நேரம் தூக்கம் வேணும். டீனேஜ் பசங்களுக்கு, எட்டுல இருந்து பத்து மணி நேரம். பெரியவங்களுக்கு, குறைஞ்சது ஏழு மணி நேரம்.", { sub: "எங்க வயசுப் பசங்களுக்கு, 9-ல இருந்து 12 மணி நேரம் தூக்கம் வேணும். டீனேஜ் பசங்களுக்கு, 8-ல இருந்து 10 மணி நேரம். பெரியவங்களுக்கு, குறைஞ்சது 7 மணி நேரம்.", action: "count", overlay: { kind: "list", items: ["6–12 வயசு: 9–12 மணி நேரம்", "13–18 வயசு: 8–10 மணி நேரம்", "பெரியவங்க: 7+ மணி நேரம்"] } }),
  L(29, "k6", "stars", "இன்னொரு ரகசியம். கனவு வர்ற தூக்கம், விடியற்காலையில தான் அதிகமா வரும். லேட்டா தூங்கி, சீக்கிரம் எழுந்தா, அந்தத் தூக்கம் தான் அதிகமா போயிடுது.", { action: "whisper", overlay: { kind: "title", text: "கனவுத் தூக்கம்", small: "விடியற்காலையில அதிகம்" } }),
  L(30, "k6", "stars", "அந்தத் தூக்கம், மனசை அமைதியாக்கவும், புதுசா யோசிக்கவும் உதவுது. அது போச்சுன்னா, நாள் முழுக்க மூடே சரியில்ல.", { action: "sad", overlay: { kind: "morph", from: "ஃப்ரெஷ் மூட்", to: "எரிச்சல் மூட்" } }),
  L(31, "k6", "classroom", "ஸ்கூல்லயும், ஆபீஸ்லயும், கொட்டாவி மேல கொட்டாவி. படிச்சது எதுவும், மண்டையில ஏறல.", { action: "shrug", overlay: { kind: "type", text: "கொட்டாவி... கொட்டாவி..." } }),

  // ── Every day? ──
  L(32, "k7", "clock", "ஒரு நாள் இப்படி இருந்தா பரவாயில்ல. ஆனா, அண்ணன் மாதிரி, தினமும் இப்படியே இருந்தா?", { chapter: "தினமும் இப்படியே இருந்தா?", clock: { time: "30 நாள்", label: "கழிச்சு" }, action: "think", overlay: { kind: "title", text: "தினமும் இப்படியே?" } }),
  L(33, "k7", "coins", "தூக்கம் ஒரு கடன் மாதிரி. தினமும் கொஞ்சம் கொஞ்சமா குறைஞ்சா, அந்தக் கடன் ஏறிக்கிட்டே போகும். இதை ஸ்லீப் டெட்னு சொல்றாங்க.", { action: "point", overlay: { kind: "flow", items: ["-2 மணி", "-2 மணி", "-2 மணி", "பெரிய கடன்!"] } }),
  L(34, "k7", "bed", "ஞாயிற்றுக்கிழமை மதியம் வரைக்கும் தூங்கினா, சரியாயிடும்னு நினைப்போம். ஆனா, அது முழுசா சரியாகாதுன்னு, ஆய்வுகள் சொல்லுது.", { action: "shrug", overlay: { kind: "morph", from: "சண்டே சரி பண்ணிடும்", to: "முழுசா ஆகாது!" } }),
  L(35, "k7", "virus", "ஆறு மணி நேரத்துக்குக் கம்மியா தூங்குறவங்களுக்கு, சளி பிடிக்கிற வாய்ப்பு, கிட்டத்தட்ட நாலு மடங்கு அதிகமாம்! உடம்போட பாதுகாப்புப் படையே பலவீனமாயிடுது.", { sub: "6 மணி நேரத்துக்குக் கம்மியா தூங்குறவங்களுக்கு, சளி பிடிக்கிற வாய்ப்பு, கிட்டத்தட்ட 4 மடங்கு அதிகமாம்! உடம்போட பாதுகாப்புப் படையே பலவீனமாயிடுது.", action: "surprised", overlay: { kind: "year", value: 4, suffix: " மடங்கு", label: "சளி பிடிக்கிற வாய்ப்பு" } }),
  L(36, "k7", "doctor", "நீண்ட காலம் இப்படியே போனா, உடல் எடை, சர்க்கரை நோய், இதய நோய், மன அழுத்தம், இதுக்கெல்லாம் வாய்ப்பு அதிகமாகுதுன்னு, ஆய்வுகள் எச்சரிக்குது.", { action: "scared", overlay: { kind: "list", items: ["உடல் எடை", "சர்க்கரை நோய்", "இதய நோய்", "மன அழுத்தம்"] } }),

  // ── 5 ways to sleep well ──
  L(37, "k8", "moon", "சரி, பயப்பட வேண்டாம்! நல்லா தூங்க, அஞ்சு சூப்பர் வழிகள் இருக்கு.", { chapter: "நல்ல தூக்கத்துக்கு 5 வழிகள்", clock: { time: "10:00", label: "இன்னைக்கு ராத்திரி" }, action: "idea", overlay: { kind: "title", text: "5 வழிகள்", small: "இன்னைக்கு ராத்திரியே" } }),
  L(38, "k8", "clock", "ஒண்ணு: தினமும் ஒரே நேரத்துல தூங்குங்க, ஒரே நேரத்துல எழுந்திருங்க. லீவு நாள்லயும் தான்! அப்போ தான், உடம்போட கடிகாரம் சரியா ஓடும்.", { action: "point", overlay: { kind: "pin", text: "தினமும் ஒரே நேரம்", small: "வழி 1" } }),
  L(39, "k8", "phone-charging", "ரெண்டு: தூங்குறதுக்கு ஒரு மணி நேரம் முன்னாடி, போன், டிவி வேண்டாம். போனை படுக்கை அறைக்கு வெளியே வைங்க.", { action: "nod", overlay: { kind: "pin", text: "தூங்கும் முன் ஸ்க்ரீன் இல்ல", small: "வழி 2" } }),
  L(40, "k8", "sunrise", "மூணு: காலையில எழுந்ததும், கொஞ்ச நேரம் வெயில்ல நில்லுங்க. அந்த வெளிச்சம், உடம்போட கடிகாரத்தை, சரியா செட் பண்ணும்.", { action: "point", overlay: { kind: "pin", text: "காலை வெயில்", small: "வழி 3" } }),
  L(41, "k9", "coffee", "நாலு: சாயங்காலத்துக்கு அப்புறம், காபி, டீ, எனர்ஜி டிரிங்க் வேண்டாம். அதுல இருக்கிற காஃபின், பல மணி நேரம் உடம்புலயே இருக்கும்.", { action: "please", overlay: { kind: "pin", text: "மாலைக்கு அப்புறம் காபி இல்ல", small: "வழி 4" } }),
  L(42, "k9", "bedroom", "அஞ்சு: ரூம் இருட்டா, அமைதியா, கொஞ்சம் குளிர்ச்சியா இருக்கட்டும். ராத்திரி லேட்டா, வயிறு முட்டச் சாப்பிட வேண்டாம்.", { action: "thumbs", overlay: { kind: "list", items: ["இருட்டு", "அமைதி", "குளிர்ச்சி"] } }),
  L(43, "k9", "hammock", "பகல்ல ரொம்பத் தூக்கம் வந்தா, இருபது நிமிஷம், ஒரு குட்டித் தூக்கம் போதும். அதுக்கு மேல வேண்டாம். ராத்திரித் தூக்கம் கெட்டுப் போகும்.", { sub: "பகல்ல ரொம்பத் தூக்கம் வந்தா, 20 நிமிஷம், ஒரு குட்டித் தூக்கம் போதும். அதுக்கு மேல வேண்டாம். ராத்திரித் தூக்கம் கெட்டுப் போகும்.", action: "nod", overlay: { kind: "title", text: "20 நிமிஷம் குட்டித் தூக்கம்" } }),
  L(44, "k9", "doctor", "இதெல்லாம் செஞ்சும், ரொம்ப நாளா தூக்கமே வரலைன்னா, வெட்கப்படாம ஒரு டாக்டரைப் பாருங்க. அது ஒரு உடம்புப் பிரச்சனையா கூட இருக்கலாம்.", { action: "point", overlay: { kind: "title", text: "டாக்டரைப் பாருங்க", small: "ரொம்ப நாளா தூக்கம் வரலைன்னா" } }),

  // ── The next night, and goodbye ──
  L(45, "k10", "night-window", "இந்த வீடியோவை, அண்ணனுக்குக் காட்டினேன். அன்னைக்கு ராத்திரி, பத்தரை மணிக்கே, போனை வெளியே வச்சிட்டுத் தூங்கிட்டாரு!", { chapter: "அடுத்த நாள் ராத்திரி", clock: { time: "10:30", label: "இரவு" }, host: "big", action: "proud", overlay: { kind: "morph", from: "ராத்திரி 2 மணி", to: "10:30-க்கே தூக்கம்!" } }),
  L(46, "k10", "cricket", "மறுநாள் காலையில, ஃப்ரெஷ்ஷா எழுந்தாரு. என் கூட கிரிக்கெட் கூட விளையாடினாரு!", { action: "excited", overlay: { kind: "title", text: "ஃப்ரெஷ் காலை!" } }),
  L(47, "k10", "sunrise", "தூக்கம், நேரத்தை வீணாக்குறது இல்ல. நாளைக்கு நம்மளத் தயார் பண்ற, ஒரு சூப்பர் பவர்!", { action: "nod", overlay: { kind: "morph", from: "தூக்கம் = நேர வீண்", to: "தூக்கம் = சூப்பர் பவர்!" } }),
  L(48, "k10", "sunrise", "லேட்டா தூங்குற ஒருத்தருக்கு, இந்த வீடியோவை அனுப்புங்க. ஆனா, ராத்திரி இல்ல. காலையில அனுப்புங்க!", { action: "share", overlay: { kind: "type", text: "காலையில அனுப்புங்க!" } }),
  L(49, "k10", "moon", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்? கமெண்ட்ல சொல்லுங்க. வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. குட் நைட்! டாட்டா!", { action: "wave", overlay: { kind: "title", text: "அடுத்த வீடியோ? COMMENT", small: "பிடிச்சா SUBSCRIBE · குட் நைட்!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. Objects over faces. */
const IMAGES: ExVideo["images"] = {
  "night-window": { q: "residential building at night lit windows" },
  "night-phone": { q: "insomnia", file: "File:Depiction of a person suffering from Insomnia (sleeplessness) (cropped).png" },
  moon: { q: "full moon night sky" },
  sunset: { q: "sunset sky silhouette India" },
  brain: { q: "brain", file: "File:Blausen 0102 Brain Motor&Sensory (flipped).png" },
  melatonin: { q: "Melatonin molecule" },
  "phone-glow": { q: "mobile phone screen light dark room" },
  gaming: { q: "mobile phone game playing" },
  bed: { q: "bed pillow blanket bedroom" },
  workshop: { q: "tools hanging on pegboard" },
  height: { q: "measuring tape" },
  books: { q: "library bookshelves" },
  noodles: { q: "instant noodles bowl" },
  fridge: { q: "open refrigerator food" },
  chips: { q: "potato chips snack" },
  friends: { q: "friends silhouette sunset" },
  clock: { q: "hourglass", file: "File:Sand clock Enschede.jpg" },
  "night-road": { q: "highway at night car lights" },
  "study-desk": { q: "student studying with books" },
  storm: { q: "lightning storm night" },
  alarm: { q: "alarm clock morning" },
  "kids-sleep": { q: "teddy bear on bed" },
  stars: { q: "milky way starry night sky" },
  classroom: { q: "classroom India school students" },
  coins: { q: "Indian rupee coins" },
  virus: { q: "box of facial tissues" },
  "phone-charging": { q: "smartphone charging cable" },
  sunrise: { q: "Marina beach sunrise Chennai" },
  coffee: { q: "South Indian filter coffee" },
  bedroom: { q: "dark bedroom night" },
  hammock: { q: "hammock shade tree" },
  doctor: { q: "stethoscope" },
  cricket: { q: "children playing cricket street India" },
};

export const LATE_NIGHT: ExVideo = {
  slug: "09 Raathiri 2 Mani",
  title: "ராத்திரி 2 மணி வரை முழிச்சிருந்தா, உடம்புல என்ன ஆகும்?",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "night",
  music: "night",
  thumb: {
    visual: "night-phone",
    lines: [
      { text: "ராத்திரி 2 மணி வரை", size: 120, fill: "#F7F7F2" },
      { text: "முழிச்சிருந்தா?", size: 160, fill: "#FFD36E" },
      { text: "உடம்புல என்ன ஆகும்", size: 110, fill: "#8FA8FF" },
    ],
  },
  ...HOST_VOICE,
};
