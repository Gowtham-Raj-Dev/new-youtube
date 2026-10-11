/* eslint-disable @next/next/no-img-element -- remote avatars in a static export */
import { cn } from "@/lib/cn";

export function Avatar({ name, src, className }: { name: string | null; src?: string | null; className?: string }) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className={cn("size-8 shrink-0 rounded-full border border-line-strong object-cover", className)} />
  ) : (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#a48bff,#5b3be6)] text-[13px] font-semibold text-white",
        className,
      )}
    >
      {initial}
    </span>
  );
}
