import { describe, expect, it } from "vitest";
import { addDays, dateRange, diffDays, isLocalDate, isWallTime, localDateOf, startOfWeek, todayIn, wallTimeOf, weekdayOf, zonedToISO } from "@/lib/dates";
import { dayAvailability } from "@/lib/scheduling/free-time";
import { DEFAULT_PLANNING } from "@/lib/domain/types";

describe("local dates", () => {
  it("validates formats", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-30")).toBe(false);
    expect(isLocalDate("26-02-28")).toBe(false);
    expect(isWallTime("23:59")).toBe(true);
    expect(isWallTime("24:00")).toBe(false);
  });
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(diffDays("2026-10-01", "2026-10-26")).toBe(25);
    expect(dateRange("2026-10-30", 3)).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("computes weekdays and week starts", () => {
    expect(weekdayOf("2026-10-26")).toBe(1); // Monday
    expect(startOfWeek("2026-10-29", 1)).toBe("2026-10-26");
    expect(startOfWeek("2026-10-29", 0)).toBe("2026-10-25");
  });
});

describe("time zones", () => {
  it("converts wall-clock times to instants in the profile time zone", () => {
    expect(zonedToISO("2026-07-01", "09:00", "Europe/Athens")).toBe("2026-07-01T06:00:00.000Z");
    expect(zonedToISO("2026-12-01", "09:00", "Europe/Athens")).toBe("2026-12-01T07:00:00.000Z");
    expect(zonedToISO("2026-07-01", "09:00", "America/New_York")).toBe("2026-07-01T13:00:00.000Z");
  });
  it("reads back local date and time from an instant", () => {
    const iso = "2026-10-26T22:30:00.000Z";
    expect(localDateOf(iso, "Europe/Athens")).toBe("2026-10-27");
    expect(localDateOf(iso, "America/Los_Angeles")).toBe("2026-10-26");
    expect(wallTimeOf(iso, "Europe/Athens")).toBe("00:30");
  });
  it("knows today per time zone", () => {
    const now = new Date("2026-10-26T23:30:00Z");
    expect(todayIn("Asia/Tokyo", now)).toBe("2026-10-27");
    expect(todayIn("UTC", now)).toBe("2026-10-26");
  });
  it("handles the autumn DST change: the day is 25 hours long", () => {
    // Europe/Athens falls back on 2026-10-25 (03:00 -> 02:00).
    const start = new Date(zonedToISO("2026-10-25", "00:00", "Europe/Athens")).getTime();
    const end = new Date(zonedToISO("2026-10-26", "00:00", "Europe/Athens")).getTime();
    expect((end - start) / 3_600_000).toBe(25);
  });
  it("counts free time correctly on a DST day", () => {
    const planning = { ...DEFAULT_PLANNING, workStart: "00:30", workEnd: "05:30", workDays: [0], planWithin: "work_hours" as const };
    const a = dayAvailability({ date: "2026-10-25", timezone: "Europe/Athens", planning, events: [], habits: [] });
    expect(a.freeMinutes).toBe(6 * 60); // 5 wall-clock hours plus the repeated hour
  });
});
