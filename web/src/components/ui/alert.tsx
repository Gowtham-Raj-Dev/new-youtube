import type { ReactNode } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Alert({ tone, children, onDismiss }: { tone: "success" | "error"; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex animate-enter items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px]",
        tone === "success" ? "border-success/25 bg-success/[0.07] text-text" : "border-danger/25 bg-danger/[0.07] text-text",
      )}
    >
      {tone === "success" ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />}
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-faint hover:text-text" aria-label="Dismiss">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
