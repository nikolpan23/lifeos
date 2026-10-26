import { describe, expect, it } from "vitest";
import { bestStreak, completionId, consistency, currentStreak, isScheduledOn, streakMessage } from "@/lib/domain/habits";
import type { Habit, HabitCompletion } from "@/lib/domain/types";

const stamp = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const habit = (schedule: Habit["schedule"]): Habit => ({
  id: "h", name: "Walk", description: "", categoryId: null, goalId: null, schedule, preferredTime: null, durationMinutes: null, status: "active", startDate: "2026-10-01", ...stamp,
});
const done = (...dates: string[]): HabitCompletion[] => dates.map((date) => ({ id: completionId("h", date), habitId: "h", date, ...stamp }));

describe("habit schedules", () => {
  it("respects start date and weekdays", () => {
    const h = habit({ type: "weekdays", days: [1, 3, 5] });
    expect(isScheduledOn(h, "2026-09-28")).toBe(false); // before start
    expect(isScheduledOn(h, "2026-10-26")).toBe(true); // Monday
    expect(isScheduledOn(h, "2026-10-27")).toBe(false); // Tuesday
  });
});

describe("streaks", () => {
  const today = "2026-10-26";
  it("counts consecutive days and isn't broken by an unfinished today", () => {
    const h = habit({ type: "daily" });
    expect(currentStreak(h, done("2026-10-23", "2026-10-24", "2026-10-25"), today)).toBe(3);
    expect(currentStreak(h, done("2026-10-24", "2026-10-25", "2026-10-26"), today)).toBe(3);
  });
  it("resets after a missed scheduled day", () => {
    const h = habit({ type: "daily" });
    expect(currentStreak(h, done("2026-10-22", "2026-10-23", "2026-10-25"), today)).toBe(1);
  });
  it("skips days that weren't scheduled", () => {
    const h = habit({ type: "weekdays", days: [1, 3, 5] }); // Mon, Wed, Fri
    expect(currentStreak(h, done("2026-10-19", "2026-10-21", "2026-10-23"), today)).toBe(3);
  });
  it("tracks the best run and consistency", () => {
    const h = habit({ type: "daily" });
    const c = done("2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-20", "2026-10-21");
    expect(bestStreak(h, c, today)).toBe(4);
    const r = consistency(h, c, today, 7);
    expect(r.scheduled).toBe(6); // an unfinished today doesn't count against you
    expect(r.done).toBe(2);
  });
  it("uses encouraging wording", () => {
    expect(streakMessage(0, false)).not.toMatch(/fail|broke|lost/i);
    expect(streakMessage(5, false)).toMatch(/5/);
  });
});
