import {
  Activity,
  CalendarClock,
  ChartColumn,
  Clapperboard,
  Film,
  Gauge,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  PanelTop,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon | "youtube";
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/banners", label: "Banners", icon: PanelTop },
  { href: "/videos", label: "Videos", icon: Film },
  { href: "/shorts", label: "Shorts", icon: Clapperboard },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/queue", label: "Queue", icon: Layers },
  { href: "/youtube", label: "YouTube", icon: "youtube" },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/activity", label: "Activity", icon: Activity },
];

export const FOOTER_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: LifeBuoy },
];

/** Only shown to the owner of the app. */
export const ADMIN_NAV: NavItem[] = [{ href: "/usage", label: "Usage", icon: Gauge }];

/** Shown in the mobile bottom bar. */
export const MOBILE_NAV = MAIN_NAV.filter((item) => ["/dashboard", "/videos", "/shorts", "/schedule", "/youtube"].includes(item.href));

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
