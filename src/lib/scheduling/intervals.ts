export interface Interval {
  start: number; // epoch ms
  end: number; // epoch ms, exclusive
}

export function toInterval(start: string | Date, end: string | Date): Interval {
  return { start: new Date(start).getTime(), end: new Date(end).getTime() };
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function overlapMinutes(a: Interval, b: Interval): number {
  return Math.max(0, (Math.min(a.end, b.end) - Math.max(a.start, b.start)) / 60_000);
}

/** Merge overlapping/adjacent intervals. Input need not be sorted. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Free gaps inside `window` once `busy` is removed. */
export function subtractIntervals(window: Interval, busy: Interval[]): Interval[] {
  const merged = mergeIntervals(busy.map((b) => ({ start: Math.max(b.start, window.start), end: Math.min(b.end, window.end) })));
  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of merged) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

export function totalMinutes(intervals: Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, i) => sum + (i.end - i.start) / 60_000, 0);
}
