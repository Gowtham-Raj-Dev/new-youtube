import { Activity } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function ActivitylogPage() {
  return (
    <ComingSoon
      icon={<Activity className="size-6" />}
      title="Activity log"
      description="A full timeline of uploads, processing, scheduling and YouTube publishing."
      phase={5}
    />
  );
}
