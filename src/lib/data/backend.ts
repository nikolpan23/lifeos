import type { LifeData } from "@/lib/domain/types";
import type { Op } from "./ops";

export type DataMode = "demo" | "live";

export interface LifeBackend {
  mode: DataMode;
  /** Load the initial snapshot. */
  load(): Promise<LifeData>;
  /** Persist a group of operations. Rejects if any could not be saved. */
  commit(ops: Op[], next: LifeData): Promise<void>;
  /** Optional live updates (Firestore listeners). Returns an unsubscribe function. */
  subscribe?(onChange: (update: (data: LifeData) => LifeData) => void): () => void;
}
