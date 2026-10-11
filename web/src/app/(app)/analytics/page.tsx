import { ChartColumn } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function AnalyticsPage() {
  return (
    <ComingSoon
      icon={<ChartColumn className="size-6" />}
      title="Analytics"
      description="Shorts generated, published and failed over time."
      phase={6}
    />
  );
}
