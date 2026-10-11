"use client";

import { Check, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { YouTubeIcon } from "@/components/ui/brand-icons";

const CAN = ["Upload Shorts to your channel", "See your channel name, avatar and subscriber count"];
const CANNOT = ["Delete or edit your existing videos", "Read comments, messages or your Google password"];

export function ConnectCard({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-[#ff0033]/10 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-10 size-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <div className="mb-6 grid size-16 place-items-center rounded-2xl border border-line-strong bg-surface-2 shadow-[0_10px_40px_-12px_#ff0033]">
            <YouTubeIcon className="size-9" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Connect YouTube</h2>
          <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">
            Link your channel once. ShortFlow publishes your scheduled Shorts automatically from the cloud — your computer can stay off.
          </p>
          <Button size="lg" className="mt-7" loading={connecting} onClick={onConnect} icon={<YouTubeIcon mono className="size-[18px]" />}>
            {connecting ? "Opening Google…" : "Connect YouTube"}
          </Button>
          <p className="mt-4 flex items-center gap-2 text-[12.5px] text-faint">
            <LockKeyhole className="size-3.5" />
            Secured by Google OAuth. You can disconnect any time.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-bg/40 p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold">
            <ShieldCheck className="size-4 text-success" />
            What ShortFlow can do
          </p>
          <ul className="space-y-2.5">
            {CAN.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13px] text-text/90">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <div className="h-px bg-line" />
          <p className="text-[13px] font-semibold text-muted">What it can&apos;t</p>
          <ul className="space-y-2.5">
            {CANNOT.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13px] text-muted">
                <X className="mt-0.5 size-3.5 shrink-0 text-faint" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
