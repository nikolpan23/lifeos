import { endOfLocalDay, startOfLocalDay, zonedToISO } from "@/lib/dates";
import { completionId } from "@/lib/domain/habits";
import { isEmptyNote } from "@/lib/domain/notes";
import {
  categoryInput,
  eventInput,
  goalInput,
  habitInput,
  milestoneInput,
  noteInput,
  planningSchema,
  scenarioChangeSchema,
  scenarioInput,
  taskInput,
  type EventInput,
  type GoalInput,
  type HabitInput,
  type NoteInput,
  type ScenarioInput,
  type TaskInput,
} from "@/lib/domain/schemas";
import type {
  CalendarEvent,
  Category,
  CategoryColor,
  CollectionName,
  DailyPlan,
  Goal,
  GoalMilestone,
  Habit,
  LifeData,
  Note,
  PlanningPreferences,
  Profile,
  Scenario,
  ScenarioChange,
  Task,
} from "@/lib/domain/types";
import { newId, nowISO } from "./ids";
import type { Op } from "./ops";

export type ApplyFn = (ops: Op[], options?: { success?: string; error?: string }) => Promise<boolean>;

export class ValidationError extends Error {}

function parse<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Please check the form");
  return result.data;
}

/** Ensures linked ids actually belong to the current user's data. */
function assertLinks(data: LifeData, links: { categoryId?: string | null; goalId?: string | null; taskId?: string | null; habitId?: string | null }) {
  if (links.categoryId && !data.categories.some((c) => c.id === links.categoryId)) throw new ValidationError("That category no longer exists");
  if (links.goalId && !data.goals.some((g) => g.id === links.goalId)) throw new ValidationError("That goal no longer exists");
  if (links.taskId && !data.tasks.some((t) => t.id === links.taskId)) throw new ValidationError("That task no longer exists");
  if (links.habitId && !data.habits.some((h) => h.id === links.habitId)) throw new ValidationError("That habit no longer exists");
}

function patchOp(collection: CollectionName, id: string, patch: Record<string, unknown>): Op {
  return { type: "patch", collection, id, patch: { ...patch, updatedAt: nowISO() } };
}

export function eventTimes(input: ReturnType<typeof eventInput.parse>, tz: string) {
  if (input.allDay) {
    return {
      start: startOfLocalDay(input.startDate, tz).toISOString(),
      end: endOfLocalDay(input.endDate, tz).toISOString(),
      startDate: input.startDate,
      endDate: input.endDate,
    };
  }
  return {
    start: zonedToISO(input.startDate, input.startTime!, tz),
    end: zonedToISO(input.endDate, input.endTime!, tz),
    startDate: null,
    endDate: null,
  };
}

export function createActions(apply: ApplyFn, get: () => LifeData) {
  const stamp = () => {
    const ts = nowISO();
    return { createdAt: ts, updatedAt: ts };
  };

  return {
    /* ------------------------------- Profile ------------------------------ */
    async updateProfile(patch: Partial<Omit<Profile, "createdAt" | "updatedAt">>) {
      if (patch.planning) parse(planningSchema, patch.planning);
      return apply([{ type: "profile", patch: { ...patch, updatedAt: nowISO() } }], { success: "Settings saved" });
    },
    async updatePlanning(planning: PlanningPreferences) {
      const valid = parse(planningSchema, planning);
      return apply([{ type: "profile", patch: { planning: valid, updatedAt: nowISO() } }], { success: "Planning preferences saved" });
    },

    /* ----------------------------- Categories ----------------------------- */
    async addCategory(name: string, color: CategoryColor) {
      const valid = parse(categoryInput, { name, color });
      if (get().categories.some((c) => c.name.toLowerCase() === valid.name.toLowerCase())) throw new ValidationError("You already have a category with that name");
      const record: Category = { id: newId(), ...valid, ...stamp() };
      const ok = await apply([{ type: "put", collection: "categories", record }]);
      return ok ? record : null;
    },
    async updateCategory(id: string, name: string, color: CategoryColor) {
      const valid = parse(categoryInput, { name, color });
      if (get().categories.some((c) => c.id !== id && c.name.toLowerCase() === valid.name.toLowerCase())) throw new ValidationError("You already have a category with that name");
      return apply([patchOp("categories", id, valid)]);
    },
    async deleteCategory(id: string) {
      const data = get();
      const ops: Op[] = [{ type: "delete", collection: "categories", id }];
      for (const c of ["tasks", "habits", "goals", "events"] as const) {
        for (const r of data[c] as { id: string; categoryId: string | null }[]) {
          if (r.categoryId === id) ops.push(patchOp(c, r.id, { categoryId: null }));
        }
      }
      return apply(ops, { success: "Category removed" });
    },

    /* -------------------------------- Tasks ------------------------------- */
    async addTask(input: TaskInput) {
      const valid = parse(taskInput, input);
      assertLinks(get(), valid);
      const record: Task = { id: newId(), ...valid, status: "open", completedAt: null, ...stamp() };
      const ok = await apply([{ type: "put", collection: "tasks", record }], { success: "Task added" });
      return ok ? record : null;
    },
    async updateTask(id: string, input: TaskInput) {
      const valid = parse(taskInput, input);
      assertLinks(get(), valid);
      return apply([patchOp("tasks", id, valid)], { success: "Task updated" });
    },
    async setTaskDone(id: string, done: boolean) {
      return apply([patchOp("tasks", id, { status: done ? "done" : "open", completedAt: done ? nowISO() : null })]);
    },
    async rescheduleTask(id: string, dueDate: string | null) {
      return apply([patchOp("tasks", id, { dueDate })], { success: "Task rescheduled" });
    },
    async deleteTask(id: string) {
      const data = get();
      const ops: Op[] = [{ type: "delete", collection: "tasks", id }];
      for (const n of data.notes) if (n.taskId === id) ops.push(patchOp("notes", n.id, { taskId: null }));
      return apply(ops, { success: "Task deleted" });
    },

    /* ------------------------------- Habits ------------------------------- */
    async addHabit(input: HabitInput, startDate: string) {
      const valid = parse(habitInput, input);
      assertLinks(get(), valid);
      const record: Habit = { id: newId(), ...valid, status: "active", startDate, ...stamp() };
      const ok = await apply([{ type: "put", collection: "habits", record }], { success: "Habit created" });
      return ok ? record : null;
    },
    async updateHabit(id: string, input: HabitInput) {
      const valid = parse(habitInput, input);
      assertLinks(get(), valid);
      return apply([patchOp("habits", id, valid)], { success: "Habit updated" });
    },
    async setHabitStatus(id: string, status: Habit["status"]) {
      const label = status === "paused" ? "Habit paused" : status === "archived" ? "Habit archived" : "Habit resumed";
      return apply([patchOp("habits", id, { status })], { success: label });
    },
    async toggleHabit(habitId: string, date: string) {
      const data = get();
      assertLinks(data, { habitId });
      const cid = completionId(habitId, date);
      const exists = data.habitCompletions.some((c) => c.id === cid);
      return apply(
        exists
          ? [{ type: "delete", collection: "habitCompletions", id: cid }]
          : [{ type: "put", collection: "habitCompletions", record: { id: cid, habitId, date, ...stamp() } }],
      );
    },
    async deleteHabit(id: string) {
      const data = get();
      const ops: Op[] = [{ type: "delete", collection: "habits", id }];
      for (const c of data.habitCompletions) if (c.habitId === id) ops.push({ type: "delete", collection: "habitCompletions", id: c.id });
      return apply(ops, { success: "Habit deleted" });
    },

    /* -------------------------------- Goals ------------------------------- */
    async addGoal(input: GoalInput, milestones: { title: string; dueDate: string | null }[] = []) {
      const valid = parse(goalInput, input);
      assertLinks(get(), valid);
      const goal: Goal = { id: newId(), ...valid, status: "active", ...stamp() };
      const ops: Op[] = [{ type: "put", collection: "goals", record: goal }];
      milestones.forEach((m, order) => {
        const mv = parse(milestoneInput, m);
        ops.push({ type: "put", collection: "milestones", record: { id: newId(), goalId: goal.id, ...mv, completedAt: null, order, ...stamp() } });
      });
      const ok = await apply(ops, { success: "Goal created" });
      return ok ? goal : null;
    },
    async updateGoal(id: string, input: GoalInput) {
      const valid = parse(goalInput, input);
      assertLinks(get(), valid);
      return apply([patchOp("goals", id, valid)], { success: "Goal updated" });
    },
    async setGoalStatus(id: string, status: Goal["status"]) {
      const label = status === "archived" ? "Goal archived" : status === "completed" ? "Goal completed. Well done." : "Goal reactivated";
      return apply([patchOp("goals", id, { status })], { success: label });
    },
    async deleteGoal(id: string) {
      const data = get();
      const ops: Op[] = [{ type: "delete", collection: "goals", id }];
      for (const m of data.milestones) if (m.goalId === id) ops.push({ type: "delete", collection: "milestones", id: m.id });
      for (const c of ["tasks", "habits", "notes"] as const) {
        for (const r of data[c] as { id: string; goalId: string | null }[]) if (r.goalId === id) ops.push(patchOp(c, r.id, { goalId: null }));
      }
      return apply(ops, { success: "Goal deleted" });
    },
    async addMilestone(goalId: string, title: string, dueDate: string | null) {
      const data = get();
      assertLinks(data, { goalId });
      const mv = parse(milestoneInput, { title, dueDate });
      const order = data.milestones.filter((m) => m.goalId === goalId).reduce((max, m) => Math.max(max, m.order + 1), 0);
      const record: GoalMilestone = { id: newId(), goalId, ...mv, completedAt: null, order, ...stamp() };
      return apply([{ type: "put", collection: "milestones", record }]);
    },
    async updateMilestone(id: string, title: string, dueDate: string | null) {
      const mv = parse(milestoneInput, { title, dueDate });
      return apply([patchOp("milestones", id, mv)]);
    },
    async setMilestoneDone(id: string, done: boolean) {
      return apply([patchOp("milestones", id, { completedAt: done ? nowISO() : null })]);
    },
    async deleteMilestone(id: string) {
      return apply([{ type: "delete", collection: "milestones", id }]);
    },

    /* -------------------------------- Notes ------------------------------- */
    async addNote(input: Partial<NoteInput> = {}) {
      const valid = parse(noteInput, { title: "", body: "", tags: [], goalId: null, taskId: null, ...input });
      assertLinks(get(), valid);
      // Reuse a blank note instead of stacking up "Untitled note" entries.
      if (isEmptyNote(valid)) {
        const blank = get().notes.find((n) => !n.archived && isEmptyNote(n));
        if (blank) return blank;
      }
      const record: Note = { id: newId(), ...valid, pinned: false, archived: false, ...stamp() };
      const ok = await apply([{ type: "put", collection: "notes", record }]);
      return ok ? record : null;
    },
    async saveNote(id: string, input: NoteInput) {
      const valid = parse(noteInput, input);
      assertLinks(get(), valid);
      return apply([patchOp("notes", id, valid)], { error: "Couldn't save this note. Your text is still here; we'll retry when you edit again." });
    },
    async setNoteFlags(id: string, flags: Partial<Pick<Note, "pinned" | "archived">>) {
      const label = flags.archived === true ? "Note archived" : flags.archived === false ? "Note restored" : undefined;
      return apply([patchOp("notes", id, flags)], { success: label });
    },
    async deleteNote(id: string) {
      return apply([{ type: "delete", collection: "notes", id }], { success: "Note deleted" });
    },
    /** Quietly removes notes that were opened but never written in. */
    async discardEmptyNotes(ids: string[]) {
      const empty = new Set(get().notes.filter((n) => ids.includes(n.id) && isEmptyNote(n)).map((n) => n.id));
      if (empty.size === 0) return true;
      return apply([...empty].map((id) => ({ type: "delete" as const, collection: "notes" as const, id })));
    },

    /* ------------------------------- Events ------------------------------- */
    async addEvent(input: EventInput) {
      const valid = parse(eventInput, input);
      assertLinks(get(), valid);
      const tz = get().profile.timezone;
      const record: CalendarEvent = {
        id: newId(),
        title: valid.title,
        description: valid.description,
        location: valid.location,
        categoryId: valid.categoryId,
        allDay: valid.allDay,
        ...eventTimes(valid, tz),
        ...stamp(),
      };
      const ok = await apply([{ type: "put", collection: "events", record }], { success: "Event added" });
      return ok ? record : null;
    },
    async updateEvent(id: string, input: EventInput) {
      const valid = parse(eventInput, input);
      assertLinks(get(), valid);
      const tz = get().profile.timezone;
      return apply(
        [patchOp("events", id, { title: valid.title, description: valid.description, location: valid.location, categoryId: valid.categoryId, allDay: valid.allDay, ...eventTimes(valid, tz) })],
        { success: "Event updated" },
      );
    },
    async deleteEvent(id: string) {
      return apply([{ type: "delete", collection: "events", id }], { success: "Event deleted" });
    },

    /* ----------------------------- Daily plans ---------------------------- */
    async savePlan(plan: Omit<DailyPlan, "id" | "createdAt" | "updatedAt">) {
      const existing = get().dailyPlans.find((p) => p.date === plan.date);
      const record: DailyPlan = { id: existing?.id ?? `plan-${plan.date}`, ...plan, createdAt: existing?.createdAt ?? nowISO(), updatedAt: nowISO() };
      const ok = await apply([{ type: "put", collection: "dailyPlans", record }]);
      return ok ? record : null;
    },
    async setPlanStatus(id: string, status: DailyPlan["status"]) {
      return apply([patchOp("dailyPlans", id, { status })], { success: status === "accepted" ? "Plan accepted for today" : "Plan dismissed" });
    },

    /* ------------------------------ Scenarios ----------------------------- */
    async addScenario(input: ScenarioInput) {
      const valid = parse(scenarioInput, input);
      const record: Scenario = { id: newId(), ...valid, status: "draft", changes: [], appliedAt: null, ...stamp() };
      const ok = await apply([{ type: "put", collection: "scenarios", record }]);
      return ok ? record : null;
    },
    async updateScenario(id: string, input: ScenarioInput) {
      const valid = parse(scenarioInput, input);
      return apply([patchOp("scenarios", id, valid)]);
    },
    async setScenarioChanges(id: string, changes: ScenarioChange[]) {
      const valid = changes.map((c) => parse(scenarioChangeSchema, c));
      const data = get();
      for (const c of valid) {
        if (c.type === "move_deadline") assertLinks(data, { taskId: c.taskId });
        if (c.type === "remove_event" && !data.events.some((e) => e.id === c.eventId)) throw new ValidationError("That event no longer exists");
        if ("categoryId" in c) assertLinks(data, { categoryId: c.categoryId });
        if (c.type === "project_workload") assertLinks(data, { goalId: c.goalId });
      }
      return apply([patchOp("scenarios", id, { changes: valid })]);
    },
    async deleteScenario(id: string) {
      return apply([{ type: "delete", collection: "scenarios", id }], { success: "Scenario discarded" });
    },
    /** Commit pre-built ops (from the scenario simulator) and mark the scenario applied. */
    async applyScenario(id: string, ops: Op[]) {
      return apply([...ops, patchOp("scenarios", id, { status: "applied", appliedAt: nowISO() })], { success: "Scenario applied to your real schedule" });
    },

    /* ---------------------------- Insight states -------------------------- */
    async dismissInsight(key: string) {
      const existing = get().insightStates.find((s) => s.key === key);
      const record = { id: existing?.id ?? newId(), key, status: "dismissed" as const, snoozedUntil: null, ...stamp() };
      return apply([{ type: "put", collection: "insightStates", record }], { success: "Insight dismissed" });
    },
    async snoozeInsight(key: string, until: string) {
      const existing = get().insightStates.find((s) => s.key === key);
      const record = { id: existing?.id ?? newId(), key, status: "snoozed" as const, snoozedUntil: until, ...stamp() };
      return apply([{ type: "put", collection: "insightStates", record }], { success: "Snoozed until tomorrow" });
    },
    async restoreInsights() {
      return apply(get().insightStates.map((s) => ({ type: "delete" as const, collection: "insightStates" as const, id: s.id })), { success: "Hidden insights restored" });
    },
  };
}

export type LifeActions = ReturnType<typeof createActions>;
