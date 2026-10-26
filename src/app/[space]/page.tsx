import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardHero } from "@/components/dashboard/hero";
import { GoalsCard, HabitsTodayCard, ScheduleCard, TasksTodayCard, TodayProgressCard } from "@/components/dashboard/cards";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity";
import { RadarCard } from "@/components/dashboard/radar-card";
import { PlanCard } from "@/components/planner/plan-card";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="grid gap-5">
      <div className="grid items-end gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <DashboardHero />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <TodayProgressCard />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="grid content-start gap-5 lg:col-span-7">
          <TasksTodayCard />
          <Suspense>
            <PlanCard />
          </Suspense>
          <WeeklyActivityCard />
        </div>
        <div className="grid content-start gap-5 lg:col-span-5">
          <ScheduleCard />
          <HabitsTodayCard />
          <RadarCard />
          <GoalsCard />
        </div>
      </div>
    </div>
  );
}
