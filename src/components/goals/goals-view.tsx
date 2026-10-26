"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { Archive, CalendarDays, CheckCircle2, Flag, MoreHorizontal, Pencil, Plus, Repeat, RotateCcw, Target, Trash2, X, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryPill } from "@/components/shared/category";
import { useComposer } from "@/components/layout/composer";
import { useHref } from "@/components/layout/space-context";
import { TaskRow } from "@/components/tasks/task-row";
import { QuickAddTask } from "@/components/tasks/quick-add";
import { useActions, useLife, useToday } from "@/lib/data/store";
import { diffDays, formatLocalDate, relativeDayLabel } from "@/lib/dates";
import { goalProgress, linkedHabits, linkedTasks, milestonesFor, upcomingMilestones } from "@/lib/domain/goals";
import { compareTasks } from "@/lib/domain/tasks";
import { scheduleLabel } from "@/lib/domain/habits";
import type { Goal, GoalMilestone } from "@/lib/domain/types";
import { ValidationError } from "@/lib/data/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function targetLabel(goal: Goal, today: string) {
  if (!goal.targetDate) return "No target date";
  const days = diffDays(today, goal.targetDate);
  if (days < 0) return `Target was ${formatLocalDate(goal.targetDate)}`;
  if (days === 0) return "Target is today";
  if (days < 60) return `${days} day${days === 1 ? "" : "s"} to go`;
  return `Target ${formatLocalDate(goal.targetDate, { month: "short", day: "numeric", year: "numeric" })}`;
}

function MilestoneItem({ m, today }: { m: GoalMilestone; today: string }) {
  const actions = useActions();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(m.title);
  const [due, setDue] = useState(m.dueDate ?? "");
  const overdue = !m.completedAt && m.dueDate && m.dueDate < today;
  const save = async () => {
    try {
      if (await actions.updateMilestone(m.id, title, due || null)) setEditing(false);
    } catch (e) {
      toast.error(e instanceof ValidationError ? e.message : "Couldn't save milestone");
    }
  };
  if (editing)
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[#f7f8fb] p-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Milestone title" className="min-w-40 flex-1" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Milestone due date" className="w-40" />
        <Button size="sm" onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </li>
    );
  return (
    <li className="group flex items-center gap-3 rounded-[12px] px-2 py-2 hover:bg-[#f7f8fb]">
      <Checkbox checked={!!m.completedAt} onCheckedChange={(c) => actions.setMilestoneDone(m.id, c === true)} aria-label={m.completedAt ? `Mark “${m.title}” as not done` : `Complete milestone “${m.title}”`} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[14px] font-medium", m.completedAt && "text-faint-foreground line-through")}>{m.title}</p>
        {(m.dueDate || m.completedAt) && (
          <p className={cn("text-[12px] text-muted-foreground", overdue && "text-ink-rose")}>
            {m.completedAt ? `Completed ${formatLocalDate(m.completedAt.slice(0, 10))}` : `Due ${relativeDayLabel(m.dueDate!, today)}`}
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" className="opacity-60 group-hover:opacity-100" aria-label={`Edit milestone “${m.title}”`} onClick={() => setEditing(true)}>
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon-sm" className="opacity-60 group-hover:opacity-100" aria-label={`Delete milestone “${m.title}”`} onClick={() => actions.deleteMilestone(m.id)}>
        <X />
      </Button>
    </li>
  );
}

function GoalDetail({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const today = useToday();
  const actions = useActions();
  const composer = useComposer();
  const href = useHref();
  const milestones = useLife((d) => d.milestones);
  const tasks = useLife((d) => d.tasks);
  const habits = useLife((d) => d.habits);
  const notes = useLife((d) => d.notes);
  const category = useLife((d) => d.categories.find((c) => c.id === goal.categoryId) ?? null);
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const list = milestonesFor(goal.id, milestones);
  const p = goalProgress(goal, milestones);
  const gTasks = linkedTasks(goal.id, tasks).sort(compareTasks);
  const gHabits = linkedHabits(goal.id, habits);
  const gNotes = notes.filter((n) => n.goalId === goal.id && !n.archived);

  const addMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (await actions.addMilestone(goal.id, newTitle, newDue || null)) {
        setNewTitle("");
        setNewDue("");
      }
    } catch (err) {
      toast.error(err instanceof ValidationError ? err.message : "Couldn't add milestone");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-6 pt-6 pb-5 pr-14">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <CategoryPill category={category} />
          {goal.status !== "active" && <span className="rounded-full bg-[#f1f2f7] px-2 py-0.5 text-xs font-medium capitalize text-subtle-foreground">{goal.status}</span>}
        </div>
        <SheetTitle className="text-xl font-semibold tracking-[-0.01em]">{goal.title}</SheetTitle>
        <SheetDescription className="mt-1 text-sm text-muted-foreground">{goal.description || targetLabel(goal, today)}</SheetDescription>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[12.5px] text-muted-foreground">
            <span>{p.ratio === null ? "Add milestones to track progress" : `${p.completed} of ${p.total} milestones`}</span>
            <span>{targetLabel(goal, today)}</span>
          </div>
          <Progress value={(p.ratio ?? 0) * 100} label={`${goal.title} progress`} tone={(category?.color ?? "lavender") as "lavender"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => composer.openGoal(goal)}>
            <Pencil /> Edit
          </Button>
          {goal.status === "active" ? (
            <Button size="sm" variant="outline" onClick={() => actions.setGoalStatus(goal.id, "completed")}>
              <CheckCircle2 /> Mark complete
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => actions.setGoalStatus(goal.id, "active")}>
              <RotateCcw /> Reactivate
            </Button>
          )}
          {goal.status !== "archived" && (
            <Button size="sm" variant="ghost" onClick={() => actions.setGoalStatus(goal.id, "archived")}>
              <Archive /> Archive
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-danger hover:bg-soft-rose hover:text-danger"
            onClick={async () => {
              if (await actions.deleteGoal(goal.id)) onClose();
            }}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <section aria-labelledby="ms-title">
          <h3 id="ms-title" className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Milestones</h3>
          {list.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Break this goal into a few concrete steps.</p>}
          <ul className="-mx-2 grid">
            {list.map((m) => (
              <MilestoneItem key={m.id} m={m} today={today} />
            ))}
          </ul>
          <form onSubmit={addMilestone} className="mt-2 flex flex-wrap gap-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a milestone" aria-label="New milestone" className="min-w-40 flex-1" maxLength={160} />
            <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} aria-label="New milestone due date" className="w-40" />
            <Button type="submit" variant="soft" disabled={!newTitle.trim()}>
              <Plus /> Add
            </Button>
          </form>
        </section>
        <section aria-labelledby="gt-title" className="mt-7">
          <h3 id="gt-title" className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Linked tasks</h3>
          <QuickAddTask dueToday={false} goalId={goal.id} />
          {gTasks.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Tasks linked to this goal will show here.</p>
          ) : (
            <ul className="-mx-2.5 mt-2 grid">
              <AnimatePresence initial={false}>
                {gTasks.map((t) => (
                  <TaskRow key={t.id} task={t} compact />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>
        <section aria-labelledby="gh-title" className="mt-7">
          <h3 id="gh-title" className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Supporting habits</h3>
          {gHabits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Link a habit to this goal from the habit’s settings.</p>
          ) : (
            <ul className="grid gap-1.5">
              {gHabits.map((h) => (
                <li key={h.id}>
                  <Link href={`${href("habits")}?habit=${h.id}`} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-sm hover:bg-[#f7f8fb]">
                    <Repeat className="size-4 text-ink-green" aria-hidden />
                    <span className="flex-1">{h.name}</span>
                    <span className="text-[12px] text-muted-foreground">{scheduleLabel(h)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {gNotes.length > 0 && (
          <section aria-labelledby="gn-title" className="mt-7">
            <h3 id="gn-title" className="mb-2 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">Notes</h3>
            <ul className="grid gap-1.5">
              {gNotes.map((n) => (
                <li key={n.id}>
                  <Link href={`${href("notes")}?note=${n.id}`} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-sm hover:bg-[#f7f8fb]">
                    <FileText className="size-4 text-muted-foreground" aria-hidden />
                    {n.title || "Untitled note"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const today = useToday();
  const actions = useActions();
  const composer = useComposer();
  const milestones = useLife((d) => d.milestones);
  const tasks = useLife((d) => d.tasks);
  const habits = useLife((d) => d.habits);
  const category = useLife((d) => d.categories.find((c) => c.id === goal.categoryId) ?? null);
  const p = goalProgress(goal, milestones);
  const openTasks = linkedTasks(goal.id, tasks).filter((t) => t.status === "open").length;
  const nHabits = linkedHabits(goal.id, habits).length;

  return (
    <Card className="group flex flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <CategoryPill category={category} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1" aria-label={`More actions for ${goal.title}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => composer.openGoal(goal)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {goal.status === "active" ? (
              <DropdownMenuItem onSelect={() => actions.setGoalStatus(goal.id, "completed")}>
                <CheckCircle2 /> Mark complete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => actions.setGoalStatus(goal.id, "active")}>
                <RotateCcw /> Reactivate
              </DropdownMenuItem>
            )}
            {goal.status !== "archived" && (
              <DropdownMenuItem onSelect={() => actions.setGoalStatus(goal.id, "archived")}>
                <Archive /> Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => actions.deleteGoal(goal.id)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <button type="button" onClick={onOpen} className="mt-3 flex flex-1 flex-col text-left">
        <h3 className="text-[17px] leading-snug font-semibold tracking-[-0.01em]">{goal.title}</h3>
        {goal.description && <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{goal.description}</p>}
        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[24px] font-semibold tracking-tight">{p.ratio === null ? "–" : `${Math.round(p.ratio * 100)}%`}</span>
            <span className="text-[12.5px] text-muted-foreground">{p.total ? `${p.completed}/${p.total} milestones` : "No milestones yet"}</span>
          </div>
          <Progress value={(p.ratio ?? 0) * 100} tone={(category?.color ?? "lavender") as "lavender"} label={`${goal.title} progress`} />
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden /> {targetLabel(goal, today)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-3.5" aria-hidden /> {openTasks} open task{openTasks === 1 ? "" : "s"}
            </span>
            {nHabits > 0 && (
              <span className="inline-flex items-center gap-1">
                <Repeat className="size-3.5" aria-hidden /> {nHabits} habit{nHabits === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {p.nextMilestone && goal.status === "active" && (
            <p className="mt-3 truncate rounded-[10px] bg-[#f7f8fb] px-3 py-2 text-[12.5px]">
              <Flag className="mr-1.5 inline size-3.5 text-primary-strong" aria-hidden />
              Next: {p.nextMilestone.title}
            </p>
          )}
        </div>
      </button>
    </Card>
  );
}

export function GoalsView() {
  const today = useToday();
  const composer = useComposer();
  const params = useSearchParams();
  const router = useRouter();
  const goals = useLife((d) => d.goals);
  const milestones = useLife((d) => d.milestones);
  const [filter, setFilter] = useState<Goal["status"]>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = goals.find((g) => g.id === openId) ?? null;

  // Deep link: /goals?goal=id opens that goal, then the param is cleared from the URL.
  const goalParam = params.get("goal");
  const [seenParam, setSeenParam] = useState<string | null>(null);
  if (goalParam !== seenParam) {
    setSeenParam(goalParam);
    if (goalParam) {
      setOpenId(goalParam);
      const g = goals.find((x) => x.id === goalParam);
      if (g) setFilter(g.status);
    }
  }
  useEffect(() => {
    if (goalParam) router.replace(window.location.pathname, { scroll: false });
  }, [goalParam, router]);

  const list = goals.filter((g) => g.status === filter);
  const upcoming = useMemo(() => upcomingMilestones(goals, milestones, today, 4), [goals, milestones, today]);

  return (
    <>
      <PageHeader
        title="Goals"
        description="Where you're heading, and the milestones that get you there. Progress reflects milestones you've actually completed."
        actions={
          <Button onClick={() => composer.openGoal()}>
            <Plus /> New goal
          </Button>
        }
      />
      {upcoming.length > 0 && filter === "active" && (
        <Card className="mb-5 p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-semibold">Upcoming milestones</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map(({ milestone, goal }) => (
              <li key={milestone.id}>
                <button type="button" onClick={() => setOpenId(goal.id)} className="w-full rounded-[12px] bg-[#f7f8fb] px-3 py-2.5 text-left hover:bg-[#f1f2f7]">
                  <p className="text-[12px] font-medium text-primary-strong">{relativeDayLabel(milestone.dueDate!, today)}</p>
                  <p className="truncate text-[14px] font-medium">{milestone.title}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{goal.title}</p>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Goal["status"])} className="mb-4">
        <TabsList aria-label="Goal status">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title={filter === "active" ? "No active goals" : `No ${filter} goals`}
            description={filter === "active" ? "Choose something that matters to you and break it into milestones." : "Goals you complete or archive will be kept here."}
            action={filter === "active" ? <Button onClick={() => composer.openGoal()}><Plus /> Create a goal</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((g) => (
            <GoalCard key={g.id} goal={g} onOpen={() => setOpenId(g.id)} />
          ))}
        </div>
      )}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="right" className="w-[min(560px,100vw)]">{open && <GoalDetail goal={open} onClose={() => setOpenId(null)} />}</SheetContent>
      </Sheet>
    </>
  );
}
