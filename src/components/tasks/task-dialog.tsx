"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { taskForm, toTaskInput, type TaskFormValues } from "@/lib/domain/forms";
import type { Task } from "@/lib/domain/types";
import { useActions, useLife } from "@/lib/data/store";
import { ValidationError } from "@/lib/data/actions";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", cls: "data-[on=true]:bg-soft-blue data-[on=true]:text-ink-blue data-[on=true]:border-[#d6e3ea]" },
  { value: "medium", label: "Medium", cls: "data-[on=true]:bg-soft-yellow data-[on=true]:text-ink-yellow data-[on=true]:border-[#f1e0b0]" },
  { value: "high", label: "High", cls: "data-[on=true]:bg-soft-rose data-[on=true]:text-ink-rose data-[on=true]:border-[#f0d0ca]" },
] as const;

function defaults(task?: Task | null, preset?: Partial<TaskFormValues>): TaskFormValues {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    priority: task?.priority ?? "medium",
    dueDate: task?.dueDate ?? "",
    dueTime: task?.dueTime ?? "",
    estimateMinutes: task?.estimateMinutes ? String(task.estimateMinutes) : "",
    categoryId: task?.categoryId ?? "",
    goalId: task?.goalId ?? "",
    ...preset,
  };
}

export function TaskDialog({ open, onOpenChange, task, preset }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null; preset?: Partial<TaskFormValues> }) {
  const actions = useActions();
  const categories = useLife((d) => d.categories);
  const goals = useLife((d) => d.goals);
  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskForm), defaultValues: defaults(task, preset) });
  const { register, handleSubmit, formState, reset, watch, setValue, setError } = form;
  const priority = watch("priority");

  useEffect(() => {
    if (open) reset(defaults(task, preset));
  }, [open, task, preset, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const input = toTaskInput(values);
      const ok = task ? await actions.updateTask(task.id, input) : await actions.addTask(input);
      if (ok) onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setError("root", { message: err.message });
      else throw err;
    }
  });

  const activeGoals = goals.filter((g) => g.status === "active" || g.id === task?.goalId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>{task ? "Update the details below." : "Capture it now, sort it later."}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="task-title" label="Title" error={formState.errors.title?.message}>
              <Input autoFocus placeholder="e.g. Draft the project proposal" {...register("title")} />
            </Field>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-[13px] font-medium text-subtle-foreground">Priority</legend>
              <div className="flex gap-2" role="radiogroup" aria-label="Priority">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={priority === p.value}
                    data-on={priority === p.value}
                    onClick={() => setValue("priority", p.value, { shouldDirty: true })}
                    className={cn("h-9 flex-1 rounded-[10px] border border-border text-sm font-medium text-subtle-foreground transition-colors hover:bg-[#f5eee1]", p.cls)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <Field id="task-due" label="Due date" optional error={formState.errors.dueDate?.message}>
                <Input type="date" {...register("dueDate")} />
              </Field>
              <Field id="task-time" label="Due time" optional error={formState.errors.dueTime?.message}>
                <Input type="time" {...register("dueTime")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="task-estimate" label="Estimate (min)" optional error={formState.errors.estimateMinutes?.message}>
                <Input type="number" inputMode="numeric" min={5} max={960} step={5} placeholder="30" {...register("estimateMinutes")} />
              </Field>
              <Field id="task-category" label="Category" optional>
                <NativeSelect {...register("categoryId")}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field id="task-goal" label="Linked goal" optional>
              <NativeSelect {...register("goalId")}>
                <option value="">No goal</option>
                {activeGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="task-notes" label="Notes" optional error={formState.errors.notes?.message}>
              <Textarea rows={3} placeholder="Anything that helps future you" {...register("notes")} />
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
              {task ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
