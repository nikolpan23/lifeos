import { z } from "zod";
import { isLocalDate, isValidTimeZone, isWallTime } from "@/lib/dates";
import { CATEGORY_COLORS, TASK_PRIORITIES } from "./types";

export const localDate = z.string().refine(isLocalDate, "Use a valid date");
export const wallTime = z.string().refine(isWallTime, "Use a valid time (HH:mm)");
export const isoDateTime = z.iso.datetime({ offset: true });
export const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/, "Invalid id");
export const timeZone = z.string().refine(isValidTimeZone, "Choose a valid time zone");

const trimmed = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters`);
const requiredText = (max: number, label = "This field") => trimmed(max).min(1, `${label} is required`);

const base = {
  id,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
};

/**
 * Profiles saved before working days existed defaulted to planning inside working
 * hours, which put personal tasks in the middle of the workday. They are read as
 * Monday to Friday with working hours kept free, until preferences are saved again.
 */
function migratePlanning(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || "workDays" in raw) return raw;
  const p = raw as Record<string, unknown>;
  return { ...p, workDays: [1, 2, 3, 4, 5], planWithin: p.planWithin === "work_hours" ? "outside_work" : p.planWithin };
}

const planningObject = z
  .object({
    workStart: wallTime.nullable(),
    workEnd: wallTime.nullable(),
    wakeTime: wallTime.nullable(),
    sleepTime: wallTime.nullable(),
    focusBlockMinutes: z.number().int().min(25).max(240),
    breakMinutes: z.number().int().min(0).max(60),
    workDays: z.array(z.number().int().min(0).max(6)).max(7),
    planWithin: z.enum(["outside_work", "work_hours", "waking_hours"]),
  })
  .refine((p) => !p.workStart || !p.workEnd || p.workStart < p.workEnd, {
    message: "Working hours must end after they start",
    path: ["workEnd"],
  });

export const planningSchema = z.preprocess(migratePlanning, planningObject);

export const profileSchema = z.object({
  displayName: requiredText(60, "Name"),
  timezone: timeZone,
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
  planning: planningSchema,
  aiConsent: z.boolean(),
  onboardedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const categoryInput = z.object({
  name: requiredText(40, "Name"),
  color: z.enum(CATEGORY_COLORS),
});
export const categorySchema = categoryInput.extend(base);

export const taskInput = z.object({
  title: requiredText(200, "Title"),
  notes: trimmed(5000).default(""),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: localDate.nullable(),
  dueTime: wallTime.nullable(),
  estimateMinutes: z.number().int().min(5, "At least 5 minutes").max(16 * 60, "At most 16 hours").nullable(),
  categoryId: id.nullable(),
  goalId: id.nullable(),
});
export const taskSchema = taskInput.extend({
  ...base,
  status: z.enum(["open", "done"]),
  completedAt: isoDateTime.nullable(),
});

export const habitScheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("daily") }),
  z.object({
    type: z.literal("weekdays"),
    days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day").max(7),
  }),
]);

export const habitInput = z.object({
  name: requiredText(80, "Name"),
  description: trimmed(500).default(""),
  categoryId: id.nullable(),
  goalId: id.nullable(),
  schedule: habitScheduleSchema,
  preferredTime: wallTime.nullable(),
  durationMinutes: z.number().int().min(1).max(600).nullable(),
});
export const habitSchema = habitInput.extend({
  ...base,
  status: z.enum(["active", "paused", "archived"]),
  startDate: localDate,
});

export const habitCompletionSchema = z.object({
  ...base,
  habitId: id,
  date: localDate,
});

export const goalInput = z.object({
  title: requiredText(120, "Title"),
  description: trimmed(2000).default(""),
  categoryId: id.nullable(),
  targetDate: localDate.nullable(),
});
export const goalSchema = goalInput.extend({
  ...base,
  status: z.enum(["active", "completed", "archived"]),
});

export const milestoneInput = z.object({
  title: requiredText(160, "Milestone"),
  dueDate: localDate.nullable(),
});
export const milestoneSchema = milestoneInput.extend({
  ...base,
  goalId: id,
  completedAt: isoDateTime.nullable(),
  order: z.number().int().min(0).max(10_000),
});

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(32)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u, "Tags can use letters, numbers, spaces, - and _");

export const noteInput = z.object({
  title: trimmed(200),
  body: z.string().max(100_000, "This note is too long"),
  tags: z.array(tagSchema).max(20),
  goalId: id.nullable(),
  taskId: id.nullable(),
});
export const noteSchema = noteInput.extend({
  ...base,
  pinned: z.boolean(),
  archived: z.boolean(),
});

export const eventInput = z
  .object({
    title: requiredText(160, "Title"),
    description: trimmed(5000).default(""),
    location: trimmed(200).default(""),
    categoryId: id.nullable(),
    allDay: z.boolean(),
    startDate: localDate,
    endDate: localDate,
    startTime: wallTime.nullable(),
    endTime: wallTime.nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", message: "End date must be on or after the start date", path: ["endDate"] });
    }
    if (!v.allDay) {
      if (!v.startTime) ctx.addIssue({ code: "custom", message: "Add a start time", path: ["startTime"] });
      if (!v.endTime) ctx.addIssue({ code: "custom", message: "Add an end time", path: ["endTime"] });
      if (v.startTime && v.endTime && v.startDate === v.endDate && v.endTime <= v.startTime) {
        ctx.addIssue({ code: "custom", message: "End time must be after the start time", path: ["endTime"] });
      }
    }
  });
export const eventSchema = z
  .object({
    ...base,
    title: requiredText(160, "Title"),
    description: trimmed(5000),
    location: trimmed(200),
    categoryId: id.nullable(),
    allDay: z.boolean(),
    start: isoDateTime,
    end: isoDateTime,
    startDate: localDate.nullable(),
    endDate: localDate.nullable(),
  })
  .refine((e) => new Date(e.end).getTime() > new Date(e.start).getTime(), {
    message: "Event must end after it starts",
    path: ["end"],
  });

export const planItemSchema = z.object({
  id,
  kind: z.enum(["task", "habit", "break", "event"]),
  refId: id.nullable(),
  title: requiredText(200),
  start: isoDateTime,
  end: isoDateTime,
  reason: trimmed(500),
});

export const dailyPlanSchema = z.object({
  ...base,
  date: localDate,
  status: z.enum(["draft", "accepted", "rejected"]),
  source: z.enum(["rules", "ai"]),
  summary: trimmed(1000),
  items: z.array(planItemSchema).max(60),
  unscheduledTaskIds: z.array(id).max(200),
  notes: z.array(trimmed(500)).max(20),
});

const expense = z.number().min(0).max(1_000_000).nullable();

export const scenarioChangeSchema = z.discriminatedUnion("type", [
  z.object({
    id,
    type: z.literal("recurring_commitment"),
    title: requiredText(120, "Title"),
    days: z.array(z.number().int().min(0).max(6)).min(1, "Pick at least one day").max(7),
    startTime: wallTime,
    durationMinutes: z.number().int().min(5).max(12 * 60),
    categoryId: id.nullable(),
    expense,
  }),
  z
    .object({
      id,
      type: z.literal("one_off_event"),
      title: requiredText(120, "Title"),
      startDate: localDate,
      endDate: localDate,
      allDay: z.boolean(),
      startTime: wallTime.nullable(),
      endTime: wallTime.nullable(),
      categoryId: id.nullable(),
      expense,
    })
    .refine((c) => c.endDate >= c.startDate, { message: "End must be after start", path: ["endDate"] })
    .refine((c) => c.allDay || (c.startTime && c.endTime), { message: "Add start and end times", path: ["startTime"] })
    .refine((c) => c.allDay || c.startDate !== c.endDate || (c.startTime ?? "") < (c.endTime ?? ""), {
      message: "End time must be after the start time",
      path: ["endTime"],
    }),
  z.object({
    id,
    type: z.literal("project_workload"),
    title: requiredText(120, "Title"),
    hoursPerWeek: z.number().min(0.5).max(60),
    deadline: localDate.nullable(),
    goalId: id.nullable(),
    expense,
  }),
  z.object({ id, type: z.literal("move_deadline"), taskId: id, newDueDate: localDate }),
  z.object({ id, type: z.literal("remove_event"), eventId: id }),
]);

export const scenarioInput = z.object({
  title: requiredText(120, "Title"),
  description: trimmed(1000).default(""),
  horizonStart: localDate,
  horizonDays: z.number().int().min(1).max(28),
});
export const scenarioSchema = scenarioInput.extend({
  ...base,
  status: z.enum(["draft", "applied"]),
  changes: z.array(scenarioChangeSchema).max(30),
  appliedAt: isoDateTime.nullable(),
});

export const insightStateSchema = z.object({
  ...base,
  key: z.string().min(1).max(300),
  status: z.enum(["dismissed", "snoozed"]),
  snoozedUntil: isoDateTime.nullable(),
});

export const lifeDataSchema = z.object({
  profile: profileSchema,
  categories: z.array(categorySchema),
  tasks: z.array(taskSchema),
  habits: z.array(habitSchema),
  habitCompletions: z.array(habitCompletionSchema),
  goals: z.array(goalSchema),
  milestones: z.array(milestoneSchema),
  notes: z.array(noteSchema),
  events: z.array(eventSchema),
  dailyPlans: z.array(dailyPlanSchema),
  scenarios: z.array(scenarioSchema),
  insightStates: z.array(insightStateSchema),
});

export const recordSchemas = {
  categories: categorySchema,
  tasks: taskSchema,
  habits: habitSchema,
  habitCompletions: habitCompletionSchema,
  goals: goalSchema,
  milestones: milestoneSchema,
  notes: noteSchema,
  events: eventSchema,
  dailyPlans: dailyPlanSchema,
  scenarios: scenarioSchema,
  insightStates: insightStateSchema,
} as const;

export type TaskInput = z.input<typeof taskInput>;
export type HabitInput = z.input<typeof habitInput>;
export type GoalInput = z.input<typeof goalInput>;
export type NoteInput = z.input<typeof noteInput>;
export type EventInput = z.input<typeof eventInput>;
export type ScenarioInput = z.input<typeof scenarioInput>;
