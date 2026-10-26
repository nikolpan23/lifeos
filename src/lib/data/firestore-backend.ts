"use client";

import { collection, doc, getDoc, getDocs, onSnapshot, writeBatch, type Firestore } from "firebase/firestore";
import { profileSchema, recordSchemas } from "@/lib/domain/schemas";
import { COLLECTIONS, type CollectionName, type LifeData, type Profile } from "@/lib/domain/types";
import type { LifeBackend } from "./backend";
import type { Op } from "./ops";

/** Firestore allows 500 writes per batch; stay a little under. */
const BATCH_LIMIT = 450;

export class MissingProfileError extends Error {
  constructor() {
    super("Profile not set up yet");
  }
}

type Parsed<C extends CollectionName> = LifeData[C];

/** Records are untrusted input too: anything that doesn't match the schema is skipped, not rendered. */
function parseCollection<C extends CollectionName>(name: C, docs: { id: string; data: () => unknown }[]): Parsed<C> {
  const schema = recordSchemas[name];
  const out: unknown[] = [];
  for (const d of docs) {
    const result = schema.safeParse({ ...(d.data() as object), id: d.id });
    if (result.success) out.push(result.data);
    else if (process.env.NODE_ENV !== "production") console.warn(`[lifeos] skipped invalid ${name}/${d.id}`, result.error.issues[0]?.message);
  }
  return out as Parsed<C>;
}

function parseProfile(raw: unknown): Profile {
  const result = profileSchema.safeParse(raw);
  if (!result.success) throw new MissingProfileError();
  return result.data as Profile;
}

/**
 * Data lives at users/{uid} (profile) and users/{uid}/{collection}/{id} (records).
 * Security rules make every path readable and writable only by its owner.
 */
export function createFirestoreBackend(db: Firestore, uid: string): LifeBackend {
  const userDoc = doc(db, "users", uid);
  return {
    mode: "live",
    async load() {
      const profileSnap = await getDoc(userDoc);
      if (!profileSnap.exists()) throw new MissingProfileError();
      const profile = parseProfile(profileSnap.data());
      const entries = await Promise.all(
        COLLECTIONS.map(async (name) => {
          const snap = await getDocs(collection(userDoc, name));
          return [name, parseCollection(name, snap.docs)] as const;
        }),
      );
      return { profile, ...Object.fromEntries(entries) } as LifeData;
    },
    async commit(ops: Op[]) {
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + BATCH_LIMIT)) {
          if (op.type === "profile") batch.set(userDoc, op.patch, { merge: true });
          else if (op.type === "put") batch.set(doc(userDoc, op.collection, op.record.id), op.record);
          else if (op.type === "patch") batch.update(doc(userDoc, op.collection, op.id), op.patch);
          else batch.delete(doc(userDoc, op.collection, op.id));
        }
        await batch.commit();
      }
    },
    subscribe(onChange) {
      // Snapshots include this device's pending writes, so they agree with optimistic state.
      const unsubs = COLLECTIONS.map((name) =>
        onSnapshot(
          collection(userDoc, name),
          (snap) => {
            const records = parseCollection(name, snap.docs);
            onChange((data) => ({ ...data, [name]: records }));
          },
          (err) => console.warn(`[lifeos] ${name} listener stopped:`, err.code),
        ),
      );
      unsubs.push(
        onSnapshot(
          userDoc,
          (snap) => {
            if (!snap.exists()) return;
            const result = profileSchema.safeParse(snap.data());
            if (result.success) onChange((data) => ({ ...data, profile: result.data as Profile }));
          },
          (err) => console.warn("[lifeos] profile listener stopped:", err.code),
        ),
      );
      return () => unsubs.forEach((u) => u());
    },
  };
}
