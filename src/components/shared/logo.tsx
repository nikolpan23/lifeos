import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="10" fill="#8B82E8" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="4.2" fill="#fff" />
      <circle cx="23.2" cy="10.6" r="2.2" fill="#FFF1E6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">LifeOS</span>
    </span>
  );
}
