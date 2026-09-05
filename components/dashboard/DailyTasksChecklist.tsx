/* AI-CONTEXT-NOTE:{"R":"Renders today's planned tasks as a toggle-able checklist on the dashboard.","IDD":[{"?":"Pure presentational: receives tasks/checked/onToggle props, no hooks or DB access."},{"?":"Empty state shown when tasks array is empty."},{"?":"disabled prop disables checkboxes (used when no entry exists yet — tasks carried over from yesterday)."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx"}],"AB":[{"?":"components/ui/checkbox.tsx (shadcn/base-ui)"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface DailyTasksChecklistProps {
  tasks: string[];
  checked: string[];
  onToggle(task: string): void;
  disabled?: boolean;
}

export function DailyTasksChecklist({ tasks, checked, onToggle, disabled }: DailyTasksChecklistProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-6 text-center">
        <p className="text-sm text-muted-foreground">no tasks planned — enjoy a free day!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <label
          key={task}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox
            checked={checked.includes(task)}
            onCheckedChange={() => onToggle(task)}
            disabled={disabled}
          />
          <span className="flex-1 text-base">{task}</span>
        </label>
      ))}
    </div>
  );
}
