"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { eventForm, toEventInput, type EventFormValues } from "@/lib/domain/forms";
import type { CalendarEvent } from "@/lib/domain/types";
import { useActions, useLife, useToday } from "@/lib/data/store";
import { ValidationError, eventTimes } from "@/lib/data/actions";
import { addDays, formatTimeRange, localDateOf, wallTimeOf } from "@/lib/dates";
import { eventInput } from "@/lib/domain/schemas";
import { findEventConflicts } from "@/lib/scheduling/conflicts";
import { toInterval } from "@/lib/scheduling/intervals";

function defaults(event: CalendarEvent | null | undefined, tz: string, today: string, preset?: Partial<EventFormValues>): EventFormValues {
  if (event) {
    return {
      title: event.title,
      description: event.description,
      location: event.location,
      categoryId: event.categoryId ?? "",
      allDay: event.allDay,
      startDate: event.allDay ? event.startDate! : localDateOf(event.start, tz),
      endDate: event.allDay ? event.endDate! : localDateOf(event.end, tz),
      startTime: event.allDay ? "" : wallTimeOf(event.start, tz),
      endTime: event.allDay ? "" : wallTimeOf(event.end, tz),
    };
  }
  return { title: "", description: "", location: "", categoryId: "", allDay: false, startDate: today, endDate: today, startTime: "10:00", endTime: "11:00", ...preset };
}

export function EventDialog({ open, onOpenChange, event, preset }: { open: boolean; onOpenChange: (o: boolean) => void; event?: CalendarEvent | null; preset?: Partial<EventFormValues> }) {
  const actions = useActions();
  const categories = useLife((d) => d.categories);
  const events = useLife((d) => d.events);
  const tz = useLife((d) => d.profile.timezone);
  const today = useToday();
  const form = useForm<EventFormValues>({ resolver: zodResolver(eventForm), defaultValues: defaults(event, tz, today, preset) });
  const { register, handleSubmit, formState, reset, watch, setValue, setError } = form;

  useEffect(() => {
    if (open) reset(defaults(event, tz, today, preset));
  }, [open, event, tz, today, preset, reset]);

  const values = watch();
  const conflicts = useMemo(() => {
    const parsed = eventInput.safeParse(toEventInput(values));
    if (!parsed.success || parsed.data.allDay) return [];
    const t = eventTimes(parsed.data, tz);
    return findEventConflicts(events, toInterval(t.start, t.end), event?.id);
  }, [values, tz, events, event?.id]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const input = toEventInput(v);
      const ok = event ? await actions.updateEvent(event.id, input) : await actions.addEvent(input);
      if (ok) onOpenChange(false);
    } catch (err) {
      if (err instanceof ValidationError) setError("root", { message: err.message });
      else throw err;
    }
  });

  const onDelete = async () => {
    if (!event) return;
    if (await actions.deleteEvent(event.id)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>Times are in {tz.replace(/_/g, " ")}.</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <Field id="event-title" label="Title" error={formState.errors.title?.message}>
              <Input autoFocus placeholder="e.g. Coffee with Jordan" {...register("title")} />
            </Field>
            <div className="flex items-center justify-between rounded-[12px] bg-[#f5eee1] px-3 py-2.5">
              <Label htmlFor="event-allday">All-day event</Label>
              <Switch
                id="event-allday"
                checked={values.allDay}
                onCheckedChange={(c) => setValue("allDay", c, { shouldDirty: true })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="event-start-date" label="Starts" error={formState.errors.startDate?.message}>
                <Input
                  type="date"
                  {...register("startDate", {
                    onChange: (e) => {
                      if (values.endDate < e.target.value) setValue("endDate", e.target.value);
                    },
                  })}
                />
              </Field>
              <Field id="event-end-date" label="Ends" error={formState.errors.endDate?.message}>
                <Input type="date" min={values.startDate} {...register("endDate")} />
              </Field>
            </div>
            {!values.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="event-start-time" label="Start time" error={formState.errors.startTime?.message}>
                  <Input type="time" {...register("startTime")} />
                </Field>
                <Field id="event-end-time" label="End time" error={formState.errors.endTime?.message}>
                  <Input type="time" {...register("endTime")} />
                </Field>
              </div>
            )}
            {conflicts.length > 0 && (
              <div role="status" className="flex gap-2.5 rounded-[12px] border border-[#f1e0b0] bg-soft-yellow px-3 py-2.5 text-sm text-ink-yellow">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium">Overlaps with {conflicts.length === 1 ? "another event" : `${conflicts.length} events`}</p>
                  <ul className="mt-0.5 text-[13px]">
                    {conflicts.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        {c.title} · {formatTimeRange(c.start, c.end, tz)}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[13px]">You can still save it.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field id="event-category" label="Category" optional>
                <NativeSelect {...register("categoryId")}>
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field id="event-location" label="Location" optional error={formState.errors.location?.message}>
                <Input placeholder="Where?" {...register("location")} />
              </Field>
            </div>
            <Field id="event-description" label="Description" optional error={formState.errors.description?.message}>
              <Textarea rows={3} {...register("description")} />
            </Field>
            {formState.errors.root && (
              <p role="alert" className="rounded-[10px] bg-soft-rose px-3 py-2 text-sm text-ink-rose">
                {formState.errors.root.message}
              </p>
            )}
          </DialogBody>
          <DialogFooter className="sm:justify-between">
            {event ? (
              <Button variant="ghost" className="text-danger hover:bg-soft-rose hover:text-danger" onClick={onDelete}>
                <Trash2 /> Delete event
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                {event ? "Save changes" : "Add event"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function nextHourPreset(date: string, tz: string, now = new Date()): Partial<EventFormValues> {
  const isToday = localDateOf(now, tz) === date;
  if (!isToday) return { startDate: date, endDate: date, startTime: "10:00", endTime: "11:00" };
  const hour = Number(wallTimeOf(now, tz).slice(0, 2)) + 1;
  if (hour >= 23) return { startDate: addDays(date, 1), endDate: addDays(date, 1), startTime: "10:00", endTime: "11:00" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return { startDate: date, endDate: date, startTime: `${pad(hour)}:00`, endTime: `${pad(hour + 1)}:00` };
}
