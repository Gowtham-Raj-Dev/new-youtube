import { Settings } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={<Settings className="size-6" />}
      title="Settings"
      description="Profile, timezone, processing defaults, automation toggles and storage management."
      phase={6}
    />
  );
}
