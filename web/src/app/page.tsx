import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  ChartColumn,
  Check,
  ChevronDown,
  CloudUpload,
  Crop,
  KeyRound,
  Lock,
  MonitorSmartphone,
  PanelTop,
  Scissors,
  ShieldCheck,
  Trash2,
  Tv,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@shortflow/shared";
import { YouTubeIcon } from "@/components/ui/brand-icons";
import { FRAMES } from "@/components/marketing/frames";
import { ShowcaseFrame } from "@/components/marketing/showcase-frame";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StartCta } from "@/components/marketing/start-cta";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — Turn long videos into scheduled YouTube Shorts` },
  description: `${BRAND.name} cuts your long videos into vertical Shorts, adds your banners, and publishes them to YouTube on a schedule — even while your computer is off.`,
};

const PROOF = ["Nothing to install", "Free while in beta", "Publishes with your PC off"];

const STEPS: Array<{ icon: LucideIcon | "youtube"; title: string; body: string }> = [
  { icon: "youtube", title: "Connect your channel", body: "Sign in with Google and link the YouTube channel your Shorts should go to. One click, and you can disconnect any time." },
  { icon: Upload, title: "Upload a long video", body: "Drop in a podcast, stream, vlog or film — MP4, MOV, MKV or WebM, up to 10 GB." },
  { icon: Scissors, title: "Cut it into Shorts", body: "Pick a length from 5 seconds to 3 minutes. Every part becomes a 1080×1920 Short with your framing and banners." },
  { icon: CalendarClock, title: "Schedule & relax", body: "Set your times and days once. Each Short takes the next free slot and goes live on its own." },
];

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: Scissors, title: "Automatic cutting", body: "A one-hour video becomes sixty one-minute Shorts in a single step, numbered and titled for you." },
  { icon: Crop, title: "Vertical framing", body: "Fill, Blur or Bars — turn wide 16:9 footage into a clean 9:16 Short without awkward crops." },
  { icon: PanelTop, title: "Banners & reactions", body: "Design a top and bottom banner once, add a reaction video strip, and reuse them on every Short." },
  { icon: CalendarClock, title: "Smart schedule", body: "First upload time, the gap between Shorts, the days and a daily cap. The queue fills itself." },
  { icon: CloudUpload, title: "Cloud publishing", body: "Uploads run on our servers, so your laptop can sleep. Titles stay editable until the moment it posts." },
  { icon: ShieldCheck, title: "Copyright check first", body: "Optionally post as Unlisted, wait until YouTube clears it, then switch to Public automatically." },
  { icon: Tv, title: "Several channels", body: "Run more than one channel from one account and switch between them in a click." },
  { icon: ChartColumn, title: "Activity & analytics", body: "See what went live, what is queued next and anything YouTube flagged — all in one place." },
];

const CAN = ["Upload the Shorts you schedule to your channel", "Read your channel's name, picture and subscriber count", "Switch a Short it uploaded from Unlisted to Public after its copyright check"];
const CANNOT = ["Delete your videos or edit ones it didn't upload", "Read your comments, messages or Google password", "Post anything you didn't queue yourself"];

const TRUST: Array<{ icon: LucideIcon; title: string; body: string }> = [
  { icon: KeyRound, title: "Encrypted access", body: "Your YouTube access key is encrypted (AES-256) and never reaches the browser." },
  { icon: Lock, title: "Your files stay private", body: "Only you can see your videos. Shorts files are deleted from our storage once they're on YouTube." },
  { icon: Trash2, title: "Leave any time", body: "Disconnect a channel or delete your whole account from Settings — everything we hold goes with it." },
];

const FAQ: Array<{ q: string; a: ReactNode }> = [
  {
    q: `Is ${BRAND.name} free?`,
    a: `Yes, ${BRAND.name} is free while it's in beta. Because every account shares one YouTube upload allowance, each account can publish a limited number of Shorts per day — anything over the limit simply waits for the next day.`,
  },
  {
    q: "Do I need to install anything?",
    a: "No. Shorts are cut right in your browser — Chrome or Edge on a computer works best. Windows users can optionally run a free helper app that cuts long videos faster.",
  },
  {
    q: "Does my computer need to stay on?",
    a: "Only while a video is uploading and being cut into Shorts. Once your Shorts are queued, publishing happens on our servers — you can close the tab.",
  },
  {
    q: "Will it post anything without asking me?",
    a: "Never. A Short only goes to YouTube after you submit it to the queue, with the title, description and visibility you chose. You can edit or pull it out of the queue until it posts.",
  },
  {
    q: "Can I use videos I don't own?",
    a: "Only upload videos you made or have permission to use. YouTube's copyright rules apply to every Short, and channels that break them can get strikes.",
  },
  {
    q: "How do I remove access to my YouTube channel?",
    a: (
      <>
        Disconnect it on the YouTube page in the app, or remove {BRAND.name} from your Google account at{" "}
        <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer" className="text-accent hover:underline">
          myaccount.google.com/connections
        </a>
        . Deleting your account in Settings removes everything we store.
      </>
    ),
  },
];

const TIMELINE_TILES = 24;
const SLOTS = [
  { part: "Part 1", when: "Mon · 6:00 PM", state: "Published" },
  { part: "Part 2", when: "Mon · 10:00 PM", state: "Published" },
  { part: "Part 3", when: "Tue · 6:00 PM", state: "Next up" },
  { part: "Part 4", when: "Tue · 10:00 PM", state: "Queued" },
];

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: ReactNode; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[38px]">{title}</h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-muted">{body}</p>}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_60%_at_75%_10%,#24164f_0%,transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
        <div className="animate-enter">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12.5px] text-white/75">
            <YouTubeIcon className="size-3.5" />
            Built for YouTube Shorts creators
          </span>
          <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
            One long video.
            <br />
            <span className="bg-gradient-to-r from-[#c9bbff] via-accent to-[#ff4d8d] bg-clip-text text-transparent">A month of Shorts.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-muted sm:text-[17px]">
            {BRAND.name} cuts your videos into vertical Shorts, adds your banners, and publishes them to YouTube on your schedule — so your channel posts every day
            while you get on with making the next video.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <StartCta />
            <Link href="/#how" className="flex h-12 items-center rounded-xl px-4 text-[15px] font-medium text-muted transition hover:bg-white/[0.04] hover:text-text">
              See how it works
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {PROOF.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[13px] text-muted">
                <Check className="size-3.5 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden h-[460px] items-center justify-center gap-6 sm:flex">
          <div aria-hidden className="absolute size-[380px] rounded-full bg-accent/25 blur-[120px]" />
          {FRAMES.map((frame, i) => (
            <ShowcaseFrame key={frame.clip} frame={frame} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** A long timeline sliced into parts, each landing in a publishing slot. */
function PipelineBand() {
  return (
    <section className="border-y border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-baseline justify-between gap-4 text-[12.5px] text-muted">
          <span className="font-medium text-text">podcast-episode-42.mp4</span>
          <span className="font-mono">48:12</span>
        </div>
        <div aria-hidden className="relative mt-3 h-16 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          <div className="flex h-full gap-1 p-1.5">
            {Array.from({ length: TIMELINE_TILES }).map((_, i) => (
              <span
                key={i}
                className="h-full flex-1 rounded-[4px] bg-[url(/samples/filmstrip.jpg)] opacity-60"
                style={{ backgroundSize: `${TIMELINE_TILES * 100}% 100%`, backgroundPosition: `${(i / (TIMELINE_TILES - 1)) * 100}% 0` }}
              />
            ))}
          </div>
          {[25, 50, 75].map((left) => (
            <span key={left} className="absolute inset-y-0 w-0.5 bg-accent shadow-[0_0_14px_var(--accent)]" style={{ left: `${left}%` }} />
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SLOTS.map((slot) => (
            <div key={slot.part} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/70 px-4 py-3">
              <div>
                <p className="text-[13.5px] font-medium">{slot.part}</p>
                <p className="mt-0.5 font-mono text-[11.5px] text-faint">{slot.when}</p>
              </div>
              <span
                className={
                  slot.state === "Published"
                    ? "rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success"
                    : slot.state === "Next up"
                      ? "rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent"
                      : "rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-muted"
                }
              >
                {slot.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 px-4 py-24 sm:px-6">
      <SectionTitle eyebrow="How it works" title="From upload to uploaded, in four steps" body="Set it up once. After that, a new long video is all your channel needs." />
      <ol className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative rounded-2xl border border-line bg-surface/80 p-6">
            <span className="absolute right-5 top-5 font-mono text-[12px] text-faint">0{i + 1}</span>
            <span className="grid size-11 place-items-center rounded-xl border border-line-strong bg-surface-2">
              {Icon === "youtube" ? <YouTubeIcon className="size-5" /> : <Icon className="size-5 text-accent" />}
            </span>
            <h3 className="mt-5 text-[16px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-line px-4 py-24 sm:px-6">
      <SectionTitle eyebrow="Features" title="Everything a Shorts channel needs" body="Built for creators who would rather make videos than babysit an upload page." />
      <div className="mx-auto mt-14 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="group bg-bg p-6 transition-colors hover:bg-surface">
            <Icon className="size-5 text-accent transition-transform group-hover:scale-110" strokeWidth={1.9} />
            <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 flex max-w-6xl items-center justify-center gap-2 text-[13px] text-muted">
        <MonitorSmartphone className="size-4 text-faint" />
        Works on any computer in Chrome or Edge, and you can check your queue from your phone.
      </p>
    </section>
  );
}

function Trust() {
  return (
    <section id="trust" className="scroll-mt-20 border-t border-line px-4 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Privacy & security</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[38px]">Your channel stays yours</h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
            {BRAND.name} connects through Google&apos;s own sign-in and asks only for what publishing needs. We never sell your data, and you can take it all back at any
            time.
          </p>
          <div className="mt-8 space-y-5">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface-2">
                  <Icon className="size-[18px] text-accent" />
                </span>
                <div>
                  <p className="text-[14.5px] font-medium">{title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/privacy" className="mt-8 inline-block text-[13.5px] font-medium text-accent hover:underline">
            Read the Privacy Policy →
          </Link>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -right-10 -top-10 size-64 rounded-full bg-[#ff0033]/10 blur-3xl" />
          <div className="relative space-y-4 rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur-xl sm:p-8">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <ShieldCheck className="size-4 text-success" />
              What {BRAND.name} can do
            </p>
            <ul className="space-y-3">
              {CAN.map((item) => (
                <li key={item} className="flex gap-2.5 text-[13.5px] text-text/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="h-px bg-line" />
            <p className="text-[14px] font-semibold text-muted">What it can&apos;t</p>
            <ul className="space-y-3">
              {CANNOT.map((item) => (
                <li key={item} className="flex gap-2.5 text-[13.5px] text-muted">
                  <X className="mt-0.5 size-4 shrink-0 text-faint" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line px-4 py-24 sm:px-6">
      <SectionTitle eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto mt-12 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-surface/60">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group px-5 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <ChevronDown className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
            </summary>
            <p className="-mt-1 pb-5 text-[14px] leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-line-strong bg-[radial-gradient(100%_120%_at_50%_0%,#2a1a63_0%,#120f1f_60%,#0d0d12_100%)] px-6 py-16 text-center sm:px-12">
        <div aria-hidden className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <h2 className="mx-auto max-w-xl text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-[40px]">Your next month of Shorts is already in your videos</h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">Sign in with Google, connect your channel and queue your first Shorts in a few minutes.</p>
        <StartCta className="mt-8" />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PipelineBand />
        <HowItWorks />
        <Features />
        <Trust />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
