"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle2, FilePlus2, LogOut, Menu, Plus, RotateCcw, Search, Settings, Target, Repeat, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { useLife, useMode, useToday } from "@/lib/data/store";
import { formatLongDate } from "@/lib/dates";
import { resetDemoData } from "@/lib/data/demo-backend";
import { activeNavItem, spaceHref } from "./nav";
import { useHref, useSpace } from "./space-context";
import { useComposer } from "./composer";
import { NavList } from "./sidebar";
import { SearchDialog } from "./search-dialog";
import { useAccount } from "./account-context";
import { SidebarFooter } from "./sidebar-footer";
import { nextHourPreset } from "@/components/calendar/event-dialog";
import { exportLifeData } from "@/lib/data/export";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function Header() {
  const space = useSpace();
  const href = useHref();
  const pathname = usePathname();
  const router = useRouter();
  const mode = useMode();
  const today = useToday();
  const composer = useComposer();
  const account = useAccount();
  const name = useLife((d) => d.profile.displayName);
  const tz = useLife((d) => d.profile.timezone);
  const data = useLife((d) => d);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const item = activeNavItem(pathname, space);
  const isDashboard = item.slug === "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open navigation" onClick={() => setNavOpen(true)}>
          <Menu />
        </Button>
        <Link href={spaceHref(space)} className="lg:hidden" aria-label="LifeOS dashboard">
          <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </Link>
        <div className="hidden min-w-0 flex-1 lg:block">
          <p className="truncate text-[15px] font-semibold">{isDashboard ? "Dashboard" : item.label}</p>
          <p className="text-[12px] text-muted-foreground">{formatLongDate(today)}</p>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 lg:flex-none">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden h-10 w-64 items-center gap-2.5 rounded-[11px] border border-border bg-surface px-3 text-sm text-faint-foreground shadow-[0_1px_2px_rgb(36_40_59/0.03)] transition-colors hover:border-border-strong md:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded-md border border-border px-1.5 text-[11px] text-muted-foreground">⌘K</kbd>
          </button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Quick add" className="max-sm:size-10 max-sm:px-0">
                <Plus className="size-[18px]" />
                <span className="hidden sm:inline">Quick add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuItem onSelect={() => composer.openTask(null, { dueDate: today })}>
                <CheckCircle2 /> Task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => composer.openEvent(null, nextHourPreset(today, tz))}>
                <CalendarPlus /> Event
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => composer.newNote()}>
                <FilePlus2 /> Note
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => composer.openHabit()}>
                <Repeat /> Habit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => composer.openGoal()}>
                <Target /> Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="flex size-10 items-center justify-center rounded-full bg-soft-peach text-[13px] font-semibold text-ink-peach ring-2 ring-white transition-shadow hover:ring-[#f0e2d6]"
              >
                {initials(name)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60">
              <DropdownMenuLabel>
                <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
                <span className="block truncate font-normal">{mode === "demo" ? "Demo mode · sample data" : account.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push(href("settings"))}>
                <Settings /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => exportLifeData(data, mode)}>
                <Download /> Export my data
              </DropdownMenuItem>
              {mode === "demo" ? (
                <>
                  <DropdownMenuItem
                    onSelect={() => {
                      resetDemoData();
                      window.location.reload();
                    }}
                  >
                    <RotateCcw /> Reset demo data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/")}>
                    <LogOut /> Exit demo
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => account.signOut()}>
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="px-3 pt-5 pb-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Move between LifeOS sections</SheetDescription>
          <div className="mb-6 px-3">
            <Logo />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <NavList onNavigate={() => setNavOpen(false)} />
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
