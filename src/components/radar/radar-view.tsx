"use client";

import { useMemo, useState } from "react";
import { Check, Eye, Radar, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PlanDialog } from "@/components/planner/plan-dialog";
import { useActions, useLife, useNow, useToday } from "@/lib/data/store";
import { RULES, runRadar, type Severity } from "@/lib/radar/rules";
import { InsightCard, SEVERITY } from "./insight-card";

export function RadarView() {
  const data = useLife((d) => d);
  const today = useToday();
  const now = useNow(5 * 60_000);
  const actions = useActions();
  const [planOpen, setPlanOpen] = useState(false);
  const all = useMemo(() => runRadar({ data, today, now }, { includeHidden: true }), [data, today, now]);
  const visible = useMemo(() => runRadar({ data, today, now }), [data, today, now]);
  const hidden = all.length - visible.length;
  const byRule = useMemo(() => new Map(RULES.map((r) => [r.id, visible.filter((i) => i.ruleId === r.id).length])), [visible]);

  return (
    <>
      <PageHeader title="Life Radar" description="Connections across your tasks, calendar, habits and goals that are worth a moment of attention. Every insight comes from what you've entered, with the reasoning shown." />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-6">
          {visible.length === 0 ? (
            <Card>
              <EmptyState icon={Radar} tone="green" title="Nothing needs your attention" description="No clashes, crunches, or slipping deadlines found in your current plans. Radar re-checks automatically as things change." />
            </Card>
          ) : (
            (["critical", "warning", "info"] as Severity[]).map((sev) => {
              const list = visible.filter((i) => i.severity === sev);
              if (!list.length) return null;
              const S = SEVERITY[sev];
              return (
                <section key={sev} aria-labelledby={`sev-${sev}`}>
                  <h2 id={`sev-${sev}`} className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <S.icon className="size-4" aria-hidden /> {S.label}
                    <span className="text-muted-foreground">({list.length})</span>
                  </h2>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {list.map((i) => (
                      <InsightCard key={i.key} insight={i} onPlan={() => setPlanOpen(true)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>What Radar checks</CardTitle>
                <CardDescription>Clear rules, run on your own data</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {RULES.map((r) => {
                  const n = byRule.get(r.id) ?? 0;
                  return (
                    <li key={r.id} className="flex items-center gap-2.5 text-[13.5px]">
                      {n ? <span className="flex size-5 items-center justify-center rounded-full bg-soft-peach text-[11px] font-semibold text-ink-peach">{n}</span> : <Check className="size-5 rounded-full bg-soft-green p-1 text-ink-green" aria-hidden />}
                      <span className="flex-1">{r.name}</span>
                      <span className="sr-only">{n ? `${n} found` : "nothing found"}</span>
                    </li>
                  );
                })}
              </ul>
              {hidden > 0 && (
                <Button variant="ghost" size="sm" className="mt-4" onClick={() => actions.restoreInsights()}>
                  <Eye /> Show {hidden} hidden insight{hidden === 1 ? "" : "s"}
                </Button>
              )}
            </CardContent>
          </Card>
          <Card className="bg-[#fdf8ef] shadow-none">
            <CardContent className="flex gap-3 p-5 text-[13px] leading-relaxed text-subtle-foreground">
              <ShieldCheck className="size-5 shrink-0 text-ink-green" aria-hidden />
              <p>Radar doesn’t guess or use outside data. It only connects records you’ve added to LifeOS, and it never changes anything for you.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} date={today} isToday />
    </>
  );
}
