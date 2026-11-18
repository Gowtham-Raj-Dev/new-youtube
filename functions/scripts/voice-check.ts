/**
 * Checks each GEMINI_API_KEY* in .secret.local with one tiny speech request
 * (uses 1 of that key's daily TTS requests when it works).
 *
 *   npx esbuild scripts/voice-check.ts --bundle --platform=node --outfile=.local/voice-check.js && node .local/voice-check.js
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { geminiSpeech } from "../src/auto/voice";
import { HOST_VOICE } from "../src/explainer/explainer";

async function main() {
  const secret = readFileSync(resolve(__dirname, "..", ".secret.local"), "utf8");
  const keys = [...secret.matchAll(/^(GEMINI_API_KEY\w*)=(.+)$/gm)].map((m) => [m[1], m[2].trim()] as const);
  for (const [name, key] of keys) {
    try {
      const pcm = await geminiSpeech(key, [{ text: "வணக்கம்!", speaker: "Narrator" }], { Narrator: HOST_VOICE.narrator });
      console.log(`${name}: WORKS (${(pcm.length / 48_000).toFixed(1)} s of voice)`);
    } catch (error) {
      const s = String(error);
      const why = /429/.test(s) ? (/day|daily|PerDay/i.test(s) ? "daily limit used up" : "rate limited (429)") : /40[13]/.test(s) ? "key rejected" : s.slice(0, 120);
      console.log(`${name}: NO — ${why}`);
    }
  }
}

void main();
