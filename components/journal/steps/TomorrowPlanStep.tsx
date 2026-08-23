/* AI-CONTEXT-NOTE:{"R":"s14 tomorrow-plan list editor: input+add button, delete per row, writes the string[] on every change.","IDD":[{"?":"Local list seeded once from existing answers.tomorrowPlan + carried texts (mergeCarried dedupes case-insensitively)"},{"?":"JournalWizard already merges carried into answers.tomorrowPlan on Yes (handleCarried), so seed and answers agree"},{"?":"Validation needs >= 1 task to advance"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches tomorrow here"}],"AB":[{"?":"lib/carryover.ts mergeCarried"},{"?":"components/ui/input.tsx"},{"?":"components/ui/button.tsx"}],"E":[{"!!":"npm run build"},{"?":"Manual: carried task from s13 must appear as a row here"}]} */
"use client";

import { useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergeCarried } from "@/lib/carryover";
import type { DayEntry } from "@/lib/db/schema";

export function TomorrowPlanStep({
  value,
  carried,
  onChange,
}: {
  value: unknown;
  carried?: string[];
  onChange(patch: Partial<DayEntry>): void;
}) {
  const [items, setItems] = useState<string[]>(() =>
    mergeCarried(Array.isArray(value) ? value : undefined, carried ?? []),
  );
  const [draft, setDraft] = useState("");

  const write = (next: string[]) => {
    setItems(next);
    onChange({ tomorrowPlan: next });
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    write([...items, text]);
    setDraft("");
  };

  const remove = (index: number) => {
    write(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-2 rounded-2xl border border-border bg-input/30 px-4 py-3"
          >
            <span className="flex-1 break-words text-base">{item}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`remove ${item}`}
              onClick={() => remove(i)}
            >
              <IconX className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          placeholder="add a task for tomorrow..."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button size="icon" aria-label="add task" onClick={add} disabled={!draft.trim()}>
          <IconPlus className="size-5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {items.length} task{items.length === 1 ? "" : "s"} · add at least 1 to continue
      </p>
    </div>
  );
}
