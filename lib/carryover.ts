/* AI-CONTEXT-NOTE:{"R":"Pure task carry-over logic between s13 checklist and s14 tomorrow plan.","IDD":[{"?":"Today's checklist = previous entry's tomorrowPlan, all starting unchecked."},{"?":"Unchecked tasks optionally move to tomorrow; dedupe is case-insensitive."}],"A":[{"?":"components/journal/steps/TasksChecklistStep.tsx"},{"?":"components/journal/steps/TomorrowPlanStep.tsx"},{"?":"lib/db/repository.ts submitEntry builds checklist"}],"AB":[],"E":[{"!!":"tests/carryover.test.ts"}]} */

export interface ChecklistItem { text: string; done: boolean }

export function buildTodayChecklist(prevPlan: string[] | undefined): ChecklistItem[] {
  return (prevPlan ?? []).map((text) => ({ text, done: false }));
}

export function uncheckedTexts(tasks: ChecklistItem[]): string[] {
  return tasks.filter((t) => !t.done).map((t) => t.text);
}

export function mergeCarried(plan: string[] | undefined, carried: string[]): string[] {
  const seen = new Set((plan ?? []).map((p) => p.trim().toLowerCase()));
  const kept = [...(plan ?? [])];
  for (const c of carried) {
    const key = c.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      kept.push(c.trim());
    }
  }
  return kept;
}
