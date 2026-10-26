import { describe, expect, it } from "vitest";
import { buildPlan, planIsValid, rankCandidates, type PlannerInput } from "@/lib/scheduling/planner";
import { dayAvailability } from "@/lib/scheduling/free-time";
import { createDemoData } from "@/lib/data/demo-seed";
import { DEFAULT_PLANNING, type CalendarEvent, type Task } from "@/lib/domain/types";
import { zonedToISO } from "@/lib/dates";

const tz = "Europe/Athens";
const today = "2026-10-26";
const stamp = { createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z" };
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id, title: id, notes: "", status: "open", priority: "medium", dueDate: today, dueTime: null, estimateMinutes: 60, categoryId: null, goalId: null, completedAt: null, ...stamp, ...extra,
});
const event = (id: string, start: string, end: string): CalendarEvent => ({
  id, title: id, description: "", location: "", categoryId: null, allDay: false, start: zonedToISO(today, start, tz), end: zonedToISO(today, end, tz), startDate: null, endDate: null, ...stamp,
});
const input = (over: Partial<PlannerInput> = {}): PlannerInput => ({
  date: today, timezone: tz, planning: DEFAULT_PLANNING, tasks: [], events: [], habits: [], goals: [], now: new Date(zonedToISO(today, "08:00", tz)), ...over,
});
const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start < b.end && b.start < a.end;

describe("rule-based planner", () => {
  it("ranks overdue and high-priority tasks first", () => {
    const ranked = rankCandidates({ date: today, goals: [], tasks: [task("later", { dueDate: "2026-10-30", priority: "low" }), task("overdue", { dueDate: "2026-10-20" }), task("high", { priority: "high" })] });
    expect(ranked.map((c) => c.task.id).slice(0, 2)).toEqual(expect.arrayContaining(["overdue", "high"]));
    expect(ranked.at(-1)?.task.id).toBe("later");
  });

  it("never places tasks over events, habits or each other", () => {
    const events = [event("standup", "09:30", "09:45"), event("lunch", "12:30", "13:30"), event("call", "15:00", "15:30")];
    const tasks = [task("a", { estimateMinutes: 120, priority: "high" }), task("b", { estimateMinutes: 45 }), task("c", { estimateMinutes: 30 }), task("d", { estimateMinutes: 200 })];
    const plan = buildPlan(input({ events, tasks }));
    expect(planIsValid(plan.items)).toBe(true);
    const placed = plan.items.filter((i) => i.kind === "task");
    expect(placed.length).toBeGreaterThan(0);
    for (const p of placed) for (const e of events) expect(overlaps(p, e)).toBe(false);
    // stays inside working hours
    for (const p of placed) {
      expect(p.start >= zonedToISO(today, "09:00", tz)).toBe(true);
      expect(p.end <= zonedToISO(today, "17:30", tz)).toBe(true);
    }
  });

  it("splits long tasks into focus blocks with breaks", () => {
    const plan = buildPlan(input({ tasks: [task("deep", { estimateMinutes: 180 })] }));
    const sessions = plan.items.filter((i) => i.kind === "task" && i.refId === "deep");
    expect(sessions.length).toBeGreaterThan(1);
    for (const s of sessions) expect((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000).toBeLessThanOrEqual(DEFAULT_PLANNING.focusBlockMinutes);
  });

  it("reports what doesn't fit instead of overbooking", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => task(`t${i}`, { estimateMinutes: 90 }));
    const plan = buildPlan(input({ tasks }));
    expect(plan.unscheduledTaskIds.length).toBeGreaterThan(0);
    expect(plan.plannedMinutes).toBeLessThanOrEqual(plan.freeMinutes);
  });

  it("doesn't plan into the past", () => {
    const now = new Date(zonedToISO(today, "14:07", tz));
    const plan = buildPlan(input({ tasks: [task("a")], now }));
    for (const i of plan.items.filter((x) => x.kind === "task")) expect(new Date(i.start).getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it("follows an AI-proposed order but keeps placement deterministic", () => {
    const tasks = [task("a", { priority: "high" }), task("b"), task("c")];
    const plan = buildPlan(input({ tasks }), { taskIds: ["c", "a"], reasons: { c: "Quick win first" } });
    const order = plan.items.filter((i) => i.kind === "task").map((i) => i.refId);
    expect(order[0]).toBe("c");
    expect(plan.items.find((i) => i.refId === "c")?.reason).toBe("Quick win first");
    expect(planIsValid(plan.items)).toBe(true);
  });

  it("works on the full demo dataset without overlaps", () => {
    const data = createDemoData(today, tz, new Date(zonedToISO(today, "08:00", tz)));
    const plan = buildPlan(input({ tasks: data.tasks, events: data.events, habits: data.habits, goals: data.goals }));
    expect(planIsValid(plan.items)).toBe(true);
    const busy = dayAvailability({ date: today, timezone: tz, planning: DEFAULT_PLANNING, events: data.events, habits: data.habits }).busy;
    for (const p of plan.items.filter((i) => i.kind === "task"))
      for (const b of busy) expect(new Date(p.start).getTime() < b.end && b.start < new Date(p.end).getTime()).toBe(false);
  });
});
