"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLife, useToday } from "@/lib/data/store";
import { addDays, compareLocal, formatLocalDate, localDateOf, WEEKDAY_LABELS, formatTime } from "@/lib/dates";
import { scenarioChangeSchema } from "@/lib/domain/schemas";
import type { ScenarioChange, ScenarioChangeType } from "@/lib/domain/types";
import { newId } from "@/lib/data/ids";
import { cn } from "@/lib/utils";

export const CHANGE_LABELS: Record<ScenarioChangeType, { title: string; hint: string }> = {
  recurring_commitment: { title: "Recurring commitment", hint: "Something on set days, like the gym or evening study." },
  one_off_event: { title: "One-off event or trip", hint: "A single event, or days away." },
  project_workload: { title: "Extra project or workload", hint: "Hours of work per week, with an optional deadline." },
  move_deadline: { title: "Move a deadline", hint: "Try a different due date for an existing task." },
  remove_event: { title: "Drop an event", hint: "See what changes if you skip something." },
};

type Draft = Record<string, unknown>;

export function defaultChange(type: ScenarioChangeType, today: string): Draft {
  switch (type) {
    case "recurring_commitment":
      return { type, title: "", days: [1, 3, 5], startTime: "18:00", durationMinutes: "60", categoryId: "", expense: "" };
    case "one_off_event":
      return { type, title: "", startDate: addDays(today, 5), endDate: addDays(today, 6), allDay: true, startTime: "10:00", endTime: "12:00", categoryId: "", expense: "" };
    case "project_workload":
      return { type, title: "", hoursPerWeek: "5", deadline: "", goalId: "", expense: "" };
    case "move_deadline":
      return { type, taskId: "", newDueDate: addDays(today, 7) };
    case "remove_event":
      return { type, eventId: "" };
  }
}

function toDraft(c: ScenarioChange): Draft {
  const d: Draft = { ...c };
  for (const k of ["durationMinutes", "hoursPerWeek", "expense"]) if (k in d) d[k] = d[k] === null ? "" : String(d[k]);
  for (const k of ["categoryId", "goalId", "deadline"]) if (k in d && d[k] === null) d[k] = "";
  return d;
}

function fromDraft(d: Draft, id: string): unknown {
  const num = (v: unknown) => (v === "" || v === undefined ? null : Number(v));
  const nul = (v: unknown) => (v === "" || v === undefined ? null : v);
  switch (d.type as ScenarioChangeType) {
    case "recurring_commitment":
      return { id, type: d.type, title: String(d.title ?? "").trim(), days: d.days, startTime: d.startTime, durationMinutes: num(d.durationMinutes), categoryId: nul(d.categoryId), expense: num(d.expense) };
    case "one_off_event":
      return { id, type: d.type, title: String(d.title ?? "").trim(), startDate: d.startDate, endDate: d.endDate, allDay: d.allDay, startTime: d.allDay ? null : d.startTime, endTime: d.allDay ? null : d.endTime, categoryId: nul(d.categoryId), expense: num(d.expense) };
    case "project_workload":
      return { id, type: d.type, title: String(d.title ?? "").trim(), hoursPerWeek: num(d.hoursPerWeek), deadline: nul(d.deadline), goalId: nul(d.goalId), expense: num(d.expense) };
    case "move_deadline":
      return { id, type: d.type, taskId: d.taskId, newDueDate: d.newDueDate };
    case "remove_event":
      return { id, type: d.type, eventId: d.eventId };
  }
}

export function ChangeDialog({
  open,
  onOpenChange,
  initial,
  type,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: ScenarioChange | null;
  type: ScenarioChangeType;
  onSave: (c: ScenarioChange) => void;
}) {
  const today = useToday();
  const categories = useLife((d) => d.categories);
  const goals = useLife((d) => d.goals);
  const tasks = useLife((d) => d.tasks);
  const events = useLife((d) => d.events);
  const tz = useLife((d) => d.profile.timezone);
  const weekStartsOn = useLife((d) => d.profile.weekStartsOn);
  const [draft, setDraft] = useState<Draft>(() => (initial ? toDraft(initial) : defaultChange(type, today)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const t = draft.type as ScenarioChangeType;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = scenarioChangeSchema.safeParse(fromDraft(draft, initial?.id ?? newId()));
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errs[key]) errs[key] = issue.message.includes("expected") ? "Please fill this in" : issue.message;
      }
      setErrors(errs);
      return;
    }
    onSave(parsed.data as ScenarioChange);
    onOpenChange(false);
  };

  const orderedDays = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  const upcomingEvents = events.filter((ev) => new Date(ev.end) > new Date() && compareLocal(ev.allDay ? ev.startDate! : localDateOf(ev.start, tz), addDays(today, 30)) <= 0).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{CHANGE_LABELS[t].title}</DialogTitle>
            <DialogDescription>{CHANGE_LABELS[t].hint} This stays hypothetical until you apply the scenario.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            {(t === "recurring_commitment" || t === "one_off_event" || t === "project_workload") && (
              <Field id="chg-title" label="What is it?" error={errors.title}>
                <Input autoFocus value={String(draft.title ?? "")} onChange={(e) => set("title", e.target.value)} placeholder={t === "recurring_commitment" ? "e.g. Gym" : t === "one_off_event" ? "e.g. Weekend trip" : "e.g. Freelance project"} maxLength={120} />
              </Field>
            )}

            {t === "recurring_commitment" && (
              <>
                <fieldset>
                  <legend className="mb-1.5 text-[13px] font-medium text-subtle-foreground">Days</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {orderedDays.map((d) => {
                      const days = (draft.days as number[]) ?? [];
                      const on = days.includes(d);
                      return (
                        <button key={d} type="button" aria-pressed={on} onClick={() => set("days", on ? days.filter((x) => x !== d) : [...days, d].sort())} className={cn("h-9 min-w-11 rounded-full border px-2 text-[13px] font-medium", on ? "border-primary bg-primary text-white" : "border-border text-subtle-foreground hover:bg-[#f5eee1]")}>
                          {WEEKDAY_LABELS[d]}
                        </button>
                      );
                    })}
                  </div>
                  {errors.days && <p role="alert" className="mt-1.5 text-[13px] text-danger">{errors.days}</p>}
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="chg-start" label="Start time" error={errors.startTime}>
                    <Input type="time" value={String(draft.startTime ?? "")} onChange={(e) => set("startTime", e.target.value)} />
                  </Field>
                  <Field id="chg-dur" label="Minutes each time" error={errors.durationMinutes}>
                    <Input type="number" min={5} max={720} value={String(draft.durationMinutes ?? "")} onChange={(e) => set("durationMinutes", e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {t === "one_off_event" && (
              <>
                <div className="flex items-center justify-between rounded-[12px] bg-[#f5eee1] px-3 py-2.5">
                  <Label htmlFor="chg-allday">All day / away</Label>
                  <Switch id="chg-allday" checked={!!draft.allDay} onCheckedChange={(c) => set("allDay", c)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="chg-sd" label="From" error={errors.startDate}>
                    <Input type="date" value={String(draft.startDate ?? "")} onChange={(e) => set("startDate", e.target.value)} />
                  </Field>
                  <Field id="chg-ed" label="To" error={errors.endDate}>
                    <Input type="date" value={String(draft.endDate ?? "")} onChange={(e) => set("endDate", e.target.value)} />
                  </Field>
                </div>
                {!draft.allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="chg-st" label="Start time" error={errors.startTime}>
                      <Input type="time" value={String(draft.startTime ?? "")} onChange={(e) => set("startTime", e.target.value)} />
                    </Field>
                    <Field id="chg-et" label="End time" error={errors.endTime}>
                      <Input type="time" value={String(draft.endTime ?? "")} onChange={(e) => set("endTime", e.target.value)} />
                    </Field>
                  </div>
                )}
              </>
            )}

            {t === "project_workload" && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="chg-hours" label="Hours per week" error={errors.hoursPerWeek}>
                  <Input type="number" min={0.5} max={60} step={0.5} value={String(draft.hoursPerWeek ?? "")} onChange={(e) => set("hoursPerWeek", e.target.value)} />
                </Field>
                <Field id="chg-deadline" label="Deadline" optional error={errors.deadline}>
                  <Input type="date" value={String(draft.deadline ?? "")} onChange={(e) => set("deadline", e.target.value)} />
                </Field>
                <Field id="chg-goal" label="Linked goal" optional className="col-span-2">
                  <NativeSelect value={String(draft.goalId ?? "")} onChange={(e) => set("goalId", e.target.value)}>
                    <option value="">None</option>
                    {goals.filter((g) => g.status === "active").map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
            )}

            {(t === "recurring_commitment" || t === "one_off_event") && (
              <Field id="chg-cat" label="Category" optional>
                <NativeSelect value={String(draft.categoryId ?? "")} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {(t === "recurring_commitment" || t === "one_off_event" || t === "project_workload") && (
              <Field id="chg-expense" label={t === "recurring_commitment" ? "Cost each time" : "Planned cost"} optional hint="Just for comparison. Use any currency." error={errors.expense}>
                <Input type="number" min={0} step="0.01" inputMode="decimal" value={String(draft.expense ?? "")} onChange={(e) => set("expense", e.target.value)} />
              </Field>
            )}

            {t === "move_deadline" && (
              <>
                <Field id="chg-task" label="Task" error={errors.taskId}>
                  <NativeSelect value={String(draft.taskId ?? "")} onChange={(e) => set("taskId", e.target.value)}>
                    <option value="">Choose a task…</option>
                    {tasks.filter((x) => x.status === "open" && x.dueDate).map((x) => (
                      <option key={x.id} value={x.id}>{x.title} (due {formatLocalDate(x.dueDate!)})</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field id="chg-newdue" label="New due date" error={errors.newDueDate}>
                  <Input type="date" value={String(draft.newDueDate ?? "")} onChange={(e) => set("newDueDate", e.target.value)} />
                </Field>
              </>
            )}

            {t === "remove_event" && (
              <Field id="chg-event" label="Event" error={errors.eventId}>
                <NativeSelect value={String(draft.eventId ?? "")} onChange={(e) => set("eventId", e.target.value)}>
                  <option value="">Choose an event…</option>
                  {upcomingEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} · {formatLocalDate(ev.allDay ? ev.startDate! : localDateOf(ev.start, tz), { weekday: "short", month: "short", day: "numeric" })}
                      {!ev.allDay && ` ${formatTime(ev.start, tz)}`}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{initial ? "Update change" : "Add to scenario"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
