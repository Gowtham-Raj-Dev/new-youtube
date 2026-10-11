import { cn } from "@/lib/cn";

/** A row of options where exactly one is picked. */
export function Segmented<T extends string | number>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-8 rounded-lg px-3.5 text-[13px] font-medium transition",
            value === option ? "bg-accent-soft text-text shadow-[inset_0_0_0_1px_rgb(139_108_255/0.45)]" : "text-muted hover:text-text",
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}
