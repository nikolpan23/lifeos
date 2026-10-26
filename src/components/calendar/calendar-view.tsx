"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, dateFnsLocalizer, type View, type SlotInfo, type EventProps } from "react-big-calendar";
import { format, getDay, startOfWeek as dfStartOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { AlertTriangle, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDot, categoryStyle } from "@/components/shared/category";
import { EmptyState } from "@/components/shared/empty-state";
import { useComposer } from "@/components/layout/composer";
import { PlanDialog } from "@/components/planner/plan-dialog";
import { useLife, useNow, useToday } from "@/lib/data/store";
import { addDays, formatLongDate, formatTime, isLocalDate, localDateOf, type LocalDate } from "@/lib/dates";
import { findOverlappingPairs } from "@/lib/scheduling/conflicts";
import type { CalendarEvent, Task } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/**
 * react-big-calendar renders in the browser's local zone. To show the user's
 * profile time zone faithfully (including DST), instants are converted to
 * "wall-clock" Dates whose local fields equal the profile-zone time, and back.
 */
function toWall(instant: string | number | Date, tz: string): Date {
  const z = new TZDate(new Date(instant).getTime(), tz);
  return new Date(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes());
}
function wallDate(d: Date): LocalDate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function wallTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function localDateToWall(date: LocalDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type Item =
  | { kind: "event"; id: string; title: string; start: Date; end: Date; allDay: boolean; event: CalendarEvent; conflict: boolean }
  | { kind: "task"; id: string; title: string; start: Date; end: Date; allDay: boolean; task: Task };

export function CalendarView() {
  const today = useToday();
  const params = useSearchParams();
  const router = useRouter();
  const composer = useComposer();
  const tz = useLife((d) => d.profile.timezone);
  const weekStartsOn = useLife((d) => d.profile.weekStartsOn);
  const events = useLife((d) => d.events);
  const tasks = useLife((d) => d.tasks);
  const categories = useLife((d) => d.categories);
  // Day view by default on small screens. This view only renders on the client, after data loads.
  const [view, setView] = useState<View>(() => (typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches ? "day" : "week"));
  const [date, setDate] = useState<Date>(() => localDateToWall(params.get("date") && isLocalDate(params.get("date")!) ? params.get("date")! : today));
  const [showTasks, setShowTasks] = useState(true);
  const now = useNow();
  const [planOpen, setPlanOpen] = useState(false);

  // Deep links: ?date= jumps to a day, ?event= opens an event; both are then cleared from the URL.
  const dateParam = params.get("date");
  const [seenDate, setSeenDate] = useState<string | null>(dateParam);
  if (dateParam !== seenDate) {
    setSeenDate(dateParam);
    if (dateParam && isLocalDate(dateParam)) setDate(localDateToWall(dateParam));
  }
  useEffect(() => {
    const d = params.get("date");
    const e = params.get("event");
    if (e) {
      const ev = events.find((x) => x.id === e);
      if (ev) composer.openEvent(ev);
    }
    if (d || e) router.replace(window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse: () => new Date(),
        startOfWeek: (d: Date) => dfStartOfWeek(d, { weekStartsOn }),
        getDay,
        locales: { "en-US": { ...enUS, options: { ...enUS.options, weekStartsOn } } },
      }),
    [weekStartsOn],
  );

  const conflictIds = useMemo(() => new Set(findOverlappingPairs(events).flatMap((p) => [p.a.id, p.b.id])), [events]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = events.map((e) =>
      e.allDay
        ? { kind: "event", id: e.id, title: e.title, start: localDateToWall(e.startDate!), end: localDateToWall(addDays(e.endDate!, 1)), allDay: true, event: e, conflict: false }
        : { kind: "event", id: e.id, title: e.title, start: toWall(e.start, tz), end: toWall(e.end, tz), allDay: false, event: e, conflict: conflictIds.has(e.id) },
    );
    if (showTasks) {
      for (const t of tasks) {
        if (!t.dueDate || t.status === "done") continue;
        const start = localDateToWall(t.dueDate);
        out.push({ kind: "task", id: `task-${t.id}`, title: t.title, start, end: localDateToWall(addDays(t.dueDate, 1)), allDay: true, task: t });
      }
    }
    return out;
  }, [events, tasks, tz, conflictIds, showTasks]);

  const onSelectSlot = useCallback(
    (slot: SlotInfo) => {
      const start = slot.start as Date;
      const end = slot.end as Date;
      if (view === "month") {
        const s = wallDate(start);
        composer.openEvent(null, { startDate: s, endDate: s, allDay: false, startTime: "10:00", endTime: "11:00" });
      } else {
        composer.openEvent(null, { startDate: wallDate(start), endDate: wallDate(end), allDay: false, startTime: wallTime(start), endTime: wallTime(end) });
      }
    },
    [composer, view],
  );

  const onSelectEvent = useCallback(
    (item: Item) => {
      if (item.kind === "event") composer.openEvent(item.event);
      else composer.openTask(item.task);
    },
    [composer],
  );

  const eventPropGetter = useCallback(
    (item: Item) => {
      if (item.kind === "task") return { className: "lifeos-ev lifeos-task" };
      const cat = categories.find((c) => c.id === item.event.categoryId);
      return { className: cn("lifeos-ev", `lifeos-${cat?.color ?? "none"}`, item.conflict && "lifeos-conflict") };
    },
    [categories],
  );

  const EventCell = useCallback(({ event: item }: EventProps<Item>) => {
    if (item.kind === "task")
      return (
        <span className="flex items-center gap-1 truncate">
          <CheckCircle2 className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{item.title}</span>
        </span>
      );
    return (
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1 truncate font-medium">
          {item.conflict && <AlertTriangle className="size-3 shrink-0" aria-label="Overlaps another event" />}
          <span className="truncate">{item.title}</span>
        </span>
        {item.event.location && !item.allDay && item.end.getTime() - item.start.getTime() >= 45 * 60_000 && <span className="truncate opacity-80">{item.event.location}</span>}
      </span>
    );
  }, []);

  const label = useMemo(() => {
    if (view === "month") return format(date, "MMMM yyyy");
    if (view === "day") return format(date, "EEEE, MMMM d");
    const start = dfStartOfWeek(date, { weekStartsOn });
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return start.getMonth() === end.getMonth() ? `${format(start, "MMMM d")} – ${format(end, "d, yyyy")}` : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, [date, view, weekStartsOn]);

  const step = (dir: 1 | -1) => {
    const d = new Date(date);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };

  // Agenda for the selected (or current) day.
  const agendaDate = view === "day" ? wallDate(date) : today;
  const agenda = useMemo(() => {
    const timed = events.filter((e) => !e.allDay && localDateOf(e.start, tz) === agendaDate).sort((a, b) => a.start.localeCompare(b.start));
    const allDay = events.filter((e) => e.allDay && e.startDate! <= agendaDate && e.endDate! >= agendaDate);
    const due = tasks.filter((t) => t.status === "open" && t.dueDate === agendaDate);
    return { timed, allDay, due };
  }, [events, tasks, tz, agendaDate]);

  const nowWall = toWall(now.getTime(), tz);
  const scrollTo = useMemo(() => new Date(1970, 0, 1, 7, 30), []);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`Shown in ${tz.replace(/_/g, " ")}. Overlapping events are marked so nothing sneaks up on you.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setPlanOpen(true)}>
              <Sparkles /> Plan {agendaDate === today ? "today" : "this day"}
            </Button>
            <Button onClick={() => composer.openEvent(null, { startDate: view === "day" ? wallDate(date) : today, endDate: view === "day" ? wallDate(date) : today })}>
              <CalendarPlus /> New event
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <Card className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setDate(localDateToWall(today))}>
                Today
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Previous" onClick={() => step(-1)}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Next" onClick={() => step(1)}>
                <ChevronRight />
              </Button>
            </div>
            <h2 className="mr-auto text-[16px] font-semibold" aria-live="polite">
              {label}
            </h2>
            <label className="flex items-center gap-2 text-[13px] text-subtle-foreground">
              <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} className="size-4 accent-[#6e64d6]" /> Show tasks
            </label>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList aria-label="Calendar view">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className={cn("lifeos-calendar", view === "month" ? "h-[720px]" : "h-[760px]")}>
            <Calendar<Item>
              localizer={localizer}
              culture="en-US"
              events={items}
              view={view}
              views={["month", "week", "day"]}
              onView={setView}
              date={date}
              onNavigate={setDate}
              toolbar={false}
              selectable
              popup
              step={30}
              timeslots={2}
              scrollToTime={scrollTo}
              getNow={() => nowWall}
              onSelectSlot={onSelectSlot}
              onSelectEvent={onSelectEvent}
              eventPropGetter={eventPropGetter}
              components={{ event: EventCell }}
              dayLayoutAlgorithm="no-overlap"
              messages={{ showMore: (n: number) => `+${n} more` }}
              formats={{ timeGutterFormat: "h a", eventTimeRangeFormat: () => "" }}
            />
          </div>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>{agendaDate === today ? "Today’s agenda" : "Agenda"}</CardTitle>
              <CardDescription>{formatLongDate(agendaDate)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {agenda.allDay.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {agenda.allDay.map((e) => {
                  const s = categoryStyle(categories.find((c) => c.id === e.categoryId));
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => composer.openEvent(e)} className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium", s.soft, s.text)}>
                        {e.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {agenda.timed.length === 0 && agenda.due.length === 0 && agenda.allDay.length === 0 ? (
              <EmptyState icon={CalendarPlus} title="Nothing planned" description="Select a time on the calendar to add an event." tone="blue" className="py-6" />
            ) : (
              <ol className="grid gap-1">
                {agenda.timed.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => composer.openEvent(e)} className="flex w-full items-start gap-2.5 rounded-[10px] px-2 py-2 text-left hover:bg-[#f7f8fb]">
                      <CategoryDot category={categories.find((c) => c.id === e.categoryId)} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13.5px] font-medium">
                          <span className="truncate">{e.title}</span>
                          {conflictIds.has(e.id) && (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-soft-yellow px-1.5 text-[11px] font-semibold text-ink-yellow">
                              <AlertTriangle className="size-3" aria-hidden /> Overlap
                            </span>
                          )}
                        </span>
                        <span className="block text-[12px] text-muted-foreground">
                          {formatTime(e.start, tz)} – {formatTime(e.end, tz)}
                        </span>
                        {e.location && (
                          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                            <MapPin className="size-3" aria-hidden /> {e.location}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {agenda.due.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">Due this day</p>
                <ul className="grid gap-1">
                  {agenda.due.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => composer.openTask(t)} className="flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[13px] hover:bg-[#f7f8fb]">
                        <CheckCircle2 className="size-3.5 text-primary-strong" aria-hidden />
                        <span className="truncate">{t.title}</span>
                        {t.dueTime && <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">{t.dueTime}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <PlanDialog open={planOpen} onOpenChange={setPlanOpen} date={agendaDate} isToday={agendaDate === today} />
    </>
  );
}
