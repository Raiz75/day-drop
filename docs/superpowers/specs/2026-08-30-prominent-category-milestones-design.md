# Prominent Category Display + Category Milestones

**Date:** 2026-08-30
**Status:** Approved

## Problem

The current journal wizard shows category headers only at the first step of each category group. Users lose context of which category they're in mid-way through questions. The step dots are uniform with no visual distinction between category groups.

## Goal

Make categories prominent and always visible, with a satisfying milestone moment when completing each category group.

## Design

### 1. Sticky Category Banner

**What:** A persistent banner at the top of the wizard showing the current category name + icon. Replaces the inline `CategoryHeader` component.

**Layout:**
```
┌─────────────────────────────┐
│  🏋️ Physical Well-being     │  ← sticky, colored bg per category
│  ● ● ● ○ ○ ○               │  ← progress dots with milestone markers
│  How many hours did you     │
│  sleep?                     │
│  [options]                  │
│                             │
│  ← Back              Next → │
└─────────────────────────────┘
```

**Category colors:**
| Category | Color accent | Icon (tabler-icons-react) |
|----------|-------------|------|
| Physical Well-being | Green (`emerald`) | `IconRun` |
| Mental & Emotional | Blue (`sky`) | `IconBrain` |
| Relationship Well-being | Purple (`violet`) | `IconHeart` |
| Work & Productivity | Amber (`amber`) | `IconBolt` |

**Behavior:**
- Banner is sticky at top of wizard overlay
- When switching categories: banner background color morphs (CSS transition ~300ms), icon + name crossfade
- Category name is large, bold, visually dominant over the question
- Icon rendered via tabler-icons-react, sized to match heading
- The question sits below the banner, still readable but visually grouped under its category

### 2. Progress Dots with Milestone Markers

**What:** Enhanced step dots that show category boundaries and completion status.

**Visual:**
```
● ● ● │ ○ ○ ○ │ ○ ○ ○ ○ │ ○ ○ ○ ○ │ ○
  Physical    Mental     Social     Productivity  Habits
```

**Behavior:**
- Subtle vertical divider (`│`) between category groups
- Completed category dots: all turn solid primary color, divider disappears
- Current category group: dots get a subtle glow/highlight ring
- Future category dots: muted
- Category labels appear below the dots (small text, only for completed + current)

### 3. Celebration Burst

**What:** A quick confetti animation + toast when transitioning between categories.

**Trigger:** User advances past the **last step of a category group** (not on wizard submit).

**Sequence:**
1. User clicks "Next" on the last step of a category
2. Canvas-based confetti burst fires (top-center of wizard, ~80 particles, 800ms duration)
3. Toast appears: "Physical Well-being — Done!" with category's tabler icon
4. Banner animates to next category color
5. Next category's first question loads

**No full-screen takeover** — just a quick, satisfying moment.

**Implementation:**
- Use `canvas-confetti` library (lightweight, ~6KB gzipped, well-maintained)
- Confetti colors match the completed category's accent color
- Toast via existing `sonner` integration

## Files to Modify

| File | Change |
|------|--------|
| `components/journal/CategoryHeader.tsx` | Replace with sticky banner, add color/icon logic, animation |
| `components/journal/JournalWizard.tsx` | Restructure layout: sticky banner at top, dots below banner, trigger celebration on category boundary |
| `components/journal/ProgressDots.tsx` | New component — extracted from inline `ProgressDots`, add milestone markers + category labels |
| `components/journal/CategoryCelebration.tsx` | New component — confetti canvas + category-complete toast |
| `lib/journal/steps.ts` | Add `color` and `icon` fields to `CategoryDef` |

## Data Changes

`CategoryDef` gains two optional fields:
```ts
export interface CategoryDef {
  id: string;
  name: string;
  stepIds: StepId[];
  color: string;   // tailwind color name (emerald, sky, violet, amber)
  icon: string;    // tabler-icons-react icon component name (e.g. "IconRun", "IconBrain")
}
```

No schema migration needed — these are display-only fields not persisted to IndexedDB.

## Testing

- Unit: test `getCategoryForStep` utility returns correct category + color
- Visual: verify banner color transitions on category switch
- Visual: verify confetti fires only on category boundary advancement (not mid-category or on finish)
- Accessibility: banner announced via `aria-live="polite"` on category change
- Build: `npm run build` passes
- Existing tests: `npm test` passes (no data model changes)
