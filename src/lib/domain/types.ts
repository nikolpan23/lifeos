import type { LocalDate, WallTime } from "@/lib/dates";

export type ISODateTime = string;

export interface BaseRecord {
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const CATEGORY_COLORS = ["lavender", "blue", "green", "peach", "rose", "yellow"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface PlanningPreferences {
  workStart: WallTime | null;
  workEnd: WallTime | null;
  wakeTime: WallTime | null;
  sleepTime: WallTime | null;
  /** Longest uninterrupted focus block the planner should suggest. */
  focusBlockMinutes: number;
  breakMinutes: number;
  /** Days of the week (0 = Sunday) that have working hours. */
  workDays: number[];
  /**
   * Where the planner may put tasks: outside working hours (personal time between
   * waking and sleeping, with working hours blocked on work days), inside working
   * hours only, or anywhere between waking and sleeping.
   */
  planWithin: "outside_work" | "work_hours" | "waking_hours";
}

export interface Profile {
  displayName: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  planning: PlanningPreferences;
  aiConsent: boolean;
  onboardedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Category extends BaseRecord {
  name: string;
  color: CategoryColor;
}

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task extends BaseRecord {
  title: string;
  notes: string;
  status: "open" | "done";
  priority: TaskPriority;
  dueDate: LocalDate | null;
  dueTime: WallTime | null;
  estimateMinutes: number | null;
  categoryId: string | null;
  goalId: string | null;
  completedAt: ISODateTime | null;
}

export type HabitSchedule = { type: "daily" } | { type: "weekdays"; days: number[] };

export interface Habit extends BaseRecord {
  name: string;
  description: string;
  categoryId: string | null;
  goalId: string | null;
  schedule: HabitSchedule;
  /** Optional preferred time and duration; used for conflict checks and planning. */
  preferredTime: WallTime | null;
  durationMinutes: number | null;
  status: "active" | "paused" | "archived";
  startDate: LocalDate;
}

export interface HabitCompletion extends BaseRecord {
  habitId: string;
  date: LocalDate;
}

export interface Goal extends BaseRecord {
  title: string;
  description: string;
  categoryId: string | null;
  targetDate: LocalDate | null;
  status: "active" | "completed" | "archived";
}

export interface GoalMilestone extends BaseRecord {
  goalId: string;
  title: string;
  dueDate: LocalDate | null;
  completedAt: ISODateTime | null;
  order: number;
}

export interface Note extends BaseRecord {
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  goalId: string | null;
  taskId: string | null;
}

export interface CalendarEvent extends BaseRecord {
  title: string;
  description: string;
  location: string;
  categoryId: string | null;
  allDay: boolean;
  /** Instants. For all-day events these are local midnights in the profile time zone. */
  start: ISODateTime;
  end: ISODateTime;
  /** For all-day events: inclusive local dates (authoritative for display). */
  startDate: LocalDate | null;
  endDate: LocalDate | null;
}

export type PlanItemKind = "task" | "habit" | "break" | "event";

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  refId: string | null;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  reason: string;
}

export interface DailyPlan extends BaseRecord {
  date: LocalDate;
  status: "draft" | "accepted" | "rejected";
  source: "rules" | "ai";
  summary: string;
  items: PlanItem[];
  /** Tasks that did not fit into the free time. */
  unscheduledTaskIds: string[];
  notes: string[];
}

export type ScenarioChange =
  | {
      id: string;
      type: "recurring_commitment";
      title: string;
      days: number[];
      startTime: WallTime;
      durationMinutes: number;
      categoryId: string | null;
      expense: number | null;
    }
  | {
      id: string;
      type: "one_off_event";
      title: string;
      startDate: LocalDate;
      endDate: LocalDate;
      allDay: boolean;
      startTime: WallTime | null;
      endTime: WallTime | null;
      categoryId: string | null;
      expense: number | null;
    }
  | {
      id: string;
      type: "project_workload";
      title: string;
      hoursPerWeek: number;
      deadline: LocalDate | null;
      goalId: string | null;
      expense: number | null;
    }
  | {
      id: string;
      type: "move_deadline";
      taskId: string;
      newDueDate: LocalDate;
    }
  | {
      id: string;
      type: "remove_event";
      eventId: string;
    };

export type ScenarioChangeType = ScenarioChange["type"];

export interface Scenario extends BaseRecord {
  title: string;
  description: string;
  status: "draft" | "applied";
  horizonStart: LocalDate;
  horizonDays: number;
  changes: ScenarioChange[];
  appliedAt: ISODateTime | null;
}

export interface InsightState extends BaseRecord {
  /** Stable key derived from rule id and related record ids. */
  key: string;
  status: "dismissed" | "snoozed";
  snoozedUntil: ISODateTime | null;
}

export interface LifeData {
  profile: Profile;
  categories: Category[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  goals: Goal[];
  milestones: GoalMilestone[];
  notes: Note[];
  events: CalendarEvent[];
  dailyPlans: DailyPlan[];
  scenarios: Scenario[];
  insightStates: InsightState[];
}

export type CollectionName = Exclude<keyof LifeData, "profile">;

export type CollectionRecord<C extends CollectionName> = LifeData[C][number];

export const COLLECTIONS: CollectionName[] = [
  "categories",
  "tasks",
  "habits",
  "habitCompletions",
  "goals",
  "milestones",
  "notes",
  "events",
  "dailyPlans",
  "scenarios",
  "insightStates",
];

export const DEFAULT_PLANNING: PlanningPreferences = {
  workStart: "09:00",
  workEnd: "17:30",
  wakeTime: "07:00",
  sleepTime: "23:00",
  focusBlockMinutes: 90,
  breakMinutes: 15,
  workDays: [1, 2, 3, 4, 5],
  planWithin: "outside_work",
};
