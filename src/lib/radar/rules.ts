import { addDays, compareLocal, dateRange, diffDays, durationLabel, formatLocalDate, formatTimeRange, localDateOf, relativeDayLabel, type LocalDate } from "@/lib/dates";
import { isScheduledOn } from "@/lib/domain/habits";
import { goalProgress } from "@/lib/domain/goals";
import type { InsightState, LifeData, Task } from "@/lib/domain/types";
import { findOverlappingPairs } from "@/lib/scheduling/conflicts";
import { dayAvailability, habitBlocks } from "@/lib/scheduling/free-time";
import { overlaps, toInterval } from "@/lib/scheduling/intervals";
import { DEFAULT_ESTIMATE_MINUTES } from "@/lib/scheduling/planner";

export type Severity = "info" | "warning" | "critical";

export interface RelatedRecord {
  type: "task" | "event" | "habit" | "goal" | "milestone";
  id: string;
  label: string;
}

export interface InsightAction {
  label: string;
  /** Workspace-relative slug + query, e.g. "tasks?task=123". */
  href: string;
}

export interface Insight {
  key: string;
  ruleId: string;
  title: string;
  explanation: string;
  severity: Severity;
  related: RelatedRecord[];
  action: InsightAction;
  /** Which rule produced it, shown so the user can see why. */
  basis: string;
}

export interface RadarContext {
  data: LifeData;
  today: LocalDate;
  now: Date;
}

type Rule = (ctx: RadarContext) => Insight[];

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function insightKey(ruleId: string, ids: string[]): string {
  return `${ruleId}:${fnv1a([...ids].sort().join(","))}`;
}

const openTasks = (d: LifeData) => d.tasks.filter((t) => t.status === "open");
const taskRef = (t: Task): RelatedRecord => ({ type: "task", id: t.id, label: t.title });
const list = (items: string[]) => (items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** 1. Three or more deadlines in the next two days. */
const deadlineCluster: Rule = ({ data, today }) => {
  const tomorrow = addDays(today, 1);
  const due = openTasks(data).filter((t) => t.dueDate && compareLocal(t.dueDate, today) >= 0 && compareLocal(t.dueDate, tomorrow) <= 0);
  if (due.length < 3) return [];
  const high = due.filter((t) => t.priority === "high").length;
  return [
    {
      key: insightKey("deadline-cluster", due.map((t) => t.id)),
      ruleId: "deadline-cluster",
      title: `${due.length} deadlines in the next two days`,
      explanation: `${list(due.slice(0, 3).map((t) => `“${t.title}”`))}${due.length > 3 ? ` and ${due.length - 3} more` : ""} are due today or tomorrow${high ? `, ${high} of them high priority` : ""}.`,
      severity: due.length >= 5 || high >= 2 ? "warning" : "info",
      related: due.map(taskRef),
      action: { label: "Plan my day", href: "?plan=1" },
      basis: "Open tasks with due dates today or tomorrow.",
    },
  ];
};

/** 2. Overlapping events in the next 7 days. */
const eventOverlap: Rule = ({ data, today, now }) => {
  const tz = data.profile.timezone;
  const end = addDays(today, 7);
  const upcoming = data.events.filter((e) => {
    const d = localDateOf(e.start, tz);
    return compareLocal(d, today) >= 0 && compareLocal(d, end) <= 0 && new Date(e.end).getTime() > now.getTime();
  });
  return findOverlappingPairs(upcoming).map(({ a, b }) => {
    const day = localDateOf(a.start, tz);
    return {
      key: insightKey("event-overlap", [a.id, b.id, a.start, b.start]),
      ruleId: "event-overlap",
      title: `Two events overlap ${relativeDayLabel(day, today).toLowerCase() === "today" ? "today" : `on ${relativeDayLabel(day, today)}`}`,
      explanation: `“${a.title}” (${formatTimeRange(a.start, a.end, tz)}) overlaps “${b.title}” (${formatTimeRange(b.start, b.end, tz)}).`,
      severity: day === today ? "warning" : "info",
      related: [
        { type: "event", id: a.id, label: a.title },
        { type: "event", id: b.id, label: b.title },
      ],
      action: { label: "Review in calendar", href: `calendar?date=${day}&event=${b.id}` },
      basis: "Timed calendar events whose times intersect.",
    } satisfies Insight;
  });
};

/** 3. Not enough free time for what's due (today's remainder and tomorrow). */
const insufficientTime: Rule = ({ data, today, now }) => {
  const out: Insight[] = [];
  for (const [date, isToday] of [
    [today, true],
    [addDays(today, 1), false],
  ] as const) {
    const due = openTasks(data).filter((t) => t.dueDate === date);
    if (due.length === 0) continue;
    const needed = due.reduce((s, t) => s + (t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES), 0);
    const avail = dayAvailability({ date, timezone: data.profile.timezone, planning: data.profile.planning, events: data.events, habits: data.habits, now: isToday ? now : undefined });
    if (needed <= avail.freeMinutes) continue;
    const label = isToday ? "today" : "tomorrow";
    const unestimated = due.filter((t) => t.estimateMinutes === null).length;
    out.push({
      key: insightKey(`short-on-time-${isToday ? "today" : "tomorrow"}`, [date, ...due.map((t) => t.id)]),
      ruleId: "short-on-time",
      title: `${isToday ? "Today" : "Tomorrow"} has more work than free time`,
      explanation: `Tasks due ${label} need about ${durationLabel(needed)}, but there's only ${durationLabel(Math.round(avail.freeMinutes))} free${isToday ? " for the rest of the day" : ""} within your planning hours.${unestimated ? ` ${unestimated} task${unestimated === 1 ? " has" : "s have"} no estimate and counted as ${DEFAULT_ESTIMATE_MINUTES} minutes.` : ""}`,
      severity: needed > avail.freeMinutes * 1.5 ? "critical" : "warning",
      related: due.map(taskRef),
      action: { label: isToday ? "Plan my day" : "See tomorrow's tasks", href: isToday ? "?plan=1" : "tasks?view=upcoming" },
      basis: "Sum of task estimates compared with free time after events and scheduled habits.",
    });
  }
  return out;
};

/** 4. A milestone is close but linked tasks are still open. */
const milestoneAtRisk: Rule = ({ data, today }) => {
  const out: Insight[] = [];
  const goals = new Map(data.goals.filter((g) => g.status === "active").map((g) => [g.id, g]));
  for (const m of data.milestones) {
    if (m.completedAt || !m.dueDate) continue;
    const goal = goals.get(m.goalId);
    if (!goal) continue;
    const days = diffDays(today, m.dueDate);
    if (days < 0 || days > 7) continue;
    const linkedOpen = openTasks(data).filter((t) => t.goalId === goal.id);
    if (linkedOpen.length === 0) continue;
    out.push({
      key: insightKey("milestone-at-risk", [m.id, ...linkedOpen.map((t) => t.id)]),
      ruleId: "milestone-at-risk",
      title: `“${m.title}” is due ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
      explanation: `This milestone for “${goal.title}” is coming up and ${linkedOpen.length} linked task${linkedOpen.length === 1 ? " is" : "s are"} still open: ${list(linkedOpen.slice(0, 3).map((t) => `“${t.title}”`))}.`,
      severity: days <= 2 ? "warning" : "info",
      related: [{ type: "milestone", id: m.id, label: m.title }, { type: "goal", id: goal.id, label: goal.title }, ...linkedOpen.map(taskRef)],
      action: { label: "Open goal", href: `goals?goal=${goal.id}` },
      basis: "Milestones due within 7 days on goals that still have open linked tasks.",
    });
  }
  return out;
};

/** 5. A scheduled habit keeps colliding with calendar events. */
const habitConflict: Rule = ({ data, today }) => {
  const out: Insight[] = [];
  const tz = data.profile.timezone;
  const days = dateRange(today, 14);
  for (const habit of data.habits) {
    if (habit.status !== "active" || !habit.preferredTime || !habit.durationMinutes) continue;
    const clashes: { date: LocalDate; title: string; id: string }[] = [];
    for (const date of days) {
      if (!isScheduledOn(habit, date)) continue;
      const [block] = habitBlocks([habit], date, tz);
      const hit = data.events.find((e) => !e.allDay && overlaps(toInterval(e.start, e.end), block));
      if (hit) clashes.push({ date, title: hit.title, id: hit.id });
    }
    if (clashes.length < 2) continue;
    const titles = [...new Set(clashes.map((c) => `“${c.title}”`))];
    out.push({
      key: insightKey("habit-conflict", [habit.id, ...clashes.map((c) => c.id)]),
      ruleId: "habit-conflict",
      title: `${habit.name} clashes with your calendar ${clashes.length} times`,
      explanation: `In the next two weeks, your ${habit.preferredTime} ${habit.name.toLowerCase()} overlaps ${list(titles)} on ${list(clashes.slice(0, 3).map((c) => formatLocalDate(c.date, { weekday: "short", month: "short", day: "numeric" })))}${clashes.length > 3 ? " and more" : ""}. A different time could make it easier to keep.`,
      severity: "info",
      related: [{ type: "habit", id: habit.id, label: habit.name }, ...clashes.map((c) => ({ type: "event" as const, id: c.id, label: c.title }))],
      action: { label: "Adjust habit time", href: `habits?habit=${habit.id}` },
      basis: "Habit preferred time and duration compared with timed events over 14 days.",
    });
  }
  return out;
};

/** 6. A multi-day or all-day commitment (e.g. a trip) overlaps important deadlines. */
const tripDeadline: Rule = ({ data, today }) => {
  const out: Insight[] = [];
  const horizon = addDays(today, 30);
  for (const e of data.events) {
    if (!e.allDay || !e.startDate || !e.endDate) continue;
    if (compareLocal(e.endDate, today) < 0 || compareLocal(e.startDate, horizon) > 0) continue;
    const clashing = openTasks(data).filter((t) => t.dueDate && t.priority !== "low" && compareLocal(t.dueDate, e.startDate!) >= 0 && compareLocal(t.dueDate, e.endDate!) <= 0);
    if (clashing.length === 0) continue;
    out.push({
      key: insightKey("away-deadline", [e.id, ...clashing.map((t) => t.id)]),
      ruleId: "away-deadline",
      title: `“${e.title}” overlaps ${clashing.length === 1 ? "a deadline" : `${clashing.length} deadlines`}`,
      explanation: `${list(clashing.slice(0, 3).map((t) => `“${t.title}”`))} ${clashing.length === 1 ? "is" : "are"} due during ${e.title} (${formatLocalDate(e.startDate)}${e.endDate !== e.startDate ? `–${formatLocalDate(e.endDate)}` : ""}). Finishing early or moving the date may help.`,
      severity: clashing.some((t) => t.priority === "high") ? "warning" : "info",
      related: [{ type: "event", id: e.id, label: e.title }, ...clashing.map(taskRef)],
      action: { label: "Review tasks", href: `tasks?task=${clashing[0].id}` },
      basis: "Medium and high priority tasks due on days covered by an all-day event.",
    });
  }
  return out;
};

/** 7. Overdue tasks, framed kindly. */
const overdue: Rule = ({ data, today }) => {
  const late = openTasks(data).filter((t) => t.dueDate && compareLocal(t.dueDate, today) < 0);
  if (late.length === 0) return [];
  return [
    {
      key: insightKey("overdue", late.map((t) => t.id)),
      ruleId: "overdue",
      title: late.length === 1 ? "One task slipped past its date" : `${late.length} tasks slipped past their dates`,
      explanation: `${list(late.slice(0, 3).map((t) => `“${t.title}”`))}${late.length > 3 ? ` and ${late.length - 3} more` : ""}. Pick a new date, or let go of what no longer matters.`,
      severity: late.length >= 4 ? "warning" : "info",
      related: late.map(taskRef),
      action: { label: "Review overdue", href: "tasks?view=today" },
      basis: "Open tasks with a due date before today.",
    },
  ];
};

/** 8. Goal target date is close and progress is low. */
const goalBehind: Rule = ({ data, today }) => {
  const out: Insight[] = [];
  for (const g of data.goals) {
    if (g.status !== "active" || !g.targetDate) continue;
    const days = diffDays(today, g.targetDate);
    if (days < 0 || days > 21) continue;
    const p = goalProgress(g, data.milestones);
    if (p.ratio === null || p.ratio >= 0.5) continue;
    out.push({
      key: insightKey("goal-behind", [g.id, String(p.completed)]),
      ruleId: "goal-behind",
      title: `“${g.title}” is ${days === 0 ? "due today" : `due in ${days} days`}`,
      explanation: `${p.completed} of ${p.total} milestones are done. You might focus on the next step${p.nextMilestone ? `, “${p.nextMilestone.title}”` : ""}, or move the target date if plans changed.`,
      severity: days <= 7 ? "warning" : "info",
      related: [{ type: "goal", id: g.id, label: g.title }],
      action: { label: "Open goal", href: `goals?goal=${g.id}` },
      basis: "Active goals within 21 days of their target with under half of milestones complete.",
    });
  }
  return out;
};

export const RULES: { id: string; name: string; run: Rule }[] = [
  { id: "short-on-time", name: "Time vs. workload", run: insufficientTime },
  { id: "deadline-cluster", name: "Deadline clusters", run: deadlineCluster },
  { id: "event-overlap", name: "Calendar overlaps", run: eventOverlap },
  { id: "milestone-at-risk", name: "Milestones at risk", run: milestoneAtRisk },
  { id: "away-deadline", name: "Away during deadlines", run: tripDeadline },
  { id: "habit-conflict", name: "Habit conflicts", run: habitConflict },
  { id: "goal-behind", name: "Goals behind schedule", run: goalBehind },
  { id: "overdue", name: "Overdue tasks", run: overdue },
];

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

export function isHidden(key: string, states: InsightState[], now: Date): boolean {
  const s = states.find((x) => x.key === key);
  if (!s) return false;
  if (s.status === "dismissed") return true;
  return !!s.snoozedUntil && new Date(s.snoozedUntil).getTime() > now.getTime();
}

export function runRadar(ctx: RadarContext, options: { includeHidden?: boolean } = {}): Insight[] {
  const all = RULES.flatMap((r) => r.run(ctx));
  const visible = options.includeHidden ? all : all.filter((i) => !isHidden(i.key, ctx.data.insightStates, ctx.now));
  return visible.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
