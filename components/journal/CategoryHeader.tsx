/* AI-CONTEXT-NOTE:{"R":"DEPRECATED - previously rendered category section header in journal wizard. Replaced by CategoryBanner. Keep for potential future use or remove.","IDD":[],"A":[],"AB":["lib/journal/steps.ts"],"E":["npm run build"]} */
"use client";

import { CATEGORIES, type StepId } from "@/lib/journal/steps";

interface CategoryHeaderProps {
  stepId: StepId;
}

export function CategoryHeader({ stepId }: CategoryHeaderProps) {
  const category = CATEGORIES.find((c) => c.stepIds.includes(stepId));
  if (!category) return null;
  return (
    <div className="py-4 text-center">
      <h2 className="text-lg font-semibold text-muted-foreground">{category.name}</h2>
    </div>
  );
}
