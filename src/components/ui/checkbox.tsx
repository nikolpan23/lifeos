"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, round, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root> & { round?: boolean }) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer relative inline-flex size-5 shrink-0 items-center justify-center border-[1.5px] border-[#cdbfa6] bg-surface transition-colors duration-150 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
        "before:absolute before:-inset-2.5 before:content-['']",
        round ? "rounded-full" : "rounded-[6px]",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center data-[state=checked]:animate-[pop_180ms_ease-out]">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
