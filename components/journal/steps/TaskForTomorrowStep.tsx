/* AI-CONTEXT-NOTE:{"R":"Wizard step: add/remove tasks for tomorrow (persisted in tasksForTomorrow[]).","IDD":[{"?":"List stored as string[] in DayEntry.tasksForTomorrow."},{"?":"Deduplicates by trimmed text."}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches here"}],"AB":[{"?":"components/ui/input.tsx + button.tsx"},{"?":"@tabler/icons-react IconPlus IconTrash"},{"?":"lib/db/schema.ts DayEntry"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DayEntry } from "@/lib/db/schema";

export function TaskForTomorrowStep({
  value,
  onChange,
}: {
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const tasks: string[] = Array.isArray(value) ? value : [];
  const [input, setInput] = useState("");

  const addTask = () => {
    const trimmed = input.trim();
    if (trimmed && !tasks.includes(trimmed)) {
      onChange({ tasksForTomorrow: [...tasks, trimmed] });
      setInput("");
    }
  };

  const removeTask = (task: string) => {
    onChange({ tasksForTomorrow: tasks.filter((t) => t !== task) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="add a task..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTask();
            }
          }}
        />
        <Button size="icon" variant="secondary" onClick={addTask} disabled={!input.trim()}>
          <IconPlus className="size-4" />
        </Button>
      </div>
      {tasks.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">add at least one task for tomorrow</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task}
              className="flex items-center gap-2 rounded-2xl border border-border bg-input/30 px-4 py-3"
            >
              <span className="flex-1 truncate text-base">{task}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeTask(task)}
              >
                <IconTrash className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}