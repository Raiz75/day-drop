/* AI-CONTEXT-NOTE:{"R":"Wizard step: task list carried over from yesterday; user ticks off completed tasks.","IDD":[{"?":"Requires BOTH `value` (tasksForToday string[]) and `checked` (tasksChecked string[])."},{"?":"StepRenderer must pass checked prop; see Task 8 integration."}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches here"}],"AB":[{"?":"components/ui/checkbox.tsx"},{"?":"lib/db/schema.ts DayEntry"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { DayEntry } from "@/lib/db/schema";

export function TaskForTodayStep({
  value,
  checked,
  onChange,
}: {
  value: unknown;
  checked: string[];
  onChange(patch: Partial<DayEntry>): void;
}) {
  const tasks: string[] = Array.isArray(value) ? value : [];

  const toggle = (task: string) => {
    const next = checked.includes(task)
      ? checked.filter((t) => t !== task)
      : [...checked, task];
    onChange({ tasksChecked: next });
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">no tasks carried over — enjoy a free day!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <label
          key={task}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox checked={checked.includes(task)} onCheckedChange={() => toggle(task)} />
          <span className="flex-1 text-base">{task}</span>
        </label>
      ))}
    </div>
  );
}