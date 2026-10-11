"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { parseTags, TAGS_MAX } from "@/lib/shorts";
import { cn } from "@/lib/cn";

/** Keyword chips. Enter or a comma adds what's typed; pasting a comma-separated list adds them all. */
export function TagInput({ tags, onChange, disabled }: { tags: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState("");

  function commit(text: string) {
    const merged = parseTags([...tags, text].join(","));
    onChange(merged.slice(0, TAGS_MAX));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-2 py-1.5 transition focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_var(--accent-soft)]",
        disabled && "opacity-60",
      )}
    >
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-accent-soft py-1 pl-2.5 pr-1 text-[12.5px] text-text">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} className="grid size-4 place-items-center rounded text-muted hover:bg-white/10 hover:text-text" aria-label={`Remove ${tag}`}>
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        value={draft}
        disabled={disabled}
        onChange={(e) => (e.target.value.includes(",") ? commit(e.target.value) : setDraft(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={tags.length === 0 ? "Type a keyword and press Enter" : ""}
        aria-label="Add keyword"
        className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-faint"
      />
    </div>
  );
}
