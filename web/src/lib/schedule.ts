import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { COLLECTIONS, WEEKDAYS, dailySlotMinutes, nextSlots, type ScheduleDoc, type SettingsDoc, type SlotRules, type Weekday } from "@shortflow/shared";
import { firebase } from "./firebase/client";
import { toDate } from "./time";

export type EditableSettings = Pick<SettingsDoc, "processing" | "publishing" | "automation" | "storage" | "notifications">;

/** Writes the whole settings doc — firestore.rules validates every field, so partial writes aren't allowed. */
export async function saveSettings(uid: string, settings: EditableSettings) {
  await setDoc(doc(firebase().db, COLLECTIONS.settings, uid), {
    userId: uid,
    processing: settings.processing,
    publishing: settings.publishing,
    automation: settings.automation,
    storage: settings.storage,
    notifications: settings.notifications,
    updatedAt: serverTimestamp(),
  });
}

/** Moves every Short still waiting in the queue onto the saved schedule, keeping their order. */
export async function rescheduleQueue(): Promise<{ moved: number; firstAt: number | null; lastAt: number | null }> {
  const { data } = await httpsCallable<void, { moved: number; firstAt: number | null; lastAt: number | null }>(firebase().functions, "rescheduleQueue")();
  return data;
}

export const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

const timeFormat = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** 1080 → "6:00 pm". */
export function formatSlotTime(minutesAfterMidnight: number) {
  return timeFormat.format(Date.UTC(2000, 0, 1, 0, minutesAfterMidnight));
}

export function describeDays(days: readonly Weekday[]) {
  const ordered = WEEKDAYS.filter((d) => days.includes(d));
  if (ordered.length === 7) return "every day";
  if (ordered.length === 0) return "on no days";
  if (ordered.join() === "mon,tue,wed,thu,fri") return "on weekdays";
  return `on ${listFormat.format(ordered.map((d) => WEEKDAY_LABELS[d]))}`;
}

/** "every day at 6:00 pm and 10:00 pm". */
export function describeSchedule(rules: SlotRules) {
  const times = dailySlotMinutes(rules).map(formatSlotTime);
  return `${describeDays(rules.publishDays)} at ${listFormat.format(times)}`;
}

/** The schedule as a few short facts — "Every day", "4 a day", "8:00 pm – 11:00 pm", "1 hour apart" — that stay short however many slots there are. */
export function scheduleFacts(rules: SlotRules): string[] {
  const slots = dailySlotMinutes(rules);
  const days = describeDays(rules.publishDays).replace(/^on /, "");
  const facts = [days.charAt(0).toUpperCase() + days.slice(1), `${slots.length} a day`];
  if (slots.length === 0) return facts;
  if (slots.length === 1) return [...facts, `at ${formatSlotTime(slots[0])}`];
  const gap = rules.intervalMinutes;
  return [...facts, `${formatSlotTime(slots[0])} – ${formatSlotTime(slots[slots.length - 1])}`, gap < 60 ? `${gap} minutes apart` : `${gap / 60} hour${gap === 60 ? "" : "s"} apart`];
}

/** The slots the server would hand out right now for `count` more Shorts. A preview only — the server decides. */
export function previewSlots(rules: SlotRules, count: number, schedules: Array<Pick<ScheduleDoc, "status" | "publishAt">>): number[] {
  const now = Date.now();
  return nextSlots(rules, count, now, takenSlots(schedules, now));
}

/** Instants already booked in the queue, for previewing the next free slots. */
export function takenSlots(schedules: Array<Pick<ScheduleDoc, "status" | "publishAt">>, now = Date.now()): number[] {
  return schedules
    .filter((s) => s.status === "scheduled" || s.status === "uploading" || s.status === "quota_exceeded")
    .map((s) => toDate(s.publishAt)?.getTime() ?? 0)
    .filter((ms) => ms >= now);
}
