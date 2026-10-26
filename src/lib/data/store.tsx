"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import { toast } from "sonner";
import type { LifeData } from "@/lib/domain/types";
import { todayIn } from "@/lib/dates";
import { createActions, ValidationError, type LifeActions } from "./actions";
import type { DataMode, LifeBackend } from "./backend";
import { applyOps, inverseOps, type Op } from "./ops";

/**
 * Shared client state for the signed-in workspace. Zustand is used because the
 * dashboard, header quick-add, sidebar badges and every page read and mutate
 * the same records and need to stay in sync immediately.
 */
export interface LifeState {
  mode: DataMode;
  status: "loading" | "ready" | "error";
  error: string | null;
  data: LifeData | null;
  saving: number;
  lastSavedAt: number | null;
  apply: (ops: Op[], options?: { success?: string; error?: string }) => Promise<boolean>;
}

function friendlyError(err: unknown): string {
  if (err instanceof ValidationError) return err.message;
  const code = (err as { code?: string })?.code;
  if (code === "permission-denied") return "You don't have permission to change that. Try signing in again.";
  if (code === "unavailable") return "You're offline. Changes will sync when you reconnect.";
  return "Something went wrong while saving. Please try again.";
}

function createLifeStore(backend: LifeBackend): StoreApi<LifeState> {
  return createStore<LifeState>((set, get) => ({
    mode: backend.mode,
    status: "loading",
    error: null,
    data: null,
    saving: 0,
    lastSavedAt: null,
    async apply(ops, options) {
      const before = get().data;
      if (!before || ops.length === 0) return false;
      // Optimistic: apply locally, then persist; on failure roll back only the touched records.
      const next = applyOps(before, ops);
      set((s) => ({ data: next, saving: s.saving + 1 }));
      try {
        await backend.commit(ops, get().data!);
        set((s) => ({ saving: s.saving - 1, lastSavedAt: Date.now() }));
        if (options?.success) toast.success(options.success);
        return true;
      } catch (err) {
        const current = get().data;
        set((s) => ({ data: current ? applyOps(current, inverseOps(before, ops)) : current, saving: s.saving - 1 }));
        toast.error(options?.error ?? friendlyError(err));
        if (process.env.NODE_ENV !== "production") console.error("[lifeos] save failed", (err as Error)?.message);
        return false;
      }
    },
  }));
}

const StoreContext = createContext<StoreApi<LifeState> | null>(null);

export function LifeDataProvider({ backend, children }: { backend: LifeBackend; children: ReactNode }) {
  const [store] = useState(() => createLifeStore(backend));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let unsubscribe: (() => void) | undefined;
    backend
      .load()
      .then((data) => {
        store.setState({ data, status: "ready" });
        if ((backend as { refreshed?: boolean }).refreshed) toast.message("Demo data refreshed for today");
        unsubscribe = backend.subscribe?.((update) => {
          const current = store.getState().data;
          if (current) store.setState({ data: update(current) });
        });
      })
      .catch((err) => {
        store.setState({ status: "error", error: friendlyError(err) });
      });
    return () => unsubscribe?.();
  }, [backend, store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useLifeStoreApi(): StoreApi<LifeState> {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useLife must be used inside LifeDataProvider");
  return store;
}

export function useLifeState<T>(selector: (s: LifeState) => T): T {
  return useStore(useLifeStoreApi(), selector);
}

/** Selects from loaded data. Only call beneath <DataGate>, where data is guaranteed. */
export function useLife<T>(selector: (d: LifeData) => T): T {
  return useStore(useLifeStoreApi(), (s) => selector(s.data as LifeData));
}

export function useActions(): LifeActions {
  const store = useLifeStoreApi();
  return useMemo(
    () => createActions((ops, options) => store.getState().apply(ops, options), () => store.getState().data as LifeData),
    [store],
  );
}

export function useMode(): DataMode {
  return useLifeState((s) => s.mode);
}

export function useTimezone(): string {
  return useLife((d) => d.profile.timezone);
}

/** Today's local date in the profile time zone; re-evaluates every minute so midnight rolls over. */
export function useToday(): string {
  const tz = useTimezone();
  const [state, setState] = useState(() => ({ tz, today: todayIn(tz) }));
  // A new time zone changes "today" immediately (adjusting state during render).
  if (state.tz !== tz) setState({ tz, today: todayIn(tz) });
  const today = state.tz === tz ? state.today : todayIn(tz);
  useEffect(() => {
    const t = setInterval(() => setState({ tz, today: todayIn(tz) }), 60_000);
    return () => clearInterval(t);
  }, [tz]);
  return today;
}

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
