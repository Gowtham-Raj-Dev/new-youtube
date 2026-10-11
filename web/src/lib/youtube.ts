import { httpsCallable } from "firebase/functions";
import { FirebaseError } from "firebase/app";
import { firebase } from "./firebase/client";

/** Sends the browser to Google's consent screen. Tokens are exchanged server-side. */
export async function connectYouTube() {
  const start = httpsCallable<{ returnOrigin: string }, { url: string }>(firebase().functions, "youtubeConnectStart");
  const { data } = await start({ returnOrigin: window.location.origin });
  window.location.assign(data.url);
}

export async function refreshYouTubeChannel(connectionId: string) {
  await httpsCallable(firebase().functions, "youtubeRefreshChannel")({ connectionId });
}

export async function disconnectYouTube(connectionId: string) {
  await httpsCallable(firebase().functions, "youtubeDisconnect")({ connectionId });
}

/** Messages for `?error=` set by the OAuth callback. */
export const CALLBACK_ERRORS: Record<string, string> = {
  denied: "You cancelled the Google permission screen. Nothing was connected.",
  expired: "The connection link expired. Please try connecting again.",
  scopes: "ShortFlow needs both permissions (upload videos + view your channel). Please tick both and try again.",
  no_channel: "That Google account doesn't have a YouTube channel yet. Create one on YouTube, then connect.",
  failed: "Google didn't complete the connection. Please try again.",
};

/** Callable errors carry friendly server messages; anything else gets a safe generic one. */
export function friendlyCallableError(error: unknown): string {
  if (error instanceof FirebaseError) {
    const code = error.code.replace("functions/", "");
    if (["invalid-argument", "failed-precondition", "not-found", "unauthenticated", "unavailable"].includes(code)) {
      return error.message;
    }
    if (code === "internal" || code === "unimplemented") {
      return "The server isn't reachable right now. Please try again in a moment.";
    }
  }
  return "Something went wrong. Please try again.";
}
