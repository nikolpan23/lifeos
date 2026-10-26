import { TZDate } from "@date-fns/tz";

/**
 * Date conventions used across LifeOS
 * - Instants (event start/end, completedAt, createdAt) are ISO-8601 UTC strings.
 * - Local calendar days (due dates, habit completion days) are "YYYY-MM-DD"
 *   strings interpreted in the user's profile time zone.
 * - Wall-clock times (working hours, habit times) are "HH:mm".
 *
 * Local-date arithmetic is done on the string itself (via UTC math) so it can
 * never drift across daylight-saving transitions.
 */

export type LocalDate = string; // YYYY-MM-DD
export type WallTime = string; // HH:mm

const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WALL_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isLocalDate(value: string): boolean {
  if (!LOCAL_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isWallTime(value: string): boolean {
  return WALL_TIME_RE.test(value);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function parseLocal(date: LocalDate): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fromUTCDate(dt: Date): LocalDate {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** The local calendar date of an instant in a time zone. */
export function localDateOf(instant: string | Date | number, tz: string): LocalDate {
  const d = new TZDate(new Date(instant).getTime(), tz);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The wall-clock time (HH:mm) of an instant in a time zone. */
export function wallTimeOf(instant: string | Date | number, tz: string): WallTime {
  const d = new TZDate(new Date(instant).getTime(), tz);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayIn(tz: string, now: Date = new Date()): LocalDate {
  return localDateOf(now, tz);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = parseLocal(date);
  return fromUTCDate(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Whole days from a to b (b - a). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  const [ay, am, ad] = parseLocal(a);
  const [by, bm, bd] = parseLocal(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(date: LocalDate): number {
  const [y, m, d] = parseLocal(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function startOfWeek(date: LocalDate, weekStartsOn: number): LocalDate {
  const offset = (weekdayOf(date) - weekStartsOn + 7) % 7;
  return addDays(date, -offset);
}

export function dateRange(start: LocalDate, days: number): LocalDate[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function compareLocal(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Convert a wall-clock time on a local date into a UTC instant.
 * Non-existent times (spring-forward gaps) resolve to the next valid instant;
 * ambiguous times (fall-back overlaps) resolve to the earlier occurrence.
 */
export function zonedToInstant(date: LocalDate, time: WallTime, tz: string): Date {
  const [y, m, d] = parseLocal(date);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, 0, tz).getTime());
}

export function zonedToISO(date: LocalDate, time: WallTime, tz: string): string {
  return zonedToInstant(date, time, tz).toISOString();
}

/** Instant of local midnight at the start of the given date. */
export function startOfLocalDay(date: LocalDate, tz: string): Date {
  return zonedToInstant(date, "00:00", tz);
}

/** Instant of local midnight at the start of the following date (handles 23/25-hour days). */
export function endOfLocalDay(date: LocalDate, tz: string): Date {
  return startOfLocalDay(addDays(date, 1), tz);
}

export function minutesBetween(a: string | Date, b: string | Date): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000);
}

export function wallTimeToMinutes(time: WallTime): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToWallTime(total: number): WallTime {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

/* ----------------------------- Formatting ----------------------------- */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = tz + JSON.stringify(options);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, ...options });
    fmtCache.set(key, f);
  }
  return f;
}

export function formatTime(instant: string | Date, tz: string): string {
  return fmt(tz, { hour: "numeric", minute: "2-digit" }).format(new Date(instant));
}

export function formatTimeRange(start: string | Date, end: string | Date, tz: string): string {
  return `${formatTime(start, tz)} – ${formatTime(end, tz)}`;
}

export function formatWallTime(time: WallTime): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

/** Formats a LocalDate without any time-zone shifting. */
export function formatLocalDate(date: LocalDate, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  const [y, m, d] = parseLocal(date);
  return fmt("UTC", options).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export function formatLongDate(date: LocalDate): string {
  return formatLocalDate(date, { weekday: "long", month: "long", day: "numeric" });
}

export function weekdayShort(date: LocalDate): string {
  return formatLocalDate(date, { weekday: "short" });
}

/** "Today", "Tomorrow", "Yesterday", weekday within a week, or a short date. */
export function relativeDayLabel(date: LocalDate, today: LocalDate): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return formatLocalDate(date, { weekday: "long" });
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return formatLocalDate(date, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" });
}

export function greetingFor(instant: Date, tz: string): string {
  const hour = Number(fmt(tz, { hour: "numeric", hourCycle: "h23" }).format(instant));
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export const COMMON_TIME_ZONES: string[] = (() => {
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (supported) return supported("timeZone");
  } catch {
    /* fall through */
  }
  return ["UTC", "Europe/London", "Europe/Athens", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney"];
})();
