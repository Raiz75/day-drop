# DayDrop — MVP Design Spec

**Date:** 2026-08-23
**Status:** Approved design, pending implementation plan
**Reference project:** `../cash-guard` — conventions, patterns, and PWA setup are mirrored from it.

---

## 1. Overview

DayDrop is a mobile-first personal journal tracker PWA. Journaling is not typing — it is a
16-step story-like flow of taps (radio / checkbox / select) with a few short text moments.
Submitted days render as a progress dashboard: streaks, calendar heatmap, trend chart, and a
monthly reward system.

Everything is local-first: data lives in IndexedDB via Dexie. No server, no auth, no accounts.

### Goals

- Zero-friction daily entry (tap-through, about one minute)
- Dashboard-first: see progress, not entries
- Monthly reward unlock driven by consistent high scores
- Installable, offline-capable PWA

### Non-goals (MVP)

- Multi-device sync, accounts, cloud backup
- Notifications / reminders
- Customizable questions or option sets
- Photo attachments

---

## 2. Tech Stack & Conventions

| Concern | Choice |
|---|---|
| Framework | Next.js 16.3 App Router, React 19, TypeScript; all pages `force-dynamic`, client-driven |
| UI | shadcn/ui Base UI variant, Tailwind v4, Tabler icons (`@tabler/icons-react`) |
| DB | `dexie` + `dexie-react-hooks` (`useLiveQuery` reads only) |
| Validation | `zod` per-step schemas (no react-hook-form — the wizard uses its own step machine) |
| Toasts | `sonner` |
| Charts | `recharts` via shadcn `ChartContainer` |
| IDs | `uuid` v4 |
| Theme | `next-themes`, oklch semantic tokens, class-based dark mode; warm amber/coral palette to differ from cash-guard teal |
| Tests | vitest + happy-dom + @testing-library/*, mock-Dexie pattern (same as cash-guard) |

### Doctrine (mirrored from cash-guard)

- Local-first; never seed the DB with fake data.
- **Never write inside `useLiveQuery`** (ReadonlyError). All writes go through `lib/db/repository.ts`.
- Strict layering: `schema.ts` -> `repository.ts` -> `hooks/use*.ts` -> Views.
- Every code file starts with an `AI-CONTEXT-NOTE` JSON header on line 1 (cash-guard format).
- Verification gate before claiming done: `npm run build && npm run lint && npm test`.
- Thin route pages render one big `<X>View.tsx`; dialogs are separate component files.
- Page shell: sticky `Header` + centered `max-w-md` column + bottom-nav clearance (`pb-20`).

---

## 3. Architecture & File Structure

```
app/
  layout.tsx                 # fonts, metadata/viewport/manifest links, ThemeProvider, Toaster
  globals.css                # Tailwind v4 tokens (oklch), dark variant
  page.tsx                   # "/" dashboard
  habits/page.tsx            # habits manager
  settings/page.tsx          # settings
components/
  ui/                        # shadcn primitives (add: card, dialog, checkbox, radio-group,
                             #   select, input, textarea, sonner, progress, badge, sheet,
                             #   alert-dialog, label)
  shared/
    Header.tsx               # sticky top bar (+ theme toggle)
    BottomNav.tsx            # Home / Habits / Settings
    Fab.tsx                  # floating + button (dashboard only)
  dashboard/
    DashboardView.tsx        # orchestrator
    RewardBanner.tsx         # monthly progress / earned / missed states
    HeatmapCalendar.tsx      # month grid; tap day -> DayDetailSheet
    DayDetailSheet.tsx       # story-style readout of one entry
    StreakChips.tsx          # horizontally scrolling streak cards
    TrendChart.tsx           # 30-day total-score trend (recharts)
  journal/
    JournalWizard.tsx        # full-screen overlay: step machine + draft autosave
    StepRenderer.tsx         # dispatches per-type step components
    RadioStep.tsx            # s1 s2 s4 s6 s9 (+ generic tier radio for s4/s6/s7)
    CheckboxStep.tsx         # s3 s5 (s5 enforces rest-day exclusivity)
    SleepStep.tsx            # s8 two selects
    TextStep.tsx             # s10-s12 (min 20 chars), s15 (nullable)
    TasksChecklistStep.tsx   # s13 checklist + carry-over warning dialog
    TomorrowPlanStep.tsx     # s14 list editor (>= 1 item)
    HabitsStep.tsx           # s16 habit checklist w/ day counters
    CelebrationScreen.tsx    # habit day-100 / reward-unlock celebration
  habits/
    HabitsView.tsx           # active (day N/100) + archived "solidified" lists
    HabitDialog.tsx          # add/edit habit
  settings/
    SettingsView.tsx         # reward preset, scoring reference, export/import,
                             #   theme toggle, app version + SW update prompt
lib/
  db/schema.ts               # Dexie class + all types
  db/repository.ts           # sole write path to IndexedDB
  hooks/                     # useEntries, useHabits, useMeta, useHydrated,
                             #   useServiceWorkerUpdate
  journal/steps.ts           # STEPS[16] typed config (single source of truth)
  scoring.ts                 # pure score fns + monthly calc (tunable constants)
  streaks.ts                 # pure streak computations
  carryover.ts               # s13 -> s14 task logic
  validations/journal.ts     # zod schemas per step
  format.ts                  # date helpers ('YYYY-MM-DD'), month math, duration
  exportImport.ts            # JSON serialize / parse+validate / merge
  utils.ts                   # cn()
  version.ts                 # generated by scripts/stamp-version.mjs
public/sw.js                 # hand-rolled service worker (cash-guard pattern)
public/manifest.webmanifest
public/images/               # maskable icon(s)
scripts/stamp-version.mjs    # stamps semver into sw.js, manifest, lib/version.ts
tests/*.test.ts              # one file per lib module + wizard machine + repository
```

## 4. Data Model (`lib/db/schema.ts`)

Dexie database name `"day-drop"`. Versioned stores, additive migrations.

```ts
interface DayEntry {
  date: string;            // 'YYYY-MM-DD' — PRIMARY KEY (one entry per day)
  work: string;            // s1 option id
  health: string;          // s2 option id
  weather: string[];       // s3 option ids (may be empty)
  stepsTier: number;       // s4 tier index 0-6
  workouts: string[];      // s5 option ids
  screenTimeTier: number;  // s6 tier index 0-7
  readingTier: number;     // s7 tier index 0-6
  sleptAt: string;         // s8 'HH:mm', 20:00-23:59
  wokeAt: string;          // s8 'HH:mm', 00:00-10:00
  mood: string;            // s9 option id
  highlight: string;       // s10, min 20 chars
  improve: string;         // s11, min 20 chars
  grateful: string;        // s12, min 20 chars
  todayTasks: { text: string; done: boolean }[]; // s13 snapshot
  tomorrowPlan: string[];  // s14, at least 1 item
  bucketList: string | null; // s15, nullable
  habitsChecked: string[]; // s16 habit ids checked that day
  createdAt: number;
  updatedAt: number;
}

interface Habit {
  id: string;              // uuid
  name: string;
  startedOn: string;       // 'YYYY-MM-DD' = day 1
  archivedAt: string | null; // set on manual archive OR auto at day 100
}

interface MetaRow {
  key: string;             // 'journal-draft', 'reward:YYYY-MM', 'celebrated:<habitId>'
  value: unknown;
}
```

Stores:

```
entries: "date"
habits:  "id, archivedAt, startedOn"
meta:    "key"
```

### Drafts

In-progress wizard state lives in `meta` under key `'journal-draft'`:
`{ date: 'YYYY-MM-DD', stepIndex: number, answers: Partial<DayEntry> }`.
Autosaved on every answer change. Silently discarded if `date !== today`.

### Task carry-over rule

Today's s13 checklist = the `tomorrowPlan` of the most recent entry **before today**,
regardless of gaps. First-ever entry (or no prior plan): empty checklist with a friendly
empty-state note ("No tasks planned — enjoy a free day!").

---

## 5. Journal Wizard Spec (the 16 steps)

Full-screen overlay launched by the dashboard FAB — not a route. Internal step machine over
the typed `STEPS[16]` config array in `lib/journal/steps.ts`. Progress dots + "step N/16".
Back preserves answers; reopening resumes from the draft.

If today's entry already exists, the FAB becomes an edit affordance that reopens the wizard
pre-filled (same-day editable only; locks past midnight).

Option ids are stable slugs (e.g. `'fun'`, `'productive'`, `'under-weather'`); display text
lives in the config so copy can change without migrations.

| # | Question | Type | Options / Rules |
|---|---|---|---|
| s1 | How was your work today? | radio | i had fun today / i was super productive / it was boring as hell / soooo stressful / annoying honestly... |
| s2 | How was your health today? | radio | i feel healthy today / I'm feeling under the weather / I've got cold symptoms ugh / i had a headache / my stomach hurts / i'm feverish... |
| s3 | What's the weather like today? | checkbox | it's hot and sunny out / it's sunny with some clouds / it's cloudy and gloomy / there's light rain falling / it's pouring rain outside / it's literally stormy out there |
| s4 | How many steps did you take today? | tier radio | barely walked (0–3000) / i did a little bit (3001–5000) / i walked a decent amount (5001–7000) / i was active today (7001–8000) / i walked a lot (8001–9000) / i was on fire (9001–10000) / i went above and beyond (10000+) |
| s5 | What workout did you do today? | checkbox | it's a rest day for me / i went for a walk / i went for a run / i played sports / i did upper body / i did lower body / i did a full body workout. Rest day is mutually exclusive with any workout option (checking one side unchecks the other). |
| s6 | How much screen time did you have? | tier radio | i barely used my phone (0–1h) / i used it a little (2h) / i used it moderately (3h) / i spent quite some time (4h) / i was on it a lot (5h) / i was glued to it (6h) / i was on it way too much (7h) / i'm ashamed (8h+) |
| s7 | How many pages did you read today? | tier radio | i didn't read at all (0–10p) / i read a bit (11–20) / i read a decent amount (21–40) / i read a lot (41–60) / i was on a roll (61–80) / i almost finished a book (81–100) / i'm a reading machine (100+) |
| s8 | When did you sleep and wake up? | dual select | sleptAt select 20:00–23:59, wokeAt select 00:00–10:00, 15-minute granularity. Both required before Next. |
| s9 | How are you feeling today? | radio | i'm really happy / i'm full of energy / i'm just okay / i'm bored out of my mind / i'm so tired / i'm feeling anxious / i'm feeling sad today / i'm lowkey angry / i'm feeling lonely |
| s10 | What was the highlight of your day? | textarea | min 20 chars |
| s11 | How could today have been better? | textarea | min 20 chars |
| s12 | What am I grateful for today? | textarea | min 20 chars |
| s13 | What's your daily plan looking like today? | checklist | Today's carried-over tasks as checkboxes. On Next with unchecked tasks: sonner warning toast + dialog "Move N unfinished tasks to tomorrow?" Yes -> they pre-fill s14; No -> they are dropped from tomorrow's plan. |
| s14 | What's your daily plan for tomorrow? | list editor | Pre-filled with carried-over tasks (editable/deletable). Add new via input + enter. Validation: at least 1 item. |
| s15 | What's on my bucket list for this month? | textarea | Optional (nullable), saved as null when empty |
| s16 | What habit did you solidify today? | checklist | All active habits w/ day counters (day N/100). Check what you did today. Empty state if no active habits: prompt to add some on the Habits page. |

Submit = single `repository.addEntry()` transaction:
write entry (or overwrite when editing today) -> clear draft -> update habit day counters ->
auto-archive habits whose day 100 lands on this entry date (queue celebration screens).

## 6. Scoring System (`lib/scoring.ts`)

Every scored metric awards **1-10 points daily, never 0**. All point values are exported
constants in one file so they stay trivially tunable. The 7 reward metrics are
s2 health, s4 steps, s5 workout, s6 screen time, s7 reading, s8 sleep, s16 habits.
s1 work, s3 weather, s9 mood are display-only and unscored.

| Metric | Score rule |
|---|---|
| s2 Health | healthy = 10; under weather = 5; cold symptoms = 4; headache = 4; stomach hurts = 3; feverish = 2 |
| s4 Steps | tier scores `[1, 2, 4, 6, 8, 9, 10]` across the 7 tiers |
| s5 Workout | rest day = 1; walk = 3; sports = 5; upper = 5; lower = 5; run = 6; full body = 8. Sum selections, cap 10, floor 1 |
| s6 Screen | tier scores `[10, 9, 7, 5, 4, 3, 2, 1]` (inverted: less is better) |
| s7 Reading | tier scores `[1, 3, 5, 7, 8, 9, 10]` across the 7 tiers |
| s8 Sleep | hours h = wokeAt minus sleptAt (mod 24). h in [7,9] gives 10; [6,7) or (9,10] gives 7; [5,6) or (10,11] gives 4; else 2 |
| s16 Habits | all checked = 10; partial = `1 + round(9 * checked/total)`; none = 1 |

Daily total = sum of the 7 metric scores (max 70).

### Monthly reward

- Max possible month score = `daysWithEntries * 70` — skipped days neither help nor hurt.
- **Unlocked when `monthScore / maxPossible >= 0.80`.**
- Anti-gaming coverage guard: eligible only if
  `daysWithEntries >= ceil(daysInMonth * MIN_MONTH_COVERAGE_RATIO)` with ratio 0.5.
- Evaluation is **lazy**: on every app open, any finished month lacking a final record in
  `meta` (`reward:YYYY-MM`) is evaluated then. No server cron needed.

Reward lifecycle per month: `pending` (no preset text) -> `active` (text set, month running)
-> `earned` / `missed` (evaluated) -> `claimed`.

## 7. Dashboard

Top-to-bottom inside the `max-w-md` shell:

1. **Greeting row** - date + journaling-streak flame chip (consecutive days with an entry,
   ending today or yesterday).
2. **RewardBanner** - current month progress bar of `monthScore / (0.80 * maxSoFar)`,
   reward text or a "Set your monthly reward" CTA, styled per lifecycle state. Earned
   rewards show a claim button + one-time confetti celebration.
3. **HeatmapCalendar** - GitHub-style month grid with month navigation arrows. Color
   intensity buckets the daily total over 70 pts into 4 shades: 1-17, 18-35, 36-52, 53-70;
   no entry = empty cell. Tapping a journaled day opens **DayDetailSheet**, a story-style
   readout: weather icons, workout chips, sleep window, highlight quote, tasks with
   checkmarks, habit checks, mood badge.
4. **StreakChips** - horizontal scroll of 8 chips: Journal + one per scored metric.
   A metric streak = consecutive submitted days where that metric scored at least
   `GOOD_SCORE_THRESHOLD` (7). Zero state reads "start a streak".
5. **TrendChart** - last 30 days daily-total line chart (recharts via ChartContainer),
   gaps on missing days.

FAB (+) floats bottom-right above BottomNav.

---

## 8. Habits Page

- Active list sorted by start date; each row shows name, `day N/100`, and a small progress
  ring/bar. Edit and delete actions (delete asks confirmation via alert-dialog; deleting
  keeps past entries' `habitsChecked` ids but they simply render as unknown/removed).
- Add habit: name required, starts today (`startedOn = today`). Max ~12 active habits to
  keep s16 usable (soft cap, warn only).
- Archived section: "Solidified" habits with completion date; celebration shown once when
  auto-archiving at day 100 (flag in `meta`, key `'celebrated:<habitId>'`). Manual archive
  is allowed anytime without celebration.

---

## 9. Settings Page

- Monthly reward preset: pick month (default current), text input for the reward.
- Scoring reference: read-only table of the current point rules.
- Data: export JSON (entries + habits + rewards meta) / import JSON (zod-validated;
  duplicates by primary key are skipped, report shows imported/skipped counts).
- Appearance: theme toggle (system/light/dark via next-themes).
- About: app version (from generated `lib/version.ts`) + service-worker update prompt
  (cash-guard's `useServiceWorkerUpdate` pattern).

## 10. PWA Setup (hand-rolled, cash-guard pattern)

- `public/manifest.webmanifest`: name "DayDrop", short_name "DayDrop", `start_url: "/"`,
  `display: "standalone"`, theme_color from palette, maskable 512px icon, stamped version.
- `public/sw.js`: versioned cache (`day-drop-v<semver>`), install precaches `/`,
  manifest, icon; activate cleans old caches + `clients.claim()`; fetch = cache-first for
  same-origin GETs with runtime caching; offline navigations fall back to cached `/`.
  Does NOT skipWaiting on install - waits for a `{type:"SKIP_WAITING"}` message so updates
  are user-approved via the Settings prompt.
- Registration happens in production only (dashboard mount), like cash-guard.
- iOS: appleWebApp meta tags in layout.
- `scripts/stamp-version.mjs` runs before every build (`node scripts/stamp-version.mjs && next build`).

---

## 11. Validation & Error Handling

- zod schemas per step type enforce: required single choice; min 20 chars on s10-s12;
  at least 1 tomorrow task; valid time ranges on s8. Next button disabled until the
  current step validates.
- IndexedDB unavailable / blocked (private-mode Safari edge cases): full-screen fallback
  page explaining data cannot be stored, no app shell rendered.
- Corrupt draft row: discarded silently, wizard starts fresh.
- Import errors: file parse or schema failure -> destructive-free error toast; DB untouched.
- Habit referenced by entries but deleted: dashboard/sheet renders it as "removed habit".

---

## 12. Testing Strategy

vitest + happy-dom + @testing-library (cash-guard config: `tsconfigPaths`, jest-dom setup,
`.ts` tests using React.createElement):

- Pure modules tested directly: `scoring.test.ts` (every metric boundary, cap/floor,
  monthly threshold + coverage guard), `streaks.test.ts`, `carryover.test.ts`
  (carry-over, drop case), `validations.test.ts`, `format.test.ts`, `exportImport.test.ts`.
- Wizard step machine: headless reducer test - advance/back/validation/draft autosave/
  resume/edit-today flow.
- Repository: mock-Dexie pattern (`vi.mock("@/lib/db/schema")`) covering addEntry
  transaction, draft clear, habit day-counter increments, day-100 auto-archive,
  reward lazy evaluation, import merge.
- Components: DashboardView renders chips/banner states; TasksChecklistStep warning dialog.

Verification gate: `npm run build && npm run lint && npm test` all green.

---

## 13. Out of Scope / Future

Reminders/notifications, widgets, multi-device sync, photo attachments, custom question
editor, yearly views, CSV export, sharing day cards as images.
