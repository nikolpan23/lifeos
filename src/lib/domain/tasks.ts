import { compareLocal, type LocalDate } from "@/lib/dates";
import type { Task, TaskPriority } from "./types";

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

export function isOverdue(task: Task, today: LocalDate): boolean {
  return task.status === "open" && !!task.dueDate && compareLocal(task.dueDate, today) < 0;
}

export function isDueToday(task: Task, today: LocalDate): boolean {
  return task.status === "open" && task.dueDate === today;
}

/** Sort open tasks: overdue first, then by due date, priority, then creation. */
export function compareTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === "open" ? -1 : 1;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return compareLocal(a.dueDate, b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  if (a.dueTime && b.dueTime && a.dueTime !== b.dueTime) return a.dueTime < b.dueTime ? -1 : 1;
  const p = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  if (p) return p;
  return a.createdAt.localeCompare(b.createdAt);
}

export type TaskView = "today" | "upcoming" | "anytime" | "completed";

export function filterTaskView(tasks: Task[], view: TaskView, today: LocalDate): Task[] {
  switch (view) {
    case "today":
      return tasks.filter((t) => t.status === "open" && !!t.dueDate && compareLocal(t.dueDate, today) <= 0).sort(compareTasks);
    case "upcoming":
      return tasks.filter((t) => t.status === "open" && !!t.dueDate && compareLocal(t.dueDate, today) > 0).sort(compareTasks);
    case "anytime":
      return tasks.filter((t) => t.status === "open" && !t.dueDate).sort(compareTasks);
    case "completed":
      return tasks
        .filter((t) => t.status === "done")
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  }
}

export function matchesQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const hay = text.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => hay.includes(term));
}
