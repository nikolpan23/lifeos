"use client";

import { useState } from "react";
import { CornerDownLeft, Plus } from "lucide-react";
import { useActions, useToday } from "@/lib/data/store";
import { parseQuickAdd } from "@/lib/domain/quick-add";
import { ValidationError } from "@/lib/data/actions";
import { cn } from "@/lib/utils";

export function QuickAddTask({ dueToday = true, className, goalId = null }: { dueToday?: boolean; className?: string; goalId?: string | null }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actions = useActions();
  const today = useToday();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseQuickAdd(value, today, dueToday ? today : null);
    if (!parsed.title) {
      setError("Type a task first");
      return;
    }
    setBusy(true);
    try {
      const ok = await actions.addTask({ title: parsed.title, notes: "", priority: parsed.priority, dueDate: parsed.dueDate, dueTime: null, estimateMinutes: parsed.estimateMinutes, categoryId: null, goalId });
      if (ok) {
        setValue("");
        setError(null);
      }
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : "Couldn't add that task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("group", className)}>
      <label htmlFor="quick-add-task" className="sr-only">
        Add a task
      </label>
      <div className={cn("flex items-center gap-2.5 rounded-[12px] border border-dashed border-border-strong bg-[#fdf8ef] px-3 transition-colors focus-within:border-solid focus-within:border-accent focus-within:bg-surface focus-within:ring-[3px] focus-within:ring-accent/20", error && "border-danger")}>
        <Plus className="size-4 text-faint-foreground" aria-hidden />
        <input
          id="quick-add-task"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder={dueToday ? "Add a task for today…  try “Call mum tomorrow 15m !”" : "Add a task…"}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint-foreground"
          aria-describedby={error ? "quick-add-error" : "quick-add-hint"}
          aria-invalid={error ? true : undefined}
          maxLength={260}
          disabled={busy}
        />
        <kbd className="hidden items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground group-focus-within:flex">
          <CornerDownLeft className="size-3" aria-hidden /> Enter
        </kbd>
      </div>
      <p id="quick-add-hint" className="sr-only">
        You can add today, tomorrow, a weekday, an exclamation mark for high priority, or a duration like 30m.
      </p>
      {error && (
        <p id="quick-add-error" role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
