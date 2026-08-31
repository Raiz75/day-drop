# Habits and Plans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5th journal category "Habits and plans" with task tracking, monthly bucket list, and bonus scoring on top of the existing 40pt category base.

**Architecture:** New fields on `DayEntry`, new step types in the wizard, bucket list stored in `meta` table, home page checklist sections with real-time sync. Bonus scoring (tasks 2pts, bucket list 10pts, habits 2pts) layered on existing 4-metric system.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Dexie 4, zod, shadcn/ui, Tabler icons, Vitest.

## Global Constraints

- Strict read/write split: only `lib/db/repository.ts` writes to IndexedDB
- Hooks read exclusively via `useLiveQuery`, never write
- Dates persist as local `'YYYY-MM-DD'` strings
- Option ids are stable slugs; labels change freely
- Every code file carries `AI-CONTEXT-NOTE` JSON header on line 1
- `npm run build && npm test` gate before claiming done
- Dexie migrations are versioned and additive only (wipe entries table for v4)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `lib/db/schema.ts` | Modify | Add new DayEntry fields, bucket list type, bump to v4 |
| `lib/journal/steps.ts` | Modify | Add 5th category, new StepIds, 4 new step defs, remove `tasksFinished` |
| `lib/db/repository.ts` | Modify | Add bucket list meta helpers, update submitEntry |
| `lib/scoring.ts` | Modify | Add bonus scoring functions, update scoreEntry return |
| `lib/validations/journal.ts` | Modify | Add new step type validations, update dayEntrySchema |
| `lib/exportImport.ts` | Modify | Bump to v4, update entry schema |
| `lib/format.ts` | Modify | Add `dayOfMonth` helper |
| `components/journal/steps/TaskForTodayStep.tsx` | Create | Checklist of carried-over tasks |
| `components/journal/steps/TaskForTomorrowStep.tsx` | Create | List editor for tomorrow's tasks |
| `components/journal/steps/BucketListStep.tsx` | Create | Monthly bucket list — edit or read-only checklist |
| `components/journal/StepRenderer.tsx` | Modify | Dispatch new step types |
| `components/journal/JournalWizard.tsx` | Modify | Handle new fields in entry construction |
| `components/journal/CategoryBanner.tsx` | Modify | Add icon/color for 5th category |
| `components/dashboard/DailyTasksChecklist.tsx` | Create | Home page task checklist |
| `components/dashboard/MonthBucketList.tsx` | Create | Home page bucket list checklist |
| `components/dashboard/BucketListTransferDialog.tsx` | Create | Month-end transfer dialog |
| `components/dashboard/DashboardView.tsx` | Modify | Add new checklist sections |
| `components/dashboard/DayDetailSheet.tsx` | Modify | Show tasks/bucket list in entry detail |
| `lib/hooks/useBucketList.ts` | Create | Read hook for bucket list meta |
| `tests/scoring.test.ts` | Modify | Update for bonus scoring |
| `tests/journal-steps.test.ts` | Modify | Update for new steps |
| `tests/schema.test.ts` | Modify | Update for v4 |

---

### Task 1: Schema — Add new DayEntry fields and bucket list type

**Files:**
- Modify: `lib/db/schema.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `BucketListItem` type, updated `DayEntry` with 5 new fields, `DayDropDB` version(4)

- [ ] **Step1: Add new types and fields to schema.ts**

Add after the `ChecklistItem` interface:

```ts
export interface BucketListItem {
  text: string;
  done: boolean;
  doneAt: string | null;
}

export interface BucketListMonth {
  items: BucketListItem[];
}
```

Update `DayEntry` — remove `tasksFinished`, add new fields before `habitsChecked`:

```ts
// Work & Productivity
learnedToday: string;
// tasksFinished: string;  ← REMOVE THIS LINE
deepWorkHours: number;
workFeeling: string;
// Habits and plans
tasksForToday: string[];
tasksChecked: string[];
tasksForTomorrow: string[];
bucketListChecked: string[];
// Habits
habitsChecked: string[];
```

Add version(4) migration in `DayDropDB` constructor after version(3):

```ts
this.version(4).stores({
  entries: "date",
  habits: "id, archivedAt, startedOn",
  meta: "key",
});
```

- [ ] **Step 2: Update schema tests**

In `tests/schema.test.ts`, update the `base` DayEntry fixture to include the new fields (empty arrays for tasks/bucketList) and remove `tasksFinished`.

- [ ] **Step 3: Run tests to verify**

Run: `npm test tests/schema.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts tests/schema.test.ts
git commit -m "feat: add tasks/bucket list fields to DayEntry, bump to v4"
```

---

### Task 2: Format helper — Add dayOfMonth

**Files:**
- Modify: `lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Produces: `dayOfMonth(s: string): number` — returns 1-31 day of month

- [ ] **Step 1: Add dayOfMonth function**

In `lib/format.ts`, add after `diffDays`:

```ts
export function dayOfMonth(s: string): number {
  return fromStr(s).getDate();
}
```

- [ ] **Step 2: Add test for dayOfMonth**

In `tests/format.test.ts`, add:

```ts
it("dayOfMonth returns day of month", () => {
  expect(dayOfMonth("2026-08-01")).toBe(1);
  expect(dayOfMonth("2026-08-15")).toBe(15);
  expect(dayOfMonth("2026-12-31")).toBe(31);
});
```

- [ ] **Step 3: Run tests**

Run: `npm test tests/format.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/format.ts tests/format.test.ts
git commit -m "feat: add dayOfMonth helper"
```

---

### Task 3: Steps — Add 5th category and new step definitions

**Files:**
- Modify: `lib/journal/steps.ts`
- Test: `tests/journal-steps.test.ts`

**Interfaces:**
- Produces: Updated `StepId` union, `CATEGORIES` with 5 entries, `STEPS` with new steps

- [ ] **Step 1: Update StepId and add new steps**

In `lib/journal/steps.ts`:

1. Update `StepId` type — remove `"tasksFinished"`, add `"taskForToday"`, `"taskForTomorrow"`, `"monthBucketList"`:

```ts
export type StepId =
  | "sleepDuration" | "exercise" | "nutrition" | "hydration" | "timeOutdoor" | "physicalFeeling"
  | "moodCheck" | "reading" | "highlights" | "couldHaveBeenBetter" | "storyOfTheDay"
  | "familyTime" | "conversations" | "kindnessActs" | "connectionStatus"
  | "learnedToday" | "deepWorkHours" | "workFeeling"
  | "taskForToday" | "taskForTomorrow" | "monthBucketList"
  | "habits";
```

2. Update `StepDef` type — add new step types:

```ts
type: "radio" | "checkbox" | "tier-radio" | "text" | "habits" | "tasks-checklist" | "tasks-list" | "bucket-list";
```

3. Add 5th category to `CATEGORIES`:

```ts
{ id: "habits-plans", name: "Habits and plans", stepIds: ["taskForToday", "taskForTomorrow", "monthBucketList", "habits"], color: "rose", icon: "IconCalendarCheck" },
```

4. Remove `tasksFinished` from the productivity category's `stepIds`:

```ts
{ id: "productivity", name: "Work & Productivity", stepIds: ["learnedToday", "deepWorkHours", "workFeeling"], color: "amber", icon: "IconBolt" },
```

5. Remove the `tasksFinished` step definition from `STEPS` array.

6. Add 3 new step definitions before the existing `habits` step:

```ts
{ id: "taskForToday", order: 19, question: "what are your tasks for today?", type: "tasks-checklist" },
{ id: "taskForTomorrow", order: 20, question: "what tasks do you have for tomorrow?", type: "tasks-list" },
{ id: "monthBucketList", order: 21, question: "what's on your bucket list this month?", type: "bucket-list" },
```

7. Update the existing `habits` step order to 22.

- [ ] **Step 2: Update journal-steps tests**

In `tests/journal-steps.test.ts`, update any assertions that reference `tasksFinished` or the old step count (20 → 22). Verify 5 categories exist and steps are ordered correctly.

- [ ] **Step 3: Run tests**

Run: `npm test tests/journal-steps.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/journal/steps.ts tests/journal-steps.test.ts
git commit -m "feat: add Habits and plans category with new step types"
```

---

### Task 4: Repository — Add bucket list meta helpers

**Files:**
- Modify: `lib/db/repository.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Produces: `getBucketList(monthKey)`, `saveBucketList(monthKey, items)`, updated `submitEntry`

- [ ] **Step 1: Add bucket list helper functions**

In `lib/db/repository.ts`, add after `getArchivedHabits`:

```ts
import type { BucketListItem, BucketListMonth } from "@/lib/db/schema";

function bucketListKey(monthKey: string): string {
  return `bucketList:${monthKey}`;
}

export async function getBucketList(monthKey: string): Promise<BucketListItem[]> {
  const row = await db.meta.get(bucketListKey(monthKey));
  const bl = row?.value as BucketListMonth | undefined;
  return bl?.items ?? [];
}

export async function saveBucketList(monthKey: string, items: BucketListItem[]): Promise<void> {
  await putMeta(bucketListKey(monthKey), { items } satisfies BucketListMonth);
}

export async function updateBucketListItem(monthKey: string, itemText: string, done: boolean): Promise<void> {
  const items = await getBucketList(monthKey);
  const updated = items.map((item) =>
    item.text === itemText
      ? { ...item, done, doneAt: done ? new Date().toISOString() : null }
      : item
  );
  await saveBucketList(monthKey, updated);
}
```

Update the `submitEntry` function to also accept `tasksChecked` and `bucketListChecked` in the payload (they're already part of `DayEntry`, so no signature change needed — just ensure they're persisted in the `db.entries.put` call, which they are via the spread).

- [ ] **Step 2: Add repository tests for bucket list**

In `tests/repository.test.ts`, add tests for `getBucketList`, `saveBucketList`, `updateBucketListItem`.

- [ ] **Step 3: Run tests**

Run: `npm test tests/repository.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/db/repository.ts tests/repository.test.ts
git commit -m "feat: add bucket list meta helpers to repository"
```

---

### Task 5: Validation — Add new step type validations

**Files:**
- Modify: `lib/validations/journal.ts`
- Test: `tests/validations-journal.test.ts`

**Interfaces:**
- Consumes: new StepId types from steps.ts
- Produces: updated `validateStep` cases, updated `dayEntrySchema`

- [ ] **Step 1: Add validation cases for new step types**

In `lib/validations/journal.ts`, add cases in `validateStep`:

```ts
case "tasks-checklist": {
  const r = z.array(z.string()).safeParse(value);
  return r.success ? { ok: true } : { ok: false, error: "invalid task list" };
}
case "tasks-list": {
  const r = z.array(z.string().min(1)).safeParse(value);
  if (!r.success || r.data.length === 0) {
    return { ok: false, error: "add at least one task" };
  }
  return { ok: true };
}
case "bucket-list": {
  const r = z.array(z.string()).safeParse(value);
  return r.success ? { ok: true } : { ok: false, error: "invalid bucket list" };
}
```

- [ ] **Step 2: Update dayEntrySchema**

In the `dayEntrySchema` zod object:
- Remove `tasksFinished: z.string().min(20)`
- Add:
```ts
tasksForToday: z.array(z.string()),
tasksChecked: z.array(z.string()),
tasksForTomorrow: z.array(z.string()),
bucketListChecked: z.array(z.string()),
```

- [ ] **Step3: Add validation tests**

In `tests/validations-journal.test.ts`, add tests for the new step types (tasks-checklist, tasks-list, bucket-list) and verify `tasksFinished` is no longer in the schema.

- [ ] **Step 4: Run tests**

Run: `npm test tests/validations-journal.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/validations/journal.ts tests/validations-journal.test.ts
git commit -m "feat: add validation for tasks-checklist, tasks-list, bucket-list steps"
```

---

### Task 6: Scoring — Add bonus scoring functions

**Files:**
- Modify: `lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `DayEntry` with new fields
- Produces: `tasksScore(e)`, `bucketListScore(e)`, `habitsScore(e)`, updated `scoreEntry` return type

- [ ] **Step 1: Add bonus scoring functions**

In `lib/scoring.ts`, add after `productivityScore`:

```ts
export function tasksScore(e: DayEntry): number {
  return e.tasksChecked.length * 2;
}

export function bucketListScore(e: DayEntry): number {
  return e.bucketListChecked.length * 10;
}

export function habitsBonusScore(e: DayEntry): number {
  return e.habitsChecked.length * 2;
}
```

Update the `scoreEntry` return type to include bonus fields:

```ts
export function scoreEntry(
  e: DayEntry,
): Record<MetricKey, number> & { tasks: number; bucketList: number; habitsBonus: number; total: number } {
  const physical = physicalScore(e);
  const mental = mentalScore(e);
  const social = socialScore(e);
  const productivity = productivityScore(e);
  const tasks = tasksScore(e);
  const bucketList = bucketListScore(e);
  const habitsBonus = habitsBonusScore(e);
  const total = physical + mental + social + productivity + tasks + bucketList + habitsBonus;
  return { physical, mental, social, productivity, tasks, bucketList, habitsBonus, total };
}
```

Update `productivityScore` — remove the `tasksFinished` text bonus:

```ts
function productivityScore(e: DayEntry): number {
  const deepWorkScores = [1, 4, 7, 9, 10];
  const deepWork = deepWorkScores[e.deepWorkHours] ?? 1;
  const workScores: Record<string, number> = { focused: 10, productive: 8, scattered: 4, drained: 2 };
  const work = workScores[e.workFeeling] ?? 1;
  const learnedBonus = e.learnedToday && e.learnedToday.length > 0 ? 10 : 0;
  const avg = (deepWork + work + learnedBonus) / 3;
  return Math.min(10, Math.max(1, Math.round(avg)));
}
```

- [ ] **Step 2: Update scoring tests**

In `tests/scoring.test.ts`:
- Remove `tasksFinished` from the `base` fixture
- Add new fields: `tasksForToday: [], tasksChecked: [], tasksForTomorrow: [], bucketListChecked: []`
- Update expected scores (social may change from 9 to 10 with the base fixture)
- Add tests for `tasksScore`, `bucketListScore`, `habitsBonusScore`
- Update `totalPoints` and `pointsBalance` tests

- [ ] **Step 3: Run tests**

Run: `npm test tests/scoring.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/scoring.ts tests/scoring.test.ts
git commit -m "feat: add bonus scoring for tasks, bucket list, habits"
```

---

### Task 7: Wizard components — Create new step UIs

**Files:**
- Create: `components/journal/steps/TaskForTodayStep.tsx`
- Create: `components/journal/steps/TaskForTomorrowStep.tsx`
- Create: `components/journal/steps/BucketListStep.tsx`

**Interfaces:**
- Consumes: `DayEntry` partial answers, `onChange` callback, bucket list from repository
- Produces: Three new step components following HabitsStep patterns

- [ ] **Step 1: Create TaskForTodayStep**

Create `components/journal/steps/TaskForTodayStep.tsx`:

```tsx
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
          <span className="flex-1 truncate text-base">{task}</span>
        </label>
      ))}
    </div>
  );
}
```

Note: This step needs a `checked` prop (the `tasksChecked` array from answers) in addition to `value` (the `tasksForToday` array). The `StepRenderer` will need to pass this — see Task 8 for the integration.

- [ ] **Step 2: Create TaskForTomorrowStep**

Create `components/journal/steps/TaskForTomorrowStep.tsx`:

```tsx
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
```

- [ ] **Step 3: Create BucketListStep**

Create `components/journal/steps/BucketListStep.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { DayEntry } from "@/lib/db/schema";
import type { BucketListItem } from "@/lib/db/schema";
import { getBucketList, saveBucketList } from "@/lib/db/repository";
import { todayStr, monthKeyOf, dayOfMonth } from "@/lib/format";

export function BucketListStep({
  value,
  onChange,
}: {
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const checked: string[] = Array.isArray(value) ? value : [];
  const [items, setItems] = useState<BucketListItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  const today = todayStr();
  const monthKey = monthKeyOf(today);
  const day = dayOfMonth(today);
  const isEditable = day <= 7;

  useEffect(() => {
    let cancelled = false;
    getBucketList(monthKey).then((existing) => {
      if (!cancelled) {
        setItems(existing);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [monthKey]);

  const addItem = async () => {
    const trimmed = input.trim();
    if (trimmed && !items.some((i) => i.text === trimmed)) {
      const updated = [...items, { text: trimmed, done: false, doneAt: null }];
      setItems(updated);
      await saveBucketList(monthKey, updated);
      setInput("");
    }
  };

  const removeItem = async (text: string) => {
    const updated = items.filter((i) => i.text !== text);
    setItems(updated);
    await saveBucketList(monthKey, updated);
  };

  const toggleItem = (text: string) => {
    const isCurrentlyChecked = checked.includes(text);
    const next = isCurrentlyChecked
      ? checked.filter((t) => t !== text)
      : [...checked, text];
    onChange({ bucketListChecked: next });
  };

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">loading bucket list...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isEditable && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="add to bucket list..."
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button size="icon" variant="secondary" onClick={addItem} disabled={!input.trim()}>
            <IconPlus className="size-4" />
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {isEditable ? "add items to your monthly bucket list" : "no bucket list set this month"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3"
            >
              <Checkbox
                checked={checked.includes(item.text)}
                onCheckedChange={() => toggleItem(item.text)}
              />
              <span className="flex-1 truncate text-base">{item.text}</span>
              {isEditable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.text)}
                >
                  <IconTrash className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/journal/steps/TaskForTodayStep.tsx components/journal/steps/TaskForTomorrowStep.tsx components/journal/steps/BucketListStep.tsx
git commit -m "feat: add TaskForToday, TaskForTomorrow, BucketList wizard steps"
```

---

### Task 8: Wizard integration — Wire new steps into StepRenderer and JournalWizard

**Files:**
- Modify: `components/journal/StepRenderer.tsx`
- Modify: `components/journal/JournalWizard.tsx`
- Modify: `components/journal/CategoryBanner.tsx`

**Interfaces:**
- Consumes: new step components from Task 7, new StepIds from Task 3

- [ ] **Step 1: Update StepRenderer to dispatch new types**

In `components/journal/StepRenderer.tsx`, update the interface to pass `answers` (full partial) to step components, and add imports + cases:

```ts
import { TaskForTodayStep } from "./steps/TaskForTodayStep";
import { TaskForTomorrowStep } from "./steps/TaskForTomorrowStep";
import { BucketListStep } from "./steps/BucketListStep";
```

Update `RendererProps` to include `answers`:

```ts
interface RendererProps {
  step: StepDef;
  answers: Partial<DayEntry>;
  answerValue: unknown;
  onChange(patch: Partial<DayEntry>): void;
}
```

Destructure `answers` in the component and pass to new step types:

```ts
case "tasks-checklist":
  return <TaskForTodayStep value={answerValue} checked={answers.tasksChecked ?? []} onChange={onChange} />;
case "tasks-list":
  return <TaskForTomorrowStep value={answerValue} onChange={onChange} />;
case "bucket-list":
  return <BucketListStep value={answerValue} onChange={onChange} />;
```

- [ ] **Step 2: Update JournalWizard entry construction**

In `components/journal/JournalWizard.tsx`, in the `handleFinish` function, update the entry object:
- Remove `tasksFinished: a.tasksFinished ?? ""`
- Add:
```ts
tasksForToday: a.tasksForToday ?? [],
tasksChecked: a.tasksChecked ?? [],
tasksForTomorrow: a.tasksForTomorrow ?? [],
bucketListChecked: a.bucketListChecked ?? [],
```

Also update the draft resume logic to carry over the new fields.

- [ ] **Step 3: Update CategoryBanner for 5th category**

In `components/journal/CategoryBanner.tsx`:
- Import `IconCalendarCheck` from `@tabler/icons-react`
- Add to `ICON_MAP`: `IconCalendarCheck`
- Add to `COLOR_CLASSES`: `rose: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" }`

- [ ] **Step 4: Update machine.ts FIELD_BY_STEP**

In `lib/journal/machine.ts`, update `FIELD_BY_STEP`:
- Remove `tasksFinished: "tasksFinished"`
- Add:
```ts
taskForToday: "tasksForToday",
taskForTomorrow: "tasksForTomorrow",
monthBucketList: "bucketListChecked",
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/journal/StepRenderer.tsx components/journal/JournalWizard.tsx components/journal/CategoryBanner.tsx lib/journal/machine.ts
git commit -m "feat: wire new steps into wizard and category banner"
```

---

### Task 9: Hook — Create useBucketList

**Files:**
- Create: `lib/hooks/useBucketList.ts`

**Interfaces:**
- Produces: `useBucketList(monthKey)` — returns `BucketListItem[] | undefined`

- [ ] **Step 1: Create the hook**

Create `lib/hooks/useBucketList.ts`:

```ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useBucketList(monthKey: string) {
  return useLiveQuery(async () => {
    const row = await db.meta.get(`bucketList:${monthKey}`);
    const bl = row?.value as { items: { text: string; done: boolean; doneAt: string | null }[] } | undefined;
    return bl?.items ?? [];
  }, [monthKey]);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useBucketList.ts
git commit -m "feat: add useBucketList read hook"
```

---

### Task 10: Dashboard — Create DailyTasksChecklist component

**Files:**
- Create: `components/dashboard/DailyTasksChecklist.tsx`
- Modify: `components/dashboard/DashboardView.tsx`

**Interfaces:**
- Consumes: `tasksForToday: string[]`, `tasksChecked: string[]` from today's entry, `onToggle(task: string)` callback

- [ ] **Step 1: Create DailyTasksChecklist**

Create `components/dashboard/DailyTasksChecklist.tsx`:

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface DailyTasksChecklistProps {
  tasks: string[];
  checked: string[];
  onToggle(task: string): void;
}

export function DailyTasksChecklist({ tasks, checked, onToggle }: DailyTasksChecklistProps) {
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
          />
          <span className="flex-1 truncate text-base">{task}</span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add to DashboardView**

In `components/dashboard/DashboardView.tsx`, import and render `DailyTasksChecklist` below `TrendChart`. Read `tasksForToday` and `tasksChecked` from today's entry. Implement `onToggle` that updates the entry via repository.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/DailyTasksChecklist.tsx components/dashboard/DashboardView.tsx
git commit -m "feat: add DailyTasksChecklist to dashboard"
```

---

### Task 11: Dashboard — Create MonthBucketList component

**Files:**
- Create: `components/dashboard/MonthBucketList.tsx`
- Modify: `components/dashboard/DashboardView.tsx`

**Interfaces:**
- Consumes: bucket list items from `useBucketList`, today's `bucketListChecked`, `onToggle(text: string)` callback

- [ ] **Step 1: Create MonthBucketList**

Create `components/dashboard/MonthBucketList.tsx`:

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { useBucketList } from "@/lib/hooks/useBucketList";
import { monthKeyOf, todayStr } from "@/lib/format";

interface MonthBucketListProps {
  checked: string[];
  onToggle(text: string): void;
}

export function MonthBucketList({ checked, onToggle }: MonthBucketListProps) {
  const monthKey = monthKeyOf(todayStr());
  const items = useBucketList(monthKey);

  if (items === undefined) {
    return <p className="py-4 text-center text-sm text-muted-foreground">loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-6 text-center">
        <p className="text-sm text-muted-foreground">no bucket list this month — set one in the journal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label
          key={item.text}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3 transition-colors hover:bg-input/50"
        >
          <Checkbox
            checked={checked.includes(item.text)}
            onCheckedChange={() => onToggle(item.text)}
          />
          <span className="flex-1 truncate text-base">{item.text}</span>
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add to DashboardView**

In `components/dashboard/DashboardView.tsx`, import and render `MonthBucketList` below `DailyTasksChecklist`. Read `bucketListChecked` from today's entry. Implement `onToggle` that updates both the meta bucket list and today's entry.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/MonthBucketList.tsx components/dashboard/DashboardView.tsx
git commit -m "feat: add MonthBucketList to dashboard"
```

---

### Task 12: Wizard — Carry-over warning dialog and task pre-fill

**Files:**
- Modify: `components/journal/JournalWizard.tsx`
- Modify: `lib/journal/machine.ts`

**Interfaces:**
- Consumes: `getLatestEntryBefore` from repository, tasksChecked/tasksForToday from answers
- Produces: Carry-over pre-fill on wizard open, warning dialog on next from taskForToday

- [ ] **Step 1: Add carry-over pre-fill to WizardFlow mount**

In `components/journal/JournalWizard.tsx`, in the `useEffect` that loads draft/todayEntry, add carry-over logic when no draft and no todayEntry:

```ts
// After existing else clause (no draft, no todayEntry):
const latestEntry = await getLatestEntryBefore(today);
const carriedTasks = latestEntry?.tasksForTomorrow ?? [];
dispatch({ type: "answer", patch: { tasksForToday: carriedTasks, tasksChecked: [], tasksForTomorrow: [] } });
```

- [ ] **Step 2: Add warning dialog for unchecked tasks**

In `JournalWizard.tsx`, add state for the warning dialog:

```ts
const [pendingTasks, setPendingTasks] = useState<string[] | null>(null);
```

When the user clicks Next on the `taskForToday` step and there are unchecked tasks, show the dialog instead of advancing:

```ts
// In handleNext, before dispatch({ type: "next" }):
if (step.id === "taskForToday") {
  const allTasks: string[] = Array.isArray(state.answers.tasksForToday) ? state.answers.tasksForToday : [];
  const checked: string[] = Array.isArray(state.answers.tasksChecked) ? state.answers.tasksChecked : [];
  const unchecked = allTasks.filter((t) => !checked.includes(t));
  if (unchecked.length > 0) {
    setPendingTasks(unchecked);
    return;
  }
}
```

Render an AlertDialog for the warning with Yes (pre-fill tasksForTomorrow) / No (drop) options.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/journal/JournalWizard.tsx lib/journal/machine.ts
git commit -m "feat: add task carry-over pre-fill and unchecked warning dialog"
```

---

### Task 13: Dashboard — BucketListTransferDialog for month-end

**Files:**
- Create: `components/dashboard/BucketListTransferDialog.tsx`
- Modify: `components/dashboard/DashboardView.tsx`

**Interfaces:**
- Consumes: previous month's bucket list items (unchecked), current month key
- Produces: Dialog component, transfer logic

- [ ] **Step 1: Create BucketListTransferDialog**

Create `components/dashboard/BucketListTransferDialog.tsx`:

```tsx
"use client";

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
import { getBucketList, saveBucketList } from "@/lib/db/repository";
import { monthKeyOf, addDays, todayStr } from "@/lib/format";

interface BucketListTransferDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  previousMonthKey: string;
  currentMonthKey: string;
  uncheckedItems: string[];
}

export function BucketListTransferDialog({
  open,
  onOpenChange,
  previousMonthKey,
  currentMonthKey,
  uncheckedItems,
}: BucketListTransferDialogProps) {
  const handleTransfer = async () => {
    const existing = await getBucketList(currentMonthKey);
    const existingTexts = new Set(existing.map((i) => i.text));
    const newItems = uncheckedItems
      .filter((text) => !existingTexts.has(text))
      .map((text) => ({ text, done: false, doneAt: null }));
    await saveBucketList(currentMonthKey, [...existing, ...newItems]);
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transfer unchecked items?</AlertDialogTitle>
          <AlertDialogDescription>
            {uncheckedItems.length} item{uncheckedItems.length !== 1 ? "s" : ""} from last month&rsquo;s bucket list {
              uncheckedItems.length !== 1 ? "are" : "is"
            } unchecked. Transfer to this month?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleDismiss}>Start fresh</AlertDialogCancel>
          <AlertDialogAction onClick={handleTransfer}>Transfer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Add transfer check to DashboardView**

In `DashboardView.tsx`, add logic to detect when the user opens the app in a new month and the previous month has unchecked bucket list items. Show the `BucketListTransferDialog` when this condition is met.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/BucketListTransferDialog.tsx components/dashboard/DashboardView.tsx
git commit -m "feat: add BucketListTransferDialog for month-end transfer"
```

---

### Task 14: Dashboard — Add section headers and layout

**Files:**
- Modify: `components/dashboard/DashboardView.tsx`

**Interfaces:**
- Consumes: existing dashboard layout, new checklist components

- [ ] **Step 1: Add section headers**

In `DashboardView.tsx`, wrap the new checklist sections with headers:

```tsx
{/* Tasks of the Day */}
<section className="space-y-3">
  <h3 className="font-heading text-lg font-semibold">Tasks for today</h3>
  <DailyTasksChecklist tasks={todayTasks} checked={todayChecked} onToggle={toggleTask} />
</section>

{/* Month Bucket List */}
<section className="space-y-3">
  <h3 className="font-heading text-lg font-semibold">Bucket list — {monthLabel}</h3>
  <MonthBucketList checked={bucketChecked} onToggle={toggleBucket} />
</section>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DashboardView.tsx
git commit -m "feat: add section headers for tasks and bucket list on dashboard"
```

---

### Task 15: DayDetailSheet — Show tasks and bucket list in entry detail

**Files:**
- Modify: `components/dashboard/DayDetailSheet.tsx`

**Interfaces:**
- Consumes: `DayEntry` with new fields

- [ ] **Step 1: Add tasks and bucket list to DayDetailSheet**

In `components/dashboard/DayDetailSheet.tsx`, add display sections for:
- `tasksForToday` + `tasksChecked` — show tasks with checkmarks
- `bucketListChecked` — show completed bucket list items

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DayDetailSheet.tsx
git commit -m "feat: show tasks and bucket list in DayDetailSheet"
```

---

### Task 16: Export/Import — Bump to v4

**Files:**
- Modify: `lib/exportImport.ts`
- Test: `tests/exportImport.test.ts`

**Interfaces:**
- Consumes: updated DayEntry schema
- Produces: v4 backup format

- [ ] **Step 1: Update exportImport for v4**

In `lib/exportImport.ts`:
- Update `backupSchema` version from `z.literal(3)` to `z.literal(4)`
- Update `entrySchema` — remove `tasksFinished`, add new array fields
- Update `buildBackup` to use `version: 4`
- Import `BucketListItem` type if needed

- [ ] **Step 2: Update exportImport tests**

In `tests/exportImport.test.ts`, update fixtures and assertions for v4.

- [ ] **Step 3: Run tests**

Run: `npm test tests/exportImport.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/exportImport.ts tests/exportImport.test.ts
git commit -m "feat: bump export format to v4 with tasks/bucket list fields"
```

---

### Task 17: Run full test suite and build

**Files:**
- All files

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Fix any issues**

If tests or build fail, fix and re-run.

- [ ] **Step 4: Final commit if needed**

```bash
git add -A
git commit -m "fix: address test/build issues for habits and plans feature"
```
