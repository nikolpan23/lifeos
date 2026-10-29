import { cn } from "@/lib/utils";
import type { Category, CategoryColor } from "@/lib/domain/types";

export const CATEGORY_STYLES: Record<CategoryColor, { dot: string; soft: string; text: string; tone: CategoryColor | "lavender"; chart: string; label: string }> = {
  lavender: { dot: "bg-[#c26a45]", soft: "bg-lavender", text: "text-primary-strong", tone: "lavender", chart: "#b35d3a", label: "Clay" },
  blue: { dot: "bg-[#86a8bb]", soft: "bg-soft-blue", text: "text-ink-blue", tone: "blue", chart: "#4f7f99", label: "Blue" },
  green: { dot: "bg-[#8fae7a]", soft: "bg-soft-green", text: "text-ink-green", tone: "green", chart: "#5e8a4a", label: "Green" },
  peach: { dot: "bg-[#e3a575]", soft: "bg-soft-peach", text: "text-ink-peach", tone: "peach", chart: "#c7743f", label: "Peach" },
  rose: { dot: "bg-[#d99a94]", soft: "bg-soft-rose", text: "text-ink-rose", tone: "rose", chart: "#b5564d", label: "Rose" },
  yellow: { dot: "bg-[#dcb85c]", soft: "bg-soft-yellow", text: "text-ink-yellow", tone: "yellow", chart: "#b8901f", label: "Yellow" },
};

export function categoryStyle(category: Pick<Category, "color"> | null | undefined) {
  return CATEGORY_STYLES[category?.color ?? "lavender"];
}

export function CategoryDot({ category, className }: { category: Pick<Category, "color"> | null | undefined; className?: string }) {
  if (!category) return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full bg-[#d8ccb6]", className)} />;
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", categoryStyle(category).dot, className)} />;
}

export function CategoryPill({ category }: { category: Category | null | undefined }) {
  if (!category) return null;
  const s = categoryStyle(category);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", s.soft, s.text)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {category.name}
    </span>
  );
}
