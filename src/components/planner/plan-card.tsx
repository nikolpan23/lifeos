"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActions, useLife, useNow, useToday } from "@/lib/data/store";
import { PlanTimeline } from "./plan-timeline";
import { PlanDialog } from "./plan-dialog";
import { usePlanner } from "./use-planner";

export function PlanCard() {
  const today = useToday();
  const now = useNow();
  const router = useRouter();
  const params = useSearchParams();
  const actions = useActions();
  const tz = useLife((d) => d.profile.timezone);
  const plan = useLife((d) => d.dailyPlans.find((p) => p.date === today) ?? null);
  const tasks = useLife((d) => d.tasks);
  const { aiEnabled } = usePlanner();
  const [open, setOpen] = useState(false);

  // Deep link: ?plan=1 opens the planner (used by Life Radar), then the param is cleared.
  const planParam = params.get("plan") === "1";
  const [seenParam, setSeenParam] = useState(false);
  if (planParam !== seenParam) {
    setSeenParam(planParam);
    if (planParam) setOpen(true);
  }
  useEffect(() => {
    if (planParam) router.replace(window.location.pathname, { scroll: false });
  }, [planParam, router]);

  const doneIds = useMemo(() => new Set(tasks.filter((t) => t.status === "done").map((t) => t.id)), [tasks]);
  const accepted = plan?.status === "accepted";
  const remaining = accepted ? plan.items.filter((i) => (i.kind === "task" || i.kind === "break") && new Date(i.end) > now) : [];
  const taskItems = accepted ? plan.items.filter((i) => i.kind === "task") : [];
  const doneCount = taskItems.filter((i) => i.refId && doneIds.has(i.refId)).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Daily plan</CardTitle>
            {accepted && (plan.source === "ai" ? <Badge tone="lavender"><Sparkles className="size-3" aria-hidden /> AI-assisted</Badge> : <Badge><Wand2 className="size-3" aria-hidden /> Rule-based</Badge>)}
          </div>
          <CardDescription>
            {accepted ? `${doneCount} of ${taskItems.length} planned tasks done` : "A realistic plan built around your calendar"}
          </CardDescription>
        </div>
        {accepted && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Re-plan
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {accepted ? (
          remaining.length ? (
            <PlanTimeline items={remaining.slice(0, 6)} tz={tz} doneTaskIds={doneIds} onToggleTask={(id, done) => actions.setTaskDone(id, done)} showFixed={false} />
          ) : (
            <p className="rounded-[12px] bg-soft-green px-4 py-3 text-sm text-ink-green">That’s the end of today’s plan. Nicely done.</p>
          )
        ) : (
          <div className="relative overflow-hidden rounded-[16px] bg-gradient-to-br from-lavender to-soft-blue p-5">
            <p className="max-w-sm text-[15px] leading-relaxed font-medium text-foreground">
              {plan?.status === "rejected" ? "You skipped today’s suggestion. Want a fresh one?" : "Let LifeOS find the free time in your day and suggest what to focus on."}
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-subtle-foreground">
              Built around your events and habits. {aiEnabled ? "Claude helps choose priorities and explains why." : "Uses clear, rule-based priorities."} You can accept, edit, or skip it.
            </p>
            <Button className="mt-4" onClick={() => setOpen(true)}>
              <Sparkles /> Plan my day
            </Button>
            <svg aria-hidden viewBox="0 0 120 120" className="pointer-events-none absolute -right-6 -bottom-8 size-36 opacity-60">
              <circle cx="60" cy="60" r="44" fill="none" stroke="#fff" strokeWidth="10" />
              <circle cx="60" cy="60" r="18" fill="#fff" />
            </svg>
          </div>
        )}
      </CardContent>
      <PlanDialog open={open} onOpenChange={setOpen} date={today} isToday />
    </Card>
  );
}
