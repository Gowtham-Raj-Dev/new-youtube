import { defineInt, defineSecret, defineString } from "firebase-functions/params";

export const REGION = "asia-south1";

/** The default Storage bucket lives in us-east1; Storage triggers must run in the same region. */
export const STORAGE_REGION = "us-east1";

// Non-secret values come from functions/.env (see functions/.env.example).
export const YOUTUBE_CLIENT_ID = defineString("YOUTUBE_OAUTH_CLIENT_ID", {
  description: "OAuth 2.0 Web client ID from Google Cloud → Google Auth Platform → Clients",
});

export const YOUTUBE_REDIRECT_URI = defineString("YOUTUBE_OAUTH_REDIRECT_URI", {
  default: "https://fir-4b5dc.web.app/api/youtube/callback",
  description: "Must exactly match an authorised redirect URI on the OAuth client",
});

/** Comma-separated origins the OAuth flow may send the user back to. The first is the fallback. */
const APP_ORIGINS_PARAM = defineString("APP_ORIGINS", {
  default: "https://fir-4b5dc.web.app,https://fir-4b5dc.firebaseapp.com,http://localhost:3000",
});

export function appOrigins(): string[] {
  return APP_ORIGINS_PARAM.value()
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

/**
 * Every user shares this project's YouTube API quota, so each account may publish at most this many
 * Shorts per YouTube day (until midnight Pacific). The owner accounts in ADMIN_EMAILS have no limit.
 * Raise it once Google grants more quota.
 */
export const DAILY_UPLOADS_PER_USER = defineInt("DAILY_UPLOADS_PER_USER", {
  default: 10,
  description: "Shorts each non-owner account may publish per day",
});

// Secrets live in Cloud Secret Manager: `firebase functions:secrets:set <NAME>`.
export const YOUTUBE_CLIENT_SECRET = defineSecret("YOUTUBE_OAUTH_CLIENT_SECRET");

/** 32 random bytes, base64. Encrypts stored refresh tokens (AES-256-GCM). */
export const TOKEN_ENCRYPTION_KEY = defineSecret("TOKEN_ENCRYPTION_KEY");

/** Claude API key for writing the daily AI Shorts' scripts. */
export const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
