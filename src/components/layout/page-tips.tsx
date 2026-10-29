"use client";

import { usePathname } from "next/navigation";
import { PageTip } from "@/components/shared/page-tip";
import { activeNavItem } from "./nav";
import { useSpace } from "./space-context";

export function PageTips() {
  const space = useSpace();
  const item = activeNavItem(usePathname(), space);
  return <PageTip key={item.slug} item={item} />;
}
