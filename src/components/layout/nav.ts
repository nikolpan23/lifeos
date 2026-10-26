import { CalendarDays, CheckCircle2, FileText, Gauge, LayoutDashboard, Radar, Repeat, Settings, Sparkles, Target, type LucideIcon } from "lucide-react";

export type Space = "app" | "demo";

export interface NavItem {
  slug: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard, description: "Your day at a glance" },
  { slug: "tasks", label: "My Tasks", icon: CheckCircle2, description: "Everything on your list" },
  { slug: "habits", label: "Habits", icon: Repeat, description: "Small things, done often" },
  { slug: "goals", label: "Goals", icon: Target, description: "Where you're heading" },
  { slug: "notes", label: "Notes", icon: FileText, description: "Thoughts worth keeping" },
  { slug: "calendar", label: "Calendar", icon: CalendarDays, description: "Your time, laid out" },
  { slug: "radar", label: "Life Radar", icon: Radar, description: "Connections worth noticing" },
  { slug: "what-if", label: "What-If Studio", icon: Sparkles, description: "Try a decision before you make it" },
  { slug: "insights", label: "Insights", icon: Gauge, description: "Patterns from your own data" },
  { slug: "settings", label: "Settings", icon: Settings, description: "Preferences and privacy" },
];

export function spaceHref(space: Space, slug = ""): string {
  return slug ? `/${space}/${slug}` : `/${space}`;
}

export function activeNavItem(pathname: string, space: Space): NavItem {
  const rest = pathname.replace(new RegExp(`^/${space}/?`), "").split("/")[0] ?? "";
  return NAV_ITEMS.find((i) => i.slug === rest) ?? NAV_ITEMS[0];
}
