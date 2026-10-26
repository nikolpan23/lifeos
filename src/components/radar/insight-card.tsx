"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertOctagon, AlertTriangle, ArrowRight, BellOff, ChevronDown, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHref } from "@/components/layout/space-context";
import { useActions, useTimezone, useToday } from "@/lib/data/store";
import { addDays, zonedToISO } from "@/lib/dates";
import type { Insight, Severity } from "@/lib/radar/rules";
import { cn } from "@/lib/utils";

export const SEVERITY: Record<Severity, { label: string; icon: typeof Info; chip: string; bar: string }> = {
  critical: { label: "Needs attention", icon: AlertOctagon, chip: "bg-soft-rose text-ink-rose", bar: "bg-[#d9587f]" },
  warning: { label: "Heads up", icon: AlertTriangle, chip: "bg-soft-peach text-ink-peach", bar: "bg-[#e8763f]" },
  info: { label: "Worth knowing", icon: Info, chip: "bg-soft-blue text-ink-blue", bar: "bg-[#3a86d4]" },
};


export function InsightCard({ insight, compact, onPlan }: { insight: Insight; compact?: boolean; onPlan?: () => void }) {
  const actions = useActions();
  const href = useHref();
  const today = useToday();
  const tz = useTimezone();
  const [open, setOpen] = useState(false);
  const tomorrowMorning = () => zonedToISO(addDays(today, 1), "06:00", tz);
  const s = SEVERITY[insight.severity];
  const Icon = s.icon;
  const actionHref = insight.action.href.startsWith("?") ? href("") + insight.action.href : href(insight.action.href);
  const isPlan = insight.action.href === "?plan=1" && onPlan;

  return (
    <article className="relative overflow-hidden rounded-[16px] border border-border bg-surface p-4 pl-5">
      <span aria-hidden className={cn("absolute top-4 bottom-4 left-0 w-1 rounded-r-full", s.bar)} />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", s.chip)}>
            <Icon className="size-3" aria-hidden /> {s.label}
          </span>
          <h3 className="mt-2 text-[14.5px] leading-snug font-semibold">{insight.title}</h3>
          <p className={cn("mt-1 text-[13px] leading-relaxed text-subtle-foreground", compact && "line-clamp-2")}>{insight.explanation}</p>
        </div>
        <div className="-mt-1 -mr-1 flex shrink-0">
          <Button variant="ghost" size="icon-sm" aria-label={`Snooze “${insight.title}” until tomorrow`} title="Snooze until tomorrow" onClick={() => actions.snoozeInsight(insight.key, tomorrowMorning())}>
            <BellOff />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Dismiss “${insight.title}”`} title="Dismiss" onClick={() => actions.dismissInsight(insight.key)}>
            <X />
          </Button>
        </div>
      </div>
      {!compact && insight.related.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Related">
          {insight.related.slice(0, 6).map((r) => (
            <li key={`${r.type}-${r.id}`} className="max-w-56 truncate rounded-full bg-[#f3f4f8] px-2 py-0.5 text-[12px] text-subtle-foreground">
              <span className="text-faint-foreground capitalize">{r.type}:</span> {r.label}
            </li>
          ))}
          {insight.related.length > 6 && <li className="px-1 text-[12px] text-muted-foreground">+{insight.related.length - 6} more</li>}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isPlan ? (
          <Button size="sm" variant="soft" onClick={onPlan}>
            {insight.action.label} <ArrowRight />
          </Button>
        ) : (
          <Button asChild size="sm" variant="soft">
            <Link href={actionHref}>
              {insight.action.label} <ArrowRight />
            </Link>
          </Button>
        )}
        {!compact && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-md px-1 text-[12.5px] text-muted-foreground hover:text-foreground">
            Why am I seeing this? <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        )}
      </div>
      {open && <p className="mt-2 rounded-[10px] bg-[#f7f8fb] px-3 py-2 text-[12.5px] text-subtle-foreground">{insight.basis} Calculated from what you’ve entered in LifeOS, nothing else.</p>}
    </article>
  );
}
