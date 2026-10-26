import { z } from "zod";
import { id, localDate, wallTime } from "@/lib/domain/schemas";

/** What the browser sends to /api/ai/plan. Only fields the model needs; no notes or descriptions. */
export const planRequestSchema = z.object({
  date: localDate,
  timezone: z.string().min(1).max(64),
  freeMinutes: z.number().min(0).max(24 * 60),
  candidates: z
    .array(
      z.object({
        id,
        title: z.string().max(200),
        priority: z.enum(["low", "medium", "high"]),
        dueDate: localDate.nullable(),
        dueTime: wallTime.nullable(),
        estimateMinutes: z.number().int().min(1).max(960),
        goal: z.string().max(120).nullable(),
        ruleReason: z.string().max(300),
      }),
    )
    .max(40),
  commitments: z.array(z.object({ title: z.string().max(160), start: wallTime, end: wallTime, kind: z.enum(["event", "habit"]) })).max(40),
});
export type PlanRequest = z.infer<typeof planRequestSchema>;

/** What the model must return. Validated strictly; anything else is discarded. */
export const aiPlanSchema = z.object({
  order: z.array(z.string()).max(40),
  reasons: z.array(z.object({ id: z.string(), reason: z.string().max(240) })).max(40),
  summary: z.string().max(400),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;

export type PlanResponse =
  | { ok: true; source: "ai"; order: string[]; reasons: Record<string, string>; summary: string; remaining: number }
  | { ok: false; reason: "not_configured" | "no_consent" | "rate_limited" | "unauthorized" | "invalid_request" | "ai_error"; message: string };
