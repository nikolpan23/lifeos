import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  lavender: "bg-accent",
  green: "bg-[#8fae7a]",
  blue: "bg-[#86a8bb]",
  peach: "bg-[#e3a575]",
  rose: "bg-[#d99a94]",
  yellow: "bg-[#dcb85c]",
} as const;

export function Progress({ value, tone = "lavender", className, label, ...props }: { value: number; tone?: keyof typeof tones; label: string } & React.ComponentProps<"div">) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn("h-2 w-full overflow-hidden rounded-full bg-[#ede4d3]", className)} {...props}>
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
