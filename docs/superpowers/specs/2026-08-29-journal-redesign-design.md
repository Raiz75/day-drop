# DayDrop Journal Redesign — Design Spec

## Overview

Redesign the DayDrop journal wizard from 16 flat steps to 18 steps across 4 well-being categories. Replace the old field set entirely (big-bang migration, fresh start). Re-score from 7 metrics/70 pts to 4 metrics/40 pts. Lower aura threshold from 1500 to 1000.

## Motivation

The original wizard covers general daily life (weather, steps, screen time, reading). The new structure focuses on 4 pillars of well-being: Physical, Mental, Social, and Productivity — giving a more holistic daily snapshot.

---

## Data Schema

### New `DayEntry` (replaces all old fields)

```ts
interface DayEntry {
  date: string;                  // 'YYYY-MM-DD', primary key

  // Physical Well-being
  sleepDuration: number;         // tier index (5-6h, 6-7h, 7-8h, 8-9h, 9-10h, 10h+)
  exercise: string;              // 'light' | 'medium' | 'heavy'
  nutrition: string[];           // ['meat', 'vegetables', 'fruit'] multi-select
  hydration: number;             // tier index (500ml, 1L, 1.5L, 2L+)
  timeOutdoor: number;           // tier index (<30min, 30-60min, 1-2h, 2h+)
  physicalFeeling: string;       // 'unwell' | 'okay' | 'healthy' | 'energetic'

  // Mental & Emotional
  moodCheck: string;             // radio option id (happy, energetic, okay, bored, tired, anxious, sad, angry, lonely)
  reading: string;               // radio option id ('none' | 'a-bit' | 'decent' | 'a-lot' | 'on-a-roll' | 'bookworm')
  highlights: string;            // text, min 50 chars
  couldHaveBeenBetter: string;   // text, min 50 chars
  storyOfTheDay: string | null;  // text, optional

  // Relationship Well-being
  familyTime: boolean;           // yes/no radio → boolean
  conversations: boolean;        // yes/no radio → boolean
  kindnessActs: boolean;         // yes/no radio → boolean
  connectionStatus: string;      // 'connected' | 'neutral' | 'lonely'

  // Work & Productivity
  learnedToday: string;          // text, min 20 chars
  tasksFinished: string;         // text, min 20 chars
  deepWorkHours: number;         // tier index (0h, 1h, 2h, 3h, 4h+)
  workFeeling: string;           // 'focused' | 'scattered' | 'productive' | 'drained'

  // Habits (unchanged)
  habitsChecked: string[];
  activeHabitCount: number;

  // Meta
  createdAt: number;
  updatedAt: number;
}
```

### Dexie Migration

- Bump to `version(3)` — wipes `entries` table (fresh start)
- `habits` and `meta` tables stay intact (no migration needed)
- Old v1/v2 entry data is permanently deleted

---

## Wizard Steps

### Category Structure

4 categories with section headers shown between steps:

| Category | Display Name | Steps |
|---|---|---|
| Physical | "Physical Well-being" | sleepDuration, exercise, nutrition, hydration, timeOutdoor, physicalFeeling |
| Mental | "Mental & Emotional" | moodCheck, reading, highlights, couldHaveBeenBetter, storyOfTheDay |
| Social | "Relationship Well-being" | familyTime, conversations, kindnessActs, connectionStatus |
| Productivity | "Work & Productivity" | learnedToday, tasksFinished, deepWorkHours, workFeeling |

### Step Definitions

| # | Step ID | Question | Type | Options / Details |
|---|---|---|---|---|
| 1 | `sleepDuration` | "how many hours did you sleep?" | tier-radio | 5-6h, 6-7h, 7-8h, 8-9h, 9-10h, 10h+ |
| 2 | `exercise` | "what level of exercise did you get?" | radio | light, medium, heavy |
| 3 | `nutrition` | "what did you eat today?" | checkbox | meat, vegetables, fruit |
| 4 | `hydration` | "how much water did you drink?" | tier-radio | 500ml, 1L, 1.5L, 2L+ |
| 5 | `timeOutdoor` | "how much time did you spend outside?" | tier-radio | <30min, 30-60min, 1-2h, 2h+ |
| 6 | `physicalFeeling` | "how does your body feel?" | radio | unwell, okay, healthy, energetic |
| 7 | `moodCheck` | "how are you feeling today?" | radio | happy, energetic, okay, bored, tired, anxious, sad, angry, lonely |
| 8 | `reading` | "how many pages did you read today?" | radio | none (0-10), a bit (11-20), decent (21-30), a lot (31-40), on a roll (41-50), bookworm (51+) |
| 9 | `highlights` | "what was the highlight of your day?" | text | min 50 chars |
| 10 | `couldHaveBeenBetter` | "how could today have been better?" | text | min 50 chars |
| 11 | `storyOfTheDay` | "what's the story of your day?" | text | optional |
| 12 | `familyTime` | "did you spend time with your loved ones or people that are dear to you?" | radio | yes, no |
| 13 | `conversations` | "did you have meaningful conversations today?" | radio | yes, no |
| 14 | `kindnessActs` | "did you perform any acts of kindness today?" | radio | yes, no |
| 15 | `connectionStatus` | "how connected do you feel?" | radio | connected, neutral, lonely |
| 16 | `learnedToday` | "what did you learn today?" | text | min 20 chars |
| 17 | `tasksFinished` | "what tasks did you finish?" | text | min 20 chars |
| 18 | `deepWorkHours` | "how many hours of deep work did you do?" | tier-radio | 0h, 1h, 2h, 3h, 4h+ |
| 19 | `workFeeling` | "how did work feel?" | radio | focused, scattered, productive, drained |

**Note:** Habits step (step 20) remains unchanged at the end.

### Validation Rules

- All fields required except `storyOfTheDay` (optional)
- Text fields: `highlights` and `couldHaveBeenBetter` require min 50 chars; `learnedToday` and `tasksFinished` require min 20 chars
- `familyTime`, `conversations`, `kindnessActs` are boolean (yes/no radio)
- `nutrition` is multi-select checkbox (at least 1 option must be selected)

---

## Scoring System

### Metrics

4 metrics, each scored 1-10, daily max = **40 pts**

| Metric | Key | Fields | Scoring |
|---|---|---|---|
| Physical | `physical` | sleepDuration, exercise, nutrition, hydration, timeOutdoor, physicalFeeling | Weighted combo (see below) |
| Mental | `mental` | moodCheck, reading, highlights, couldHaveBeenBetter, storyOfTheDay | Weighted combo (see below) |
| Social | `social` | familyTime, conversations, kindnessActs, connectionStatus | Weighted combo (see below) |
| Productivity | `productivity` | learnedToday, tasksFinished, deepWorkHours, workFeeling | Weighted combo (see below) |

### Scoring Logic

#### Physical (weighted average, capped at 10)

| Field | Scoring |
|---|---|
| sleepDuration | tier-scored: [3, 5, 10, 8, 6, 3] (7-8h = 10) |
| exercise | light=4, medium=7, heavy=10 |
| nutrition | 1 item=4, 2 items=7, 3 items=10 |
| hydration | tier-scored: [3, 5, 8, 10] |
| timeOutdoor | tier-scored: [2, 5, 8, 10] |
| physicalFeeling | unwell=2, okay=5, healthy=8, energetic=10 |

Formula: `round(avg(sleep, exercise, nutrition, hydration, outdoor, feeling))`, clamped [1, 10]

#### Mental (weighted average, capped at 10)

| Field | Scoring |
|---|---|
| moodCheck | option points: happy=10, energetic=9, okay=6, bored=4, tired=3, anxious=3, sad=2, angry=2, lonely=2 |
| reading | option points: none=1, a-bit=3, decent=5, a-lot=7, on-a-roll=9, bookworm=10 |
| highlights | filled=+1 bonus |
| couldHaveBeenBetter | filled=+1 bonus |
| storyOfTheDay | filled=+1 bonus (optional, max +1) |

Formula: `round(avg(moodScore, readingScore, textBonusScaled))`, clamped [1, 10] — where textBonusScaled = round(avg(highlightsBonus, improveBonus, storyBonus)) * 10 (bonuses are 0/1 each, scaled to 0-10)

#### Social (weighted average, capped at 10)

| Field | Scoring |
|---|---|
| familyTime | yes=8, no=2 |
| conversations | yes=8, no=2 |
| kindnessActs | yes=8, no=2 |
| connectionStatus | connected=10, neutral=5, lonely=2 |

Formula: `round(avg(family, conversations, kindness, connection))`, clamped [1, 10]

#### Productivity (weighted average, capped at 10)

| Field | Scoring |
|---|---|
| learnedToday | filled=+1 bonus |
| tasksFinished | filled=+1 bonus |
| deepWorkHours | tier-scored: [1, 4, 7, 9, 10] |
| workFeeling | focused=10, productive=8, scattered=4, drained=2 |

Formula: `round(avg(deepWorkScore, workFeelingScore, textBonusScaled))`, clamped [1, 10] — where textBonusScaled = round(avg(learnedBonus, tasksBonus)) * 10 (bonuses are 0/1 each, scaled to 0-10)

### Aura Points

- Threshold: **1000 pts** (was 1500)
- Same mechanic: accumulate daily scores, redeem at threshold for +1 aura
- `pointsBalance = totalPoints - (1000 * redeemedCount)`

---

## Component Changes

### Files to Rewrite

| File | Change |
|---|---|
| `lib/journal/steps.ts` | New StepIds, 4 categories with metadata, 19 step definitions |
| `lib/scoring.ts` | 4 metrics, new scoring functions for each category |
| `lib/db/schema.ts` | New DayEntry interface, v3 migration (wipe entries) |
| `lib/db/repository.ts` | Update `submitEntry` for new field set |
| `lib/validations/journal.ts` | New zod schema matching new DayEntry |
| `lib/exportImport.ts` | v3 export format |

### Files to Modify

| File | Change |
|---|---|
| `components/journal/JournalWizard.tsx` | Category header rendering between step groups |
| `components/journal/RadioStep.tsx` | Works as-is for new radio fields |
| `components/journal/CheckboxStep.tsx` | Works as-is for nutrition multi-select |
| `components/journal/TierRadioStep.tsx` | Works as-is for new tier fields |
| `components/journal/TextInputStep.tsx` | Update minChars handling |
| `components/dashboard/DashboardView.tsx` | 4 metric cards instead of 7 |
| `components/dashboard/RewardBanner.tsx` | AURA_COST = 1000 |
| `components/dashboard/StreakChips.tsx` | Update metric keys |
| `components/dashboard/TrendChart.tsx` | Update metric keys |
| `components/settings/SettingsView.tsx` | Export format v3 |
| `lib/streaks.ts` | Update metric key references |
| `lib/carryover.ts` | No change needed (habits carry over) |

### Files Unchanged

- `components/habits/` — habits system stays as-is
- `components/shared/` — shared UI components unchanged
- `public/sw.js` — service worker unchanged
- `lib/format.ts` — date/time utilities unchanged (sleepHours removed, but format utilities stay)

### New Components

- `components/journal/CategoryHeader.tsx` — renders category name between wizard step groups

---

## Dashboard

### Metric Cards (4 instead of 7)

| Card | Label | Icon suggestion |
|---|---|---|
| Physical | "Physical Well-being" | body/fitness icon |
| Mental | "Mental & Emotional" | brain/mind icon |
| Social | "Relationship Well-being" | people/heart icon |
| Productivity | "Work & Productivity" | briefseye/bolt icon |

### Existing Dashboard Features (adapted)

- **Month heatmap** — same logic, scores from 4 metrics
- **Flame streak** — same logic,基于 daily total >= threshold
- **Streak chips** — track streaks per metric (4 chips)
- **Trend chart** — 30-day line chart, 4 lines (one per metric)
- **Aura banner** — X/1000 pts, "Reward self" at threshold, +1 aura toast
- **FAB** — launches wizard (unchanged)

---

## Migration & Fresh Start

- Dexie v3 wipes `entries` table on upgrade
- `habits` table preserved (active habits carry over)
- `meta` table preserved (aura records, drafts stay)
- Dashboard shows empty state until first new entry is submitted
- No data migration logic needed — clean break

---

## Testing

- Update `tests/scoring.test.ts` for new 4-metric scoring
- Update `tests/journal-steps.test.ts` for new step definitions
- Update `tests/schema.test.ts` for v3 migration
- Add test for category grouping in wizard
- Run `npm run build` and `npm test` to verify

---

## Implementation Order

1. Schema + migration (`lib/db/schema.ts`)
2. Steps definition (`lib/journal/steps.ts`)
3. Scoring engine (`lib/scoring.ts`)
4. Validation (`lib/validations/journal.ts`)
5. Repository updates (`lib/db/repository.ts`)
6. Wizard components (category headers, step adaptations)
7. Dashboard (metric cards, charts, aura)
8. Settings (export format)
9. Tests
10. Build verification
