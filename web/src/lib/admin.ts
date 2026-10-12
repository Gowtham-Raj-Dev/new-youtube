import { httpsCallable } from "firebase/functions";
import type { User } from "firebase/auth";
import { ADMIN_EMAIL, type UsageReport } from "@shortflow/shared";
import { firebase } from "./firebase/client";

/** Whether to show the owner-only pages. Only hides them — the server checks again before returning anything. */
export function isAdmin(user: User | null) {
  return user?.email === ADMIN_EMAIL && user.emailVerified;
}

/** Every user's channels and storage, biggest first. Lists the whole bucket, so it can take a few seconds. */
export async function fetchUsage(): Promise<UsageReport> {
  const { data } = await httpsCallable<void, UsageReport>(firebase().functions, "adminUsage", { timeout: 300_000 })();
  return data;
}
