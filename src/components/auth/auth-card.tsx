import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

export function AuthCard({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,#ecebff,transparent)]" />
      <main className="relative w-full max-w-[420px]">
        <Link href="/" aria-label="LifeOS home" className="mx-auto mb-6 block w-fit">
          <Logo />
        </Link>
        <div className="rounded-[20px] border border-border bg-surface p-6 shadow-soft sm:p-8">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-[14px] text-muted-foreground">{footer}</div>}
      </main>
    </div>
  );
}
