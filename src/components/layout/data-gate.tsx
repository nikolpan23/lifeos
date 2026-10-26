"use client";

import type { ReactNode } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLifeState } from "@/lib/data/store";

export function WorkspaceSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading your space">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function DataGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const status = useLifeState((s) => s.status);
  const error = useLifeState((s) => s.error);
  if (status === "loading") return <>{fallback ?? <WorkspaceSkeleton />}</>;
  if (status === "error")
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-soft-rose text-ink-rose">
          <CloudOff className="size-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">We couldn’t load your space</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  return <>{children}</>;
}
