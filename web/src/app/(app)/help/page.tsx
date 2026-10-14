import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronDown, Clapperboard, Film, Layers, PanelTop, type LucideIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { YouTubeIcon } from "@/components/ui/brand-icons";

const STEPS: Array<{ href: string; icon: LucideIcon | "youtube"; title: string; body: string }> = [
  { href: "/youtube", icon: "youtube", title: "Connect YouTube", body: "Link the channel your Shorts should go to. Tick every permission on Google's screen." },
  { href: "/videos", icon: Film, title: "Upload a video", body: "Drop in a long video: MP4, MOV, MKV or WebM, up to 10 GB." },
  { href: "/banners", icon: PanelTop, title: "Make banners (optional)", body: "Design a strip for the top, the bottom, or both, or upload your own image." },
  { href: "/videos", icon: Clapperboard, title: "Generate Shorts", body: "Click the video, choose the length, framing and banners, then generate. Shorts are cut in your browser, or faster with the free Windows helper." },
  { href: "/schedule", icon: CalendarClock, title: "Set your schedule", body: "Pick the first upload time of the day, the gap between Shorts, the days and the daily limit." },
  { href: "/shorts", icon: Layers, title: "Queue your Shorts", body: "Tick Shorts and submit them to the queue. Each one takes the next free slot and uploads by itself." },
];

const TOPICS: Array<{ title: string; questions: Array<{ q: string; a: ReactNode }> }> = [
  {
    title: "Cutting Shorts",
    questions: [
      {
        q: "Do I need to install the PC helper?",
        a: (
          <>
            No. Without it, Shorts are cut right here in your browser — use Chrome or Edge and keep the tab open while it works. On Windows the free helper is
            faster for long videos: download it from the note on the Videos page, unzip it, open <Code>ShortFlowHelper.exe</Code> and leave its window open. If your
            browser asks whether this site may reach apps on your device, choose Allow.
          </>
        ),
      },
      {
        q: "How long can a Short be?",
        a: "Between 5 seconds and 3 minutes. The video is cut into parts of the length you choose; a leftover of under 5 seconds at the end is dropped.",
      },
      {
        q: "What do Fill, Blur and Bars mean?",
        a: "Fill zooms the picture to fill the space and crops the sides. Blur shows the whole picture on a blurred copy of itself. Bars shows the whole picture on black. Set the one you use most in Settings.",
      },
      {
        q: "Can I cut the same video again?",
        a: "Yes. Generating again adds a new set of Shorts next to the ones you already have, as long as the original video hasn't been deleted.",
      },
    ],
  },
  {
    title: "Banners",
    questions: [
      {
        q: "How do I use a top and a bottom banner together?",
        a: "On the Banners page choose Both, design the two and save them in one go. Then pick one top and one bottom banner when you generate Shorts. The video plays in the space between them.",
      },
      {
        q: "What image can I upload as a banner?",
        a: "A PNG, JPG or WebP of up to 5 MB, best at 1080 pixels wide. A full 1080×1920 template with an empty middle is cut into a top and a bottom banner for you.",
      },
      {
        q: "I deleted a banner. What happens to Shorts that use it?",
        a: "Nothing. The banner is part of the finished video, so those Shorts keep it. It just isn't offered for new ones.",
      },
    ],
  },
  {
    title: "Scheduling and uploading",
    questions: [
      {
        q: "Does my PC need to stay on for uploads?",
        a: "No. Your PC is only needed to cut Shorts. Queued Shorts are uploaded to YouTube from the cloud at their scheduled time.",
      },
      {
        q: "Why didn't my Short go out exactly on time?",
        a: "The queue is checked every 5 minutes, so a Short can go out a few minutes after its slot.",
      },
      {
        q: "What does “Waiting” mean in the queue?",
        a: "A daily limit was reached — your channel's own YouTube limit, the number of Shorts each ShortFlow account may publish per day, or ShortFlow's shared YouTube allowance. The Short stays in the queue and uploads by itself once the limit resets, at midnight Pacific Time (around 1 PM in India).",
      },
      {
        q: "I changed my schedule. Did the queue move?",
        a: "No. Shorts already in the queue keep their times. The new schedule is used for Shorts you queue from now on. To move one, remove it from the queue and submit it again.",
      },
    ],
  },
  {
    title: "Problems on YouTube",
    questions: [
      {
        q: "A Short says “Failed”. How do I fix it?",
        a: "Open the Queue or the Shorts page to read the reason. An upload is tried up to 3 times before it is marked failed. Once the cause is fixed, submit the Short to the queue again.",
      },
      {
        q: "What is a “Copyright block”?",
        a: "The Short uploaded, but YouTube is hiding it in some or all countries, usually because of a copyright claim on the video or its music. Open it in YouTube Studio to see the claim.",
      },
      {
        q: "My channel shows as expired or disconnected.",
        a: "Google stopped accepting the saved permission, for example after a password change. Open the YouTube page and connect the channel again. Queued Shorts wait until you do.",
      },
    ],
  },
];

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-text">{children}</code>;
}

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Help</h2>
        <p className="mt-1 text-sm text-muted">How ShortFlow works, from a long video to Shorts going out on YouTube.</p>
      </div>

      <Card>
        <CardHeader title="Getting started" description="The six steps, in order. Click one to go there." />
        <ol className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Link href={step.href} className="group flex h-full gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-accent/50">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[12.5px] font-semibold tabular-nums text-accent">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
                      {Icon === "youtube" ? <YouTubeIcon className="size-4" /> : <Icon className="size-4 text-muted" />}
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-muted">{step.body}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {TOPICS.map((topic) => (
          <Card key={topic.title}>
            <CardHeader title={topic.title} />
            <div className="divide-y divide-line px-5 pb-2 pt-2">
              {topic.questions.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex list-none items-start justify-between gap-3 text-[13.5px] font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="mt-0.5 size-4 shrink-0 text-faint transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 pr-7 text-[13px] leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
