import type { SampleClip } from "@/components/ui/sample-short";

/** The sample Shorts floating beside the sign-in form and on the home page. */
export type Frame = { tilt: string; delay: string; clip: SampleClip; time: string; title: string };

export const FRAMES: Frame[] = [
  { tilt: "-6deg", delay: "0s", clip: "butterfly", time: "00:58", title: "Nobody expected this 😱" },
  { tilt: "4deg", delay: "-2.5s", clip: "dragon", time: "00:45", title: "Part 07 — The twist" },
  { tilt: "-2deg", delay: "-4.5s", clip: "squirrel", time: "01:00", title: "Watch till the end" },
];
