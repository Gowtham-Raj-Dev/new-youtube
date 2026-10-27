import type { BankScript } from "./bank";
import type { Scene } from "./cartoon";
import { SCENES } from "./scenes";
import {
  biryaniDiet, chinnaDosa, fiveAlarms, freeBreeze, mileage, noodles, phoneDown, roomClean, swimming, wifiPassword,
} from "./scenes-day1";
import {
  fridgeCake, guestSweet, kanavuClear, lastBus, naalaikkuTharen, padikkuraMaadhiri, shirt999, surpriseParty, thangachiCall,
} from "./scenes-day2";
import {
  aiPonnu, coffeeNight, daily5km, interviewStrength, invisibleHaircut, justPass, kadaiList, pocketMoney, remoteKannu, tripConfirm,
} from "./scenes-day3";

/**
 * The illustrated Shorts, in the order they were made: each joke from
 * docs/ai-shorts-comedy-scripts.md with its Tanglish subtitles and its scene.
 * `day` is the folder its video goes in, "Moolai Illa Machan/Day <day>".
 */
export interface Episode {
  id: string;
  day: number;
  script: BankScript;
  scene: Scene;
}

export const EPISODES: Episode[] = [
  {
    id: "F1-charge",
    day: 1,
    scene: SCENES["F1-charge"],
    script: {
      series: "friends",
      title: "Phone charge eravae illa 🔌",
      hook: "Switch on pannen… aanaa charge eravae illa! 🔌",
      keywords: ["phone charge comedy", "charger comedy tamil", "machan logic"],
      lines: [
        ["மச்சான்: மச்சான், என் phone-ல charge ஏறவே இல்ல டா!", "Machan: Machan, en phone-la charge eravae illa da!", "charge"],
        ["நான்: Charger-ஐ plug-ல போட்டியா?", "Naan: Charger-ah plug-la pottiya?", "plug"],
        ["மச்சான்: போட்டேன் டா, switch-உம் on பண்ணேன்!", "Machan: Pottaen da, switch-um on pannen!", "switch"],
        ["நான்: அப்புறம் ஏன் ஏறல?", "Naan: Appuram yen erala?", "yen"],
      ],
      punch: ["மச்சான்: Phone-ஐயும் charger-ல connect பண்ணணுமா டா?", "Machan: Phone-aiyum charger-la connect pannanumaa da? 😂", "connect"],
    },
  },
  {
    id: "A28-thirudan",
    day: 1,
    scene: SCENES["A28-thirudan"],
    script: {
      series: "amma",
      title: "Thirudane bayandhu odittaan 🕵️",
      hook: "Oorukku poitu vandhaa en room-la thirudan?! 😱",
      keywords: ["messy room comedy", "thirudan comedy tamil", "lazy son comedy"],
      lines: [
        ["நான்: மா, ஊருக்கு போயிட்டு வந்து என் room-ஐ பாத்தீங்களா?", "Naan: Ma, oorukku poitu vandhu en room-ah paatheengala?", "room"],
        ["அம்மா: பாத்தேன், திருடன் வந்தானோன்னு பயந்துட்டேன்!", "Amma: Paathen, thirudan vandhaano-nu bayandhutten!", "thirudan"],
        ["நான்: வந்தான் மா.", "Naan: Vandhaan Ma.", "vandhaan"],
        ["அம்மா: என்ன டா சொல்ற?", "Amma: Enna da solra?", "enna"],
      ],
      punch: ["நான்: என் room-ஐ பாத்துட்டு, அவனே பயந்து ஓடிட்டான் மா!", "Naan: En room-ah paathuttu, avane bayandhu odittaan Ma! 😂", "odittaan"],
    },
  },
  {
    id: "F2-swimming",
    day: 1,
    scene: swimming,
    script: {
      series: "friends",
      title: "Swimming class join pannitten 🏊",
      hook: "Swimming class join pannitten… aanaa oru condition 🏊",
      keywords: ["swimming comedy tamil", "swimming class comedy", "machan logic"],
      lines: [
        ["மச்சான்: மச்சான், நான் swimming class join பண்ணிட்டேன்!", "Machan: Machan, naan swimming class join pannitten!", "swimming"],
        ["நான்: சூப்பர் டா! தண்ணில இறங்குனியா?", "Naan: Super da! Thanni-la eranguniya?", "thanni"],
        ["மச்சான்: இன்னும் இல்ல டா.", "Machan: Innum illa da.", "innum"],
        ["நான்: ஏன் டா?", "Naan: Yen da?", "yen"],
      ],
      punch: ["மச்சான்: முதல்ல swimming கத்துக்கிட்டு தான் தண்ணில இறங்குவேன்!", "Machan: Mudhalla swimming kathukittu thaan thanni-la eranguven! 😂", "kathukittu"],
    },
  },
  {
    id: "F4-biryani",
    day: 1,
    scene: biryaniDiet,
    script: {
      series: "friends",
      title: "Strict diet… biryani diet 🍗",
      hook: "Strict diet-la irukken… daily biryani thaan 🍗",
      keywords: ["biryani comedy", "diet comedy tamil", "gym diet comedy"],
      lines: [
        ["மச்சான்: மச்சான், நான் இப்போ strict diet-ல இருக்கேன்.", "Machan: Machan, naan ippo strict diet-la irukken.", "diet"],
        ["நான்: சூப்பர்! என்ன சாப்டுற?", "Naan: Super! Enna saapdura?", "saapdura"],
        ["மச்சான்: Biryani தான் டா.", "Machan: Biryani thaan da.", "biryani"],
        ["நான்: Biryani-யா? இது என்ன diet டா?", "Naan: Biryani-ya? Idhu enna diet da?", "enna"],
      ],
      punch: ["மச்சான்: கோழில protein, அரிசில energy. Perfect balance diet டா!", "Machan: Kozhi-la protein, arisi-la energy. Perfect balance diet da! 😂", "balance"],
    },
  },
  {
    id: "F5-alarm",
    day: 1,
    scene: fiveAlarms,
    script: {
      series: "friends",
      title: "5 alarm vechen… appuram? ⏰",
      hook: "5 alarm vechen… appuram enna aachu theriyumaa? ⏰",
      keywords: ["alarm comedy tamil", "morning sleep comedy", "late riser comedy"],
      lines: [
        ["மச்சான்: நாளைக்கு சீக்கிரம் எழுந்திருக்க 5 alarm வெச்சேன் டா!", "Machan: Naalaikku seekiram ezhundhirukka 5 alarm vechen da!", "alarm"],
        ["நான்: எழுந்தியா?", "Naan: Ezhundhiya?", "ezhundhiya"],
        ["மச்சான்: எழுந்தேன் டா!", "Machan: Ezhundhen da!", "ezhundhen"],
        ["நான்: சூப்பர்! அப்புறம்?", "Naan: Super! Appuram?", "appuram"],
      ],
      punch: ["மச்சான்: 5 alarm-ஐயும் off பண்ணிட்டு, மறுபடியும் தூங்கிட்டேன்!", "Machan: 5 alarm-aiyum off pannittu, marubadiyum thoongitten! 😂", "thoongitten"],
    },
  },
  {
    id: "F7-mileage",
    day: 1,
    scene: mileage,
    script: {
      series: "friends",
      title: "Bike mileage 60 km… oru thadava 🏍️",
      hook: "En bike mileage 60 km… aanaa oru twist irukku 🏍️",
      keywords: ["bike mileage comedy", "bike comedy tamil", "petrol comedy tamil"],
      lines: [
        ["மச்சான்: என் bike mileage 60 km டா!", "Machan: En bike mileage 60 km da!", "mileage"],
        ["நான்: Wow, சூப்பர் bike டா!", "Naan: Wow, super bike da!", "super"],
        ["மச்சான்: ஆமா, ஆனா அது ஒரு தடவை மட்டும் தான்.", "Machan: Aama, aana adhu oru thadava mattum thaan.", "thadava"],
        ["நான்: அப்புறம்?", "Naan: Appuram?", "appuram"],
      ],
      punch: ["மச்சான்: அப்புறம் நான் தான் தள்ளணும் டா!", "Machan: Appuram naan thaan thallanum da! 😂", "thallanum"],
    },
  },
  {
    id: "F8-wifi",
    day: 1,
    scene: wifiPassword,
    script: {
      series: "friends",
      title: "Pudhu WiFi password enna? 📶",
      hook: "Pudhu WiFi password kettaa enna solraan paarunga 📶",
      keywords: ["wifi password comedy", "wifi comedy tamil", "machan logic"],
      lines: [
        ["மச்சான்: என் வீட்டு WiFi password-ஐ மாத்திட்டேன் டா.", "Machan: En veetu WiFi password-ah maathitten da.", "password"],
        ["நான்: புது password என்ன?", "Naan: Pudhu password enna?", "pudhu"],
        ["மச்சான்: கேக்காத.", "Machan: Kekkaadha.", "kekkaadha"],
        ["நான்: சரி டா, சொல்லு!", "Naan: Seri da, sollu!", "sollu"],
      ],
      punch: ["மச்சான்: அதான் டா சொன்னேன், password-ஏ \"கேக்காத\" தான்!", "Machan: Adhaan da sonnen, password-ae \"Kekkaadha\" thaan! 😂", "kekkaadha"],
    },
  },
  {
    id: "A1-phone",
    day: 1,
    scene: phoneDown,
    script: {
      series: "amma",
      title: "Phone-ah keezha vai 📵",
      hook: "Phone-ah keezha vechaa Amma-voda next move 📵",
      keywords: ["amma phone comedy", "phone addiction comedy tamil", "amma kadai comedy"],
      lines: [
        ["அம்மா: Phone-ஐ கீழ வை!", "Amma: Phone-ah keezha vai!", "phone"],
        ["நான்: சரி மா, வெச்சிட்டேன்.", "Naan: Seri ma, vechitten.", "vechitten"],
        ["அம்மா: இப்போ சும்மா தானே இருக்க?", "Amma: Ippo summa thaane irukka?", "summa"],
        ["நான்: ஆமா மா.", "Naan: Aama ma.", "aama"],
      ],
      punch: ["அம்மா: அப்போ கடைக்கு போ!", "Amma: Appo kadaikku po! 😂", "kadaikku"],
    },
  },
  {
    id: "A3-room-clean",
    day: 1,
    scene: roomClean,
    script: {
      series: "amma",
      title: "Room full-aa clean pannitten 🧹",
      hook: "5 nimishathula room full clean… eppadi theriyumaa? 🧹",
      keywords: ["room cleaning comedy", "lazy son comedy", "amma room comedy"],
      lines: [
        ["நான்: மா, room-ஐ full-ஆ clean பண்ணிட்டேன்!", "Naan: Ma, room-ah full-aa clean pannitten!", "clean"],
        ["அம்மா: இவ்ளோ சீக்கிரமா?", "Amma: Ivlo seekiramaa?", "seekiramaa"],
        ["நான்: Simple மா.", "Naan: Simple ma.", "simple"],
        ["அம்மா: எப்படி டா?", "Amma: Eppadi da?", "eppadi"],
      ],
      punch: ["நான்: எல்லா சாமானையும் கட்டிலுக்கு கீழ தள்ளிட்டேன்!", "Naan: Ella saamaanaiyum kattilukku keezha thallitten! 😂", "kattilukku"],
    },
  },
  {
    id: "A7-kaathu-free",
    day: 1,
    scene: freeBreeze,
    script: {
      series: "amma",
      title: "Current save… kaathu free 💡",
      hook: "Current bill kammi panna Amma-voda master plan 💡",
      keywords: ["current bill comedy", "eb bill comedy tamil", "amma save money comedy"],
      lines: [
        ["அம்மா: TV-ஐ off பண்ணு, current போகுது.", "Amma: TV-ah off pannu, current poguthu.", "current"],
        ["நான்: பண்ணிட்டேன் மா.", "Naan: Pannitten ma.", "pannitten"],
        ["அம்மா: Fan-ஐயும் off பண்ணு.", "Amma: Fan-aiyum off pannu.", "fan"],
        ["நான்: அப்போ நான் என்ன பண்றது?", "Naan: Appo naan enna panradhu?", "enna"],
      ],
      punch: ["அம்மா: வெளிய போய் உக்காரு, காத்து free!", "Amma: Veliya poi ukkaaru, kaathu free! 😂", "free"],
    },
  },
  {
    id: "A12-noodles",
    day: 1,
    scene: noodles,
    script: {
      series: "amma",
      title: "2 minute noodles… karugi pochu 🍜",
      hook: "Naane noodles pannen… Amma shock aagitaanga 🍜",
      keywords: ["noodles comedy tamil", "maggi comedy", "cooking comedy tamil"],
      lines: [
        ["நான்: மா, நானே noodles பண்ணேன்!", "Naan: Ma, naane noodles pannen!", "noodles"],
        ["அம்மா: ஏன் கருகுன வாசனை வருது?", "Amma: Yen karugina vaasanai varudhu?", "karugina"],
        ["நான்: Recipe படி தான் பண்ணேன் மா.", "Naan: Recipe padi thaan pannen ma.", "recipe"],
        ["அம்மா: தண்ணி ஊத்துனியா?", "Amma: Thanni oothuniya?", "thanni"],
      ],
      punch: ["நான்: Recipe-ல \"2 minutes\"-னு தான் இருந்துச்சு, தண்ணி பத்தி ஒண்ணுமே இல்ல!", "Naan: Recipe-la \"2 minutes\"-nu thaan irundhuchu, thanni pathi onnume illa! 😂", "thanni"],
    },
  },
  {
    id: "F6-naalaikku",
    day: 2,
    scene: naalaikkuTharen,
    script: {
      series: "friends",
      title: "Naalaikku tharen… promise 💸",
      hook: "100 rupees kadan kettaan… thirumba eppo tharuvaan? 💸",
      keywords: ["kadan comedy tamil", "friend money comedy", "machan logic"],
      lines: [
        ["மச்சான்: மச்சான், ஒரு 100 ரூபாய் குடு, நாளைக்கு தரேன்.", "Machan: Machan, oru 100 rupees kudu, naalaikku tharen.", "100"],
        ["நான்: நேத்தும் இதையே தான் சொன்ன!", "Naan: Nethum idhaiye thaan sonna!", "nethum"],
        ["மச்சான்: ஆமா டா.", "Machan: Aama da.", "aama"],
        ["நான்: அப்போ இன்னைக்கு தரணும்ல?", "Naan: Appo innaikku tharanumla?", "innaikku"],
      ],
      punch: ["மச்சான்: நான் நாளைக்குன்னு தான் சொன்னேன், இன்னைக்குன்னு சொல்லவே இல்லையே!", "Machan: Naan naalaikku-nu thaan sonnen, innaikku-nu sollave illaye! 😂", "naalaikku"],
    },
  },
  {
    id: "A13-chinna-dosa",
    day: 2,
    scene: chinnaDosa,
    script: {
      series: "amma",
      title: "Diet-ku chinna dosa… pathu 🥞",
      hook: "Diet-nu sonnaa Amma pannadha paarunga 🥞",
      keywords: ["dosa comedy", "amma dosa comedy", "diet comedy tamil"],
      lines: [
        ["அம்மா: உனக்கு புடிச்ச dosa!", "Amma: Unakku pudicha dosa!", "dosa"],
        ["நான்: மா, நான் இன்னைக்கு diet.", "Naan: Ma, naan innaikku diet.", "diet"],
        ["அம்மா: சரி, சின்ன dosa-வா சுட்டு தரேன்.", "Amma: Seri, chinna dosa-vaa suttu tharen.", "chinna"],
        ["நான்: Thanks மா!", "Naan: Thanks ma!", "thanks"],
      ],
      punch: ["அம்மா: பத்து சின்ன dosa!", "Amma: Pathu chinna dosa! 😂", "pathu"],
    },
  },
  {
    id: "F14-last-bus",
    day: 2,
    scene: lastBus,
    script: {
      series: "friends",
      title: "Last bus miss pannitten 🚌",
      hook: "Last bus miss aagiduchu… veetukku eppadi ponaan theriyumaa? 🚌",
      keywords: ["bus comedy tamil", "last bus comedy", "machan logic"],
      lines: [
        ["மச்சான்: நேத்து last bus miss பண்ணிட்டேன் டா.", "Machan: Nethu last bus miss pannitten da.", "miss"],
        ["நான்: அய்யோ, எப்படி வீட்டுக்கு போன?", "Naan: Aiyo, eppadi veetukku pona?", "eppadi"],
        ["மச்சான்: Bus பின்னாடியே ஓடுனேன்.", "Machan: Bus pinnadiye odunen.", "odunen"],
        ["நான்: Bus-ஐ பிடிச்சியா?", "Naan: Bus-ah pudichiya?", "pudichiya"],
      ],
      punch: ["மச்சான்: இல்ல டா, அதுக்குள்ள வீடு வந்துடுச்சு. 10 ரூபாய் save!", "Machan: Illa da, adhukkulla veedu vandhuduchu. 10 rupees save! 😂", "save"],
    },
  },
  {
    id: "A6-thangachi-call",
    day: 2,
    scene: thangachiCall,
    script: {
      series: "amma",
      title: "Chithi kooda oru mani neram 📞",
      hook: "1 mani neram phone-la pesunen… Amma enna pannaanga paarunga 📞",
      keywords: ["amma phone comedy", "chithi comedy tamil", "phone call comedy tamil"],
      lines: [
        ["அம்மா: ஒரு மணி நேரமா யார் கூட பேசுற?", "Amma: Oru mani neramaa yaar kooda pesura?", "yaar"],
        ["நான்: உங்க தங்கச்சி கூட தான் மா.", "Naan: Unga thangachi kooda thaan ma.", "thangachi"],
        ["அம்மா: அவளா? Phone-ஐ குடு!", "Amma: Avalaa? Phone-ah kudu!", "kudu"],
        ["நான்: ஏன் மா?", "Naan: Yen ma?", "yen"],
      ],
      punch: ["அம்மா: நான் இன்னும் ரெண்டு மணி நேரம் பேசணும்!", "Amma: Naan innum rendu mani neram pesanum! 😂", "rendu"],
    },
  },
  {
    id: "F16-surprise",
    day: 2,
    scene: surpriseParty,
    script: {
      series: "friends",
      title: "Birthday surprise party kudu 🎂",
      hook: "Surprise party kettaan… aanaa birthday date mattum? 🎂",
      keywords: ["birthday comedy tamil", "surprise party comedy", "machan logic"],
      lines: [
        ["மச்சான்: மச்சான், என் birthday-க்கு surprise party குடு!", "Machan: Machan, en birthday-ku surprise party kudu!", "surprise"],
        ["நான்: சரி டா, உன் birthday எப்போ?", "Naan: Seri da, un birthday eppo?", "eppo"],
        ["மச்சான்: சொல்ல மாட்டேன்.", "Machan: Solla maatten.", "maatten"],
        ["நான்: ஏன் டா?", "Naan: Yen da?", "yen"],
      ],
      punch: ["மச்சான்: சொன்னா surprise போயிடும்ல டா!", "Machan: Sonna surprise poyidumla da! 😂", "surprise"],
    },
  },
  {
    id: "A8-padikkura-maadhiri",
    day: 2,
    scene: padikkuraMaadhiri,
    script: {
      series: "amma",
      title: "Appa varaaru… padi! 📖",
      hook: "Appa varaaru-nu Amma sonna secret tip 📖",
      keywords: ["appa comedy tamil", "study comedy tamil", "amma son comedy"],
      lines: [
        ["அம்மா: உங்க அப்பா வர்றாரு, படி!", "Amma: Unga Appa varaaru, padi!", "appa"],
        ["நான்: அப்பா வந்தா படிக்கணுமா மா?", "Naan: Appa vandhaa padikkanumaa ma?", "padikkanumaa"],
        ["அம்மா: இல்ல டா.", "Amma: Illa da.", "illa"],
        ["நான்: அப்புறம்?", "Naan: Appuram?", "appuram"],
      ],
      punch: ["அம்மா: படிக்குற மாதிரி நடி!", "Amma: Padikkura maadhiri nadi! 😂", "nadi"],
    },
  },
  {
    id: "F26-kanavu-clear",
    day: 2,
    scene: kanavuClear,
    script: {
      series: "friends",
      title: "Thoongum bodhum kannadi 👓",
      hook: "Thoongum bodhu kooda kannadi podraan… kaaranam theriyumaa? 👓",
      keywords: ["specs comedy tamil", "kannadi comedy", "machan logic"],
      lines: [
        ["மச்சான்: Doctor full time கண்ணாடி போடணும்னு சொன்னாரு டா.", "Machan: Doctor full time kannadi podanum-nu sonnaaru da.", "kannadi"],
        ["நான்: சரி, போடு.", "Naan: Seri, podu.", "podu"],
        ["மச்சான்: அதான் தூங்கும் போது கூட போட்டுக்கிறேன்.", "Machan: Adhaan thoongum bodhu kooda pottukkiren.", "thoongum"],
        ["நான்: தூங்கும் போது எதுக்கு டா?", "Naan: Thoongum bodhu edhukku da?", "edhukku"],
      ],
      punch: ["மச்சான்: கனவு clear-ஆ தெரியணும்ல டா!", "Machan: Kanavu clear-aa theriyanumla da! 😂", "kanavu"],
    },
  },
  {
    id: "A15-guest-sweet",
    day: 2,
    scene: guestSweet,
    script: {
      series: "amma",
      title: "Guest-ku vecha sweet box 🍬",
      hook: "Guest-ku vecha sweet-ah thodaadha-nu Amma sonnaanga… appuram? 🍬",
      keywords: ["sweet comedy tamil", "guest comedy tamil", "amma son comedy"],
      lines: [
        ["நான்: மா, sweet box எங்க?", "Naan: Ma, sweet box enga?", "sweet"],
        ["அம்மா: Guest-க்கு வெச்சது, தொடாத!", "Amma: Guest-ku vechadhu, thodaadha!", "thodaadha"],
        ["நான்: Guest எப்போ வர்றாங்க?", "Naan: Guest eppo varaanga?", "eppo"],
        ["அம்மா: நாளைக்கு.", "Amma: Naalaikku.", "naalaikku"],
      ],
      punch: ["நான்: அப்போ நாளைக்கு வேற வாங்கலாம் மா, இன்னைக்கு guest நான் தான்!", "Naan: Appo naalaikku vera vaangalaam ma, innaikku guest naan thaan! 😂", "guest"],
    },
  },
  {
    id: "F27-999-saving",
    day: 2,
    scene: shirt999,
    script: {
      series: "friends",
      title: "999 rupees shirt… saving 🛍️",
      hook: "999 rupees shirt vaanginaan… avan kanakku paarunga 🛍️",
      keywords: ["shopping comedy tamil", "offer comedy tamil", "machan logic"],
      lines: [
        ["மச்சான்: இந்த shirt 999 ரூபாய் டா!", "Machan: Indha shirt 999 rupees da!", "999"],
        ["நான்: ரொம்ப costly டா!", "Naan: Romba costly da!", "costly"],
        ["மச்சான்: இல்ல டா, 1000-க்கு ஒரு ரூபாய் கம்மி.", "Machan: Illa da, 1000-ku oru rupee kammi.", "kammi"],
        ["நான்: சரி, அப்புறம்?", "Naan: Seri, appuram?", "appuram"],
      ],
      punch: ["மச்சான்: அதான் 10 shirt வாங்கிட்டேன், 10 ரூபாய் saving!", "Machan: Adhaan 10 shirt vaangitten, 10 rupees saving! 😂", "saving"],
    },
  },
  {
    id: "A22-fridge-cake",
    day: 2,
    scene: fridgeCake,
    script: {
      series: "amma",
      title: "Fridge-la irundha cake enga? 🎂",
      hook: "Fridge-la vecha cake kaanom… Naan sonna explanation 🎂",
      keywords: ["cake comedy tamil", "fridge comedy", "amma son comedy"],
      lines: [
        ["நான்: மா, fridge door open-ஆ இருந்துச்சு.", "Naan: Ma, fridge door open-aa irundhuchu.", "fridge"],
        ["அம்மா: So?", "Amma: So?", "so"],
        ["நான்: Cake வெளிய வந்துச்சு.", "Naan: Cake veliya vandhuchu.", "cake"],
        ["அம்மா: அப்புறம்?", "Amma: Appuram?", "appuram"],
      ],
      punch: ["நான்: அதுவே நேரா என் வயித்துக்குள்ள போயிடுச்சு மா!", "Naan: Adhuve neraa en vayithukkulla poyiduchu ma! 😂", "vayithukkulla"],
    },
  },
  {
    id: "F25-trip-confirm",
    day: 3,
    scene: tripConfirm,
    script: {
      series: "friends",
      title: "Trip-ku 10 per confirm 🚐",
      hook: "Group-la 10 perum trip confirm… aanaa trip day enna aachu? 🚐",
      keywords: ["trip comedy tamil", "friends trip comedy", "whatsapp group comedy"],
      lines: [
        ["மச்சான்: Trip-க்கு 10 பேர் வர்றாங்க டா!", "Machan: Trip-ku 10 per varaanga da!", "trip"],
        ["நான்: Confirm-ஆ?", "Naan: Confirm-aa?", "confirm"],
        ["மச்சான்: Group-ல 10 பேரும் thumbs up போட்டாங்க!", "Machan: Group-la 10 perum thumbs up pottaanga!", "thumbs"],
        ["நான்: அப்புறம்?", "Naan: Appuram?", "appuram"],
      ],
      punch: ["மச்சான்: Bus-ல நானும் driver-உம் மட்டும் தான் டா!", "Machan: Bus-la naanum driver-um mattum thaan da! 😂", "driver"],
    },
  },
  {
    id: "A2-kadai-list",
    day: 3,
    scene: kadaiList,
    script: {
      series: "amma",
      title: "Kadaikku po… phone panni solren 🛒",
      hook: "Kadaikku anuppitu phone panni solren-nu sonna Amma… appuram? 🛒",
      keywords: ["amma kadai comedy", "shopping list comedy tamil", "amma son comedy"],
      lines: [
        ["அம்மா: டேய், கடைக்கு போயிட்டு வா.", "Amma: Dei, kadaikku poitu vaa.", "kadaikku"],
        ["நான்: என்ன வாங்கணும் மா?", "Naan: Enna vaanganum ma?", "enna"],
        ["அம்மா: நீ போ, phone பண்ணி சொல்றேன்.", "Amma: Nee po, phone panni solren.", "phone"],
        ["நான்: மா, கடைல இருக்கேன். சொல்லுங்க.", "Naan: Ma, kadai-la irukken. Sollunga.", "sollunga"],
      ],
      punch: ["அம்மா: என்ன வாங்கணும்னு மறந்துட்டேன், நீ வந்துடு!", "Amma: Enna vaanganum-nu marandhutten, nee vandhudu! 😂", "marandhutten"],
    },
  },
  {
    id: "F10-interview",
    day: 3,
    scene: interviewStrength,
    script: {
      series: "friends",
      title: "Interview-la en strength 💪",
      hook: "Interview-la strength enna-nu kettaanga… avan sonna badhil paarunga 💪",
      keywords: ["interview comedy tamil", "job interview comedy", "machan logic"],
      lines: [
        ["மச்சான்: Interview-ல என் strength என்னன்னு கேட்டாங்க டா.", "Machan: Interview-la en strength enna-nu kettaanga da.", "strength"],
        ["நான்: என்ன சொன்ன?", "Naan: Enna sonna?", "sonna"],
        ["மச்சான்: 50 kg தூக்குவேன்னு சொன்னேன்.", "Machan: 50 kg thookuven-nu sonnen.", "50"],
        ["நான்: Job கிடைச்சுதா?", "Naan: Job kidaichudhaa?", "job"],
      ],
      punch: ["மச்சான்: கிடைச்சுது டா, godown-ல மூட்டை தூக்குற job!", "Machan: Kidaichudhu da, godown-la moottai thookura job! 😂", "moottai"],
    },
  },
  {
    id: "A20-ai-ponnu",
    day: 3,
    scene: aiPonnu,
    script: {
      series: "amma",
      title: "Raathiri muzhukka AI chat 🤖",
      hook: "Raathiri muzhukka AI kooda chat… Amma kettadhu enna theriyumaa? 🤖",
      keywords: ["ai comedy tamil", "amma marriage comedy", "chatgpt comedy tamil"],
      lines: [
        ["அம்மா: ராத்திரி முழுக்க யார் கூட chat பண்ற?", "Amma: Raathiri muzhukka yaar kooda chat panra?", "chat"],
        ["நான்: AI கூட மா.", "Naan: AI kooda ma.", "ai"],
        ["அம்மா: நல்ல பொண்ணா?", "Amma: Nalla ponnaa?", "ponnaa"],
        ["நான்: மா, அது பொண்ணே இல்ல!", "Naan: Ma, adhu ponne illa!", "illa"],
      ],
      punch: ["அம்மா: சரி, அவளுக்கு சமைக்க தெரியுமான்னு கேளு!", "Amma: Seri, avalukku samaikka theriyumaa-nu kelu! 😂", "samaikka"],
    },
  },
  {
    id: "F17-daily-5km",
    day: 3,
    scene: daily5km,
    script: {
      series: "friends",
      title: "Daily 5 km odren 🏃",
      hook: "Daily 5 km odraan-aam… eppo irundhu-nu kelunga 🏃",
      keywords: ["running comedy tamil", "fitness comedy tamil", "machan logic"],
      lines: [
        ["மச்சான்: நான் daily 5 km ஓடுறேன் டா.", "Machan: Naan daily 5 km odren da.", "5"],
        ["நான்: Wow! எத்தனை நாளா?", "Naan: Wow! Ethana naalaa?", "ethana"],
        ["மச்சான்: நாளைல இருந்து டா.", "Machan: Naalaila irundhu da.", "naalaila"],
        ["நான்: அப்போ இன்னைக்கு?", "Naan: Appo innaikku?", "innaikku"],
      ],
      punch: ["மச்சான்: இன்னைக்கு எப்படி ஓடுறதுன்னு YouTube-ல பாக்குறேன்!", "Machan: Innaikku eppadi odradhu-nu YouTube-la paakuren! 😂", "youtube"],
    },
  },
  {
    id: "A26-pocket-money",
    day: 3,
    scene: pocketMoney,
    script: {
      series: "amma",
      title: "Amma kitta 50 thaan irukku 💰",
      hook: "Amma kitta 50 rupees thaan… naan ketta amount paarunga 💰",
      keywords: ["pocket money comedy", "amma money comedy tamil", "amma son comedy"],
      lines: [
        ["நான்: மா, காசு வேணும்.", "Naan: Ma, kaasu venum.", "kaasu"],
        ["அம்மா: எவ்ளோ?", "Amma: Evlo?", "evlo"],
        ["நான்: நீங்க எவ்ளோ வெச்சிருக்கீங்க?", "Naan: Neenga evlo vechirukeenga?", "neenga"],
        ["அம்மா: 50.", "Amma: 50.", "50"],
      ],
      punch: ["நான்: அப்போ 60 குடுங்க மா, 10 கடனா எழுதிக்கோங்க!", "Naan: Appo 60 kudunga ma, 10 kadanaa ezhudhikkonga! 😂", "kadanaa"],
    },
  },
  {
    id: "F22-coffee-night",
    day: 3,
    scene: coffeeNight,
    script: {
      series: "friends",
      title: "Night padikka 3 coffee ☕",
      hook: "Thookam varaama irukka 3 coffee kudichaan… appuram enna aachu? ☕",
      keywords: ["coffee comedy tamil", "exam night comedy", "study comedy tamil"],
      lines: [
        ["மச்சான்: Coffee குடிச்சா எனக்கு தூக்கமே வராது டா.", "Machan: Coffee kudicha enakku thookame varaadhu da.", "coffee"],
        ["நான்: நல்லது, night படிக்கலாம்.", "Naan: Nalladhu, night padikkalaam.", "padikkalaam"],
        ["மச்சான்: அதான் நேத்து night 3 coffee குடிச்சேன்.", "Machan: Adhaan nethu night 3 coffee kudichen.", "3"],
        ["நான்: படிச்சியா?", "Naan: Padichiya?", "padichiya"],
      ],
      punch: ["மச்சான்: இல்ல டா, coffee குடிச்ச சந்தோஷத்துல நல்லா தூங்கிட்டேன்!", "Machan: Illa da, coffee kudicha santhoshathula nallaa thoongitten! 😂", "thoongitten"],
    },
  },
  {
    id: "A17-haircut",
    day: 3,
    scene: invisibleHaircut,
    script: {
      series: "amma",
      title: "Haircut pannen… theriyavae illa 💇",
      hook: "Haircut panni vandhen… Amma-ku onnume theriyala! Yen theriyumaa? 💇",
      keywords: ["haircut comedy tamil", "saloon comedy", "amma son comedy"],
      lines: [
        ["நான்: மா, முடி வெட்டிட்டு வந்துட்டேன்!", "Naan: Ma, mudi vettittu vandhutten!", "mudi"],
        ["அம்மா: எங்க? ஒண்ணுமே தெரியலையே!", "Amma: Enga? Onnume theriyalaye!", "theriyalaye"],
        ["நான்: அதான் மா style.", "Naan: Adhaan ma style.", "style"],
        ["அம்மா: எவ்ளோ குடுத்த?", "Amma: Evlo kudutha?", "evlo"],
      ],
      punch: ["நான்: 200 ரூபாய், தெரியாம வெட்டுறதுக்கு தான் extra charge!", "Naan: 200 rupees, theriyaama vettradhukku thaan extra charge! 😂", "extra"],
    },
  },
  {
    id: "F28-just-pass",
    day: 3,
    scene: justPass,
    script: {
      series: "friends",
      title: "Pass… exact pass mark ✅",
      hook: "Exam-la pass aayitaan… aanaa mark evlo-nu kelunga ✅",
      keywords: ["exam result comedy", "pass mark comedy tamil", "machan logic"],
      lines: [
        ["மச்சான்: Result வந்துடுச்சு டா, pass!", "Machan: Result vandhuduchu da, pass!", "pass"],
        ["நான்: சூப்பர்! எவ்ளோ mark?", "Naan: Super! Evlo mark?", "mark"],
        ["மச்சான்: Pass mark-க்கு exact-ஆ.", "Machan: Pass mark-ku exact-aa.", "exact"],
        ["நான்: ஒரு mark கூட extra இல்லையா?", "Naan: Oru mark kooda extra illaya?", "extra"],
      ],
      punch: ["மச்சான்: எதுக்கு டா mark-ஐ waste பண்ணணும்?", "Machan: Edhukku da mark-ah waste pannanum? 😂", "waste"],
    },
  },
  {
    id: "A27-remote",
    day: 3,
    scene: remoteKannu,
    script: {
      series: "amma",
      title: "TV remote kannu munnadi 📺",
      hook: "Remote kannu munnadi thaan irukku-nu sonnen… Amma-ku yen theriyala? 📺",
      keywords: ["tv remote comedy", "amma tv comedy tamil", "amma son comedy"],
      lines: [
        ["நான்: மா, TV remote கண்ணு முன்னாடி தான் இருக்கு.", "Naan: Ma, TV remote kannu munnadi thaan irukku.", "remote"],
        ["அம்மா: என் கண்ணு முன்னாடி இல்லையே!", "Amma: En kannu munnadi illaye!", "illaye"],
        ["நான்: இருக்கு மா.", "Naan: Irukku ma.", "irukku"],
        ["அம்மா: எங்க டா?", "Amma: Enga da?", "enga"],
      ],
      punch: ["நான்: என் கண்ணு முன்னாடி மா!", "Naan: En kannu munnadi ma! 😂", "en"],
    },
  },
];
