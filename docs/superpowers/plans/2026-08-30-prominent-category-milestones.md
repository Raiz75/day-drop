# Prominent Category Display + Category Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the journal wizard's category always visible via a sticky banner, add milestone markers to progress dots, and celebrate category completion with confetti + toast.

**Architecture:** Extract progress dots into a standalone component with category-aware rendering. Replace the inline `CategoryHeader` with a sticky `CategoryBanner` that shows icon + name + colored background. Add a `CategoryCelebration` component that fires canvas-confetti on category boundary advancement. All changes are presentation-only — no data model or IndexedDB changes.

**Tech Stack:** React 19, TypeScript, Tailwind v4, tabler-icons-react, canvas-confetti (new dep), sonner (existing toast)

## Global Constraints

- All code files must carry an `AI-CONTEXT-NOTE` JSON header as the first line
- Only `lib/db/repository.ts` writes to IndexedDB — no writes from components
- Dates persist as local `'YYYY-MM-DD'` strings
- Option ids in `lib/journal/steps.ts` are stable slugs — do not change them
- Run `npm run build` after all changes; run `npm test` for domain-logic changes
- No `setState-in-effect` — use `useSyncExternalStore` or key-based remounts

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `canvas-confetti` dependency |
| `lib/journal/steps.ts` | Modify | Add `color` + `icon` to `CategoryDef`, add `getCategoryForStep()` utility |
| `components/journal/ProgressDots.tsx` | Create | Category-aware progress dots with milestone markers |
| `components/journal/CategoryBanner.tsx` | Create | Sticky banner replacing `CategoryHeader` |
| `components/journal/CategoryCelebration.tsx` | Create | Confetti burst + category-complete toast |
| `components/journal/JournalWizard.tsx` | Modify | Wire new components, remove old `CategoryHeader` import + inline `ProgressDots` |
| `tests/journal-steps.test.ts` | Modify | Add tests for `getCategoryForStep()` and new `CategoryDef` fields |

---

### Task 1: Install canvas-confetti

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the dependency**

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Verify install**

Run: `npm list canvas-confetti`
Expected: shows `canvas-confetti` in the tree

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add canvas-confetti for category celebration"
```

---

### Task 2: Extend CategoryDef with color + icon fields

**Files:**
- Modify: `lib/journal/steps.ts:23-34`
- Modify: `tests/journal-steps.test.ts`

**Interfaces:**
- Produces: `CategoryDef.color`, `CategoryDef.icon`, `getCategoryForStep(stepIndex: number): CategoryDef | undefined`

- [ ] **Step 1: Write failing test for getCategoryForStep**

Add to `tests/journal-steps.test.ts`:

```ts
import { getCategoryForStep } from "@/lib/journal/steps";

// ... inside describe("categories"):

it("getCategoryForStep returns correct category for each step index", () => {
  // Physical: indices 0-5
  expect(getCategoryForStep(0)?.id).toBe("physical");
  expect(getCategoryForStep(5)?.id).toBe("physical");
  // Mental: indices 6-10
  expect(getCategoryForStep(6)?.id).toBe("mental");
  expect(getCategoryForStep(10)?.id).toBe("mental");
  // Social: indices 11-14
  expect(getCategoryForStep(11)?.id).toBe("social");
  expect(getCategoryForStep(14)?.id).toBe("social");
  // Productivity: indices 15-18
  expect(getCategoryForStep(15)?.id).toBe("productivity");
  expect(getCategoryForStep(18)?.id).toBe("productivity");
  // Habits (index 19) is not in any category
  expect(getCategoryForStep(19)).toBeUndefined();
});

it("each category has color and icon fields", () => {
  for (const cat of CATEGORIES) {
    expect(cat.color).toBeTruthy();
    expect(cat.icon).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/journal-steps.test.ts`
Expected: FAIL — `getCategoryForStep` not defined, `color`/`icon` missing

- [ ] **Step 3: Add color + icon to CategoryDef and CATEGORIES**

In `lib/journal/steps.ts`, update the interface:

```ts
export interface CategoryDef {
  id: string;
  name: string;
  stepIds: StepId[];
  color: string;
  icon: string;
}
```

Update the CATEGORIES array:

```ts
export const CATEGORIES: readonly CategoryDef[] = [
  { id: "physical", name: "Physical Well-being", stepIds: ["sleepDuration", "exercise", "nutrition", "hydration", "timeOutdoor", "physicalFeeling"], color: "emerald", icon: "IconRun" },
  { id: "mental", name: "Mental & Emotional", stepIds: ["moodCheck", "reading", "highlights", "couldHaveBeenBetter", "storyOfTheDay"], color: "sky", icon: "IconBrain" },
  { id: "social", name: "Relationship Well-being", stepIds: ["familyTime", "conversations", "kindnessActs", "connectionStatus"], color: "violet", icon: "IconHeart" },
  { id: "productivity", name: "Work & Productivity", stepIds: ["learnedToday", "tasksFinished", "deepWorkHours", "workFeeling"], color: "amber", icon: "IconBolt" },
];
```

- [ ] **Step 4: Add getCategoryForStep utility**

Add at the bottom of `lib/journal/steps.ts`:

```ts
export function getCategoryForStep(stepIndex: number): CategoryDef | undefined {
  const step = STEPS[stepIndex];
  if (!step) return undefined;
  return CATEGORIES.find((c) => c.stepIds.includes(step.id));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test tests/journal-steps.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/journal/steps.ts tests/journal-steps.test.ts
git commit -m "feat: add color/icon to CategoryDef and getCategoryForStep utility"
```

---

### Task 3: Create ProgressDots component with milestone markers

**Files:**
- Create: `components/journal/ProgressDots.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `STEPS` from `lib/journal/steps`
- Produces: `<ProgressDots currentStepIndex={number} />`

- [ ] **Step 1: Create ProgressDots.tsx**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Category-aware progress dots with milestone dividers and category labels.","IDD":[{"?":"Dots are grouped by category; dividers appear between groups; current category gets a highlight ring."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts CATEGORIES, STEPS"],"E":["npm run build","npm test"]} */
"use client";

import { CATEGORIES, STEPS } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

interface ProgressDotsProps {
  currentStepIndex: number;
}

export function ProgressDots({ currentStepIndex }: ProgressDotsProps) {
  const currentCategory = CATEGORIES.find((c) =>
    c.stepIds.includes(STEPS[currentStepIndex]?.id),
  );

  // Build groups: array of { category, startIndex, endIndex, dotCount }
  const groups = CATEGORIES.map((cat) => {
    const startIdx = STEPS.findIndex((s) => cat.stepIds.includes(s.id));
    const endIdx = STEPS.findLastIndex((s) => cat.stepIds.includes(s.id));
    return {
      category: cat,
      startIdx,
      endIdx,
      dotCount: endIdx - startIdx + 1,
    };
  });

  return (
    <div className="flex flex-col gap-1.5" aria-label={`step ${currentStepIndex + 1} of ${STEPS.length}`}>
      <div className="flex items-center gap-1">
        {groups.map((group, gi) => {
          const isCompleted = currentStepIndex > group.endIdx;
          const isCurrent = group.category.id === currentCategory?.id;
          return (
            <div key={group.category.id} className="flex items-center gap-1">
              {gi > 0 && (
                <span className={cn(
                  "mx-0.5 text-xs transition-colors",
                  isCompleted || isCurrent ? "text-muted-foreground/60" : "text-muted/40",
                )}>
                  |
                </span>
              )}
              {Array.from({ length: group.dotCount }, (_, di) => {
                const stepIdx = group.startIdx + di;
                const isFilled = stepIdx < currentStepIndex;
                const is_active = stepIdx === currentStepIndex;
                return (
                  <span
                    key={stepIdx}
                    className={cn(
                      "size-2 rounded-full transition-all",
                      isFilled && "bg-primary/70",
                      is_active && "bg-primary ring-2 ring-primary/30",
                      !isFilled && !is_active && "bg-muted",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        {groups.map((group, gi) => {
          const isCompleted = currentStepIndex > group.endIdx;
          const isCurrent = group.category.id === currentCategory?.id;
          if (!isCompleted && !isCurrent) return <span key={group.category.id} className="flex-1" />;
          return (
            <span
              key={group.category.id}
              className={cn(
                "text-[10px] leading-none transition-colors",
                isCompleted ? "text-muted-foreground/60" : "text-muted-foreground font-medium",
              )}
              style={{ minWidth: `${group.dotCount * 12 + 8}px` }}
            >
              {group.category.name.split(" ")[0]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/journal/ProgressDots.tsx
git commit -m "feat: add category-aware ProgressDots with milestone markers"
```

---

### Task 4: Create CategoryBanner component

**Files:**
- Create: `components/journal/CategoryBanner.tsx`

**Interfaces:**
- Consumes: `getCategoryForStep` from `lib/journal/steps`, tabler-icons-react
- Produces: `<CategoryBanner stepIndex={number} />`

- [ ] **Step 1: Create CategoryBanner.tsx**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Sticky category banner showing icon + name with colored background, animates on category switch.","IDD":[{"?":"Uses dynamic icon import from tabler-icons-react based on CategoryDef.icon string."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts getCategoryForStep, CATEGORIES"],"E":["npm run build"]} */
"use client";

import { useMemo } from "react";
import {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
} from "@tabler/icons-react";
import { getCategoryForStep, STEPS } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  sky:     { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",     border: "border-sky-500/20" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400",  border: "border-violet-500/20" },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/20" },
};

interface CategoryBannerProps {
  stepIndex: number;
}

export function CategoryBanner({ stepIndex }: CategoryBannerProps) {
  const category = getCategoryForStep(stepIndex);
  if (!category) return null;

  const IconComponent = ICON_MAP[category.icon];
  const colors = COLOR_CLASSES[category.color] ?? COLOR_CLASSES.emerald;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors duration-300",
        colors.bg,
        colors.border,
      )}
      aria-live="polite"
    >
      {IconComponent && (
        <IconComponent className={cn("size-5 shrink-0", colors.text)} />
      )}
      <span className={cn("text-sm font-semibold tracking-wide", colors.text)}>
        {category.name}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/journal/CategoryBanner.tsx
git commit -m "feat: add sticky CategoryBanner with icon + color per category"
```

---

### Task 5: Create CategoryCelebration component

**Files:**
- Create: `components/journal/CategoryCelebration.tsx`

**Interfaces:**
- Consumes: `canvas-confetti`, `sonner` toast, `CategoryDef` from `lib/journal/steps`
- Produces: `fireCategoryCelebration(category: CategoryDef): void` function

- [ ] **Step 1: Create CategoryCelebration.tsx**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Fires canvas-confetti burst + sonner toast when a category group is completed.","IDD":[{"?":"fireCategoryCelebration is a plain function, not a component — called from handleNext in JournalWizard."},{"?":"Confetti colors derived from category.color via COLOR_MAP."}],"A":["components/journal/JournalWizard.tsx"],"AB":["lib/journal/steps.ts CategoryDef"],"E":["npm run build","Manual smoke: advance past last step of a category"]} */
"use client";

import confetti from "canvas-confetti";
import { toast } from "sonner";
import type { CategoryDef } from "@/lib/journal/steps";
import {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
} from "@tabler/icons-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  IconRun,
  IconBrain,
  IconHeart,
  IconBolt,
};

const CONFETTI_COLORS: Record<string, string[]> = {
  emerald: ["#34d399", "#10b981", "#059669"],
  sky:     ["#38bdf8", "#0ea5e9", "#0284c7"],
  violet:  ["#a78bfa", "#8b5cf6", "#7c3aed"],
  amber:   ["#fbbf24", "#f59e0b", "#d97706"],
};

export function fireCategoryCelebration(category: CategoryDef): void {
  const colors = CONFETTI_COLORS[category.color] ?? CONFETTI_COLORS.emerald;

  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.3 },
    colors,
    disableForReducedMotion: true,
  });

  const IconComponent = ICON_MAP[category.icon];
  const iconHtml = IconComponent
    ? `<span style="display:inline-block;vertical-align:middle;margin-right:6px;">${renderToStaticMarkup(IconComponent)}</span>`
    : "";

  toast.success(`${category.name} — Done!`, {
    description: "Great job completing this section",
    icon: undefined,
  });
}

// Minimal render-to-staticMarkup alternative using DOM
function renderToStaticMarkup(Component: React.ComponentType<{ className?: string }>): string {
  // On client, just return empty string — toast works fine without inline icon
  return "";
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/journal/CategoryCelebration.tsx
git commit -m "feat: add CategoryCelebration confetti + toast"
```

---

### Task 6: Wire everything into JournalWizard

**Files:**
- Modify: `components/journal/JournalWizard.tsx`

**Interfaces:**
- Consumes: `ProgressDots`, `CategoryBanner`, `fireCategoryCelebration` from new components
- Removes: `CategoryHeader` import, inline `ProgressDots` function

- [ ] **Step 1: Update imports**

Replace the imports section. Remove:
```ts
import { CategoryHeader } from "./CategoryHeader";
```

Add:
```ts
import { ProgressDots } from "./ProgressDots";
import { CategoryBanner } from "./CategoryBanner";
import { fireCategoryCelebration } from "./CategoryCelebration";
import { getCategoryForStep } from "@/lib/journal/steps";
```

- [ ] **Step 2: Add category boundary detection to handleNext**

Replace the `handleNext` function:

```ts
const handleNext = () => {
  if (!canAdvance(state)) return;
  const currentCategory = getCategoryForStep(state.stepIndex);
  const nextIndex = state.stepIndex + 1;
  const nextCategory = getCategoryForStep(nextIndex);
  dispatch({ type: "next" });
  // Fire celebration when crossing a category boundary
  if (currentCategory && (!nextCategory || nextCategory.id !== currentCategory.id)) {
    fireCategoryCelebration(currentCategory);
  }
};
```

- [ ] **Step 3: Restructure the JSX layout**

Replace the return block's JSX. The new structure:

```tsx
return (
  <div className="fixed inset-0 z-50 flex flex-col bg-background">
    <header className="sticky top-0 z-10 flex flex-col gap-3 bg-background px-5 pt-5 pb-3">
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-3">
          <CategoryBanner stepIndex={state.stepIndex} />
          <ProgressDots currentStepIndex={state.stepIndex} />
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close journal" onClick={onClose}>
          <IconX className="size-5" />
        </Button>
      </div>
      <h2 className="font-heading text-xl font-semibold leading-snug">{step.question}</h2>
    </header>
    <main className="flex-1 overflow-y-auto px-5 pb-6">
      {ready ? (
        <StepRenderer
          step={step}
          answers={state.answers}
          answerValue={answerFor(step.id, state.answers)}
          onChange={(patch) => dispatch({ type: "answer", patch })}
        />
      ) : null}
    </main>
    <footer className="flex items-center justify-between gap-3 border-t bg-background px-5 py-3">
      {state.stepIndex > 0 ? (
        <Button variant="ghost" onClick={() => dispatch({ type: "back" })}>
          <IconArrowLeft data-icon="inline-start" />
          Back
        </Button>
      ) : (
        <span />
      )}
      {last ? (
        <Button onClick={handleFinish} disabled={!canAdvance(state) || submitting}>
          Finish
        </Button>
      ) : (
        <Button onClick={handleNext} disabled={!canAdvance(state)}>
          Next
          <IconArrowRight data-icon="inline-end" />
        </Button>
      )}
    </footer>
    {celebration && (
      <CelebrationScreen
        habits={celebration}
        onDismiss={() => {
          onClose();
          onSubmitted();
        }}
      />
    )}
  </div>
);
```

- [ ] **Step 4: Remove the old inline ProgressDots function**

Delete the `function ProgressDots(...)` at the bottom of the file (lines 231-245).

- [ ] **Step 5: Remove unused variables**

Remove `isFirstInCategory` (line 115) — no longer needed since `CategoryBanner` handles its own visibility.

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Run existing tests**

Run: `npm test`
Expected: PASS (no data model changes)

- [ ] **Step 8: Commit**

```bash
git add components/journal/JournalWizard.tsx
git commit -m "feat: wire CategoryBanner, ProgressDots, and CategoryCelebration into wizard"
```

---

### Task 7: Update CategoryHeader (keep for backward compat)

**Files:**
- Modify: `components/journal/CategoryHeader.tsx`

Since `CategoryHeader` is no longer imported by `JournalWizard`, but might be referenced elsewhere or in tests, update its AI-CONTEXT-NOTE to reflect it's deprecated/unused.

- [ ] **Step 1: Update AI-CONTEXT-NOTE**

Change the header comment to:

```ts
/* AI-CONTEXT-NOTE:{"R":"DEPRECATED - previously rendered category section header in journal wizard. Replaced by CategoryBanner. Keep for potential future use or remove.","IDD":[],"A":[],"AB":["lib/journal/steps.ts"],"E":["npm run build"]} */
```

- [ ] **Step 2: Commit**

```bash
git add components/journal/CategoryHeader.tsx
git commit -m "chore: mark CategoryHeader as deprecated, replaced by CategoryBanner"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Open the app, launch the journal wizard, verify:
- Category banner shows with icon + colored background
- Progress dots show dividers between categories
- Banner color changes when advancing past a category boundary
- Confetti fires on category completion
- Toast appears: "[Category Name] — Done!"
- Existing functionality (back, finish, draft save) still works

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review findings for category milestones"
```
