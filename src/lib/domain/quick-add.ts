import { addDays, weekdayOf, type LocalDate } from "@/lib/dates";
import type { TaskPriority } from "./types";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export interface QuickAddResult {
  title: string;
  dueDate: LocalDate | null;
  priority: TaskPriority;
  estimateMinutes: number | null;
}

/**
 * Light, predictable parsing for the quick-add box. Recognised tokens:
 * "today", "tomorrow", a weekday name, "!" or "!high", "!low", and "30m" / "1h".
 * Anything else stays in the title.
 */
export function parseQuickAdd(input: string, today: LocalDate, fallbackDue: LocalDate | null = today): QuickAddResult {
  let dueDate: LocalDate | null = fallbackDue;
  let priority: TaskPriority = "medium";
  let estimateMinutes: number | null = null;
  const kept: string[] = [];
  for (const raw of input.trim().split(/\s+/)) {
    const token = raw.toLowerCase();
    if (token === "today") dueDate = today;
    else if (token === "tomorrow" || token === "tmr") dueDate = addDays(today, 1);
    else if (WEEKDAYS.includes(token)) {
      const target = WEEKDAYS.indexOf(token);
      const delta = (target - weekdayOf(today) + 7) % 7 || 7;
      dueDate = addDays(today, delta);
    } else if (token === "!" || token === "!high" || token === "!!") priority = "high";
    else if (token === "!low") priority = "low";
    else if (/^\d{1,3}m$/.test(token) && Number(token.slice(0, -1)) >= 5) estimateMinutes = Math.min(960, Number(token.slice(0, -1)));
    else if (/^\d{1,2}(\.\d)?h$/.test(token) && Number(token.slice(0, -1)) > 0) estimateMinutes = Math.min(960, Math.round(Number(token.slice(0, -1)) * 60));
    else kept.push(raw);
  }
  return { title: kept.join(" ").trim(), dueDate, priority, estimateMinutes };
}
