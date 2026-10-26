"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CalendarEvent, Goal, Habit, Task } from "@/lib/domain/types";
import type { EventFormValues, TaskFormValues } from "@/lib/domain/forms";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { EventDialog } from "@/components/calendar/event-dialog";
import { HabitDialog } from "@/components/habits/habit-dialog";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { useActions } from "@/lib/data/store";
import { useHref } from "./space-context";

type ComposerState =
  | { kind: "task"; record?: Task | null; preset?: Partial<TaskFormValues> }
  | { kind: "event"; record?: CalendarEvent | null; preset?: Partial<EventFormValues> }
  | { kind: "habit"; record?: Habit | null }
  | { kind: "goal"; record?: Goal | null }
  | null;

interface ComposerApi {
  openTask(record?: Task | null, preset?: Partial<TaskFormValues>): void;
  openEvent(record?: CalendarEvent | null, preset?: Partial<EventFormValues>): void;
  openHabit(record?: Habit | null): void;
  openGoal(record?: Goal | null): void;
  newNote(): Promise<void>;
}

const ComposerContext = createContext<ComposerApi | null>(null);

/** One place that owns the create/edit dialogs so any screen (or the header) can open them. */
export function ComposerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComposerState>(null);
  const [open, setOpen] = useState(false);
  const actions = useActions();
  const router = useRouter();
  const href = useHref();

  const show = useCallback((s: ComposerState) => {
    setState(s);
    setOpen(true);
  }, []);

  const api = useMemo<ComposerApi>(
    () => ({
      openTask: (record, preset) => show({ kind: "task", record, preset }),
      openEvent: (record, preset) => show({ kind: "event", record, preset }),
      openHabit: (record) => show({ kind: "habit", record }),
      openGoal: (record) => show({ kind: "goal", record }),
      newNote: async () => {
        const note = await actions.addNote();
        if (note) router.push(`${href("notes")}?note=${note.id}`);
      },
    }),
    [show, actions, router, href],
  );

  return (
    <ComposerContext.Provider value={api}>
      {children}
      {state?.kind === "task" && <TaskDialog open={open} onOpenChange={setOpen} task={state.record} preset={state.preset} />}
      {state?.kind === "event" && <EventDialog open={open} onOpenChange={setOpen} event={state.record} preset={state.preset} />}
      {state?.kind === "habit" && <HabitDialog open={open} onOpenChange={setOpen} habit={state.record} />}
      {state?.kind === "goal" && <GoalDialog open={open} onOpenChange={setOpen} goal={state.record} />}
    </ComposerContext.Provider>
  );
}

export function useComposer(): ComposerApi {
  const ctx = useContext(ComposerContext);
  if (!ctx) throw new Error("useComposer must be used inside ComposerProvider");
  return ctx;
}
