"use client";

import { useCallback, useState } from "react";
import { useAccount } from "@/components/layout/account-context";
import { useLife, useMode } from "@/lib/data/store";
import { wallTimeOf, type LocalDate } from "@/lib/dates";
import { buildPlan, type PlanResult } from "@/lib/scheduling/planner";
import type { PlanRequest, PlanResponse } from "@/lib/ai/plan-contract";

export interface GeneratedPlan extends PlanResult {
  date: LocalDate;
  source: "rules" | "ai";
  aiSummary: string | null;
  /** Why AI wasn't used, when it wasn't. */
  aiNote: string | null;
}

export function usePlanner() {
  const data = useLife((d) => d);
  const mode = useMode();
  const { aiConfigured } = useAccount();
  const [loading, setLoading] = useState(false);
  const aiEnabled = mode === "live" && aiConfigured && data.profile.aiConsent;

  const generate = useCallback(
    async (date: LocalDate, isToday: boolean, order?: string[]): Promise<GeneratedPlan> => {
      const input = {
        date,
        timezone: data.profile.timezone,
        planning: data.profile.planning,
        tasks: data.tasks,
        events: data.events,
        habits: data.habits,
        goals: data.goals,
        now: isToday ? new Date() : undefined,
      };
      // Manual edits: re-place the user's chosen tasks, no AI involved.
      if (order) return { ...buildPlan(input, { taskIds: order }), date, source: "rules", aiSummary: null, aiNote: null };

      const base = buildPlan(input);
      if (!aiEnabled) {
        const aiNote =
          mode === "demo"
            ? "Demo mode uses the built-in rule-based planner."
            : !aiConfigured
              ? "AI planning isn't configured on this server, so the rule-based planner was used."
              : "AI suggestions are off. You can turn them on in Settings.";
        return { ...base, date, source: "rules", aiSummary: null, aiNote };
      }

      setLoading(true);
      try {
        const goals = new Map(data.goals.map((g) => [g.id, g.title]));
        const tz = data.profile.timezone;
        const body: PlanRequest = {
          date,
          timezone: tz,
          freeMinutes: Math.round(base.freeMinutes),
          candidates: base.candidates.slice(0, 40).map((c) => ({
            id: c.task.id,
            title: c.task.title,
            priority: c.task.priority,
            dueDate: c.task.dueDate,
            dueTime: c.task.dueTime,
            estimateMinutes: c.estimate,
            goal: c.task.goalId ? (goals.get(c.task.goalId) ?? null) : null,
            ruleReason: c.reason.slice(0, 300),
          })),
          commitments: base.items
            .filter((i) => i.kind === "event" || i.kind === "habit")
            .slice(0, 40)
            .map((i) => ({ title: i.title.slice(0, 160), start: wallTimeOf(i.start, tz), end: wallTimeOf(i.end, tz), kind: i.kind as "event" | "habit" })),
        };
        const res = await fetch("/api/ai/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = (await res.json()) as PlanResponse;
        if (!json.ok) return { ...base, date, source: "rules", aiSummary: null, aiNote: `${json.message} The rule-based planner was used instead.` };
        // Claude only proposes order and wording; placement stays deterministic.
        const planned = buildPlan(input, { taskIds: json.order, reasons: json.reasons });
        return { ...planned, date, source: "ai", aiSummary: json.summary, aiNote: `AI suggestions used. ${json.remaining} left today.` };
      } catch {
        return { ...base, date, source: "rules", aiSummary: null, aiNote: "AI suggestions are unavailable right now, so the rule-based planner was used." };
      } finally {
        setLoading(false);
      }
    },
    [data, aiEnabled, aiConfigured, mode],
  );

  return { generate, loading, aiEnabled };
}
