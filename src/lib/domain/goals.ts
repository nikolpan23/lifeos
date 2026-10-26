import { compareLocal, type LocalDate } from "@/lib/dates";
import type { Goal, GoalMilestone, Habit, Task } from "./types";

export interface GoalProgress {
  total: number;
  completed: number;
  /** 0..1, derived only from milestone completion. Null when the goal has no milestones yet. */
  ratio: number | null;
  nextMilestone: GoalMilestone | null;
}

export function milestonesFor(goalId: string, milestones: GoalMilestone[]): GoalMilestone[] {
  return milestones
    .filter((m) => m.goalId === goalId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function goalProgress(goal: Goal, milestones: GoalMilestone[]): GoalProgress {
  const list = milestonesFor(goal.id, milestones);
  const completed = list.filter((m) => m.completedAt).length;
  const open = list.filter((m) => !m.completedAt);
  const nextMilestone =
    open
      .filter((m) => m.dueDate)
      .sort((a, b) => compareLocal(a.dueDate!, b.dueDate!))[0] ?? open[0] ?? null;
  return {
    total: list.length,
    completed,
    ratio: list.length ? completed / list.length : null,
    nextMilestone,
  };
}

export function linkedTasks(goalId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.goalId === goalId);
}

export function linkedHabits(goalId: string, habits: Habit[]): Habit[] {
  return habits.filter((h) => h.goalId === goalId && h.status !== "archived");
}

export function upcomingMilestones(goals: Goal[], milestones: GoalMilestone[], today: LocalDate, limit = 5) {
  const activeGoals = new Map(goals.filter((g) => g.status === "active").map((g) => [g.id, g]));
  return milestones
    .filter((m) => !m.completedAt && m.dueDate && activeGoals.has(m.goalId) && compareLocal(m.dueDate, today) >= 0)
    .sort((a, b) => compareLocal(a.dueDate!, b.dueDate!))
    .slice(0, limit)
    .map((m) => ({ milestone: m, goal: activeGoals.get(m.goalId)! }));
}
