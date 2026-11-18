/**
 * "குடிச்சா காலையில ஏன் தலை வலிக்குது?" — Ulagam Ippo's seventh video: the
 * same boy host and voice, the new pulse look and beat (the user's ask,
 * 2026-11-16: 5+ min, music, a different, eye-catching style). Opens with the
 * Tamil health warning, ends with a clear "no drinking" message. The subscribe
 * ask is soft ("pudicha pannikonga"), never pushy.
 *
 * Facts kept straight (checked 2026-11-16):
 * - Alcohol is absorbed through the stomach and small intestine into the blood
 *   within minutes and reaches the brain. The liver clears roughly one standard
 *   drink an hour (NIAAA); the rest keeps circulating.
 * - Alcohol suppresses vasopressin (ADH), so the kidneys pass more water →
 *   dehydration: thirst, dizziness, headache. A contributor, not the only cause.
 * - Liver: alcohol → acetaldehyde (alcohol dehydrogenase) → acetate (ALDH).
 *   Acetaldehyde is far more toxic than alcohol (nausea, fast heartbeat,
 *   flushing); IARC (WHO) classes acetaldehyde from alcoholic drinks as a Group 1 carcinogen.
 * - Hangover involves an immune/inflammatory response (cytokines): aches,
 *   poor appetite, poor concentration. Alcohol irritates the stomach lining and
 *   raises acid. It can lower blood sugar: shakiness, weakness.
 * - Sleep: falls asleep faster, but sleep is fragmented, less REM later in the night.
 * - Vasodilation is a suspected (debated) headache factor: said as "might be".
 * - Congeners: more in dark spirits; Rohsenow et al. 2010 — bourbon gave worse
 *   hangovers than vodka at the same dose. Clear drinks are not safe either.
 * - Myths: "hair of the dog" only delays it; coffee wakes you but doesn't cure;
 *   no instant cure — only time. Paracetamol with alcohol is a liver risk: "ask a doctor".
 * - WHO (Jan 2023): no level of alcohol consumption is safe for health.
 *   WHO (2024 report): ~2.6 million deaths a year from alcohol (2019 data).
 *   Alcohol causes at least seven types of cancer (WHO).
 * - Tele-MANAS 14416: India's free, 24×7 government mental-health helpline (substance use included).
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── The health warning, first (the user's ask) ──
  L(1, "k1", "bottles", "ஒரு முக்கியமான விஷயம், முதல்லயே சொல்லிடறேன். மது அருந்துதல், உடல் நலத்துக்கு கேடு!", { host: "big", action: "nod", overlay: { kind: "warning", text: "மது அருந்துதல் உடல் நலத்துக்கு கேடு", small: "மது வீட்டுக்கும் நாட்டுக்கும் உயிருக்கும் கேடு" } }),
  L(2, "k1", "bottles", "மது, வீட்டுக்கும், நாட்டுக்கும், உயிருக்கும் கேடு. இந்த வீடியோ, அதைப் புரிஞ்சுக்கிறதுக்காகத் தான்.", { action: "please", overlay: { kind: "type", text: "இது ஒரு விழிப்புணர்வு வீடியோ" } }),

  // ── The hook ──
  L(3, "k2", ["night-city", "headache"], "ராத்திரி பார்ட்டி, ஜாலி, சிரிப்பு. ஆனா காலையில கண் முழிச்சா, தலை சுத்தி, வெடிக்கிற மாதிரி வலிக்குது!", { action: "scared", overlay: { kind: "title", text: "காலையில தலை வெடிக்குது!", small: "ஹேங்ஓவர்" } }),
  L(4, "k2", "headache", "இதுக்கு பேரு தான் ஹேங்ஓவர். ஆனா ஏன் இப்படி வலிக்குது? உடம்புக்குள்ள, அப்படி என்ன தான் நடக்குது?", { action: "think", overlay: { kind: "type", text: "உடம்புக்குள்ள என்ன நடக்குது?" } }),
  L(5, "k2", "brain", "இன்னைக்கு, ஒரு டாக்டர் மாதிரி, உடம்புக்குள்ள போய், ஒவ்வொரு காரணமாப் பார்க்கலாம். கடைசியில, ஒரு முக்கியமான விஷயமும் இருக்கு. மிஸ் பண்ணாதீங்க!", { action: "idea", overlay: { kind: "list", items: ["5 காரணங்கள்", "3 பொய்கள்", "1 முக்கியமான செய்தி"] } }),
  L(6, "k2", "brain", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். இந்த மாதிரி வீடியோ உங்களுக்குப் பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. கட்டாயம் இல்ல, பிடிச்சா மட்டும் போதும்!", { action: "wave", overlay: { kind: "title", text: "பிடிச்சா SUBSCRIBE", small: "கட்டாயம் இல்ல" } }),

  // ── 1. The journey in ──
  L(7, "k3", "digestive", "முதல்ல, மது உள்ள போனதும், என்ன ஆகுதுன்னு பார்க்கலாம்.", { chapter: "மது உள்ள போனதும்", host: "corner", action: "point", overlay: { kind: "title", text: "மது உள்ள போனதும்..." } }),
  L(8, "k3", ["ethanol", "brain"], "மதுவுல இருக்கிற ஆல்கஹால், வயிறு வழியா, சில நிமிஷத்துலயே ரத்தத்துல கலந்துடும். அப்புறம் ரத்தம் வழியா, மூளை வரைக்கும் போயிடும்!", { action: "surprised", overlay: { kind: "flow", items: ["வயிறு", "ரத்தம்", "மூளை"] } }),
  L(9, "k3", "brain", "அதனால தான், கொஞ்ச நேரத்துல பேச்சு குழறும், நடை தடுமாறும், யோசிக்கிற சக்தியும் குறையும்.", { action: "shrug", overlay: { kind: "list", items: ["பேச்சு குழறும்", "நடை தடுமாறும்", "யோசனை குறையும்"] } }),
  L(10, "k3", "liver", "இந்த ஆல்கஹாலை உடைச்சு வெளியேத்துற வேலை, முக்கியமா நம்ம கல்லீரலோடது. ஆனா கல்லீரலால, ஒரு மணி நேரத்துக்கு, கிட்டத்தட்ட ஒரு டிரிங்க் தான் சமாளிக்க முடியும்.", { action: "count", overlay: { kind: "year", value: 1, suffix: " டிரிங்க் / மணி", label: "கல்லீரலோட வேகம்" } }),
  L(11, "k3", "liver", "அதுக்கு மேல குடிச்சா? மீதி எல்லாம், வரிசையில காத்துக்கிட்டு, உடம்பு முழுக்க சுத்திக்கிட்டே இருக்கும்!", { action: "scared", overlay: { kind: "type", text: "மீதி உடம்புக்குள்ளயே சுத்தும்!" } }),

  // ── 2. Reason 1: water ──
  L(12, "k4", "water-glass", "சரி, முதல் காரணம். உடம்புல, தண்ணி குறைஞ்சு போறது!", { chapter: "காரணம் 1: தண்ணி குறையுது", action: "idea", overlay: { kind: "title", text: "தண்ணி குறையுது", small: "காரணம் 1" } }),
  L(13, "k4", "kidney", "நம்ம மூளையில இருந்து, ஒரு ஹார்மோன் வருது. அது கிட்னி கிட்ட, தண்ணியை வீணாக்காதே, உடம்புக்குள்ளயே வச்சுக்கோன்னு சொல்லும்.", { action: "point", overlay: { kind: "title", text: "ADH ஹார்மோன்", small: "தண்ணியைச் சேமிக்கும்" } }),
  L(14, "k4", "kidney", "ஆனா ஆல்கஹால், அந்த ஹார்மோனையே தடுத்துடும். அதனால, அடிக்கடி பாத்ரூம் போகணும். உடம்புல இருந்து, நிறைய தண்ணி வெளியேறிடும்!", { action: "surprised", overlay: { kind: "meter", label: "உடம்புல தண்ணி", from: 0.9, to: 0.4, small: "குறைஞ்சுக்கிட்டே போகுது" } }),
  L(15, "k4", "dry-earth", "காலையில தொண்டை வறண்டு போகும், தாகம் எடுக்கும், தலை சுத்தும். தண்ணி குறைஞ்சா, தலை வலியும் வரும்.", { action: "sad", overlay: { kind: "list", items: ["தொண்டை வறட்சி", "தாகம்", "தலை சுத்தல்", "தலை வலி"] } }),
  L(16, "k4", "dry-earth", "ஆனா தலை வலிக்கு, இது மட்டும் காரணம் இல்ல. அடுத்தது தான், இன்னும் பெரிய வில்லன்!", { action: "whisper", overlay: { kind: "type", text: "இன்னும் பெரிய வில்லன் இருக்கு..." } }),

  // ── 3. Reason 2: the poison ──
  L(17, "k5", "acetaldehyde", "ரெண்டாவது காரணம். கல்லீரல், ஆல்கஹாலை உடைக்கும் போது, நடுவுல ஒரு கெமிக்கல் உருவாகுது. அதுக்கு பேரு, அசிட்டால்டிஹைடு!", { chapter: "காரணம் 2: உடம்புக்குள்ள விஷம்", action: "surprised", overlay: { kind: "title", text: "அசிட்டால்டிஹைடு", small: "Acetaldehyde" } }),
  L(18, "k5", "acetaldehyde", "இது, ஆல்கஹாலை விட, பல மடங்கு விஷமானது! உடம்புக்கு ரொம்ப ஆபத்தானது.", { action: "scared", overlay: { kind: "stamp", text: "பல மடங்கு விஷம்!" } }),
  L(19, "k5", "liver", "கல்லீரல், அதையும் உடைச்சு, ஆபத்தில்லாத அசிட்டேட்டா மாத்திடும். ஆனா நிறைய குடிச்சா, அந்த வேலை தாமதமாகி, இந்த விஷம் உடம்புல தேங்கிடும்.", { action: "count", overlay: { kind: "flow", items: ["ஆல்கஹால்", "அசிட்டால்டிஹைடு", "அசிட்டேட்"] } }),
  L(20, "k5", "headache", "அதனால தான், வாந்தி வர்ற மாதிரி இருக்கும், இதயம் வேகமாத் துடிக்கும், முகம் சிவந்து போகும், தலை வலிக்கும்.", { action: "sad", overlay: { kind: "list", items: ["வாந்தி உணர்வு", "வேகமான இதயத் துடிப்பு", "முகம் சிவக்கும்", "தலை வலி"] } }),
  L(21, "k5", "who", "இந்த அசிட்டால்டிஹைடு, புற்றுநோய் உண்டாக்கக் கூடியதுன்னு, உலக சுகாதார நிறுவனமே சொல்லுது!", { action: "surprised", overlay: { kind: "title", text: "புற்றுநோய் அபாயம்", small: "உலக சுகாதார நிறுவனம்" } }),

  // ── 4. Reason 3: the body fights ──
  L(22, "k6", "white-cell", "மூணாவது காரணம். ஆல்கஹால் உள்ள போனா, நம்ம உடம்பு, அதை ஒரு எதிரியா நினைச்சு, சண்டை போட ஆரம்பிக்குது!", { chapter: "காரணம் 3: உடம்பு போடும் சண்டை", action: "fist", overlay: { kind: "title", text: "உடம்பே சண்டை போடுது", small: "காரணம் 3" } }),
  L(23, "k6", "tired", "காய்ச்சல் வந்தா, எப்படி சோர்வா இருக்குமோ, அதே மாதிரி. உடம்பு வலிக்கும், பசிக்காது, எதுலயும் கவனம் இருக்காது.", { action: "sad", overlay: { kind: "list", items: ["உடம்பு வலி", "பசி இருக்காது", "கவனம் சிதறும்"] } }),
  L(24, "k6", "stomach", "அதோட, ஆல்கஹால், வயித்தோட உள் சுவரை எரிச்சல் படுத்தும். அமிலம் அதிகமாகும். அதனால, வயிறு வலியும், வாந்தியும் வரும்.", { action: "point-down", overlay: { kind: "title", text: "வயிறு எரிச்சல்", small: "அமிலம் அதிகமாகும்" } }),
  L(25, "k6", "glucose", "ரத்தத்துல சர்க்கரை அளவும் குறையலாம். அதனால தான், கை நடுக்கம், மயக்கம், பலவீனம் எல்லாம் வருது.", { action: "shrug", overlay: { kind: "meter", label: "ரத்த சர்க்கரை", from: 0.75, to: 0.3, small: "கை நடுக்கம் · மயக்கம் · பலவீனம்" } }),
  L(26, "k6", "friends", "இந்த விஷயங்கள் உங்களுக்குப் புதுசா இருந்தா, ஒரு லைக் போடுங்க. உங்க நண்பர்களுக்கும் ஷேர் பண்ணுங்க. யாருக்காவது இது உதவலாம்!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "நண்பர்களுக்கு SHARE" } }),

  // ── 5. Reasons 4 and 5: sleep, and the colour ──
  L(27, "k7", "sleep", "நாலாவது காரணம், தூக்கம். குடிச்சா, சீக்கிரம் தூக்கம் வர்ற மாதிரி இருக்கும். ஆனா, அது நல்ல தூக்கம் இல்ல!", { chapter: "காரணம் 4, 5: தூக்கமும் நிறமும்", action: "think", overlay: { kind: "title", text: "தூக்கம் கெடுது", small: "காரணம் 4" } }),
  L(28, "k7", "alarm", "ராத்திரி பாதியில, அடிக்கடி முழிப்பு வரும். ஆழமான தூக்கம் கிடைக்காது. அதனால காலையில, தூங்கவே இல்லாத மாதிரி, சோர்வா இருக்கும்.", { action: "sad", overlay: { kind: "morph", from: "சீக்கிரம் தூக்கம்", to: "ஆழமான தூக்கம் இல்ல" } }),
  L(29, "k7", "brain","ஆல்கஹால், ரத்தக் குழாய்களையும் விரிவடைய வைக்கும். அதுவும், தலை வலிக்கு ஒரு காரணமா இருக்கலாம்னு, ஆய்வாளர்கள் சொல்றாங்க.", { action: "point", overlay: { kind: "title", text: "ரத்தக் குழாய் விரியும்" } }),
  L(30, "k7", "dark-drinks", "அஞ்சாவது காரணம், மதுவோட நிறம்! அடர் நிற மதுவுல, கன்ஜெனர்ஸ்னு சொல்ற, கூடுதல் கெமிக்கல்கள் அதிகமா இருக்கும்.", { sub: "அஞ்சாவது காரணம், மதுவோட நிறம்! அடர் நிற மதுவுல, congeners-னு சொல்ற, கூடுதல் கெமிக்கல்கள் அதிகமா இருக்கும்.", action: "idea", overlay: { kind: "title", text: "கன்ஜெனர்ஸ்", small: "காரணம் 5 · Congeners" } }),
  L(31, "k7", "dark-drinks", "ஒரு ஆய்வுல, அடர் நிற மது குடிச்சவங்களுக்கு, ஹேங்ஓவர் இன்னும் மோசமா இருந்துச்சு. ஆனா, நிறம் இல்லாத மதுவும் பாதுகாப்பானது இல்ல!", { action: "shrug", overlay: { kind: "morph", from: "அடர் நிறம்: மோசம்", to: "எந்த மதுவும் பாதுகாப்பு இல்ல" } }),

  // ── 6. Three myths ──
  L(32, "k8", "morning", "இப்போ, ஹேங்ஓவர் பத்தி, நிறைய பேர் நம்புற, மூணு பொய்களைப் பார்க்கலாம்!", { chapter: "மூணு பொய்கள்", action: "count", overlay: { kind: "title", text: "3 பொய்கள்", small: "நம்பாதீங்க" } }),
  L(33, "k8", "bottles", "பொய் ஒண்ணு: காலையில இன்னொரு பெக் அடிச்சா, தலை வலி சரியாகிடும். இல்லவே இல்ல! அது வலியைக் கொஞ்ச நேரம் தள்ளிப் போடும், அவ்ளோ தான். உடம்புக்கு இன்னும் கேடு.", { action: "shrug", overlay: { kind: "stamp", text: "பொய்!", small: "காலையில இன்னொரு பெக்" } }),
  L(34, "k8", "coffee", "பொய் ரெண்டு: ஸ்ட்ராங் காபி குடிச்சா, எல்லாம் போயிடும். காபி, கொஞ்சம் முழிப்பா வைக்கும். ஆனா, ஹேங்ஓவரைப் போக்காது.", { action: "think", overlay: { kind: "stamp", text: "பொய்!", small: "ஸ்ட்ராங் காபி" } }),
  L(35, "k8", "lemon", "பொய் மூணு: எலுமிச்சை ஜூஸோ, மோரோ குடிச்சா, உடனே சரி. தண்ணி குடிக்கிறது கொஞ்சம் உதவும். ஆனா, உடனடி மருந்து எதுவும் இல்ல.", { action: "shrug", overlay: { kind: "stamp", text: "பொய்!", small: "எலுமிச்சை, மோர் = உடனடி மருந்து" } }),
  L(36, "k8", "tablets", "ஒண்ணு ஞாபகம் வச்சுக்கோங்க. தலை வலிக்குதுன்னு, டாக்டர் கிட்ட கேட்காம, மாத்திரை போடாதீங்க. மது கூட, சில மாத்திரைகள் சேர்ந்தா, கல்லீரலுக்கு ஆபத்து!", { action: "point", overlay: { kind: "warning", text: "டாக்டர் கேட்காம மாத்திரை வேண்டாம்", small: "மது + மாத்திரை = கல்லீரலுக்கு ஆபத்து" } }),
  L(37, "k8", "clock", "உண்மையான ஒரே மருந்து, நேரம் தான். இல்லன்னா, குடிக்காம இருக்கிறது தான்!", { action: "nod", overlay: { kind: "morph", from: "மருந்து எது?", to: "குடிக்காம இருக்கிறது" } }),

  // ── 7. The warning bell ──
  L(38, "k9", "doctor", "இப்போ, ரொம்ப முக்கியமான விஷயம். ஹேங்ஓவர், உங்க உடம்பு, உங்களுக்கு அனுப்புற, ஒரு எச்சரிக்கை மணி!", { chapter: "உடம்போட எச்சரிக்கை", action: "surprised", overlay: { kind: "title", text: "ஒரு எச்சரிக்கை மணி", small: "ஹேங்ஓவர்" } }),
  L(39, "k9", "who", "உலக சுகாதார நிறுவனம், மதுவுல, பாதுகாப்பான அளவுன்னு, ஒண்ணு இல்லவே இல்லன்னு, தெளிவாச் சொல்லிடுச்சு.", { action: "nod", overlay: { kind: "stamp", text: "பாதுகாப்பான அளவு இல்ல", small: "உலக சுகாதார நிறுவனம், 2023" } }),
  L(40, "k9", "liver-disease", "தொடர்ந்து குடிச்சா, கல்லீரல் கெட்டுப் போகும். இதயம், மூளை பாதிக்கும். ஏழு வகையான புற்றுநோய்க்குக் கூட, மது ஒரு காரணம்.", { sub: "தொடர்ந்து குடிச்சா, கல்லீரல் கெட்டுப் போகும். இதயம், மூளை பாதிக்கும். 7 வகையான புற்றுநோய்க்குக் கூட, மது ஒரு காரணம்.", action: "sad", overlay: { kind: "list", items: ["கல்லீரல் பாதிப்பு", "இதய நோய்", "மூளை பாதிப்பு", "7 வகை புற்றுநோய்"] } }),
  L(41, "k9", "hospital", "உலகம் முழுக்க, ஒவ்வொரு வருஷமும், மதுவால, கிட்டத்தட்ட இருபத்தி ஆறு லட்சம் பேர், உயிரிழக்கிறாங்க!", { sub: "உலகம் முழுக்க, ஒவ்வொரு வருஷமும், மதுவால, கிட்டத்தட்ட 26 லட்சம் பேர், உயிரிழக்கிறாங்க!", action: "sad", overlay: { kind: "year", value: 2_600_000, label: "ஒவ்வொரு வருஷமும் மதுவால உயிரிழப்பு" } }),
  L(42, "k9", "family", "உடம்பு மட்டும் இல்ல. வீட்டுல சண்டை, காசு கஷ்டம், குழந்தைங்க மனசுல பயம். மது, ஒரு குடும்பத்தையே பாதிக்கும்.", { action: "sad", overlay: { kind: "list", items: ["வீட்டுல சண்டை", "காசு கஷ்டம்", "குழந்தைங்க பயம்"] } }),

  // ── A small request, and goodbye ──
  L(43, "k10", "father-son", "நான் ஒரு சின்னப் பையன் தான். ஆனா, எனக்கும் இது புரியுது.", { chapter: "ஒரு சின்ன வேண்டுகோள்", host: "big", action: "think", overlay: { kind: "type", text: "ஒரு சின்ன வேண்டுகோள்..." } }),
  L(44, "k10", "father-son", "அப்பா, மாமா, அண்ணா, உங்க எல்லாருக்கும் ஒண்ணு சொல்லணும். நீங்க தான் எங்களுக்கு ஹீரோ. அந்த ஹீரோ, ஆரோக்கியமா, எப்பவும் எங்க கூடவே இருக்கணும்.", { action: "please", overlay: { kind: "title", text: "நீங்க தான் எங்க ஹீரோ" } }),
  L(45, "k10", "father-son", "குடிப் பழக்கம் வேண்டாம். ப்ளீஸ்!", { action: "please", overlay: { kind: "stamp", text: "குடிப் பழக்கம் வேண்டாம்" } }),
  L(46, "k10", "phone", "குடியை நிறுத்த உதவி வேணும்னா, வெட்கப்படாதீங்க. அரசாங்கத்தோட இலவச உதவி எண், ஒண்ணு நாலு நாலு ஒண்ணு ஆறு. இருபத்தி நாலு மணி நேரமும் பேசலாம்.", { sub: "குடியை நிறுத்த உதவி வேணும்னா, வெட்கப்படாதீங்க. அரசாங்கத்தோட இலவச உதவி எண் 14416. 24 மணி நேரமும் பேசலாம்.", action: "point", overlay: { kind: "title", text: "14416", small: "Tele-MANAS · இலவசம் · 24 மணி நேரம்" } }),
  L(47, "k10", "sunrise", "இந்த வீடியோவை, உங்களுக்குப் பிடிச்ச ஒருத்தருக்கு அனுப்புங்க. அது, ஒரு குடும்பத்தையே காப்பாத்தலாம்.", { action: "share", overlay: { kind: "type", text: "பிடிச்சவங்களுக்கு அனுப்புங்க" } }),
  L(48, "k10", "sunrise", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்? கமெண்ட்ல சொல்லுங்க. வீடியோ பிடிச்சிருந்தா, சப்ஸ்க்ரைப் பண்ணிக்கோங்க. மறுபடியும் சந்திப்போம். டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "அடுத்த வீடியோ? COMMENT", small: "பிடிச்சா SUBSCRIBE · டாட்டா!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  bottles: { q: "liquor bottles shelf" },
  "night-city": { q: "Chennai night lights city" },
  headache: { q: "headache illustration" },
  brain: { q: "Blausen brain" },
  digestive: { q: "Blausen digestive system" },
  ethanol: { q: "Ethanol 3D balls", file: "File:Ethanol-3D-balls.png" },
  liver: { q: "human liver anatomy illustration" },
  "water-glass": { q: "glass of water" },
  kidney: { q: "kidney anatomy illustration" },
  "dry-earth": { q: "dry cracked earth drought" },
  acetaldehyde: { q: "Acetaldehyde 3D balls", file: "File:Acetaldehyde-3D-balls.png" },
  who: { q: "World Health Organization headquarters Geneva" },
  "white-cell": { q: "white blood cell neutrophil microscope" },
  tired: { q: "clinical thermometer fever" },
  stomach: { q: "stomach anatomy diagram" },
  glucose: { q: "blood glucose meter" },
  friends: { q: "friends silhouette sunset" },
  sleep: { q: "person sleeping in bed" },
  alarm: { q: "alarm clock morning" },
  "dark-drinks": { q: "whisky glass" },
  morning: { q: "sunrise over field" },
  coffee: { q: "cup of coffee" },
  lemon: { q: "lemon slices" },
  tablets: { q: "paracetamol tablets" },
  clock: { q: "analog wall clock face" },
  doctor: { q: "doctor stethoscope patient" },
  "liver-disease": { q: "liver cirrhosis illustration" },
  hospital: { q: "hospital corridor" },
  family: { q: "family holding hands silhouette" },
  "father-son": { q: "father son silhouette" },
  phone: { q: "telephone handset" },
  sunrise: { q: "Marina beach sunrise Chennai" },
};

export const HANGOVER: ExVideo = {
  slug: "07 Hangover Thalai Vali",
  title: "குடிச்சா காலையில ஏன் தலை வலிக்குது?",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "pulse",
  music: "pulse",
  thumb: {
    visual: "headache",
    lines: [
      { text: "குடிச்சா காலையில", size: 130, fill: "#F7F7F2" },
      { text: "ஏன் தலை வலிக்குது?", size: 150, fill: "#2EE6C9" },
      { text: "5 காரணங்கள்", size: 120, fill: "#FF5A5F" },
    ],
  },
  ...HOST_VOICE,
};
