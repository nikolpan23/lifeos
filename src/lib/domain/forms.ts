import { z } from "zod";
import { isLocalDate, isWallTime } from "@/lib/dates";
import { TASK_PRIORITIES } from "./types";

/**
 * Form-level schemas: every field is a string (as the DOM gives it) and empty
 * strings mean "not set". `toX` helpers convert to domain inputs.
 */
const optionalDate = z.string().refine((v) => v === "" || isLocalDate(v), "Use a valid date");
const optionalTime = z.string().refine((v) => v === "" || isWallTime(v), "Use a valid time");
const optionalMinutes = (min: number, max: number) =>
  z.string().refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), `Enter ${min}–${max} minutes`);

export const taskForm = z.object({
  title: z.string().trim().min(1, "Give the task a title").max(200, "Keep it under 200 characters"),
  notes: z.string().max(5000, "Keep notes under 5000 characters"),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: optionalDate,
  dueTime: optionalTime,
  estimateMinutes: optionalMinutes(5, 960),
  categoryId: z.string(),
  goalId: z.string(),
}).refine((v) => !v.dueTime || v.dueDate, { message: "Add a due date for this time", path: ["dueDate"] });
export type TaskFormValues = z.infer<typeof taskForm>;

export function toTaskInput(v: TaskFormValues) {
  return {
    title: v.title.trim(),
    notes: v.notes.trim(),
    priority: v.priority,
    dueDate: v.dueDate || null,
    dueTime: v.dueTime || null,
    estimateMinutes: v.estimateMinutes ? Number(v.estimateMinutes) : null,
    categoryId: v.categoryId || null,
    goalId: v.goalId || null,
  };
}

export const habitForm = z
  .object({
    name: z.string().trim().min(1, "Give the habit a name").max(80, "Keep it under 80 characters"),
    description: z.string().max(500),
    frequency: z.enum(["daily", "weekdays"]),
    days: z.array(z.number().int().min(0).max(6)),
    preferredTime: optionalTime,
    durationMinutes: optionalMinutes(1, 600),
    categoryId: z.string(),
    goalId: z.string(),
  })
  .refine((v) => v.frequency === "daily" || v.days.length > 0, { message: "Pick at least one day", path: ["days"] });
export type HabitFormValues = z.infer<typeof habitForm>;

export function toHabitInput(v: HabitFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    schedule: v.frequency === "daily" ? ({ type: "daily" } as const) : ({ type: "weekdays", days: [...v.days].sort() } as const),
    preferredTime: v.preferredTime || null,
    durationMinutes: v.durationMinutes ? Number(v.durationMinutes) : null,
    categoryId: v.categoryId || null,
    goalId: v.goalId || null,
  };
}

export const goalForm = z.object({
  title: z.string().trim().min(1, "Give the goal a title").max(120, "Keep it under 120 characters"),
  description: z.string().max(2000),
  targetDate: optionalDate,
  categoryId: z.string(),
  milestones: z.array(z.object({ title: z.string().max(160, "Keep it under 160 characters"), dueDate: optionalDate })).max(20),
});
export type GoalFormValues = z.infer<typeof goalForm>;

export const eventForm = z
  .object({
    title: z.string().trim().min(1, "Give the event a title").max(160, "Keep it under 160 characters"),
    description: z.string().max(5000),
    location: z.string().max(200),
    categoryId: z.string(),
    allDay: z.boolean(),
    startDate: z.string().refine(isLocalDate, "Pick a start date"),
    endDate: z.string().refine(isLocalDate, "Pick an end date"),
    startTime: optionalTime,
    endTime: optionalTime,
  })
  .superRefine((v, ctx) => {
    if (v.endDate < v.startDate) ctx.addIssue({ code: "custom", message: "Ends before it starts", path: ["endDate"] });
    if (!v.allDay) {
      if (!v.startTime) ctx.addIssue({ code: "custom", message: "Add a start time", path: ["startTime"] });
      if (!v.endTime) ctx.addIssue({ code: "custom", message: "Add an end time", path: ["endTime"] });
      if (v.startTime && v.endTime && v.startDate === v.endDate && v.endTime <= v.startTime)
        ctx.addIssue({ code: "custom", message: "End time must be after the start", path: ["endTime"] });
    }
  });
export type EventFormValues = z.infer<typeof eventForm>;

export function toEventInput(v: EventFormValues) {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    location: v.location.trim(),
    categoryId: v.categoryId || null,
    allDay: v.allDay,
    startDate: v.startDate,
    endDate: v.endDate,
    startTime: v.allDay ? null : v.startTime || null,
    endTime: v.allDay ? null : v.endTime || null,
  };
}
