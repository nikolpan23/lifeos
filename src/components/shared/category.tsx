import { cn } from "@/lib/utils";
import type { Category, CategoryColor } from "@/lib/domain/types";

export const CATEGORY_STYLES: Record<CategoryColor, { dot: string; soft: string; text: string; tone: CategoryColor | "lavender"; chart: string; label: string }> = {
  lavender: { dot: "bg-[#8b82e8]", soft: "bg-lavender", text: "text-primary-strong", tone: "lavender", chart: "#7b6fe0", label: "Lavender" },
  blue: { dot: "bg-[#6aa5ec]", soft: "bg-soft-blue", text: "text-ink-blue", tone: "blue", chart: "#3a86d4", label: "Blue" },
  green: { dot: "bg-[#5fbf8a]", soft: "bg-soft-green", text: "text-ink-green", tone: "green", chart: "#1f9e86", label: "Green" },
  peach: { dot: "bg-[#f3a36b]", soft: "bg-soft-peach", text: "text-ink-peach", tone: "peach", chart: "#e8763f", label: "Peach" },
  rose: { dot: "bg-[#e88aa0]", soft: "bg-soft-rose", text: "text-ink-rose", tone: "rose", chart: "#d9587f", label: "Rose" },
  yellow: { dot: "bg-[#e9c15a]", soft: "bg-soft-yellow", text: "text-ink-yellow", tone: "yellow", chart: "#d69a12", label: "Yellow" },
};

export function categoryStyle(category: Pick<Category, "color"> | null | undefined) {
  return CATEGORY_STYLES[category?.color ?? "lavender"];
}

export function CategoryDot({ category, className }: { category: Pick<Category, "color"> | null | undefined; className?: string }) {
  if (!category) return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full bg-[#d4d8e3]", className)} />;
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
