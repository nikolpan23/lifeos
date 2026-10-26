import { browserTimeZone, diffDays, todayIn } from "@/lib/dates";
import { lifeDataSchema } from "@/lib/domain/schemas";
import type { LifeData } from "@/lib/domain/types";
import type { LifeBackend } from "./backend";
import { createDemoData } from "./demo-seed";

/** Demo data lives only in this browser, under its own key, never mixed with real data. */
const STORAGE_KEY = "lifeos:demo:v1";

interface StoredDemo {
  seededOn: string;
  data: LifeData;
}

function read(): StoredDemo | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDemo;
    const valid = lifeDataSchema.safeParse(parsed.data);
    if (!valid.success || typeof parsed.seededOn !== "string") return null;
    return { seededOn: parsed.seededOn, data: valid.data as LifeData };
  } catch {
    return null;
  }
}

function write(value: StoredDemo) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode). The demo still works in memory.
  }
}

export function resetDemoData(): LifeData {
  const tz = browserTimeZone();
  const today = todayIn(tz);
  const data = createDemoData(today, tz);
  write({ seededOn: today, data });
  return data;
}

export function createDemoBackend(): LifeBackend & { refreshed: boolean } {
  let seededOn = "";
  const backend = {
    mode: "demo" as const,
    refreshed: false,
    async load() {
      const tz = browserTimeZone();
      const today = todayIn(tz);
      const stored = read();
      // Sample data is relative to "today"; refresh it if it has gone stale.
      if (stored && Math.abs(diffDays(stored.seededOn, today)) <= 1) {
        seededOn = stored.seededOn;
        return stored.data;
      }
      backend.refreshed = !!stored;
      seededOn = today;
      return resetDemoData();
    },
    async commit(_ops: unknown, next: LifeData) {
      write({ seededOn, data: next });
    },
  };
  return backend;
}
