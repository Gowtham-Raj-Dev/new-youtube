"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Mic } from "lucide-react";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import { VOICE_PITCH_MAX, VOICE_PITCH_MIN, VOICE_PRESETS, storagePaths, type ShortDoc, type ShortVoice } from "@shortflow/shared";
import type { WithId } from "@/lib/firebase/hooks";
import { firebase } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { chip } from "@/components/banner/banner-picker";
import { HelperNotice } from "@/components/video/helper-notice";

/** +x% / −x% for a pitch ratio. */
const percent = (pitch: number) => (pitch === 1 ? "0%" : `${pitch > 1 ? "+" : "−"}${Math.round(Math.abs(pitch - 1) * 100)}%`);

/**
 * Picks a voice for the ticked Shorts. The preview plays the first one from its
 * untouched file, sped up or slowed down by the pitch: the real change keeps the
 * length, but the voice sounds the same.
 */
export function VoiceDialog({ shorts, onCancel, onStart }: { shorts: WithId<ShortDoc>[]; onCancel: () => void; onStart: (voice: ShortVoice | null) => void }) {
  const first = shorts[0];
  const current = first.voice ?? null;
  const [preset, setPreset] = useState<string>(current?.preset ?? "original");
  const [pitch, setPitch] = useState<number>(current?.pitch ?? 1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const player = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let live = true;
    const { storage } = firebase();
    const path = first.voice ? storagePaths.shortOriginal(first.userId, first.id) : first.storagePath;
    getDownloadURL(storageRef(storage, path)).then((url) => live && setPreviewUrl(url), () => undefined);
    return () => {
      live = false;
    };
  }, [first]);

  useEffect(() => {
    const video = player.current;
    if (!video) return;
    // Browsers keep the pitch when the speed changes unless told not to.
    (video as HTMLVideoElement & { preservesPitch: boolean }).preservesPitch = false;
    video.playbackRate = pitch;
  }, [pitch, previewUrl]);

  function choose(id: string, value: number) {
    setPreset(id);
    setPitch(value);
  }

  function start(e: FormEvent) {
    e.preventDefault();
    onStart(pitch === 1 ? null : { preset, pitch });
  }

  const count = shorts.length === 1 ? "1 Short" : `${shorts.length} Shorts`;
  const label = pitch === 1 ? "Original voice" : (VOICE_PRESETS.find((p) => p.id === preset)?.label ?? `Custom (${percent(pitch)})`);

  return (
    <Dialog title={`Change voice · ${count}`} onClose={onCancel} width="max-w-3xl">
      <form onSubmit={start} className="mt-4 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <div className="relative mx-auto aspect-[9/16] h-[min(460px,calc(100dvh-14rem))] overflow-hidden rounded-xl border border-line bg-black">
            {previewUrl && <video ref={player} src={previewUrl} controls loop playsInline className="absolute inset-0 size-full object-contain" />}
          </div>
          <p className="mx-auto mt-2.5 max-w-[260px] text-center text-[12px] text-faint">Press play to hear it. The preview plays faster or slower; the saved Short keeps its length.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Voice</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Voice">
              {VOICE_PRESETS.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} onClick={() => choose(p.id, p.pitch)} className={chip(preset === p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted">{VOICE_PRESETS.find((p) => p.id === preset)?.hint ?? "Your own setting."}</p>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[13px] font-medium">
              Pitch
              <span className="font-mono text-[12px] text-muted">{percent(pitch)}</span>
            </span>
            <input
              type="range"
              min={VOICE_PITCH_MIN}
              max={VOICE_PITCH_MAX}
              step={0.01}
              value={pitch}
              onChange={(e) => {
                const value = Number(e.target.value);
                setPitch(value);
                setPreset(VOICE_PRESETS.find((p) => p.pitch === value)?.id ?? "custom");
              }}
              className="w-full accent-[var(--accent)]"
            />
            <span className="mt-1 flex justify-between text-[11.5px] text-faint">
              <span>Deeper</span>
              <span>Higher</span>
            </span>
          </label>

          <HelperNotice />

          <p className="text-[13px] leading-relaxed text-muted">
            {pitch === 1
              ? `${shorts.length === 1 ? "This Short gets" : "These Shorts get"} their own voice back.`
              : `The voice in ${shorts.length === 1 ? "this Short" : `all ${shorts.length}`} changes on this PC; the picture stays exactly as it is. The untouched file is kept, so you can pick “Original” any time to bring it back.`}{" "}
            Keep this tab open until it finishes.
          </p>

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" icon={<Mic className="size-4" />}>
              {label} · {count}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
