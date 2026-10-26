"use client";

import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LifeDataProvider } from "@/lib/data/store";
import { createFirestoreBackend } from "@/lib/data/firestore-backend";
import type { LifeBackend } from "@/lib/data/backend";
import { clientAuth, clientDb } from "@/lib/firebase/client";
import { deleteAccount, hardNavigate, isLeaving, signOut } from "@/lib/auth/client-auth";
import { SpaceProvider } from "./space-context";
import { AccountProvider } from "./account-context";
import { AppShell } from "./app-shell";
import { WorkspaceSkeleton } from "./data-gate";

interface Props {
  uid: string;
  email: string | null;
  aiConfigured: boolean;
  children: ReactNode;
}

type Phase = { kind: "checking" } | { kind: "ready"; backend: LifeBackend } | { kind: "error"; message: string };

/**
 * The signed-in workspace. The server has already verified the session cookie;
 * here we wait for the Firebase client to restore the same user (Firestore rules
 * need it), make sure onboarding is done, then load data from Firestore.
 */
export function LiveWorkspace({ uid, email, aiConfigured, children }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    const stop = onAuthStateChanged(clientAuth(), async (user) => {
      if (cancelled || isLeaving()) return;
      if (!user || user.uid !== uid) {
        // Browser sign-in was cleared or belongs to someone else: end the server session too.
        await signOut();
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      try {
        const db = clientDb();
        const profile = await getDoc(doc(db, "users", uid));
        if (cancelled) return;
        if (!profile.exists() || !profile.data()?.onboardedAt) {
          window.location.replace("/onboarding");
          return;
        }
        setPhase({ kind: "ready", backend: createFirestoreBackend(db, uid) });
      } catch (err) {
        const code = (err as { code?: string }).code;
        setPhase({
          kind: "error",
          message: code === "permission-denied" ? "Your session doesn't have access to this data. Try signing out and in again." : "Check your connection and try again.",
        });
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [uid]);

  if (phase.kind === "checking") return <WorkspaceSkeleton />;
  if (phase.kind === "error")
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-[14px] bg-soft-rose text-ink-rose">
          <CloudOff className="size-5" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">We couldn’t open your space</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{phase.message}</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="outline" onClick={async () => { await signOut(); hardNavigate("/login"); }}>
            Sign out
          </Button>
        </div>
      </div>
    );

  return (
    <SpaceProvider value="app">
      <AccountProvider
        value={{
          email,
          aiConfigured,
          signOut: async () => {
            await signOut();
            hardNavigate("/");
          },
          deleteAccount: async (password) => {
            await deleteAccount(password);
            hardNavigate("/?deleted=1");
          },
        }}
      >
        <LifeDataProvider backend={phase.backend}>
          <AppShell>{children}</AppShell>
        </LifeDataProvider>
      </AccountProvider>
    </SpaceProvider>
  );
}
