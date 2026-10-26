"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Radar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InsightCard } from "@/components/radar/insight-card";
import { useHref } from "@/components/layout/space-context";
import { useLife, useNow, useToday } from "@/lib/data/store";
import { runRadar } from "@/lib/radar/rules";

export function useInsights() {
  const data = useLife((d) => d);
  const today = useToday();
  const now = useNow(5 * 60_000);
  return useMemo(() => runRadar({ data, today, now }), [data, today, now]);
}

export function RadarCard() {
  const insights = useInsights();
  const href = useHref();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Life Radar</CardTitle>
          <CardDescription>{insights.length ? `${insights.length} thing${insights.length === 1 ? "" : "s"} worth a look` : "Connections across your plans"}</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href("radar")}>
            See all <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {insights.length === 0 ? (
          <EmptyState icon={Radar} title="All clear" description="No clashes, crunches or slipping deadlines spotted in what you've entered." tone="green" className="py-5" />
        ) : (
          insights.slice(0, 2).map((i) => <InsightCard key={i.key} insight={i} compact />)
        )}
      </CardContent>
    </Card>
  );
}
