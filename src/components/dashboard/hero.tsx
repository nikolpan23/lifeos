"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLife, useNow, useToday } from "@/lib/data/store";
import { durationLabel, formatLongDate, formatTime, greetingFor, localDateOf } from "@/lib/dates";
import { habitsDueOn } from "@/lib/domain/habits";
import { dayAvailability } from "@/lib/scheduling/free-time";

function emojiFor(greeting: string) {
  if (greeting === "Good morning") return "☀️";
  if (greeting === "Good afternoon") return "🌤️";
  return "🌙";
}

export function DashboardHero() {
  const today = useToday();
  const now = useNow();
  const reduce = useReducedMotion();
  const profile = useLife((d) => d.profile);
  const tasks = useLife((d) => d.tasks);
  const events = useLife((d) => d.events);
  const habits = useLife((d) => d.habits);
  const tz = profile.timezone;
  const greeting = greetingFor(now, tz);

  const overview = useMemo(() => {
    const due = tasks.filter((t) => t.status === "open" && t.dueDate === today).length;
    const overdue = tasks.filter((t) => t.status === "open" && t.dueDate && t.dueDate < today).length;
    const upcomingEvents = events.filter((e) => !e.allDay && localDateOf(e.start, tz) === today && new Date(e.end) > now).length;
    const habitsToday = habitsDueOn(habits, today).length;
    const avail = dayAvailability({ date: today, timezone: tz, planning: profile.planning, events, habits, now });
    const nextFree = avail.free[0];
    const parts: string[] = [];
    parts.push(due === 0 ? "Nothing is due today" : `${due} task${due === 1 ? "" : "s"} due today`);
    if (upcomingEvents) parts.push(`${upcomingEvents} event${upcomingEvents === 1 ? "" : "s"} still ahead`);
    if (habitsToday) parts.push(`${habitsToday} habit${habitsToday === 1 ? "" : "s"} on the schedule`);
    let line = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.` : `${parts[0]}.`;
    if (overdue) line += ` ${overdue} earlier task${overdue === 1 ? " is" : "s are"} waiting for a new date.`;
    const free = nextFree
      ? `Your next free stretch is ${formatTime(new Date(nextFree.start), tz)}–${formatTime(new Date(nextFree.end), tz)}, with ${durationLabel(Math.round(avail.freeMinutes))} open in total.`
      : avail.window
        ? "No free planning time is left today."
        : "";
    return { line, free };
  }, [tasks, events, habits, today, tz, profile.planning, now]);

  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
      <p className="text-[13px] font-medium text-muted-foreground lg:hidden">{formatLongDate(today)}</p>
      <h1 className="mt-1 text-[30px] leading-tight font-semibold tracking-[-0.025em] sm:text-[34px]">
        {greeting}
        {profile.displayName ? `, ${profile.displayName}` : ""}! <span aria-hidden>{emojiFor(greeting)}</span>
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-subtle-foreground">
        {overview.line} {overview.free}
      </p>
    </motion.div>
  );
}
