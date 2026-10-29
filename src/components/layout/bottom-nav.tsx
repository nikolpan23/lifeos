"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavItem, spaceHref } from "./nav";
import { useSpace } from "./space-context";

const SLUGS = ["", "tasks", "calendar", "habits", "notes"];

/** Thumb-reach tabs for the five everyday pages on phones and tablets. Everything else lives in the menu. */
export function BottomNav() {
  const space = useSpace();
  const active = activeNavItem(usePathname(), space);
  const items = SLUGS.map((s) => NAV_ITEMS.find((i) => i.slug === s)!);
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const isActive = item.slug === active.slug;
          const Icon = item.icon;
          return (
            <li key={item.slug}>
              <Link
                href={spaceHref(space, item.slug)}
                aria-current={isActive ? "page" : undefined}
                className={cn("icon-host flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", isActive ? "text-primary-strong" : "text-muted-foreground")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-lavender")}>
                  <Icon className={cn("size-[19px]", item.anim)} strokeWidth={1.9} aria-hidden />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
