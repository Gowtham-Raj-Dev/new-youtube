"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Layers, TriangleAlert } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  SCHEDULE_INTERVALS_MINUTES,
  WEEKDAYS,
  dailySlotMinutes,
  nextSlots,
  type ScheduleDoc,
  type ScheduleIntervalMinutes,
  type SlotRules,
  type Weekday,
} from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useSettings, type WithId } from "@/lib/firebase/hooks";
import { WEEKDAY_LABELS, describeSchedule, saveSettings, takenSlots, type EditableSettings } from "@/lib/schedule";
import { formatInZone } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, inputClasses } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const INTERVAL_LABELS: Record<ScheduleIntervalMinutes, string> = {
  30: "30 minutes",
  60: "1 hour",
  120: "2 hours",
  240: "4 hours",
  360: "6 hours",
  720: "12 hours",
  1440: "24 hours (one a day)",
};

function timezoneOptions(current: string) {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return zones.includes(current) ? zones : [current, ...zones];
}

function ScheduleForm({ uid, settings, schedules }: { uid: string; settings: EditableSettings; schedules: WithId<ScheduleDoc>[] }) {
  const [timezone, setTimezone] = useState(settings.publishing.timezone);
  const [firstTime, setFirstTime] = useState(settings.publishing.defaultUploadTime);
  const [intervalMinutes, setIntervalMinutes] = useState(settings.automation.intervalMinutes);
  const [maxPerDay, setMaxPerDay] = useState(settings.automation.maxPerDay);
  const [publishDays, setPublishDays] = useState<Weekday[]>(settings.automation.publishDays);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [now] = useState(() => Date.now());

  const zones = useMemo(() => timezoneOptions(settings.publishing.timezone), [settings.publishing.timezone]);
  const rules: SlotRules = { timezone, firstTime, intervalMinutes, publishDays, maxPerDay };
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(firstTime);
  const validMax = Number.isInteger(maxPerDay) && maxPerDay >= 1 && maxPerDay <= 50;
  const valid = validTime && validMax && publishDays.length > 0;
  const dirty =
    timezone !== settings.publishing.timezone ||
    firstTime !== settings.publishing.defaultUploadTime ||
    intervalMinutes !== settings.automation.intervalMinutes ||
    maxPerDay !== settings.automation.maxPerDay ||
    WEEKDAYS.some((d) => publishDays.includes(d) !== settings.automation.publishDays.includes(d));

  const daily = valid ? dailySlotMinutes(rules) : [];
  const upcoming = valid ? nextSlots(rules, 6, now, takenSlots(schedules, now)) : [];
  const waiting = schedules.filter((s) => s.status === "scheduled" || s.status === "quota_exceeded").length;

  function toggleDay(day: Weekday) {
    setPublishDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : WEEKDAYS.filter((d) => d === day || days.includes(d))));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid || !dirty) return;
    setBusy(true);
    setBanner(null);
    try {
      await saveSettings(uid, {
        ...settings,
        publishing: { ...settings.publishing, timezone, defaultUploadTime: firstTime },
        automation: { ...settings.automation, intervalMinutes, publishDays, maxPerDay },
      });
      setBanner({ tone: "success", message: "Schedule saved. Shorts you queue from now on use these times; ones already in the queue keep theirs." });
    } catch {
      setBanner({ tone: "error", message: "Couldn't save your schedule. Check your connection and try again." });
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader title="When Shorts go out" description="Each Short you submit to the queue takes the next free slot." />
        <form onSubmit={save} className="space-y-5 p-5">
          {banner && (
            <Alert tone={banner.tone} onDismiss={() => setBanner(null)}>
              {banner.message}
            </Alert>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First Short of the day" hint="In your timezone below.">
              <input type="time" required value={firstTime} onChange={(e) => setFirstTime(e.target.value)} className={cn(inputClasses, "h-11")} />
            </Field>
            <Field label="Then one every">
              <select value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value) as ScheduleIntervalMinutes)} className={cn(inputClasses, "h-11")}>
                {SCHEDULE_INTERVALS_MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {INTERVAL_LABELS[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Most Shorts in a day" hint="Between 1 and 50.">
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                required
                value={Number.isNaN(maxPerDay) ? "" : maxPerDay}
                onChange={(e) => setMaxPerDay(e.target.valueAsNumber)}
                className={cn(inputClasses, "h-11")}
              />
            </Field>
            <Field label="Timezone">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cn(inputClasses, "h-11")}>
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-medium">Publishing days</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const on = publishDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-9 min-w-12 rounded-lg border px-3 text-[13px] font-medium transition",
                      on ? "border-accent/50 bg-accent-soft text-text" : "border-line text-muted hover:border-line-strong hover:text-text",
                    )}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
            {publishDays.length === 0 && <p className="mt-1.5 text-[12px] text-danger">Pick at least one day.</p>}
          </div>

          <div className="flex justify-end border-t border-line pt-5">
            <Button type="submit" loading={busy} disabled={!valid || !dirty}>
              Save schedule
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="What this gives you" />
          <div className="space-y-4 p-5 text-[13px]">
            {valid ? (
              <>
                <p className="leading-relaxed text-muted">
                  Shorts go out <span className="text-text">{describeSchedule(rules)}</span>.
                </p>
                {daily.length < maxPerDay && (
                  <p className="flex gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 leading-relaxed text-warning">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      Only {daily.length} of your {maxPerDay} daily Shorts fit before midnight. Start earlier or shorten the gap to fit more.
                    </span>
                  </p>
                )}
                <div>
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <CalendarClock className="size-3.5 text-accent" />
                    Next free slots
                  </p>
                  <ol className="space-y-1.5 text-muted">
                    {upcoming.map((ms) => (
                      <li key={ms} className="flex justify-between gap-3 tabular-nums">
                        <span>{formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short" })}</span>
                        <span className="text-text">{formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: "short" })}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : (
              <p className="text-muted">Fill in a start time, a daily limit and at least one day to see your slots.</p>
            )}
          </div>
        </Card>

        <Card className="flex items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium">{waiting === 0 ? "Nothing in the queue" : `${waiting} Short${waiting === 1 ? "" : "s"} in the queue`}</p>
            <p className="mt-0.5 text-[12.5px] text-muted">Submit Shorts from the Shorts page.</p>
          </div>
          <ButtonLink href={waiting === 0 ? "/shorts" : "/queue"} variant="secondary" size="sm" icon={<Layers className="size-3.5" />}>
            {waiting === 0 ? "Shorts" : "Queue"}
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}

export default function PublishingSchedulePage() {
  const { user } = useAuth();
  const { data: settings, loading, error } = useSettings(user?.uid);
  const { data: schedules } = useSchedules(user?.uid);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Publishing schedule</h2>
        <p className="mt-1 text-sm text-muted">Set the times your Shorts go out. The queue fills these slots in order, and uploads happen in the cloud — your PC can be off.</p>
      </div>

      {error && <Alert tone="error">We couldn&apos;t load your schedule. Check your connection and refresh the page.</Alert>}

      {loading || !user ? (
        <Card className="space-y-4 p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </Card>
      ) : (
        <ScheduleForm uid={user.uid} settings={settings ?? DEFAULT_SETTINGS} schedules={schedules} />
      )}
    </div>
  );
}
