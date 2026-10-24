/**
 * "Amma Oorukku Pona Oru Naal" — the first full-length video. Every line with
 * its Tamil (for the voice), its Tanglish subtitle, the word to colour, its
 * scene, and the Gemini take it is recorded in. A take holds two speakers who
 * strictly take turns, so the recording can be cut back into its lines.
 */
export type Speaker = "Amma" | "Naan" | "Machan";

export interface LongLine {
  /** As in the script, e.g. "13" or "61b". */
  n: string;
  speaker: Speaker;
  tamil: string;
  tanglish: string;
  highlight: string;
  scene: number;
  take: string;
}

export const VOICES: Record<Speaker, string> = { Amma: "Kore", Naan: "Charon", Machan: "Puck" };

const L = (n: string, scene: number, take: string, speaker: Speaker, tamil: string, tanglish: string, highlight: string): LongLine => ({ n, scene, take, speaker, tamil, tanglish, highlight });

export const LINES: LongLine[] = [
  // Scene 1 — 6 AM, the front door
  L("1", 1, "g1", "Amma", "டா, நான் சித்தி வீட்டு வளைகாப்புக்கு போறேன். நாளைக்கு சாயங்காலம் தான் வருவேன்.", "Da, naan Chithi veettu valaikaappu-ku poren. Naalai saayangaalam thaan varuven.", "naalai"),
  L("2", 1, "g1", "Naan", "மா, நிம்மதியா போயிட்டு வாங்க. வீட்ட நான் பாத்துக்குறேன்!", "Ma, nimmadhiyaa poyittu vaanga. Veetta naan paathukkuren!", "paathukkuren"),
  L("3", 1, "g1", "Amma", "நீயா? உனக்கு ஒரு tea கூட போட தெரியாதே டா!", "Nee-yaa? Unakku oru tea kooda poda theriyaadhe da!", "tea"),
  L("4", 1, "g1", "Naan", "மா, YouTube இருக்கு. எல்லாம் கத்துக்குவேன்!", "Ma, YouTube irukku. Ellaam kathukkuven!", "YouTube"),
  L("5", 1, "g1", "Amma", "நாலு வேலை தான்: rice வெச்சு சாப்பிடு, துணி wash பண்ணு, துளசி செடிக்கு தண்ணி ஊத்து... gas-ஐ மட்டும் மறக்காம off பண்ணு!", "Naalu velai thaan: rice vechu saappidu, thuni wash pannu, thulasi chedi-ku thanni oothu… gas-ah mattum marakkaama off pannu!", "gas"),
  L("7", 1, "g1", "Naan", "Done மா! Bye மா!", "Done ma! Bye ma!", "done"),
  L("8", 1, "g9", "Naan", "மச்சான், அம்மா ஊருக்கு போயிட்டாங்க. வீடு full-ஆ நம்ம கிட்ட!", "Machan, Amma oorukku poyittaanga. Veedu full-aa namma kitta!", "veedu"),
  L("9", 1, "g9", "Machan", "வந்துட்டேன் டா!", "Vandhutten da!", "vandhutten"),

  // Scene 2 — 8 AM, the kitchen
  L("10", 2, "g2", "Naan", "மச்சான், அம்மா rice வைக்க சொன்னாங்க. எப்படி வைக்கிறது?", "Machan, Amma rice vekka sonnaanga. Eppadi vekkuradhu?", "rice"),
  L("11", 2, "g2", "Machan", "Simple டா. தண்ணி ஊத்து, cooker-ல வை, மூணு விசில். முடிஞ்சது!", "Simple da. Thanni oothu, cooker-la vai, moonu visil. Mudinjadhu!", "visil"),
  L("12", 2, "g2", "Naan", "எவ்ளோ தண்ணி ஊத்தணும்?", "Evlo thanni oothanum?", "thanni"),
  L("13", 2, "g2", "Machan", "தண்ணி அதிகம்னா தான் நல்லா வேகும். Full-ஆ ஊத்து!", "Thanni adhigam-na thaan nalla vegum. Full-aa oothu!", "full"),
  L("14", 2, "g2", "Naan", "மச்சான்... எத்தனை விசில் ஆச்சு?", "Machan… ethana visil aachu?", "ethana"),
  L("15", 2, "g2", "Machan", "தெரியல டா, நான் Kohli six-ஐ பாத்துட்டு இருந்தேன்!", "Theriyala da, naan Kohli six-ah paathuttu irundhen!", "six"),
  L("16", 2, "g2", "Naan", "இது rice-ஆ, கஞ்சியா?", "Idhu rice-aa, kanji-yaa?", "kanji"),
  L("17", 2, "g2", "Machan", "கஞ்சி தான் டா healthy! Doctor-ஏ சொல்றாங்க!", "Kanji thaan da healthy! Doctor-e solraanga!", "healthy"),
  L("18", 2, "g2", "Naan", "கஞ்சிக்கு side dish வேணும் டா...", "Kanji-ku side dish venum da…", "side"),
  L("19", 2, "g2", "Machan", "அப்பளம் பொரிக்கலாம்! நான் expert!", "Appalam porikkalaam! Naan expert!", "expert"),

  // Scene 3 — 9 AM, Amma's video call
  L("20", 3, "g3", "Amma", "என்ன டா, சாப்பிட்டியா?", "Enna da, saappittiyaa?", "saappittiyaa"),
  L("21", 3, "g3", "Naan", "சாப்பிட்டேன் மா! Rice super-ஆ வந்துச்சு!", "Saappittaen ma! Rice super-aa vandhuchu!", "super"),
  L("22", 3, "g3", "Amma", "பின்னாடி என்ன டா புகை?", "Pinnaadi enna da pugai?", "pugai"),
  L("23", 3, "g3", "Naan", "அது... பக்கத்து வீட்டு புகை மா! அவங்க சாம்பிராணி போடுறாங்க!", "Adhu… pakkathu veettu pugai ma! Avanga saambraani podraanga!", "saambraani"),
  L("24", 3, "g3", "Amma", "சாம்பிராணியா? காலைல எட்டு மணிக்கு?", "Saambraani-yaa? Kaalaila ettu manikku?", "ettu"),
  L("25", 3, "g3", "Naan", "இன்னைக்கு வெள்ளிக்கிழமைல மா, அதான்!", "Inniku velli kizhamai-la ma, adhaan!", "velli"),
  L("26", 3, "g3", "Amma", "இன்னைக்கு ஞாயிற்றுக்கிழமை டா!", "Inniku nyaayiru kizhamai da!", "nyaayiru"),
  L("27", 3, "g3", "Naan", "மா... network போகுது... hello... hello...", "Ma… network poguthu… hello… hello…", "network"),

  // Scene 4 — 11 AM, the washing
  L("28", 4, "g4", "Naan", "அம்மா துணி wash பண்ண சொன்னாங்க. Washing machine எப்படி?", "Amma thuni wash panna sonnaanga. Washing machine eppadi?", "wash"),
  L("29", 4, "g4", "Machan", "நான் expert டா! எல்லா துணியும் ஒரே தடவை போட்டு, full speed!", "Naan expert da! Ellaa thuniyum ore thadava pottu, full speed!", "speed"),
  L("30", 4, "g4", "Naan", "மச்சான், அது அப்பாவோட office white shirt டா. தனியா தான் போடணும்!", "Machan, adhu Appa-voda office white shirt da. Thani-yaa thaan podanum!", "white"),
  L("31", 4, "g4", "Machan", "எல்லாம் துணி தான் டா. ஒரே family!", "Ellaam thuni thaan da. Ore family!", "family"),
  L("32", 4, "g4", "Naan", "மச்சான்! அப்பா shirt pink ஆயிடுச்சு!", "Machan! Appa shirt pink aagiduchu!", "pink"),
  L("33", 4, "g4", "Machan", "Fashion டா! இப்போ எல்லாரும் pink தான் போடுறாங்க!", "Fashion da! Ippo ellaarum pink thaan podraanga!", "fashion"),
  L("34", 4, "g4", "Naan", "அப்பா office-க்கு pink shirt-ல போக மாட்டாரு டா!", "Appa office-ku pink shirt-la poga maattaaru da!", "maattaaru"),
  L("35", 4, "g4", "Machan", "Bleach போட்டா சரியாயிடும்!", "Bleach pottaa sariyaaidum!", "bleach"),
  L("36", 4, "g4", "Naan", "இப்போ இது shirt-ஆ, world map-ஆ?!", "Ippo idhu shirt-aa, world map-aa?!", "map"),

  // Scene 5 — 1 PM, the tulsi plant, Amma on the phone
  L("37", 5, "g1", "Amma", "துளசி செடிக்கு தண்ணி ஊத்துனியா?", "Thulasi chedi-ku thanni ooththiniyaa?", "thulasi"),
  L("38", 5, "g1", "Naan", "இப்போ தான் மா ஊத்துறேன்!", "Ippo thaan ma oothuren!", "ippo"),
  L("39", 5, "g5", "Machan", "தண்ணிக்கு பதிலா கஞ்சி ஊத்தலாம் டா. கஞ்சில vitamin இருக்கு!", "Thanni-ku badhila kanji oothalaam da. Kanji-la vitamin irukku!", "vitamin"),
  L("40", 5, "g1", "Amma", "சுடு தண்ணி மட்டும் ஊத்தாத டா, செடி போயிடும்!", "Sudu thanni mattum oothaadha da, chedi poyidum!", "sudu"),
  L("41", 5, "g5", "Naan", "மச்சான், கஞ்சி சூடா இருந்துச்சா?!", "Machan, kanji soodaa irundhuchaa?!", "soodaa"),
  L("42", 5, "g5", "Machan", "கொஞ்சம் தான் டா...", "Konjam thaan da…", "konjam"),

  // Scene 6 — 4 PM, the twist
  L("43", 6, "g6", "Amma", "டா, function சீக்கிரம் முடிஞ்சிடுச்சு. நான் அஞ்சு மணி bus-ல வந்துடுவேன்!", "Da, function seekiram mudinjiduchu. Naan anju mani bus-la vandhuduven!", "anju"),
  L("44", 6, "g6", "Naan", "மா... நாளைக்கு தானே சொன்னீங்க?!", "Ma… naalai thaane sonneenga?!", "naalai"),
  L("45", 6, "g6", "Amma", "உங்க கூட இருக்கணும்னு தான் டா சீக்கிரம் வரேன். Sweet-உம் வாங்கிட்டேன்!", "Unga kooda irukkanum-nu thaan da seekiram varen. Sweet-um vaangitten!", "sweet"),
  L("46", 6, "g7", "Machan", "மச்சான்... இன்னும் ஒரு மணி நேரம் தான் இருக்கு!", "Machan… innum oru mani neram thaan irukku!", "mani"),

  // Scene 7 — 4 to 5 PM, hiding everything
  L("47", 7, "g7", "Naan", "Operation clean-up... start! முதல்ல கடாயை என்ன பண்றது?", "Operation clean-up… START! Mudhalla kadaai-ya enna pannuradhu?", "start"),
  L("49", 7, "g7", "Machan", "Oven-குள்ள வை. அம்மா oven-ஐ use பண்ண மாட்டாங்க!", "Oven-kulla vai. Amma oven-ah use panna maattaanga!", "oven"),
  L("50", 7, "g7", "Naan", "கஞ்சி?", "Kanji?", "kanji"),
  L("51", 7, "g7", "Machan", "Fridge-ல வை. அம்மா பொங்கல்னு நினைப்பாங்க!", "Fridge-la vai. Amma pongal-nu ninaippaanga!", "pongal"),
  L("52", 7, "g7", "Naan", "Shirt?", "Shirt?", "shirt"),
  L("53", 7, "g7", "Machan", "பீரோல துணிக்கு அடியில மறைச்சிடு!", "Beero-la thuni-ku adiyila maraichidu!", "beero"),
  L("54", 7, "g7", "Naan", "செடி?", "Chedi?", "chedi"),
  L("55", 7, "g7", "Machan", "Showcase-ல இருக்குற plastic செடிய வை. அம்மா கண்ணாடி இல்லாம பாக்க மாட்டாங்க!", "Showcase-la irukkura plastic chedi-ya vai. Amma kannaadi illaama paakka maattaanga!", "plastic"),

  // Scene 8 — 5 PM, Amma is back
  L("56", 8, "g6", "Amma", "என்ன டா, வீடு இவ்ளோ neat-ஆ இருக்கு?", "Enna da, veedu ivlo neat-aa irukku?", "neat"),
  L("57", 8, "g6", "Naan", "நாங்க தான் மா பாத்துக்கிட்டோம்!", "Naanga thaan ma paathukittom!", "naanga"),
  L("58", 8, "g6", "Amma", "ரொம்ப சந்தோஷம் டா. தம்பி, நீயும் சாப்பிட்டு தான் போகணும்.", "Romba santhosham da. Thambi, nee-yum saappittu thaan poganum.", "santhosham"),
  L("59", 8, "g8", "Amma", "இது என்ன, பொங்கலா?", "Idhu enna, pongal-aa?", "pongal"),
  L("60", 8, "g8", "Machan", "ஆமா aunty, நானே பண்ணேன்!", "Aamaa aunty, naane pannen!", "naane"),
  L("61", 8, "g8", "Amma", "இது பொங்கல் இல்ல... கஞ்சி!", "Idhu pongal illa… kanji!", "kanji"),
  L("61b", 8, "g8", "Machan", "கஞ்சி தான் aunty healthy... Doctor-ஏ சொல்றாங்க...", "Kanji thaan aunty healthy… Doctor-e solraanga…", "healthy"),
  L("62", 8, "g8", "Amma", "என் துளசி செடி எப்போ டா plastic ஆச்சு?!", "En thulasi chedi eppo da plastic aachu?!", "plastic"),
  L("62b", 8, "g8", "Machan", "அது... புது variety aunty. தண்ணியே வேண்டாம்!", "Adhu… pudhu variety aunty. Thanni-ye venaam!", "variety"),
  L("63", 8, "g8", "Amma", "அப்பாவோட office shirt-க்கு என்ன டா ஆச்சு?!", "Appa-voda office shirt-ku enna da aachu?!", "shirt"),
  L("64", 8, "g8", "Machan", "Aunty... அது புது fashion...", "Aunty… adhu pudhu fashion…", "fashion"),
  L("65", 8, "g8", "Amma", "ரெண்டு பேரும்... இங்க வாங்க!", "Rendu perum… INGA VAANGA!", "vaanga"),
  L("66", 8, "g6", "Naan", "மச்சான்... ஓடு!!", "Machan… ODU!!", "odu"),

  // Ending
  L("67", 9, "g9", "Naan", "மச்சான்... அடுத்த தடவை அம்மா ஊருக்கு போனா...", "Machan… adutha thadava Amma oorukku pona…", "adutha"),
  L("68", 9, "g9", "Machan", "...நான் உங்க வீட்டு பக்கமே வர மாட்டேன் டா!", "…naan unga veetu pakkame vara maatten da!", "maatten"),
  L("69", 9, "g3", "Amma", "Sweet எல்லாம் எனக்கு தான்!", "Sweet ellaam enakku thaan! 😌", "enakku"),
];
