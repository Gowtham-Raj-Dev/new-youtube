import { DEFAULT_TIMEZONE, type TimestampLike } from "@shortflow/shared";

export function toDate(ts: TimestampLike | null | undefined): Date | null {
  return ts && typeof ts.toDate === "function" ? ts.toDate() : null;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(date: Date | null, now = Date.now()): string {
  if (!date) return "just now";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(seconds / 86400), "day");
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Formats a UTC instant in the user's timezone. */
export function formatInZone(date: Date, timeZone = DEFAULT_TIMEZONE, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-IN", { timeZone, dateStyle: "medium", timeStyle: "short", ...opts }).format(date);
}

export function greetingFor(timeZone = DEFAULT_TIMEZONE, date = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
