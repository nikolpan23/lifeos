import type { Metadata } from "next";
import { Suspense } from "react";
import { HabitsView } from "@/components/habits/habits-view";

export const metadata: Metadata = { title: "Habits" };

export default function Page() {
  return (
    <Suspense>
      <HabitsView />
    </Suspense>
  );
}
