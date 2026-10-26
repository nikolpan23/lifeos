import { addDays, compareLocal, dateRange, diffDays, weekdayOf, type LocalDate } from "@/lib/dates";
import type { Habit, HabitCompletion } from "./types";

export function isScheduledOn(habit: Pick<Habit, "schedule" | "startDate">, date: LocalDate): boolean {
  if (compareLocal(date, habit.startDate) < 0) return false;
  if (habit.schedule.type === "daily") return true;
  return habit.schedule.days.includes(weekdayOf(date));
}

export function completionSet(habitId: string, completions: HabitCompletion[]): Set<LocalDate> {
  const set = new Set<LocalDate>();
  for (const c of completions) if (c.habitId === habitId) set.add(c.date);
  return set;
}

/**
 * Consecutive scheduled days completed, counting back from today.
 * An unfinished *today* never breaks the streak: the day isn't over yet.
 */
export function currentStreak(habit: Habit, completions: HabitCompletion[], today: LocalDate): number {
  const done = completionSet(habit.id, completions);
  let streak = 0;
  let cursor = today;
  if (isScheduledOn(habit, today) && done.has(today)) streak++;
  cursor = addDays(today, -1);
  // Guard: never walk further back than the habit's start (or ~3 years).
  const limit = Math.min(diffDays(habit.startDate, today), 1100);
  for (let i = 0; i < limit; i++) {
    if (compareLocal(cursor, habit.startDate) < 0) break;
    if (isScheduledOn(habit, cursor)) {
      if (!done.has(cursor)) break;
      streak++;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(habit: Habit, completions: HabitCompletion[], today: LocalDate): number {
  const done = completionSet(habit.id, completions);
  const span = Math.min(diffDays(habit.startDate, today), 1100);
  let best = 0;
  let run = 0;
  for (let i = span; i >= 0; i--) {
    const day = addDays(today, -i);
    if (!isScheduledOn(habit, day)) continue;
    if (done.has(day)) {
      run++;
      best = Math.max(best, run);
    } else if (day !== today) {
      run = 0;
    }
  }
  return best;
}

/** Share of scheduled days completed within the window ending today (today counts only if done). */
export function consistency(habit: Habit, completions: HabitCompletion[], today: LocalDate, days = 30): { done: number; scheduled: number; rate: number } {
  const set = completionSet(habit.id, completions);
  let scheduled = 0;
  let done = 0;
  for (const day of dateRange(addDays(today, -(days - 1)), days)) {
    if (!isScheduledOn(habit, day)) continue;
    if (day === today && !set.has(day)) continue;
    scheduled++;
    if (set.has(day)) done++;
  }
  return { done, scheduled, rate: scheduled ? done / scheduled : 0 };
}

export type DayCell = { date: LocalDate; scheduled: boolean; done: boolean; future: boolean };

export function weekCells(habit: Habit, completions: HabitCompletion[], weekStart: LocalDate, today: LocalDate): DayCell[] {
  const set = completionSet(habit.id, completions);
  return dateRange(weekStart, 7).map((date) => ({
    date,
    scheduled: isScheduledOn(habit, date),
    done: set.has(date),
    future: compareLocal(date, today) > 0,
  }));
}

export function habitsDueOn(habits: Habit[], date: LocalDate): Habit[] {
  return habits.filter((h) => h.status === "active" && isScheduledOn(h, date));
}

export function completionId(habitId: string, date: LocalDate): string {
  return `${habitId}_${date}`;
}

export function scheduleLabel(habit: Pick<Habit, "schedule">): string {
  if (habit.schedule.type === "daily") return "Every day";
  const days = [...habit.schedule.days].sort();
  if (days.length === 5 && days.every((d, i) => d === i + 1)) return "Weekdays";
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return "Weekends";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.map((d) => names[d]).join(", ");
}

/** Gentle, non-judgemental encouragement based on the streak. */
export function streakMessage(streak: number, doneToday: boolean, scheduledToday = true): string {
  if (doneToday && streak >= 7) return `${streak} in a row. Lovely rhythm.`;
  if (doneToday) return "Done for today. Nice.";
  if (!scheduledToday) return streak > 0 ? `${streak} in a row so far. Today is a rest day for this one.` : "Not scheduled today.";
  if (streak > 0) return `${streak} in a row. Today keeps it going.`;
  return "Every day is a fresh start.";
}
