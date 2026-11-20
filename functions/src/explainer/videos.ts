/** Every Ulagam Ippo video, in order; the ex-* scripts pick one with `--v=<number>`. */
import type { ExVideo } from "./explainer";
import { AI_JOBS } from "./ai-jobs";
import { CHENNAI_FLOOD } from "./chennai-flood";
import { CHOLA_NAVY } from "./chola-navy";
import { HANGOVER } from "./hangover";
import { KUMARI_KANDAM } from "./kumari-kandam";
import { LATE_NIGHT } from "./late-night";
import { PHONE } from "./phone-addiction";
import { SAD_ANIMALS } from "./sad-animals";
import { TAMIL_WORDS } from "./tamil-words";
import { TN_HISTORY } from "./tn-history";

export const VIDEOS: ExVideo[] = [TN_HISTORY, AI_JOBS, CHOLA_NAVY, SAD_ANIMALS, CHENNAI_FLOOD, KUMARI_KANDAM, HANGOVER, PHONE, LATE_NIGHT, TAMIL_WORDS];

/** `--v=01` picks video 01; without it, the newest. */
export function pickVideo(args = process.argv.slice(2)): ExVideo {
  const no = args.find((a) => a.startsWith("--v="))?.slice(4);
  if (!no) return VIDEOS[VIDEOS.length - 1];
  const v = VIDEOS.find((x) => x.slug.split(" ")[0] === no.padStart(2, "0"));
  if (!v) throw new Error(`No video ${no}: ${VIDEOS.map((x) => x.slug).join(", ")}`);
  return v;
}
