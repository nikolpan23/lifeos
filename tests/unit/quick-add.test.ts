import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "@/lib/domain/quick-add";

const today = "2026-10-26"; // Monday

describe("quick add", () => {
  it("pulls out dates, priority and duration", () => {
    expect(parseQuickAdd("Call mum tomorrow 15m !", today)).toEqual({ title: "Call mum", dueDate: "2026-10-27", priority: "high", estimateMinutes: 15 });
    expect(parseQuickAdd("Report friday 1.5h !low", today)).toEqual({ title: "Report", dueDate: "2026-10-30", priority: "low", estimateMinutes: 90 });
  });
  it("treats today's weekday name as next week", () => {
    expect(parseQuickAdd("Plan monday", today).dueDate).toBe("2026-11-02");
  });
  it("leaves ordinary words alone and uses the fallback date", () => {
    expect(parseQuickAdd("Buy 2m of rope", today, null)).toEqual({ title: "Buy 2m of rope", dueDate: null, priority: "medium", estimateMinutes: null });
  });
});
