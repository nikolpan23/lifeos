import type { CollectionName, CollectionRecord, LifeData, Profile } from "@/lib/domain/types";

export type Op =
  | { type: "put"; collection: CollectionName; record: CollectionRecord<CollectionName> }
  | { type: "patch"; collection: CollectionName; id: string; patch: Record<string, unknown> }
  | { type: "delete"; collection: CollectionName; id: string }
  | { type: "profile"; patch: Partial<Profile> };

type AnyRecord = { id: string } & Record<string, unknown>;

function list(data: LifeData, collection: CollectionName): AnyRecord[] {
  return data[collection] as unknown as AnyRecord[];
}

/** Pure: returns a new LifeData with the ops applied. Unknown ids in patch/delete are ignored. */
export function applyOps(data: LifeData, ops: Op[]): LifeData {
  const next: LifeData = { ...data };
  const touched = new Set<CollectionName>();
  const ensure = (c: CollectionName) => {
    if (!touched.has(c)) {
      (next as unknown as Record<string, unknown>)[c] = [...list(data, c)];
      touched.add(c);
    }
    return list(next, c);
  };
  for (const op of ops) {
    if (op.type === "profile") {
      next.profile = { ...next.profile, ...op.patch };
      continue;
    }
    const arr = ensure(op.collection);
    const idx = arr.findIndex((r) => r.id === (op.type === "put" ? op.record.id : op.id));
    if (op.type === "put") {
      if (idx >= 0) arr[idx] = op.record as unknown as AnyRecord;
      else arr.push(op.record as unknown as AnyRecord);
    } else if (op.type === "patch") {
      if (idx >= 0) arr[idx] = { ...arr[idx], ...op.patch };
    } else if (idx >= 0) {
      arr.splice(idx, 1);
    }
  }
  return next;
}

/** Ops that restore the records touched by `ops` to their state in `before`. */
export function inverseOps(before: LifeData, ops: Op[]): Op[] {
  const inverse: Op[] = [];
  const seen = new Set<string>();
  for (const op of ops) {
    if (op.type === "profile") {
      if (!seen.has("profile")) {
        inverse.push({ type: "profile", patch: before.profile });
        seen.add("profile");
      }
      continue;
    }
    const id = op.type === "put" ? op.record.id : op.id;
    const key = `${op.collection}/${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = list(before, op.collection).find((r) => r.id === id);
    inverse.push(
      prev
        ? { type: "put", collection: op.collection, record: prev as unknown as CollectionRecord<CollectionName> }
        : { type: "delete", collection: op.collection, id },
    );
  }
  return inverse;
}
