"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { formatBytes } from "@shortflow/shared";
import { useUploads } from "@/lib/uploads/upload-provider";

/** Floating progress pill shown on every page except /videos while uploads run. */
export function UploadTray() {
  const { uploads } = useUploads();
  const pathname = usePathname();
  const active = uploads.filter((u) => u.state !== "error");
  if (!active.length || pathname.startsWith("/videos")) return null;

  const total = active.reduce((s, u) => s + u.size, 0);
  const done = active.reduce((s, u) => s + u.transferred, 0);
  const pct = total ? (done / total) * 100 : 0;
  const speed = active.reduce((s, u) => s + u.speed, 0);
  const verifying = active.every((u) => u.state === "verifying");

  return (
    <Link
      href="/videos"
      className="fixed bottom-24 right-4 z-40 w-[min(320px,calc(100vw-32px))] animate-enter rounded-2xl border border-line-strong bg-surface-2/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl transition hover:border-accent/40 lg:bottom-6 lg:right-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <CloudUpload className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium">
            {verifying ? "Checking" : "Uploading"} {active.length} video{active.length > 1 ? "s" : ""}
          </p>
          <p className="text-[11.5px] tabular-nums text-muted">
            {verifying ? "Almost done…" : `${pct.toFixed(0)}% · ${speed > 0 ? `${formatBytes(speed)}/s` : "starting…"}`}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${verifying ? 100 : pct}%` }} />
      </div>
    </Link>
  );
}
