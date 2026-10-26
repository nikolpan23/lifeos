import { describe, expect, it } from "vitest";
import { renderMarkdown, plainExcerpt } from "@/lib/markdown";
import { safeNext } from "@/lib/auth/safe-next";
import { aiPlanSchema, planRequestSchema } from "@/lib/ai/plan-contract";

describe("markdown sanitising", () => {
  it("keeps formatting", () => {
    const html = renderMarkdown("# Title\n\n**bold** and [link](https://example.com)");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="https://example.com"');
  });
  it("strips scripts, event handlers and dangerous links", () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)"> [x](javascript:alert(1)) <iframe src="https://evil"></iframe>');
    expect(html).not.toMatch(/<script|onerror|javascript:|<iframe/i);
  });
  it("makes plain excerpts", () => {
    expect(plainExcerpt("## Hi\n\n- one\n- **two**")).not.toMatch(/[#*]/);
  });
});

describe("redirect targets", () => {
  it("only allows in-app paths", () => {
    expect(safeNext("/app/tasks?view=today")).toBe("/app/tasks?view=today");
    expect(safeNext("/onboarding")).toBe("/onboarding");
    expect(safeNext("//evil.com")).toBe("/app");
    expect(safeNext("https://evil.com")).toBe("/app");
    expect(safeNext("/\\evil.com")).toBe("/app");
    expect(safeNext("/demo")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});

describe("AI contract", () => {
  it("rejects oversized or malformed requests", () => {
    const big = { date: "2026-10-26", timezone: "UTC", freeMinutes: 60, commitments: [], candidates: Array.from({ length: 41 }, (_, i) => ({ id: `t${i}`, title: "x", priority: "low", dueDate: null, dueTime: null, estimateMinutes: 30, goal: null, ruleReason: "" })) };
    expect(planRequestSchema.safeParse(big).success).toBe(false);
    expect(planRequestSchema.safeParse({ ...big, candidates: [{ ...big.candidates[0], id: "bad id!" }] }).success).toBe(false);
  });
  it("rejects model output that doesn't match the contract", () => {
    expect(aiPlanSchema.safeParse({ order: ["a"], reasons: [], summary: "ok" }).success).toBe(true);
    expect(aiPlanSchema.safeParse({ order: "a", reasons: [], summary: "ok" }).success).toBe(false);
    expect(aiPlanSchema.safeParse({ order: [], reasons: [], summary: "x".repeat(401) }).success).toBe(false);
  });
});
