import type { CalendarEvent } from "@/lib/domain/types";
import { overlaps, toInterval, type Interval } from "./intervals";

/** Timed events overlapping the given interval. All-day events are not treated as conflicts. */
export function findEventConflicts(events: CalendarEvent[], interval: Interval, excludeId?: string): CalendarEvent[] {
  return events.filter((e) => !e.allDay && e.id !== excludeId && overlaps(toInterval(e.start, e.end), interval));
}

export interface ConflictPair {
  a: CalendarEvent;
  b: CalendarEvent;
}

/** Every pair of overlapping timed events, each pair reported once. */
export function findOverlappingPairs(events: CalendarEvent[]): ConflictPair[] {
  const timed = events.filter((e) => !e.allDay).sort((x, y) => x.start.localeCompare(y.start));
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < timed.length; i++) {
    const a = timed[i];
    const ai = toInterval(a.start, a.end);
    for (let j = i + 1; j < timed.length; j++) {
      const b = timed[j];
      const bi = toInterval(b.start, b.end);
      if (bi.start >= ai.end) break;
      if (overlaps(ai, bi)) pairs.push({ a, b });
    }
  }
  return pairs;
}
