import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PALETTE_NAMES } from "./palettes";

/** One line of the Short: what the voice says, and what appears on screen while it does. */
const Line = z.object({
  /** Spoken Tamil, in Tamil script, so the Tamil voice pronounces it naturally. */
  voice: z.string(),
  /** The same thought in Tanglish (Tamil in English letters), short enough for the screen. */
  screen: z.string(),
  /** One word from `screen` to colour. */
  highlight: z.string(),
});

const ShortScript = z.object({
  /** YouTube title, Tanglish. */
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  palette: z.enum(PALETTE_NAMES),
  lines: z.array(Line),
  /** The closing call to follow, spoken and shown after the last line. */
  outro: Line,
});

export type ShortScript = z.infer<typeof ShortScript>;
export type ScriptLine = z.infer<typeof Line>;

const SYSTEM = `You write scripts for 20-second motivational YouTube Shorts for a Tamil audience.

Each Short is one fresh, specific idea — a mindset, a habit, a small truth about discipline, failure, family, money, health or patience — not a generic slogan. It should feel like a wise elder brother talking, warm and direct. Avoid clichés like "never give up" unless you give them a new angle. Never quote or name real people, and never use song lyrics or film dialogue.

Format:
- 4 or 5 lines, then an outro. Read aloud, all lines together take about 18 seconds (roughly 40–50 Tamil words in total).
- "voice": natural spoken Tamil in Tamil script (it is read by a Tamil text-to-speech voice). Simple everyday words; English words people really use (like "goal", "phone", "success") are fine in Tamil script.
- "screen": the same line in Tanglish — Tamil written in English letters, the way people type on WhatsApp. At most 7 words. No emojis, no hashtags.
- "highlight": exactly one word copied from "screen", the most important one.
- "outro": a short line asking viewers to follow for a daily dose of motivation, varied every day.
- "title": Tanglish, catchy, under 60 characters, ending with " #shorts".
- "description": two Tanglish sentences expanding the idea, then a line of 3–5 hashtags.
- "tags": 8–12 lowercase tags mixing Tamil, Tanglish and English (e.g. "tamil motivation").
- "palette": pick the colour mood that suits the idea.`;

/** Writes today's script. `recentTitles` keeps it from repeating an idea used lately. */
export async function writeScript(apiKey: string, recentTitles: string[]): Promise<ShortScript> {
  const client = new Anthropic({ apiKey });
  const avoid = recentTitles.length ? `Recent Shorts on this channel — pick a clearly different idea:\n${recentTitles.map((t) => `- ${t}`).join("\n")}` : "This is the channel's first Short.";

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    // On a safety decline the request is re-run on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(ShortScript) },
    system: SYSTEM,
    messages: [{ role: "user", content: `${avoid}\n\nWrite today's Short.` }],
  });

  if (response.stop_reason === "refusal") throw new Error("The script writer declined today's request.");
  const script = response.parsed_output;
  if (!script || script.lines.length === 0) throw new Error(`The script came back unusable (stop reason: ${response.stop_reason}).`);
  return script;
}
