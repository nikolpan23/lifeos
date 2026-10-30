import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { createDemoData } from "@/lib/data/demo-seed";
import { COLLECTIONS } from "@/lib/domain/types";

let env: RulesTestEnvironment;
const data = createDemoData("2026-10-26", "Europe/Athens", new Date("2026-10-26T08:00:00Z"));
const stamp = { createdAt: "2026-10-26T08:00:00.000Z", updatedAt: "2026-10-26T08:00:00.000Z" };
// The demo seed starts without these, so add one of each to cover every collection.
data.dailyPlans.push({
  id: "plan-2026-10-26",
  date: "2026-10-26",
  status: "accepted",
  source: "rules",
  summary: "1h of focused work across 1 task.",
  items: [{ id: "i1", kind: "task", refId: data.tasks[0].id, title: data.tasks[0].title, start: "2026-10-26T07:00:00.000Z", end: "2026-10-26T08:00:00.000Z", reason: "Due today" }],
  unscheduledTaskIds: [],
  notes: [],
  ...stamp,
});
data.insightStates.push({ id: "ins-1", key: "overdue:abc", status: "snoozed", snoozedUntil: "2026-10-27T04:00:00.000Z", ...stamp });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-lifeos-rules",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());

const alice = () => env.authenticatedContext("alice").firestore();
const bob = () => env.authenticatedContext("bob").firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe("profile", () => {
  it("lets the owner create and read their profile", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), data.profile));
    await assertSucceeds(getDoc(doc(alice(), "users/alice")));
  });
  it("blocks other users and signed-out visitors", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), data.profile));
    await assertFails(getDoc(doc(bob(), "users/alice")));
    await assertFails(getDoc(doc(anon(), "users/alice")));
    await assertFails(setDoc(doc(bob(), "users/alice"), data.profile));
  });
  it("rejects unknown fields and bad values", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...data.profile, isAdmin: true }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...data.profile, weekStartsOn: 3 }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...data.profile, displayName: "" }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...data.profile, planning: { ...data.profile.planning, workDays: [7] } }));
    await assertFails(setDoc(doc(alice(), "users/alice"), { ...data.profile, planning: { ...data.profile.planning, planWithin: "anytime" } }));
  });
  it("does not let clients delete the profile", async () => {
    await assertSucceeds(setDoc(doc(alice(), "users/alice"), data.profile));
    await assertFails(deleteDoc(doc(alice(), "users/alice")));
  });
});

describe("records", () => {
  it("accepts every record the app produces", async () => {
    const db = alice();
    for (const name of COLLECTIONS) {
      const records = data[name] as unknown as { id: string }[];
      for (let i = 0; i < records.length; i += 400) {
        const batch = writeBatch(db);
        for (const r of records.slice(i, i + 400)) batch.set(doc(db, `users/alice/${name}/${r.id}`), r);
        await assertSucceeds(batch.commit());
      }
    }
  });

  it("keeps records private to their owner", async () => {
    const task = data.tasks[0];
    await assertSucceeds(setDoc(doc(alice(), `users/alice/tasks/${task.id}`), task));
    await assertFails(getDoc(doc(bob(), `users/alice/tasks/${task.id}`)));
    await assertFails(setDoc(doc(bob(), `users/alice/tasks/${task.id}`), task));
    await assertFails(deleteDoc(doc(bob(), `users/alice/tasks/${task.id}`)));
  });

  it("requires the stored id to match the document id", async () => {
    const task = data.tasks[0];
    await assertFails(setDoc(doc(alice(), "users/alice/tasks/other-id"), task));
  });

  it("rejects malformed tasks", async () => {
    const t = data.tasks[0];
    const ref = doc(alice(), `users/alice/tasks/${t.id}`);
    await assertFails(setDoc(ref, { ...t, priority: "urgent" }));
    await assertFails(setDoc(ref, { ...t, title: "" }));
    await assertFails(setDoc(ref, { ...t, title: "x".repeat(201) }));
    await assertFails(setDoc(ref, { ...t, dueDate: "26/10/2026" }));
    await assertFails(setDoc(ref, { ...t, estimateMinutes: 2 }));
    await assertFails(setDoc(ref, { ...t, extra: "nope" }));
    const { notes: _drop, ...missing } = t;
    void _drop;
    await assertFails(setDoc(ref, missing));
  });

  it("allows partial updates that keep the record valid, and keeps createdAt fixed", async () => {
    const t = data.tasks[0];
    const ref = doc(alice(), `users/alice/tasks/${t.id}`);
    await assertSucceeds(setDoc(ref, t));
    await assertSucceeds(updateDoc(ref, { status: "done", completedAt: "2026-10-26T09:00:00.000Z", updatedAt: "2026-10-26T09:00:00.000Z" }));
    await assertFails(updateDoc(ref, { status: "archived" }));
    await assertFails(updateDoc(ref, { createdAt: "2020-01-01T00:00:00.000Z" }));
  });

  it("denies unknown collections and the server-only usage counters", async () => {
    await assertFails(setDoc(doc(alice(), "users/alice/secrets/x"), { a: 1 }));
    await assertFails(getDoc(doc(alice(), "aiUsage/alice")));
    await assertFails(setDoc(doc(alice(), "aiUsage/alice"), { count: 0 }));
  });
});

it("demo data covers every collection", () => {
  for (const name of COLLECTIONS) expect((data[name] as unknown[]).length, name).toBeGreaterThan(0);
});
