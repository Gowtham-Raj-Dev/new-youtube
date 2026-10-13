"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Check, ImagePlus, PanelTop, Play, Plus, Trash2, Upload } from "lucide-react";
import { BANNER_POSITIONS, type BannerDoc, type BannerPosition } from "@shortflow/shared";
import { useAuth } from "@/components/providers/auth-provider";
import { useChannelBanners, useChannels } from "@/components/providers/channel-provider";
import type { WithId } from "@/lib/firebase/hooks";
import {
  BANNER_LAYOUTS,
  BANNER_PATTERNS,
  BANNER_PERCENT_MAX,
  BANNER_PERCENT_MAX_PAIRED,
  BANNER_PERCENT_MIN,
  BANNER_PRESETS,
  addBanner,
  bannerDesignToPng,
  bannerHeightForPercent,
  deleteBanner,
  drawBanner,
  loadPicture,
  splitFrameTemplate,
  type BannerDesign,
  type BannerPicture,
  type BannerPreset,
  type BannerStyle,
} from "@/lib/banners";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClasses } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { BannerImage } from "@/components/banner/banner-image";
import { ReactionLibrary, ReactionPicker, ReactionSizing, ReactionStrip, useReactionSetup } from "@/components/short/reaction-picker";
import { cn } from "@/lib/cn";

type Tab = "design" | "upload" | "reaction" | "library";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "design", label: "Design a banner" },
  { id: "upload", label: "Upload an image" },
  { id: "reaction", label: "Reaction video" },
  { id: "library", label: "My banners" },
];

const POSITION_LABELS: Record<BannerPosition, string> = { top: "Top", bottom: "Bottom" };
const LAYOUT_LABELS: Record<BannerStyle["layout"], string> = { title: "Title", button: "Button", comic: "Cartoon" };
const PATTERN_LABELS: Record<BannerStyle["pattern"], string> = { none: "Plain", stripes: "Stripes", dots: "Dots", rays: "Rays", bubbles: "Bubbles" };
const SIDE_LABELS = { left: "Left", right: "Right" } as const;

/** Which banners the designer is making: one of them, or a matching pair. */
type Mode = BannerPosition | "both";
const MODES = [...BANNER_POSITIONS, "both"] as const;
const MODE_LABELS: Record<Mode, string> = { top: "Top", bottom: "Bottom", both: "Both" };
const EDITING_LABELS: Record<BannerPosition, string> = { top: "Top banner", bottom: "Bottom banner" };

/** The banner being designed for one position. */
interface Draft {
  style: BannerStyle;
  /** Height as a share of the Short, in percent. */
  percent: number;
  /** The ready-made design this one was started from. */
  presetName: string | null;
  /** The user's own image on the banner — a logo, a mascot, a character they may use. */
  picture: BannerPicture | null;
}

function firstDraft(position: BannerPosition): Draft {
  const preset = BANNER_PRESETS.find((p) => p.position === position) ?? BANNER_PRESETS[0];
  return { style: preset.style, percent: preset.percent, presetName: preset.name, picture: null };
}

const designOf = (draft: Draft): BannerDesign => ({ ...draft.style, height: bannerHeightForPercent(draft.percent) });

type UploadKind = "frame" | BannerPosition;
const UPLOAD_KINDS: Array<{ kind: UploadKind; label: string; hint: string }> = [
  { kind: "frame", label: "Full template", hint: "One 1080×1920 image with artwork at the top and bottom and an empty middle. We cut it into a top and a bottom banner." },
  { kind: "top", label: "Top only", hint: "A strip for the top of the Short. Best at 1080 pixels wide." },
  { kind: "bottom", label: "Bottom only", hint: "A strip for the bottom of the Short. Best at 1080 pixels wide." },
];

/** One numbered step of the designer or the uploader. */
function Step({ number, title, hint, action, children }: { number: number; title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold tabular-nums text-accent">{number}</span>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold tracking-tight">{title}</h3>
            {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2 text-[13px] transition hover:border-line-strong">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-9 shrink-0 rounded-lg border border-line-strong bg-surface p-0.5" />
      <span className="min-w-0">
        <span className="block truncate font-medium">{label}</span>
        <span className="block font-mono text-[11.5px] uppercase text-faint">{value}</span>
      </span>
    </label>
  );
}

/** A preset drawn at its real proportions. */
function PresetThumbnail({ preset }: { preset: BannerPreset }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawBanner(canvas.current, { ...preset.style, height: bannerHeightForPercent(preset.percent) }, preset.position);
  }, [preset]);
  return <canvas ref={canvas} className="block w-full" />;
}

/** A tiny Short showing which part of it an uploaded image covers. */
function KindDiagram({ kind }: { kind: UploadKind }) {
  return (
    <span className="flex h-14 w-8 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-line-strong bg-white/[0.04]" aria-hidden>
      <span className={cn("h-3.5", kind !== "bottom" && "bg-accent")} />
      <span className={cn("h-3.5", kind !== "top" && "bg-accent")} />
    </span>
  );
}

/**
 * Sets up the reaction video once: which ones are kept, which plays above or
 * below the Short's own video, and how big. Every change is saved as it is made,
 * and comes back chosen wherever Shorts are made.
 */
function ReactionSetupTab() {
  const reaction = useReactionSetup(0, true);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="divide-y divide-line">
        <Step number={1} title="Add your reaction videos" hint="Kept in this browser on this PC — they aren't uploaded anywhere.">
          <ReactionLibrary setup={reaction} />
        </Step>
        <Step number={2} title="Put one at the top or the bottom" hint="Your reaction plays in its own strip next to the main video, on repeat until the Short ends.">
          <ReactionPicker setup={reaction} where="every Short" manage={false} />
        </Step>
        {reaction.file && (
          <Step number={3} title="Size it" hint="The main video gets the rest of the Short; banners still go around both.">
            <ReactionSizing setup={reaction} />
          </Step>
        )}
      </Card>

      <Card className="order-first space-y-4 p-5 lg:sticky lg:top-20 lg:order-none">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[14.5px] font-semibold tracking-tight">Live preview</h3>
          <span className="text-[12px] text-muted">Video gets {reaction.file ? 100 - reaction.percent : 100}%</span>
        </div>
        <div className="relative mx-auto flex aspect-[9/16] w-full max-w-[200px] flex-col overflow-hidden rounded-[1.25rem] border border-line-strong bg-[linear-gradient(160deg,#1d1d23,#0c0c10)] shadow-2xl lg:max-w-[270px]">
          <ReactionStrip setup={reaction} position="top" />
          <div className="grid min-h-0 flex-1 place-items-center">
            <div className="flex flex-col items-center gap-2 text-faint">
              <span className="grid size-10 place-items-center rounded-full border border-line-strong">
                <Play className="size-4 translate-x-px" />
              </span>
              <span className="text-[11.5px] font-medium">Your video</span>
            </div>
          </div>
          <ReactionStrip setup={reaction} position="bottom" />
        </div>
        <p className="text-center text-[12px] leading-relaxed text-muted">
          Saved as you go — nothing to press. It is already chosen when you generate Shorts from a video or add Shorts from your files, and the Short keeps the main video&apos;s sound.
        </p>
      </Card>
    </div>
  );
}

export default function BannersPage() {
  const { user } = useAuth();
  // Banners belong to the channel they were made on.
  const { active } = useChannels();
  const { data: banners, loading, error } = useChannelBanners(user?.uid);
  const [tab, setTab] = useState<Tab>("design");
  // "Add or resize" beside the reaction video rows links straight to that tab.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the link's ?tab=
  useEffect(() => void (new URLSearchParams(window.location.search).get("tab") === "reaction" && setTab("reaction")), []);
  const [mode, setMode] = useState<Mode>("top");
  /** In "both" mode, the banner the steps are changing. */
  const [editing, setEditing] = useState<BannerPosition>("top");
  const designPosition = mode === "both" ? editing : mode;
  const shown: readonly BannerPosition[] = mode === "both" ? BANNER_POSITIONS : [mode];
  const [drafts, setDrafts] = useState<Record<BannerPosition, Draft>>(() => ({ top: firstDraft("top"), bottom: firstDraft("bottom") }));
  const { style, presetName, picture } = drafts[designPosition];
  const update = (patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [designPosition]: { ...all[designPosition], ...patch } }));
  const setStyle = (style: BannerStyle) => update({ style });
  /** In "both" mode, which banners the height slider resizes. */
  const [sizing, setSizing] = useState<Mode>("both");
  const percentMax = mode === "both" ? BANNER_PERCENT_MAX_PAIRED : BANNER_PERCENT_MAX;
  const sized: readonly BannerPosition[] = mode !== "both" ? [mode] : sizing === "both" ? BANNER_POSITIONS : [sizing];
  const sizedPercent = drafts[sized[0]].percent;
  const setPercent = (value: number) => {
    const percent = Math.min(percentMax, Math.max(BANNER_PERCENT_MIN, value || BANNER_PERCENT_MIN));
    setDrafts((all) => ({ ...all, ...Object.fromEntries(sized.map((position) => [position, { ...all[position], percent }])) }));
  };
  const videoPercent = 100 - shown.reduce((sum, position) => sum + drafts[position].percent, 0);

  function chooseMode(next: Mode) {
    setMode(next);
    // A pair leaves the video at least 40%, so each banner is capped lower than a single one.
    if (next === "both") {
      setDrafts((all) => ({
        top: { ...all.top, percent: Math.min(all.top.percent, BANNER_PERCENT_MAX_PAIRED) },
        bottom: { ...all.bottom, percent: Math.min(all.bottom.percent, BANNER_PERCENT_MAX_PAIRED) },
      }));
    }
  }

  function chooseSizing(next: Mode) {
    setSizing(next);
    if (next !== "both") setEditing(next);
  }
  const setPicture = (picture: BannerPicture | null) => update({ picture });
  const pictureInput = useRef<HTMLInputElement>(null);

  const [uploadKind, setUploadKind] = useState<UploadKind>("frame");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<"design" | "upload" | "delete" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleting, setDeleting] = useState<WithId<BannerDoc> | null>(null);
  const canvases = useRef<Record<BannerPosition, HTMLCanvasElement | null>>({ top: null, bottom: null });
  const fileInput = useRef<HTMLInputElement>(null);

  const presets = BANNER_PRESETS.filter((preset) => preset.position === designPosition);

  useEffect(() => {
    for (const position of BANNER_POSITIONS) {
      const canvas = canvases.current[position];
      if (canvas) drawBanner(canvas, designOf(drafts[position]), position, drafts[position].picture);
    }
  }, [drafts, mode, tab]);

  function loadPreset(preset: BannerPreset) {
    update({ style: preset.style, percent: Math.min(preset.percent, percentMax), presetName: preset.name });
  }

  async function onPicture(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const image = await loadPicture(file);
      setPicture({ image, side: picture?.side ?? "left" });
    } catch {
      setNotice({ tone: "error", message: "That file isn't an image we can read. Use a PNG, JPG or WebP." });
    }
  }

  const SAVED_ONE = (position: BannerPosition) => `Saved as a ${position} banner. Choose it when you generate Shorts.`;
  const SAVED_PAIR = "Saved as a top and a bottom banner. Choose both when you generate Shorts — the video plays in the space between them.";
  const SAVE_FAILED = "Couldn't save the banner. Check your connection and try again.";

  /** Runs a save, showing the message it returns, or why it failed. */
  async function run(kind: "design" | "upload", task: (uid: string) => Promise<string>, failure = SAVE_FAILED) {
    if (!user) return;
    setBusy(kind);
    setNotice(null);
    try {
      setNotice({ tone: "success", message: await task(user.uid) });
    } catch (err) {
      // addBanner's own messages are written for the user; Firebase's aren't.
      const ours = err instanceof Error && !("code" in err);
      setNotice({ tone: "error", message: ours ? err.message : failure });
    }
    setBusy(null);
  }

  function saveDesigns() {
    void run("design", async (uid) => {
      for (const position of shown) {
        const draft = drafts[position];
        await addBanner(uid, await bannerDesignToPng(designOf(draft), position, draft.picture), position, draft.style.text || draft.style.sub || "Banner", active?.id);
      }
      return mode === "both" ? SAVED_PAIR : SAVED_ONE(mode);
    });
  }

  function upload(file: File | undefined) {
    if (!file || busy !== null) return;
    const name = file.name.replace(/\.[^.]+$/, "");
    const kind = uploadKind;
    if (kind === "frame") {
      // A full 9:16 template is cut into its top and bottom artwork, saved as a matching pair.
      void run(
        "upload",
        async (uid) => {
          const parts = await splitFrameTemplate(file);
          await addBanner(uid, parts.top, "top", name, active?.id);
          await addBanner(uid, parts.bottom, "bottom", name, active?.id);
          return SAVED_PAIR;
        },
        "Couldn't save the template. Check your connection and try again.",
      );
    } else {
      void run("upload", async (uid) => {
        await addBanner(uid, file, kind, name, active?.id);
        return SAVED_ONE(kind);
      });
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    upload(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files[0]);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy("delete");
    try {
      await deleteBanner(deleting);
    } catch {
      setNotice({ tone: "error", message: "Couldn't delete the banner. Please try again." });
    }
    setBusy(null);
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Banners</h2>
        <p className="mt-1 text-sm text-muted">Strips across the top and bottom of your Shorts. Design one here or upload your own image, then pick it when you generate Shorts from a video. For reaction Shorts, set a second video at the top or bottom.</p>
      </div>

      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-line bg-surface/60 p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition",
              tab === t.id ? "bg-white/[0.08] text-text" : "text-muted hover:text-text",
            )}
          >
            {t.label}
            {t.id === "library" && (
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", tab === t.id ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-faint")}>{banners.length}</span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
          {notice.tone === "success" && tab !== "library" && tab !== "reaction" && (
            <>
              {" "}
              <button onClick={() => setTab("library")} className="font-medium text-accent hover:underline">
                See my banners
              </button>
            </>
          )}
        </Alert>
      )}
      {error && <Alert tone="error">We couldn&apos;t load your banners. Check your connection and refresh the page.</Alert>}

      {tab === "design" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="divide-y divide-line">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold tracking-tight">Which banners do you want?</h3>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">Top, bottom, or both as a matching pair around the video.</p>
              </div>
              <Segmented label="Banners to make" options={MODES} labels={MODE_LABELS} value={mode} onChange={chooseMode} />
            </div>
            {mode === "both" && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-accent/[0.06] px-5 py-3">
                <p className="text-[13px] text-muted">
                  <span className="font-medium text-text">Now editing:</span> the steps below change this banner. You can also tap a banner in the preview.
                </p>
                <Segmented label="Banner being edited" options={BANNER_POSITIONS} labels={EDITING_LABELS} value={editing} onChange={setEditing} />
              </div>
            )}
            <Step number={1} title={`Pick a starting design for the ${designPosition} banner`} hint="Tap a design. You can change everything about it below.">
              <div className="grid max-h-72 grid-cols-2 content-start gap-2.5 overflow-y-auto rounded-xl border border-line bg-surface/60 p-2.5 [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin] sm:grid-cols-3 xl:grid-cols-4">
                {presets.map((preset) => {
                  const selected = preset.name === presetName;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => loadPreset(preset)}
                      className={cn(
                        "relative block w-full overflow-hidden rounded-lg border text-left transition",
                        selected ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line hover:border-accent/60",
                      )}
                    >
                      <PresetThumbnail preset={preset} />
                      <span className={cn("block truncate px-2 py-1 text-[11.5px] font-medium", selected ? "text-text" : "text-muted")}>{preset.name}</span>
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-white shadow-md">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Step>

            <Step number={2} title="Write your words">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Main text" counter={`${style.text.length} / 40`}>
                  <input value={style.text} maxLength={40} onChange={(e) => setStyle({ ...style, text: e.target.value })} className={cn(inputClasses, "h-11")} />
                </Field>
                <Field label="Small text" counter={`${style.sub.length} / 50`}>
                  <input value={style.sub} maxLength={50} placeholder="Optional" onChange={(e) => setStyle({ ...style, sub: e.target.value })} className={cn(inputClasses, "h-11")} />
                </Field>
              </div>
            </Step>

            <Step number={3} title="Choose the look">
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <p className="mb-1.5 text-[13px] font-medium">Text style</p>
                  <Segmented label="Text style" options={BANNER_LAYOUTS} labels={LAYOUT_LABELS} value={style.layout} onChange={(layout) => setStyle({ ...style, layout })} />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-medium">Background pattern</p>
                  <Segmented label="Background pattern" options={BANNER_PATTERNS} labels={PATTERN_LABELS} value={style.pattern} onChange={(pattern) => setStyle({ ...style, pattern })} />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-medium">Colours</p>
                <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                  <ColorField label="Background" value={style.background} onChange={(background) => setStyle({ ...style, background })} />
                  <ColorField label="Fades to" value={style.background2} onChange={(background2) => setStyle({ ...style, background2 })} />
                  <ColorField label="Text" value={style.color} onChange={(color) => setStyle({ ...style, color })} />
                  <ColorField label="Accent" value={style.accent} onChange={(accent) => setStyle({ ...style, accent })} />
                </div>
              </div>
            </Step>

            <Step number={4} title="Add your picture" hint="Optional. A logo, mascot or character image you're allowed to use — a PNG with a transparent background looks best.">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" icon={<ImagePlus className="size-3.5" />} onClick={() => pictureInput.current?.click()}>
                  {picture ? "Change picture" : "Add a picture"}
                </Button>
                <input ref={pictureInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPicture} />
                {picture && (
                  <>
                    <Segmented label="Picture side" options={["left", "right"] as const} labels={SIDE_LABELS} value={picture.side} onChange={(side) => setPicture({ ...picture, side })} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPicture(null)}>
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </Step>

            <Step
              number={5}
              title="Set the height"
              hint={
                mode === "both"
                  ? `How much of the Short each banner covers. Each can be up to ${BANNER_PERCENT_MAX_PAIRED}%, so the video always keeps at least ${100 - 2 * BANNER_PERCENT_MAX_PAIRED}%.`
                  : "How much of the Short the banner covers. The video gets the rest."
              }
              action={mode === "both" && <Segmented label="Banners to resize" options={MODES} labels={MODE_LABELS} value={sizing} onChange={chooseSizing} />}
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={BANNER_PERCENT_MIN}
                  max={percentMax}
                  step={1}
                  value={sizedPercent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  aria-label="Banner height in percent of the Short"
                  className="h-2 flex-1 accent-[var(--accent)]"
                />
                <input
                  type="number"
                  min={BANNER_PERCENT_MIN}
                  max={percentMax}
                  value={sizedPercent}
                  onChange={(e) => setPercent(e.target.valueAsNumber)}
                  aria-label="Banner height in percent"
                  className={cn(inputClasses, "h-9 !w-20 px-2.5")}
                />
                <span className="text-[13px] text-muted">%</span>
              </div>
              <div className="flex justify-between text-[11.5px] text-faint">
                <span>Slim · {BANNER_PERCENT_MIN}%</span>
                <span>Tall · {percentMax}%</span>
              </div>
              {mode === "both" && (
                <p className="text-[12.5px] tabular-nums text-muted">
                  Top <span className="font-medium text-text">{drafts.top.percent}%</span> · Video <span className="font-medium text-text">{videoPercent}%</span> · Bottom{" "}
                  <span className="font-medium text-text">{drafts.bottom.percent}%</span>
                </p>
              )}
            </Step>
          </Card>

          {/* The banner in place on a Short, so its size and position are obvious. First on phones, pinned beside the steps on desktop. */}
          <Card className="order-first space-y-4 p-5 lg:sticky lg:top-20 lg:order-none">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[14.5px] font-semibold tracking-tight">Live preview</h3>
              <span className="text-[12px] text-muted">Video gets {videoPercent}%</span>
            </div>
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[200px] overflow-hidden rounded-[1.25rem] border border-line-strong bg-[linear-gradient(160deg,#1d1d23,#0c0c10)] shadow-2xl lg:max-w-[270px]">
              <div className="absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-2 text-faint">
                  <span className="grid size-10 place-items-center rounded-full border border-line-strong">
                    <Play className="size-4 translate-x-px" />
                  </span>
                  <span className="text-[11.5px] font-medium">Your video</span>
                </div>
              </div>
              {shown.map((position) => (
                <button
                  key={position}
                  type="button"
                  disabled={mode !== "both"}
                  onClick={() => setEditing(position)}
                  aria-label={`Edit the ${position} banner`}
                  aria-pressed={mode === "both" ? position === editing : undefined}
                  className={cn(
                    "absolute inset-x-0 block disabled:cursor-default",
                    position === "top" ? "top-0" : "bottom-0",
                  )}
                >
                  <canvas
                    ref={(el) => {
                      canvases.current[position] = el;
                    }}
                    className="block w-full"
                  />
                  {mode === "both" && position === editing && <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--accent)]" />}
                </button>
              ))}
            </div>
            <Button className="w-full" loading={busy === "design"} disabled={busy !== null} onClick={saveDesigns}>
              Save {mode === "both" ? "both banners" : `${mode} banner`}
            </Button>
            <p className="text-center text-[12px] leading-relaxed text-muted">Saved banners appear under My banners and when you generate Shorts.</p>
          </Card>
        </div>
      )}

      {tab === "upload" && (
        <Card className="max-w-3xl divide-y divide-line">
          <Step number={1} title="What kind of image is it?" hint="Made in Canva, Photoshop or anywhere else.">
            <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Kind of image">
              {UPLOAD_KINDS.map((option) => {
                const selected = uploadKind === option.kind;
                return (
                  <button
                    key={option.kind}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setUploadKind(option.kind)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                      selected ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <KindDiagram kind={option.kind} />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium">{option.label}</span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Step>

          <Step number={2} title="Choose the image" hint="It's saved to My banners straight away.">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              disabled={busy !== null}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition hover:border-accent/60 hover:bg-accent-soft disabled:opacity-60",
                dragging ? "border-accent bg-accent-soft" : "border-line-strong",
              )}
            >
              <span className="grid size-11 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-accent">
                <Upload className="size-5" />
              </span>
              <span className="text-[13.5px] font-medium">{busy === "upload" ? "Uploading…" : dragging ? "Drop it here" : "Drag an image here, or click to choose"}</span>
              <span className="text-[12.5px] text-muted">PNG, JPG or WebP · 5 MB at most</span>
            </button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
          </Step>
        </Card>
      )}

      {tab === "reaction" && <ReactionSetupTab />}

      {tab === "library" &&
        (!loading && banners.length === 0 ? (
          <Card>
            <EmptyState
              icon={<PanelTop className="size-5" />}
              title="No banners yet"
              description="Design one from a ready-made look, or upload an image you already have."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button icon={<Plus className="size-4" />} onClick={() => setTab("design")}>
                    Design a banner
                  </Button>
                  <Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setTab("upload")}>
                    Upload an image
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          BANNER_POSITIONS.map((position) => {
            const items = banners.filter((b) => b.position === position);
            return (
              <section key={position} className="space-y-3">
                <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
                  <PanelTop className={cn("size-4 text-accent", position === "bottom" && "rotate-180")} />
                  {POSITION_LABELS[position]} banners <span className="font-normal text-faint">· {items.length}</span>
                </h3>
                {items.length === 0 ? (
                  <Card className="px-5 py-6 text-center text-[13px] text-muted">
                    {loading ? (
                      "Loading…"
                    ) : (
                      <>
                        No {position} banners yet.{" "}
                        <button
                          onClick={() => {
                            chooseMode(position);
                            setTab("design");
                          }}
                          className="font-medium text-accent hover:underline"
                        >
                          Design one
                        </button>
                      </>
                    )}
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <BannerImage banner={item} />
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <p className="min-w-0 truncate text-[13px] font-medium" title={item.name}>
                            {item.name}
                          </p>
                          <button onClick={() => setDeleting(item)} className="grid size-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${item.name}`}>
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        ))}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="Shorts already made with this banner keep it. It just won't be offered for new ones."
        confirmLabel="Delete banner"
        loading={busy === "delete"}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
