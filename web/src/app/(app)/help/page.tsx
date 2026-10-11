import { LifeBuoy } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function HelpPage() {
  return (
    <ComingSoon
      icon={<LifeBuoy className="size-6" />}
      title="Help"
      description="Guides for connecting YouTube, scheduling and fixing failed uploads."
      phase={6}
    />
  );
}
