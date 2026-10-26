"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { useLife, useToday } from "@/lib/data/store";
import { compareLocal } from "@/lib/dates";
import { NAV_ITEMS, activeNavItem, spaceHref, type NavItem } from "./nav";
import { useSpace } from "./space-context";
import { SidebarFooter } from "./sidebar-footer";

function useBadges(): Record<string, number | undefined> {
  const today = useToday();
  const dueCount = useLife((d) => d.tasks.filter((t) => t.status === "open" && t.dueDate && compareLocal(t.dueDate, today) <= 0).length);
  return { tasks: dueCount || undefined };
}

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const space = useSpace();
  const pathname = usePathname();
  const active = activeNavItem(pathname, space);
  const badges = useBadges();
  const primary = NAV_ITEMS.slice(0, 6);
  const intelligence = NAV_ITEMS.slice(6, 9);
  const settings = NAV_ITEMS[9];

  const renderItem = (item: NavItem) => {
    const isActive = item.slug === active.slug;
    const Icon = item.icon;
    const badge = badges[item.slug];
    return (
      <li key={item.slug}>
        <Link
          href={spaceHref(space, item.slug)}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group relative flex h-10 items-center gap-3 rounded-[11px] px-3 text-[14px] font-medium transition-colors",
            isActive ? "bg-lavender text-primary-strong" : "text-subtle-foreground hover:bg-[#f4f5f9] hover:text-foreground",
          )}
        >
          {isActive && <span aria-hidden className="absolute top-2.5 bottom-2.5 -left-3 w-[3px] rounded-r-full bg-accent" />}
          <Icon className={cn("size-[18px]", isActive ? "text-primary-strong" : "text-faint-foreground group-hover:text-subtle-foreground")} strokeWidth={1.9} aria-hidden />
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold", isActive ? "bg-white text-primary-strong" : "bg-[#f1f2f7] text-subtle-foreground")}>
              <span className="sr-only">, </span>
              {badge}
              <span className="sr-only"> due</span>
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-6">
      <ul className="grid gap-0.5">{primary.map(renderItem)}</ul>
      <div>
        <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-faint-foreground uppercase">Intelligence</p>
        <ul className="grid gap-0.5">{intelligence.map(renderItem)}</ul>
      </div>
      <ul className="mt-auto grid gap-0.5">{renderItem(settings)}</ul>
    </nav>
  );
}

export function Sidebar() {
  const space = useSpace();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-sidebar px-3 pt-5 pb-4 lg:flex">
      <Link href={spaceHref(space)} className="mb-7 rounded-[10px] px-3 py-1" aria-label="LifeOS dashboard">
        <Logo />
      </Link>
      <NavList />
      <SidebarFooter />
    </aside>
  );
}
