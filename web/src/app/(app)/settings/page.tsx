"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { ArrowRight, CalendarClock, LogOut } from "lucide-react";
import { DEFAULT_SETTINGS, OUTPUT_QUALITIES, PRIVACY_STATUSES, shortTitle, type OutputQuality, type PrivacyStatus, type UserDoc } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useSettings, useUserDoc } from "@/lib/firebase/hooks";
import { saveProfile, signOut } from "@/lib/firebase/auth";
import { saveSettings, type EditableSettings } from "@/lib/schedule";
import { tagChars, TAG_CHARS_MAX } from "@/lib/shorts";
import { timezoneOptions } from "@/lib/time";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, inputClasses } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { TagInput } from "@/components/short/tag-input";
import { YourDataCard } from "@/components/settings/your-data-card";
import { cn } from "@/lib/cn";

const FRAMINGS = ["center", "blur", "fit"] as const;
type Framing = (typeof FRAMINGS)[number];
const FRAMING_LABELS: Record<Framing, string> = { center: "Fill", blur: "Blur", fit: "Bars" };
const FRAMING_HINTS: Record<Framing, string> = {
  center: "Fills the space between the banners; the sides are cropped.",
  blur: "Whole picture on a blurred background.",
  fit: "Whole picture on black.",
};

const QUALITY_LABELS: Record<OutputQuality, string> = { standard: "Standard", high: "High", max: "Maximum" };
const QUALITY_HINTS: Record<OutputQuality, string> = {
  standard: "Smallest files and the fastest to cut.",
  high: "A good balance of sharpness and file size.",
  max: "Sharpest picture; the biggest files and the slowest to cut.",
};

const PRIVACY_LABELS: Record<PrivacyStatus, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };

/** YouTube's video categories that are open to uploads. */
const CATEGORIES: Array<[id: string, label: string]> = [
  ["1", "Film & Animation"],
  ["2", "Autos & Vehicles"],
  ["10", "Music"],
  ["15", "Pets & Animals"],
  ["17", "Sports"],
  ["19", "Travel & Events"],
  ["20", "Gaming"],
  ["22", "People & Blogs"],
  ["23", "Comedy"],
  ["24", "Entertainment"],
  ["25", "News & Politics"],
  ["26", "Howto & Style"],
  ["27", "Education"],
  ["28", "Science & Technology"],
];

const TITLE_PLACEHOLDERS = [
  { token: "{videoTitle}", label: "Video title" },
  { token: "{part}", label: "Part number" },
  { token: "{total}", label: "Number of parts" },
];

/** Everything this page edits, flattened. */
interface Form {
  name: string;
  timezone: string;
  framing: Framing;
  quality: OutputQuality;
  titleTemplate: string;
  description: string;
  tags: string[];
  privacy: PrivacyStatus;
  categoryId: string;
  notifyUploads: boolean;
  notifyFailures: boolean;
}

function formFrom(name: string, settings: EditableSettings): Form {
  const { processing, publishing, notifications } = settings;
  return {
    name,
    timezone: publishing.timezone,
    // "smart" framing isn't offered yet; the studio treats it as Fill.
    framing: processing.cropMode === "smart" ? "center" : processing.cropMode,
    quality: processing.outputQuality,
    titleTemplate: publishing.titleTemplate,
    description: publishing.defaultDescription,
    tags: publishing.defaultTags,
    privacy: publishing.defaultPrivacy,
    categoryId: publishing.categoryId,
    notifyUploads: notifications.uploads,
    notifyFailures: notifications.failures,
  };
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full border transition", checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3")}
      >
        <span className={cn("absolute top-0.5 size-[18px] rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

/** A label, a control and the sentence explaining the current choice. */
function Choice({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium">{label}</p>
      {children}
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

function SettingsForm({ user, profile, settings }: { user: User; profile: UserDoc | null; settings: EditableSettings }) {
  const savedName = profile?.displayName ?? user.displayName ?? "";
  const saved = useMemo(() => formFrom(savedName, settings), [savedName, settings]);
  const [form, setForm] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const zones = useMemo(() => timezoneOptions(saved.timezone), [saved.timezone]);

  const set = (patch: Partial<Form>) => (setForm((current) => ({ ...current, ...patch })), setNotice(null));
  const name = form.name.trim();
  const titleTemplate = form.titleTemplate.trim();
  const tagsTooLong = tagChars(form.tags) > TAG_CHARS_MAX;
  const valid = name.length > 0 && titleTemplate.length > 0 && !tagsTooLong;
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!valid || !dirty) return;
    setBusy(true);
    setNotice(null);
    try {
      await saveSettings(user.uid, {
        ...settings,
        processing: { ...settings.processing, cropMode: form.framing, outputQuality: form.quality },
        publishing: {
          ...settings.publishing,
          timezone: form.timezone,
          titleTemplate,
          defaultDescription: form.description,
          defaultTags: form.tags,
          defaultPrivacy: form.privacy,
          categoryId: form.categoryId,
        },
        notifications: { ...settings.notifications, uploads: form.notifyUploads, failures: form.notifyFailures },
      });
      // One timezone for the whole app: dates on screen follow the profile, the queue follows the settings.
      if (profile && (name !== savedName || form.timezone !== profile.timezone)) await saveProfile(user, name, form.timezone);
      setForm((current) => ({ ...current, name, titleTemplate }));
      setNotice({ tone: "success", message: "Settings saved." });
    } catch {
      setNotice({ tone: "error", message: "Couldn't save your settings. Check your connection and try again." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Profile" description="Your name and the timezone used for dates and for the publishing schedule." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Name" counter={`${form.name.length} / 80`} error={name.length === 0}>
            <input value={form.name} maxLength={80} required onChange={(e) => set({ name: e.target.value })} className={cn(inputClasses, "h-11")} />
          </Field>
          <Field label="Email" hint="The account you signed in with. It can't be changed here.">
            <input value={user.email ?? ""} readOnly disabled className={cn(inputClasses, "h-11")} />
          </Field>
          <Field label="Timezone" className="sm:col-span-2">
            <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className={cn(inputClasses, "h-11")}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Cutting Shorts" description="What the studio starts with when you open a video. You can still change the framing for each video." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Choice label="Framing" hint={FRAMING_HINTS[form.framing]}>
            <Segmented label="Framing" options={FRAMINGS} labels={FRAMING_LABELS} value={form.framing} onChange={(framing) => set({ framing })} />
          </Choice>
          <Choice label="Video quality" hint={QUALITY_HINTS[form.quality]}>
            <Segmented label="Video quality" options={OUTPUT_QUALITIES} labels={QUALITY_LABELS} value={form.quality} onChange={(quality) => set({ quality })} />
          </Choice>
        </div>
      </Card>

      <Card>
        <CardHeader title="Details for new Shorts" description="Every Short you generate starts with these. Shorts you already made keep theirs, and you can edit each one on the Shorts page." />
        <div className="space-y-5 p-5">
          <div>
            <Field label="Title" counter={`${form.titleTemplate.length} / 200`} error={titleTemplate.length === 0}>
              <input value={form.titleTemplate} maxLength={200} required onChange={(e) => set({ titleTemplate: e.target.value })} className={cn(inputClasses, "h-11")} />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-muted">Add:</span>
              {TITLE_PLACEHOLDERS.map(({ token, label }) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => set({ titleTemplate: `${form.titleTemplate}${form.titleTemplate && !form.titleTemplate.endsWith(" ") ? " " : ""}${token}`.slice(0, 200) })}
                  className="rounded-lg border border-line px-2 py-1 text-[12px] font-medium text-muted transition hover:border-accent/50 hover:text-text"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              {titleTemplate ? (
                <>
                  A video called “My holiday vlog” cut into 12 gives: <span className="text-text">{shortTitle(titleTemplate, "My holiday vlog", 1, 12)}</span>
                </>
              ) : (
                <span className="text-danger">Write a title.</span>
              )}
            </p>
          </div>

          <Field label="Description" counter={`${form.description.length} / 5000`}>
            <textarea value={form.description} maxLength={5000} rows={4} onChange={(e) => set({ description: e.target.value })} className={cn(inputClasses, "resize-y py-2.5 leading-relaxed")} />
          </Field>

          <div>
            <p className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium">Keywords</span>
              <span className={cn("text-[11.5px] tabular-nums", tagsTooLong ? "text-danger" : "text-faint")}>
                {tagChars(form.tags)} / {TAG_CHARS_MAX}
              </span>
            </p>
            <TagInput tags={form.tags} onChange={(tags) => set({ tags })} />
            {tagsTooLong && <p className="mt-1.5 text-[12px] text-danger">YouTube allows {TAG_CHARS_MAX} characters of keywords. Remove a few.</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[13px] font-medium">Who can watch</p>
              <Segmented label="Who can watch" options={PRIVACY_STATUSES} labels={PRIVACY_LABELS} value={form.privacy} onChange={(privacy) => set({ privacy })} />
            </div>
            <Field label="YouTube category">
              <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={cn(inputClasses, "h-11")}>
                {!CATEGORIES.some(([id]) => id === form.categoryId) && <option value={form.categoryId}>Category {form.categoryId}</option>}
                {CATEGORIES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notifications" description="What shows up under the bell at the top of the page." />
        <div className="divide-y divide-line p-5">
          <Toggle label="Shorts published" hint="Tell me when a Short goes live on YouTube." checked={form.notifyUploads} onChange={(notifyUploads) => set({ notifyUploads })} />
          <Toggle label="Problems" hint="Tell me when an upload fails, or YouTube blocks or rejects a Short." checked={form.notifyFailures} onChange={(notifyFailures) => set({ notifyFailures })} />
        </div>
      </Card>

      <Card>
        <CardHeader title="More" />
        <div className="divide-y divide-line px-5 pb-2 pt-3">
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
              <CalendarClock className="size-4 shrink-0 text-accent" />
              <span className="min-w-0">Upload times, days and the daily limit</span>
            </p>
            <ButtonLink href="/schedule" variant="secondary" size="sm">
              Schedule
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="flex min-w-0 items-center gap-2.5 text-[13.5px]">
              <YouTubeIcon className="size-4 shrink-0" />
              <span className="min-w-0">{profile?.youtubeConnected ? "Your connected YouTube channel" : "Connect a YouTube channel"}</span>
            </p>
            <ButtonLink href="/youtube" variant="secondary" size="sm">
              YouTube
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <p className="min-w-0 truncate text-[13.5px] text-muted">Signed in as {user.email ?? savedName}</p>
            <Button type="button" variant="ghost" size="sm" icon={<LogOut className="size-3.5" />} onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      {/* Stays in view while there is something to save, above the phone's bottom bar. */}
      {(dirty || notice) && (
        <div className="sticky bottom-20 z-10 lg:bottom-4">
          {dirty ? (
            <div className="flex animate-enter flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-surface-2/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <p className="text-[13.5px]">{notice?.tone === "error" ? <span className="text-danger">{notice.message}</span> : valid ? "You have unsaved changes." : <span className="text-danger">Fix the fields marked in red to save.</span>}</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" disabled={busy} onClick={() => (setForm(saved), setNotice(null))}>
                  Discard
                </Button>
                <Button type="submit" loading={busy} disabled={!valid}>
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            notice && (
              <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
                {notice.message}
              </Alert>
            )
          )}
        </div>
      )}
    </form>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, loading: profileLoading } = useUserDoc(user?.uid);
  const { data: settings, loading, error } = useSettings(user?.uid);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-muted">Your profile, and what new Shorts start with.</p>
      </div>

      {error && <Alert tone="error">We couldn&apos;t load your settings. Check your connection and refresh the page.</Alert>}

      {loading || profileLoading || !user ? (
        <Card className="max-w-3xl space-y-4 p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : (
        !error && <SettingsForm user={user} profile={profile} settings={settings ?? DEFAULT_SETTINGS} />
      )}

      <YourDataCard />
    </div>
  );
}
