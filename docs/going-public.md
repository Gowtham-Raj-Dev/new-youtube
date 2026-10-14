# Going public: letting anyone use ShortFlow

Right now the OAuth app works for you and a few testers. To let anyone sign up and publish, three things
have to be approved by Google, in this order. Each step needs the one before it.

| # | What | Who decides | Typical wait |
|---|---|---|---|
| 1 | Own domain + public pages | You | 1 day |
| 2 | **OAuth app verification** (removes the "Google hasn't verified this app" screen and the 100-user cap) | Google Trust & Safety | 3–6 weeks |
| 3 | **YouTube API audit + quota extension** (more than 10,000 units a day) | YouTube API Compliance | 2–8 weeks |

## What is already done in the code

- Public home page at `/` that explains the app (OAuth review requires a homepage that does this without signing in).
- `/privacy` and `/terms`, with the wording the YouTube API Developer Policies require: links to the
  YouTube Terms of Service and the Google Privacy Policy, what YouTube data is stored and why, how to revoke
  access (security.google.com/settings/security/permissions), how to delete data, and a contact email.
- Consent line on sign-in and on "Connect YouTube".
- **Settings → Your data → Delete account** (`deleteAccount` function): revokes the Google tokens and deletes
  every document, file and the sign-in.
- **Per-account daily limit** (`DAILY_UPLOADS_PER_USER` in `functions/.env`, default 10; the owner emails in
  `ADMIN_EMAILS` have no limit) and at most 3 uploads per account per sweep, so one user can't use up the shared quota.
- The Instagram downloader is owner-only. Downloading other people's videos breaks Instagram's terms and would
  fail the YouTube audit; keep it out of the public app.

Before submitting, check `BRAND.supportEmail` and `LEGAL_UPDATED` in `packages/shared/src/defaults.ts`, and
read both legal pages once yourself — they make promises on your behalf.

## Step 1 — Domain (do this first)

Google verifies the *domain* of your homepage and privacy policy. You can't prove ownership of
`fir-4b5dc.web.app`, so buy a domain (e.g. `shortflow.in`) and:

1. Firebase console → Hosting → **Add custom domain** → add the DNS records it gives you.
2. Google Search Console → add the domain → verify with the DNS TXT record. Use the same Google account
   that owns the Cloud project.
3. Google Cloud → OAuth client → **Authorized redirect URIs**: add `https://<domain>/api/youtube/callback`.
4. `functions/.env`: `YOUTUBE_OAUTH_REDIRECT_URI=https://<domain>/api/youtube/callback` and put the domain
   first in `APP_ORIGINS`.
5. Firebase console → Authentication → Settings → **Authorized domains**: add the domain.
6. Deploy functions, then hosting.

## Step 2 — OAuth app verification

Google Cloud console → **Google Auth Platform**:

1. **Branding**: app name `ShortFlow`, logo (120×120, the `web/public/icons/icon-512.png` resized),
   support email, homepage `https://<domain>/`, privacy `https://<domain>/privacy`,
   terms `https://<domain>/terms`, authorized domain `<domain>`.
2. **Data access**: exactly these scopes, with a justification each:
   - `youtube.upload` — "Uploads the Shorts the user schedules to their own channel."
   - `youtube.readonly` — "Shows the connected channel's name, picture and subscriber count, and checks each
     uploaded Short's processing and copyright status."
   - `youtube` — "Only used to change the visibility of Shorts that ShortFlow itself uploaded, from Unlisted to
     Public after the copyright check passes (videos.update). Never used to edit or delete other videos."
     This one is the scope reviewers question most. If they push back, drop it: remove it from
     `YOUTUBE_SCOPES` in `functions/src/youtube/oauth.ts` — Shorts then go out at their final visibility and the
     "check for copyright first" option stops working.
3. **Demo video** (unlisted YouTube link, 2–4 minutes, English UI): show the homepage URL in the address bar →
   sign in → Connect YouTube, **showing the full Google consent screen with the client ID in the URL** → upload
   a video → generate Shorts → queue one → show it published on YouTube → Settings → Delete account.
4. Audience → **Publish app** (In production) → **Prepare for verification** → submit.
5. Answer Google's emails quickly; each reply resets the wait. The scopes are "sensitive", not "restricted",
   so no paid security assessment (CASA) is needed.

## Step 3 — YouTube quota: audit + extension

Every user shares **one** project quota: 10,000 units a day, resetting at midnight Pacific
(about 1:30 PM IST in winter, 12:30 PM in summer). Check the current cost of `videos.insert` in Google's
[Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost) — Google cut it from about
1,600 to about 100 units in December 2025, which means roughly 90 uploads a day for everyone combined, after
the 1-unit status checks. Watch the real number under Google Cloud → APIs & Services → YouTube Data API v3 → Quotas.

Apply at the **YouTube API Services – Audit and Quota Extension Form**:
https://support.google.com/youtube/contact/yt_api_form

Draft answers (edit before sending):

- **Reason for request**: Quota extension (and audit).
- **API client / project number**: the Cloud project number of `fir-4b5dc`.
- **What does your client do?**
  "ShortFlow is a web app for YouTube creators. A creator uploads a long video they own, ShortFlow cuts it into
  vertical clips in their browser, and the creator edits each clip's title, description, tags and visibility and
  schedules it. At the scheduled time our server uploads the clip to the creator's own channel with
  videos.insert, using the creator's OAuth consent. We read channels.list (mine=true) to show the connected
  channel, and videos.list to report processing and copyright status of videos we uploaded. Users can
  disconnect a channel or delete their account at any time, which revokes the token and deletes stored data."
- **Which API features**: videos.insert, videos.list, videos.update (privacyStatus of videos we uploaded only),
  channels.list.
- **Who are your users?** Individual YouTube creators who upload their own content.
- **How many users / uploads?** Give honest current numbers and a 6-month estimate, e.g. "40 creators, about
  60 uploads a day today; expecting 500 creators and 600 uploads a day."
- **Quota requested**: (expected uploads per day × upload cost) + 20% headroom. Show the calculation.
- **Screencast**: reuse the OAuth demo video.
- **Links**: homepage, privacy policy, terms (custom domain).

What the auditor checks, and where it is handled:

| Policy | Where |
|---|---|
| Users told they agree to the YouTube ToS | `/terms`, sign-in page, Connect YouTube card |
| Privacy policy links the Google Privacy Policy, explains data, revocation, deletion, contact | `/privacy` |
| User can revoke and delete | YouTube page → Disconnect, Settings → Delete account |
| No downloading or re-uploading other people's content | Instagram downloader is owner-only — keep it that way |
| No spammy / repetitive uploads | Per-account daily limit; Terms forbid spam |
| Stored API data refreshed or deleted within 30 days | Channel details are deleted on disconnect. **To do:** a daily job that refreshes channel details and deletes connections whose token Google reports revoked. |
| Branding | Footer says "uses YouTube API Services", not affiliated with YouTube |

If more uploads are needed after approval, use the **Audited Developer Requests Form** (only for projects
audited in the last 12 months). Then raise `DAILY_UPLOADS_PER_USER` to match.

## Other things to sort out before a public launch

- **Storage cost.** The bucket is shared; the Usage page compares it to the 5 GB free tier. Source videos are
  the bulk. Turn on "delete the original after processing" by default for new users, or add a storage cap
  per account, and set a billing budget alert in Google Cloud.
- **Abuse.** Turn on Firebase App Check (reCAPTCHA Enterprise) for Functions, Firestore and Storage so only
  your site can call them, and require email verification for email/password sign-ups.
- **Cutting.** Public users cut in the browser (WebCodecs — Chrome and Edge on a computer). Phones and Safari
  can't, so the home page says "Chrome or Edge on a computer". The PC helper is optional.
- **Support.** Answer the support email: OAuth reviewers send test emails to it.
