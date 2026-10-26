import type { Metadata } from "next";
import { Suspense } from "react";
import { NotesView } from "@/components/notes/notes-view";

export const metadata: Metadata = { title: "Notes" };

export default function Page() {
  return (
    <Suspense>
      <NotesView />
    </Suspense>
  );
}
