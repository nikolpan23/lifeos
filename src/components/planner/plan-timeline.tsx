"use client";

import { Coffee, CalendarDays, CheckCircle2, Repeat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTime, minutesBetween, durationLabel } from "@/lib/dates";
import type { PlanItem } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const KIND = {
  task: { icon: CheckCircle2, cls: "bg-lavender text-primary-strong", label: "Focus" },
  habit: { icon: Repeat, cls: "bg-soft-green text-ink-green", label: "Habit" },
  event: { icon: CalendarDays, cls: "bg-[#efe6d5] text-subtle-foreground", label: "Event" },
  break: { icon: Coffee, cls: "bg-soft-peach text-ink-peach", label: "Break" },
} as const;

export function PlanTimeline({
  items,
  tz,
  onRemove,
  doneTaskIds,
  onToggleTask,
  showFixed = true,
}: {
  items: PlanItem[];
  tz: string;
  onRemove?: (taskId: string) => void;
  doneTaskIds?: Set<string>;
  onToggleTask?: (taskId: string, done: boolean) => void;
  showFixed?: boolean;
}) {
  const visible = showFixed ? items : items.filter((i) => i.kind === "task" || i.kind === "break");
  return (
    <ol className="relative grid gap-2 before:absolute before:top-3 before:bottom-3 before:left-[69px] before:w-px before:bg-border" aria-label="Plan timeline">
      {visible.map((item) => {
        const k = KIND[item.kind];
        const Icon = k.icon;
        const done = item.refId ? doneTaskIds?.has(item.refId) : false;
        const minutes = minutesBetween(item.start, item.end);
        return (
          <li key={item.id} className="relative flex items-start gap-3">
            <span className="w-[68px] whitespace-nowrap shrink-0 pt-2 text-right text-[12.5px] font-medium text-muted-foreground tabular-nums">{formatTime(item.start, tz)}</span>
            <span className={cn("relative z-10 mt-1.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-surface", k.cls)}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className={cn("min-w-0 flex-1 rounded-[12px] px-3 py-2", item.kind === "task" ? "border border-[#efd9c4] bg-[#fbf3e8]" : item.kind === "event" ? "bg-[#f6efe2]" : "")}>
              <div className="flex items-start gap-2">
                {item.kind === "task" && onToggleTask && item.refId && (
                  <Checkbox round className="mt-0.5" checked={!!done} onCheckedChange={(c) => onToggleTask(item.refId!, c === true)} aria-label={`Complete “${item.title}”`} />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14px] font-medium", item.kind !== "task" && "text-subtle-foreground", done && "text-faint-foreground line-through")}>
                    <span className="sr-only">{k.label}: </span>
                    {item.title}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatTime(item.start, tz)}–{formatTime(item.end, tz)} · {durationLabel(minutes)}
                  </p>
                  {item.kind === "task" && item.reason && <p className="mt-1 text-[12.5px] leading-relaxed text-subtle-foreground">{item.reason}</p>}
                </div>
                {onRemove && item.kind === "task" && item.refId && (
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove “${item.title}” from the plan`} onClick={() => onRemove(item.refId!)}>
                    <X />
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
