"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { habitForm, toHabitInput, type HabitFormValues } from "@/lib/domain/forms";
import type { Habit } from "@/lib/domain/types";
import { useActions, useLife, useToday } from "@/lib/data/store";
import { ValidationError } from "@/lib/data/actions";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";

function defaults(habit?: Habit | null): HabitFormValues {
  return {
    name: habit?.name ?? "",
    description: habit?.description ?? "",
    frequency: habit?.schedule.type ?? "daily",
    days: habit?.schedule.type === "weekdays" ? habit.schedule.days : [1, 2, 3, 4, 5],
    preferredTime: habit?.preferredTime ?? "",
    durationMinutes: habit?.durationMinutes ? String(habit.durationMinutes) : "",
    categoryId: habit?.categoryId ?? "",
    goalId: habit?.goalId ?? "",
  };
}

export function HabitDialog({ open, onOpenChange, habit }: { open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit | null }) {
  const actions = useActions();
  const today = useToday();
  const categories = useLife((d) => d.categories);
  const goals = useLife((d) => d.goals);
  const weekStartsOn = useLife((d) => d.profile.weekStartsOn);
  const { register, handleSubmit, formState, reset, watch, setValue, setError } = useForm<HabitFormValues>({ resolver: zodResolver(habitForm), defaultValues: defaults(habit) });
  const frequency = watch("frequency");
  const days = watch("days");

  useEffect(() => {
    if (open) reset(defaults(habit));
  }, [open, habit, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const input = toHabitInput(values);
      const ok = habit ? await actions.updateHabit(habit.id, input) : await actions.addHabit(input, today);
      if (ok) onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setError("root", { message: err.message });
      else throw err;
    }
  });

  const orderedDays = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
            <DialogDescription>Small and specific works best, like “Walk for 20 minutes”.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="habit-name" label="Name" error={formState.errors.name?.message}>
              <Input autoFocus placeholder="e.g. Read 10 pages" {...register("name")} />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-subtle-foreground">How often</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How often">
                {(["daily", "weekdays"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={frequency === f}
                    onClick={() => setValue("frequency", f)}
                    className={cn("h-9 rounded-[10px] border text-sm font-medium transition-colors", frequency === f ? "border-[#d9d4ff] bg-lavender text-primary-strong" : "border-border text-subtle-foreground hover:bg-[#f6f7fa]")}
                  >
                    {f === "daily" ? "Every day" : "Specific days"}
                  </button>
                ))}
              </div>
              {frequency === "weekdays" && (
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Days of the week">
                  {orderedDays.map((d) => {
                    const on = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setValue("days", on ? days.filter((x) => x !== d) : [...days, d], { shouldValidate: formState.isSubmitted })}
                        className={cn("h-9 min-w-11 rounded-full border px-2 text-[13px] font-medium transition-colors", on ? "border-primary bg-primary text-white" : "border-border text-subtle-foreground hover:bg-[#f6f7fa]")}
                      >
                        {WEEKDAY_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
              )}
              {formState.errors.days && (
                <p role="alert" className="mt-1.5 text-[13px] text-danger">
                  {formState.errors.days.message}
                </p>
              )}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field id="habit-time" label="Preferred time" optional hint="Used for planning" error={formState.errors.preferredTime?.message}>
                <Input type="time" {...register("preferredTime")} />
              </Field>
              <Field id="habit-duration" label="Minutes" optional error={formState.errors.durationMinutes?.message}>
                <Input type="number" inputMode="numeric" min={1} max={600} placeholder="20" {...register("durationMinutes")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="habit-category" label="Category" optional>
                <NativeSelect {...register("categoryId")}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="habit-goal" label="Supports goal" optional>
                <NativeSelect {...register("goalId")}>
                  <option value="">No goal</option>
                  {goals
                    .filter((g) => g.status === "active" || g.id === habit?.goalId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
            </div>
            <Field id="habit-description" label="Why it matters" optional error={formState.errors.description?.message}>
              <Textarea rows={2} {...register("description")} />
            </Field>
            {formState.errors.root && (
              <p role="alert" className="rounded-[10px] bg-soft-rose px-3 py-2 text-sm text-ink-rose">
                {formState.errors.root.message}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {habit ? "Save changes" : "Create habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
