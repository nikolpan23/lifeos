"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Check, CloudOff, Eye, FileText, Loader2, Pencil, Pin, PinOff, Plus, Search, Tag, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { useActions, useLife } from "@/lib/data/store";
import { matchesQuery } from "@/lib/domain/tasks";
import { tagSchema } from "@/lib/domain/schemas";
import { plainExcerpt, renderMarkdown } from "@/lib/markdown";
import { ValidationError } from "@/lib/data/actions";
import type { Note } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function NoteEditor({ note, onBack }: { note: Note; onBack: () => void }) {
  const actions = useActions();
  const goals = useLife((d) => d.goals);
  const tasks = useLife((d) => d.tasks);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tags, setTags] = useState(note.tags);
  const [goalId, setGoalId] = useState(note.goalId ?? "");
  const [taskId, setTaskId] = useState(note.taskId ?? "");
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, body, tags, goalId, taskId });
  useLayoutEffect(() => {
    latest.current = { title, body, tags, goalId, taskId };
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = latest.current;
    setState("saving");
    try {
      const ok = await actions.saveNote(note.id, { title: v.title, body: v.body, tags: v.tags, goalId: v.goalId || null, taskId: v.taskId || null });
      setState(ok ? "saved" : "error");
    } catch (e) {
      setState("error");
      if (!(e instanceof ValidationError)) throw e;
    }
  }, [actions, note.id]);

  const schedule = useCallback(() => {
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  // Save pending edits when switching notes or leaving the page.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timer.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timer.current) void flush();
    };
  }, [flush]);

  const addTag = () => {
    const parsed = tagSchema.safeParse(tagDraft);
    if (!parsed.success) {
      setTagError(parsed.error.issues[0]?.message ?? "Invalid tag");
      return;
    }
    if (!tags.includes(parsed.data)) {
      if (tags.length >= 20) return setTagError("Up to 20 tags");
      setTags([...tags, parsed.data]);
      schedule();
    }
    setTagDraft("");
    setTagError(null);
  };

  const html = useMemo(() => (preview ? renderMarkdown(body) : ""), [preview, body]);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 sm:px-5">
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Back to notes" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="mr-auto flex items-center gap-1.5 text-[12.5px] text-muted-foreground" aria-live="polite">
          {state === "saving" && (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
            </>
          )}
          {state === "dirty" && "Unsaved changes"}
          {state === "saved" && (
            <>
              <Check className="size-3.5 text-ink-green" aria-hidden /> Saved
            </>
          )}
          {state === "error" && (
            <button type="button" onClick={flush} className="inline-flex items-center gap-1.5 text-ink-rose underline underline-offset-2">
              <CloudOff className="size-3.5" aria-hidden /> Not saved. Retry
            </button>
          )}
          {state === "idle" && `Edited ${relativeTime(note.updatedAt)}`}
        </div>
        <div className="flex rounded-[10px] bg-[#f1f2f7] p-0.5" role="group" aria-label="Editor mode">
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)} className={cn("inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-medium", !preview ? "bg-surface shadow-sm" : "text-subtle-foreground")}>
            <Pencil className="size-3.5" aria-hidden /> Write
          </button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)} className={cn("inline-flex h-7 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-medium", preview ? "bg-surface shadow-sm" : "text-subtle-foreground")}>
            <Eye className="size-3.5" aria-hidden /> Preview
          </button>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={note.pinned ? "Unpin note" : "Pin note"} title={note.pinned ? "Unpin" : "Pin"} onClick={() => actions.setNoteFlags(note.id, { pinned: !note.pinned })}>
          {note.pinned ? <PinOff /> : <Pin />}
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={note.archived ? "Restore note" : "Archive note"} title={note.archived ? "Restore" : "Archive"} onClick={() => actions.setNoteFlags(note.id, { archived: !note.archived })}>
          {note.archived ? <ArchiveRestore /> : <Archive />}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete note"
          title="Delete"
          className="hover:bg-soft-rose hover:text-danger"
          onClick={async () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = null;
            if (await actions.deleteNote(note.id)) onBack();
          }}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-6">
        <label htmlFor="note-title" className="sr-only">
          Note title
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            schedule();
          }}
          placeholder="Untitled note"
          maxLength={200}
          className="w-full bg-transparent text-[24px] font-semibold tracking-[-0.02em] outline-none placeholder:text-faint-foreground"
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-lavender py-0.5 pr-1 pl-2.5 text-[12.5px] font-medium text-primary-strong">
              #{t}
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                onClick={() => {
                  setTags(tags.filter((x) => x !== t));
                  schedule();
                }}
                className="rounded-full p-0.5 hover:bg-white/70"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <Tag className="size-3.5 text-faint-foreground" aria-hidden />
            <input
              value={tagDraft}
              onChange={(e) => {
                setTagDraft(e.target.value);
                setTagError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  if (tagDraft.trim()) addTag();
                }
              }}
              onBlur={() => tagDraft.trim() && addTag()}
              placeholder="Add tag"
              aria-label="Add tag"
              aria-invalid={tagError ? true : undefined}
              className="w-24 bg-transparent text-[13px] outline-none placeholder:text-faint-foreground"
              maxLength={32}
            />
          </div>
          {tagError && (
            <span role="alert" className="text-[12px] text-danger">
              {tagError}
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <NativeSelect aria-label="Link to goal" value={goalId} onChange={(e) => { setGoalId(e.target.value); schedule(); }} className="h-9 text-[13px]">
            <option value="">Not linked to a goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                Goal: {g.title}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Link to task" value={taskId} onChange={(e) => { setTaskId(e.target.value); schedule(); }} className="h-9 text-[13px]">
            <option value="">Not linked to a task</option>
            {tasks
              .filter((t) => t.status === "open" || t.id === taskId)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  Task: {t.title}
                </option>
              ))}
          </NativeSelect>
        </div>
        <div className="mt-4 flex-1">
          {preview ? (
            body.trim() ? (
              // Sanitized by renderMarkdown (no raw HTML, strict allow-list).
              <div className="prose-note" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            )
          ) : (
            <Textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                schedule();
              }}
              aria-label="Note body (Markdown supported)"
              placeholder={"Start writing… Markdown works: **bold**, - lists, ## headings, [links](https://…)"}
              className="min-h-[340px] resize-y border-none bg-transparent px-0 font-[450] shadow-none focus-visible:ring-0"
              maxLength={100_000}
            />
          )}
        </div>
        <p className="mt-3 text-right text-[12px] text-faint-foreground">{words} word{words === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}

export function NotesView() {
  const actions = useActions();
  const params = useSearchParams();
  const router = useRouter();
  const notes = useLife((d) => d.notes);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("note"));
  const [mobileEditing, setMobileEditing] = useState(!!params.get("note"));

  // Deep link: /notes?note=id selects that note, then the param is cleared from the URL.
  const noteParam = params.get("note");
  const [seenParam, setSeenParam] = useState<string | null>(null);
  if (noteParam !== seenParam) {
    setSeenParam(noteParam);
    if (noteParam) {
      setSelectedId(noteParam);
      setMobileEditing(true);
      const n = notes.find((x) => x.id === noteParam);
      if (n) setShowArchived(n.archived);
    }
  }
  useEffect(() => {
    if (noteParam) router.replace(window.location.pathname, { scroll: false });
  }, [noteParam, router]);

  const allTags = useMemo(() => [...new Set(notes.filter((n) => n.archived === showArchived).flatMap((n) => n.tags))].sort(), [notes, showArchived]);
  const list = useMemo(
    () =>
      notes
        .filter((n) => n.archived === showArchived && (!tag || n.tags.includes(tag)) && matchesQuery(`${n.title} ${n.body} ${n.tags.join(" ")}`, query))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)),
    [notes, showArchived, tag, query],
  );
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const create = async () => {
    const n = await actions.addNote({ tags: tag ? [tag] : [] });
    if (n) {
      setShowArchived(false);
      setSelectedId(n.id);
      setMobileEditing(true);
    }
  };

  return (
    <>
      <PageHeader
        title="Notes"
        description="Thoughts worth keeping. Everything saves as you type."
        actions={
          <Button onClick={create}>
            <Plus /> New note
          </Button>
        }
      />
      <Card className="grid overflow-hidden md:grid-cols-[320px_1fr]">
        <div className={cn("flex min-h-[60vh] flex-col border-border md:border-r", mobileEditing && selected && "max-md:hidden")}>
          <div className="grid gap-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="pl-9" />
            </div>
            <div className="flex gap-2">
              <NativeSelect aria-label="Filter by tag" value={tag} onChange={(e) => setTag(e.target.value)} className="h-9 flex-1 text-[13px]">
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </NativeSelect>
              <Button variant={showArchived ? "soft" : "outline"} size="sm" className="h-9" aria-pressed={showArchived} onClick={() => setShowArchived((s) => !s)}>
                <Archive /> Archived
              </Button>
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState icon={FileText} title={query || tag ? "No matching notes" : showArchived ? "No archived notes" : "No notes yet"} description={query || tag ? "Try another search or tag." : showArchived ? "Archived notes are kept here." : "Jot down an idea, a plan, or a list."} action={!showArchived && !query ? <Button size="sm" variant="soft" onClick={create}><Plus /> New note</Button> : undefined} />
          ) : (
            <ul className="flex-1 overflow-y-auto p-2" aria-label="Notes">
              {list.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    aria-current={n.id === selectedId ? "true" : undefined}
                    onClick={() => {
                      setSelectedId(n.id);
                      setMobileEditing(true);
                    }}
                    className={cn("w-full rounded-[12px] px-3 py-2.5 text-left transition-colors", n.id === selectedId ? "bg-lavender" : "hover:bg-[#f7f8fb]")}
                  >
                    <span className="flex items-center gap-1.5">
                      {n.pinned && <Pin className="size-3 shrink-0 text-primary-strong" aria-label="Pinned" />}
                      <span className="truncate text-[14px] font-medium">{n.title || "Untitled note"}</span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[12.5px] text-muted-foreground">{plainExcerpt(n.body) || "No content"}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11.5px] text-faint-foreground">
                      {relativeTime(n.updatedAt)}
                      {n.tags.slice(0, 2).map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn(!mobileEditing && "max-md:hidden")}>
          {selected ? (
            <NoteEditor key={selected.id} note={selected} onBack={() => setMobileEditing(false)} />
          ) : (
            <EmptyState icon={FileText} title="Pick a note" description="Choose a note on the left, or start a new one." className="min-h-[60vh]" />
          )}
        </div>
      </Card>
    </>
  );
}
