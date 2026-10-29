import { describe, expect, it } from "vitest";
import { isEmptyNote } from "@/lib/domain/notes";

const blank = { title: "", body: "", tags: [], goalId: null, taskId: null };

describe("isEmptyNote", () => {
  it("treats a note with only whitespace as empty", () => {
    expect(isEmptyNote(blank)).toBe(true);
    expect(isEmptyNote({ ...blank, title: "  ", body: "\n\n" })).toBe(true);
  });

  it("keeps notes that have any content or link", () => {
    expect(isEmptyNote({ ...blank, title: "Groceries" })).toBe(false);
    expect(isEmptyNote({ ...blank, body: "milk" })).toBe(false);
    expect(isEmptyNote({ ...blank, tags: ["ideas"] })).toBe(false);
    expect(isEmptyNote({ ...blank, goalId: "g1" })).toBe(false);
    expect(isEmptyNote({ ...blank, taskId: "t1" })).toBe(false);
  });
});
