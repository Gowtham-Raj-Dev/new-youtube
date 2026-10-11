import { HttpsError } from "firebase-functions/https";

export function requireUid(auth: { uid: string } | undefined): string {
  if (!auth) throw new HttpsError("unauthenticated", "Please sign in again.");
  return auth.uid;
}
