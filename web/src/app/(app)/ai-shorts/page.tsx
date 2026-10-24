"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import {
  AUTO_SHORTS_DEFAULT_TIMES,
  AUTO_SHORTS_ENDING_MAX_SEC,
  AUTO_SHORTS_MAX_SLOTS,
  PRIVACY_STATUSES,
  type PrivacyStatus,
} from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannels } from "@/components/providers/channel-provider";
import { useAutoShorts } from "@/lib/firebase/hooks";
import { isAdmin } from "@/lib/admin";
import { addEnding, deleteEnding, listEndings, makeAutoShortNow, saveAutoShorts, type EndingClip } from "@/lib/auto-shorts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { inputClasses } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const PRIVACY_LABELS: Record<PrivacyStatus, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };
const ONOFF = ["on", "off"] as const;
const ONOFF_LABELS = { on: "On", off: "Off" } as const;

/** Every :00 and :30 from 5:00 AM to 8:30 PM — when the publish sweep runs. */
const TIMES = Array.from({ length: 32 }, (_, i) => `${String(5 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const timeLabel = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

const message = (err: unknown, fallback: string) => {
  // Callable errors carry a message written for the user; Firebase's own codes don't.
  const text = err instanceof Error ? err.message : "";
  return text && !/^(internal|INTERNAL)$/.test(text) && !text.startsWith("Firebase") ? text : fallback;
};

export default function AiShortsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const admin = isAdmin(user);
  const { active } = useChannels();
  const { data: config, loading } = useAutoShorts(admin ? active?.id : undefined);

  useEffect(() => {
    if (user && !admin) router.replace("/dashboard");
  }, [user, admin, router]);

  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<string[]>(AUTO_SHORTS_DEFAULT_TIMES);
  const [privacy, setPrivacy] = useState<PrivacyStatus>("public");
  const [busy, setBusy] = useState<"save" | "make" | "ending" | "delete" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  // The form starts from what is saved for the channel, and again whenever the channel changes.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !active || loadedFor.current === active.id) return;
    loadedFor.current = active.id;
    setEnabled(config?.enabled ?? false);
    setTimes(config?.publishTimes?.length ? config.publishTimes : AUTO_SHORTS_DEFAULT_TIMES);
    setPrivacy(config?.privacy ?? "public");
  }, [loading, active, config]);

  const [endings, setEndings] = useState<EndingClip[]>([]);
  const [deleting, setDeleting] = useState<EndingClip | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const loadEndings = useCallback(async () => {
    if (!user || !active) return;
    try {
      setEndings(await listEndings(user.uid, active.id));
    } catch {
      setEndings([]);
    }
  }, [user, active]);
  useEffect(() => {
    if (!admin || !user || !active) return;
    let cancelled = false;
    listEndings(user.uid, active.id)
      .then((clips) => !cancelled && setEndings(clips))
      .catch(() => !cancelled && setEndings([]));
    return () => {
      cancelled = true;
    };
  }, [admin, user, active]);

  async function run(kind: NonNullable<typeof busy>, task: () => Promise<string>, failure: string) {
    setBusy(kind);
    setNotice(null);
    try {
      setNotice({ tone: "success", message: await task() });
    } catch (err) {
      setNotice({ tone: "error", message: message(err, failure) });
    }
    setBusy(null);
  }

  function save(on = enabled) {
    if (!active) return;
    void run(
      "save",
      async () => {
        await saveAutoShorts({ connectionId: active.id, enabled: on, publishTimes: times, privacy });
        setEnabled(on);
        return on ? `Saved. ${times.length} Short${times.length === 1 ? "" : "s"} a day will go out at ${[...times].sort().map(timeLabel).join(", ")}.` : "Saved. AI Shorts are off for this channel.";
      },
      "Couldn't save the settings. Check your connection and try again.",
    );
  }

  function makeNow() {
    if (!active) return;
    void run("make", async () => {
      await makeAutoShortNow(active.id);
      return "Made one. It goes out to YouTube in a couple of minutes — see it on the Queue page.";
    }, "Couldn't make the Short. Try again in a few minutes.");
  }

  function onEnding(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !active) return;
    void run("ending", async () => {
      await addEnding(user.uid, active.id, file);
      await loadEndings();
      return "Ending clip added. The next Shorts end with it.";
    }, "Couldn't upload the clip. Check your connection and try again.");
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy("delete");
    try {
      await deleteEnding(deleting.path);
      await loadEndings();
    } catch {
      setNotice({ tone: "error", message: "Couldn't delete the clip. Please try again." });
    }
    setBusy(null);
    setDeleting(null);
  }

  const setTime = (i: number, value: string) => setTimes((all) => all.map((t, k) => (k === i ? value : t)));
  const addTime = () => setTimes((all) => [...all, TIMES.find((t) => !all.includes(t)) ?? TIMES[0]]);
  const removeTime = (i: number) => setTimes((all) => all.filter((_, k) => k !== i));
  const duplicateTimes = new Set(times).size !== times.length;

  if (!admin) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Shorts</h2>
        <p className="mt-1 text-sm text-muted">
          Black-screen comedy Shorts made and published for you every day: a like/subscribe hook, a relatable story in Tamil voice with subtitles and emojis, a funny punch line, calm music, and your ending clip.
        </p>
      </div>

      {notice && (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Alert>
      )}
      {config?.pausedReason && <Alert tone="error">{config.pausedReason} Switch it on again below when you&apos;re ready.</Alert>}

      {!active ? (
        <Card>
          <EmptyState icon={<Clapperboard className="size-5" />} title="Connect a YouTube channel first" description="AI Shorts are made for one channel at a time. Connect yours on the YouTube page." />
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="divide-y divide-line">
              <CardHeader title={`Daily Shorts for ${active.channelTitle}`} description="Each Short is made about an hour before its time and published by the regular publish run." />
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-[14px] font-medium">Make and publish every day</p>
                  <p className="text-[12.5px] text-muted">Turn off any time; nothing already queued is removed.</p>
                </div>
                <Segmented label="AI Shorts on or off" options={ONOFF} labels={ONOFF_LABELS} value={enabled ? "on" : "off"} onChange={(v) => setEnabled(v === "on")} />
              </div>
              <div className="space-y-3 px-5 py-4">
                <div>
                  <p className="text-[14px] font-medium">Publishing times (India)</p>
                  <p className="text-[12.5px] text-muted">On the hour or half hour, 5:00 AM to 8:30 PM. Up to {AUTO_SHORTS_MAX_SLOTS} a day.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {times.map((time, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <select value={time} onChange={(e) => setTime(i, e.target.value)} className={cn(inputClasses, "h-10 !w-32")} aria-label={`Publishing time ${i + 1}`}>
                        {TIMES.map((t) => (
                          <option key={t} value={t}>
                            {timeLabel(t)}
                          </option>
                        ))}
                      </select>
                      {times.length > 1 && (
                        <button type="button" onClick={() => removeTime(i)} className="grid size-8 place-items-center rounded-lg text-faint transition hover:bg-white/[0.06] hover:text-text" aria-label={`Remove ${timeLabel(time)}`}>
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {times.length < AUTO_SHORTS_MAX_SLOTS && (
                    <Button type="button" variant="secondary" size="sm" icon={<Plus className="size-3.5" />} onClick={addTime}>
                      Add a time
                    </Button>
                  )}
                </div>
                {duplicateTimes && <p className="text-[12.5px] text-danger">Two times are the same — pick different ones.</p>}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-[14px] font-medium">Who can watch</p>
                <Segmented label="Who can watch" options={PRIVACY_STATUSES} labels={PRIVACY_LABELS} value={privacy} onChange={setPrivacy} />
              </div>
              <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
                <Button variant="secondary" icon={<Sparkles className="size-4" />} loading={busy === "make"} disabled={busy !== null || !config} onClick={makeNow}>
                  Make one now
                </Button>
                <Button loading={busy === "save"} disabled={busy !== null || duplicateTimes} onClick={() => save()}>
                  Save
                </Button>
              </div>
            </Card>

            <Card className="divide-y divide-line">
              <CardHeader
                title="Ending clip"
                description={`Plays after the punch line, e.g. a laughing reaction. Only the first ${AUTO_SHORTS_ENDING_MAX_SEC} seconds are used; with several, they take turns. Use a clip you made or have permission to use — someone else's video can get the Short claimed.`}
                action={
                  <Button variant="secondary" size="sm" icon={<Upload className="size-3.5" />} loading={busy === "ending"} disabled={busy !== null} onClick={() => fileInput.current?.click()}>
                    Add clip
                  </Button>
                }
              />
              <input ref={fileInput} type="file" accept="video/mp4" className="hidden" onChange={onEnding} />
              {endings.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-muted">No ending clip — Shorts end on the punch line.</p>
              ) : (
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  {endings.map((clip) => (
                    <div key={clip.path} className="overflow-hidden rounded-xl border border-line">
                      <video src={clip.url} className="aspect-[9/16] w-full bg-black object-contain" muted loop playsInline controls />
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="truncate text-[12px] text-muted">{clip.name}</span>
                        <button onClick={() => setDeleting(clip)} className="grid size-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${clip.name}`}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="space-y-3 p-5 text-[13px]">
            <h3 className="text-[14.5px] font-semibold tracking-tight">Status</h3>
            <Row label="State" value={config?.enabled ? "On" : config?.pausedReason ? "Paused by budget" : "Off"} />
            <Row label="Next script" value={config ? `#${(config.nextScript ?? 0) + 1}` : "—"} />
            <Row label="Made today" value={config?.slotDate && config.doneSlots?.length ? config.doneSlots.map(timeLabel).join(", ") : "None yet"} />
            {config?.lastError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-[12.5px] leading-relaxed text-danger">Last try failed: {config.lastError}</p>}
            <p className="text-[12px] leading-relaxed text-muted">The scripts come from a content bank of comedy series (Middle Class Diaries, Office Reality, Amma vs Naan, Friends &amp; Life) and loop round at the end. Made Shorts appear on the Shorts and Queue pages.</p>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this ending clip?"
        description="Shorts already made keep it. New ones won't use it."
        confirmLabel="Delete clip"
        loading={busy === "delete"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
