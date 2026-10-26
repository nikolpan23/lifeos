import { describe, expect, it } from "vitest";
import { insightKey, isHidden, runRadar } from "@/lib/radar/rules";
import { opsForScenario, simulate } from "@/lib/scenarios/simulate";
import { applyOps } from "@/lib/data/ops";
import { createDemoData } from "@/lib/data/demo-seed";
import { zonedToISO } from "@/lib/dates";

const tz = "Europe/Athens";
const today = "2026-10-26";
const now = new Date(zonedToISO(today, "09:00", tz));
const data = createDemoData(today, tz, now);

describe("Life Radar", () => {
  const insights = runRadar({ data, today, now });

  it("finds the conflicts seeded in the demo", () => {
    const ids = insights.map((i) => i.ruleId);
    expect(ids).toContain("event-overlap");
    expect(ids).toContain("habit-conflict");
    expect(ids).toContain("deadline-cluster");
  });

  it("explains every insight and links to the records involved", () => {
    for (const i of insights) {
      expect(i.explanation.length).toBeGreaterThan(10);
      expect(i.related.length).toBeGreaterThan(0);
      expect(i.action.href.startsWith("/") || i.action.href.startsWith("?") || i.action.href.length > 0).toBe(true);
    }
  });

  it("uses stable keys and honours dismiss and snooze", () => {
    expect(insightKey("x", ["b", "a"])).toBe(insightKey("x", ["a", "b"]));
    const key = insights[0].key;
    const stamp = { createdAt: now.toISOString(), updatedAt: now.toISOString() };
    expect(isHidden(key, [{ id: "1", key, status: "dismissed", snoozedUntil: null, ...stamp }], now)).toBe(true);
    const later = new Date(now.getTime() + 86_400_000).toISOString();
    expect(isHidden(key, [{ id: "1", key, status: "snoozed", snoozedUntil: later, ...stamp }], now)).toBe(true);
    expect(isHidden(key, [{ id: "1", key, status: "snoozed", snoozedUntil: later, ...stamp }], new Date(later))).toBe(false);
  });

  it("is quiet on an empty account", () => {
    const empty = { ...data, tasks: [], events: [], habits: [], habitCompletions: [], goals: [], milestones: [] };
    expect(runRadar({ data: empty, today, now })).toHaveLength(0);
  });
});

describe("What-If simulation", () => {
  const scenario = data.scenarios[0];

  it("compares before and after without touching real data", () => {
    const before = JSON.stringify(data);
    const result = simulate(data, scenario, now);
    expect(JSON.stringify(data)).toBe(before);
    expect(result.after.scheduledHours).toBeGreaterThan(result.before.scheduledHours);
    expect(result.after.availableHours).toBeLessThanOrEqual(result.before.availableHours);
    expect(result.hypotheticalEvents.length).toBeGreaterThan(0);
    expect(result.newConflicts.length).toBeGreaterThan(0);
    expect(result.totalExpense).toBe(result.hypotheticalEvents.length * 12);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("produces ops that create the scenario's events when applied", () => {
    let n = 0;
    const { ops, summary } = opsForScenario(data, scenario, () => `gen-${++n}`, now.toISOString());
    const next = applyOps(data, ops);
    expect(next.events.length).toBeGreaterThan(data.events.length);
    expect(next.events.filter((e) => e.title === "Gym").length).toBeGreaterThan(0);
    expect(summary.length).toBeGreaterThan(0);
  });
});
