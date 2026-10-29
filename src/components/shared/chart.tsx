"use client";

import { useId, useState, type ReactNode } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Validated categorical order (see README › Charts). Color follows entity, never rank. */
export const SERIES = {
  lavender: "#b35d3a",
  teal: "#5e8a4a",
  orange: "#c7743f",
  blue: "#4f7f99",
  amber: "#b8901f",
  rose: "#b5564d",
} as const;

export const AXIS = { stroke: "#e6dccb", tick: { fill: "#6f675b", fontSize: 12 } };
export const GRID = "#ede4d3";

export interface LegendItem {
  label: string;
  color: string;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-subtle-foreground" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

interface TooltipPayload {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number; format?: (v: number, name: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-border bg-surface px-3 py-2 text-[12.5px] shadow-lift">
      {label !== undefined && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      <ul className="grid gap-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-subtle-foreground">
            <span aria-hidden className="size-2 rounded-[3px]" style={{ background: p.color }} />
            <span className="flex-1">{p.name}</span>
            <span className="font-semibold text-foreground tabular-nums">{format ? format(Number(p.value), String(p.name)) : p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Wraps a chart with a legend and an accessible data-table alternative.
 * Colors below 3:1 against the surface are relieved by the table view and tooltips.
 */
export function ChartFrame({
  legend,
  columns,
  rows,
  caption,
  children,
  height = 220,
}: {
  legend?: LegendItem[];
  columns: string[];
  rows: (string | number)[][];
  caption: string;
  children: ReactNode;
  height?: number;
}) {
  const [table, setTable] = useState(false);
  const id = useId();
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <ChartLegend items={legend ?? []} />
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setTable((t) => !t)} aria-controls={id} aria-pressed={table}>
          {table ? <BarChart3 /> : <Table2 />}
          {table ? "Chart" : "Table"}
        </Button>
      </div>
      <div id={id}>
        {table ? (
          <div className="overflow-x-auto rounded-[12px] border border-border">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-[#f6efe2] text-muted-foreground">
                <tr>
                  {columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {r.map((cell, j) =>
                      j === 0 ? (
                        <th key={j} scope="row" className="px-3 py-2 font-medium">
                          {cell}
                        </th>
                      ) : (
                        <td key={j} className="px-3 py-2 tabular-nums">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div role="img" aria-label={caption} style={{ height }} className="w-full min-w-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
