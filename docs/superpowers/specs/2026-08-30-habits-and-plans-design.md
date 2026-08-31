# DayDrop — Habits and Plans Design Spec

**Date:** 2026-08-30
**Status:** Approved design, pending implementation plan

---

## 1. Overview

Add a 5th journal category "Habits and plans" with daily task tracking, monthly bucket list, and habit check-in. Remove the `tasksFinished` text step from Work & Productivity. Introduce bonus scoring: tasks (2 pts/item), bucket list (10 pts/item), habits (2 pts/item) on top of the existing 40pt category base. Add home page checklist sections for tasks and bucket list with real-time sync to journal entries.

---

## 2. Category & Step Changes

### 5 Categories (was 4)

| Category | Display Name | Steps |
|---|---|---|
| Physical | "Physical Well-being" | sleepDuration, exercise, nutrition, hydration, timeOutdoor, physicalFeeling |
| Mental | "Mental & Emotional" | moodCheck, reading, highlights, couldHaveBeenBetter, storyOfTheDay |
| Social | "Relationship Well-being" | familyTime, conversations, kindnessActs, connectionStatus |
| Productivity | "Work & Productivity" | learnedToday, deepWorkHours, workFeeling |
| **Habits** | **"Habits and plans"** | **taskForToday, taskForTomorrow, monthBucketList, habits** |

### Removed Step

- `tasksFinished` — deleted from Work & Productivity category and `DayEntry` schema

### New Steps

| Step ID | Question | Type | Details |
|---|---|---|---|
| `taskForToday` | "what are your tasks for today?" | `tasks-checklist` | Checklist of tasks carried over from yesterday's `taskForTomorrow`. Each item has a checkbox. Scoring: 2 pts per checked item. Empty state if no tasks carried over. |
| `taskForTomorrow` | "what tasks do you have for tomorrow?" | `tasks-list` | List editor: add/remove text items. At least 1 item required. Items become tomorrow's `taskForToday` via carry-over. |
| `monthBucketList` | "what's on your bucket list this month?" | `bucket-list` | Shows current month's bucket list from `meta["bucketList:YYYY-MM"]`. **Days 1-7:** edit mode (add/remove items) + completion checkboxes. **After day7:** read-only checklist only (no add/remove). Scoring: 10 pts per checked item. |
| `habits` | "what habit did you solidify today?" | `habits` | Unchanged — habit checklist with day counters. Scoring: 2 pts per checked habit. |

### Step Order

The new category appears after Work & Productivity (before the existing habits step). Full step order:

1-6: Physical Well-being (unchanged)
7-11: Mental & Emotional (unchanged)
12-15: Relationship Well-being (unchanged)
16-18: Work & Productivity (learnedToday, deepWorkHours, workFeeling — `tasksFinished` removed)
19: taskForToday
20: taskForTomorrow
21: monthBucketList
22: habits

---

## 3. Data Schema

### DayEntry Changes

```ts
interface DayEntry {
  date: string;
  // ... existing Physical, Mental, Social fields unchanged ...

  // Work & Productivity (tasksFinished REMOVED)
  learnedToday: string;
  deepWorkHours: number;
  workFeeling: string;

  // Habits and plans (NEW)
  tasksForToday: string[];        // task texts carried from yesterday
  tasksChecked: string[];         // which tasks were completed today (by text)
  tasksForTomorrow: string[];     // tasks planned for tomorrow
  bucketListChecked: string[];    // bucket list item texts completed today

  // Habits (unchanged)
  habitsChecked: string[];
  activeHabitCount: number;

  // Meta
  createdAt: number;
  updatedAt: number;
}
```

### Meta Table Additions

```ts
// Bucket list: one per month
key: "bucketList:YYYY-MM"
value: {
  items: string[]   // list of bucket list item texts
}
```

### Dexie Migration

- Bump to `version(4)` — wipe `entries` table (fresh start for new schema)
- `habits` and `meta` tables preserved
- Bucket list meta rows (`bucketList:YYYY-MM`) survive migration

---

## 4. Bucket List Lifecycle

### Editing Window (Days 1-7)

- On first journal entry of a new month (or when no `bucketList:YYYY-MM` exists), the wizard step shows an empty list with an input to add items.
- User can add, remove, and reorder items during the first 7 days of the month.
- Items are stored in `meta["bucketList:YYYY-MM"]` as `{ items: string[] }`.

### Locked Period (After Day 7)

- The wizard step switches to read-only checklist mode.
- User can still check items off (completion tracking), but cannot add/remove/reorder.
- The edit UI (add input, delete buttons) is hidden.

### Month-End Transfer

- On the first journal entry of a new month, if the previous month's bucket list has unchecked items, a dialog appears: "N items from last month's bucket list are unchecked. Transfer to this month?"
- Yes → unchecked items are copied to the new month's bucket list.
- No → previous month's bucket list is left as-is, new month starts fresh.

### Scoring

- Each bucket list item checked = 10 pts (one-time per item).
- Checked items are recorded in `bucketListChecked: string[]` on the day's entry.
- The `doneAt` timestamp on the meta bucket list item is set when first checked.

---

## 5. Task Carry-Over Logic

Same pattern as the original MVP:

1. When opening the journal wizard, `taskForToday` is pre-filled with yesterday's `tasksForTomorrow` (from the most recent entry before today).
2. If no prior entry or no `tasksForTomorrow`, the checklist starts empty with a friendly note.
3. User checks off completed tasks during the wizard step.
4. Unchecked tasks trigger a warning: "N tasks unfinished. Move to tomorrow?" → Yes pre-fills `tasksForTomorrow`; No drops them.
5. `tasksForTomorrow` items become tomorrow's `tasksForToday`.

---

## 6. Scoring Changes

### Current System

4 metrics × 10 pts = **40 pts max/day**

### New System

4 metrics (10 each) + task bonus + bucket list bonus + habit bonus = **40 + variable**

| Source | Points |
|---|---|
| Physical score | 1-10 |
| Mental score | 1-10 |
| Social score | 1-10 |
| Productivity score | 1-10 |
| Tasks completed | 2 pts × N items checked |
| Bucket list completed | 10 pts × N items checked |
| Habits completed | 2 pts × N items checked |

**Example:** 5 tasks (10 pts) + 2 bucket list items (20 pts) + 3 habits (6 pts) = 36 bonus → total up to 76 pts.

### Productivity Metric Adjustment

The `productivityScore` function currently uses `tasksFinished` as a text bonus. After removing `tasksFinished`:

- `learnedToday` filled = +1 bonus
- `deepWorkHours` tier score
- `workFeeling` option score
- Formula: `round(avg(deepWork, workFeeling, textBonusScaled))` where textBonusScaled = `learnedToday` filled ? 10 : 0, scaled to average with the other two scores.

---

## 7. Home Page Changes

### New Dashboard Sections

Below the existing TrendChart, add two checklist sections:

#### Tasks of the Day

- Header: "Tasks for today"
- Checklist of `tasksForToday` items from today's entry (or carried over if no entry yet).
- Each item has a checkbox. Checking updates `tasksChecked` in today's entry.
- If no tasks: friendly empty state ("No tasks planned — enjoy a free day!").
- If no entry yet and tasks exist from carry-over: checkboxes store local state, applied on wizard submit.

#### Month Bucket List

- Header: "Bucket list — [Month Year]"
- Checklist of current month's bucket list items from `meta["bucketList:YYYY-MM"]`.
- Each item has a checkbox. Checking updates both `meta` (sets `doneAt`) and today's entry (`bucketListChecked`).
- If no bucket list for current month: empty state ("Set your bucket list in the journal!").
- Edit button (pencil icon) visible only during days 1-7. Opens inline edit mode or dialog for add/remove.

### Sync Behavior

When a task or bucket list item is checked on the home page:

1. **If today's entry exists:** Update `tasksChecked` / `bucketListChecked` array in the entry directly via `repository`.
2. **If no entry yet:** Store the check in local component state. When the user submits today's entry via the wizard, the pre-checked items are merged into the entry.

---

## 8. Component Changes

### Files to Modify

| File | Change |
|---|---|
| `lib/journal/steps.ts` | Add `taskForToday`, `taskForTomorrow`, `monthBucketList` to StepId; add 5th category; reorder steps |
| `lib/db/schema.ts` | Add new DayEntry fields; bump to version(4) |
| `lib/db/repository.ts` | Update `submitEntry` for new fields; add bucket list meta helpers |
| `lib/scoring.ts` | Add `tasksScore`, `bucketListScore`, `habitsScore` bonus functions; update `scoreEntry` return type; update `totalPoints` |
| `lib/validations/journal.ts` | Add zod schemas for new step types; update `dayEntrySchema` |
| `lib/exportImport.ts` | Bump to v4 format; update entry schema |
| `components/journal/JournalWizard.tsx` | Handle new step types in StepRenderer; bucket list editing logic |
| `components/journal/StepRenderer.tsx` | Dispatch new step types to new components |
| `components/dashboard/DashboardView.tsx` | Add TasksChecklist and BucketList sections |
| `components/dashboard/StreakChips.tsx` | No change needed (metrics unchanged) |
| `components/dashboard/TrendChart.tsx` | Update to use new `scoreEntry` return (bonus points shown separately or total) |
| `components/shared/BottomNav.tsx` | No change needed |

### New Components

| File | Purpose |
|---|---|
| `components/journal/TaskForTodayStep.tsx` | Checklist of carried-over tasks with checkboxes |
| `components/journal/TaskForTomorrowStep.tsx` | List editor for tomorrow's tasks (add/remove) |
| `components/journal/BucketListStep.tsx` | Monthly bucket list — edit mode (days 1-7) or read-only checklist (after day 7) |
| `components/dashboard/DailyTasksChecklist.tsx` | Home page task checklist with real-time check sync |
| `components/dashboard/MonthBucketList.tsx` | Home page bucket list checklist with real-time check sync |
| `components/dashboard/BucketListTransferDialog.tsx` | Month-end dialog for transferring unchecked items |

### Files Unchanged

- `components/habits/` — habits system stays as-is
- `components/shared/` — shared UI components unchanged
- `public/sw.js` — service worker unchanged
- `lib/format.ts` — date utilities unchanged
- `lib/streaks.ts` — streak logic unchanged (metrics unchanged)

---

## 9. Validation Rules

- `taskForToday`: array of strings (can be empty if no tasks carried over)
- `taskForTomorrow`: array of strings, min 1 item required
- `monthBucketList`: read-only in wizard (items managed via meta); checked items stored as `bucketListChecked: string[]`
- `tasksChecked`: array of strings (subset of `tasksForToday`)
- `bucketListChecked`: array of strings (subset of bucket list items)

---

## 10. Testing

- Update `tests/scoring.test.ts` for bonus scoring (tasks, bucket list, habits)
- Update `tests/journal-steps.test.ts` for new step definitions
- Update `tests/schema.test.ts` for v4 migration
- Update `tests/machine.test.ts` for new step types and validation
- Update `tests/repository.test.ts` for new entry fields and bucket list meta
- Update `tests/exportImport.test.ts` for v4 format
- Add test for task carry-over logic
- Add test for bucket list month-end transfer
- Add test for bucket list editing window (days 1-7 vs after)
- Run `npm run build` and `npm test` to verify

---

## 11. Migration & Fresh Start

- Dexie v4 wipes `entries` table on upgrade
- `habits` table preserved (active habits carry over)
- `meta` table preserved (aura records, drafts, bucket list rows survive)
- Dashboard shows empty state until first new entry is submitted
- Bucket list meta rows for past months remain as historical data

---

## 12. Implementation Order

1. Schema + migration (`lib/db/schema.ts`)
2. Steps definition (`lib/journal/steps.ts`)
3. Repository updates (`lib/db/repository.ts`) — bucket list meta helpers
4. Scoring engine (`lib/scoring.ts`) — bonus scoring
5. Validation (`lib/validations/journal.ts`)
6. Wizard components — new step components (TaskForToday, TaskForTomorrow, BucketList)
7. JournalWizard + StepRenderer integration
8. Dashboard — DailyTasksChecklist + MonthBucketList sections
9. BucketListTransferDialog (month-end transfer)
10. Export/import v4
11. Tests
12. Build verification
