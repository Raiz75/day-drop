/* AI-CONTEXT-NOTE:{"R":"s13 daily-plan checklist body + carry-over gate: Next with unfinished tasks fires a sonner warning and an AlertDialog offering to move them to tomorrow.","IDD":[{"?":"Rows derive from answers.todayTasks (seeded by JournalWizard from buildTodayChecklist); toggles write the array"},{"?":"Wizard's footer Next calls gateRef.current.attempt(proceed) - this component owns toast+dialog UI; proceed() advances"},{"?":"Yes -> onCarried(unchecked) stashes texts in wizard-local state consumed by s14 seeding; No -> drops them. Either way todayTasks keeps true done flags"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches tasks here"}],"AB":[{"?":"lib/carryover.ts uncheckedTexts"},{"?":"components/ui/alert-dialog.tsx"},{"?":"components/ui/checkbox.tsx"},{"?":"sonner toast"}],"E":[{"!!":"npm run build"},{"?":"Manual: unchecked tasks must block plain Next until dialog resolves"}]} */
"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { uncheckedTexts, type ChecklistItem } from "@/lib/carryover";
import type { DayEntry } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export interface TasksGate {
  attempt(proceed: () => void): void;
}

export function TasksChecklistStep({
  tasks,
  value,
  onCarried,
  gateRef,
  onChange,
}: {
  tasks: ChecklistItem[];
  value: unknown;
  onCarried?(texts: string[]): void;
  gateRef?: { current: TasksGate | null };
  onChange(patch: Partial<DayEntry>): void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const proceedRef = useRef<() => void>(() => {});
  const items: ChecklistItem[] = Array.isArray(value) ? value : tasks;

  useImperativeHandle(
    gateRef,
    () => ({
      attempt(proceed: () => void) {
        const unchecked = uncheckedTexts(items);
        if (unchecked.length === 0) {
          proceed();
          return;
        }
        proceedRef.current = proceed;
        setPending(unchecked);
        setConfirmOpen(true);
        toast.warning(
          `You have ${unchecked.length} unfinished ${unchecked.length === 1 ? "task" : "tasks"}`,
        );
      },
    }),
    [items],
  );

  const toggle = (index: number) => {
    onChange({
      todayTasks: items.map((t, i) => (i === index ? { ...t, done: !t.done } : t)),
    });
  };

  const resolve = (carry: boolean) => {
    if (carry) onCarried?.(pending);
    setConfirmOpen(false);
    proceedRef.current();
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          nothing was planned for today - enjoy the free day!
        </p>
      )}
      {items.map((t, i) => (
        <label
          key={`${t.text}-${i}`}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox checked={t.done} onCheckedChange={() => toggle(i)} />
          <span className={cn("text-base", t.done && "text-muted-foreground line-through")}>
            {t.text}
          </span>
        </label>
      ))}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move {pending.length} unfinished task{pending.length === 1 ? "" : "s"} to tomorrow?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will be waiting on tomorrow&apos;s plan. If not, they are dropped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolve(false)}>no, drop them</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolve(true)}>yes, move them</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
