import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-lg bg-[linear-gradient(90deg,rgb(255_255_255/0.04)_0%,rgb(255_255_255/0.09)_50%,rgb(255_255_255/0.04)_100%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}
