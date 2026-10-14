import { httpsCallable } from "firebase/functions";
import { firebase } from "./firebase/client";
import { signOut } from "./firebase/auth";

/** Where anyone can see and remove the apps that hold access to their Google account. */
export const GOOGLE_PERMISSIONS_URL = "https://myaccount.google.com/connections";

/**
 * Deletes the signed-in account and everything stored for it, then signs out.
 * Videos already on YouTube stay there.
 */
export async function deleteAccount(): Promise<void> {
  await httpsCallable(firebase().functions, "deleteAccount", { timeout: 540_000 })();
  // The server already removed the sign-in; this clears the session in this tab.
  await signOut().catch(() => {});
}
