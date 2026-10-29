import { cn } from "@/lib/utils";

/** A small sun rising over a horizon line: a day starting. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="10" fill="#A8532F" />
      <path d="M8.5 20.5a7.5 7.5 0 0 1 15 0" fill="#F6E3C8" />
      <path d="M6 21.5h20" stroke="#F6E3C8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 7.2v2.2M9.4 10l1.4 1.6M22.6 10l-1.4 1.6" stroke="#F6E3C8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[19px] font-semibold tracking-[-0.01em] text-foreground">LifeOS</span>
    </span>
  );
}
