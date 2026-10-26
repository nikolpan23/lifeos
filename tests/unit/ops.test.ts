import { describe, expect, it } from "vitest";
import { applyOps, inverseOps, type Op } from "@/lib/data/ops";
import { createDemoData } from "@/lib/data/demo-seed";

const data = createDemoData("2026-10-26", "Europe/Athens", new Date("2026-10-26T08:00:00Z"));

describe("ops", () => {
  it("applies puts, patches and deletes without mutating the input", () => {
    const t = data.tasks[0];
    const ops: Op[] = [
      { type: "patch", collection: "tasks", id: t.id, patch: { title: "Changed" } },
      { type: "delete", collection: "notes", id: data.notes[0].id },
      { type: "put", collection: "categories", record: { id: "new", name: "Side project", color: "blue", createdAt: t.createdAt, updatedAt: t.updatedAt } },
    ];
    const next = applyOps(data, ops);
    expect(next.tasks.find((x) => x.id === t.id)?.title).toBe("Changed");
    expect(next.notes).toHaveLength(data.notes.length - 1);
    expect(next.categories.some((c) => c.id === "new")).toBe(true);
    expect(data.tasks[0].title).toBe(t.title);
  });
  it("inverse ops restore the original records", () => {
    const ops: Op[] = [
      { type: "patch", collection: "tasks", id: data.tasks[1].id, patch: { status: "done" } },
      { type: "delete", collection: "goals", id: data.goals[0].id },
      { type: "profile", patch: { displayName: "Sam" } },
    ];
    const restored = applyOps(applyOps(data, ops), inverseOps(data, ops));
    expect(restored.tasks.find((t) => t.id === data.tasks[1].id)).toEqual(data.tasks[1]);
    expect(restored.goals.find((g) => g.id === data.goals[0].id)).toEqual(data.goals[0]);
    expect(restored.profile.displayName).toBe(data.profile.displayName);
  });
});
