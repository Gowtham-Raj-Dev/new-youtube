"use client";

import { useRef, useState, type DragEvent } from "react";
import { CloudUpload, Upload } from "lucide-react";
import { ACCEPTED_VIDEO_TYPES } from "@shortflow/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const ACCEPT = [...Object.keys(ACCEPTED_VIDEO_TYPES), ...Object.values(ACCEPTED_VIDEO_TYPES).map((e) => `.${e}`)].join(",");

/** Large drop target; `compact` renders a single-row strip once the library has videos. */
export function Dropzone({ onFiles, compact }: { onFiles: (files: File[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  function pick() {
    input.current?.click();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) onFiles(files);
  }

  const handlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      depth.current++;
      setOver(true);
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop,
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT}
      multiple
      hidden
      onChange={(e) => {
        const files = [...(e.target.files ?? [])];
        e.target.value = "";
        if (files.length) onFiles(files);
      }}
    />
  );

  if (compact) {
    return (
      <div
        {...handlers}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-4 transition sm:flex-row",
          over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface/60",
        )}
      >
        <CloudUpload className={cn("size-5 shrink-0", over ? "text-accent" : "text-faint")} />
        <p className="flex-1 text-center text-[13.5px] text-muted sm:text-left">
          {over ? "Drop to upload" : "Drop more long videos here — MP4, MOV, MKV or WebM, up to 10 GB each."}
        </p>
        <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={pick}>
          Upload Video
        </Button>
        {fileInput}
      </div>
    );
  }

  return (
    <div
      {...handlers}
      onClick={pick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center overflow-hidden rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-all duration-300",
        over ? "scale-[1.01] border-accent bg-accent-soft" : "border-line-strong bg-surface/50 hover:border-accent/50 hover:bg-surface/80",
      )}
    >
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_70%)] transition-opacity", over ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
      <div className={cn("relative mb-5 grid size-16 place-items-center rounded-2xl border border-line-strong bg-surface-2 transition-transform duration-300", over ? "-translate-y-1 scale-110" : "group-hover:-translate-y-0.5")}>
        <CloudUpload className={cn("size-7", over ? "text-accent" : "text-muted")} />
      </div>
      <h3 className="relative text-lg font-semibold tracking-tight">{over ? "Release to upload" : "Drop your long video here"}</h3>
      <p className="relative mt-1.5 text-sm text-muted">MP4, MOV, MKV and WebM · up to 10 GB · uploads keep going while you browse</p>
      <Button
        className="relative mt-6"
        icon={<Upload className="size-4" />}
        onClick={(e) => {
          e.stopPropagation();
          pick();
        }}
      >
        Upload Video
      </Button>
      {fileInput}
    </div>
  );
}
