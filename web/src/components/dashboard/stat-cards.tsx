import { CalendarClock, CircleCheck, CircleX, Clapperboard, Film, LoaderCircle, type LucideIcon } from "lucide-react";
import type { DashboardCounts } from "@/lib/firebase/counts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

const STATS: Array<{ key: keyof DashboardCounts; label: string; icon: LucideIcon; tint: string }> = [
  { key: "videos", label: "Total Videos", icon: Film, tint: "text-text" },
  { key: "shorts", label: "Generated Shorts", icon: Clapperboard, tint: "text-accent" },
  { key: "scheduled", label: "Scheduled", icon: CalendarClock, tint: "text-accent" },
  { key: "published", label: "Published", icon: CircleCheck, tint: "text-success" },
  { key: "processing", label: "Processing", icon: LoaderCircle, tint: "text-warning" },
  { key: "failed", label: "Failed", icon: CircleX, tint: "text-danger" },
];

export function StatCards({ counts }: { counts: DashboardCounts | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {STATS.map(({ key, label, icon: Icon, tint }) => (
        <Card key={key} className="group p-4 transition hover:-translate-y-0.5 hover:border-line-strong">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-medium text-muted">{label}</p>
            <Icon className={cn("size-4 opacity-70 transition group-hover:opacity-100", tint)} />
          </div>
          {counts ? (
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{counts[key].toLocaleString("en-IN")}</p>
          ) : (
            <Skeleton className="mt-3 h-7 w-12" />
          )}
        </Card>
      ))}
    </div>
  );
}
