/* AI-CONTEXT-NOTE:{"R":"Sticky category banner showing icon + name with colored background, animates on category switch.","IDD":[{"?":"Uses dynamic icon import from tabler-icons-react based on CategoryDef.icon string."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts getCategoryForStep, CATEGORIES"],"E":["npm run build"]} */
"use client";

import {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
} from "@tabler/icons-react";
import { getCategoryForStep, STEPS } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  sky:     { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",     border: "border-sky-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400",  border: "border-violet-500/20" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/20" },
};

interface CategoryBannerProps {
  stepIndex: number;
}

export function CategoryBanner({ stepIndex }: CategoryBannerProps) {
  const category = getCategoryForStep(stepIndex);
  if (!category) return null;

  const IconComponent = ICON_MAP[category.icon];
  const colors = COLOR_CLASSES[category.color] ?? COLOR_CLASSES.emerald;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors duration-300",
        colors.bg,
        colors.border,
      )}
      aria-live="polite"
    >
      {IconComponent && (
        <IconComponent className={cn("size-5 shrink-0", colors.text)} />
      )}
      <span className={cn("text-sm font-semibold tracking-wide", colors.text)}>
        {category.name}
      </span>
    </div>
  );
}
