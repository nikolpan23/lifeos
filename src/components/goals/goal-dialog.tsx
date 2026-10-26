"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { goalForm, type GoalFormValues } from "@/lib/domain/forms";
import type { Goal } from "@/lib/domain/types";
import { useActions, useLife } from "@/lib/data/store";
import { ValidationError } from "@/lib/data/actions";

function defaults(goal?: Goal | null): GoalFormValues {
  return {
    title: goal?.title ?? "",
    description: goal?.description ?? "",
    targetDate: goal?.targetDate ?? "",
    categoryId: goal?.categoryId ?? "",
    milestones: goal ? [] : [{ title: "", dueDate: "" }],
  };
}

export function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal?: Goal | null }) {
  const actions = useActions();
  const categories = useLife((d) => d.categories);
  const { register, handleSubmit, formState, reset, control, setError } = useForm<GoalFormValues>({ resolver: zodResolver(goalForm), defaultValues: defaults(goal) });
  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });

  useEffect(() => {
    if (open) reset(defaults(goal));
  }, [open, goal, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const input = { title: v.title.trim(), description: v.description.trim(), targetDate: v.targetDate || null, categoryId: v.categoryId || null };
      const ok = goal
        ? await actions.updateGoal(goal.id, input)
        : await actions.addGoal(
            input,
            v.milestones.filter((m) => m.title.trim()).map((m) => ({ title: m.title.trim(), dueDate: m.dueDate || null })),
          );
      if (ok) onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setError("root", { message: err.message });
      else throw err;
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
            <DialogDescription>Progress comes from milestones you complete, so add a few concrete steps.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="goal-title" label="Goal" error={formState.errors.title?.message}>
              <Input autoFocus placeholder="e.g. Run a half marathon" {...register("title")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="goal-target" label="Target date" optional error={formState.errors.targetDate?.message}>
                <Input type="date" {...register("targetDate")} />
              </Field>
              <Field id="goal-category" label="Category" optional>
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
            <Field id="goal-description" label="Why it matters" optional error={formState.errors.description?.message}>
              <Textarea rows={2} {...register("description")} />
            </Field>
            {!goal && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium text-subtle-foreground">Milestones</legend>
                {fields.map((f, i) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <Input aria-label={`Milestone ${i + 1}`} placeholder={`Milestone ${i + 1}`} {...register(`milestones.${i}.title`)} />
                    <Input aria-label={`Milestone ${i + 1} due date`} type="date" className="w-40 shrink-0" {...register(`milestones.${i}.dueDate`)} />
                    <Button variant="ghost" size="icon" aria-label={`Remove milestone ${i + 1}`} onClick={() => remove(i)}>
                      <X />
                    </Button>
                  </div>
                ))}
                <Button variant="soft" size="sm" className="justify-self-start" onClick={() => append({ title: "", dueDate: "" })} disabled={fields.length >= 20}>
                  <Plus /> Add milestone
                </Button>
              </fieldset>
            )}
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
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
