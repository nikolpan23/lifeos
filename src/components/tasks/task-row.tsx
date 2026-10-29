"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlarmClock, CalendarClock, Clock, Flag, MoreHorizontal, Pencil, Target, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CategoryPill } from "@/components/shared/category";
import { useComposer } from "@/components/layout/composer";
import { useActions, useLife, useToday } from "@/lib/data/store";
import { addDays, durationLabel, formatWallTime, relativeDayLabel } from "@/lib/dates";
import { isOverdue } from "@/lib/domain/tasks";
import type { Task } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const PRIORITY_FLAG: Record<Task["priority"], string | null> = { high: "text-ink-rose", medium: null, low: null };

export const TaskRow = memo(function TaskRow({ task, compact, highlight }: { task: Task; compact?: boolean; highlight?: boolean }) {
  const actions = useActions();
  const composer = useComposer();
  const today = useToday();
  const reduce = useReducedMotion();
  const category = useLife((d) => d.categories.find((c) => c.id === task.categoryId) ?? null);
  const goal = useLife((d) => (task.goalId ? (d.goals.find((g) => g.id === task.goalId) ?? null) : null));
  const done = task.status === "done";
  const overdue = isOverdue(task, today);

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-start gap-3 rounded-[12px] px-2.5 py-2.5 transition-colors hover:bg-[#f6efe2]",
        highlight && "bg-lavender/60 ring-1 ring-[#e6c7aa]",
      )}
    >
      <Checkbox
        round
        checked={done}
        onCheckedChange={(c) => actions.setTaskDone(task.id, c === true)}
        aria-label={done ? `Mark “${task.title}” as not done` : `Complete “${task.title}”`}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => composer.openTask(task)} className="block w-full text-left">
          <span className={cn("block text-[14.5px] leading-snug font-medium transition-colors", done && "text-faint-foreground line-through decoration-[#cdbfa6]")}>{task.title}</span>
        </button>
        <div className={cn("mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted-foreground", compact && "mt-0.5")}>
          {task.dueDate && (
            <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-ink-rose")}>
              {overdue ? <AlarmClock className="size-3.5" aria-hidden /> : <CalendarClock className="size-3.5" aria-hidden />}
              {overdue && <span className="sr-only">Overdue:</span>}
              {relativeDayLabel(task.dueDate, today)}
              {task.dueTime && ` · ${formatWallTime(task.dueTime)}`}
            </span>
          )}
          {task.estimateMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {durationLabel(task.estimateMinutes)}
            </span>
          )}
          {PRIORITY_FLAG[task.priority] && !done && (
            <span className={cn("inline-flex items-center gap-1 font-medium", PRIORITY_FLAG[task.priority])}>
              <Flag className="size-3.5" aria-hidden /> High
            </span>
          )}
          {!compact && goal && (
            <span className="inline-flex max-w-48 items-center gap-1 truncate">
              <Target className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{goal.title}</span>
            </span>
          )}
          {!compact && <CategoryPill category={category} />}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100" aria-label={`More actions for “${task.title}”`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => composer.openTask(task)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          {!done && (
            <>
              <DropdownMenuItem onSelect={() => actions.rescheduleTask(task.id, today)} disabled={task.dueDate === today}>
                <CalendarClock /> Move to today
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.rescheduleTask(task.id, addDays(today, 1))}>
                <CalendarClock /> Move to tomorrow
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => actions.rescheduleTask(task.id, null)} disabled={!task.dueDate}>
                <CalendarClock /> Remove due date
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => actions.deleteTask(task.id)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.li>
  );
});
