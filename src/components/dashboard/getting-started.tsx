"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, CheckCircle2, FilePlus2, Repeat, Target, X, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useComposer } from "@/components/layout/composer";
import { nextHourPreset } from "@/components/calendar/event-dialog";
import { useLife, useToday } from "@/lib/data/store";
import { isEmptyNote } from "@/lib/domain/notes";
import { cn } from "@/lib/utils";

const KEY = "lifeos.gettingStarted.hidden";

interface Step {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  done: boolean;
  run: () => void;
}

/** First-week checklist on the dashboard. It disappears once every step is done, or when hidden. */
export function GettingStartedCard() {
  const composer = useComposer();
  const today = useToday();
  const tz = useLife((d) => d.profile.timezone);
  const counts = {
    tasks: useLife((d) => d.tasks.length),
    habits: useLife((d) => d.habits.length),
    goals: useLife((d) => d.goals.length),
    notes: useLife((d) => d.notes.filter((n) => !isEmptyNote(n)).length),
    events: useLife((d) => d.events.length),
  };
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let value = false;
    try {
      value = localStorage.getItem(KEY) === "1";
    } catch {
      // Storage unavailable: show the card.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setHidden(value);
  }, []);

  const steps: Step[] = [
    { id: "task", label: "Add your first task", hint: "Something you want to get done", icon: CheckCircle2, done: counts.tasks > 0, run: () => composer.openTask(null, { dueDate: today }) },
    { id: "event", label: "Put something on your calendar", hint: "A class, a meeting, a coffee", icon: CalendarPlus, done: counts.events > 0, run: () => composer.openEvent(null, nextHourPreset(today, tz)) },
    { id: "habit", label: "Start a habit", hint: "Like drinking water or reading 10 pages", icon: Repeat, done: counts.habits > 0, run: () => composer.openHabit() },
    { id: "goal", label: "Set a goal", hint: "Something bigger, with milestones", icon: Target, done: counts.goals > 0, run: () => composer.openGoal() },
    { id: "note", label: "Write a note", hint: "An idea, a list, a plan", icon: FilePlus2, done: counts.notes > 0, run: () => void composer.newNote() },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (hidden || doneCount === steps.length) return null;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <Card className="rise-in relative">
      <CardHeader>
        <div>
          <CardTitle>Get started with LifeOS</CardTitle>
          <CardDescription>
            {doneCount} of {steps.length} done. Each step takes under a minute.
          </CardDescription>
        </div>
        <button type="button" onClick={hide} aria-label="Hide getting started" className="rounded-full p-1.5 text-faint-foreground hover:bg-[#efe6d5] hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
      </CardHeader>
      <CardContent>
        <Progress value={(doneCount / steps.length) * 100} label="Getting started progress" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={s.run}
                disabled={s.done}
                className={cn(
                  "icon-host flex h-full w-full flex-col items-start gap-2 rounded-[14px] border p-3 text-left transition-colors",
                  s.done ? "border-transparent bg-soft-green/70" : "border-border bg-surface hover:border-accent/50 hover:bg-[#fbf3e8]",
                )}
              >
                <span className={cn("flex size-8 items-center justify-center rounded-full", s.done ? "bg-surface text-ink-green" : "bg-lavender text-primary-strong")}>
                  {s.done ? <Check className="size-4" aria-hidden /> : <s.icon className="anim-wiggle size-4" aria-hidden />}
                </span>
                <span className={cn("text-[13.5px] font-semibold", s.done && "text-ink-green line-through decoration-1")}>{s.label}</span>
                <span className="text-[12px] leading-snug text-muted-foreground">{s.done ? "Done" : s.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
