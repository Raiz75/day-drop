/* AI-CONTEXT-NOTE:{"R":"s16 habits step: active habits with 'day N/100' badge, toggle ids into answers.habitsChecked, empty state links /habits.","IDD":[{"?":"N = clamp(diffDays(today, startedOn) + 1, 1, 100) - calendar-based day-100"},{"?":"Reads active habits itself via useActiveHabits (live query)"},{"?":"Empty array is a valid answer (validation allows [])"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches habits here"}],"AB":[{"?":"lib/hooks/useHabits.ts useActiveHabits"},{"?":"lib/format.ts diffDays/todayStr"},{"?":"components/ui/checkbox.tsx + badge.tsx"},{"?":"next/link"}],"E":[{"!!":"npm run build"}]} */
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { DayEntry } from "@/lib/db/schema";
import { diffDays, todayStr } from "@/lib/format";
import { useActiveHabits } from "@/lib/hooks/useHabits";

export function HabitsStep({
  value,
  onChange,
}: {
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const habits = useActiveHabits();
  const checked: string[] = Array.isArray(value) ? value : [];
  const today = todayStr();

  const dayOf = (startedOn: string) =>
    Math.min(Math.max(diffDays(today, startedOn) + 1, 1), 100);

  const toggle = (id: string) => {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    onChange({ habitsChecked: next });
  };

  if (habits === undefined) {
    return <p className="py-8 text-center text-sm text-muted-foreground">loading habits...</p>;
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-sm text-muted-foreground">no active habits yet.</p>
        <Button render={<Link href="/habits" />}>manage habits</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {habits.map((h) => (
        <label
          key={h.id}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox checked={checked.includes(h.id)} onCheckedChange={() => toggle(h.id)} />
          <span className="flex-1 truncate text-base">{h.name}</span>
          <Badge variant="secondary">day {dayOf(h.startedOn)}/100</Badge>
        </label>
      ))}
    </div>
  );
}
