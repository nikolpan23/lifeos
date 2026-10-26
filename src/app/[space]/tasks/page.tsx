import type { Metadata } from "next";
import { Suspense } from "react";
import { TasksView } from "@/components/tasks/tasks-view";

export const metadata: Metadata = { title: "My Tasks" };

export default function Page() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  );
}
