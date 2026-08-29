/* AI-CONTEXT-NOTE:{"R":"Single-choice step body for radio + tier-radio steps: large tappable option rows.","IDD":[{"?":"tier-radio writes the numeric option INDEX into the *Tier field; machine translates index->option id for validation"},{"?":"Selected row style bg-primary text-primary-foreground per contract"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches radio/tier-radio here"}],"AB":[{"?":"lib/journal/steps.ts StepDef/StepOption"},{"?":"lib/utils cn"}],"E":[{"!!":"npm run build"}]} */
"use client";

import type { DayEntry } from "@/lib/db/schema";
import type { StepDef, StepId } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

const TIER_FIELD: Partial<Record<StepId, keyof DayEntry>> = {
  sleepDuration: "sleepDuration",
  hydration: "hydration",
  timeOutdoor: "timeOutdoor",
  deepWorkHours: "deepWorkHours",
};

export function RadioStep({
  step,
  value,
  onChange,
}: {
  step: StepDef;
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const tierField = step.type === "tier-radio" ? TIER_FIELD[step.id] : undefined;
  const selectedIndex = typeof value === "number" ? value : -1;

  const isBooleanField =
    step.options?.length === 2 &&
    step.options.some((o) => o.id === "yes") &&
    step.options.some((o) => o.id === "no");

  const isSelected = (optionId: string, index: number) => {
    if (tierField) return selectedIndex === index;
    if (isBooleanField) return value === (optionId === "yes");
    return value === optionId;
  };

  const choose = (optionId: string, index: number) => {
    if (isBooleanField) {
      onChange({ [step.id]: optionId === "yes" } as Partial<DayEntry>);
    } else if (tierField) {
      onChange({ [tierField]: index } as Partial<DayEntry>);
    } else {
      onChange({ [step.id]: optionId } as Partial<DayEntry>);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {step.options?.map((option, i) => (
        <button
          key={option.id}
          type="button"
          onClick={() => choose(option.id, i)}
          className={cn(
            "w-full rounded-2xl border px-4 py-4 text-left text-base transition-colors",
            isSelected(option.id, i)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-input/30 hover:bg-input/50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
