import type { Metadata } from "next";
import { Suspense } from "react";
import { RadarView } from "@/components/radar/radar-view";

export const metadata: Metadata = { title: "Life Radar" };

export default function Page() {
  return (
    <Suspense>
      <RadarView />
    </Suspense>
  );
}
