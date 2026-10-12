import type { SettingsDoc, Weekday } from "./models";

/**
 * Publishing slots: on each publishing day the first Short goes out at
 * `firstTime`, then one every `intervalMinutes` until `maxPerDay` is reached or
 * the day ends. Shared so the web preview and the server pick the same times.
 */
export interface SlotRules {
  /** IANA zone the times below are in. */
  timezone: string;
  /** "HH:mm". */
  firstTime: string;
  intervalMinutes: number;
  publishDays: readonly Weekday[];
  maxPerDay: number;
  /**
   * The user's own "HH:mm" times for each weekday. When set, it replaces the
   * start-time-and-gap pattern entirely: a day goes out at exactly its listed
   * times, and a day with none is skipped.
   */
  daySlots?: DayTimes;
}

/** "HH:mm" publishing times per weekday. */
export type DayTimes = Partial<Record<Weekday, readonly string[]>>;

export function slotRulesFrom(settings: Pick<SettingsDoc, "publishing" | "automation">): SlotRules {
  return {
    timezone: settings.publishing.timezone,
    firstTime: settings.publishing.defaultUploadTime,
    intervalMinutes: settings.automation.intervalMinutes,
    publishDays: settings.automation.publishDays,
    maxPerDay: settings.automation.maxPerDay,
    daySlots: settings.automation.daySlots,
  };
}

/** Minutes after midnight of each slot in a day. */
export function dailySlotMinutes(rules: Pick<SlotRules, "firstTime" | "intervalMinutes" | "maxPerDay">): number[] {
  const [hours, minutes] = rules.firstTime.split(":").map(Number);
  const slots: number[] = [];
  for (let at = hours * 60 + minutes; at < 24 * 60 && slots.length < rules.maxPerDay; at += rules.intervalMinutes) {
    slots.push(at);
  }
  return slots;
}

/** Minutes after midnight of each slot on weekday, earliest first: the day's own times if the user set them, otherwise the daily pattern. */
export function slotMinutesOn(rules: SlotRules, weekday: Weekday): number[] {
  if (rules.daySlots) {
    const minutes = (rules.daySlots[weekday] ?? []).map((time) => {
      const [hours, mins] = time.split(":").map(Number);
      return hours * 60 + mins;
    });
    return [...new Set(minutes.filter((m) => Number.isFinite(m) && m >= 0 && m < 24 * 60))].sort((a, b) => a - b);
  }
  return rules.publishDays.includes(weekday) ? dailySlotMinutes(rules) : [];
}

/** True when at least one weekday has a slot. */
export function hasAnySlot(rules: SlotRules): boolean {
  return JS_WEEKDAYS.some((day) => slotMinutesOn(rules, day).length > 0);
}

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallTime(utcMs: number, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(utcMs);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute"), second: part("second") };
}

/** UTC instant of a wall-clock time in `timeZone`. */
export function zonedTimeToUtc(year: number, month: number, day: number, minutesAfterMidnight: number, timeZone: string): number {
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minutesAfterMidnight);
  const offsetAt = (utcMs: number) => {
    const w = wallTime(utcMs, timeZone);
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(utcMs / 1000) * 1000;
  };
  // Second pass settles times next to a daylight-saving change.
  return asIfUtc - offsetAt(asIfUtc - offsetAt(asIfUtc));
}

const JS_WEEKDAYS: readonly Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const dayKey = (year: number, month: number, day: number) => `${year}-${month}-${day}`;

/**
 * The next `count` free slots after `afterMs`, earliest first (UTC ms).
 * `takenMs` are already-scheduled instants: they block their exact slot and
 * count towards that day's `maxPerDay`. Returns fewer than `count` only when
 * the rules leave no slots at all (no publishing days).
 */
export function nextSlots(rules: SlotRules, count: number, afterMs: number, takenMs: readonly number[] = []): number[] {
  if (count <= 0 || !hasAnySlot(rules)) return [];

  const taken = new Set(takenMs);
  const usedPerDay = new Map<string, number>();
  for (const ms of takenMs) {
    const w = wallTime(ms, rules.timezone);
    const key = dayKey(w.year, w.month, w.day);
    usedPerDay.set(key, (usedPerDay.get(key) ?? 0) + 1);
  }

  const start = wallTime(afterMs, rules.timezone);
  const slots: number[] = [];
  for (let offset = 0; offset < 366 * 2 && slots.length < count; offset++) {
    // Calendar arithmetic only — the Date is just a (year, month, day) carrier.
    const date = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    const minutes = slotMinutesOn(rules, JS_WEEKDAYS[date.getUTCDay()]);
    if (minutes.length === 0) continue;
    // A day with its own times takes exactly that many; the pattern is capped by maxPerDay.
    const cap = rules.daySlots ? minutes.length : rules.maxPerDay;

    const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    let used = usedPerDay.get(dayKey(year, month, day)) ?? 0;
    for (const minute of minutes) {
      if (used >= cap || slots.length >= count) break;
      const at = zonedTimeToUtc(year, month, day, minute, rules.timezone);
      if (at <= afterMs || taken.has(at)) continue;
      slots.push(at);
      used++;
    }
  }
  return slots;
}
