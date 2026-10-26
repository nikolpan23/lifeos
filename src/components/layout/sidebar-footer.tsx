"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { useLifeState, useMode } from "@/lib/data/store";

export function SidebarFooter() {
  const mode = useMode();
  const saving = useLifeState((s) => s.saving);
  if (mode === "demo") {
    return (
      <div className="mt-5 rounded-[14px] bg-soft-peach p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-peach">
          <FlaskConical className="size-3.5" aria-hidden /> Demo mode
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#7a5a43]">Sample data, stored only in this browser. Nothing here is sent anywhere.</p>
        <Link href="/signup" className="mt-2.5 inline-block text-[12px] font-semibold text-ink-peach underline underline-offset-2">
          Create your own space
        </Link>
      </div>
    );
  }
  return (
    <p className="mt-5 px-3 text-[12px] text-muted-foreground" aria-live="polite">
      {saving > 0 ? "Saving…" : "All changes saved"}
    </p>
  );
}
