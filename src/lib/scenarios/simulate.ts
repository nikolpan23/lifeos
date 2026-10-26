import { addDays, compareLocal, dateRange, endOfLocalDay, localDateOf, startOfLocalDay, weekdayOf, zonedToISO, type LocalDate } from "@/lib/dates";
import type { CalendarEvent, LifeData, Scenario, ScenarioChange, Task } from "@/lib/domain/types";
import { findOverlappingPairs } from "@/lib/scheduling/conflicts";
import { dayAvailability, eventBlocksForDay, habitBlocks } from "@/lib/scheduling/free-time";
import { overlaps, toInterval, totalMinutes } from "@/lib/scheduling/intervals";
import { DEFAULT_ESTIMATE_MINUTES } from "@/lib/scheduling/planner";
import type { Op } from "@/lib/data/ops";

export interface DayMetrics {
  date: LocalDate;
  scheduledMinutes: number;
  freeMinutes: number;
  dueMinutes: number;
}

export interface Metrics {
  scheduledHours: number;
  availableHours: number;
  conflicts: number;
  /** Estimated task + project work due in the horizon, in hours. */
  workloadHours: number;
  /** Workload divided by available planning time (0..∞). */
  pressure: number;
  atRiskTaskIds: string[];
  days: DayMetrics[];
}

export interface SimulationResult {
  horizon: LocalDate[];
  before: Metrics;
  after: Metrics;
  hypotheticalEvents: CalendarEvent[];
  newConflicts: { a: string; b: string; date: LocalDate }[];
  affectedGoals: { id: string; title: string; why: string }[];
  expenses: { label: string; amount: number }[];
  totalExpense: number;
  assumptions: string[];
}

export type PressureLevel = "low" | "moderate" | "high" | "overloaded";

export function pressureLevel(p: number): PressureLevel {
  if (p < 0.5) return "low";
  if (p < 0.85) return "moderate";
  if (p <= 1) return "high";
  return "overloaded";
}

const HYPO_STAMP = "1970-01-01T00:00:00.000Z";

/** Materialise hypothetical events for a change within the horizon. Pure, never touches real data. */
export function eventsForChange(change: ScenarioChange, horizon: LocalDate[], tz: string): CalendarEvent[] {
  const base = { description: "", location: "", createdAt: HYPO_STAMP, updatedAt: HYPO_STAMP };
  if (change.type === "recurring_commitment") {
    return horizon
      .filter((d) => change.days.includes(weekdayOf(d)))
      .map((d) => {
        const start = zonedToISO(d, change.startTime, tz);
        return {
          ...base,
          id: `hypo-${change.id}-${d}`,
          title: change.title,
          categoryId: change.categoryId,
          allDay: false,
          start,
          end: new Date(new Date(start).getTime() + change.durationMinutes * 60_000).toISOString(),
          startDate: null,
          endDate: null,
        };
      });
  }
  if (change.type === "one_off_event") {
    if (change.allDay) {
      return [
        {
          ...base,
          id: `hypo-${change.id}`,
          title: change.title,
          categoryId: change.categoryId,
          allDay: true,
          start: startOfLocalDay(change.startDate, tz).toISOString(),
          end: endOfLocalDay(change.endDate, tz).toISOString(),
          startDate: change.startDate,
          endDate: change.endDate,
        },
      ];
    }
    return [
      {
        ...base,
        id: `hypo-${change.id}`,
        title: change.title,
        categoryId: change.categoryId,
        allDay: false,
        start: zonedToISO(change.startDate, change.startTime!, tz),
        end: zonedToISO(change.endDate, change.endTime!, tz),
        startDate: null,
        endDate: null,
      },
    ];
  }
  return [];
}

/**
 * An all-day trip blocks planning time on those days. Represented as a busy
 * block covering the whole day so availability drops to zero.
 */
function awayDays(events: CalendarEvent[]): Set<LocalDate> {
  const set = new Set<LocalDate>();
  for (const e of events) {
    if (!e.allDay || !e.id.startsWith("hypo-") || !e.startDate || !e.endDate) continue;
    for (let d = e.startDate; compareLocal(d, e.endDate) <= 0; d = addDays(d, 1)) set.add(d);
  }
  return set;
}

function measure(data: LifeData, events: CalendarEvent[], tasks: Task[], horizon: LocalDate[], extraWork: { minutes: number; byDate: LocalDate }[], now: Date): Metrics {
  const tz = data.profile.timezone;
  const away = awayDays(events);
  const today = horizon[0];
  const days: DayMetrics[] = horizon.map((date) => {
    const { timed } = eventBlocksForDay(events, date, tz);
    const habits = habitBlocks(data.habits, date, tz);
    const dayStart = startOfLocalDay(date, tz).getTime();
    const dayEnd = endOfLocalDay(date, tz).getTime();
    const clipped = [...timed, ...habits].map((b) => ({ start: Math.max(b.start, dayStart), end: Math.min(b.end, dayEnd) }));
    const avail = away.has(date)
      ? { freeMinutes: 0 }
      : dayAvailability({ date, timezone: tz, planning: data.profile.planning, events, habits: data.habits, now: date === today ? now : undefined });
    const due = tasks.filter((t) => t.status === "open" && t.dueDate === date).reduce((s, t) => s + (t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES), 0);
    const extra = extraWork.filter((w) => w.byDate === date).reduce((s, w) => s + w.minutes, 0);
    return { date, scheduledMinutes: totalMinutes(clipped), freeMinutes: avail.freeMinutes, dueMinutes: due + extra };
  });

  // Overdue work counts against the first day.
  const overdue = tasks.filter((t) => t.status === "open" && t.dueDate && compareLocal(t.dueDate, today) < 0).reduce((s, t) => s + (t.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES), 0);
  if (days.length) days[0] = { ...days[0], dueMinutes: days[0].dueMinutes + overdue };

  // Feasibility: by each deadline, has there been enough cumulative free time for all work due so far?
  const atRisk: string[] = [];
  let cumFree = 0;
  let cumDue = 0;
  for (const d of days) {
    cumFree += d.freeMinutes;
    cumDue += d.dueMinutes;
    if (cumDue > cumFree) {
      for (const t of tasks) if (t.status === "open" && t.dueDate === d.date) atRisk.push(t.id);
    }
  }

  const horizonEnd = endOfLocalDay(horizon[horizon.length - 1], tz).getTime();
  const horizonStart = startOfLocalDay(horizon[0], tz).getTime();
  const inHorizon = events.filter((e) => !e.allDay && toInterval(e.start, e.end).end > horizonStart && toInterval(e.start, e.end).start < horizonEnd);
  let conflicts = findOverlappingPairs(inHorizon).length;
  // Habit clashes count too.
  for (const date of horizon) {
    for (const hb of habitBlocks(data.habits, date, tz)) {
      if (inHorizon.some((e) => overlaps(toInterval(e.start, e.end), hb))) conflicts++;
    }
  }

  const available = days.reduce((s, d) => s + d.freeMinutes, 0);
  const workload = days.reduce((s, d) => s + d.dueMinutes, 0);
  return {
    scheduledHours: round1(days.reduce((s, d) => s + d.scheduledMinutes, 0) / 60),
    availableHours: round1(available / 60),
    conflicts,
    workloadHours: round1(workload / 60),
    pressure: available ? workload / available : workload ? Infinity : 0,
    atRiskTaskIds: atRisk,
    days,
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function simulate(input: LifeData, scenario: Pick<Scenario, "horizonStart" | "horizonDays" | "changes">, now = new Date()): SimulationResult {
  // New commitments often land outside work, so What-If measures free time across waking hours.
  const data: LifeData = { ...input, profile: { ...input.profile, planning: { ...input.profile.planning, planWithin: "waking_hours" } } };
  const tz = data.profile.timezone;
  const horizon = dateRange(scenario.horizonStart, scenario.horizonDays);
  const last = horizon[horizon.length - 1];
  const assumptions: string[] = [
    `Looks at ${scenario.horizonDays} days from ${scenario.horizonStart}. Free time is counted across your waking hours (${data.profile.planning.wakeTime ?? "07:00"}–${data.profile.planning.sleepTime ?? "23:00"}), minus events and scheduled habits.`,
    `Tasks without an estimate count as ${DEFAULT_ESTIMATE_MINUTES} minutes.`,
    "Scheduled habits with a time and duration count as busy time.",
  ];

  const before = measure(data, data.events, data.tasks, horizon, [], now);

  let events = [...data.events];
  let tasks = [...data.tasks];
  const hypothetical: CalendarEvent[] = [];
  const extraWork: { minutes: number; byDate: LocalDate }[] = [];
  const expenses: { label: string; amount: number }[] = [];
  const goalImpacts = new Map<string, string>();

  for (const change of scenario.changes) {
    switch (change.type) {
      case "recurring_commitment":
      case "one_off_event": {
        const evs = eventsForChange(change, horizon, tz);
        hypothetical.push(...evs);
        events = [...events, ...evs];
        if (change.expense) {
          const amount = change.type === "recurring_commitment" ? change.expense * evs.length : change.expense;
          expenses.push({ label: change.type === "recurring_commitment" ? `${change.title} (${evs.length} × ${change.expense})` : change.title, amount });
        }
        if (change.type === "one_off_event" && change.allDay) assumptions.push(`“${change.title}” is treated as a day away with no planning time.`);
        break;
      }
      case "project_workload": {
        const end = change.deadline && compareLocal(change.deadline, last) < 0 ? change.deadline : last;
        const workDays = horizon.filter((d) => compareLocal(d, end) <= 0);
        const totalMinutes = Math.round(((change.hoursPerWeek * 60) / 7) * workDays.length);
        // Spread evenly as daily demand; if a deadline sits inside the horizon, it's all due by then.
        const perDay = Math.round(totalMinutes / Math.max(1, workDays.length));
        for (const d of workDays) extraWork.push({ minutes: perDay, byDate: d });
        if (change.expense) expenses.push({ label: change.title, amount: change.expense });
        if (change.goalId) goalImpacts.set(change.goalId, `Adds about ${change.hoursPerWeek} h/week of work toward it`);
        assumptions.push(`“${change.title}” adds ${change.hoursPerWeek} hours per week, spread evenly${change.deadline ? ` until ${change.deadline}` : ""}.`);
        break;
      }
      case "move_deadline": {
        tasks = tasks.map((t) => (t.id === change.taskId ? { ...t, dueDate: change.newDueDate } : t));
        break;
      }
      case "remove_event": {
        events = events.filter((e) => e.id !== change.eventId);
        break;
      }
    }
  }

  const after = measure(data, events, tasks, horizon, extraWork, now);

  // New conflicts: overlaps that involve a hypothetical event.
  const hypoIds = new Set(hypothetical.map((e) => e.id));
  const newConflicts = findOverlappingPairs(events.filter((e) => !e.allDay))
    .filter((p) => hypoIds.has(p.a.id) || hypoIds.has(p.b.id))
    .map((p) => ({ a: p.a.title, b: p.b.title, date: localDateOf(p.a.start, tz) }));
  for (const h of hypothetical.filter((e) => !e.allDay)) {
    for (const date of horizon) {
      for (const hb of habitBlocks(data.habits, date, tz)) {
        if (overlaps(toInterval(h.start, h.end), hb)) newConflicts.push({ a: h.title, b: hb.title, date });
      }
    }
  }

  // Goals affected: tasks newly at risk that link to goals, plus milestones in the horizon on days that lost time.
  const newlyAtRisk = after.atRiskTaskIds.filter((id) => !before.atRiskTaskIds.includes(id));
  for (const id of newlyAtRisk) {
    const t = tasks.find((x) => x.id === id);
    if (t?.goalId) goalImpacts.set(t.goalId, `“${t.title}” may no longer fit before its due date`);
  }
  for (const m of data.milestones) {
    if (m.completedAt || !m.dueDate || !horizon.includes(m.dueDate)) continue;
    const b = before.days.filter((d) => compareLocal(d.date, m.dueDate!) <= 0).reduce((s, d) => s + d.freeMinutes, 0);
    const a = after.days.filter((d) => compareLocal(d.date, m.dueDate!) <= 0).reduce((s, d) => s + d.freeMinutes, 0);
    if (a < b - 60 && !goalImpacts.has(m.goalId)) goalImpacts.set(m.goalId, `${Math.round((b - a) / 60)} fewer free hours before milestone “${m.title}”`);
  }
  for (const change of scenario.changes) {
    if (change.type === "move_deadline") {
      const t = data.tasks.find((x) => x.id === change.taskId);
      if (t?.goalId && !goalImpacts.has(t.goalId)) goalImpacts.set(t.goalId, `Deadline for “${t.title}” moves to ${change.newDueDate}`);
    }
  }
  const affectedGoals = [...goalImpacts.entries()]
    .map(([id, why]) => ({ id, why, title: data.goals.find((g) => g.id === id)?.title ?? "" }))
    .filter((g) => g.title);

  return {
    horizon,
    before,
    after,
    hypotheticalEvents: hypothetical,
    newConflicts,
    affectedGoals,
    expenses,
    totalExpense: expenses.reduce((s, e) => s + e.amount, 0),
    assumptions,
  };
}

/** Real operations to commit when the user confirms Apply Changes. */
export function opsForScenario(data: LifeData, scenario: Scenario, idFactory: () => string, nowIso: string): { ops: Op[]; summary: string[] } {
  const tz = data.profile.timezone;
  const horizon = dateRange(scenario.horizonStart, scenario.horizonDays);
  const ops: Op[] = [];
  const summary: string[] = [];
  const stamp = { createdAt: nowIso, updatedAt: nowIso };
  for (const change of scenario.changes) {
    switch (change.type) {
      case "recurring_commitment":
      case "one_off_event": {
        const evs = eventsForChange(change, horizon, tz);
        for (const e of evs) ops.push({ type: "put", collection: "events", record: { ...e, id: idFactory(), ...stamp } });
        summary.push(change.type === "recurring_commitment" ? `Add ${evs.length} “${change.title}” event${evs.length === 1 ? "" : "s"} to your calendar` : `Add “${change.title}” to your calendar`);
        break;
      }
      case "project_workload": {
        const end = change.deadline && compareLocal(change.deadline, horizon[horizon.length - 1]) < 0 ? change.deadline : horizon[horizon.length - 1];
        const weeks = Math.max(1, Math.ceil(horizon.filter((d) => compareLocal(d, end) <= 0).length / 7));
        for (let w = 0; w < weeks; w++) {
          const due = w === weeks - 1 ? end : addDays(scenario.horizonStart, w * 7 + 6);
          ops.push({
            type: "put",
            collection: "tasks",
            record: {
              id: idFactory(),
              title: weeks > 1 ? `${change.title} (week ${w + 1})` : change.title,
              notes: `Created from What-If scenario “${scenario.title}”.`,
              status: "open",
              priority: "medium",
              dueDate: due,
              dueTime: null,
              estimateMinutes: Math.min(960, Math.round(change.hoursPerWeek * 60)),
              categoryId: null,
              goalId: change.goalId && data.goals.some((g) => g.id === change.goalId) ? change.goalId : null,
              completedAt: null,
              ...stamp,
            },
          });
        }
        summary.push(`Create ${weeks} task${weeks === 1 ? "" : "s"} for “${change.title}”`);
        break;
      }
      case "move_deadline": {
        const t = data.tasks.find((x) => x.id === change.taskId);
        if (!t) {
          summary.push("Skip a deadline change: that task no longer exists");
          break;
        }
        ops.push({ type: "patch", collection: "tasks", id: t.id, patch: { dueDate: change.newDueDate, updatedAt: nowIso } });
        summary.push(`Move “${t.title}” to ${change.newDueDate}`);
        break;
      }
      case "remove_event": {
        const e = data.events.find((x) => x.id === change.eventId);
        if (!e) {
          summary.push("Skip removing an event: it no longer exists");
          break;
        }
        ops.push({ type: "delete", collection: "events", id: e.id });
        summary.push(`Remove “${e.title}” from your calendar`);
        break;
      }
    }
  }
  return { ops, summary };
}
