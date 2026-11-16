/**
 * "குமரிக் கண்டம்: உண்மையா? கட்டுக்கதையா?" — Ulagam Ippo's sixth video, the
 * same boy host and voice, story look, hook first (as 05).
 *
 * Facts kept straight (checked 2026-11-14):
 * - The Sangam legend is in the commentary on Iraiyanar Akapporul (written down
 *   c. 8th century): the first Sangam at Then Madurai, the second at Kapatapuram,
 *   both taken by the sea, the third at Madurai. No year figures used — sources disagree.
 * - Silappathikaram: "பஃறுளி ஆற்றுடன் பன்மலை அடுக்கத்துக் குமரிக்கோடும் கொடுங்கடல் கொள்ள".
 * - The name "Kumari Kandam" first appears in the 15th-century Kanda Puranam.
 * - Lemuria: Philip Sclater (English zoologist), 1864, to explain lemur(-like)
 *   fossils in Madagascar and India but not Africa; obsolete once plate tectonics
 *   was accepted (1960s). Tamil Nadu textbooks carried Kumari Kandam until the 1980s.
 * - India split from Madagascar ~88–90 million years ago. Plates move a few cm a year.
 * - Last glacial period: sea level ~120 m lower; the Palk Strait (max ~35 m deep)
 *   was dry land joining India and Sri Lanka; drowned ~7,000 years ago.
 * - Manimekalai: Puhar (Poompuhar) swallowed by the sea. 1964 cyclone (22–23 Dec)
 *   destroyed Dhanushkodi. After the 2004 tsunami the ASI found the Saluvankuppam
 *   Murugan temple near Mamallapuram: brick base, Pallava granite temple over it,
 *   thought to have been wrecked by the sea. ("Sangam-age" brick date is disputed — not claimed.)
 */
import { HOST_VOICE, type ExLine, type ExVideo } from "./explainer";

const L = (n: number, take: string, visual: ExLine["visual"], tamil: string, extra: Partial<ExLine> = {}): ExLine => ({ n, take, visual, tamil, ...extra });

const LINES: ExLine[] = [
  // ── Hook: the host big, the question first ──
  L(1, "k1", "kanyakumari", "கன்னியாகுமரிக்கு தெற்கே, இந்தக் கடலுக்கு அடியில, ஒரு பெரிய தமிழ் நிலமே மூழ்கிக் கிடக்குதுன்னு, நீங்க கேள்விப்பட்டிருக்கீங்களா?", { host: "big", action: "think", overlay: { kind: "type", text: "கடலுக்கு அடியில ஒரு தமிழ் நிலம்?" } }),
  L(2, "k1", "lemuria-map", "அதுக்கு பேர் தான், குமரிக் கண்டம்! மலைகள், ஆறுகள், நகரங்கள்னு, எல்லாமே கடலுக்குள்ள போயிடுச்சாம்!", { action: "surprised", overlay: { kind: "title", text: "குமரிக் கண்டம்", small: "கடல் கொண்ட நிலம்?" } }),
  L(3, "k1", "ocean", "இது உண்மையா? இல்ல கட்டுக்கதையா? இன்னைக்கு, பழைய நூல்கள் என்ன சொல்லுது, சயின்ஸ் என்ன சொல்லுதுன்னு, ரெண்டையும் பார்க்கலாம்!", { sub: "இது உண்மையா? இல்ல கட்டுக்கதையா? இன்னைக்கு, பழைய நூல்கள் என்ன சொல்லுது, science என்ன சொல்லுதுன்னு, ரெண்டையும் பார்க்கலாம்!", action: "count", overlay: { kind: "stamp", text: "உண்மையா? கதையா?", small: "குமரிக் கண்டம்" } }),
  L(4, "k1", "kanyakumari-sunset", "வணக்கம் நண்பர்களே! நான் உங்க உலகம் இப்போ பையன். நீங்க இன்னும் சப்ஸ்க்ரைப் பண்ணலைன்னா, இப்பவே பண்ணிடுங்க. சரி, வாங்க ஆரம்பிக்கலாம்!", { action: "wave", overlay: { kind: "title", text: "SUBSCRIBE பண்ணிடுங்க", small: "உலகம் இப்போ" } }),

  // ── 1. What the old books say ──
  L(5, "k2", "manuscript", "முதல்ல, இந்தக் கதை எங்கிருந்து வந்துச்சுன்னு பார்க்கலாம். நம்ம பழைய தமிழ் நூல்கள்ல இருந்து தான்!", { chapter: "பழைய நூல்கள்", host: "corner", action: "read", overlay: { kind: "title", text: "பழைய தமிழ் நூல்கள்" } }),
  L(6, "k2", "manuscript", "இறையனார் அகப்பொருள்ங்கிற நூலுக்கு எழுதின, ஒரு பழைய உரையில, மூணு தமிழ்ச் சங்கங்கள் பத்தி, ஒரு கதை வருது.", { action: "count", overlay: { kind: "list", items: ["முதல் சங்கம்", "இடைச் சங்கம்", "கடைச் சங்கம்"] } }),
  L(7, "k2", "ocean", "முதல் சங்கம், தென் மதுரையில நடந்துச்சாம். ரெண்டாவது சங்கம், கபாடபுரத்துல.", { action: "point", overlay: { kind: "morph", from: "தென் மதுரை", to: "கபாடபுரம்" } }),
  L(8, "k2", "madurai", "ஆனா, அந்த ரெண்டு ஊரையும், கடல் கொண்டு போயிடுச்சாம்! அதுக்கப்புறம் தான், இப்போ இருக்கிற மதுரையில, மூணாவது சங்கம் நடந்துச்சாம்.", { action: "scared", overlay: { kind: "type", text: "ரெண்டு ஊரையும் கடல் கொண்டு போச்சு!" } }),
  L(9, "k2", "kannagi", "சிலப்பதிகாரத்துலயும், ஒரு வரி வருது. பஃறுளி ஆறும், குமரிக் கோடுங்கிற மலையும், கொடுங்கடல்ல மூழ்கிப் போச்சுன்னு!", { action: "read", overlay: { kind: "title", text: "பஃறுளி ஆறு · குமரிக் கோடு", small: "சிலப்பதிகாரம்" } }),

  // ── 2. How Lemuria came in ──
  L(10, "k3", "manuscript", "குமரிக் கண்டம்ங்கிற பேர், பதினஞ்சாம் நூற்றாண்டுல வந்த, கந்த புராணத்துல வருது.", { chapter: "லெமூரியா வந்த கதை", sub: "குமரிக் கண்டம்ங்கிற பேர், 15-ம் நூற்றாண்டுல வந்த, கந்த புராணத்துல வருது.", action: "point", overlay: { kind: "title", text: "கந்த புராணம்", small: "15-ம் நூற்றாண்டு" } }),
  L(11, "k3", "sclater", "அப்புறம், ஆயிரத்து எண்ணூத்தி அறுபத்தி நாலுல, இங்கிலாந்துல இருந்த, பிலிப் ஸ்க்லேட்டர்ங்கிற ஒரு விஞ்ஞானி, ஒரு புதிர்ல மாட்டிக்கிட்டாரு.", { sub: "அப்புறம், 1864-ல, இங்கிலாந்துல இருந்த, பிலிப் ஸ்க்லேட்டர்ங்கிற ஒரு விஞ்ஞானி, ஒரு புதிர்ல மாட்டிக்கிட்டாரு.", action: "think", overlay: { kind: "year", value: 1864, label: "பிலிப் ஸ்க்லேட்டர்" } }),
  L(12, "k3", "lemur", "லெமூர்ங்கிற, குரங்கு மாதிரி இருக்கிற விலங்குகளோட தடயங்கள், மடகாஸ்கர்லயும், இந்தியாவிலயும் கிடைச்சது. ஆனா நடுவுல, ஆப்பிரிக்காவுல இல்ல!", { action: "surprised", overlay: { kind: "list", items: ["மடகாஸ்கர்: இருக்கு", "இந்தியா: இருக்கு", "ஆப்பிரிக்கா: இல்ல"] } }),
  L(13, "k3", "lemuria-map", "அப்போ, ரெண்டு இடத்தையும் இணைக்கிற, ஒரு பெரிய நிலம் இருந்து, அது கடல்ல மூழ்கியிருக்கணும்னு சொன்னாரு. அதுக்கு வச்ச பேர் தான், லெமூரியா!", { action: "idea", overlay: { kind: "title", text: "லெமூரியா", small: "1864-ல வந்த ஒரு ஐடியா" } }),
  L(14, "k3", "lemuria-map", "இந்த லெமூரியா தான், நம்ம குமரிக் கண்டம்னு, நிறைய பேர் நம்ப ஆரம்பிச்சாங்க. தமிழ்நாட்டு பாடப் புத்தகங்கள்ல கூட, இது இருந்துச்சு!", { action: "surprised", overlay: { kind: "morph", from: "லெமூரியா", to: "குமரிக் கண்டம்" } }),
  L(15, "k3", "kanyakumari", "இந்த விஷயம் உங்களுக்கு புதுசா இருந்தா, ஒரு லைக் போடுங்க! குமரிக் கண்டம் கதை சொன்ன, உங்க வீட்டு பெரியவங்களுக்கு, ஷேர் பண்ணுங்க!", { action: "thumbs", overlay: { kind: "title", text: "புதுசா இருந்தா LIKE", small: "வீட்டு பெரியவங்களுக்கு SHARE" } }),

  // ── 3. What science says ──
  L(16, "k4", "plates", "இப்போ, சயின்ஸ் என்ன சொல்லுதுன்னு பார்க்கலாம். இங்க தான், பெரிய ட்விஸ்ட் இருக்கு!", { chapter: "சயின்ஸ் சொல்றது", sub: "இப்போ, science என்ன சொல்லுதுன்னு பார்க்கலாம். இங்க தான், பெரிய twist இருக்கு!", action: "idea", overlay: { kind: "title", text: "சயின்ஸ் என்ன சொல்லுது?" } }),
  L(17, "k4", "plates", "பூமியோட நிலப்பரப்பு, பெரிய பெரிய தட்டுகள் மாதிரி. அது, வருஷத்துக்கு சில சென்டிமீட்டர், ரொம்ப மெதுவா நகருது.", { action: "point", overlay: { kind: "title", text: "நகரும் நிலத் தட்டுகள்", small: "Plate Tectonics" } }),
  L(18, "k4", "gondwana", "கிட்டத்தட்ட ஒன்பது கோடி வருஷத்துக்கு முன்னாடி, இந்தியாவும் மடகாஸ்கரும், ஒட்டிக்கிட்டு இருந்துச்சு. அப்புறம் பிரிஞ்சு, இந்தியா மெதுவா வடக்கே நகர்ந்து வந்துச்சு!", { action: "surprised", overlay: { kind: "morph", from: "ஒட்டி இருந்துச்சு", to: "பிரிஞ்சு போச்சு" } }),
  L(19, "k4", "lemur", "அதனால தான், லெமூர் தடயங்கள் ரெண்டு இடத்துலயும் இருக்கு. நடுவுல மூழ்கின கண்டம், தேவையே இல்ல!", { action: "nod", overlay: { kind: "stamp", text: "மூழ்கின கண்டம் தேவை இல்ல" } }),
  L(20, "k4", "deep-ocean", "இன்னொரு விஷயம். குமரிக்கு தெற்கே, இந்தியப் பெருங்கடல், பல ஆயிரம் மீட்டர் ஆழம். அங்க, மூழ்கின கண்டம் இருந்ததுக்கு, எந்த ஆதாரமும் இல்லன்னு, ஆய்வாளர்கள் சொல்றாங்க.", { action: "shrug", overlay: { kind: "title", text: "பல ஆயிரம் மீட்டர் ஆழம்", small: "மூழ்கின கண்டத்துக்கு ஆதாரம் இல்ல" } }),

  // ── 4. The truth hiding in it ──
  L(21, "k5", "ocean", "அப்போ, குமரிக் கண்டம் முழுக்க பொய்யா? அவசரப்படாதீங்க! இதுல, ஒரு சின்ன உண்மையும் ஒளிஞ்சிருக்கு.", { chapter: "ஒளிஞ்சிருக்கிற உண்மை", action: "whisper", overlay: { kind: "type", text: "ஒரு சின்ன உண்மை இருக்கு..." } }),
  L(22, "k5", "glacier", "இருபதாயிரம் வருஷத்துக்கு முன்னாடி, பூமியில பனியுகம். கடல் தண்ணியில நிறைய, பெரிய பனிப்பாறைகளா உறைஞ்சு போயிருந்துச்சு.", { sub: "20,000 வருஷத்துக்கு முன்னாடி, பூமியில பனியுகம். கடல் தண்ணியில நிறைய, பெரிய பனிப்பாறைகளா உறைஞ்சு போயிருந்துச்சு.", action: "think", overlay: { kind: "title", text: "பனியுகம்", small: "20,000 வருஷம் முன்னாடி" } }),
  L(23, "k5", "kanyakumari-waves", "அதனால, கடல் மட்டம், இப்போ இருக்கிறதை விட, கிட்டத்தட்ட நூத்தி இருபது மீட்டர் கீழ இருந்துச்சு!", { sub: "அதனால, கடல் மட்டம், இப்போ இருக்கிறதை விட, கிட்டத்தட்ட 120 மீட்டர் கீழ இருந்துச்சு!", action: "surprised", overlay: { kind: "year", value: 120, suffix: " மீட்டர்", label: "கடல் மட்டம் கீழே இருந்துச்சு", ruler: true } }),
  L(24, "k5", "adams-bridge", "அப்போ, இந்தியாவுக்கும் இலங்கைக்கும் நடுவுல, கடலே இல்ல! மக்கள், நடந்தே இலங்கைக்கு போயிருக்க முடியும்!", { action: "excited", overlay: { kind: "morph", from: "இன்னைக்கு: கடல்", to: "அன்னைக்கு: நிலம்" } }),
  L(25, "k6", "adams-bridge", "அப்புறம் பனி உருக உருக, கடல் மெல்ல மெல்ல மேல ஏறுச்சு. கிட்டத்தட்ட ஏழாயிரம் வருஷத்துக்கு முன்னாடி, அந்த நிலம் முழுசா கடலுக்குள்ள போயிடுச்சு.", { sub: "அப்புறம் பனி உருக உருக, கடல் மெல்ல மெல்ல மேல ஏறுச்சு. கிட்டத்தட்ட 7,000 வருஷத்துக்கு முன்னாடி, அந்த நிலம் முழுசா கடலுக்குள்ள போயிடுச்சு.", action: "sad", overlay: { kind: "title", text: "இந்தியா – இலங்கை நிலம் மூழ்கியது", small: "சுமார் 7,000 வருஷம் முன்னாடி" } }),
  L(26, "k6", "kanyakumari", "நம்ம தெற்குக் கரையிலயும், நிறைய நிலம், இப்படித்தான் மெல்ல மெல்ல கடலுக்குள்ள போச்சு.", { action: "point-down", overlay: { kind: "type", text: "கரையோர நிலம் கடலுக்குள்ள..." } }),
  L(27, "k6", "ocean", "கடற்கரையில வாழ்ந்த மக்கள், தலைமுறை தலைமுறையா, கடல் நிலத்தை எடுத்துக்கிறதைப் பார்த்திருப்பாங்க. அந்த ஞாபகம் தான், கதையா மாறியிருக்கலாம்னு, சில ஆய்வாளர்கள் சொல்றாங்க!", { action: "idea", overlay: { kind: "morph", from: "உண்மை நிகழ்வு", to: "தலைமுறைக் கதை" } }),

  // ── 5. Towns the sea took ──
  L(28, "k7", "poompuhar", "கடல் ஊர்களை எடுத்துக்கிறது, ரொம்ப பழைய கதை மட்டும் இல்ல. மணிமேகலையில, சோழர்களோட துறைமுகமான பூம்புகாரை, கடல் கொண்டு போச்சுன்னு, ஒரு கதை வருது.", { chapter: "கடல் கொண்ட ஊர்கள்", action: "point", overlay: { kind: "pin", text: "பூம்புகார்", small: "மணிமேகலை கதை" } }),
  L(29, "k7", "dhanushkodi", "ஆயிரத்து தொள்ளாயிரத்து அறுபத்தி நாலுல, ஒரு பெரிய புயல், ராமேஸ்வரம் பக்கத்துல இருந்த, தனுஷ்கோடி ஊரையே, ஒரே ராத்திரியில அழிச்சுடுச்சு!", { sub: "1964-ல, ஒரு பெரிய புயல், ராமேஸ்வரம் பக்கத்துல இருந்த, தனுஷ்கோடி ஊரையே, ஒரே ராத்திரியில அழிச்சுடுச்சு!", action: "sad", overlay: { kind: "pin", text: "தனுஷ்கோடி", small: "1964 புயல்" } }),
  L(30, "k7", "saluvankuppam", "ரெண்டாயிரத்து நாலு சுனாமிக்கு அப்புறம், மாமல்லபுரம் பக்கத்துல, மணல்ல புதைஞ்சிருந்த ஒரு பழைய முருகன் கோயிலை, ஆய்வாளர்கள் கண்டுபிடிச்சாங்க!", { sub: "2004 சுனாமிக்கு அப்புறம், மாமல்லபுரம் பக்கத்துல, மணல்ல புதைஞ்சிருந்த ஒரு பழைய முருகன் கோயிலை, ஆய்வாளர்கள் கண்டுபிடிச்சாங்க!", action: "surprised", overlay: { kind: "year", value: 2004, label: "சுனாமிக்கு அப்புறம் வெளிவந்த கோயில்" } }),
  L(31, "k7", "saluvankuppam", "செங்கல் அடித்தளம். அதுக்கு மேல, பல்லவர் காலத்து கருங்கல் கோயில். அதுவும், ஒரு காலத்துல, கடல் அலையால தான் அழிஞ்சிருக்கலாம்னு சொல்றாங்க.", { action: "count", overlay: { kind: "list", items: ["செங்கல் அடித்தளம்", "பல்லவர் கருங்கல் கோயில்", "கடல் அலையால அழிவு?"] } }),
  L(32, "k7", "shore-temple", "அதாவது, நம்ம கடற்கரை, எப்பவுமே மாறிக்கிட்டே தான் இருக்கு!", { action: "nod", overlay: { kind: "stamp", text: "கடற்கரை மாறிக்கிட்டே இருக்கு" } }),

  // ── The verdict, and goodbye ──
  L(33, "k8", "lemuria-map", "சரி, கடைசியா என்ன முடிவு? நகரங்களோட ஒரு பெரிய கண்டம் மூழ்கிப் போச்சுன்னு சொல்றதுக்கு, சயின்ஸ்ல ஆதாரம் இல்ல.", { chapter: "அப்போ முடிவு?", sub: "சரி, கடைசியா என்ன முடிவு? நகரங்களோட ஒரு பெரிய கண்டம் மூழ்கிப் போச்சுன்னு சொல்றதுக்கு, science-ல ஆதாரம் இல்ல.", action: "shrug", overlay: { kind: "title", text: "பெரிய கண்டம்?", small: "ஆதாரம் இல்ல" } }),
  L(34, "k8", "adams-bridge", "ஆனா, கடல் மட்டம் ஏறி, நம்ம கரையோர நிலம், நிறைய கடலுக்குள்ள போனது, உண்மை தான்!", { action: "thumbs", overlay: { kind: "title", text: "கரையோர நிலம் மூழ்கியது", small: "இது உண்மை" } }),
  L(35, "k8", "kanyakumari-sunset", "ஒரு கதைக்குள்ள ஒளிஞ்சிருக்கிற உண்மையைக் கண்டுபிடிக்கிறது தான், வரலாற்றோட சுவாரஸ்யமே!", { host: "big", action: "proud", overlay: { kind: "title", text: "கதைக்குள்ள ஒரு உண்மை" } }),
  L(36, "k8", "kanyakumari", "நீங்க சின்ன வயசுல, குமரிக் கண்டம் பத்தி என்ன கேள்விப்பட்டீங்க? கமெண்ட்ல சொல்லுங்க!", { action: "think", overlay: { kind: "type", text: "நீங்க என்ன கேள்விப்பட்டீங்க?" } }),
  L(37, "k8", "kanyakumari", "அடுத்த வீடியோல, எதைப் பத்தி பேசலாம்? அதையும் கமெண்ட்ல சொல்லுங்க. நான் எல்லா கமெண்ட்டையும் படிப்பேன்!", { action: "nod", overlay: { kind: "type", text: "அடுத்த வீடியோ? கமெண்ட்ல சொல்லுங்க" } }),
  L(38, "k8", "kanyakumari-sunset", "இந்த வீடியோ பிடிச்சிருந்தா, லைக் பண்ணுங்க, சப்ஸ்க்ரைப் பண்ணுங்க. மறுபடியும் சந்திப்போம். டாட்டா! பை பை!", { action: "wave", overlay: { kind: "title", text: "LIKE · SUBSCRIBE", small: "டாட்டா! பை பை!" } }),
];

/** Wikimedia Commons searches for each picture; `file` pins an exact file once one is chosen. */
const IMAGES: ExVideo["images"] = {
  kanyakumari: { q: "Kanyakumari Vivekananda Rock Memorial sea" },
  "kanyakumari-sunset": { q: "Kanyakumari sunset" },
  "kanyakumari-waves": { q: "Kanyakumari beach waves" },
  ocean: { q: "Kanyakumari sea rocks" },
  manuscript: { q: "Ettuthokai palm leaf", file: "File:Ettuthokai.jpg" },
  madurai: { q: "Meenakshi Amman Temple Madurai", file: "File:Madurai Meenakshi Amman Temple - South Tower.JPG" },
  kannagi: { q: "Kannagi statue Marina Chennai" },
  sclater: { q: "Philip Lutley Sclater", file: "File:PLSclater.jpg" },
  lemur: { q: "Ring-tailed lemur Madagascar" },
  "lemuria-map": { q: "Lemuria map" },
  plates: { q: "tectonic plates world map" },
  gondwana: { q: "Gondwana map" },
  "deep-ocean": { q: "Indian Ocean bathymetry map" },
  glacier: { q: "glacier ice sheet" },
  "adams-bridge": { q: "Palk Strait satellite", file: "File:Adam's Bridge, India-Sri Lanka (PIA24949).jpg" },
  poompuhar: { q: "Poompuhar beach" },
  dhanushkodi: { q: "Dhanushkodi ruins church" },
  saluvankuppam: { q: "Saluvankuppam" },
  "shore-temple": { q: "Shore Temple Mahabalipuram sea" },
};

export const KUMARI_KANDAM: ExVideo = {
  slug: "06 Kumari Kandam",
  title: "குமரிக் கண்டம்: உண்மையா? கட்டுக்கதையா?",
  lines: LINES,
  images: IMAGES,
  clean: true,
  look: "story",
  thumb: {
    visual: "kanyakumari",
    lines: [
      { text: "கடலுக்குள்ள", size: 170, fill: "#FFF6E6" },
      { text: "ஒரு தமிழ் நிலம்?!", size: 150, fill: "#E8B75A" },
      { text: "குமரிக் கண்டம்", size: 110, fill: "#FFF6E6" },
    ],
  },
  ...HOST_VOICE,
};
