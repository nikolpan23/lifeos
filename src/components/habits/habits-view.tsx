"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, ChevronLeft, ChevronRight, Flame, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Trash2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { CategoryPill, categoryStyle } from "@/components/shared/category";
import { useComposer } from "@/components/layout/composer";
import { useActions, useLife, useToday } from "@/lib/data/store";
import { addDays, compareLocal, dateRange, formatLocalDate, startOfWeek, weekdayShort } from "@/lib/dates";
import { bestStreak, completionSet, consistency, currentStreak, isScheduledOn, scheduleLabel, streakMessage, weekCells } from "@/lib/domain/habits";
import type { Habit } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Filter = "active" | "paused" | "archived";

function History({ habit }: { habit: Habit }) {
  const today = useToday();
  const completions = useLife((d) => d.habitCompletions);
  const weekStartsOn = useLife((d) => d.profile.weekStartsOn);
  const done = useMemo(() => completionSet(habit.id, completions), [habit.id, completions]);
  const start = startOfWeek(addDays(today, -7 * 15), weekStartsOn);
  const weeks = Array.from({ length: 16 }, (_, w) => dateRange(addDays(start, w * 7), 7));
  const doneCount = weeks.flat().filter((d) => done.has(d)).length;
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="mb-2 text-[12px] font-medium text-muted-foreground">Last 16 weeks · {doneCount} check-ins</p>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label={`${habit.name}: ${doneCount} completions in the last 16 weeks`}>
        {weeks.map((week) => (
          <div key={week[0]} className="grid shrink-0 gap-[3px]">
            {week.map((d) => {
              const future = compareLocal(d, today) > 0;
              const scheduled = isScheduledOn(habit, d);
              return (
                <span
                  key={d}
                  title={`${formatLocalDate(d, { weekday: "short", month: "short", day: "numeric" })}${done.has(d) ? " · done" : scheduled && !future ? " · not done" : ""}`}
                  className={cn("size-3 rounded-[3px]", future ? "bg-transparent" : done.has(d) ? "bg-[#1f9e86]" : scheduled ? "bg-[#e6e8ef]" : "bg-[#f4f5f8]")}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitRow({ habit, weekStart, focus }: { habit: Habit; weekStart: string; focus: boolean }) {
  const today = useToday();
  const actions = useActions();
  const composer = useComposer();
  const completions = useLife((d) => d.habitCompletions);
  const category = useLife((d) => d.categories.find((c) => c.id === habit.categoryId) ?? null);
  const goal = useLife((d) => d.goals.find((g) => g.id === habit.goalId) ?? null);
  const [showHistory, setShowHistory] = useState(focus);
  const cells = weekCells(habit, completions, weekStart, today);
  const streak = currentStreak(habit, completions, today);
  const best = bestStreak(habit, completions, today);
  const c30 = consistency(habit, completions, today, 30);
  const doneToday = completions.some((c) => c.habitId === habit.id && c.date === today);
  const s = categoryStyle(category);
  const interactive = habit.status === "active";

  return (
    <Card className={cn("p-4 sm:p-5", focus && "ring-2 ring-[#d9d4ff]")}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[13px]", s.soft, s.text)}>
            <Repeat className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold">{habit.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
              <span>{scheduleLabel(habit)}</span>
              {habit.preferredTime && <span>· {habit.preferredTime}</span>}
              {habit.durationMinutes && <span>· {habit.durationMinutes} min</span>}
              <CategoryPill category={category} />
            </p>
            {goal && <p className="mt-1 truncate text-[12.5px] text-subtle-foreground">Supports “{goal.title}”</p>}
            {interactive && <p className="mt-1.5 text-[13px] text-subtle-foreground">{streakMessage(streak, doneToday, isScheduledOn(habit, today))}</p>}
          </div>
        </div>

        <ul className="flex justify-between gap-1.5 md:justify-end" aria-label={`${habit.name}, last 7 days`}>
          {cells.map((cell) => {
            const label = `${weekdayShort(cell.date)} ${formatLocalDate(cell.date)}: ${cell.done ? "done" : cell.scheduled ? "not done" : "not scheduled"}`;
            return (
              <li key={cell.date} className="flex flex-col items-center gap-1">
                <span className={cn("text-[11px] font-medium", cell.date === today ? "text-primary-strong" : "text-faint-foreground")}>{weekdayShort(cell.date).slice(0, 2)}</span>
                <button
                  type="button"
                  disabled={cell.future || !interactive}
                  aria-pressed={cell.done}
                  aria-label={label}
                  onClick={() => actions.toggleHabit(habit.id, cell.date)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border transition-all duration-150 active:scale-90 disabled:cursor-default",
                    cell.done
                      ? "border-transparent bg-[#1f9e86] text-white"
                      : cell.scheduled && !cell.future
                        ? "border-border-strong bg-surface hover:border-[#1f9e86] hover:bg-soft-green"
                        : "border-dashed border-border bg-transparent",
                    cell.date === today && !cell.done && "border-accent ring-2 ring-accent/20",
                  )}
                >
                  {cell.done && <Check className="size-4" strokeWidth={3} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 md:w-[200px] md:justify-end">
          <dl className="flex gap-4 text-center">
            <div>
              <dt className="text-[11px] text-muted-foreground">Streak</dt>
              <dd className="flex items-center justify-center gap-1 text-[15px] font-semibold">
                <Flame className="size-3.5 text-ink-peach" aria-hidden />
                {streak}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">Best</dt>
              <dd className="flex items-center justify-center gap-1 text-[15px] font-semibold">
                <Trophy className="size-3.5 text-ink-yellow" aria-hidden />
                {best}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">30 days</dt>
              <dd className="text-[15px] font-semibold">{c30.scheduled ? `${Math.round(c30.rate * 100)}%` : "–"}</dd>
            </div>
          </dl>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`More actions for ${habit.name}`} className="ml-auto md:ml-0">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => composer.openHabit(habit)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowHistory((s) => !s)}>
                <Repeat /> {showHistory ? "Hide history" : "Show history"}
              </DropdownMenuItem>
              {habit.status === "active" && (
                <DropdownMenuItem onSelect={() => actions.setHabitStatus(habit.id, "paused")}>
                  <Pause /> Pause
                </DropdownMenuItem>
              )}
              {habit.status !== "active" && (
                <DropdownMenuItem onSelect={() => actions.setHabitStatus(habit.id, "active")}>
                  <Play /> Resume
                </DropdownMenuItem>
              )}
              {habit.status !== "archived" && (
                <DropdownMenuItem onSelect={() => actions.setHabitStatus(habit.id, "archived")}>
                  <Archive /> Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => actions.deleteHabit(habit.id)}>
                <Trash2 /> Delete with history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {showHistory && <History habit={habit} />}
    </Card>
  );
}

export function HabitsView() {
  const today = useToday();
  const composer = useComposer();
  const params = useSearchParams();
  const router = useRouter();
  const habits = useLife((d) => d.habits);
  const completions = useLife((d) => d.habitCompletions);
  const [filter, setFilter] = useState<Filter>("active");
  const [weekOffset, setWeekOffset] = useState(0);
  const [focusId] = useState(params.get("habit"));
  const weekStart = addDays(today, -6 + weekOffset * 7);

  useEffect(() => {
    if (params.get("habit")) router.replace(window.location.pathname, { scroll: false });
  }, [params, router]);

  const list = habits.filter((h) => h.status === filter).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const dueToday = habits.filter((h) => h.status === "active" && isScheduledOn(h, today));
  const doneToday = dueToday.filter((h) => completions.some((c) => c.habitId === h.id && c.date === today)).length;
  const counts = { active: habits.filter((h) => h.status === "active").length, paused: habits.filter((h) => h.status === "paused").length, archived: habits.filter((h) => h.status === "archived").length };

  return (
    <>
      <PageHeader
        title="Habits"
        description={dueToday.length ? `${doneToday} of ${dueToday.length} done today. Every check-in counts, and missed days don't erase progress.` : "Small things, done often. Pick the days that suit your life."}
        actions={
          <Button onClick={() => composer.openHabit()}>
            <Plus /> New habit
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList aria-label="Habit status">
            <TabsTrigger value="active">Active {counts.active > 0 && `(${counts.active})`}</TabsTrigger>
            <TabsTrigger value="paused">Paused {counts.paused > 0 && `(${counts.paused})`}</TabsTrigger>
            <TabsTrigger value="archived">Archived {counts.archived > 0 && `(${counts.archived})`}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous 7 days" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft />
          </Button>
          <span className="min-w-36 text-center text-[13px] font-medium" aria-live="polite">
            {weekOffset === 0 ? "Last 7 days" : `${formatLocalDate(weekStart)} – ${formatLocalDate(addDays(weekStart, 6))}`}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Next 7 days" disabled={weekOffset >= 0} onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            tone="green"
            title={filter === "active" ? "No active habits yet" : filter === "paused" ? "No paused habits" : "No archived habits"}
            description={filter === "active" ? "Start with one small, specific habit. You can always add more." : "Habits you pause or archive will appear here."}
            action={filter === "active" ? <Button onClick={() => composer.openHabit()}><Plus /> Create a habit</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {list.map((h) => (
            <HabitRow key={h.id} habit={h} weekStart={weekStart} focus={h.id === focusId} />
          ))}
        </div>
      )}
    </>
  );
}
