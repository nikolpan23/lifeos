import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-[#f1f2f7] text-subtle-foreground",
      lavender: "bg-lavender text-primary-strong",
      blue: "bg-soft-blue text-ink-blue",
      green: "bg-soft-green text-ink-green",
      peach: "bg-soft-peach text-ink-peach",
      rose: "bg-soft-rose text-ink-rose",
      yellow: "bg-soft-yellow text-ink-yellow",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
