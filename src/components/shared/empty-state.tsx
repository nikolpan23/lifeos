import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className, tone = "lavender" }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string; tone?: "lavender" | "green" | "blue" | "peach" }) {
  const bg = { lavender: "bg-lavender text-primary-strong", green: "bg-soft-green text-ink-green", blue: "bg-soft-blue text-ink-blue", peach: "bg-soft-peach text-ink-peach" }[tone];
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className={cn("mb-3 flex size-11 items-center justify-center rounded-[14px]", bg)}>
        <Icon className="size-5" aria-hidden />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
