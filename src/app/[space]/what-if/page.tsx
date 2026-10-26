import type { Metadata } from "next";
import { Suspense } from "react";
import { WhatIfView } from "@/components/whatif/whatif-view";

export const metadata: Metadata = { title: "What-If Studio" };

export default function Page() {
  return (
    <Suspense>
      <WhatIfView />
    </Suspense>
  );
}
