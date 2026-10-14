# ShortFlow

Turn long videos into scheduled YouTube Shorts.

## Architecture

```
Browser (Next.js static export on Firebase Hosting)
  │  Firebase Auth · Firestore listeners · resumable uploads to Storage
  ▼
Firebase Storage ──► onSourceVideoUploaded ──► videos/{id} queued + jobs/{jobId}
                                                  │
                                                  ▼
                              PC helper (FFmpeg on the user's own machine)
                              cuts the source into 1080×1920 Shorts; the browser uploads them
                                                  │
                                                  ▼
                            shorts/{shortId} + users/{uid}/shorts/... in Storage
                                                  │  user edits title/description/keywords,
                                                  ▼  then "Submit to queue" (queueShorts)
                            schedules/{shortId} — next free slot of the publishing schedule
                                                  │
publishDueShorts (every 5 minutes) ───────────────┴──► YouTube Data API v3
  runs server-side; the browser/PC can be off          (OAuth refresh token, server-only)
```

Firestore stores metadata only; video bytes live in Storage. FFmpeg runs on the
user's PC (`npm run helper`, started by `npm run dev`), so cutting costs no cloud
compute — and only works when the app is opened on localhost with the helper running.

## Layout

| Path | What |
|---|---|
| `web/` | Next.js 16 + TypeScript + Tailwind frontend (static export → `web/out`) |
| `packages/shared/` | Firestore data model, status enums, Storage paths, defaults, branding |
| `firestore.rules`, `storage.rules` | Security rules (contract mirrors `packages/shared`) |
| `firestore.indexes.json` | Composite indexes |
| `tests/rules.test.mjs` | Rules tests against the emulators |
| `scripts/check-firebase.mjs` | Read-only probe of the live project's services |
| `functions/` | Cloud Functions, bundled with esbuild so they can import `packages/shared`. `youtube/` OAuth + upload, `videos/` source checks, `shorts/` FFmpeg worker, `schedule/` queue callables |

## Commands

```bash
npm install               # once, at the repo root
npm run dev               # web on http://localhost:3000 + the PC helper on 127.0.0.1:4777
npm run helper            # the PC helper on its own
npm run build             # static export to web/out
npm run typecheck
npm run test:rules        # needs Java 21+ (Firebase emulators)
npm run check:firebase    # are Auth / Firestore / Storage live and locked down?
npm run deploy:rules      # Firestore rules + indexes + Storage rules
npm run deploy:hosting
npm --prefix functions run build   # bundle Cloud Functions to functions/lib
firebase deploy --only functions
```

On a busy/cold Windows machine the CLI's 10 s function discovery can time out
("User code failed to load"). Deploy functions on their own with a longer limit:
PowerShell `$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"; firebase deploy --only functions`.

`web`'s build runs `scripts/fix-export-segments.mjs` after `next build`: Next 16's static export writes
prefetch segments for route groups as nested folders, but the router requests flat dotted filenames.
Remove it once Next fixes this.

## Going public

OAuth verification, the YouTube API audit and quota extension, and what the app already does for them:
[docs/going-public.md](docs/going-public.md).

## YouTube connection — one-time setup

1. Google Cloud → enable **YouTube Data API v3**.
2. Google Auth Platform → Branding, Audience **External + In production** (Testing mode expires
   refresh tokens after 7 days), Data access scopes `youtube.upload` + `youtube.readonly`.
3. Clients → **Web application**, redirect URI `https://fir-4b5dc.web.app/api/youtube/callback`.
4. `functions/.env` (copy `functions/.env.example`): set `YOUTUBE_OAUTH_CLIENT_ID`.
5. `firebase functions:secrets:set YOUTUBE_OAUTH_CLIENT_SECRET` and
   `firebase functions:secrets:set TOKEN_ENCRYPTION_KEY` (32 random bytes, base64).
6. Deploy functions, then hosting (the callback URL is a Hosting rewrite to `youtubeOAuthCallback`).

Local emulators: put emulator-only values in `functions/.env.local` and `functions/.secret.local`
(both git-ignored) and run `npm run emulators` with Java 21+.

## Where each credential lives

| Credential | Where | Never |
|---|---|---|
| Firebase web config (apiKey, appId, …) | `web/.env.local` (template: `web/.env.example`) | — it is public by design; security comes from Auth + rules |
| Firebase Admin access | None to manage. Functions and Cloud Run use their runtime service account automatically. | Don't download service-account JSON keys |
| YouTube OAuth **Client ID** | `functions/.env` → `YOUTUBE_OAUTH_CLIENT_ID` (+ `APP_ORIGINS`, comma-separated) | — |
| YouTube OAuth **Client Secret** | Secret Manager: `firebase functions:secrets:set YOUTUBE_OAUTH_CLIENT_SECRET` | Frontend code, `.env` files, git |
| Token encryption key | Secret Manager: `firebase functions:secrets:set TOKEN_ENCRYPTION_KEY` | Anywhere else |
| YouTube refresh tokens | Firestore `youtubeCredentials/*`, AES-256-GCM encrypted, unreadable by clients | Browser, logs |

## Firebase project

- Project: `fir-4b5dc` · Firestore `(default)` in `asia-south1`
- Storage bucket `fir-4b5dc.firebasestorage.app` is in **us-east1** → Storage-triggered functions
  (`onSourceVideoUploaded`) and the future FFmpeg worker run in `us-east1`; everything else in `asia-south1`.
- Hosting: https://fir-4b5dc.web.app

## Upload pipeline (phase 1)

Browser creates `videos/{id}` (`status: uploading`) → resumable upload to
`users/{uid}/videos/original/{id}/source.{ext}` (storage.rules only accept a file whose size and
type match that doc) → `onSourceVideoUploaded` runs ffprobe + grabs a thumbnail → `uploaded`
(or `failed` with a friendly message). `deleteVideo` removes source/Shorts/schedules together;
`cleanupStaleUploads` sweeps abandoned uploads daily.

## Shorts pipeline (phases 2–3)

- **Cutting.** "Generate Shorts" asks how long each Short should be (5–180 s) and hands the source's
  download URL to the PC helper (`functions/src/local/split-server.ts`). It cuts fixed-length
  segments — a 2:00 video at 30 s gives four; a leftover under 5 s is dropped — and renders each to
  1080×1920 H.264/AAC using the user's crop mode. The browser then uploads each file to Storage and
  creates its `shorts` doc (`web/src/lib/local-splitter.ts`; the rules validate both). Short ids are
  `{videoId}_{part}`, so the same part is never made twice.
- **Queueing.** `queueShorts` gives each Short the next free slot from `settings` (first time of
  day, interval, days, max per day — `packages/shared/src/slots.ts`, shared with the web preview).
  `unqueueShort` puts it back to `ready`.
- **Publishing.** `publishDueShorts` claims each due schedule in a transaction, streams the file
  from Storage to YouTube in 8 MB resumable chunks, and writes the result to the schedule and the
  Short. Quota errors park the Short as `quota_exceeded` until the midnight-Pacific reset; an upload
  whose outcome is unknown is flagged as interrupted rather than retried into a duplicate.

`publishDueShorts` runs in `us-east1`, next to the bucket.

Gotchas learned the hard way:
- storage.rules call `firestore.get()`, which needs the Storage service agent to hold
  `roles/firebaserules.firestoreServiceAgent`. `firebase deploy --non-interactive` silently skips
  granting it — run `firebase deploy --only storage` interactively once and answer **Y** on a new project.
- The static ffmpeg/ffprobe Linux builds segfault on DNS lookups, so they never get a hostname:
  `lib/media.ts` serves the Storage object on `127.0.0.1` with HTTP Range support instead.
- The first deploy of a Storage trigger can fail with `storage.buckets.get denied` while the new
  Eventarc service agent's permissions propagate — wait a few minutes and redeploy that function.
