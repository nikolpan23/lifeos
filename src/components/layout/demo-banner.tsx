"use client";

import Link from "next/link";
import { useMode } from "@/lib/data/store";

export function DemoBanner() {
  const mode = useMode();
  if (mode !== "demo") return null;
  return (
    <div role="note" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#2e2a24] px-4 py-2 text-center text-[13px] text-white/90">
      <span>
        <strong className="font-semibold text-white">Demo mode.</strong> You’re exploring sample data that lives only in this browser.
      </span>
      <Link href="/signup" className="font-semibold text-[#e6c7aa] underline underline-offset-2 hover:text-white">
        Create an account
      </Link>
    </div>
  );
}
