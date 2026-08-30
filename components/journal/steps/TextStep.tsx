/* AI-CONTEXT-NOTE:{"R":"Free-text step body (highlights/couldHaveBeenBetter/storyOfTheDay/learnedToday/tasksFinished) with live char counter.","IDD":[{"?":"Field name == step.id for all text steps"},{"?":"Counter shows trimmed length vs minChars (validation trims too); optional steps show '(optional)' hint"},{"?":"Component emits '' when emptied - wizard normalizes storyOfTheDay '' -> null at submit"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches text here"}],"AB":[{"?":"lib/journal/steps.ts StepDef.minChars/optional"},{"?":"components/ui/textarea.tsx"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Textarea } from "@/components/ui/textarea";
import type { DayEntry } from "@/lib/db/schema";
import type { StepDef } from "@/lib/journal/steps";

export function TextStep({
  step,
  value,
  onChange,
}: {
  step: StepDef;
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const text = typeof value === "string" ? value : "";
  const min = step.minChars ?? 0;

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        rows={6}
        value={text}
        placeholder="type here..."
        onChange={(e) => onChange({ [step.id]: e.target.value } as Partial<DayEntry>)}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{step.optional ? "(optional)" : null}</span>
        <span aria-live="polite">
          {text.trim().length}/{min}
        </span>
      </div>
    </div>
  );
}
