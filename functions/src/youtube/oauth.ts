// Google OAuth 2.0 (server-side web flow) for YouTube. Plain fetch — no SDK needed.

/**
 * Upload videos, read the connected channel, and manage videos — the last one
 * only to switch a Short from Private to public after its copyright check.
 */
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube",
] as const;

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

/** Thrown when Google says the refresh token is no longer valid (revoked, expired, password change). */
export class TokenRevokedError extends Error {
  constructor() {
    super("YouTube access was revoked or expired.");
  }
}

export function buildAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    state,
    // offline + consent guarantees a refresh token even on reconnect.
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json()) as TokenResponse & { error?: string; error_description?: string };
  if (json.error === "invalid_grant") throw new TokenRevokedError();
  if (!res.ok || json.error) throw new Error(`Google token endpoint: ${json.error ?? res.status} ${json.error_description ?? ""}`.trim());
  return json;
}

export function exchangeCode(code: string, client: OAuthClient) {
  return tokenRequest({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: client.redirectUri,
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken: string, client: OAuthClient) {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    grant_type: "refresh_token",
  });
}

/** Best effort: a token that is already invalid is fine to ignore. */
export async function revokeToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}
