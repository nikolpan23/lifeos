"use client";

import { useState, type ReactNode } from "react";
import { LifeDataProvider } from "@/lib/data/store";
import { createDemoBackend } from "@/lib/data/demo-backend";
import { SpaceProvider } from "./space-context";
import { AppShell } from "./app-shell";
import { AccountProvider } from "./account-context";

export function DemoWorkspace({ children }: { children: ReactNode }) {
  const [backend] = useState(() => createDemoBackend());
  return (
    <SpaceProvider value="demo">
      <AccountProvider value={{ email: null, aiConfigured: false, signOut: async () => {} }}>
        <LifeDataProvider backend={backend}>
          <AppShell>{children}</AppShell>
        </LifeDataProvider>
      </AccountProvider>
    </SpaceProvider>
  );
}
