import { CalendarClock, Upload } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SAMPLE_CREDIT, SampleShort, type SampleClip } from "@/components/ui/sample-short";

const FILMSTRIP_TILES = 18;

const PARTS: { tilt: string; delay: string; label: string; time: string; clip: SampleClip }[] = [
  { tilt: "-8deg", delay: "0s", label: "Part 01", time: "0:52", clip: "foxes" },
  { tilt: "0deg", delay: "-2s", label: "Part 02", time: "0:47", clip: "standing" },
  { tilt: "7deg", delay: "-4s", label: "Part 03", time: "1:00", clip: "vine" },
];

/** A real long-form timeline being sliced into vertical Shorts — a quiet, looping visual. */
function PipelineVisual() {
  return (
    <div className="relative hidden h-full min-h-[220px] items-center justify-center lg:flex">
      <div aria-hidden className="absolute inset-x-6 top-1/2 h-14 -translate-y-1/2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        <div className="flex h-full gap-1 p-1.5">
          {Array.from({ length: FILMSTRIP_TILES }).map((_, i) => (
            <span
              key={i}
              className="h-full flex-1 rounded-[4px] bg-[url(/samples/filmstrip.jpg)] opacity-55"
              style={{
                backgroundSize: `${FILMSTRIP_TILES * 100}% 100%`,
                backgroundPosition: `${(i / (FILMSTRIP_TILES - 1)) * 100}% 0`,
              }}
            />
          ))}
        </div>
        <span className="absolute inset-y-0 left-[38%] w-px bg-accent shadow-[0_0_12px_var(--accent)]" />
      </div>
      <div aria-hidden className="relative flex gap-4">
        {PARTS.map((f) => (
          <div
            key={f.label}
            style={{ ["--tilt" as string]: f.tilt, animationDelay: f.delay }}
            className="relative aspect-[9/16] w-[86px] animate-float overflow-hidden rounded-xl border border-white/15 bg-surface-2 shadow-2xl shadow-black/60"
          >
            <SampleShort clip={f.clip} />
            <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
            <span className="absolute bottom-2 left-2 text-[9px] font-medium text-white drop-shadow">{f.label}</span>
            <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1 font-mono text-[8px] text-white/80">{f.time}</span>
          </div>
        ))}
      </div>
      <p className="absolute bottom-0 right-6 text-[10px] text-white/25">{SAMPLE_CREDIT}</p>
    </div>
  );
}

export function DashboardHero() {
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute -left-20 -top-28 size-80 rounded-full bg-accent/20 blur-[100px]" />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col justify-center">
          <h2 className="text-[28px] font-semibold leading-[1.12] tracking-tight sm:text-[34px]">
            Your content.
            <br />
            <span className="bg-gradient-to-r from-[#d3c7ff] to-accent bg-clip-text text-transparent">Automatically turned into Shorts.</span>
          </h2>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-muted">
            Upload once. Generate Shorts. Schedule your publishing. Let automation handle the rest.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <ButtonLink href="/videos" size="lg" icon={<Upload className="size-4" />}>
              Upload Video
            </ButtonLink>
            <ButtonLink href="/schedule" variant="secondary" size="lg" icon={<CalendarClock className="size-4" />}>
              View Schedule
            </ButtonLink>
          </div>
        </div>
        <PipelineVisual />
      </div>
    </Card>
  );
}
