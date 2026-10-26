"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Briefcase, CalendarClock, CalendarX2, CheckCircle2, Dumbbell, Info, Minus, MoreHorizontal, Pencil, Plane, Plus, Sparkles, Target, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { AXIS, ChartFrame, ChartTooltip, GRID, SERIES } from "@/components/shared/chart";
import { useActions, useLife, useNow, useToday } from "@/lib/data/store";
import { addDays, formatLocalDate, formatTime, localDateOf, WEEKDAY_LABELS, weekdayShort } from "@/lib/dates";
import { opsForScenario, pressureLevel, simulate, type Metrics, type SimulationResult } from "@/lib/scenarios/simulate";
import type { Scenario, ScenarioChange, ScenarioChangeType } from "@/lib/domain/types";
import { newId, nowISO } from "@/lib/data/ids";
import { ChangeDialog, CHANGE_LABELS } from "./change-dialog";
import { cn } from "@/lib/utils";

const TEMPLATES: { id: string; label: string; icon: typeof Dumbbell; title: string; change: (today: string) => Omit<ScenarioChange, "id"> | null }[] = [
  { id: "gym", label: "Gym 4× a week", icon: Dumbbell, title: "What if I go to the gym four times a week?", change: () => ({ type: "recurring_commitment", title: "Gym", days: [1, 2, 4, 6], startTime: "18:00", durationMinutes: 75, categoryId: null, expense: null }) },
  { id: "project", label: "Another project", icon: Briefcase, title: "What if I take on another project?", change: (t) => ({ type: "project_workload", title: "New project", hoursPerWeek: 8, deadline: addDays(t, 13), goalId: null, expense: null }) },
  { id: "trip", label: "Trip next weekend", icon: Plane, title: "What if I plan a trip next weekend?", change: (t) => { const sat = addDays(t, ((6 - new Date(t + "T12:00:00Z").getUTCDay() + 7) % 7) + 7); return { type: "one_off_event", title: "Weekend trip", startDate: sat, endDate: addDays(sat, 1), allDay: true, startTime: null, endTime: null, categoryId: null, expense: null }; } },
  { id: "study", label: "Study 2h every evening", icon: BookOpen, title: "What if I study two hours every evening?", change: () => ({ type: "recurring_commitment", title: "Evening study", days: [0, 1, 2, 3, 4, 5, 6], startTime: "19:30", durationMinutes: 120, categoryId: null, expense: null }) },
  { id: "deadline", label: "Move a deadline", icon: CalendarClock, title: "What if I move a deadline?", change: () => null },
];

function changeIcon(t: ScenarioChangeType) {
  return { recurring_commitment: Dumbbell, one_off_event: Plane, project_workload: Briefcase, move_deadline: CalendarClock, remove_event: CalendarX2 }[t];
}

function useChangeSummary() {
  const tasks = useLife((d) => d.tasks);
  const events = useLife((d) => d.events);
  const tz = useLife((d) => d.profile.timezone);
  return (c: ScenarioChange): string => {
    switch (c.type) {
      case "recurring_commitment":
        return `${c.days.length === 7 ? "Every day" : c.days.map((d) => WEEKDAY_LABELS[d]).join(", ")} at ${c.startTime} for ${c.durationMinutes} min${c.expense ? ` · ${c.expense} each` : ""}`;
      case "one_off_event":
        return `${formatLocalDate(c.startDate)}${c.endDate !== c.startDate ? `–${formatLocalDate(c.endDate)}` : ""}${c.allDay ? " · all day" : ` · ${c.startTime}–${c.endTime}`}${c.expense ? ` · ${c.expense}` : ""}`;
      case "project_workload":
        return `${c.hoursPerWeek} h/week${c.deadline ? ` until ${formatLocalDate(c.deadline)}` : ""}${c.expense ? ` · ${c.expense}` : ""}`;
      case "move_deadline": {
        const t = tasks.find((x) => x.id === c.taskId);
        return t ? `“${t.title}”: ${t.dueDate ? formatLocalDate(t.dueDate) : "no date"} → ${formatLocalDate(c.newDueDate)}` : "Task no longer exists";
      }
      case "remove_event": {
        const e = events.find((x) => x.id === c.eventId);
        return e ? `“${e.title}” on ${formatLocalDate(e.allDay ? e.startDate! : localDateOf(e.start, tz))}${e.allDay ? "" : ` at ${formatTime(e.start, tz)}`}` : "Event no longer exists";
      }
    }
  };
}

function changeTitle(c: ScenarioChange, tasks: { id: string; title: string }[]): string {
  if ("title" in c) return c.title;
  if (c.type === "move_deadline") return `Move deadline${tasks.find((t) => t.id === c.taskId) ? "" : ""}`;
  return "Drop an event";
}

function Delta({ before, after, unit, betterWhen, format }: { before: number; after: number; unit?: string; betterWhen: "lower" | "higher" | "none"; format?: (n: number) => string }) {
  const d = Math.round((after - before) * 10) / 10;
  const f = format ?? ((n: number) => `${n}${unit ?? ""}`);
  if (d === 0) return <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground"><Minus className="size-3" aria-hidden /> No change</span>;
  const good = betterWhen === "none" ? null : betterWhen === "lower" ? d < 0 : d > 0;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[12px] font-semibold", good === null ? "text-subtle-foreground" : good ? "text-ink-green" : "text-ink-rose")}>
      <Icon className="size-3.5" aria-hidden />
      {d > 0 ? "+" : ""}
      {f(d)}
    </span>
  );
}

function MetricCard({ label, before, after, unit, betterWhen, format, icon: Icon }: { label: string; before: number; after: number; unit?: string; betterWhen: "lower" | "higher" | "none"; format?: (n: number) => string; icon: typeof Target }) {
  const f = format ?? ((n: number) => `${n}${unit ?? ""}`);
  return (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-[13px] text-faint-foreground line-through decoration-[#d4d8e3]" aria-label={`Before: ${f(before)}`}>{f(before)}</span>
        <ArrowRight className="size-3 text-faint-foreground" aria-hidden />
        <span className="text-[22px] font-semibold tracking-tight" aria-label={`After: ${f(after)}`}>{f(after)}</span>
      </p>
      <Delta before={before} after={after} unit={unit} betterWhen={betterWhen} format={format} />
    </div>
  );
}

const PRESSURE_COPY = { low: "Comfortable", moderate: "Manageable", high: "Tight", overloaded: "Over capacity" } as const;
const pct = (m: Metrics) => (Number.isFinite(m.pressure) ? Math.round(m.pressure * 100) : 999);

function Comparison({ sim }: { sim: SimulationResult }) {
  const tasks = useLife((d) => d.tasks);
  const { before, after } = sim;
  const chartData = after.days.map((d, i) => ({ label: `${weekdayShort(d.date)} ${Number(d.date.slice(8))}`, before: Math.round((before.days[i].freeMinutes / 60) * 10) / 10, after: Math.round((d.freeMinutes / 60) * 10) / 10 }));
  const newAtRisk = after.atRiskTaskIds.filter((id) => !before.atRiskTaskIds.includes(id)).map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
  const levelBefore = pressureLevel(before.pressure);
  const levelAfter = pressureLevel(after.pressure);
  const byDay = new Map<string, typeof sim.hypotheticalEvents>();
  const tz = useLife((d) => d.profile.timezone);
  for (const e of sim.hypotheticalEvents) {
    const k = e.allDay ? e.startDate! : localDateOf(e.start, tz);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Scheduled hours" icon={CalendarClock} before={before.scheduledHours} after={after.scheduledHours} unit="h" betterWhen="none" />
        <MetricCard label="Free planning hours" icon={Sparkles} before={before.availableHours} after={after.availableHours} unit="h" betterWhen="higher" />
        <MetricCard label="Calendar conflicts" icon={AlertTriangle} before={before.conflicts} after={after.conflicts} betterWhen="lower" />
        <MetricCard label="Deadline pressure" icon={Target} before={pct(before)} after={pct(after)} betterWhen="lower" format={(n) => (Math.abs(n) >= 999 ? "∞" : `${n}%`)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Free planning time, day by day</CardTitle>
              <CardDescription>Hours left for tasks after events and scheduled habits</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartFrame
              height={300}
              caption="Free planning hours per day, before and after the scenario"
              legend={[
                { label: "Before", color: SERIES.blue },
                { label: "After", color: SERIES.lavender },
              ]}
              columns={["Day", "Before (h)", "After (h)"]}
              rows={chartData.map((d) => [d.label, d.before, d.after])}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS.tick} width={48} unit="h" />
                  <Tooltip cursor={{ fill: "#f3f4f8", radius: 8 }} content={<ChartTooltip format={(v) => `${v} h`} />} />
                  <Bar dataKey="before" name="Before" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="after" name="After" fill={SERIES.lavender} radius={[4, 4, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>What changes</CardTitle>
              <CardDescription>
                Pressure goes from <strong className="font-semibold text-foreground">{PRESSURE_COPY[levelBefore]}</strong> to{" "}
                <strong className={cn("font-semibold", levelAfter === "overloaded" || levelAfter === "high" ? "text-ink-rose" : "text-foreground")}>{PRESSURE_COPY[levelAfter]}</strong>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-[13.5px]">
            <p className="text-subtle-foreground">
              About {after.workloadHours} h of task work is due in this period, against {after.availableHours} h of free planning time.
            </p>
            {newAtRisk.length > 0 ? (
              <div>
                <p className="mb-1 font-semibold text-ink-rose">Deadlines that may no longer fit</p>
                <ul className="grid gap-0.5 text-subtle-foreground">
                  {newAtRisk.slice(0, 5).map((t) => (
                    <li key={t!.id}>· {t!.title} (due {formatLocalDate(t!.dueDate!)})</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-ink-green">
                <CheckCircle2 className="size-4" aria-hidden /> No additional deadlines put at risk.
              </p>
            )}
            {sim.newConflicts.length > 0 && (
              <div>
                <p className="mb-1 font-semibold text-ink-yellow">New overlaps</p>
                <ul className="grid gap-0.5 text-subtle-foreground">
                  {sim.newConflicts.slice(0, 5).map((c, i) => (
                    <li key={i}>· {c.a} with {c.b} ({formatLocalDate(c.date, { weekday: "short", month: "short", day: "numeric" })})</li>
                  ))}
                  {sim.newConflicts.length > 5 && <li>· and {sim.newConflicts.length - 5} more</li>}
                </ul>
              </div>
            )}
            {sim.affectedGoals.length > 0 && (
              <div>
                <p className="mb-1 font-semibold">Affected goals</p>
                <ul className="grid gap-1 text-subtle-foreground">
                  {sim.affectedGoals.map((g) => (
                    <li key={g.id}>
                      <span className="font-medium text-foreground">{g.title}</span>: {g.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sim.totalExpense > 0 && (
              <div className="flex items-start gap-2 rounded-[12px] bg-soft-yellow px-3 py-2 text-ink-yellow">
                <Wallet className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Planned expenses: <strong className="font-semibold">{sim.totalExpense.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                  <span className="block text-[12px]">{sim.expenses.map((e) => `${e.label}: ${e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`).join(" · ")}</span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {byDay.size > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Hypothetical timeline</CardTitle>
              <CardDescription>What this scenario would add to your calendar</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="flex gap-2 overflow-x-auto pb-2">
              {sim.horizon.map((d) => {
                const evs = byDay.get(d) ?? [];
                return (
                  <li key={d} className={cn("w-[120px] shrink-0 rounded-[14px] border p-2.5", evs.length ? "border-[#e6e2ff] bg-[#faf9ff]" : "border-border bg-[#fbfbfd]")}>
                    <p className="text-[11.5px] font-semibold text-muted-foreground">
                      {weekdayShort(d)} {Number(d.slice(8))}
                    </p>
                    <ul className="mt-1.5 grid gap-1">
                      {evs.map((e) => (
                        <li key={e.id} className="rounded-[8px] border border-dashed border-[#c9c3f5] bg-surface px-1.5 py-1 text-[11.5px] leading-tight">
                          <span className="block truncate font-medium text-primary-strong">{e.title}</span>
                          <span className="text-muted-foreground">{e.allDay ? "All day" : `${formatTime(e.start, tz)}`}</span>
                        </li>
                      ))}
                      {evs.length === 0 && <li className="text-[11.5px] text-faint-foreground">—</li>}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 rounded-[16px] bg-[#f3f4f8] px-4 py-3.5 text-[13px] leading-relaxed text-subtle-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="font-medium text-foreground">How this was estimated</p>
          <ul className="mt-1 grid gap-0.5">
            {sim.assumptions.map((a) => (
              <li key={a}>· {a}</li>
            ))}
            <li>· This compares your current plans with the scenario. It can’t predict how the days will really go.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScenarioEditor({ scenario }: { scenario: Scenario }) {
  const data = useLife((d) => d);
  const now = useNow(5 * 60_000);
  const actions = useActions();
  const summary = useChangeSummary();
  const [dialog, setDialog] = useState<{ type: ScenarioChangeType; initial: ScenarioChange | null } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [title, setTitle] = useState(scenario.title);
  const sim = useMemo(() => simulate(data, scenario, now), [data, scenario, now]);
  const applied = scenario.status === "applied";
  const plan = useMemo(() => (confirm ? opsForScenario(data, scenario, newId, nowISO()) : null), [confirm, data, scenario]);

  const saveChanges = (changes: ScenarioChange[]) => actions.setScenarioChanges(scenario.id, changes);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1 basis-72">
            <label htmlFor="scenario-title" className="sr-only">Scenario name</label>
            <input
              id="scenario-title"
              value={title}
              disabled={applied}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title !== scenario.title && actions.updateScenario(scenario.id, { title, description: scenario.description, horizonStart: scenario.horizonStart, horizonDays: scenario.horizonDays })}
              className="w-full bg-transparent text-[19px] font-semibold tracking-[-0.01em] outline-none"
              maxLength={120}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              {applied ? <Badge tone="green">Applied {scenario.appliedAt ? formatLocalDate(scenario.appliedAt.slice(0, 10)) : ""}</Badge> : <Badge tone="lavender">Hypothetical</Badge>}
              <span>Looking at</span>
              <Input type="date" aria-label="Scenario start date" value={scenario.horizonStart} disabled={applied} onChange={(e) => e.target.value && actions.updateScenario(scenario.id, { title: scenario.title, description: scenario.description, horizonStart: e.target.value, horizonDays: scenario.horizonDays })} className="h-8 w-40 text-[13px]" />
              <select aria-label="Scenario length" value={scenario.horizonDays} disabled={applied} onChange={(e) => actions.updateScenario(scenario.id, { title: scenario.title, description: scenario.description, horizonStart: scenario.horizonStart, horizonDays: Number(e.target.value) })} className="h-8 rounded-[10px] border border-border bg-surface px-2 text-[13px]">
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={28}>4 weeks</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-danger hover:bg-soft-rose hover:text-danger" onClick={() => actions.deleteScenario(scenario.id)}>
              <Trash2 /> {applied ? "Delete" : "Discard"}
            </Button>
            {!applied && (
              <Button disabled={scenario.changes.length === 0} onClick={() => setConfirm(true)}>
                <CheckCircle2 /> Apply changes
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          {scenario.changes.map((c) => {
            const Icon = changeIcon(c.type);
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-[14px] border border-dashed border-[#d9d4ff] bg-[#faf9ff] px-3 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-lavender text-primary-strong">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{changeTitle(c, data.tasks)}</p>
                  <p className="truncate text-[12.5px] text-muted-foreground">{summary(c)}</p>
                </div>
                {!applied && (
                  <>
                    <Button variant="ghost" size="icon-sm" aria-label="Edit change" onClick={() => setDialog({ type: c.type, initial: c })}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Remove change" onClick={() => saveChanges(scenario.changes.filter((x) => x.id !== c.id))}>
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
          {!applied && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="soft" className="justify-self-start">
                  <Plus /> Add a change
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {(Object.keys(CHANGE_LABELS) as ScenarioChangeType[]).map((t) => {
                  const Icon = changeIcon(t);
                  return (
                    <DropdownMenuItem key={t} onSelect={() => setDialog({ type: t, initial: null })} className="items-start">
                      <Icon className="mt-0.5" />
                      <span>
                        <span className="block font-medium">{CHANGE_LABELS[t].title}</span>
                        <span className="block text-[12px] text-muted-foreground">{CHANGE_LABELS[t].hint}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>

      {scenario.changes.length === 0 ? (
        <Card>
          <EmptyState icon={Sparkles} title="Add a change to see its impact" description="Try a new commitment, a trip, extra work, or a moved deadline. Your real schedule stays exactly as it is." />
        </Card>
      ) : (
        <Comparison sim={sim} />
      )}

      {dialog && (
        <ChangeDialog
          key={dialog.initial?.id ?? `new-${dialog.type}`}
          open={!!dialog}
          onOpenChange={(o) => !o && setDialog(null)}
          type={dialog.type}
          initial={dialog.initial}
          onSave={(c) => saveChanges(dialog.initial ? scenario.changes.map((x) => (x.id === c.id ? c : x)) : [...scenario.changes, c])}
        />
      )}

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply this scenario?</DialogTitle>
            <DialogDescription>These changes will be made to your real tasks and calendar.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="grid gap-1.5 text-[14px]">
              {plan?.summary.map((s) => (
                <li key={s} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden /> {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-muted-foreground">You can edit or delete anything afterwards, as usual.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep it hypothetical
            </Button>
            <Button
              disabled={!plan || plan.ops.length === 0}
              onClick={async () => {
                if (plan && (await actions.applyScenario(scenario.id, plan.ops))) setConfirm(false);
              }}
            >
              Apply changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function WhatIfView() {
  const today = useToday();
  const actions = useActions();
  const scenarios = useLife((d) => d.scenarios);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sorted = [...scenarios].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = scenarios.find((s) => s.id === selectedId) ?? sorted[0] ?? null;

  const start = async (tpl: (typeof TEMPLATES)[number] | null) => {
    const s = await actions.addScenario({ title: tpl?.title ?? "What if…", description: "", horizonStart: today, horizonDays: 14 });
    if (!s) return;
    setSelectedId(s.id);
    const change = tpl?.change(today);
    if (change) await actions.setScenarioChanges(s.id, [{ ...change, id: newId() } as ScenarioChange]);
  };

  return (
    <>
      <PageHeader title="What-If Studio" description="Try a decision on your real schedule before you make it. Scenarios stay separate from your actual plans until you choose to apply them." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <Button key={t.id} variant="outline" onClick={() => start(t)}>
            <t.icon className="text-primary-strong" /> {t.label}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => start(null)}>
          <Plus /> Blank scenario
        </Button>
      </div>
      {scenarios.length === 0 ? (
        <Card>
          <EmptyState icon={Sparkles} title="No scenarios yet" description="Pick a starting point above. You'll see how it would change your hours, free time, conflicts and deadlines." />
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Scenarios" className="grid content-start gap-1.5">
            {sorted.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  type="button"
                  aria-current={s.id === selected?.id ? "true" : undefined}
                  onClick={() => setSelectedId(s.id)}
                  className={cn("w-full rounded-[14px] border px-3 py-2.5 pr-10 text-left transition-colors", s.id === selected?.id ? "border-[#d9d4ff] bg-lavender" : "border-transparent hover:bg-surface")}
                >
                  <span className="line-clamp-2 text-[13.5px] font-medium">{s.title}</span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
                    {s.status === "applied" ? "Applied" : `${s.changes.length} change${s.changes.length === 1 ? "" : "s"}`} · {formatLocalDate(s.horizonStart)}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="absolute top-2 right-1.5 opacity-60 group-hover:opacity-100" aria-label={`Actions for ${s.title}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem destructive onSelect={() => actions.deleteScenario(s.id)}>
                      <Trash2 /> {s.status === "applied" ? "Delete" : "Discard"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>
          {selected && <ScenarioEditor key={selected.id} scenario={selected} />}
        </div>
      )}
    </>
  );
}
