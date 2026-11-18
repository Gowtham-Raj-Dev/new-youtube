# Ulagam Ippo — Videos

YouTube channel (pudhu, peyar maathalaam): **Ulagam Ippo** (உலகம் இப்போ) — Tamil explainer, daily 6–7 min.
Ulagathula enna nadakkudhu / varalaaru — Tamil voice-over, cartoon host, pinnaadi images + text animations.

## Folder

```
Ulagam Ippo/
  README.md
  host/host.png          ← channel host (cartoon paiyan). Mouth/eyes position code-la fixed — vera image podaadha.
  Videos/
    01 Tamil Nadu Varalaaru/
      voice/             ← Gemini takes (t1…t8.pcm) + splits.json. DELETE PANNAATHA.
      images/            ← Wikimedia Commons pictures + credits.json (description-la credits podanum)
      Tamil Nadu Varalaaru.mp4 / .txt, thumbnail.jpg
```

## Eppadi panradhu (`functions` folder-la irundhu)

```
npm run ex-images                 # images download (missing mattum). Thappaana image: tn-history.ts-la `file:` pin panni `npm run ex-images -- <key>`
npm run ex-voice                  # Gemini Tamil voice, oru chapter-ku oru take (illaadhadhu mattum record)
npm run ex-video -- --sheet=24    # quick frame check
npm run ex-video -- --thumb       # thumbnail.jpg
npm run ex-video -- --chapters    # YouTube chapters
npm run ex-video                  # 1440p render (~20 min) — Start-Process-la thani-aa odanum
```

Script (Tamil voice text, subtitle, image, text animation): `functions/src/explainer/tn-history.ts`
Renderer (host, lip-sync, Ken Burns, cards, click cursor, chapters, music): `functions/src/explainer/explainer.ts`

Pudhu video: `tn-history.ts` maadhiri pudhu file (lines + images), adha `functions/src/explainer/videos.ts` list-la kadaisi-la podunga.
Ellaa `ex-*` scripts-um default-aa **kadaisi video**-va edukkum; pazhaya video-ku `-- --v=01` (eg. `npm run ex-video -- --v=01 --chapters`).

**Clean look** (`clean: true`, video 02 la irundhu — user, 2026-11-05: "extra icons theva illa, neat-aa smooth-aa"): host pakkathula emoji props (👋👉✨), morph sparkles, stamp shake edhuvum varaadhu. Script-la `fx`, `card`/`cta` (cursor), emoji text podaadheenga. Thumbnail text: video file-la `thumb`.

**Story look** (`look: "story"`, video 03 la irundhu — user, 2026-11-06: "new font families, visuals change, smooth-aa explain pandra maadhiri"): headings **Noto Serif Tamil ExtraBold**, subtitles/labels **Hind Madurai** (`functions/assets/fonts`). Gold-on-navy glass panels, fade + slide (bounce illa), ink outline illa, vignette, slow Ken Burns, 1.2 s crossfade, `route`-la drawn ship. Clean look automatic-aa. Story-la support aagura overlays: `title`, `year`, `list`, `pin`, `type`, `morph`, `stamp`, `route`. Host + voice adhe.

**Pulse look** (`look: "pulse"`, `music: "pulse"`, video 07 la irundhu — user, 2026-11-16: "5 min mela, musics, munadi mari ila different-aa, attractive-aa"): picture oru rounded screen-kulla (teal edge), veliya dark backdrop-la teal/coral glow + dot grid asaiyum; pictures crossfade illa, **slide in** (teal seam). Overlays solid chips: coral marker title, teal pill small text, numbered list, `flow` (A → B → C arrows), `meter` (bar teal→amber→coral), `warning` (amber hazard card, alcohol maadhiri topic-ku), coral tilted `stamp`, strike-through `morph`. Chapter = teal colour-wipe card ("அத்தியாயம் 02") + top-left badge, top progress bar chapter segments-aa. Subtitle = dark bar, pesura vaarththai teal-la light aagum. Music `pulseMusic` (96 BPM soft beat, namma sondha synth, Content ID safe). Host + voice adhe. Subscribe ask soft-aa: "pidichaa subscribe pannikonga, kattaayam illa".

**Feed look** (`look: "feed"`, `music: "lofi"`, video 08 la irundhu — ovvoru video-vum vera maadhiri irukkanum): pulse drawing-a reuse pannum, aana lime (#C6F432) / pink (#FF3E8A) / violet, deep night-blue backdrop-la mella mela scroll aagura faint "posts" (mudivillaadha feed maadhiri). Pictures Short maadhiri **keezha irundhu swipe-up** (lime seam), screen edge violet→pink glow. Chapter = **notification** mela irundhu drop aagum (gradient app icon-la chapter number, "உலகம் இப்போ · இப்போ", chapter name message-aa). `list` = notifications stack ("இப்போ" timestamp-oda). Music `lofiMusic` (76 BPM, warm e-piano, swung beat, vinyl crackle).

**Voice check:** Gemini sila neram style note-a ("Speak as a cheerful…") take start-la English-la padichidum (02 k6-la nadandhuchu). Record aanadhum line-by-line transcribe panni paarunga; andha part-a `<take>.splits.json`-la skip pannunga.

## Look

- Intro & outro: host perusaa left side-la, title text right side-la.
- Line 4-la irundhu host **keezha right corner**-ku pogum, pesumbodhu vaai asaiyum (voice sync), kann imaikkum.
- Background: image slow zoom/pan, crossfade. Portrait photo-na blur background + photo frame.
- Host actions (line-ku `action`): wave, jump, excited, celebrate, clap, point, point-down, please, think, surprised, proud, thumbs, salute, sad, whisper, crown, dance, roar, shrug, scared, look-up, fist, idea, eat, share, read, chisel, count, nod.
- Overlays: `title`, `year` (count-up, `ruler`), `card` (cursor click), `list`, `cta` (subscribe/bell/like/share click), `pin` (map pin), `morph` (A ➡️ B flip), `stamp`, `type` (typewriter), `route` (ship dotted line), `warp` (time machine), `comment`.
- `fx`: confetti, hearts, sparkles. `visual` array kuduththaa oru line-kulla pala photos maarum.
- Chapter card + top-left chapter badge, top-la progress bar, Tamil subtitles keezha.
- Music: namma sondha calm music (Content ID safe). Sfx: whoosh, click, pop, ding, thud.

## Host + voice — ELLAA VIDEOS-KKUM ORE MAADHIRI (user, 2026-10-31)

- Host: `host/host.png` kutti paiyan. Script avan pesura maadhiri ("naan"), actions-oda.
- Voice: `HOST_VOICE` (`functions/src/explainer/explainer.ts`) — Gemini **Leda**, "8 vayasu Tamil paiyan" style, **1.12×** speed-up (pitch eerum). Pudhu video file-la `...HOST_VOICE` mattum podanum. Maathaadha.
- Rubberband pitch-shift use panna koodaadhu — stuck/echo varudhu (user sonnadhu).
- Ovvoru video-vum: start-la subscribe ask, naduvula like/subscribe reminder, kadaisi-la "adutthu edha pathi pesalam-nu comment-la sollunga" + subscribe + bell.

## Voice rules (Moolai Illa Machan maadhiri)

1. Take oru thadava record aanaa lock — visuals maathunaa video mattum re-render.
2. `voice/` delete / rename panna koodaadhu. Maathanum-nu user sonnaa mattum `<take>.old-1.pcm` aakki pudhusaa.
3. Gemini limit project-ku ~10/day, reset 12:30 PM IST (Nov–Mar 1:30 PM). `.secret.local`-la ellaa `GEMINI_API_KEY*` order-la try aagum.
4. Cut thappaa irundhaa `voice/<take>.splits.json`-la `[start, end]` seconds per line.

## Upload (app vazhiyaa)

Channel app-la connected: **Ulagam Ippo @ulagamippo**, connection id `9cmnVJXvuoPchgVFUwlEGwvnDdH3_UCtlDeUnpHcZ6aZ2pxfXKqAQ`.

```
npm run ex-to-app                                         # connected channels list
npm run ex-to-app -- <connection id> 01 2026-11-01 18:00  # dry run (limits check)
npm run ex-to-app -- <connection id> 01 2026-11-01 18:00 --go
```
Video + thumbnail Storage-ku upload aagum, booked time-la app sweep straight-aa Public-la podum. Category: Education (27).

**Shorts-um app queue vazhiyaa thaan** (user, 2026-11-14: "youtube layea pota venam, you for me la queue la set pannu") — `ex-shorts-to-youtube` (direct) vendaam:
```
npm run ex-to-app -- <connection id> 06 2026-11-18 12:00 --short=2 --go   # oru Short, oru slot
```
Ovvoru Short-kkum `Shorts/<NN> <name>.mp4` + `.txt` + `.jpg` (thumbnail = title therira oru frame) venum. `ex-to-app` `--full` link podaadhu — description-la "👉 முழு வீடியோ…" keezha `▶ https://youtu.be/<id>` line-ah .txt-laye ezhudhanum.

**Daily time: 6:00 PM IST** (Tamil audience evening peak; weekend-um adhe). Ore time daily = subscribers-ku pazhakkam.

**Metadata rules:** title ≤100 (hook first: number/shock + "?!" + topic + English keyword), description first 2 lines = hook (search-la theriyum), chapters, questions list, CTA, English keyword paragraph, image credits (CC BY-SA kandippaa), hashtags sariyaa 15 (first 3 title mela varum). Tags ≤500 chars, Tamil + English mix.

## Videos

| # | Video | Status |
|---|---|---|
| 01 | Tamil Nadu Varalaaru v2 (6:41, kid voice) | App-la booked: **2026-10-31 6:00 PM IST** Public (`ui_…_long-01`). Upload copy 1080p `(upload).mp4` (130 MB). v1 Algieba takes `voice/t*.old-1.pcm`. |
| 01-S1 | Short 1/8: அறிமுகம் + பழமையான தொடக்கம் (1:23, 1080×1920) | App-la booked: **2026-10-31 6:00 PM IST** (`ui_…_long-01-s1`). Shorts 2–8 **rendered + .txt + .jpg ready (2026-11-05)**, not booked yet. Book: `npm run ex-to-app -- <id> 01 <date> <time> --short=<n> --go`. (`ex-shorts` default newest video — 01-ku `--v=01` podanum.) |

| 02 | AI Velai Puratchi — "AI வந்தா வேலை போயிடுமா?" (Canva 1,271 + Microsoft 60,000 buyout *offer*, India IT, WEF 2030) | Voice recorded (8 takes), clean look. Script: `ai-jobs.ts` (sources top-la). |

| 03 | Cholar Kappal Padai — "சோழர் கப்பல் படை: இந்தோனேசியா, மலேசியா வரை!" (Rajaraja navy → Rajendra 1025 Srivijaya/Kadaram) | Voice recorded (8 takes, 5:41), **story look**. k5 start-la Gemini ad-lib (0–17.4 s) cut; k3/k5/k8 manual `.splits.json`. Script: `chola-navy.ts`. |

| 04 | Top 3 Soga Vilangugal — "Top 3 சோகமான விலங்கு கதைகள்" (#3 ஆங்லர் மீன், #2 தனியா போன பென்குயின், #1 ஓர்கா அம்மா Tahlequah 2018) | **Thani Short** (`tall: true`, 1080×1920, 41 s), `countdown: true` (gold 3·2·1 cards), `chapterGap: 1.1`. User anuppuna viral "top 3" video maadhiri (2026-11-09). k4 start-la 15 s extra speech cut (`k4.splits.json`) — transcribe confirm pannala (Gemini 503). Script: `sad-animals.ts`. |

| 05 | Chennai Vellam — "சென்னை ஏன் ஒவ்வொரு வருஷமும் மூழ்குது?" (5 காரணங்கள்: தட்டையான ஊர், காணாமப் போன ஏரிகள் / T. Nagar Long Tank, பள்ளிக்கரணை, வடிகால், பருவமழை 2015; twist 2019 வறட்சி) | **Hook first** (subscribe ask line 4-la, user channel review 2026-11-13). Story look, 8 takes, 3:51. **k8 start-la Gemini 15 s sondha kaakkaa-vadai kadhai sonnuchu** → cut; k6 lines 28–29 repeat → cut (`k6/k8.splits.json`). Script: `chennai-flood.ts`. |

| 06 | Kumari Kandam — "குமரிக் கண்டம்: உண்மையா? கட்டுக்கதையா?" (Iraiyanar Akapporul urai: 3 sangams, Then Madurai/Kapatapuram; Silappathikaram Pahruli; Kanda Puranam; Sclater 1864 Lemuria; plate tectonics; ice age −120 m, Palk Strait ~7,000 yrs; Poompuhar, Dhanushkodi 1964, Saluvankuppam 2004 tsunami) | Hook first, story look, 8 takes, ~4:50. **k2 (7.7–13.6 s) + k6 (0–15 s) Gemini English style note-a satthamaa padichadhu** → cut; k3 line 13/14 cut thappu → fix (`k2/k3/k6.splits.json`). k8 clean (auto split). 4:35, 1440p. **YouTube Unlisted 2026-11-14: https://youtu.be/BzE3eZPsTb4** (`youtube.json`). Script: `kumari-kandam.ts`. **6 Shorts** rendered + .txt + .jpg (`Shorts/`): part 1 direct YouTube-la scheduled 17 Nov 7 PM (https://youtube.com/shorts/1JPNIaxd-9E); 2–6 **app queue-la** booked (`ui_…_long-06-s2…s6`): 18 Nov 12 PM, 18 Nov 7 PM, 19 Nov 12 PM, 19 Nov 7 PM, 20 Nov 12 PM. |

| 07 | Hangover Thalai Vali — "குடிச்சா காலையில ஏன் தலை வலிக்குது?" (Tamil health warning first; 5 காரணங்கள்: தண்ணி/ADH, அசிட்டால்டிஹைடு, உடம்பு சண்டை + வயிறு + சர்க்கரை, தூக்கம் + ரத்தக் குழாய், கன்ஜெனர்ஸ்; 3 பொய்கள்; WHO no safe level, 2.6M deaths, 7 cancers; kid appeal "kudi pazhakkam venaam", Tele-MANAS 14416) | **Pulse look + beat** (first one), 10 takes, 5:41. **k1 (0–17.6 s), k2 (0–15.4 s), k5 (0–15.5 s), k7 (0–14.0 s) Gemini English style note-a padichadhu** → cut (`k1/k2/k5/k7.splits.json`). Images: Commons-la neraya thappu vandhuchu (lion, logo, politician) — real people faces avoid (silhouettes). Script: `hangover.ts`. 1440p render 58 min (RAM kammi, parts retry aachu). **YouTube Unlisted 2026-11-16: https://youtu.be/cTmzvZVgdgE** (`youtube.json`). User check panni Public pannuvaanga. **8 Shorts** (1080×1920, pulse look, ovvondrilum mela "மது அருந்துதல் உடல் நலத்துக்கு கேடு" line — `Frame.note`, warning card irukkira video-ku ex-shorts thaane podum) + .txt + .jpg (`Shorts/`): **app queue-la** booked (`ui_…_long-07-s1…s8`): 20 Nov 7 PM, 21 Nov 12/7 PM, 22 Nov 12/7 PM, 23 Nov 12/7 PM, 24 Nov 12 PM. |

| 08 | Phone Addiction — "போன் நம்ம மூளையை எப்படி கட்டிப் போடுது?" (EY 2025: 5 mani/naal, 70% social/games/video, 1.1 lakh kodi mani 2024; dopamine; slot-machine variable reward, endless feed, ads; Gloria Mark 2½ min → 47 s; Stanford 2009 multitasking; thookam/melatonin; prefrontal brake ~25 vayasu; WHO 2019 <2 vayasu screen illa, 2–4 = 1 mani; nomophobia; 5 vazhigal + 20-20-20; NIMHANS SHUT, 14416; kid appeal) | **Feed look + lofi** (first one), 11 takes, 5:51. **k1 (0–16 s), k7 (0–12 s), k9 (0–12.8 s), k10 (0–15 s) Gemini English style note** → cut (`k1/k7/k9/k10.splits.json`). Transcriber short clips-la hallucinate pannum (k7 0–12 s-ku muyal-aamai kadhai!) — pauses + order vechu thaan cut. Script: `phone-addiction.ts`. |

**Thani Short-a pudhu video** (`tall: true`): `npm run ex-video` 1080×1920 render pannum, `--sheet=12` portrait sheet. `countdown: true` = chapter cards "நம்பர் 3/2/1" (kadaisi chapter = 1). Script ~450 Tamil letters ≈ 40 s (0.065 s/letter after 1.12×).

Slow uplink: 1440p (430 MB) upload stuck aachu → 1080p `(upload).mp4` copy pannittu upload (ex-to-app adha mudhalla edukkum). 05/06 1440p direct-aa `ex-to-youtube --unlisted`-la poachu (~250 MB, 2 min).

**Render aanadhum video vs audio length check pannanum** (ffprobe `stream=duration`, rendum ore maadhiri irukkanum). 06 mudhal render-la RAM kammi-aa irundhappo pipe "write UNKNOWN" aagi parts silent-aa short aachu → video 243.7 s / audio 275.2 s, voice-um picture-um sync illa. `render.ts` `run()` fix (2026-11-14): `-t` illaadha ffmpeg-ku pipe break = failure → part thirumba render aagum ("part N failed (write UNKNOWN), making it again" log-la varum, adhu sari thaan).
