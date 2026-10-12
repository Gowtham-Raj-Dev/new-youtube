"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Copy, Layers, Plus, RotateCcw, X } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  WEEKDAYS,
  hasAnySlot,
  nextSlots,
  slotMinutesOn,
  slotRulesFrom,
  type ScheduleDoc,
  type SlotRules,
  type Weekday,
} from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSchedules, useSettings, type WithId } from "@/lib/firebase/hooks";
import { WEEKDAY_LABELS, rescheduleQueue, saveSettings, type EditableSettings } from "@/lib/schedule";
import { formatInZone, timezoneOptions } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, inputClasses } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

/** Every weekday with a (possibly empty) sorted list of "HH:mm" times. */
type DayTimes = Record<Weekday, string[]>;

const hhmm = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** The saved times of every weekday. A schedule saved as the old start-time-and-gap pattern comes out as the times that pattern gave. */
function savedDays(settings: EditableSettings): DayTimes {
  const rules = slotRulesFrom(settings);
  return Object.fromEntries(WEEKDAYS.map((day) => [day, slotMinutesOn(rules, day).map(hhmm)])) as DayTimes;
}

/** "18:30" → "6:30 pm". */
function clock(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(Date.UTC(2000, 0, 1, hours, minutes));
}

/** One weekday's times: chips to remove, a time box and Add to put a new one in. */
function DayRow({ day, times, onChange, onCopyToAll }: { day: Weekday; times: string[]; onChange: (times: string[]) => void; onCopyToAll: () => void }) {
  const [draft, setDraft] = useState("18:00");
  const add = () => /^([01]\d|2[0-3]):[0-5]\d$/.test(draft) && !times.includes(draft) && times.length < 24 && onChange([...times, draft].sort());

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface/60 p-3 sm:flex-row sm:items-center">
      <p className="w-12 shrink-0 text-[13px] font-semibold">{WEEKDAY_LABELS[day]}</p>
      <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1.5">
        {times.length === 0 && <span className="text-[12.5px] text-faint">No uploads this day</span>}
        {times.map((time) => (
          <span key={time} className="inline-flex items-center gap-1 rounded-lg bg-accent-soft py-1 pl-2.5 pr-1 text-[12.5px] tabular-nums text-text">
            {clock(time)}
            <button type="button" onClick={() => onChange(times.filter((t) => t !== time))} className="grid size-4 place-items-center rounded text-muted hover:bg-white/10 hover:text-text" aria-label={`Remove ${clock(time)} on ${WEEKDAY_LABELS[day]}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input type="time" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Time to add on ${WEEKDAY_LABELS[day]}`} className={cn(inputClasses, "h-8 !w-28 px-2 text-[13px]")} />
        <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={add}>
          Add
        </Button>
        <button type="button" onClick={onCopyToAll} disabled={times.length === 0} title="Use these times on every day" aria-label={`Copy ${WEEKDAY_LABELS[day]}'s times to every day`} className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-white/[0.06] hover:text-text disabled:opacity-40">
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({ uid, settings, schedules }: { uid: string; settings: EditableSettings; schedules: WithId<ScheduleDoc>[] }) {
  const [timezone, setTimezone] = useState(settings.publishing.timezone);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [now] = useState(() => Date.now());

  const zones = useMemo(() => timezoneOptions(settings.publishing.timezone), [settings.publishing.timezone]);
  const saved = useMemo(() => savedDays(settings), [settings]);
  const [dayTimes, setDayTimes] = useState<DayTimes>(saved);
  const rules: SlotRules = { ...slotRulesFrom(settings), timezone, daySlots: dayTimes };
  const valid = hasAnySlot(rules);
  // A schedule still stored as the old pattern counts as unsaved: saving writes it as per-day times.
  const dirty = !settings.automation.daySlots || JSON.stringify(dayTimes) !== JSON.stringify(saved) || timezone !== settings.publishing.timezone;

  const waiting = schedules.filter((s) => s.status === "scheduled" || s.status === "quota_exceeded").length;
  // The times videos go out under the schedule on screen, counted from now: first the ones already
  // queued (saving moves them onto these times), then the next few that get added.
  const plan = valid ? nextSlots(rules, Math.max(waiting + 2, 6), now) : [];

  function reset() {
    setTimezone(settings.publishing.timezone);
    setDayTimes(saved);
    setBanner(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    // With Shorts waiting, saving is allowed even unchanged: it re-times the queue to this schedule.
    if (!valid || (!dirty && waiting === 0)) return;
    setBusy(true);
    setBanner(null);
    try {
      if (dirty) {
        await saveSettings(uid, {
          ...settings,
          publishing: { ...settings.publishing, timezone },
          automation: { ...settings.automation, daySlots: dayTimes },
        });
      }
      // The Shorts already waiting move to the new times too, in the same order.
      const { moved, firstAt, lastAt } = await rescheduleQueue();
      const when = (ms: number) => formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      setBanner({
        tone: "success",
        message:
          moved > 0 && firstAt && lastAt
            ? `Schedule saved. The ${moved} Short${moved === 1 ? "" : "s"} in the queue ${moved === 1 ? "was" : "were"} moved to it: first ${when(firstAt)}, last ${when(lastAt)}.`
            : "Schedule saved. Shorts you queue from now on use these times.",
      });
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

          <div className="space-y-2">
            {WEEKDAYS.map((day) => (
              <DayRow
                key={day}
                day={day}
                times={dayTimes[day]}
                onChange={(times) => setDayTimes({ ...dayTimes, [day]: times })}
                onCopyToAll={() => setDayTimes(Object.fromEntries(WEEKDAYS.map((d) => [d, [...dayTimes[day]]])) as DayTimes)}
              />
            ))}
            <p className="text-[12px] leading-relaxed text-muted">
              One Short goes out at each time. Uploads run at :01 and :31 past the hour, so a time like 6:10 pm goes out at 6:31 pm — times on the hour or half hour go out on the dot.
            </p>
            {!valid && <p className="text-[12px] text-danger">Add at least one time on at least one day.</p>}
            <Field label="Timezone" className="max-w-xs pt-2">
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={cn(inputClasses, "h-11")}>
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            {/* Throws away unsaved changes and goes back to the schedule as last saved. */}
            <Button type="button" variant="ghost" icon={<RotateCcw className="size-4" />} disabled={(JSON.stringify(dayTimes) === JSON.stringify(saved) && timezone === settings.publishing.timezone) || busy} onClick={reset}>
              Reset
            </Button>
            <Button type="submit" loading={busy} disabled={!valid || (!dirty && waiting === 0)}>
              {dirty || waiting === 0 ? "Save schedule" : "Apply to queue"}
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
                <ul className="space-y-1 text-muted">
                  {WEEKDAYS.filter((day) => dayTimes[day].length > 0).map((day) => (
                    <li key={day} className="flex gap-3">
                      <span className="w-10 shrink-0 font-medium text-text">{WEEKDAY_LABELS[day]}</span>
                      <span>
                        {dayTimes[day].length} — {dayTimes[day].map(clock).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <CalendarClock className="size-3.5 text-accent" />
                    When each video goes out
                  </p>
                  <ol className="max-h-72 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {plan.map((ms, i) => (
                      <li key={ms} className="flex items-center gap-3 rounded-lg px-2 py-1.5 tabular-nums odd:bg-white/[0.03]">
                        <span className={cn("w-16 shrink-0 font-medium", i < waiting ? "text-text" : "text-faint")}>Video {i + 1}</span>
                        <span className="flex-1 text-muted">{formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: undefined, weekday: "short", day: "numeric", month: "short" })}</span>
                        <span className={i < waiting ? "text-text" : "text-muted"}>{formatInZone(new Date(ms), timezone, { dateStyle: undefined, timeStyle: "short" })}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-[12px] leading-relaxed text-faint">
                    {waiting > 0
                      ? `Videos 1–${waiting} are the ones in your queue now${dirty ? " — save to move them to these times" : ""}. The rest are the next ones you add.`
                      : "Nothing is queued yet — this is where the next videos you add will go."}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted">Add a time to at least one day to see when your videos go out.</p>
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
