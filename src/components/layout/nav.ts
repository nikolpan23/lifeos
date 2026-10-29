import { CalendarDays, CheckCircle2, FileText, Gauge, LayoutDashboard, Radar, Repeat, Settings, Sparkles, Target, type LucideIcon } from "lucide-react";

export type Space = "app" | "demo";

export interface NavItem {
  slug: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Small animation class played on hover and while the page is open (see globals.css). */
  anim: string;
  /** What the page is for and how to start, shown once as a dismissible tip. */
  tip: { title: string; steps: string[] };
}

export const NAV_ITEMS: NavItem[] = [
  {
    slug: "",
    label: "Today",
    icon: LayoutDashboard,
    description: "Your day at a glance",
    anim: "anim-bob",
    tip: { title: "This is your home page", steps: ["See what's due, your events and today's habits in one place.", "Press Plan my day to get a suggested schedule for your free time.", "Use Quick add at the top, from any page, to add a task, event, note, habit or goal."] },
  },
  {
    slug: "tasks",
    label: "Tasks",
    icon: CheckCircle2,
    description: "Things to get done",
    anim: "anim-wiggle",
    tip: { title: "Your to-do list", steps: ["Type in the box and press Enter. Words like “tomorrow”, “friday” or “30m” fill in the date and time needed.", "Tick the circle when a task is done.", "Click a task to add details, a goal or a category."] },
  },
  {
    slug: "habits",
    label: "Habits",
    icon: Repeat,
    description: "Small things, done often",
    anim: "anim-spin",
    tip: { title: "Build routines", steps: ["Add a habit and choose which days it repeats.", "Tick it off each day to grow your streak."] },
  },
  {
    slug: "goals",
    label: "Goals",
    icon: Target,
    description: "Where you're heading",
    anim: "anim-beat",
    tip: { title: "Bigger things you're working towards", steps: ["Create a goal and break it into milestones.", "Tick off milestones and the progress bar fills in.", "Link tasks and notes to a goal to keep everything together."] },
  },
  {
    slug: "notes",
    label: "Notes",
    icon: FileText,
    description: "Ideas, lists and plans",
    anim: "anim-wiggle",
    tip: { title: "Write things down", steps: ["Press New note, give it a title and type underneath.", "Everything saves as you type. Blank notes are thrown away.", "Add #tags or link a note to a goal to find it later."] },
  },
  {
    slug: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    description: "Your time, laid out",
    anim: "anim-bob",
    tip: { title: "Your schedule", steps: ["Click or drag on an empty time slot to add an event.", "Switch between month, week and day at the top.", "Tasks with a due date appear here too."] },
  },
  {
    slug: "radar",
    label: "Life Radar",
    icon: Radar,
    description: "Things that need your attention",
    anim: "anim-spin",
    tip: { title: "Gentle heads-ups", steps: ["LifeOS looks across your tasks, habits and calendar and points out things worth noticing, like an overloaded day.", "Each card explains why it appeared. Dismiss or snooze what you don't need."] },
  },
  {
    slug: "what-if",
    label: "What-If",
    icon: Sparkles,
    description: "Try a change before you commit",
    anim: "anim-twinkle",
    tip: { title: "Test a decision safely", steps: ["Add a change, like a new weekly class or moving a deadline.", "See how your week would look before and after.", "Nothing changes in your real data until you press Apply."] },
  },
  {
    slug: "insights",
    label: "Insights",
    icon: Gauge,
    description: "Your patterns over time",
    anim: "anim-bob",
    tip: { title: "How you've been doing", steps: ["Charts here come only from what you've logged.", "The more you use LifeOS, the more useful this page gets."] },
  },
  {
    slug: "settings",
    label: "Settings",
    icon: Settings,
    description: "Preferences and privacy",
    anim: "anim-spin",
    tip: { title: "Make it yours", steps: ["Set your name, time zone and planning hours.", "Export or delete your data at any time."] },
  },
];

export function spaceHref(space: Space, slug = ""): string {
  return slug ? `/${space}/${slug}` : `/${space}`;
}

export function activeNavItem(pathname: string, space: Space): NavItem {
  const rest = pathname.replace(new RegExp(`^/${space}/?`), "").split("/")[0] ?? "";
  return NAV_ITEMS.find((i) => i.slug === rest) ?? NAV_ITEMS[0];
}
