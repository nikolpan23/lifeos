"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, FileText, Repeat, Search, Target } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLife } from "@/lib/data/store";
import { matchesQuery } from "@/lib/domain/tasks";
import { formatLocalDate, localDateOf } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useHref } from "./space-context";

interface Result {
  id: string;
  kind: "Task" | "Note" | "Goal" | "Event" | "Habit";
  title: string;
  meta: string;
  href: string;
}

const ICONS = { Task: CheckCircle2, Note: FileText, Goal: Target, Event: CalendarDays, Habit: Repeat };

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const href = useHref();
  const listRef = useRef<HTMLUListElement>(null);
  const data = useLife((d) => d);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const tz = data.profile.timezone;
    const out: Result[] = [];
    for (const t of data.tasks) if (matchesQuery(`${t.title} ${t.notes}`, q)) out.push({ id: t.id, kind: "Task", title: t.title, meta: t.status === "done" ? "Completed" : t.dueDate ? `Due ${formatLocalDate(t.dueDate)}` : "No due date", href: `${href("tasks")}?task=${t.id}` });
    for (const n of data.notes) if (!n.archived && matchesQuery(`${n.title} ${n.body} ${n.tags.join(" ")}`, q)) out.push({ id: n.id, kind: "Note", title: n.title || "Untitled note", meta: n.tags.map((t) => `#${t}`).join(" ") || "Note", href: `${href("notes")}?note=${n.id}` });
    for (const g of data.goals) if (matchesQuery(`${g.title} ${g.description}`, q)) out.push({ id: g.id, kind: "Goal", title: g.title, meta: g.status === "active" ? "Active goal" : g.status, href: `${href("goals")}?goal=${g.id}` });
    for (const h of data.habits) if (h.status !== "archived" && matchesQuery(`${h.name} ${h.description}`, q)) out.push({ id: h.id, kind: "Habit", title: h.name, meta: h.status === "paused" ? "Paused" : "Habit", href: href("habits") });
    for (const e of data.events) if (matchesQuery(`${e.title} ${e.description} ${e.location}`, q)) {
      const date = e.allDay ? e.startDate! : localDateOf(e.start, tz);
      out.push({ id: e.id, kind: "Event", title: e.title, meta: formatLocalDate(date, { weekday: "short", month: "short", day: "numeric" }), href: `${href("calendar")}?date=${date}&event=${e.id}` });
    }
    return out.slice(0, 30);
  }, [query, data, href]);

  const changeOpen = (o: boolean) => {
    if (!o) setQuery("");
    onOpenChange(o);
  };

  const go = (r: Result) => {
    changeOpen(false);
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent hideClose className="top-[12vh] max-w-xl translate-y-0 data-[state=open]:animate-[pop-in_160ms_ease-out]" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search LifeOS</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-[18px] text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, notes, goals, events…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint-foreground"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `search-${results[active].kind}-${results[active].id}` : undefined}
            aria-label="Search"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">Esc</kbd>
        </div>
        <ul ref={listRef} id="search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim() && results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{query.trim()}”.</li>}
          {!query.trim() && <li className="px-3 py-8 text-center text-sm text-muted-foreground">Start typing to search everything in LifeOS.</li>}
          {results.map((r, i) => {
            const Icon = ICONS[r.kind];
            return (
              <li
                key={`${r.kind}-${r.id}`}
                id={`search-${r.kind}-${r.id}`}
                data-index={i}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5", i === active && "bg-[#f3f4f8]")}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.kind} · {r.meta}
                </span>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
