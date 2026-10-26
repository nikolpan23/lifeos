import { compareLocal, diffDays, durationLabel, formatLocalDate, zonedToInstant, type LocalDate } from "@/lib/dates";
import { PRIORITY_WEIGHT } from "@/lib/domain/tasks";
import type { CalendarEvent, Goal, Habit, PlanItem, PlanningPreferences, Task } from "@/lib/domain/types";
import { dayAvailability, type BusyBlock } from "./free-time";
import type { Interval } from "./intervals";

export const DEFAULT_ESTIMATE_MINUTES = 30;

export interface PlannerInput {
  date: LocalDate;
  timezone: string;
  planning: PlanningPreferences;
  tasks: Task[];
  events: CalendarEvent[];
  habits: Habit[];
  goals: Goal[];
  now?: Date;
}

export interface PlanCandidate {
  task: Task;
  score: number;
  reason: string;
  estimate: number;
  estimated: boolean;
}

export interface PlanResult {
  items: PlanItem[];
  unscheduledTaskIds: string[];
  notes: string[];
  summary: string;
  freeMinutes: number;
  plannedMinutes: number;
  candidates: PlanCandidate[];
}

/** Score open tasks for a given day. Higher means more important to do today. */
export function rankCandidates(input: Pick<PlannerInput, "date" | "tasks" | "goals">): PlanCandidate[] {
  const goalTitles = new Map(input.goals.filter((g) => g.status === "active").map((g) => [g.id, g.title]));
  const out: PlanCandidate[] = [];
  for (const task of input.tasks) {
    if (task.status !== "open") continue;
    const estimate = task.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES;
    const estimated = task.estimateMinutes === null;
    let score = PRIORITY_WEIGHT[task.priority] * 10;
    let reason: string;
    if (task.dueDate) {
      const days = diffDays(input.date, task.dueDate);
      if (days < 0) {
        score += 60 + Math.min(-days, 14);
        reason = `Overdue since ${formatLocalDate(task.dueDate, { weekday: "short", month: "short", day: "numeric" })}`;
      } else if (days === 0) {
        score += 50;
        reason = task.dueTime ? `Due today at ${task.dueTime}` : "Due today";
      } else if (days === 1) {
        score += 30;
        reason = "Due tomorrow, so starting today keeps it calm";
      } else if (days <= 3) {
        score += 18 - days;
        reason = `Due in ${days} days`;
      } else if (days <= 7) {
        score += 6;
        reason = `Due ${formatLocalDate(task.dueDate, { weekday: "long" })}`;
      } else {
        score += 1;
        reason = "Coming up later";
      }
    } else {
      reason = "No deadline, good for open time";
    }
    if (task.priority === "high") reason += ", high priority";
    if (task.goalId && goalTitles.has(task.goalId)) {
      score += 4;
      reason += `. Moves “${goalTitles.get(task.goalId)}” forward`;
    }
    if (estimate <= 15) {
      score += 2;
      if (!task.dueDate) reason = "Quick win, about 15 minutes";
    }
    out.push({ task, score, reason, estimate, estimated });
  }
  return out.sort((a, b) => b.score - a.score || compareLocal(a.task.dueDate ?? "9999-12-31", b.task.dueDate ?? "9999-12-31") || a.task.createdAt.localeCompare(b.task.createdAt));
}

/** Only tasks that are plausibly today's work are offered to the planner. */
export function eligibleForDay(c: PlanCandidate, date: LocalDate): boolean {
  if (!c.task.dueDate) return c.score >= 10; // undated tasks are fillers
  return diffDays(date, c.task.dueDate) <= 3 || c.task.priority === "high";
}

interface Slot extends Interval {
  cursor: number;
  runMinutes: number;
}

const MIN = 60_000;

/**
 * Places tasks into free time, deterministically. Never overlaps existing
 * events or scheduled habits; that is guaranteed because placement only
 * happens inside `free` intervals computed by subtracting all busy blocks.
 */
export function buildPlan(input: PlannerInput, order?: { taskIds: string[]; reasons?: Record<string, string> }): PlanResult {
  const availability = dayAvailability({ date: input.date, timezone: input.timezone, planning: input.planning, events: input.events, habits: input.habits, now: input.now });
  const notes = [...availability.assumptions];
  const ranked = rankCandidates(input);
  const byId = new Map(ranked.map((c) => [c.task.id, c]));

  let queue: PlanCandidate[];
  if (order) {
    const seen = new Set<string>();
    queue = [];
    for (const id of order.taskIds) {
      const c = byId.get(id);
      if (c && !seen.has(id)) {
        queue.push(order.reasons?.[id] ? { ...c, reason: order.reasons[id] } : c);
        seen.add(id);
      }
    }
  } else {
    queue = ranked.filter((c) => eligibleForDay(c, input.date));
  }

  const focus = input.planning.focusBlockMinutes;
  const breakMin = input.planning.breakMinutes;
  const slots: Slot[] = availability.free.map((f) => ({ ...f, cursor: f.start, runMinutes: 0 }));
  const items: PlanItem[] = [];
  const unscheduled: string[] = [];
  let plannedMinutes = 0;

  const place = (c: PlanCandidate): boolean => {
    const deadline = c.task.dueDate === input.date && c.task.dueTime ? zonedToInstant(input.date, c.task.dueTime, input.timezone).getTime() : Infinity;
    const duration = c.estimate;
    // Long tasks are split into focus-sized sessions with breaks between them.
    const sessions = duration > focus ? Math.ceil(duration / focus) : 1;
    const sessionLength = Math.ceil(duration / sessions / 5) * 5;
    const placed: { slot: Slot; start: number; end: number }[] = [];
    const snapshot = slots.map((s) => ({ cursor: s.cursor, runMinutes: s.runMinutes }));
    const itemsBefore = items.length;
    for (let s = 0; s < sessions; s++) {
      let ok = false;
      for (const slot of slots) {
        let start = slot.cursor;
        let needsBreak = slot.runMinutes > 0 && slot.runMinutes + sessionLength > focus && breakMin > 0;
        if (needsBreak) start += breakMin * MIN;
        const end = start + sessionLength * MIN;
        if (end > slot.end || end > deadline) continue;
        if (needsBreak) {
          items.push({ id: `break-${slot.cursor}`, kind: "break", refId: null, title: "Break", start: new Date(slot.cursor).toISOString(), end: new Date(start).toISOString(), reason: `A ${breakMin}-minute pause after focused work` });
          slot.runMinutes = 0;
          needsBreak = false;
        }
        placed.push({ slot, start, end });
        slot.cursor = end;
        slot.runMinutes += sessionLength;
        ok = true;
        break;
      }
      if (!ok) {
        // Roll back partial placement (including any breaks it added).
        slots.forEach((slot, i) => Object.assign(slot, snapshot[i]));
        items.length = itemsBefore;
        return false;
      }
    }
    placed.forEach((p, i) => {
      items.push({
        id: `task-${c.task.id}-${i}`,
        kind: "task",
        refId: c.task.id,
        title: sessions > 1 ? `${c.task.title} (part ${i + 1} of ${sessions})` : c.task.title,
        start: new Date(p.start).toISOString(),
        end: new Date(p.end).toISOString(),
        reason: c.reason + (c.estimated ? `. No estimate set, so ${durationLabel(DEFAULT_ESTIMATE_MINUTES)} was assumed` : ""),
      });
    });
    plannedMinutes += sessionLength * sessions;
    return true;
  };

  for (const c of queue) if (!place(c)) unscheduled.push(c.task.id);

  // Fixed commitments still ahead are shown for context; ones already over add nothing.
  const nowMs = input.now?.getTime() ?? -Infinity;
  for (const b of availability.busy) if (new Date(b.end).getTime() > nowMs) items.push(busyToItem(b));
  items.sort((a, b) => a.start.localeCompare(b.start) || kindOrder(a.kind) - kindOrder(b.kind));

  if (queue.some((c) => c.estimated)) notes.push(`Tasks without an estimate were planned as ${DEFAULT_ESTIMATE_MINUTES} minutes.`);
  if (unscheduled.length) notes.push(`${unscheduled.length} task${unscheduled.length === 1 ? "" : "s"} didn't fit into today's free time.`);
  if (availability.allDayEvents.length) notes.push(`All-day: ${availability.allDayEvents.map((e) => e.title).join(", ")}. These weren't treated as busy time.`);

  const taskItems = items.filter((i) => i.kind === "task");
  const summary = !availability.window
    ? "There is no planning window set for this day."
    : availability.free.length === 0
      ? "Your day is already full, so there's no free time left to plan."
      : taskItems.length === 0
        ? "Nothing urgent needs a slot today. Enjoy the breathing room."
        : `${durationLabel(plannedMinutes)} of focused work across ${new Set(taskItems.map((t) => t.refId)).size} task${new Set(taskItems.map((t) => t.refId)).size === 1 ? "" : "s"}, leaving ${durationLabel(Math.max(0, Math.round(availability.freeMinutes - plannedMinutes)))} unplanned.`;

  return { items, unscheduledTaskIds: unscheduled, notes, summary, freeMinutes: availability.freeMinutes, plannedMinutes, candidates: queue };
}

function busyToItem(b: BusyBlock): PlanItem {
  return {
    id: `${b.kind}-${b.refId}-${b.start}`,
    kind: b.kind,
    refId: b.refId,
    title: b.title,
    start: new Date(b.start).toISOString(),
    end: new Date(b.end).toISOString(),
    reason: b.kind === "event" ? "Already on your calendar" : "Scheduled habit",
  };
}

function kindOrder(k: PlanItem["kind"]): number {
  return { event: 0, habit: 1, break: 2, task: 3 }[k];
}

/** Validates an edited or AI-ordered plan: task items must never overlap fixed commitments or each other. */
export function planIsValid(items: PlanItem[]): boolean {
  const flexible = items.filter((i) => i.kind === "task" || i.kind === "break");
  const fixed = items.filter((i) => i.kind === "event" || i.kind === "habit");
  for (const f of flexible) {
    const fs = new Date(f.start).getTime();
    const fe = new Date(f.end).getTime();
    if (fe <= fs) return false;
    for (const x of fixed) if (fs < new Date(x.end).getTime() && new Date(x.start).getTime() < fe) return false;
    for (const y of flexible) if (y !== f && fs < new Date(y.end).getTime() && new Date(y.start).getTime() < fe) return false;
  }
  return true;
}
