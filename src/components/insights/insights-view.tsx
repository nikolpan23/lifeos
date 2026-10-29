"use client";

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { AXIS, ChartFrame, ChartTooltip, GRID, SERIES } from "@/components/shared/chart";
import { CATEGORY_STYLES, CategoryDot } from "@/components/shared/category";
import { useLife, useToday } from "@/lib/data/store";
import { formatLocalDate, WEEKDAY_LABELS, weekdayShort } from "@/lib/dates";
import { completionTrend, goalRows, habitConsistencyRows, planStats, timeByCategory, upcomingWorkload, weekdayPatterns } from "@/lib/insights/metrics";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[16px] border border-border bg-surface p-4 shadow-soft">
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-[12.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function InsightsView() {
  const data = useLife((d) => d);
  const today = useToday();
  const trend = useMemo(() => completionTrend(data, today), [data, today]);
  const habits = useMemo(() => habitConsistencyRows(data, today), [data, today]);
  const goals = useMemo(() => goalRows(data), [data]);
  const cats = useMemo(() => timeByCategory(data, today), [data, today]);
  const workload = useMemo(() => upcomingWorkload(data, today), [data, today]);
  const patterns = useMemo(() => weekdayPatterns(data, today), [data, today]);
  const plans = planStats(data);

  const completed4 = trend.slice(-4).reduce((s, w) => s + w.completed, 0);
  const habitAvg = habits.length ? Math.round((habits.reduce((s, h) => s + h.rate, 0) / habits.length) * 100) : null;
  const milestonesDone = goals.reduce((s, g) => s + g.completed, 0);
  const milestonesTotal = goals.reduce((s, g) => s + g.total, 0);
  const busiest = [...patterns].sort((a, b) => b.avgEventHours - a.avgEventHours)[0];
  const mostProductive = [...patterns].sort((a, b) => b.completed - a.completed)[0];
  const tightDays = workload.filter((w) => w.dueHours > w.freeHours && w.dueHours > 0).length;
  const hasAnything = data.tasks.length + data.habits.length + data.events.length + data.goals.length > 0;

  if (!hasAnything) {
    return (
      <>
        <PageHeader title="Insights" description="Patterns from your own data, no made-up scores." />
        <Card>
          <EmptyState icon={Gauge} title="Not enough data yet" description="As you complete tasks, check in habits and add events, trends will appear here." />
        </Card>
      </>
    );
  }

  const trendData = trend.map((w) => ({ label: formatLocalDate(w.start), completed: w.completed, added: w.created }));
  const workloadData = workload.map((w) => ({ label: `${weekdayShort(w.date)} ${Number(w.date.slice(8))}`, due: w.dueHours, free: w.freeHours }));
  const patternData = patterns.map((p) => ({ label: WEEKDAY_LABELS[p.weekday], completed: p.completed, events: p.avgEventHours }));

  return (
    <>
      <PageHeader title="Insights" description="Patterns from your own data. Every number here is a count or total of things you've recorded, nothing invented." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tasks completed" value={String(completed4)} sub="in the last 4 weeks" />
        <Stat label="Habit consistency" value={habitAvg === null ? "–" : `${habitAvg}%`} sub="scheduled days done, last 30 days" />
        <Stat label="Milestones reached" value={milestonesTotal ? `${milestonesDone}/${milestonesTotal}` : "–"} sub="across your goals" />
        <Stat label="Tight days ahead" value={String(tightDays)} sub="next 2 weeks, more work than free time" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Task completion trend</CardTitle>
              <CardDescription>Tasks completed vs. added, by week</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartFrame caption="Tasks completed and added per week, last 8 weeks" legend={[{ label: "Completed", color: SERIES.lavender }, { label: "Added", color: SERIES.teal }]} columns={["Week of", "Completed", "Added"]} rows={trendData.map((d) => [d.label, d.completed, d.added])}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES.lavender} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={SERIES.lavender} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} minTickGap={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={48} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d8ccb6" }} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke={SERIES.lavender} strokeWidth={2} fill="url(#fillCompleted)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                  <Area type="monotone" dataKey="added" name="Added" stroke={SERIES.teal} strokeWidth={2} fill="transparent" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming workload</CardTitle>
              <CardDescription>Estimated task work due vs. free planning time, next 14 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartFrame caption="Hours of task work due and free planning hours per day, next 14 days" legend={[{ label: "Work due", color: SERIES.orange }, { label: "Free time", color: SERIES.blue }]} columns={["Day", "Work due (h)", "Free time (h)"]} rows={workloadData.map((d) => [d.label, d.due, d.free])}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} barGap={2} barCategoryGap="22%" margin={{ top: 6, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} minTickGap={8} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS.tick} width={48} unit="h" />
                  <Tooltip cursor={{ fill: "#f1e9da", radius: 8 }} content={<ChartTooltip format={(v) => `${v} h`} />} />
                  <Bar dataKey="due" name="Work due" fill={SERIES.orange} radius={[4, 4, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="free" name="Free time" fill={SERIES.blue} radius={[4, 4, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Habit consistency</CardTitle>
              <CardDescription>Scheduled days completed, last 30 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {habits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active habits yet.</p>
            ) : (
              <ul className="grid gap-3.5">
                {habits.map((h) => {
                  const cat = data.categories.find((c) => c.id === h.categoryId);
                  return (
                    <li key={h.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryDot category={cat} />
                          <span className="truncate font-medium">{h.name}</span>
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {h.done}/{h.scheduled} · <strong className="font-semibold text-foreground">{h.scheduled ? Math.round(h.rate * 100) : 0}%</strong>
                        </span>
                      </div>
                      <Progress value={h.rate * 100} tone={(cat?.color ?? "green") as "green"} label={`${h.name} consistency`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Time by category</CardTitle>
              <CardDescription>Hours of calendar events, last 4 weeks</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No timed events in the last 4 weeks.</p>
            ) : (
              <ChartFrame caption="Hours of calendar events by category, last 4 weeks" columns={["Category", "Hours"]} rows={cats.map((c) => [c.name, c.hours])} height={Math.max(160, cats.length * 40)}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cats} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 8 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={AXIS.tick} width={96} />
                    <Tooltip cursor={{ fill: "#f1e9da" }} content={<ChartTooltip format={(v) => `${v} h`} />} />
                    <Bar dataKey="hours" name="Hours" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: "right", fill: "#5a5246", fontSize: 12, formatter: (v: unknown) => `${v}h` }}>
                      {cats.map((c) => (
                        <Cell key={c.categoryId} fill={c.color ? CATEGORY_STYLES[c.color].chart : "#a3977f"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Goal milestones</CardTitle>
              <CardDescription>Progress comes only from milestones you’ve checked off</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add milestones to your goals to see progress here.</p>
            ) : (
              <ul className="grid gap-3.5">
                {goals.map((g) => {
                  const cat = data.categories.find((c) => c.id === g.goal.categoryId);
                  return (
                    <li key={g.goal.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13.5px]">
                        <span className="truncate font-medium">{g.goal.title}</span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {g.completed} of {g.total}
                        </span>
                      </div>
                      <Progress value={(g.ratio ?? 0) * 100} tone={(cat?.color ?? "lavender") as "lavender"} label={`${g.goal.title} milestone progress`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Weekly patterns</CardTitle>
              <CardDescription>Last 6 weeks, by day of the week</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ChartFrame caption="Tasks completed per weekday over the last 6 weeks" columns={["Day", "Tasks completed", "Avg event hours"]} rows={patternData.map((d) => [d.label, d.completed, d.events])} height={170}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patternData} margin={{ top: 6, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid vertical={false} stroke={GRID} />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={48} />
                  <Tooltip cursor={{ fill: "#f1e9da", radius: 8 }} content={<ChartTooltip />} />
                  <Bar dataKey="completed" name="Tasks completed" fill={SERIES.lavender} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <ul className="mt-4 grid gap-1.5 text-[13px] text-subtle-foreground">
              {mostProductive && mostProductive.completed > 0 && (
                <li>
                  You complete the most tasks on <strong className="font-semibold text-foreground">{WEEKDAY_LABELS[mostProductive.weekday]}s</strong> ({mostProductive.completed} in 6 weeks).
                </li>
              )}
              {busiest && busiest.avgEventHours > 0 && (
                <li>
                  <strong className="font-semibold text-foreground">{WEEKDAY_LABELS[busiest.weekday]}</strong> has the most calendar time, about {busiest.avgEventHours} h of events on average.
                </li>
              )}
              {plans.total > 0 && (
                <li>
                  You’ve accepted {plans.accepted} of {plans.total} daily plan{plans.total === 1 ? "" : "s"}.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
