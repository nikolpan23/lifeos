"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { CheckCircle2, Inbox, Plus, Search, SunMedium, CalendarRange, Archive, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useComposer } from "@/components/layout/composer";
import { useLife, useToday } from "@/lib/data/store";
import { filterTaskView, matchesQuery, type TaskView } from "@/lib/domain/tasks";
import { compareLocal, formatLocalDate, relativeDayLabel } from "@/lib/dates";
import type { Task } from "@/lib/domain/types";
import { TaskRow } from "./task-row";
import { QuickAddTask } from "./quick-add";

const VIEWS: { id: TaskView; label: string; icon: typeof Inbox; empty: { title: string; description: string } }[] = [
  { id: "today", label: "Today", icon: SunMedium, empty: { title: "Nothing due today", description: "Enjoy the space, or pull something forward from Upcoming." } },
  { id: "upcoming", label: "Upcoming", icon: CalendarRange, empty: { title: "Nothing scheduled ahead", description: "Tasks with a future due date show up here." } },
  { id: "anytime", label: "Anytime", icon: Inbox, empty: { title: "No undated tasks", description: "Tasks without a due date land here, ready when you are." } },
  { id: "completed", label: "Completed", icon: Archive, empty: { title: "Nothing completed yet", description: "Finished tasks are kept here so you can look back." } },
];

function groupByDate(tasks: Task[], today: string, view: TaskView): { label: string; tasks: Task[] }[] {
  if (view === "anytime" || view === "completed") return [{ label: "", tasks }];
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = view === "today" && t.dueDate! < today ? "overdue" : t.dueDate!;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()].map(([key, list]) => ({
    label: key === "overdue" ? "From earlier" : view === "today" ? "Today" : `${relativeDayLabel(key, today)} · ${formatLocalDate(key, { month: "short", day: "numeric" })}`,
    tasks: list,
  }));
}

export function TasksView() {
  const today = useToday();
  const params = useSearchParams();
  const router = useRouter();
  const composer = useComposer();
  const tasks = useLife((d) => d.tasks);
  const categories = useLife((d) => d.categories);
  const goals = useLife((d) => d.goals);
  const [view, setView] = useState<TaskView>((params.get("view") as TaskView) || "today");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [goal, setGoal] = useState("");
  const focusId = params.get("task");

  // Deep link: /tasks?task=id switches to the right view and opens that task.
  const [seenFocus, setSeenFocus] = useState<string | null>(null);
  if (focusId !== seenFocus) {
    setSeenFocus(focusId);
    const t = focusId ? tasks.find((x) => x.id === focusId) : undefined;
    if (t) setView(t.status === "done" ? "completed" : !t.dueDate ? "anytime" : compareLocal(t.dueDate, today) <= 0 ? "today" : "upcoming");
  }
  useEffect(() => {
    if (!focusId) return;
    const t = tasks.find((x) => x.id === focusId);
    if (!t) return;
    composer.openTask(t);
    router.replace(window.location.pathname + (params.get("view") ? `?view=${params.get("view")}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, filterTaskView(tasks, v.id, today).length])), [tasks, today]);
  const filtered = useMemo(() => {
    return filterTaskView(tasks, view, today).filter(
      (t) => (!category || t.categoryId === category) && (!priority || t.priority === priority) && (!goal || t.goalId === goal) && matchesQuery(`${t.title} ${t.notes}`, query),
    );
  }, [tasks, view, today, category, priority, goal, query]);
  const groups = groupByDate(filtered.slice(0, view === "completed" ? 200 : 500), today, view);
  const filtering = !!(query || category || priority || goal);
  const active = VIEWS.find((v) => v.id === view)!;

  return (
    <>
      <PageHeader
        title="My Tasks"
        description="Everything on your plate, sorted so the next thing is obvious."
        actions={
          <Button onClick={() => composer.openTask(null, view === "today" ? { dueDate: today } : undefined)}>
            <Plus /> New task
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as TaskView)}>
          <TabsList aria-label="Task views">
            {VIEWS.map((v) => (
              <TabsTrigger key={v.id} value={v.id}>
                <v.icon className="size-3.5" aria-hidden />
                {v.label}
                {v.id !== "completed" && counts[v.id] > 0 && <span className="rounded-full bg-[#e6e8ef] px-1.5 text-[11px] leading-4 text-subtle-foreground">{counts[v.id]}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 basis-full sm:w-60 sm:basis-auto">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" className="pl-9" />
          </div>
          <NativeSelect aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-auto">
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </NativeSelect>
          {goals.length > 0 && (
            <NativeSelect aria-label="Filter by goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-auto max-w-48">
              <option value="">Any goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </NativeSelect>
          )}
          {filtering && (
            <Button variant="ghost" onClick={() => { setQuery(""); setCategory(""); setPriority(""); setGoal(""); }}>
              <X /> Clear
            </Button>
          )}
        </div>
      </div>

      <Card className="p-3 sm:p-4">
        {view !== "completed" && <QuickAddTask dueToday={view === "today"} className="mb-2" />}
        {filtered.length === 0 ? (
          filtering ? (
            <EmptyState icon={Search} title="No tasks match" description="Try a different search or clear the filters." />
          ) : (
            <EmptyState icon={view === "completed" ? CheckCircle2 : active.icon} title={active.empty.title} description={active.empty.description} tone={view === "completed" ? "green" : "lavender"} />
          )
        ) : (
          groups.map((g) => (
            <section key={g.label || "all"} aria-label={g.label || active.label} className="mt-2 first:mt-0">
              {g.label && <h2 className={`px-2.5 pt-3 pb-1 text-[12px] font-semibold tracking-wide uppercase ${g.label === "From earlier" ? "text-ink-rose" : "text-muted-foreground"}`}>{g.label}</h2>}
              <ul className="grid">
                <AnimatePresence initial={false}>
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} highlight={t.id === focusId} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))
        )}
      </Card>
    </>
  );
}
