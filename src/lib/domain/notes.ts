import type { Note } from "./types";

type NoteContent = Pick<Note, "title" | "body" | "tags"> & { goalId?: string | null; taskId?: string | null };

/** A note with nothing in it: no title, no text, no tags and no links. Safe to discard. */
export function isEmptyNote(n: NoteContent): boolean {
  return !n.title.trim() && !n.body.trim() && n.tags.length === 0 && !n.goalId && !n.taskId;
}
