import { addDays, compareLocal, dateRange, localDateOf, startOfWeek, weekdayOf, type LocalDate } from "@/lib/dates";
import { consistency } from "@/lib/domain/habits";
import { goalProgress } from "@/lib/domain/goals";
import type { LifeData } from "@/lib/domain/types";
import { dayAvailability, eventBlocksForDay } from "@/lib/scheduling/free-time";
import { totalMinutes } from "@/lib/scheduling/intervals";
import { DEFAULT_ESTIMATE_MINUTES } from "@/lib/scheduling/planner";

/** Every metric here is a count or sum of the user's own records. No scores are invented. */

export function completionTrend(data: LifeData, today: LocalDate, weeks = 8) {
  const tz = data.profile.timezone;
  const thisWeek = startOfWeek(today, data.profile.weekStartsOn);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(thisWeek, -7 * (weeks - 1 - i)));
  return starts.map((start) => {
    const end = addDays(start, 6);
    const completed = data.tasks.filter((t) => t.completedAt && compareLocal(localDateOf(t.completedAt, tz), start) >= 0 && compareLocal(localDateOf(t.completedAt, tz), end) <= 0).length;
    const created = data.tasks.filter((t) => compareLocal(localDateOf(t.createdAt, tz), start) >= 0 && compareLocal(localDateOf(t.createdAt, tz), end) <= 0).length;
    return { start, completed, created };
  });
}

export function habitConsistencyRows(data: LifeData, today: LocalDate) {
  return data.habits
    .filter((h) => h.status === "active")
    .map((h) => {
      const c = consistency(h, data.habitCompletions, today, 30);
      return { id: h.id, name: h.name, categoryId: h.categoryId, done: c.done, scheduled: c.scheduled, rate: c.rate };
    })
    .sort((a, b) => b.rate - a.rate);
}

export function goalRows(data: LifeData) {
  return data.goals
    .filter((g) => g.status !== "archived")
    .map((g) => ({ goal: g, ...goalProgress(g, data.milestones) }))
    .filter((r) => r.total > 0);
}

/** Hours of timed events per category in the last `days` days (up to and including today). */
export function timeByCategory(data: LifeData, today: LocalDate, days = 28) {
  const tz = data.profile.timezone;
  const totals = new Map<string, number>();
  for (const date of dateRange(addDays(today, -(days - 1)), days)) {
    const { timed } = eventBlocksForDay(data.events, date, tz);
    for (const b of timed) {
      const ev = data.events.find((e) => e.id === b.refId);
      const key = ev?.categoryId ?? "none";
      totals.set(key, (totals.get(key) ?? 0) + totalMinutes([b]) / 60);
    }
  }
  return [...totals.entries()]
    .map(([categoryId, hours]) => ({ categoryId, name: data.categories.find((c) => c.id === categoryId)?.name ?? "Uncategorised", color: data.categories.find((c) => c.id === categoryId)?.color ?? null, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours);
}

/** Task work due vs. free planning time for each of the next `days` days. */
export function upcomingWorkload(data: LifeData, today: LocalDate, days = 14) {
  const tz = data.profile.timezone;
  return dateRange(today, days).map((date) => {
    const due = data.tasks.filter((t) => t.status === "open" && t.dueDate === date).reduce((s, t) => s + (t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES), 0);
    const free = dayAvailability({ date, timezone: tz, planning: data.profile.planning, events: data.events, habits: data.habits }).freeMinutes;
    return { date, dueHours: Math.round((due / 60) * 10) / 10, freeHours: Math.round((free / 60) * 10) / 10 };
  });
}

/** Patterns by weekday over the last `weeks` weeks: completions and calendar load. */
export function weekdayPatterns(data: LifeData, today: LocalDate, weeks = 6) {
  const tz = data.profile.timezone;
  const span = dateRange(addDays(today, -(weeks * 7 - 1)), weeks * 7);
  const rows = Array.from({ length: 7 }, (_, wd) => ({ weekday: wd, completed: 0, eventHours: 0, days: 0 }));
  for (const date of span) {
    const r = rows[weekdayOf(date)];
    r.days++;
    r.eventHours += totalMinutes(eventBlocksForDay(data.events, date, tz).timed) / 60;
  }
  for (const t of data.tasks) {
    if (!t.completedAt) continue;
    const d = localDateOf(t.completedAt, tz);
    if (compareLocal(d, span[0]) >= 0 && compareLocal(d, today) <= 0) rows[weekdayOf(d)].completed++;
  }
  const order = Array.from({ length: 7 }, (_, i) => (i + data.profile.weekStartsOn) % 7);
  return order.map((wd) => {
    const r = rows[wd];
    return { weekday: wd, avgCompleted: r.days ? Math.round((r.completed / r.days) * 10) / 10 : 0, completed: r.completed, avgEventHours: r.days ? Math.round((r.eventHours / r.days) * 10) / 10 : 0 };
  });
}

export function planStats(data: LifeData) {
  const accepted = data.dailyPlans.filter((p) => p.status === "accepted").length;
  const rejected = data.dailyPlans.filter((p) => p.status === "rejected").length;
  return { accepted, rejected, total: data.dailyPlans.length };
}
