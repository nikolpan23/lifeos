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
  const plan = NAV_ITEMS.slice(0, 2);
  const track = NAV_ITEMS.slice(2, 6);
  const smart = NAV_ITEMS.slice(6, 9);
  const settings = NAV_ITEMS[9];

  const renderItem = (item: NavItem, withHint = false) => {
    const isActive = item.slug === active.slug;
    const Icon = item.icon;
    const badge = badges[item.slug];
    return (
      <li key={item.slug}>
        <Link
          href={spaceHref(space, item.slug)}
          onClick={onNavigate}
          aria-current={isActive ? "page" : undefined}
          title={item.description}
          className={cn(
            "icon-host group relative flex items-center gap-3 rounded-[11px] px-3 text-[14px] font-medium transition-colors",
            withHint ? "py-2" : "h-10",
            isActive ? "bg-lavender text-primary-strong" : "text-subtle-foreground hover:bg-[#e8dcc6]/60 hover:text-foreground",
          )}
        >
          {isActive && <span aria-hidden className="absolute top-2.5 bottom-2.5 -left-3 w-[3px] rounded-r-full bg-accent" />}
          <Icon className={cn("size-[18px] shrink-0", item.anim, isActive ? "text-primary-strong" : "text-faint-foreground group-hover:text-subtle-foreground")} strokeWidth={1.9} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.label}</span>
            {withHint && <span className={cn("block truncate text-[11.5px] font-normal", isActive ? "text-primary-strong/80" : "text-muted-foreground")}>{item.description}</span>}
          </span>
          {badge ? (
            <span className={cn("min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold", isActive ? "bg-surface text-primary-strong" : "bg-[#e8dcc6] text-subtle-foreground")}>
              <span className="sr-only">, </span>
              {badge}
              <span className="sr-only"> due</span>
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  const group = (label: string, items: NavItem[], withHint = false) => (
    <div>
      <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.08em] text-faint-foreground uppercase">{label}</p>
      <ul className="grid gap-0.5">{items.map((i) => renderItem(i, withHint))}</ul>
    </div>
  );

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col gap-5">
      {group("Plan", plan)}
      {group("Keep track", track)}
      {group("Helpers", smart, true)}
      <ul className="mt-auto grid gap-0.5">{renderItem(settings)}</ul>
    </nav>
  );
}

export function Sidebar() {
  const space = useSpace();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col overflow-y-auto border-r border-border bg-sidebar px-3 pt-5 pb-4 lg:flex">
      <Link href={spaceHref(space)} className="mb-6 rounded-[10px] px-3 py-1" aria-label="LifeOS home">
        <Logo />
      </Link>
      <NavList />
      <SidebarFooter />
    </aside>
  );
}
