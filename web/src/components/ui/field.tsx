import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared look for text inputs, selects and textareas. */
export const inputClasses =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm outline-none transition focus:border-accent/60 focus:shadow-[0_0_0_4px_var(--accent-soft)] disabled:opacity-60";

/** Label + control + optional hint, with a right-aligned counter such as "42 / 100". */
export function Field({
  label,
  hint,
  counter,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  counter?: string;
  error?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium">{label}</span>
        {counter && <span className={cn("text-[11.5px] tabular-nums", error ? "text-danger" : "text-faint")}>{counter}</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}
