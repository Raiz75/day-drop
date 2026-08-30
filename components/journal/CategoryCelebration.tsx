/* AI-CONTEXT-NOTE:{"R":"Fires canvas-confetti burst + sonner toast when a category group is completed.","IDD":[{"?":"fireCategoryCelebration is a plain function, not a component — called from handleNext in JournalWizard."},{"?":"Confetti colors derived from category.color via COLOR_MAP."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts CategoryDef"],"E":["npm run build","Manual smoke: advance past last step of a category"]} */
"use client";

import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { CategoryDef } from "@/lib/journal/steps";

const CONFETTI_COLORS: Record<string, string[]> = {
  emerald: ["#34d399", "#10b981", "#059669"],
  sky:     ["#38bdf8", "#0ea5e9", "#0284c7"],
  violet:  ["#a78bfa", "#8b5cf6", "#7c3aed"],
  amber:   ["#fbbf24", "#f59e0b", "#d97706"],
};

export function fireCategoryCelebration(category: CategoryDef): void {
  const colors = CONFETTI_COLORS[category.color] ?? CONFETTI_COLORS.emerald;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.3 },
    colors,
    disableForReducedMotion: true,
  });

  toast.success(`${category.name} — Done!`, {
    description: "Great job completing this section",
  });
}
