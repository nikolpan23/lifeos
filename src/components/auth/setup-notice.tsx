import Link from "next/link";
import { Wrench } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";

/** Shown instead of sign-in when this deployment has no Firebase project connected yet. */
export function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg rounded-[20px] border border-border bg-surface p-6 shadow-soft sm:p-8">
        <Logo />
        <div className="mt-6 flex size-11 items-center justify-center rounded-[13px] bg-soft-peach text-ink-peach">
          <Wrench className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Accounts aren’t connected yet</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
          This copy of LifeOS doesn’t have a Firebase project configured, so sign-up and sign-in are turned off. The demo still works fully in your browser.
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-subtle-foreground">
          <li>Create a Firebase project and add a web app.</li>
          <li>Enable Email/Password sign-in and create a Firestore database.</li>
          <li>Copy the web app config into <code className="rounded bg-[#f1f2f6] px-1">.env.local</code> (see the README).</li>
          <li>Restart the dev server.</li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/demo" className={buttonVariants()}>
            Explore the demo
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
