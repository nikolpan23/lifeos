"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AXIS, ChartFrame, ChartTooltip, GRID, SERIES } from "@/components/shared/chart";
import { useLife, useToday } from "@/lib/data/store";
import { addDays, dateRange, localDateOf, weekdayShort } from "@/lib/dates";

export function useWeekActivity(weekStart: string, today?: string) {
  const tasks = useLife((d) => d.tasks);
  const completions = useLife((d) => d.habitCompletions);
  const tz = useLife((d) => d.profile.timezone);
  return useMemo(() => {
    const days = dateRange(weekStart, 7);
    const taskCounts = new Map<string, number>();
    for (const t of tasks) {
      if (t.status !== "done" || !t.completedAt) continue;
      const d = localDateOf(t.completedAt, tz);
      taskCounts.set(d, (taskCounts.get(d) ?? 0) + 1);
    }
    const habitCounts = new Map<string, number>();
    for (const c of completions) habitCounts.set(c.date, (habitCounts.get(c.date) ?? 0) + 1);
    return days.map((date) => ({ date, label: date === today ? "Today" : weekdayShort(date), tasks: taskCounts.get(date) ?? 0, habits: habitCounts.get(date) ?? 0 }));
  }, [tasks, completions, tz, weekStart, today]);
}

export function WeeklyActivityCard() {
  const today = useToday();
  const data = useWeekActivity(addDays(today, -6), today);
  const totals = data.reduce((s, d) => ({ tasks: s.tasks + d.tasks, habits: s.habits + d.habits }), { tasks: 0, habits: 0 });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Last 7 days</CardTitle>
          <CardDescription>
            {totals.tasks} task{totals.tasks === 1 ? "" : "s"} completed · {totals.habits} habit check-in{totals.habits === 1 ? "" : "s"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ChartFrame
          caption="Tasks completed and habits done each day over the last 7 days"
          legend={[
            { label: "Tasks completed", color: SERIES.lavender },
            { label: "Habits done", color: SERIES.teal },
          ]}
          columns={["Day", "Tasks completed", "Habits done"]}
          rows={data.map((d) => [d.label, d.tasks, d.habits])}
          height={200}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: AXIS.stroke }} tick={AXIS.tick} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS.tick} width={48} />
              <Tooltip cursor={{ fill: "#f3f4f8", radius: 8 }} content={<ChartTooltip />} />
              <Bar dataKey="tasks" name="Tasks completed" fill={SERIES.lavender} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="habits" name="Habits done" fill={SERIES.teal} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </CardContent>
    </Card>
  );
}
