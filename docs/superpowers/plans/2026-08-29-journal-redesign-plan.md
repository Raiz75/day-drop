# Journal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace DayDrop's 16-step journal wizard with an 18-step wizard across 4 well-being categories, update scoring to 4 metrics (40 pts/day), lower aura threshold to 1000, and wipe old entries for a fresh start.

**Architecture:** Big-bang migration — new Dexie v3 wipes entries table, new schema, new steps, new scoring. Habits and meta tables preserved. Wizard adds category headers between step groups. Dashboard shows 4 metric cards instead of 7.

**Tech Stack:** Next.js 16, React 19, TypeScript, Dexie 4, Tailwind v4 + shadcn/ui, Vitest

## Global Constraints

- Strict read/write split: only `lib/db/repository.ts` writes to IndexedDB
- Views early-return `null` while hydrating; keep all hooks before early returns
- No setState-in-effect (lint-enforced)
- Dates persist as local `'YYYY-MM-DD'` strings
- Wizard option ids are stable slugs — changing an id requires a migration
- Every code file must carry `AI-CONTEXT-NOTE` JSON header as first line
- Run `npm run build` to verify; run `npm test` for domain-logic changes

---

### Task 1: Update Database Schema (Dexie v3 Migration)

**Files:**
- Modify: `lib/db/schema.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: new `DayEntry` type with all new fields, `DayDropDB` v3 with entries wipe

- [ ] **Step 1: Read current schema**

Read `lib/db/schema.ts` to understand the current v2 structure (DayEntry fields, version(2) store declarations).

- [ ] **Step 2: Update DayEntry interface**

Replace the entire `DayEntry` interface in `lib/db/schema.ts`:

```ts
export interface DayEntry {
  date: string;
  // Physical Well-being
  sleepDuration: number;
  exercise: string;
  nutrition: string[];
  hydration: number;
  timeOutdoor: number;
  physicalFeeling: string;
  // Mental & Emotional
  moodCheck: string;
  reading: string;
  highlights: string;
  couldHaveBeenBetter: string;
  storyOfTheDay: string | null;
  // Relationship Well-being
  familyTime: boolean;
  conversations: boolean;
  kindnessActs: boolean;
  connectionStatus: string;
  // Work & Productivity
  learnedToday: string;
  tasksFinished: string;
  deepWorkHours: number;
  workFeeling: string;
  // Habits (unchanged)
  habitsChecked: string[];
  activeHabitCount: number;
  // Meta
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 3: Add Dexie v3 migration**

In the `DayDropDB` class, add `version(3)` that wipes the entries table:

```ts
this.version(3).stores({
  entries: "date",
  habits: "id, archivedAt, startedOn",
  meta: "key",
});
```

- [ ] **Step 4: Update JournalDraft answers type**

The `JournalDraft` interface uses `Partial<DayEntry>` — it will automatically pick up the new fields. No change needed.

- [ ] **Step 5: Run build to verify**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: Tests may fail (old test data uses old fields) — this is expected, we'll fix tests later.

- [ ] **Step 7: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: update DayEntry schema for journal redesign (v3 migration)"
```

---

### Task 2: Rewrite Wizard Steps Definition

**Files:**
- Modify: `lib/journal/steps.ts`
- Test: `tests/journal-steps.test.ts`

**Interfaces:**
- Produces: `STEPS` array with 20 steps (19 new + habits), `StepId` union type, `CategoryDef` type with category metadata

- [ ] **Step 1: Read current steps**

Read `lib/journal/steps.ts` to understand StepId, StepOption, StepDef, and STEPS structure.

- [ ] **Step 2: Define new StepId type**

Replace the `StepId` union type:

```ts
export type StepId =
  | "sleepDuration" | "exercise" | "nutrition" | "hydration" | "timeOutdoor" | "physicalFeeling"
  | "moodCheck" | "reading" | "highlights" | "couldHaveBeenBetter" | "storyOfTheDay"
  | "familyTime" | "conversations" | "kindnessActs" | "connectionStatus"
  | "learnedToday" | "tasksFinished" | "deepWorkHours" | "workFeeling"
  | "habits";
```

- [ ] **Step 3: Add CategoryDef type**

Add before the STEPS array:

```ts
export interface CategoryDef {
  id: string;
  name: string;
  stepIds: StepId[];
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: "physical", name: "Physical Well-being", stepIds: ["sleepDuration", "exercise", "nutrition", "hydration", "timeOutdoor", "physicalFeeling"] },
  { id: "mental", name: "Mental & Emotional", stepIds: ["moodCheck", "reading", "highlights", "couldHaveBeenBetter", "storyOfTheDay"] },
  { id: "social", name: "Relationship Well-being", stepIds: ["familyTime", "conversations", "kindnessActs", "connectionStatus"] },
  { id: "productivity", name: "Work & Productivity", stepIds: ["learnedToday", "tasksFinished", "deepWorkHours", "workFeeling"] },
];
```

- [ ] **Step 4: Rewrite STEPS array**

Replace the entire `STEPS` array with the 20 steps from the spec:

```ts
export const STEPS: readonly StepDef[] = [
  // Physical Well-being
  { id: "sleepDuration", order: 1, question: "how many hours did you sleep?", type: "tier-radio",
    tierScores: [3, 5, 10, 8, 6, 3], options: [
      opt("5-6h", "5-6 hours"), opt("6-7h", "6-7 hours"), opt("7-8h", "7-8 hours"),
      opt("8-9h", "8-9 hours"), opt("9-10h", "9-10 hours"), opt("10h+", "10+ hours"),
  ]},
  { id: "exercise", order: 2, question: "what level of exercise did you get?", type: "radio", options: [
      opt("light", "light", 4), opt("medium", "medium", 7), opt("heavy", "heavy", 10),
  ]},
  { id: "nutrition", order: 3, question: "what did you eat today?", type: "checkbox", options: [
      opt("meat", "meat"), opt("vegetables", "vegetables"), opt("fruit", "fruit"),
  ]},
  { id: "hydration", order: 4, question: "how much water did you drink?", type: "tier-radio",
    tierScores: [3, 5, 8, 10], options: [
      opt("500ml", "500ml"), opt("1L", "1 liter"), opt("1.5L", "1.5 liters"), opt("2L+", "2+ liters"),
  ]},
  { id: "timeOutdoor", order: 5, question: "how much time did you spend outside?", type: "tier-radio",
    tierScores: [2, 5, 8, 10], options: [
      opt("under-30min", "less than 30 minutes"), opt("30-60min", "30-60 minutes"),
      opt("1-2h", "1-2 hours"), opt("2h+", "2+ hours"),
  ]},
  { id: "physicalFeeling", order: 6, question: "how does your body feel?", type: "radio", options: [
      opt("unwell", "unwell", 2), opt("okay", "okay", 5),
      opt("healthy", "healthy", 8), opt("energetic", "energetic", 10),
  ]},
  // Mental & Emotional
  { id: "moodCheck", order: 7, question: "how are you feeling today?", type: "radio", options: [
      opt("happy", "happy", 10), opt("energetic", "energetic", 9),
      opt("okay", "okay", 6), opt("bored", "bored", 4),
      opt("tired", "tired", 3), opt("anxious", "anxious", 3),
      opt("sad", "sad", 2), opt("angry", "angry", 2), opt("lonely", "lonely", 2),
  ]},
  { id: "reading", order: 8, question: "how many pages did you read today?", type: "radio", options: [
      opt("none", "none (0-10 pages)", 1), opt("a-bit", "a bit (11-20 pages)", 3),
      opt("decent", "decent (21-30 pages)", 5), opt("a-lot", "a lot (31-40 pages)", 7),
      opt("on-a-roll", "on a roll (41-50 pages)", 9), opt("bookworm", "bookworm (51+ pages)", 10),
  ]},
  { id: "highlights", order: 9, question: "what was the highlight of your day?", type: "text", minChars: 50 },
  { id: "couldHaveBeenBetter", order: 10, question: "how could today have been better?", type: "text", minChars: 50 },
  { id: "storyOfTheDay", order: 11, question: "what's the story of your day?", type: "text", optional: true },
  // Relationship Well-being
  { id: "familyTime", order: 12, question: "did you spend time with your loved ones or people that are dear to you?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "conversations", order: 13, question: "did you have meaningful conversations today?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "kindnessActs", order: 14, question: "did you perform any acts of kindness today?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "connectionStatus", order: 15, question: "how connected do you feel?", type: "radio", options: [
      opt("connected", "connected", 10), opt("neutral", "neutral", 5), opt("lonely", "lonely", 2),
  ]},
  // Work & Productivity
  { id: "learnedToday", order: 16, question: "what did you learn today?", type: "text", minChars: 20 },
  { id: "tasksFinished", order: 17, question: "what tasks did you finish?", type: "text", minChars: 20 },
  { id: "deepWorkHours", order: 18, question: "how many hours of deep work did you do?", type: "tier-radio",
    tierScores: [1, 4, 7, 9, 10], options: [
      opt("0h", "0 hours"), opt("1h", "1 hour"), opt("2h", "2 hours"),
      opt("3h", "3 hours"), opt("4h+", "4+ hours"),
  ]},
  { id: "workFeeling", order: 19, question: "how did work feel?", type: "radio", options: [
      opt("focused", "focused", 10), opt("productive", "productive", 8),
      opt("scattered", "scattered", 4), opt("drained", "drained", 2),
  ]},
  // Habits (unchanged)
  { id: "habits", order: 20, question: "what habit did you solidify today?", type: "habits" },
];
```

- [ ] **Step 5: Run tests to verify failures**

Run: `npm test`
Expected: FAIL — tests reference old StepIds that no longer exist.

- [ ] **Step 6: Commit**

```bash
git add lib/journal/steps.ts
git commit -m "feat: rewrite wizard steps for 4-category journal redesign"
```

---

### Task 3: Rewrite Scoring Engine

**Files:**
- Modify: `lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `DayEntry` (Task 1), `STEPS` (Task 2)
- Produces: `scoreEntry()` returning `{ physical, mental, social, productivity, total }`, `MetricKey` type, `AURA_COST = 1000`

- [ ] **Step 1: Read current scoring**

Read `lib/scoring.ts` to understand current scoring functions and MetricKey type.

- [ ] **Step 2: Update MetricKey type**

```ts
export type MetricKey = "physical" | "mental" | "social" | "productivity";
```

- [ ] **Step 3: Update constants**

```ts
export const AURA_COST = 1000;
export const MAX_METRIC_SCORE = 10;
export const METRIC_COUNT = 4;
```

- [ ] **Step 4: Write physicalScore function**

```ts
function physicalScore(e: DayEntry): number {
  const sleepScores = [3, 5, 10, 8, 6, 3];
  const sleep = sleepScores[e.sleepDuration] ?? 1;
  const exerciseScores: Record<string, number> = { light: 4, medium: 7, heavy: 10 };
  const exercise = exerciseScores[e.exercise] ?? 1;
  const nutritionScore = Math.min(10, (e.nutrition.length || 0) * 3 + 1);
  const hydrationScores = [3, 5, 8, 10];
  const hydration = hydrationScores[e.hydration] ?? 1;
  const outdoorScores = [2, 5, 8, 10];
  const outdoor = outdoorScores[e.timeOutdoor] ?? 1;
  const feelingScores: Record<string, number> = { unwell: 2, okay: 5, healthy: 8, energetic: 10 };
  const feeling = feelingScores[e.physicalFeeling] ?? 1;
  const avg = (sleep + exercise + nutritionScore + hydration + outdoor + feeling) / 6;
  return Math.min(10, Math.max(1, Math.round(avg)));
}
```

- [ ] **Step 5: Write mentalScore function**

```ts
function mentalScore(e: DayEntry): number {
  const moodScores: Record<string, number> = {
    happy: 10, energetic: 9, okay: 6, bored: 4, tired: 3, anxious: 3, sad: 2, angry: 2, lonely: 2,
  };
  const mood = moodScores[e.moodCheck] ?? 1;
  const readingScores: Record<string, number> = {
    none: 1, "a-bit": 3, decent: 5, "a-lot": 7, "on-a-roll": 9, bookworm: 10,
  };
  const reading = readingScores[e.reading] ?? 1;
  const textBonuses = [e.highlights, e.couldHaveBeenBetter, e.storyOfTheDay].filter((t) => t && t.length > 0).length;
  const textBonusScaled = Math.round((textBonuses / 3) * 10);
  const avg = (mood + reading + textBonusScaled) / 3;
  return Math.min(10, Math.max(1, Math.round(avg)));
}
```

- [ ] **Step 6: Write socialScore function**

```ts
function socialScore(e: DayEntry): number {
  const family = e.familyTime ? 8 : 2;
  const convos = e.conversations ? 8 : 2;
  const kindness = e.kindnessActs ? 8 : 2;
  const connectionScores: Record<string, number> = { connected: 10, neutral: 5, lonely: 2 };
  const connection = connectionScores[e.connectionStatus] ?? 1;
  const avg = (family + convos + kindness + connection) / 4;
  return Math.min(10, Math.max(1, Math.round(avg)));
}
```

- [ ] **Step 7: Write productivityScore function**

```ts
function productivityScore(e: DayEntry): number {
  const deepWorkScores = [1, 4, 7, 9, 10];
  const deepWork = deepWorkScores[e.deepWorkHours] ?? 1;
  const workScores: Record<string, number> = { focused: 10, productive: 8, scattered: 4, drained: 2 };
  const work = workScores[e.workFeeling] ?? 1;
  const textBonuses = [e.learnedToday, e.tasksFinished].filter((t) => t && t.length > 0).length;
  const textBonusScaled = Math.round((textBonuses / 2) * 10);
  const avg = (deepWork + work + textBonusScaled) / 3;
  return Math.min(10, Math.max(1, Math.round(avg)));
}
```

- [ ] **Step 8: Rewrite scoreEntry function**

```ts
export function scoreEntry(e: DayEntry): Record<MetricKey, number> & { total: number } {
  const physical = physicalScore(e);
  const mental = mentalScore(e);
  const social = socialScore(e);
  const productivity = productivityScore(e);
  const total = physical + mental + social + productivity;
  return { physical, mental, social, productivity, total };
}
```

- [ ] **Step 9: Update totalPoints and pointsBalance**

```ts
export function totalPoints(entries: DayEntry[]): number {
  return entries.reduce((sum, e) => sum + scoreEntry(e).total, 0);
}

export function pointsBalance(entries: DayEntry[], redeemedCount: number): number {
  return totalPoints(entries) - AURA_COST * redeemedCount;
}
```

- [ ] **Step 10: Run tests to verify failures**

Run: `npm test`
Expected: FAIL — tests use old MetricKey names and old scoring logic.

- [ ] **Step 11: Commit**

```bash
git add lib/scoring.ts
git commit -m "feat: rewrite scoring engine for 4-metric system (40 pts/day, 1000 aura)"
```

---

### Task 4: Update Validation Schema

**Files:**
- Modify: `lib/validations/journal.ts`
- Test: `tests/validations.test.ts` (if exists)

**Interfaces:**
- Consumes: `DayEntry` (Task 1), `STEPS` (Task 2)
- Produces: zod schema validating new DayEntry fields

- [ ] **Step 1: Read current validation**

Read `lib/validations/journal.ts` to understand current zod schema structure.

- [ ] **Step 2: Rewrite zod schema**

Replace the entry validation schema with one matching the new DayEntry fields. Use zod's `z.object()` with appropriate types for each field. Include:
- `sleepDuration`: `z.number().int().min(0).max(5)` (tier index)
- `exercise`: `z.enum(["light", "medium", "heavy"])`
- `nutrition`: `z.array(z.enum(["meat", "vegetables", "fruit"])).min(1)`
- `hydration`: `z.number().int().min(0).max(3)`
- `timeOutdoor`: `z.number().int().min(0).max(3)`
- `physicalFeeling`: `z.enum(["unwell", "okay", "healthy", "energetic"])`
- `moodCheck`: `z.enum(["happy", "energetic", "okay", "bored", "tired", "anxious", "sad", "angry", "lonely"])`
- `reading`: `z.enum(["none", "a-bit", "decent", "a-lot", "on-a-roll", "bookworm"])`
- `highlights`: `z.string().min(50)`
- `couldHaveBeenBetter`: `z.string().min(50)`
- `storyOfTheDay`: `z.string().nullable()`
- `familyTime`: `z.boolean()`
- `conversations`: `z.boolean()`
- `kindnessActs`: `z.boolean()`
- `connectionStatus`: `z.enum(["connected", "neutral", "lonely"])`
- `learnedToday`: `z.string().min(20)`
- `tasksFinished`: `z.string().min(20)`
- `deepWorkHours`: `z.number().int().min(0).max(4)`
- `workFeeling`: `z.enum(["focused", "scattered", "productive", "drained"])`
- `habitsChecked`: `z.array(z.string())`
- `activeHabitCount`: `z.number().int().min(0)`
- `date`: `z.string()`
- `createdAt`: `z.number()`
- `updatedAt`: `z.number()`

- [ ] **Step 3: Run build to verify**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: May still fail (old tests), but validation module compiles.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/journal.ts
git commit -m "feat: update zod validation schema for new DayEntry fields"
```

---

### Task 5: Update Repository (Submit Entry)

**Files:**
- Modify: `lib/db/repository.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Consumes: `DayEntry` (Task 1), validation schema (Task 4)
- Produces: updated `submitEntry()` accepting new field set

- [ ] **Step 1: Read current repository**

Read `lib/db/repository.ts` to understand `submitEntry` and other write functions.

- [ ] **Step 2: Update submitEntry function**

Ensure `submitEntry` accepts the new DayEntry field set. The function likely spreads the entry object — verify it handles all new fields. Update any field mapping if needed.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: Tests may still fail (old test data), but repository compiles.

- [ ] **Step 4: Commit**

```bash
git add lib/db/repository.ts
git commit -m "feat: update repository for new DayEntry fields"
```

---

### Task 6: Create Category Header Component

**Files:**
- Create: `components/journal/CategoryHeader.tsx`
- Modify: `components/journal/JournalWizard.tsx`

**Interfaces:**
- Consumes: `CATEGORIES` (Task 2), current step id
- Produces: `CategoryHeader` component rendering category name

- [ ] **Step 1: Create CategoryHeader component**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Renders category section header in journal wizard.","IDD":[],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts"],"E":["npm run build"]} */
"use client";

import { CATEGORIES, type StepId } from "@/lib/journal/steps";

interface CategoryHeaderProps {
  stepId: StepId;
}

export function CategoryHeader({ stepId }: CategoryHeaderProps) {
  const category = CATEGORIES.find((c) => c.stepIds.includes(stepId));
  if (!category) return null;
  return (
    <div className="py-4 text-center">
      <h2 className="text-lg font-semibold text-muted-foreground">{category.name}</h2>
    </div>
  );
}
```

- [ ] **Step 2: Update JournalWizard to show category headers**

In `components/journal/JournalWizard.tsx`, import `CategoryHeader` and `CATEGORIES`. Before rendering each step, check if this step is the first in its category — if so, render `<CategoryHeader stepId={currentStep.id} />` above the step.

Logic: compare `currentStep.id` against `CATEGORIES[c].stepIds[0]` for each category. If it matches, show the header.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/journal/CategoryHeader.tsx components/journal/JournalWizard.tsx
git commit -m "feat: add category headers to journal wizard"
```

---

### Task 7: Update Wizard Step Components

**Files:**
- Modify: `components/journal/RadioStep.tsx` (if needed for boolean fields)
- Modify: `components/journal/TextInputStep.tsx` (if minChars logic needs update)

**Interfaces:**
- Consumes: step definitions from Task 2
- Produces: step components rendering new field types

- [ ] **Step 1: Check RadioStep for boolean support**

Read `components/journal/RadioStep.tsx`. The yes/no radio for `familyTime`, `conversations`, `kindnessActs` should work with existing radio options (opt("yes", "yes", 8), opt("no", "no", 2)). No change needed if radio step handles boolean result correctly.

- [ ] **Step 2: Check TextInputStep minChars**

Read `components/journal/TextInputStep.tsx`. Verify minChars validation works with 50 for highlights/couldHaveBeenBetter and 20 for learnedToday/tasksFinished. No change needed if already parameterized.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit (if changes needed)**

Only commit if changes were made.

---

### Task 8: Update Dashboard Metrics Display

**Files:**
- Modify: `components/dashboard/DashboardView.tsx`
- Modify: `components/dashboard/StreakChips.tsx`
- Modify: `components/dashboard/TrendChart.tsx`
- Modify: `components/dashboard/RewardBanner.tsx`

**Interfaces:**
- Consumes: `MetricKey` type (Task 3), `AURA_COST` (Task 3)
- Produces: dashboard showing 4 metric cards, updated aura threshold

- [ ] **Step 1: Update DashboardView metric cards**

Replace the 7 metric cards with 4: physical, mental, social, productivity. Update labels and icons. Use `scoreEntry()` to get values.

- [ ] **Step 2: Update StreakChips**

Change metric keys from old (health, steps, workout, screenTime, reading, sleep, habits) to new (physical, mental, social, productivity).

- [ ] **Step 3: Update TrendChart**

Update the 30-day trend chart to use 4 metric lines instead of 7.

- [ ] **Step 4: Update RewardBanner**

Change `AURA_COST` reference from 1500 to 1000 (import from scoring.ts).

- [ ] **Step 5: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS (or only dashboard-specific tests fail if they mock old data)

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/
git commit -m "feat: update dashboard for 4-metric scoring system"
```

---

### Task 9: Update Export/Import (v3 Format)

**Files:**
- Modify: `lib/exportImport.ts`
- Modify: `components/settings/SettingsView.tsx`

**Interfaces:**
- Consumes: `DayEntry` (Task 1)
- Produces: v3 export format with new schema validation

- [ ] **Step 1: Read current export/import**

Read `lib/exportImport.ts` to understand export format and zod validation.

- [ ] **Step 2: Update export format version**

Change export version to 3. Update the zod schema used for import validation to match new DayEntry fields.

- [ ] **Step 3: Update SettingsView import handler**

Ensure import handler uses v3 validation schema.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/exportImport.ts components/settings/SettingsView.tsx
git commit -m "feat: update export/import to v3 format"
```

---

### Task 10: Update Tests

**Files:**
- Modify: `tests/scoring.test.ts`
- Modify: `tests/journal-steps.test.ts`
- Modify: `tests/schema.test.ts`
- Create: `tests/journal-steps.test.ts` (if not exists, create with new step tests)

**Interfaces:**
- Consumes: all tasks 1-5
- Produces: passing tests for new schema, steps, scoring

- [ ] **Step 1: Update scoring tests**

Rewrite `tests/scoring.test.ts` to test:
- `physicalScore()` with various DayEntry combinations
- `mentalScore()` with mood/reading/text variations
- `socialScore()` with boolean and connection status
- `productivityScore()` with deep work and work feeling
- `scoreEntry()` returns correct total
- `pointsBalance()` with AURA_COST = 1000

- [ ] **Step 2: Update journal-steps tests**

Rewrite `tests/journal-steps.test.ts` to verify:
- All 20 steps exist with correct ids
- CATEGORIES array has 4 categories
- Each category references valid step ids
- Step types match expected (radio, tier-radio, text, checkbox, habits)
- minChars values correct (50 for highlights/couldHaveBeenBetter, 20 for learnedToday/tasksFinished)

- [ ] **Step 3: Update schema tests**

Update `tests/schema.test.ts` for v3 migration:
- Test that entries table is wiped on v3 upgrade
- Test that habits and meta tables are preserved

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: update tests for journal redesign"
```

---

### Task 11: Final Build Verification & Cleanup

**Files:**
- Verify: all modified files have AI-CONTEXT-NOTE headers
- Verify: no references to old StepIds or MetricKeys remain

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Grep for old references**

Search codebase for old StepIds: "work", "health", "weather", "steps", "workout", "screenTime", "reading" (as step id), "sleep", "mood", "highlight", "improve", "grateful", "todayTasks", "tomorrowPlan", "bucketList".

Search for old MetricKeys: "screenTime", "reading" (as metric), "sleep", "habits" (as metric).

Remove or update any stale references.

- [ ] **Step 4: Verify AI-CONTEXT-NOTE headers**

Check all new/modified files have the required AI-CONTEXT-NOTE JSON header as first line.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete journal redesign - 4-category wizard, 4-metric scoring"
```
