/* AI-CONTEXT-NOTE:{"R":"Multi-toggle step body for checkbox steps (nutrition) with check-icon rows.","IDD":[{"?":"Writes string[] of option ids to nutrition field"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches checkbox here"}],"AB":[{"?":"lib/journal/steps.ts"},{"?":"components/ui/checkbox.tsx"},{"?":"lib/utils cn"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { DayEntry } from "@/lib/db/schema";
import type { StepDef, StepId } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

export function CheckboxStep({
  step,
  value,
  onChange,
}: {
  step: StepDef;
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const selected: string[] = Array.isArray(value) ? value : [];

  const toggle = (id: string) => {
    let next: string[];
    if (selected.includes(id)) {
      next = selected.filter((x) => x !== id);
    } else {
      next = [...selected, id];
    }
    onChange({ [step.id]: next } as Partial<DayEntry>);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {step.options?.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors",
            selected.includes(option.id)
              ? "border-primary bg-primary/10"
              : "border-border bg-input/30 hover:bg-input/50",
          )}
        >
          <Checkbox checked={selected.includes(option.id)} onCheckedChange={() => toggle(option.id)} />
          <span className="text-base">{option.label}</span>
        </label>
      ))}
    </div>
  );
}