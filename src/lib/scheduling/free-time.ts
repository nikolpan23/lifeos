import { addDays, endOfLocalDay, startOfLocalDay, wallTimeToMinutes, zonedToInstant, type LocalDate } from "@/lib/dates";
import { habitsDueOn } from "@/lib/domain/habits";
import { DEFAULT_PLANNING, type CalendarEvent, type Habit, type PlanningPreferences } from "@/lib/domain/types";
import { subtractIntervals, toInterval, totalMinutes, type Interval } from "./intervals";

export const MIN_SLOT_MINUTES = 15;
const SLOT_ROUND_MS = 5 * 60_000;

export interface DayContext {
  date: LocalDate;
  timezone: string;
  planning: PlanningPreferences;
  events: CalendarEvent[];
  habits: Habit[];
  /** When planning today, time before `now` is not available. */
  now?: Date;
}

export interface BusyBlock extends Interval {
  kind: "event" | "habit";
  refId: string;
  title: string;
}

export interface DayAvailability {
  window: Interval | null;
  busy: BusyBlock[];
  free: Interval[];
  freeMinutes: number;
  allDayEvents: CalendarEvent[];
  /** Human-readable assumptions used when computing availability. */
  assumptions: string[];
}

/** The planning window for a day, in instants. Handles DST because each edge is converted separately. */
export function planningWindow(date: LocalDate, timezone: string, planning: PlanningPreferences): { window: Interval | null; assumptions: string[] } {
  const assumptions: string[] = [];
  const useWork = planning.planWithin === "work_hours";
  let startTime = useWork ? planning.workStart : planning.wakeTime;
  let endTime = useWork ? planning.workEnd : planning.sleepTime;
  if (!startTime || !endTime) {
    startTime = startTime ?? (useWork ? DEFAULT_PLANNING.workStart : DEFAULT_PLANNING.wakeTime);
    endTime = endTime ?? (useWork ? DEFAULT_PLANNING.workEnd : DEFAULT_PLANNING.sleepTime);
    assumptions.push(`No ${useWork ? "working hours" : "sleep schedule"} set, so ${startTime}–${endTime} was assumed.`);
  }
  const start = zonedToInstant(date, startTime!, timezone).getTime();
  // Sleep times after midnight (e.g. 00:30) end the window at the next day's wall-clock time.
  const end =
    wallTimeToMinutes(endTime!) <= wallTimeToMinutes(startTime!)
      ? zonedToInstant(addDays(date, 1), endTime!, timezone).getTime()
      : zonedToInstant(date, endTime!, timezone).getTime();
  if (end <= start) return { window: null, assumptions };
  return { window: { start, end }, assumptions };
}

function roundUp(ms: number): number {
  return Math.ceil(ms / SLOT_ROUND_MS) * SLOT_ROUND_MS;
}

export function habitBlocks(habits: Habit[], date: LocalDate, timezone: string): BusyBlock[] {
  return habitsDueOn(habits, date)
    .filter((h) => h.preferredTime && h.durationMinutes)
    .map((h) => {
      const start = zonedToInstant(date, h.preferredTime!, timezone).getTime();
      return { kind: "habit" as const, refId: h.id, title: h.name, start, end: start + h.durationMinutes! * 60_000 };
    });
}

export function eventBlocksForDay(events: CalendarEvent[], date: LocalDate, timezone: string): { timed: BusyBlock[]; allDay: CalendarEvent[] } {
  const dayStart = startOfLocalDay(date, timezone).getTime();
  const dayEnd = endOfLocalDay(date, timezone).getTime();
  const timed: BusyBlock[] = [];
  const allDay: CalendarEvent[] = [];
  for (const e of events) {
    const i = toInterval(e.start, e.end);
    if (i.start >= dayEnd || i.end <= dayStart) continue;
    if (e.allDay) allDay.push(e);
    else timed.push({ kind: "event", refId: e.id, title: e.title, start: i.start, end: i.end });
  }
  return { timed, allDay };
}

export function dayAvailability(ctx: DayContext, options: { includeHabits?: boolean } = {}): DayAvailability {
  const { window, assumptions } = planningWindow(ctx.date, ctx.timezone, ctx.planning);
  const { timed, allDay } = eventBlocksForDay(ctx.events, ctx.date, ctx.timezone);
  const busy: BusyBlock[] = [...timed, ...(options.includeHabits === false ? [] : habitBlocks(ctx.habits, ctx.date, ctx.timezone))];
  if (!window) return { window: null, busy, free: [], freeMinutes: 0, allDayEvents: allDay, assumptions };

  let effective = window;
  if (ctx.now) {
    const nowMs = roundUp(ctx.now.getTime());
    if (nowMs >= window.end) return { window, busy, free: [], freeMinutes: 0, allDayEvents: allDay, assumptions };
    if (nowMs > window.start) effective = { start: nowMs, end: window.end };
  }
  const free = subtractIntervals(effective, busy).filter((f) => f.end - f.start >= MIN_SLOT_MINUTES * 60_000);
  return { window, busy, free, freeMinutes: totalMinutes(free), allDayEvents: allDay, assumptions };
}
