"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Loader2, Plus, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useActions, useLife } from "@/lib/data/store";
import { durationLabel, formatLongDate, type LocalDate } from "@/lib/dates";
import { planIsValid } from "@/lib/scheduling/planner";
import { PlanTimeline } from "./plan-timeline";
import { usePlanner, type GeneratedPlan } from "./use-planner";

export function PlanDialog({ open, onOpenChange, date, isToday }: { open: boolean; onOpenChange: (o: boolean) => void; date: LocalDate; isToday: boolean }) {
  const { generate, loading, aiEnabled } = usePlanner();
  const actions = useActions();
  const tz = useLife((d) => d.profile.timezone);
  const tasks = useLife((d) => d.tasks);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [busy, setBusy] = useState(false);

  // Each opening starts from a fresh suggestion.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPlan(null);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    generate(date, isToday).then((p) => !cancelled && setPlan(p));
    return () => {
      cancelled = true;
    };
    // Generate once per opening; later data changes shouldn't silently rewrite the suggestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, isToday]);

  const plannedIds = useMemo(() => [...new Set((plan?.items ?? []).filter((i) => i.kind === "task" && i.refId).map((i) => i.refId!))], [plan]);
  const addable = useMemo(() => {
    if (!plan) return [];
    const inPlan = new Set(plannedIds);
    const fromCandidates = plan.candidates.filter((c) => !inPlan.has(c.task.id)).map((c) => c.task);
    const others = tasks.filter((t) => t.status === "open" && !inPlan.has(t.id) && !fromCandidates.some((c) => c.id === t.id));
    return [...fromCandidates, ...others].slice(0, 12);
  }, [plan, plannedIds, tasks]);

  const reorder = async (ids: string[]) => {
    if (!plan) return;
    const next = await generate(date, isToday, ids);
    setPlan({ ...next, source: plan.source, aiSummary: plan.aiSummary, aiNote: plan.aiNote, items: next.items.map((i) => ({ ...i, reason: plan.items.find((p) => p.refId === i.refId && p.kind === "task")?.reason ?? i.reason })) });
  };

  const save = async (status: "accepted" | "rejected") => {
    if (!plan) return;
    if (status === "accepted" && !planIsValid(plan.items)) return;
    setBusy(true);
    const ok = await actions.savePlan({
      date,
      status,
      source: plan.source,
      summary: (plan.aiSummary ?? plan.summary).slice(0, 1000),
      items: plan.items.slice(0, 60).map((i) => ({ ...i, title: i.title.slice(0, 200), reason: i.reason.slice(0, 500) })),
      unscheduledTaskIds: plan.unscheduledTaskIds.slice(0, 200),
      notes: [...plan.notes, ...(plan.aiNote ? [plan.aiNote] : [])].slice(0, 20).map((n) => n.slice(0, 500)),
    });
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  const unscheduled = plan ? plan.unscheduledTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Your suggested plan</DialogTitle>
            {plan && (plan.source === "ai" ? <Badge tone="lavender"><Sparkles className="size-3" aria-hidden /> AI-assisted</Badge> : <Badge tone="neutral"><Wand2 className="size-3" aria-hidden /> Rule-based</Badge>)}
          </div>
          <DialogDescription>{formatLongDate(date)}. Nothing changes on your calendar unless you choose to.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {!plan || loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin text-accent" aria-hidden />
              {aiEnabled ? "Finding free time and asking for priority suggestions…" : "Finding free time around your commitments…"}
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-[14px] bg-lavender/70 px-4 py-3">
                <p className="text-[14px] leading-relaxed">{plan.aiSummary ?? plan.summary}</p>
                <p className="mt-1 text-[12.5px] text-subtle-foreground">
                  {durationLabel(Math.round(plan.freeMinutes))} free · {durationLabel(plan.plannedMinutes)} planned
                </p>
              </div>
              {plan.items.length ? (
                <PlanTimeline items={plan.items} tz={tz} onRemove={(id) => reorder(plannedIds.filter((x) => x !== id))} />
              ) : (
                <p className="text-sm text-muted-foreground">There’s nothing to place in your free time.</p>
              )}
              {unscheduled.length > 0 && (
                <div>
                  <p className="mb-2 text-[13px] font-semibold">Didn’t fit today</p>
                  <ul className="grid gap-1 text-[13px] text-subtle-foreground">
                    {unscheduled.map((t) => (
                      <li key={t!.id}>· {t!.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              {addable.length > 0 && (
                <details className="rounded-[14px] border border-border px-4 py-3">
                  <summary className="cursor-pointer text-[13px] font-semibold">Add another task to the plan</summary>
                  <ul className="mt-2 grid gap-1">
                    {addable.map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px]">{t.title}</span>
                        <Button size="sm" variant="ghost" onClick={() => reorder([...plannedIds, t.id])} aria-label={`Add “${t.title}” to the plan`}>
                          <Plus /> Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {(plan.notes.length > 0 || plan.aiNote) && (
                <div className="flex gap-2.5 rounded-[12px] bg-[#f6efe2] px-3 py-2.5 text-[12.5px] text-subtle-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <ul className="grid gap-0.5">
                    {[...plan.notes, ...(plan.aiNote ? [plan.aiNote] : [])].map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                    <li>Plans are suggestions based on your estimates. Real days rarely go exactly to plan, and that’s fine.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" disabled={!plan || loading} onClick={() => generate(date, isToday).then(setPlan)}>
            <RefreshCw /> Regenerate
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" disabled={!plan || busy} onClick={() => save("rejected")}>
              Not today
            </Button>
            <Button disabled={!plan || busy || loading || !plan.items.some((i) => i.kind === "task")} onClick={() => save("accepted")}>
              Accept plan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
