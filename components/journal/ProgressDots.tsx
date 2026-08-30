/* AI-CONTEXT-NOTE:{"R":"Category-aware progress dots with milestone dividers and category labels.","IDD":[{"?":"Dots are grouped by category; dividers appear between groups; current category gets a highlight ring."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts CATEGORIES, STEPS"],"E":["npm run build","npm test"]} */
"use client";

import { CATEGORIES, STEPS } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  currentStepIndex: number;
}

export function ProgressDots({ currentStepIndex }: ProgressDotsProps) {
  const currentStep = STEPS[currentStepIndex];
  const currentCategory = currentStep
    ? CATEGORIES.find((c) => c.stepIds.includes(currentStep.id))
    : undefined;

  // Build groups: array of { category, startIdx, endIdx, dotCount }
  const groups = CATEGORIES.map((cat) => {
    const startIdx = STEPS.findIndex((s) => cat.stepIds.includes(s.id));
    // findLastIndex equivalent using reverse findIndex
    const endIdx = STEPS.length - 1 - [...STEPS].reverse().findIndex((s) => cat.stepIds.includes(s.id));
    return {
      category: cat,
      startIdx,
      endIdx,
      dotCount: endIdx - startIdx + 1,
    };
  });

  return (
    <div className="flex flex-col gap-1.5" aria-label={`step ${currentStepIndex + 1} of ${STEPS.length}`}>
      <div className="flex items-center gap-1">
        {groups.map((group, gi) => {
          const isCompleted = currentStepIndex > group.endIdx;
          const isCurrent = group.category.id === currentCategory?.id;
          return (
            <div key={group.category.id} className="flex items-center gap-1">
              {gi > 0 && (
                <span className={cn(
                  "mx-0.5 text-xs transition-colors",
                  isCompleted || isCurrent ? "text-muted-foreground/60" : "text-muted/40",
                )}>
                  |
                </span>
              )}
              {Array.from({ length: group.dotCount }, (_, di) => {
                const stepIdx = group.startIdx + di;
                const isFilled = stepIdx < currentStepIndex;
                const isActive = stepIdx === currentStepIndex;
                return (
                  <span
                    key={stepIdx}
                    className={cn(
                      "size-2 rounded-full transition-all",
                      isFilled && "bg-primary/70",
                      isActive && "bg-primary ring-2 ring-primary/30",
                      !isFilled && !isActive && "bg-muted",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        {groups.map((group) => {
          const isCompleted = currentStepIndex > group.endIdx;
          const isCurrent = group.category.id === currentCategory?.id;
          if (!isCompleted && !isCurrent) return <span key={group.category.id} className="flex-1" />;
          return (
            <span
              key={group.category.id}
              className={cn(
                "text-[10px] leading-none transition-colors",
                isCompleted ? "text-muted-foreground/60" : "text-muted-foreground font-medium",
              )}
              style={{ minWidth: `${group.dotCount * 12 + 8}px` }}
            >
              {group.category.name.split(" ")[0]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
