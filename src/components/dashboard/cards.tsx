"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarDays, CalendarPlus, Check, CheckCircle2, Flame, MapPin, Plus, Repeat, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryDot, categoryStyle } from "@/components/shared/category";
import { TaskRow } from "@/components/tasks/task-row";
import { QuickAddTask } from "@/components/tasks/quick-add";
import { useComposer } from "@/components/layout/composer";
import { useHref } from "@/components/layout/space-context";
import { nextHourPreset } from "@/components/calendar/event-dialog";
import { useActions, useLife, useNow, useToday } from "@/lib/data/store";
import { addDays, compareLocal, formatLocalDate, formatTime, localDateOf, relativeDayLabel } from "@/lib/dates";
import { compareTasks } from "@/lib/domain/tasks";
import { currentStreak, habitsDueOn, completionId } from "@/lib/domain/habits";
import { goalProgress, upcomingMilestones } from "@/lib/domain/goals";
import { cn } from "@/lib/utils";

/* ------------------------------ Today's progress ----------------------------- */

function Ring({ value, size = 112, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduce = useReducedMotion();
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efd9c4" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#c26a45"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={reduce ? false : { strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

export function useTodayProgress() {
  const today = useToday();
  const tasks = useLife((d) => d.tasks);
  const habits = useLife((d) => d.habits);
  const completions = useLife((d) => d.habitCompletions);
  const tz = useLife((d) => d.profile.timezone);
  return useMemo(() => {
    const relevant = tasks.filter((t) => (t.status === "open" && t.dueDate && compareLocal(t.dueDate, today) <= 0) || (t.status === "done" && t.completedAt && localDateOf(t.completedAt, tz) === today));
    const tasksDone = relevant.filter((t) => t.status === "done").length;
    const due = habitsDueOn(habits, today);
    const habitsDone = due.filter((h) => completions.some((c) => c.id === completionId(h.id, today))).length;
    const total = relevant.length + due.length;
    const done = tasksDone + habitsDone;
    return { tasksDone, tasksTotal: relevant.length, habitsDone, habitsTotal: due.length, ratio: total ? done / total : 0, total };
  }, [tasks, habits, completions, today, tz]);
}

export function TodayProgressCard() {
  const p = useTodayProgress();
  const pct = Math.round(p.ratio * 100);
  const message = p.total === 0 ? "A clear day. Add something, or enjoy it." : pct === 100 ? "Everything for today is done. Lovely work." : pct >= 50 ? "More than halfway there." : p.tasksDone + p.habitsDone > 0 ? "Good start. Keep the momentum gentle." : "Fresh day, fresh start.";
  return (
    <Card className="border-[#efd9c4] bg-lavender/70 shadow-none">
      <CardContent className="flex items-center gap-5 p-5">
        <div className="relative shrink-0">
          <Ring value={p.ratio} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] leading-none font-semibold tracking-tight">{pct}%</span>
            <span className="mt-1 text-[11px] text-muted-foreground">done</span>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold">Today’s progress</h2>
          <p className="mt-0.5 text-[13px] text-subtle-foreground">{message}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[12px] text-muted-foreground">Tasks</dt>
              <dd className="text-[15px] font-semibold">
                {p.tasksDone}
                <span className="font-normal text-muted-foreground">/{p.tasksTotal}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[12px] text-muted-foreground">Habits</dt>
              <dd className="text-[15px] font-semibold">
                {p.habitsDone}
                <span className="font-normal text-muted-foreground">/{p.habitsTotal}</span>
              </dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Tasks today -------------------------------- */

export function TasksTodayCard() {
  const today = useToday();
  const href = useHref();
  const tz = useLife((d) => d.profile.timezone);
  const tasks = useLife((d) => d.tasks);
  const { open, doneToday } = useMemo(() => {
    const open = tasks.filter((t) => t.status === "open" && t.dueDate && compareLocal(t.dueDate, today) <= 0).sort(compareTasks);
    const doneToday = tasks.filter((t) => t.status === "done" && t.completedAt && localDateOf(t.completedAt, tz) === today);
    return { open, doneToday };
  }, [tasks, today, tz]);
  const overdue = open.filter((t) => t.dueDate! < today).length;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div>
          <CardTitle>Tasks due today</CardTitle>
          <CardDescription>
            {open.length === 0 ? "You're all caught up" : `${open.length} to go${overdue ? `, including ${overdue} from earlier` : ""}`}
            {doneToday.length > 0 && ` · ${doneToday.length} done today`}
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href("tasks")}>
            All tasks <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <QuickAddTask />
        {open.length === 0 && doneToday.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing due today" description="Add a task above, or pull something forward from your upcoming list." tone="green" className="py-6" />
        ) : (
          <ul className="-mx-2.5 grid" aria-label="Tasks due today">
            <AnimatePresence initial={false}>
              {open.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
              {doneToday.slice(0, 3).map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------- Schedule ---------------------------------- */

export function ScheduleCard() {
  const today = useToday();
  const now = useNow();
  const href = useHref();
  const composer = useComposer();
  const tz = useLife((d) => d.profile.timezone);
  const events = useLife((d) => d.events);
  const categories = useLife((d) => d.categories);

  const { todays, allDay, next } = useMemo(() => {
    const tomorrow = addDays(today, 1);
    const todays = events.filter((e) => !e.allDay && localDateOf(e.start, tz) === today).sort((a, b) => a.start.localeCompare(b.start));
    const allDay = events.filter((e) => e.allDay && e.startDate! <= today && e.endDate! >= today);
    const next = events
      .filter((e) => {
        const d = e.allDay ? e.startDate! : localDateOf(e.start, tz);
        return compareLocal(d, tomorrow) >= 0 && compareLocal(d, addDays(today, 7)) <= 0;
      })
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 3);
    return { todays, allDay, next };
  }, [events, today, tz]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Today’s schedule</CardTitle>
          <CardDescription>{todays.length ? `${todays.length} event${todays.length === 1 ? "" : "s"}` : "No events today"}</CardDescription>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Add event" onClick={() => composer.openEvent(null, nextHourPreset(today, tz))}>
            <CalendarPlus />
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={href("calendar")}>
              Calendar <ArrowRight />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allDay.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {allDay.map((e) => (
              <span key={e.id} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", categoryStyle(categories.find((c) => c.id === e.categoryId)).soft, categoryStyle(categories.find((c) => c.id === e.categoryId)).text)}>
                {e.title}
              </span>
            ))}
          </div>
        )}
        {todays.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Your calendar is clear" description="A good day for deep work." tone="blue" className="py-5" />
        ) : (
          <ol className="relative grid gap-1">
            {todays.map((e) => {
              const past = new Date(e.end) <= now;
              const live = new Date(e.start) <= now && !past;
              const cat = categories.find((c) => c.id === e.categoryId);
              const s = categoryStyle(cat);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => composer.openEvent(e)}
                    className={cn("flex w-full items-stretch gap-3 rounded-[12px] p-2 text-left transition-colors hover:bg-[#f6efe2]", past && "opacity-55")}
                  >
                    <span className="w-[68px] shrink-0 pt-0.5 text-[12.5px] font-medium text-muted-foreground tabular-nums">{formatTime(e.start, tz)}</span>
                    <span className={cn("w-1 shrink-0 rounded-full", s.dot)} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">{e.title}</span>
                        {live && <span className="rounded-full bg-soft-green px-1.5 py-px text-[11px] font-semibold text-ink-green">Now</span>}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
                        {formatTime(e.start, tz)}–{formatTime(e.end, tz)}
                        {e.location && (
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            <span className="truncate">{e.location}</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
        {next.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">Coming up</p>
            <ul className="grid gap-1.5">
              {next.map((e) => {
                const d = e.allDay ? e.startDate! : localDateOf(e.start, tz);
                return (
                  <li key={e.id} className="flex items-center gap-2.5 text-[13px]">
                    <CategoryDot category={categories.find((c) => c.id === e.categoryId)} />
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {relativeDayLabel(d, today)}
                      {!e.allDay && ` · ${formatTime(e.start, tz)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------------- Habits ----------------------------------- */

export function HabitsTodayCard() {
  const today = useToday();
  const href = useHref();
  const actions = useActions();
  const composer = useComposer();
  const reduce = useReducedMotion();
  const habits = useLife((d) => d.habits);
  const completions = useLife((d) => d.habitCompletions);
  const categories = useLife((d) => d.categories);
  const due = useMemo(() => habitsDueOn(habits, today).sort((a, b) => (a.preferredTime ?? "99").localeCompare(b.preferredTime ?? "99")), [habits, today]);
  const doneSet = useMemo(() => new Set(completions.filter((c) => c.date === today).map((c) => c.habitId)), [completions, today]);
  const doneCount = due.filter((h) => doneSet.has(h.id)).length;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Habits today</CardTitle>
          <CardDescription>{due.length ? `${doneCount} of ${due.length} done` : "Nothing scheduled today"}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href("habits")}>
            Habits <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {due.length === 0 ? (
          <EmptyState icon={Repeat} title="No habits today" description="Start with one small thing you'd like to do more often." action={<Button size="sm" variant="soft" onClick={() => composer.openHabit()}><Plus /> New habit</Button>} className="py-5" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {due.map((h) => {
              const done = doneSet.has(h.id);
              const streak = currentStreak(h, completions, today);
              const s = categoryStyle(categories.find((c) => c.id === h.categoryId));
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    aria-pressed={done}
                    onClick={() => actions.toggleHabit(h.id, today)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition-all duration-200 active:scale-[0.98]",
                      done ? "border-transparent bg-soft-green" : "border-border bg-surface hover:border-border-strong hover:bg-[#fcf6ec]",
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full transition-colors", done ? "bg-[#8fae7a] text-white" : cn(s.soft, s.text))}>
                      <AnimatePresence mode="wait" initial={false}>
                        {done ? (
                          <motion.span key="d" initial={reduce ? false : { scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
                            <Check className="size-4" strokeWidth={3} aria-hidden />
                          </motion.span>
                        ) : (
                          <motion.span key="n" initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}>
                            <Repeat className="size-4" aria-hidden />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[14px] font-medium", done && "text-ink-green")}>{h.name}</span>
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        {streak > 0 ? (
                          <>
                            <Flame className="size-3 text-ink-peach" aria-hidden /> {streak} in a row
                          </>
                        ) : h.preferredTime ? (
                          `Around ${h.preferredTime}`
                        ) : (
                          "Anytime today"
                        )}
                      </span>
                    </span>
                    <span className="sr-only">{done ? "Completed. Press to undo." : "Not done yet. Press to mark complete."}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------ Goals ----------------------------------- */

export function GoalsCard() {
  const href = useHref();
  const today = useToday();
  const composer = useComposer();
  const goals = useLife((d) => d.goals);
  const milestones = useLife((d) => d.milestones);
  const categories = useLife((d) => d.categories);
  const active = goals.filter((g) => g.status === "active").slice(0, 4);
  const upcoming = upcomingMilestones(goals, milestones, today, 2);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Goal progress</CardTitle>
          <CardDescription>Based on milestones you’ve completed</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href("goals")}>
            Goals <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <EmptyState icon={Target} title="No active goals" description="Pick something meaningful and break it into a few milestones." action={<Button size="sm" variant="soft" onClick={() => composer.openGoal()}><Plus /> New goal</Button>} className="py-5" />
        ) : (
          <ul className="grid gap-4">
            {active.map((g) => {
              const p = goalProgress(g, milestones);
              const cat = categories.find((c) => c.id === g.categoryId);
              const tone = (cat?.color ?? "lavender") as "lavender";
              return (
                <li key={g.id}>
                  <Link href={`${href("goals")}?goal=${g.id}`} className="block rounded-[10px] focus-visible:outline-2">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="truncate text-[14px] font-medium">{g.title}</span>
                      <span className="shrink-0 text-[12.5px] text-muted-foreground tabular-nums">{p.ratio === null ? "No milestones" : `${p.completed}/${p.total}`}</span>
                    </div>
                    <Progress value={(p.ratio ?? 0) * 100} tone={tone} label={`${g.title} progress`} />
                    {p.nextMilestone && (
                      <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
                        Next: {p.nextMilestone.title}
                        {p.nextMilestone.dueDate && ` · ${relativeDayLabel(p.nextMilestone.dueDate, today)}`}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {upcoming.length > 0 && active.length > 0 && (
          <p className="mt-4 rounded-[12px] bg-soft-blue px-3 py-2 text-[12.5px] text-ink-blue">
            Upcoming milestone: <strong className="font-semibold">{upcoming[0].milestone.title}</strong> on {formatLocalDate(upcoming[0].milestone.dueDate!, { weekday: "short", month: "short", day: "numeric" })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
