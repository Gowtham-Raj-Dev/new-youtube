/** More scripts for the content bank, in the same shape as bank.ts; see that file for the format. */
import type { BankScript } from "./bank";

type Script = Omit<BankScript, "series">;

export const MORE_MIDDLE: Script[] = [
  {
    title: "Minimum balance fine 😤",
    lines: [
      ["பேங்க்ல இருந்து ஒரு மெசேஜ் வந்துச்சு.", "Bank-la irundhu oru message vandhuchu", "bank"],
      ["மினிமம் பேலன்ஸ் இல்ல, ஃபைன் ஐநூறு.", "Minimum balance illa, fine 500", "fine"],
      ["அக்கவுண்ட்ல இருந்ததே முன்னூறு தான்.", "Account-la irundhadhe 300 dhaan", "300"],
    ],
    punch: ["இப்போ பேங்க்குக்கு நான் தான் கடன்காரன்.", "Ippo bank-ku naan dhaan kadankaaran 😭", "kadankaaran"],
  },
  {
    title: "Oru dharam potta dress… ippo museum piece 👗",
    lines: [
      ["கல்யாணத்துக்கு புது ட்ரெஸ் வாங்கினேன்.", "Kalyanathukku pudhu dress vaanginen", "dress"],
      ["ஒரே ஒரு தடவை போட்டேன்.", "Ore oru dharam potten", "oru"],
      ["இப்போ அது பீரோல மியூசியம் பீஸ்.", "Ippo adhu beero-la museum piece", "museum"],
    ],
    punch: ["அந்த ட்ரெஸ் போட்ட போட்டோ தான், அஞ்சு வருஷமா என் டி பி.", "Andha dress photo dhaan 5 varushama en DP 😎", "DP"],
  },
  {
    title: "Free trial… 6 maasama kaasu poguthu 🫠",
    lines: [
      ["ஒரு ஃப்ரீ ட்ரையல் ஸ்டார்ட் பண்ணேன்.", "Oru free trial start pannen", "free"],
      ["கேன்சல் பண்ண மறந்துட்டேன்.", "Cancel panna marandhutten", "cancel"],
      ["ஆறு மாசமா, மாசம் நூத்தி தொண்ணூத்தி ஒன்பது போயிருக்கு.", "6 maasama, maasam 199 poyirukku", "199"],
    ],
    punch: ["அந்த ஆப்ல நான் ஒரு எபிசோட் கூட பாக்கல.", "Andha app-la naan oru episode kooda paakala 🫠", "episode"],
  },
  {
    title: "Gold vilai koraiyum-nu wait pannom 🪙",
    lines: [
      ["அம்மா: தங்கம் விலை குறையும், அப்போ வாங்கலாம்.", "Amma: Gold vilai koraiyum, appo vaangalaam", "koraiyum"],
      ["அடுத்த வருஷம் விலை டபுள்.", "Adutha varusham vilai double", "double"],
      ["அம்மா: அப்பவே வாங்கியிருக்கலாம்.", "Amma: Appave vaangiyirukkalaam", "appave"],
    ],
    punch: ["இப்போ அம்மா தங்கம் பத்தி பேசுனா, அப்பா டிவி வால்யூமை கூட்டிடுறாரு.", "Amma gold pathi pesinaa, Appa TV volume-ah koottiduraaru 📺", "volume"],
  },
  {
    title: "Tea kadai account… ₹1200 ☕",
    lines: [
      ["டீ கடைல: அக்கவுண்ட்ல எழுதுங்க.", "Tea kadai-la: \"Account-la ezhudhunga\"", "account"],
      ["மாச கடைசில கணக்கு பாத்தேன்.", "Maasa kadaisila kanakku paathen", "kanakku"],
      ["டீக்கு மட்டும் ஆயிரத்தி இருநூறு.", "Tea-ku mattum 1200", "1200"],
    ],
    punch: ["டீ கடைல என் போட்டோவை மாட்டி வெச்சிருக்காங்க. வி ஐ பி கஸ்டமர்.", "Tea kadai-la en photo maattirukkaanga. VIP customer ☕", "VIP"],
  },
  {
    title: "Smart fridge vs Appa logic 🧊",
    lines: [
      ["புது ஃப்ரிட்ஜ் வாங்கலாம் னு கடைக்கு போனோம்.", "Pudhu fridge vaangalaam-nu kadaikku ponom", "fridge"],
      ["சேல்ஸ்மேன்: இது ஸ்மார்ட் ஃப்ரிட்ஜ், ஃபோன்லயே கன்ட்ரோல் பண்ணலாம்.", "Salesman: Idhu smart fridge, phone-laye control", "smart"],
      ["அப்பா: பழைய ஃப்ரிட்ஜும் ஐஸ் போடுது.", "Appa: Pazhaya fridge-um ice podudhu", "ice"],
    ],
    punch: ["சேல்ஸ்மேனே அப்பா கிட்ட, சார் நீங்க எங்க கடைல வேலைக்கு வாங்க னு சொன்னாரு.", "Salesman: \"Sir, neenga enga kadaila velaikku vaanga\" 😂", "velaikku"],
  },
  {
    title: "Auto ₹150… 2 nimisham dhaan 🛺",
    lines: [
      ["ஆட்டோக்காரர்: இருநூறு ரூபாய்.", "Auto-kaarar: 200 rupees", "200"],
      ["நான்: நூறு தான்.", "Naan: 100 dhaan", "100"],
      ["நூத்தி அம்பதுக்கு டீல். ரெண்டே நிமிஷத்துல வந்துடுச்சு.", "150-ku deal. Rende nimisham-la vandhuduchu", "rende"],
    ],
    punch: ["ஆட்டோக்காரரே சிரிச்சாரு: சார், அது தான் உங்க வீடு.", "Auto-kaarar: \"Sir, adhu dhaan unga veedu\" 😂", "veedu"],
  },
  {
    title: "₹2000 pattasu… 10 nimisham-la kaali 🎆",
    lines: [
      ["தீபாவளிக்கு ரெண்டாயிரம் ரூபாய்க்கு பட்டாசு.", "Diwali-ku 2000 rupees-ku pattasu", "pattasu"],
      ["பத்து நிமிஷத்துல எல்லாம் காலி.", "10 nimisham-la ellaam kaali", "kaali"],
      ["காசு முழுக்க புகையா போச்சு.", "Kaasu muzhukka pugai-ah pochu", "pugai"],
    ],
    punch: ["இப்போ பக்கத்து வீட்டு பட்டாசுக்கு தான் நான் டான்ஸ் ஆடுறேன்.", "Ippo pakkathu veetu pattasu-ku dhaan naan dance aadren 💃", "dance"],
  },
  {
    title: "2GB/day plan… use pannadhu 500MB 📶",
    lines: [
      ["ரீசார்ஜ் முடிஞ்சுது.", "Recharge mudinjuchu", "recharge"],
      ["அன்லிமிடெட் ப்ளான், டெய்லி டூ ஜி பி.", "Unlimited plan, daily 2GB", "unlimited"],
      ["யூஸ் பண்ணது டெய்லி அஞ்நூறு எம் பி.", "Use pannadhu daily 500MB", "500MB"],
    ],
    punch: ["மீதி டேட்டாவை பக்கத்து வீட்டுக்காரங்க ஹாட்ஸ்பாட்ல யூஸ் பண்றாங்க.", "Meedhi data-va pakkathu veettukaaranga hotspot-la use panraanga 📶", "hotspot"],
  },
  {
    title: "Mama: adutha maasam tharen 📵",
    lines: [
      ["மாமா: ஒரு பத்தாயிரம் வேணும், அடுத்த மாசம் தரேன்.", "Mama: 10,000 venum, adutha maasam tharen", "10,000"],
      ["அடுத்த மாசம்: ஃபோன் ஸ்விட்ச் ஆஃப்.", "Adutha maasam: phone switch off", "switch"],
      ["கல்யாணத்துல பாத்தா: நல்லா இருக்கியா பா?", "Kalyanathula paatha: \"Nalla irukkiya pa?\"", "nalla"],
    ],
    punch: ["மாமா இப்போ என் கல்யாணத்துல, அதே பத்தாயிரத்தை மொய்யா எழுதுறாராம்.", "Mama: en kalyanathula adhe 10,000-ah moi-ah ezhudhuraaraam 😂", "moi"],
  },
  {
    title: "10 kilo arisi… paadhi kozhi-ku 🐔",
    lines: [
      ["மொத்தமா வாங்குனா சீப் னு பத்து கிலோ அரிசி வாங்கினோம்.", "Bulk-ah vaangina cheap-nu 10 kilo arisi vaanginom", "cheap"],
      ["வீட்ல வண்டு வந்துடுச்சு.", "Veetla vandu vandhuduchu", "vandu"],
      ["பாதி அரிசி கோழிக்கு போச்சு.", "Paadhi arisi kozhi-ku pochu", "kozhi"],
    ],
    punch: ["இப்போ அந்த கோழியே, இன்னும் அரிசி இருக்கா னு கேக்குது.", "Ippo andha kozhi-e \"innum arisi irukka?\"-nu kekkudhu 🐔", "kozhi"],
  },
  {
    title: "₹50 cashback-kaaga ₹500 selavu 🎟️",
    lines: [
      ["அம்பது ரூபாய் கேஷ்பேக்குக்காக,", "₹50 cashback-kaaga...", "cashback"],
      ["அஞ்நூறு ரூபாய்க்கு ஆர்டர் போட்டேன்.", "₹500-ku order potten", "500"],
      ["ஸ்க்ராட்ச் கார்டுல: பெட்டர் லக் நெக்ஸ்ட் டைம்.", "Scratch card-la: \"Better luck next time\"", "luck"],
    ],
    punch: ["அடுத்த கார்டுல: ட்ரை அகெய்ன். நான் இனிமே ட்ரை பண்ண மாட்டேன்.", "Adutha card: \"Try again\". Naan inime try panna maatten 😤", "maatten"],
  },
  {
    title: "Appa: current un appan veetu sothaa? 💡",
    lines: [
      ["வீட்ல எல்லா ரூம்லயும் லைட், ஃபேன் ஆன்.", "Ellaa room-layum light, fan on", "on"],
      ["ரூம்ல யாருமே இல்ல.", "Room-la yaarume illa", "yaarume"],
      ["அப்பா: கரண்ட் என்ன உங்க அப்பன் வீட்டு சொத்தா?", "Appa: \"Current enna un appan veetu sothaa?\"", "sothaa"],
    ],
    punch: ["அப்புறம் தான் தெரிஞ்சுது, அது உண்மையாவே தாத்தா வீடு தான்.", "Apram dhaan theriyum... adhu unmaiyave Thaatha veedu dhaan 😂", "Thaatha"],
  },
  {
    title: "₹2000 brand vs ₹400 local 👕",
    lines: [
      ["பிராண்ட் ஷர்ட் ரெண்டாயிரம் ரூபாய்.", "Brand shirt 2000 rupees", "2000"],
      ["லோக்கல் ஷர்ட் நானூறு ரூபாய்.", "Local shirt 400 rupees", "400"],
      ["ஒரு வாஷுக்கு அப்புறம் ரெண்டும் ஒரே மாதிரி.", "Oru wash-ku apram rendum ore maadhiri", "wash"],
    ],
    punch: ["இப்போ லோக்கல் ஷர்ட்ல, பிராண்ட் ஸ்டிக்கர் ஒட்டி போட்டுக்குறேன்.", "Ippo local shirt-la brand sticker otti potturen 😎", "sticker"],
  },
  {
    title: "\"Enakku onnum aagaadhu\" 🏥",
    lines: [
      ["ஹெல்த் இன்ஷூரன்ஸ் எடுங்க னு ஏஜென்ட் சொன்னாரு.", "Agent: Health insurance edunga", "insurance"],
      ["நான்: எனக்கு ஒண்ணும் ஆகாது.", "Naan: Enakku onnum aagaadhu", "onnum"],
      ["அடுத்த மாசம்: கால் சுளுக்கு, ஹாஸ்பிட்டல் பில் முப்பதாயிரம்.", "Adutha maasam: hospital bill 30,000", "30,000"],
    ],
    punch: ["ஏஜென்ட் இப்போ, நான் சொன்னேன்ல னு என்னை வெச்சு ரீல்ஸ் போடுறாரு.", "Agent ippo \"naan sonnen la\"-nu ennai vechu reels podraaru 🤦", "reels"],
  },
  {
    title: "Veetla 47 empty box 📦",
    lines: [
      ["ஆன்லைன் பார்சல் பாக்ஸ் வந்தா,", "Online parcel box vandhaa...", "box"],
      ["அம்மா அதை தூக்கி போட விட மாட்டாங்க.", "Amma adha thookki poda vida maattaanga", "maattaanga"],
      ["இப்போ வீட்ல நாப்பத்தி ஏழு காலி பாக்ஸ்.", "Ippo veetla 47 empty box", "47"],
    ],
    punch: ["அடுத்த பாக்ஸ் வந்தா, அதை வைக்க இன்னொரு பாக்ஸ் வாங்கணும்.", "Adutha box vandhaa, adha vekka innoru box vaanganum 📦", "innoru"],
  },
  {
    title: "Chicken vaanga ponen… muttai vaangitu vandhen 🥚",
    lines: [
      ["ஞாயிறு சிக்கன் வாங்க போனேன்.", "Sunday chicken vaanga ponen", "chicken"],
      ["விலை கேட்டதும்,", "Vilai kettadhum...", "vilai"],
      ["கடைசியா முட்டை வாங்கிட்டு வந்தேன்.", "Kadaisiyaa muttai vaangitu vandhen", "muttai"],
    ],
    punch: ["இப்போ முட்டை விலை கேட்டு, கோழியே சிரிக்குது.", "Ippo muttai vilai kettu kozhi-e sirikkudhu 🐔😂", "sirikkudhu"],
  },
  {
    title: "Friend car vaanginaan… EMI kettaen 🚗",
    lines: [
      ["ஃப்ரெண்ட் புது கார் வாங்கினான்.", "Friend pudhu car vaanginaan", "car"],
      ["நானும் வாங்கணும் னு தோணுச்சு.", "Naanum vaanganum-nu thonuchu", "naanum"],
      ["அப்புறம் அவனோட இ எம் ஐ கேட்டேன்.", "Appuram avanoda EMI kettaen", "EMI"],
    ],
    punch: ["அவன் இ எம் ஐ கேட்டதும், என் சைக்கிளுக்கு புது பெல் வாங்கினேன்.", "Avan EMI kettadhum, en cycle-ku pudhu bell vaanginen 🚲🔔", "bell"],
  },
  {
    title: "Minimum due mattum katten 💳",
    lines: [
      ["கிரெடிட் கார்ட்ல மினிமம் ட்யூ மட்டும் கட்டினேன்.", "Credit card-la minimum due mattum katten", "minimum"],
      ["அது தான் ஸ்மார்ட் னு நினைச்சேன்.", "Adhu dhaan smart-nu ninaichen", "smart"],
      ["இன்ட்ரஸ்ட் பாத்ததும் தலை சுத்துச்சு.", "Interest paathadhum thala suthuchu", "interest"],
    ],
    punch: ["இப்போ பேங்க் எனக்கு பர்த்டே விஷ் அனுப்புது. நான் தான் அவங்க ஃபேவரைட் கஸ்டமர்.", "Ippo bank enakku birthday wish anupputhu. Favourite customer 🎂", "favourite"],
  },
  {
    title: "Gift ₹300, packing ₹250 🎁",
    lines: [
      ["பர்த்டேக்கு முன்னூறு ரூபாய்க்கு கிஃப்ட் வாங்கினேன்.", "Birthday-ku ₹300 gift vaanginen", "gift"],
      ["கிஃப்ட் ராப் நூத்தி அம்பது, கார்டு நூறு.", "Gift wrap 150, card 100", "wrap"],
      ["கிஃப்ட்டை விட பேக்கிங் காஸ்ட்லி.", "Gift-ah vida packing costly", "packing"],
    ],
    punch: ["அவன் ராப்பரை வெச்சுக்கிட்டான். கிஃப்ட்டை வேற ஒருத்தருக்கு குடுத்துட்டான்.", "Avan wrapper-ah vechukittaan. Gift-ah vera oruthar-ku kuduthuttaan 🎁", "wrapper"],
  },
];

export const MORE_OFFICE: Script[] = [
  {
    title: "Mela shirt, keezha lungi 👔",
    lines: [
      ["ஆன்லைன் மீட்டிங்: கேமரா ஆன் பண்ணுங்க.", "Online meeting: \"Camera on pannunga\"", "camera"],
      ["மேல ஷர்ட், கீழ லுங்கி.", "Mela shirt, keezha lungi", "lungi"],
      ["தெரியாம எழுந்துட்டேன்.", "Theriyaama ezhundhutten", "ezhundhutten"],
    ],
    punch: ["இப்போ க்ளையன்டே, அந்த லுங்கி எந்த பிராண்ட் னு கேக்குறாரு.", "Client: \"Andha lungi endha brand?\" 😂", "brand"],
  },
  {
    title: "Mute-nu nenachen… mute illa 🎙️",
    lines: [
      ["மீட்டிங்ல மியூட் னு நினைச்சு,", "Meeting-la mute-nu ninaichu...", "mute"],
      ["பாஸை பத்தி கமெண்ட் அடிச்சேன்.", "Boss-ah pathi comment adichen", "comment"],
      ["மியூட் இல்ல.", "Mute... illa", "illa"],
    ],
    punch: ["பாஸ்: கரெக்ட் தான். நாளைக்கு காலைல என் கேபினுக்கு வா.", "Boss: \"Correct dhaan. Naalaiku en cabin-ku vaa\" 😰", "cabin"],
  },
  {
    title: "Boss: oru small change 😶",
    lines: [
      ["அஞ்சு மணிக்கு கிளம்ப ரெடி.", "5 mani-ku kelamba ready", "ready"],
      ["பாஸ்: ஒரு ஸ்மால் சேஞ்ச்.", "Boss: \"Oru small change\"", "small"],
      ["ராத்திரி ஒன்பது மணி.", "Night 9 mani", "9"],
    ],
    punch: ["இப்போ பாஸ் ஸ்மால் னு சொன்னாலே, அம்மா கிட்ட டின்னர் வேண்டாம் னு சொல்லிடுறேன்.", "Boss \"small\" sonnaale, Amma kitta \"dinner venaam\" 😭", "dinner"],
  },
  {
    title: "HR: expected salary? Naan: edhu kuduthaalum OK 🤦",
    lines: [
      ["ஹெச் ஆர்: உங்க எக்ஸ்பெக்டட் சாலரி?", "HR: Unga expected salary?", "expected"],
      ["நான்: நீங்க என்ன குடுத்தாலும் ஓகே.", "Naan: Neenga enna kuduthaalum OK", "OK"],
      ["ஹெச் ஆர் ரொம்ப சந்தோஷம்.", "HR romba santhosham", "santhosham"],
    ],
    punch: ["ஹெச் ஆர் அன்னைக்கே என் போட்டோவை பெஸ்ட் எம்ப்ளாயி போர்டுல போட்டாங்க.", "HR andha naale en photo-va \"best employee\" board-la pottaanga 😂", "board"],
  },
  {
    title: "Resume-la Excel expert 📊",
    lines: [
      ["ரெஸ்யூம்ல: எக்ஸெல் எக்ஸ்பர்ட்.", "Resume-la: Excel expert", "expert"],
      ["முதல் நாள்: வீ லுக்கப் பண்ணுங்க.", "First day: \"VLOOKUP pannunga\"", "VLOOKUP"],
      ["நான்: கூகுள்ல வீ லுக்கப் எப்படி.", "Naan: Google-la \"VLOOKUP eppadi\"", "Google"],
    ],
    punch: ["ரெண்டாவது நாள்ல இருந்து, கூகுளே எனக்கு வெல்கம் பேக் சொல்லுது.", "2-vadhu naal-la irundhu Google-e enakku \"Welcome back\" 😅", "welcome"],
  },
  {
    title: "Weekend-la \"konjam paarunga\" 💻",
    lines: [
      ["வெள்ளிக்கிழமை ஆறு மணி.", "Friday 6 mani", "Friday"],
      ["பாஸ்: வீக்கெண்ட்ல கொஞ்சம் பாருங்க.", "Boss: \"Weekend-la konjam paarunga\"", "weekend"],
      ["வீக்கெண்ட் முழுக்க லேப்டாப்.", "Weekend muzhukka laptop", "laptop"],
    ],
    punch: ["இப்போ லேப்டாப்பே, எனக்கும் வீக்கெண்ட் வேணும் னு ஹேங் ஆகுது.", "Ippo laptop-e \"enakkum weekend venum\"-nu hang aagudhu 💻", "hang"],
  },
  {
    title: "Naan \"hmm\" mattum dhaan sonnen 🤐",
    lines: [
      ["பேன்ட்ரில ஒருத்தர் காசிப் சொன்னாரு.", "Pantry-la oruthar gossip sonnaaru", "gossip"],
      ["நான் ஹ்ம் ஹ்ம் னு சொன்னேன்.", "Naan \"hmm hmm\"-nu sonnen", "hmm"],
      ["அடுத்த நாள்: நான் தான் சொன்னேன் னு நியூஸ்.", "Adutha naal: \"Naan dhaan sonnen\"-nu news", "news"],
    ],
    punch: ["இப்போ நான் ஹ்ம் கூட சொல்றதில்ல. ம்ம் மட்டும் தான்.", "Ippo naan \"hmm\" kooda solradhilla. \"Mm\" mattum dhaan 🤐", "mm"],
  },
  {
    title: "ASAP, EOD, sync up… 🤯",
    lines: [
      ["முதல் நாள் ஆபீஸ்.", "First day office", "first"],
      ["எல்லாரும்: ஏ எஸ் ஏ பி, ஈ ஓ டி, சிங்க் அப்.", "Ellaarum: ASAP, EOD, sync up", "ASAP"],
      ["நான்: கூகுள் ட்ரான்ஸ்லேட்.", "Naan: Google Translate", "translate"],
    ],
    punch: ["மூணு மாசம் கழிச்சு, நானே லெட்ஸ் சிங்க் அப் னு சொல்றேன்.", "3 maasam kazhichu naane \"let's sync up\" solren 🤓", "sync"],
  },
  {
    title: "Resign pannen… hike vandhuchu, work double 📈",
    lines: [
      ["ரிசைன் பண்ண முடிவு பண்ணேன்.", "Resign panna decide pannen", "resign"],
      ["பாஸ்: ஹைக் தரேன், இரு.", "Boss: \"Hike tharen, iru\"", "hike"],
      ["ஹைக் வந்துச்சு. வேலை டபுள்.", "Hike vandhuchu. Vela double.", "double"],
    ],
    punch: ["இப்போ ரிசைன் லெட்டர் டிராஃப்ட்ல ரெடி. அடுத்த ஹைக்குக்காக.", "Ippo resign letter draft-la ready. Adutha hike-kaaga 😎", "draft"],
  },
  {
    title: "25 vayasu, 40 vayasu udambu 🪑",
    lines: [
      ["ஒன்பது மணி நேரம் சேர்ல.", "9 mani neram chair-la", "chair"],
      ["முதுகு வலி, கழுத்து வலி.", "Muthugu vali, kazhuthu vali", "vali"],
      ["டாக்டர்: இருபத்தஞ்சு வயசுல நாப்பது வயசு உடம்பு.", "Doctor: 25 vayasula 40 vayasu udambu", "40"],
    ],
    punch: ["டாக்டர்: சேரை மாத்துங்க, இல்ல ஆபீஸையே மாத்துங்க.", "Doctor: \"Chair-ah maathunga, illa office-aye maathunga\" 😂", "office"],
  },
  {
    title: "Curd rice saapten, biryani share katten 🍛",
    lines: [
      ["டீம் லஞ்ச் னு சொன்னாங்க.", "Team lunch-nu sonnaanga", "lunch"],
      ["பில்லை சரியா ஸ்ப்ளிட் பண்ணாங்க.", "Bill-ah equal-ah split pannaanga", "equal"],
      ["நான் சாப்டது தயிர் சாதம். கட்டுனது பிரியாணி ஷேர்.", "Naan saapttadhu curd rice. Kattinadhu biryani share", "biryani"],
    ],
    punch: ["அடுத்த டீம் லஞ்சுக்கு, நான் தான் முதல்ல பிரியாணி ஆர்டர் பண்ணுவேன்.", "Next team lunch-ku naan dhaan mudhalla biryani order 🍗", "mudhalla"],
  },
  {
    title: "Presentation time… laptop updating 0% 💀",
    lines: [
      ["முக்கியமான ப்ரசன்டேஷன்.", "Important presentation", "presentation"],
      ["லேப்டாப்: அப்டேட்டிங், ஜீரோ பர்சென்ட்.", "Laptop: Updating... 0%", "updating"],
      ["பாஸ்: நீங்க ரெடியா?", "Boss: Neenga ready-aa?", "ready"],
    ],
    punch: ["பாஸ்: அப்டேட் முடிஞ்சதும் பேசலாம். அப்டேட் மூணு மணி நேரம்.", "Boss: \"Update mudinjadhum pesalaam\". Update: 3 mani neram 💀", "3"],
  },
  {
    title: "Promotion: salary 10%, work 100% 😵",
    lines: [
      ["ப்ரமோஷன் கிடைச்சுது.", "Promotion kidaichuchu", "promotion"],
      ["சாலரி பத்து பர்சென்ட் கூடுச்சு.", "Salary 10% kooduchu", "10%"],
      ["வேலை நூறு பர்சென்ட் கூடுச்சு.", "Vela 100% kooduchu", "100%"],
    ],
    punch: ["புது டெசிக்னேஷனை பாத்து அம்மா: சாலரியும் இவ்ளோ பெருசா?", "Amma: \"Designation perusu... salary-um ivlo perusaa?\" 😂", "salary"],
  },
  {
    title: "10 km office, 1.5 mani neram traffic 🚦",
    lines: [
      ["ஆபீஸ் பத்து கிலோமீட்டர்.", "Office 10 km", "10"],
      ["ட்ராஃபிக்ல ஒன்றரை மணி நேரம்.", "Traffic-la 1.5 mani neram", "traffic"],
      ["ஆபீஸ் ரீச் ஆகும் போது எனர்ஜி ஜீரோ.", "Office reach aagum podhu energy zero", "zero"],
    ],
    punch: ["ட்ராஃபிக்லயே ஒரு புக் எழுதிட்டேன். டைட்டில்: சிக்னல்.", "Traffic-laye oru book ezhudhitten. Title: \"Signal\" 🚦", "signal"],
  },
  {
    title: "Office group: good morning poo 🌸",
    lines: [
      ["ஆபீஸ் வாட்ஸ்அப் க்ரூப்.", "Office WhatsApp group", "WhatsApp"],
      ["குட் மார்னிங் பூ, ஃபார்வர்ட்ஸ்.", "Good morning poo, forwards", "forwards"],
      ["முக்கியமான மெசேஜ் முன்னூறாவது மெசேஜுக்குள்ள மறைஞ்சுடுச்சு.", "Mukkiyamaana message 300 message-kulla maraindhuduchu", "maraindhuduchu"],
    ],
    punch: ["முக்கியமான மெசேஜுக்கு ஒரே ரிப்ளை: குட் மார்னிங் வணக்கம்.", "Mukkiyamaana message-ku reply: \"🙏 Good morning\"", "morning"],
  },
  {
    title: "Deadline 2 vaaram… last night full coffee ☕",
    lines: [
      ["டெட்லைன் இன்னும் ரெண்டு வாரம்.", "Deadline innum 2 vaaram", "deadline"],
      ["நான்: டைம் இருக்கு.", "Naan: Time irukku", "time"],
      ["கடைசி நாள் ராத்திரி முழுக்க காபி.", "Kadaisi naal night full coffee", "coffee"],
    ],
    punch: ["டெட்லைன் முடிஞ்சதும், காபி மெஷினே லீவ் எடுத்துடுச்சு.", "Deadline mudinjadhum coffee machine-e leave eduthuduchu ☕😴", "leave"],
  },
  {
    title: "\"Honest feedback sollunga\" 😬",
    lines: [
      ["மேனேஜர்: ஃபீட்பேக் சொல்லுங்க, ஹானஸ்டா.", "Manager: Feedback sollunga, honest-ah", "honest"],
      ["நான் ஹானஸ்டா சொன்னேன்.", "Naan honest-ah sonnen", "sonnen"],
      ["அடுத்த அப்ரைசல்ல நான் தான் ஃபீட்பேக்.", "Adutha appraisal-la naan dhaan feedback", "feedback"],
    ],
    punch: ["இப்போ ஹானஸ்ட் ஃபீட்பேக் கேட்டா, எல்லாம் சூப்பர் சார் தான்.", "Ippo honest feedback kettaa: \"Ellaam super sir\" 👍", "super"],
  },
  {
    title: "Sick leave + beach story = 💀",
    lines: [
      ["சிக் லீவ் எடுத்தேன்.", "Sick leave eduthen", "sick"],
      ["இன்ஸ்டால பீச் ஸ்டோரி போட்டேன்.", "Insta-la beach story potten", "beach"],
      ["பாஸும் என்னை ஃபாலோ பண்றாரு.", "Boss-um ennai follow panraaru", "follow"],
    ],
    punch: ["பாஸ் கமெண்ட்: கெட் வெல் சூன். பீச்லயே.", "Boss comment: \"Get well soon... beach-laye\" 💀", "soon"],
  },
  {
    title: "Dhinamum 6 coffee 😵‍💫",
    lines: [
      ["ஆபீஸ் காபி மெஷின்ல ஒரு நாளைக்கு ஆறு காபி.", "Office coffee machine-la oru naalaiku 6 coffee", "6"],
      ["ராத்திரி தூக்கம் இல்ல.", "Night thookkam illa", "thookkam"],
      ["காலைல மறுபடியும் ஆறு காபி.", "Kaalaila marupadiyum 6 coffee", "marupadiyum"],
    ],
    punch: ["இப்போ என் ப்ளட் டெஸ்ட்லயும் காபி வாசனை வருதாம்.", "Ippo en blood test-la kooda coffee vaasanai varudhaam ☕", "vaasanai"],
  },
  {
    title: "LinkedIn: thrilled to survive Monday 😂",
    lines: [
      ["லிங்க்ட்இன்ல எல்லாரும்: த்ரில்ட் டு அனவுன்ஸ்.", "LinkedIn-la ellaarum: \"Thrilled to announce\"", "thrilled"],
      ["நான்: த்ரில்ட் டு சர்வைவ் மண்டே.", "Naan: \"Thrilled to survive Monday\"", "survive"],
      ["அதுக்கு ரெண்டு லைக்ஸ்.", "Adhukku 2 likes", "2"],
    ],
    punch: ["அதுல ஒரு லைக் எங்க அம்மா. இன்னொன்னு என் இன்னொரு அக்கவுண்ட்.", "Oru like en Amma. Innonnu en second account 😂", "second"],
  },
];

export const MORE_AMMA: Script[] = [
  {
    title: "Amma-voda 5 nimisham = 1 mani neram ⏰",
    lines: [
      ["அம்மா: அஞ்சு நிமிஷத்துல ரெடி ஆகு.", "Amma: 5 nimisham-la ready aagu", "5"],
      ["நான் அஞ்சு நிமிஷத்துல ரெடி.", "Naan 5 nimisham-la ready", "ready"],
      ["அம்மா இன்னும் ஒரு மணி நேரமா புடவை செலக்ட் பண்றாங்க.", "Amma innum 1 mani neramaa saree select panraanga", "saree"],
    ],
    punch: ["நாங்க ஃபங்ஷனுக்கு போய் சேர்ந்தப்போ, ஃபங்ஷன் முடிஞ்சிடுச்சு.", "Naanga reach aanappo function mudinjiduchu 😂", "mudinjiduchu"],
  },
  {
    title: "Amma ippo family group admin 📱",
    lines: [
      ["அம்மாவுக்கு வீடியோ கால் சொல்லிக் குடுத்தேன்.", "Amma-ku video call solli kuduthen", "video"],
      ["பத்து தடவை.", "10 dharam...", "10"],
      ["இப்போ அம்மா தான் ஃபேமிலி க்ரூப் அட்மின்.", "Ippo Amma dhaan family group admin", "admin"],
    ],
    punch: ["இப்போ அம்மா என்னையே க்ரூப்ல இருந்து ரிமூவ் பண்ணிடுவாங்களோ னு பயம்.", "Ippo Amma ennaiye group-la irundhu remove pannuvaangalo-nu bayam 😰", "remove"],
  },
  {
    title: "Amma: indha message-ah 10 peruku anuppu 😅",
    lines: [
      ["அம்மா: இந்த மெசேஜை பத்து பேருக்கு அனுப்பு, இல்லனா கெட்டது நடக்கும்.", "Amma: Indha message-ah 10 peruku anuppu", "anuppu"],
      ["நான்: அம்மா, இது ஃபேக்.", "Naan: Amma, idhu fake", "fake"],
      ["அம்மா: நீ அனுப்பு, உனக்கு என்ன போச்சு?", "Amma: Nee anuppu, unakku enna pochu?", "pochu"],
    ],
    punch: ["அடுத்த நாள் என் ஃபோன் உடைஞ்சுது. அம்மா: நான் சொன்னேன்ல.", "Adutha naal en phone udanjuchu. Amma: \"Naan sonnen la\" 😂", "sonnen"],
  },
  {
    title: "Amma: thalaikku ennai vai 💆",
    lines: [
      ["அம்மா: தலைக்கு எண்ணெய் வை.", "Amma: Thalaikku ennai vai", "ennai"],
      ["நான்: ஸ்டைல் கெட்டுப் போகும்.", "Naan: Style kettu pogum", "style"],
      ["பத்து வருஷம் கழிச்சு: அம்மா, நீங்க என்ன எண்ணெய் யூஸ் பண்றீங்க?", "10 varusham kazhichu: \"Amma, enna oil use panreenga?\"", "oil"],
    ],
    punch: ["அம்மா இப்போ அந்த எண்ணெயை எனக்கே ஸ்பெஷல் ப்ரைஸ்ல விக்குறாங்க.", "Amma ippo andha oil-ah enakke special price-la vikkuraanga 💰", "special"],
  },
  {
    title: "Bus stop varaikkum idli 🫓",
    lines: [
      ["லேட் ஆச்சு, ப்ரேக்ஃபாஸ்ட் ஸ்கிப்.", "Late aachu, breakfast skip", "skip"],
      ["அம்மா பஸ் ஸ்டாப் வரைக்கும் இட்லியோட வந்தாங்க.", "Amma bus stop varaikkum idli-oda vandhaanga", "idli"],
      ["பஸ்ல இட்லி, எல்லாரும் பாத்தாங்க.", "Bus-la idli, ellaarum paathaanga", "ellaarum"],
    ],
    punch: ["பஸ் கண்டக்டரும் ஒரு இட்லி கேட்டாரு.", "Bus conductor-um oru idli kettaaru 😂", "conductor"],
  },
  {
    title: "Rendu Amma-vum ore maadhiri 😂",
    lines: [
      ["அம்மா: உன் ஃப்ரெண்ட் எவ்ளோ நல்ல பையன்.", "Amma: Un friend evlo nalla paiyan", "nalla"],
      ["அவன் வீட்ல: நான் தான் நல்ல பையன்.", "Avan veetla: naan dhaan nalla paiyan", "naan"],
      ["ரெண்டு அம்மாவும் ஒரே மாதிரி.", "Rendu Amma-vum ore maadhiri", "ore"],
    ],
    punch: ["இப்போ ரெண்டு அம்மாவும் சேர்ந்து, எங்களை கம்பேர் பண்ண ஒரு க்ரூப் வெச்சிருக்காங்க.", "Rendu Amma-vum serndhu engalai compare panna oru group 😂", "group"],
  },
  {
    title: "Last over vs serial time 📺",
    lines: [
      ["கிரிக்கெட் மேட்ச், லாஸ்ட் ஓவர்.", "Cricket match, last over", "last"],
      ["அம்மா: சீரியல் டைம்.", "Amma: Serial time", "serial"],
      ["ரிமோட் அம்மா கிட்ட. ரிசல்ட் நியூஸ்ல பாத்தேன்.", "Remote Amma kitta. Result news-la paathen", "remote"],
    ],
    punch: ["அன்னைக்கு சீரியல்லயும் ஒரு மேட்ச் நடந்துச்சு. மாமியார் வெர்சஸ் மருமகள்.", "Andha naal serial-laiyum oru match: Maamiyaar vs Marumagal 🏏", "match"],
  },
  {
    title: "\"Uppu konjam kammi\" sonnen 🧂",
    lines: [
      ["அம்மா சமைச்ச சாப்பாடு.", "Amma samaicha saapadu", "saapadu"],
      ["நான்: உப்பு கொஞ்சம் கம்மி.", "Naan: Uppu konjam kammi", "uppu"],
      ["அடுத்த நாள்: நீயே சமைச்சுக்கோ.", "Adutha naal: \"Neeye samaichukko\"", "neeye"],
    ],
    punch: ["இப்போ சாப்பாட்டுல உப்பே இல்லனாலும், சூப்பர் மா தான்.", "Ippo uppe illanaalum: \"Super Ma!\" 😋", "super"],
  },
  {
    title: "95 mark… matha 5 enga? 📝",
    lines: [
      ["எக்ஸாம் ரிசல்ட் வந்துச்சு.", "Exam result vandhuchu", "result"],
      ["அம்மா: தொண்ணூத்தி அஞ்சா? மீதி அஞ்சு மார்க் எங்க?", "Amma: 95-aa? Meedhi 5 mark enga?", "5"],
      ["நான்: அம்மா, க்ளாஸ் ஃபர்ஸ்ட்.", "Naan: Amma, class first", "first"],
    ],
    punch: ["அடுத்த எக்ஸாம்ல நூறு வாங்கினேன். அம்மா: எல்லாருக்கும் நூறா?", "Adutha exam-la 100. Amma: \"Ellaarukkum 100-aa?\" 🙄", "ellaarukkum"],
  },
  {
    title: "Amma bargaining: 2 mani neram, ₹20 save 🛍️",
    lines: [
      ["அம்மா கூட மார்க்கெட்டுக்கு போனேன்.", "Amma kooda market-ku ponen", "market"],
      ["ஒவ்வொரு கடையிலும்: கொஞ்சம் கம்மி பண்ணுங்க.", "Ovvoru kadaiyilum: \"Konjam kammi pannunga\"", "kammi"],
      ["ரெண்டு மணி நேரம், இருபது ரூபாய் சேவ்.", "2 mani neram, 20 rupees save", "20"],
    ],
    punch: ["கடைக்காரரே, இன்னைக்கு நீங்க தான் ஓனர் னு அம்மா கிட்ட சொன்னாரு.", "Kadaikaarar: \"Inniku neenga dhaan owner Ma\" 😂", "owner"],
  },
  {
    title: "Night 11 mani… Amma innum thoongala 🌙",
    lines: [
      ["ராத்திரி பதினொரு மணிக்கு வீட்டுக்கு வந்தேன்.", "Night 11 mani-ku veettukku vandhen", "11"],
      ["அம்மா தூங்காம வெயிட்.", "Amma thoongaama wait", "wait"],
      ["நான்: தூங்கலாமே மா.", "Naan: Thoongalaame Ma", "thoongalaame"],
    ],
    punch: ["அம்மா: சாப்டியா? நான்: சாப்டேன். அம்மா: சரி, இன்னும் கொஞ்சம் சாப்டு.", "Amma: \"Seri, innum konjam saapdu\" 🍚", "konjam"],
  },
  {
    title: "Amma selfie: innonnu, innonnu 🤳",
    lines: [
      ["அம்மா கூட செல்ஃபி.", "Amma kooda selfie", "selfie"],
      ["அம்மா: இன்னொன்னு, இன்னொன்னு, இன்னொன்னு.", "Amma: Innonnu, innonnu, innonnu", "innonnu"],
      ["அம்பது போட்டோ, எல்லாத்துலயும் கண்ணை மூடிட்டாங்க.", "50 photo, ellaathulayum kann moodi", "50"],
    ],
    punch: ["அம்மா டி பி யா வெச்ச போட்டோல, நான் தான் கண்ணை மூடிட்டேன்.", "Amma DP-ah vecha photo-la naan dhaan kann moodi 😂", "DP"],
  },
  {
    title: "Amma: naan nalla dhaan irukken, tablet venaam 💊",
    lines: [
      ["அம்மாவுக்கு பிபி மாத்திரை.", "Amma-ku BP tablet", "BP"],
      ["அம்மா: நான் நல்லா தான் இருக்கேன், வேணாம்.", "Amma: Naan nalla dhaan irukken, venaam", "venaam"],
      ["டாக்டர்: மாத்திரையை நிறுத்தக்கூடாது.", "Doctor: Tablet-ah nirutha koodadhu", "nirutha"],
    ],
    punch: ["இப்போ அம்மா மாத்திரை சாப்பிட, நான் ஒரு ஜிலேபி குடுக்கணும்.", "Ippo Amma tablet saapida, naan oru jilebi kudukkanum 😂", "jilebi"],
  },
  {
    title: "Relatives: salary evlo? kalyanam eppo? 🙄",
    lines: [
      ["சொந்தக்காரங்க: என்ன வேலை? எவ்ளோ சாலரி? கல்யாணம் எப்போ?", "Relatives: Enna vela? Evlo salary? Kalyanam eppo?", "kalyanam"],
      ["அம்மா என்னை பாத்தாங்க.", "Amma ennai paathaanga", "paathaanga"],
      ["அம்மா: அவன் பிஸி, நீங்க போய் சாப்டுங்க.", "Amma: Avan busy, neenga poi saapdunga", "busy"],
    ],
    punch: ["சாப்டுட்டு கிளம்பும் போதும்: சரி, கல்யாணம் எப்போ?", "Saapittu kelambum podhum: \"Seri, kalyanam eppo?\" 🙄", "kalyanam"],
  },
  {
    title: "Amma: kulirudhu. Naan: vervai 🥵🥶",
    lines: [
      ["அம்மா ஃபேனை ஆஃப் பண்ணிட்டு: குளிருது.", "Amma fan off panni: \"Kulirudhu\"", "kulirudhu"],
      ["நான் வேர்வைல.", "Naan vervai-la", "vervai"],
      ["அம்மா வந்து எனக்கு போர்வை போட்டாங்க.", "Amma vandhu enakku porvai pottaanga", "porvai"],
    ],
    punch: ["இப்போ போர்வையும் போர்த்திட்டு, வேர்வையோட தூங்குறேன். அம்மா ஹேப்பி.", "Ippo porvai-oda vervai-oda thoongaren. Amma happy 😅", "happy"],
  },
  {
    title: "Amma arisi dabba = bank 🏦",
    lines: [
      ["கஷ்டம் னு அம்மா கிட்ட சொன்னேன்.", "Kashtam-nu Amma kitta sonnen", "kashtam"],
      ["அம்மா அரிசி டப்பால இருந்து அஞ்சாயிரம் எடுத்தாங்க.", "Amma arisi dabba-la irundhu 5000 eduthaanga", "dabba"],
      ["பேங்கை விட அம்மா டப்பா ஸ்ட்ராங்.", "Bank-ah vida Amma dabba strong", "strong"],
    ],
    punch: ["இப்போ அரிசி டப்பாவுக்கு அம்மா பாஸ்வேர்ட் வெச்சிருக்காங்க.", "Ippo arisi dabba-ku Amma password vechirukkaanga 🔐", "password"],
  },
  {
    title: "Amma birthday marandhutten 🎂",
    lines: [
      ["அம்மா பர்த்டேவை மறந்துட்டேன்.", "Amma birthday-ah marandhutten", "marandhutten"],
      ["அம்மா: பரவாயில்ல டா.", "Amma: Paravaayilla da", "paravaayilla"],
      ["ஆனா மூணு நாள் சரியா பேசல.", "Aana 3 naal sariyaa pesala", "pesala"],
    ],
    punch: ["அடுத்த மாசம் என் பர்த்டே. அம்மாவும் மறந்துட்டாங்க. பழிக்கு பழி.", "Adutha maasam en birthday. Amma-vum marandhuttaanga... pazhikku pazhi 😂", "pazhikku"],
  },
  {
    title: "Amma alarm-ku battery thevai illa ⏰",
    lines: [
      ["அலாரம் ஆறு மணிக்கு வெச்சேன்.", "Alarm 6 mani-ku vechen", "alarm"],
      ["அலாரம் அடிக்கல.", "Alarm adikkala", "adikkala"],
      ["அம்மா அஞ்சு அம்பத்தி ஒன்பதுக்கே எழுப்பிட்டாங்க.", "Amma 5:59-kke ezhuppittaanga", "5:59"],
    ],
    punch: ["அலாரம் கம்பெனியே அம்மாவை பிராண்ட் அம்பாசடரா கேக்கணும்.", "Alarm company-e Amma-va brand ambassador-ah kekkanum ⏰", "ambassador"],
  },
  {
    title: "Vengayam narukkinen… Amma: drama pannaadha 🧅",
    lines: [
      ["அம்மா: கொஞ்சம் வெங்காயம் நறுக்கி குடு.", "Amma: Konjam vengayam narukki kudu", "vengayam"],
      ["நறுக்குனேன், கண்ணுல தண்ணி.", "Narukkinen, kannula thanni", "thanni"],
      ["அம்மா: ட்ராமா பண்ணாத.", "Amma: Drama pannaadha", "drama"],
    ],
    punch: ["இப்போ வெங்காயம் நறுக்க, ஸ்விம்மிங் கண்ணாடி போட்டுக்குறேன்.", "Ippo vengayam narukka swimming goggles potturen 🥽", "goggles"],
  },
  {
    title: "Hostel call: 5 nimisham-la 50 kelvi 📞",
    lines: [
      ["ஹாஸ்டல்ல இருந்து அம்மாவுக்கு கால்.", "Hostel-la irundhu Amma-ku call", "hostel"],
      ["அம்மா: சாப்டியா? தூங்குனியா? குளிச்சியா?", "Amma: Saaptiya? Thoonginiya? Kulichiya?", "kulichiya"],
      ["அஞ்சு நிமிஷத்துல அம்பது கேள்வி.", "5 nimisham-la 50 kelvi", "50"],
    ],
    punch: ["அம்பத்தி ஒண்ணாவது கேள்வி: சரி, எதுக்கு கால் பண்ண?", "51-vadhu kelvi: \"Seri, edhukku call panna?\" 😂", "51"],
  },
];

export const MORE_FRIENDS: Script[] = [
  {
    title: "\"Story sollaadha\"… climax sollittaan 🎬",
    lines: [
      ["ஃப்ரெண்ட் படம் பாத்துட்டு வந்தான்.", "Friend padam paathutu vandhaan", "padam"],
      ["நான்: கதை சொல்லாத.", "Naan: Kadhai sollaadha", "sollaadha"],
      ["அவன்: க்ளைமாக்ஸ்ல ஹீரோ,", "Avan: \"Climax-la hero...\"", "climax"],
    ],
    punch: ["இப்போ அவன் படம் பாக்க போனா, அவன் ஃபோனை நான் ஒளிச்சு வெச்சிடுறேன்.", "Ippo avan padam paakka ponaa, avan phone-ah olichu vechiduren 📵", "olichu"],
  },
  {
    title: "\"5 nimisham-la varen\" 🕐",
    lines: [
      ["ஃப்ரெண்ட்: அஞ்சு நிமிஷத்துல வரேன்.", "Friend: 5 nimisham-la varen", "5"],
      ["ஒரு மணி நேரம் ஆச்சு.", "1 mani neram aachu", "1"],
      ["அவன்: இன்னும் வீட்ல தான் இருக்கேன்.", "Avan: Innum veetla dhaan irukken", "veetla"],
    ],
    punch: ["இப்போ அவன் அஞ்சு நிமிஷம் னு சொன்னா, நான் குளிக்கவே போறேன்.", "Avan \"5 nimisham\" sonnaa, naan kulikkave poren 🛁", "kulikkave"],
  },
  {
    title: "\"Naan onnume padikala\"… 98 mark 📚",
    lines: [
      ["எக்ஸாமுக்கு முந்தின ராத்திரி.", "Exam-ku mundhina night", "exam"],
      ["ஃப்ரெண்ட்: நான் ஒண்ணுமே படிக்கல.", "Friend: Naan onnume padikala", "padikala"],
      ["ரிசல்ட்: அவன் தொண்ணூத்தி எட்டு, நான் நாப்பத்தி அஞ்சு.", "Result: avan 98, naan 45", "98"],
    ],
    punch: ["இப்போ அவன் படிக்கல னு சொன்னா, நான் ராத்திரி முழுக்க படிக்குறேன்.", "Ippo avan \"padikala\" sonnaa, naan full night padikkuren 📚", "night"],
  },
  {
    title: "Friends meet… ellaarum phone-la 📵",
    lines: [
      ["ஃப்ரெண்ட்ஸ் எல்லாரும் ஹோட்டல்ல மீட்.", "Friends ellaarum hotel-la meet", "meet"],
      ["எல்லாரும் ஃபோன்ல.", "Ellaarum phone-la", "phone"],
      ["க்ரூப் போட்டோ மட்டும் எடுத்தோம்.", "Group photo mattum eduthom", "photo"],
    ],
    punch: ["அந்த க்ரூப் போட்டோலயும் எல்லாரும் ஃபோனை தான் பாத்துட்டு இருந்தாங்க.", "Andha group photo-laiyum ellaarum phone-ah dhaan paathaanga 🤳", "photo"],
  },
  {
    title: "1 mani neram advice… avan avan plan 🤷",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், எனக்கு அட்வைஸ் சொல்லு.", "Friend: Machan, enakku advice sollu", "advice"],
      ["நான் ஒரு மணி நேரம் அட்வைஸ்.", "Naan 1 mani neram advice", "1"],
      ["அவன்: சரி, நான் என் ப்ளானையே பண்றேன்.", "Avan: Sari, naan en plan-aye panren", "plan"],
    ],
    punch: ["அவன் ப்ளான் ஃபெயில் ஆச்சு. இப்போ, நீ ஏன் ஸ்ட்ராங்கா சொல்லல னு என்னை திட்டுறான்.", "Avan plan fail. Ippo \"nee yen strong-ah sollala?\"-nu ennai thittraan 😤", "thittraan"],
  },
  {
    title: "\"Pakkam dhaan, helmet venaam\" 🪖",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், ஹெல்மெட் வேணாம், பக்கம் தான்.", "Friend: Machan helmet venaam, pakkam dhaan", "pakkam"],
      ["சிக்னல்ல போலீஸ்.", "Signal-la police", "police"],
      ["ஃபைன் ஆயிரம் ரூபாய்.", "Fine 1000 rupees", "1000"],
    ],
    punch: ["போலீஸ்: பக்கம் தான் னு எல்லாரும் சொல்றாங்க. ஃபைனும் பக்கத்துல தான்.", "Police: \"Fine-um pakkathula dhaan\" 👮", "fine"],
  },
  {
    title: "\"Oru game dhaan\"… kaalaila 5 mani 🎮",
    lines: [
      ["ஃப்ரெண்ட்: ஒரே ஒரு கேம் தான், அப்புறம் தூங்கலாம்.", "Friend: Ore oru game dhaan, apram thoongalaam", "game"],
      ["காலைல அஞ்சு மணி.", "Kaalaila 5 mani", "5"],
      ["ரெண்டு பேரும் ஜாம்பி.", "Rendu perum zombie", "zombie"],
    ],
    punch: ["காலைல அம்மா: படிச்சியா? நான்: லெவல் நாப்பத்தி ஏழு மா.", "Amma: \"Padichiya?\" Naan: \"Level 47 Ma\" 🎮", "level"],
  },
  {
    title: "Kalyana speech-la ex story 😬",
    lines: [
      ["ஃப்ரெண்ட் கல்யாணம்.", "Friend kalyanam", "kalyanam"],
      ["ஸ்பீச் குடு னு சொன்னாங்க.", "Speech kudu-nu sonnaanga", "speech"],
      ["நான் அவனோட எக்ஸ் ஸ்டோரி சொல்லிட்டேன்.", "Naan avanoda ex story sollitten", "ex"],
    ],
    punch: ["இப்போ அவன் வீட்டு ஃபங்ஷன் எல்லாத்துக்கும் எனக்கு நோ என்ட்ரி.", "Ippo avan veetu function ellaathukkum enakku \"No entry\" 🚫", "entry"],
  },
  {
    title: "Un kaasu, en idea, 50-50 💼",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், ஒரு பிசினஸ் ஐடியா.", "Friend: Machan, oru business idea", "business"],
      ["உன் காசு, என் ஐடியா, ஃபிஃப்டி ஃபிஃப்டி.", "Un kaasu, en idea, 50-50", "50"],
      ["நான்: ஐடியாவுக்கு அம்பது பர்சென்ட்டா?", "Naan: Idea-ku 50 percent-aa?", "percent"],
    ],
    punch: ["அவன் ஐடியா: டீ கடை. மூணு நாள்ல கடையை நான் மட்டும் தான் நடத்துறேன்.", "Avan idea: tea kadai. 3 naal-la kadai-ah naan mattum nadathuren ☕", "mattum"],
  },
  {
    title: "10 varusham kazhichu call… insurance policy 😑",
    lines: [
      ["ஸ்கூல் ஃப்ரெண்ட் பத்து வருஷம் கழிச்சு கால்.", "School friend 10 varusham kazhichu call", "school"],
      ["நான்: என்னை ஞாபகம் இருக்கா!", "Naan: Ennai nyabagam irukka!", "nyabagam"],
      ["அவன்: மச்சான், ஒரு இன்ஷூரன்ஸ் பாலிசி,", "Avan: Machan, oru insurance policy...", "insurance"],
    ],
    punch: ["நான் பாலிசி எடுக்கல. அவன் என்னை அன்ஃப்ரெண்ட் பண்ணிட்டான்.", "Naan policy edukkala. Avan ennai unfriend pannittaan 😂", "unfriend"],
  },
  {
    title: "\"Naalaiku irundhu diet\" (3 maasama) 🍗",
    lines: [
      ["ஃப்ரெண்ட்ஸ்: நாளைக்கு இருந்து டயட்.", "Friends: Naalaiku irundhu diet", "diet"],
      ["இன்னைக்கு லாஸ்ட்டா பிரியாணி.", "Inniku last-ah biryani", "biryani"],
      ["இந்த லாஸ்ட் மூணு மாசமா நடக்குது.", "Indha \"last\" 3 maasama nadakkudhu", "3"],
    ],
    punch: ["இப்போ பிரியாணி கடைக்காரரே, எங்களுக்கு டயட் ஸ்பெஷல் காம்போ வெச்சிருக்காரு.", "Biryani kadai-la engalukkaaga \"Diet special combo\" 😂", "combo"],
  },
  {
    title: "Roommate: \"konjam\" shampoo use pannen 🧴",
    lines: [
      ["ரூம்மேட்: உன் ஷாம்பூ கொஞ்சம் யூஸ் பண்ணேன்.", "Roommate: Un shampoo konjam use pannen", "konjam"],
      ["பாட்டில் முழுசா காலி.", "Bottle muzhusaa kaali", "kaali"],
      ["மாசம் முழுக்க கொஞ்சம், கொஞ்சம்.", "Maasam muzhukka \"konjam, konjam\"", "maasam"],
    ],
    punch: ["இப்போ என் ஷாம்பூ பாட்டில்ல தண்ணி மட்டும் தான். அவனுக்கு தெரியாது.", "Ippo en shampoo bottle-la thanni mattum. Avanukku theriyaadhu 🤫", "thanni"],
  },
  {
    title: "Goa trip budget ₹5000… 2-vadhu naal kaali 🏝️",
    lines: [
      ["கோவா ட்ரிப் பட்ஜெட் அஞ்சாயிரம்.", "Goa trip budget 5000", "5000"],
      ["ரெண்டாவது நாள்: அஞ்சாயிரம் காலி.", "Second day: 5000 kaali", "kaali"],
      ["மூணாவது நாள்: ஃப்ரெண்ட் கிட்ட கடன்.", "Third day: friend kitta kadan", "kadan"],
    ],
    punch: ["கடன் குடுத்த ஃப்ரெண்டும், இன்னொருத்தன் கிட்ட கடன் வாங்கி தான் குடுத்தான்.", "Kadan kudutha friend-um innoruthan kitta kadan vaangi dhaan kuduthaan 😂", "innoruthan"],
  },
  {
    title: "Friend salary 1 lakh… naan 1 mani neram yosanai 🤔",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், என் சாலரி ஒரு லட்சம்.", "Friend: Machan, en salary 1 lakh", "lakh"],
      ["நான்: சூப்பர் டா.", "Naan: Super da", "super"],
      ["வீட்டுக்கு போய் ஒரு மணி நேரம் யோசிச்சேன்.", "Veettukku poi 1 mani neram yosichen", "yosichen"],
    ],
    punch: ["அடுத்த நாள் அவன்: மச்சான், ஒரு ஐநூறு குடு. சாலரி இன்னும் வரல.", "Adutha naal avan: \"Machan 500 kudu, salary innum varala\" 🙃", "500"],
  },
  {
    title: "En charger, en earphone, en kodai… avan veetla 🔌",
    lines: [
      ["ஃப்ரெண்ட் சார்ஜர் கேட்டான்.", "Friend charger kettaan", "charger"],
      ["திருப்பி கேக்க மறந்துட்டேன்.", "Thiruppi kekka marandhutten", "marandhutten"],
      ["இப்போ அவன் வீட்ல என் சார்ஜர், என் இயர்ஃபோன், என் குடை.", "Ippo avan veetla en charger, earphone, kodai", "kodai"],
    ],
    punch: ["இப்போ அவன், என் சார்ஜரையே எனக்கு நூறு ரூபாய்க்கு விக்க பாக்குறான்.", "Ippo avan en charger-aye enakku 100 rupees-ku vikka paakkuraan 🔌", "vikka"],
  },
  {
    title: "6 mani walking plan… yaarume varala 🚶",
    lines: [
      ["ஃப்ரெண்ட்ஸ்: நாளைக்கு ஆறு மணிக்கு வாக்கிங்.", "Friends: Naalaiku 6 mani-ku walking", "walking"],
      ["ஆறு மணிக்கு க்ரூப்ல: நீ வந்துட்டியா?", "6 mani-ku group-la: \"Nee vandhuttiya?\"", "vandhuttiya"],
      ["யாருமே வீட்டை விட்டு வரல.", "Yaarume veetta vittu varala", "varala"],
    ],
    punch: ["க்ரூப்ல வாக்கிங் போட்டோ மட்டும் வந்துச்சு. எல்லாம் கூகுள்ல எடுத்தது.", "Group-la walking photo vandhuchu. Ellaam Google-la eduthadhu 😂", "Google"],
  },
  {
    title: "\"Daily double\" scheme 🚩",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், இதுல இன்வெஸ்ட் பண்ணு, டெய்லி டபுள்.", "Friend: Machan idhula invest pannu, daily double", "double"],
      ["நான்: இது ஸ்கேம் டா.", "Naan: Idhu scam da", "scam"],
      ["அவன்: இல்ல மச்சான், என் கசினுக்கு வந்துச்சு.", "Avan: Illa machan, en cousin-ku vandhuchu", "cousin"],
    ],
    punch: ["இப்போ அவன் கசினே, என் கிட்ட ஐநூறு கடன் கேக்குறான்.", "Ippo avan cousin-e en kitta 500 kadan kekkuraan 💸", "cousin"],
  },
  {
    title: "Oru Saturday shift… ippo ellaa Saturday-um 😩",
    lines: [
      ["ஃப்ரெண்ட்: மச்சான், சனிக்கிழமை ஷிஃப்ட் மாத்தி தரியா?", "Friend: Machan, Saturday shift maathi thariya?", "Saturday"],
      ["நான்: சரி.", "Naan: Sari.", "sari"],
      ["இப்போ ஒவ்வொரு சனிக்கிழமையும் நான் தான்.", "Ippo ovvoru Saturday-um naan dhaan", "ovvoru"],
    ],
    punch: ["இப்போ ஆபீஸ்ல என் பேரே சரி னு மாத்திட்டாங்க.", "Ippo office-la en per-e \"Sari\" 😭", "sari"],
  },
  {
    title: "5 star review… saapadu sumaar ⭐",
    lines: [
      ["ஃப்ரெண்ட்: இந்த ஹோட்டல் சூப்பர், ஃபைவ் ஸ்டார் ரிவ்யூ.", "Friend: Indha hotel super, 5 star review", "review"],
      ["போனோம், சாப்பாடு சுமார்.", "Ponom, saapadu sumaar", "sumaar"],
      ["அவன்: ரிவ்யூ போட்டதுக்கு ஃப்ரீ டெசர்ட் குடுத்தாங்க.", "Avan: Review pottadhukku free dessert kuduthaanga", "dessert"],
    ],
    punch: ["இப்போ நானும் ஃபைவ் ஸ்டார் ரிவ்யூ போட்டேன். ஃப்ரீ டெசர்ட்டுக்காக.", "Ippo naanum 5 star review potten. Free dessert-kaaga 🍨", "dessert"],
  },
  {
    title: "\"Daily pesuvom\" → birthday-ku mattum HBD 🎈",
    lines: [
      ["காலேஜ் ஃப்ரெண்ட்ஸ்: டெய்லி பேசுவோம் னு ப்ராமிஸ்.", "College friends: \"Daily pesuvom\"-nu promise", "promise"],
      ["இப்போ பர்த்டேக்கு மட்டும்: ஹேப்பி பர்த்டே.", "Ippo birthday-ku mattum: \"HBD\"", "HBD"],
      ["அதுவும் ஃபோன் ஞாபகப்படுத்துச்சு.", "Adhuvum phone nyabagapaduthuchu", "phone"],
    ],
    punch: ["நான் தேங்க்ஸ் டா னு அனுப்புனேன். அவன் ரிப்ளை: யாரு?", "Naan: \"Thanks da\". Avan reply: \"Yaaru?\" 😂", "yaaru"],
  },
];
