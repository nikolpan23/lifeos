"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataGate } from "./data-gate";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ComposerProvider } from "./composer";
import { DemoBanner } from "./demo-banner";

/** Chrome around every workspace page. Rendered only once data is loaded. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DataGate>
      <TooltipProvider>
        <ComposerProvider>
          <a href="#main" className="sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
            Skip to content
          </a>
          <Sidebar />
          <div className="flex min-h-dvh flex-col lg:pl-[240px]">
            <DemoBanner />
            <Header />
            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1240px] min-w-0 flex-1 px-4 pt-6 pb-16 outline-none sm:px-6 lg:px-8 lg:pt-8">
              {children}
            </main>
          </div>
        </ComposerProvider>
      </TooltipProvider>
    </DataGate>
  );
}
