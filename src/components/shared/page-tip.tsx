"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import type { NavItem } from "@/components/layout/nav";

const KEY = "lifeos.tips.dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** A short "how this page works" card, shown until the person dismisses it. */
export function PageTip({ item }: { item: NavItem }) {
  const id = item.slug || "home";
  // Hidden until we've read storage, so a dismissed tip never flashes in.
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setDismissed(readDismissed());
  }, []);

  if (!dismissed || dismissed.includes(id)) return null;

  const dismiss = () => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the tip just comes back next visit.
    }
  };

  return (
    <aside aria-label={`Tip: ${item.tip.title}`} className="rise-in relative mb-6 flex gap-3 rounded-[16px] border border-[#ecd9b8] bg-soft-yellow/70 p-4 pr-11">
      <span className="anim-float mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-yellow shadow-soft">
        <Lightbulb className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-foreground">{item.tip.title}</p>
        <ul className="mt-1 grid gap-0.5 text-[13.5px] text-subtle-foreground">
          {item.tip.steps.map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-yellow/60" />
              {s}
            </li>
          ))}
        </ul>
        <button type="button" onClick={dismiss} className="mt-2 text-[12.5px] font-semibold text-ink-yellow underline underline-offset-2">
          Got it
        </button>
      </div>
      <button type="button" onClick={dismiss} aria-label="Hide tip" className="absolute top-3 right-3 rounded-full p-1 text-ink-yellow/70 hover:bg-surface hover:text-ink-yellow">
        <X className="size-4" aria-hidden />
      </button>
    </aside>
  );
}

/** Brings every dismissed tip back (used from Settings). */
export function resetPageTips() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
