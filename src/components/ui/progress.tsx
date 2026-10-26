import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  lavender: "bg-accent",
  green: "bg-[#5fbf8a]",
  blue: "bg-[#6aa5ec]",
  peach: "bg-[#f3a36b]",
  rose: "bg-[#e88aa0]",
  yellow: "bg-[#e9c15a]",
} as const;

export function Progress({ value, tone = "lavender", className, label, ...props }: { value: number; tone?: keyof typeof tones; label: string } & React.ComponentProps<"div">) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className={cn("h-2 w-full overflow-hidden rounded-full bg-[#eef0f5]", className)} {...props}>
      <div className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
