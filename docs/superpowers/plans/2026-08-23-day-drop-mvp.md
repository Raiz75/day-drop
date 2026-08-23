# DayDrop MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the DayDrop local-first journal PWA per `docs/superpowers/specs/2026-08-23-day-drop-mvp-design.md`: a 16-step tap-through daily wizard feeding a streaks/heatmap/reward dashboard, backed by Dexie, installable offline.

**Architecture:** Client-first Next.js App Router (all pages `force-dynamic`). Strict layering: `lib/db/schema.ts` (types + Dexie) -> `lib/db/repository.ts` (sole write path, atomic transactions) -> `lib/hooks/use*` (read-only `useLiveQuery`) -> `<X>View.tsx` orchestrators. Wizard = full-screen overlay driven by a typed `STEPS[16]` config + headless reducer, autosaving a draft row in `meta`. PWA = hand-rolled `public/sw.js` + manifest (cash-guard pattern).

**Tech Stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Base UI variant) · Tabler icons · dexie + dexie-react-hooks · zod · sonner · recharts · uuid · next-themes · vitest + happy-dom + @testing-library.

## Global Constraints

- Every created code file (app routes, components outside `ui/`, everything under `lib/`, `scripts/`, `public/sw.js`) starts with an `AI-CONTEXT-NOTE` single-line JSON comment on line 1, cash-guard format: keys `R`, `IDD`, `A`, `AB`, `E`. Files under `components/ui/` are exempt.
- NEVER call a Dexie write inside `useLiveQuery` (ReadonlyError). All writes go through exported `lib/db/repository.ts` functions.
- Never seed the DB with fake data. No `.env` files. Node >= 20.9.
- Verification gate before claiming any task done beyond its own tests: `npm run build && npm run lint && npm test` must pass.
- Semantic color tokens only (`bg-primary`, `text-muted-foreground`, ...); no hardcoded green/red/hex in components.
- Base UI gotchas (from cash-guard): polymorphism via the `render` prop, NOT `asChild`; set `nativeButton={false}` when a Button renders a `<Link>`; Select values are `string | null` - coerce with `?? ""`.
- No `setState` directly inside `useEffect` (lint rule `react-hooks/set-state-in-effect`); gate hydration-sensitive renders behind `useHydrated()`.
- This is Next.js 16 with breaking changes vs older training data: when unsure about routing/metadata/view APIs, consult `node_modules/next/dist/docs/` guides; follow the existing scaffold's `LayoutProps<"/">` typed-routes style.
- Exact user-facing question/option copy lives ONLY in `lib/journal/steps.ts` (stable slug ids + display labels). Components never hardcode option strings.
- Dates are stored as `'YYYY-MM-DD'` strings; times as `'HH:mm'`. Month keys `'YYYY-MM'`.

## Reference Implementation

The sibling project `../cash-guard` (absolute: `C:\Users\RAIZEN B. INGALLA\Documents\@cyber-space\personal-proj\cash-guard`) is the canonical source for: `vitest.config.mts`, `vitest.setup.ts`, `scripts/stamp-version.mjs`, `public/sw.js`, `public/manifest.webmanifest` structure, `components/shared/Header.tsx` / `BottomNav.tsx`, `hooks/useHydrated.ts` / `useServiceWorkerUpdate.ts`, mock-Dexie test helpers, and AI-CONTEXT-NOTE style. Copy from there rather than inventing.

---

## File Map (final state)

```
app/
  layout.tsx                    # MODIFY: fonts, metadata+viewport+manifest links,
                                #   ThemeProvider, Toaster
  globals.css                   # MODIFY: DayDrop oklch palette tokens
  page.tsx                      # MODIFY: renders DashboardView (force-dynamic)
  habits/page.tsx               # CREATE -> HabitsView
  settings/page.tsx             # CREATE -> SettingsView
components/
  ui/                           # shadcn adds: card dialog checkbox radio-group select
                                #   input textarea sonner progress badge sheet
                                #   alert-dialog label tabs separator
  theme-provider.tsx            # CREATE (next-themes wrapper)
  shared/Header.tsx             # CREATE
  shared/BottomNav.tsx          # CREATE (Home/Habits/Settings)
  shared/Fab.tsx                # CREATE (+ / edit FAB)
  dashboard/DashboardView.tsx   # CREATE
  dashboard/RewardBanner.tsx    # CREATE
  dashboard/HeatmapCalendar.tsx # CREATE
  dashboard/DayDetailSheet.tsx  # CREATE
  dashboard/StreakChips.tsx     # CREATE
  dashboard/TrendChart.tsx      # CREATE
  journal/JournalWizard.tsx     # CREATE (overlay + machine wiring + draft autosave)
  journal/StepRenderer.tsx      # CREATE
  journal/steps/RadioStep.tsx       # CREATE (radio + tier-radio)
  journal/steps/CheckboxStep.tsx    # CREATE (s3; s5 exclusivity handled here)
  journal/steps/SleepStep.tsx       # CREATE
  journal/steps/TextStep.tsx        # CREATE (s10-s12, s15)
  journal/steps/TasksChecklistStep.tsx # CREATE (s13 + carry-over dialog)
  journal/steps/TomorrowPlanStep.tsx   # CREATE (s14 editor)
  journal/steps/HabitsStep.tsx         # CREATE (s16)
  journal/CelebrationScreen.tsx        # CREATE
  habits/HabitsView.tsx         # CREATE
  habits/HabitDialog.tsx        # CREATE
  settings/SettingsView.tsx     # CREATE
lib/
  db/schema.ts                  # CREATE: DayDropDB + all interfaces
  db/repository.ts              # CREATE: sole write path
  hooks/useEntries.ts           # CREATE
  hooks/useHabits.ts            # CREATE
  hooks/useMeta.ts              # CREATE
  hooks/useHydrated.ts          # CREATE (copy cash-guard)
  hooks/useServiceWorkerUpdate.ts # CREATE (copy cash-guard)
  journal/steps.ts              # CREATE: STEPS[16] config (single source of truth)
  journal/machine.ts            # CREATE: wizard reducer + canAdvance
  scoring.ts                    # CREATE
  streaks.ts                    # CREATE
  carryover.ts                  # CREATE
  validations/journal.ts        # CREATE
  format.ts                     # CREATE
  exportImport.ts               # CREATE
  utils.ts                      # EXISTS (cn)
  version.ts                    # GENERATED by scripts/stamp-version.mjs
tests/                          # one *.test.ts per lib module + machine + repository + views
public/sw.js                    # CREATE (cash-guard pattern, "day-drop-v" prefix)
public/manifest.webmanifest     # CREATE
public/images/launcher-512.png  # COPY from cash-guard (stand-in brand icon)
scripts/stamp-version.mjs       # CREATE (copy cash-guard)
vitest.config.mts               # CREATE (copy cash-guard)
vitest.setup.ts                 # CREATE (copy cash-guard)
package.json                    # MODIFY: deps, "build": stamp-version + next build, "test": vitest run
```

---

### Task 1: Dependencies + Vitest infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mts`, `vitest.setup.ts`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: runnable `npm test` script; `@/*` path alias resolution in vitest; `vi.mock("@/lib/db/schema")` capability later tasks depend on.

- [ ] **Step 1: Install runtime dependencies**

```bash
npm i dexie dexie-react-hooks uuid zod sonner recharts next-themes
npm i -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Copy vitest config from cash-guard**

Copy `../cash-guard/vitest.config.mts` and `../cash-guard/vitest.setup.ts` verbatim into project root. Expected content (adjust nothing except nothing - they resolve `@/*` via `resolve.tsconfigPaths: true`, environment `happy-dom`, `globals: true`, setup file wires jest-dom):

```mts
import { defineConfig } from "vitest/config";

export default defineConfig({
  environment: "happy-dom",
  globals: true,
  setupFiles: ["./vitest.setup.ts"],
  exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  resolve: { tsconfigPaths: true },
});
```

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add test script to package.json**

In `scripts`: `"test": "vitest run"`.

- [ ] **Step 4: Write smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("smoke", () => {
  it("runs vitest with jest-dom matchers available", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests, verify green**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.mts vitest.setup.ts tests/smoke.test.ts
git commit -m "chore: deps + vitest infrastructure"
```

### Task 2: Theme tokens, shadcn primitives, layout shell

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `components/theme-provider.tsx`
- Create via CLI: shadcn primitives into `components/ui/`

**Interfaces:**
- Produces: semantic oklch tokens (`--primary` amber/coral family), dark-mode `.dark` variant; root layout exporting metadata with `manifest` link + appleWebApp tags + viewport themeColor; `<ThemeProvider>` and `<Toaster />` mounted app-wide. All later components rely on these.

- [ ] **Step 1: Add shadcn primitives**

```bash
npx shadcn@latest add card dialog checkbox radio-group select input textarea sonner progress badge sheet alert-dialog label tabs separator --yes
```

Expected: files appear in `components/ui/`. Do NOT add AI-CONTEXT-NOTE headers to these.

- [ ] **Step 2: Replace palette in `app/globals.css`**

Keep the Tailwind v4 structure (`@import "tailwindcss"`, `tw-animate-css`, `@custom-variant dark`, `@theme inline` map). Replace the `:root`/`.dark` oklch values with a warm amber/coral ramp:

```css
:root {
  --radius: 0.875rem;
  --background: oklch(0.99 0.01 85);
  --foreground: oklch(0.25 0.03 50);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.25 0.03 50);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.25 0.03 50);
  --primary: oklch(0.68 0.16 45);
  --primary-foreground: oklch(0.99 0.01 85);
  --secondary: oklch(0.95 0.03 70);
  --secondary-foreground: oklch(0.35 0.05 45);
  --muted: oklch(0.96 0.02 80);
  --muted-foreground: oklch(0.5 0.03 60);
  --accent: oklch(0.93 0.05 60);
  --accent-foreground: oklch(0.3 0.05 45);
  --destructive: oklch(0.6 0.2 25);
  --border: oklch(0.9 0.02 70);
  --input: oklch(0.9 0.02 70);
  --ring: oklch(0.68 0.16 45);
  --chart-1: oklch(0.68 0.16 45);
  --chart-2: oklch(0.75 0.13 65);
  --chart-3: oklch(0.82 0.1 85);
  --chart-4: oklch(0.62 0.14 35);
  --chart-5: oklch(0.55 0.12 30);
}
.dark {
  --background: oklch(0.2 0.02 50);
  --foreground: oklch(0.94 0.02 80);
  --card: oklch(0.24 0.02 50);
  --card-foreground: oklch(0.94 0.02 80);
  --popover: oklch(0.24 0.02 50);
  --popover-foreground: oklch(0.94 0.02 80);
  --primary: oklch(0.72 0.15 50);
  --primary-foreground: oklch(0.2 0.02 50);
  --secondary: oklch(0.28 0.03 55);
  --secondary-foreground: oklch(0.9 0.02 75);
  --muted: oklch(0.27 0.02 55);
  --muted-foreground: oklch(0.7 0.03 65);
  --accent: oklch(0.32 0.04 55);
  --accent-foreground: oklch(0.92 0.02 80);
  --destructive: oklch(0.65 0.19 25);
  --border: oklch(0.32 0.02 55);
  --input: oklch(0.32 0.02 55);
  --ring: oklch(0.72 0.15 50);
  --chart-1: oklch(0.72 0.15 50);
  --chart-2: oklch(0.78 0.12 65);
  --chart-3: oklch(0.84 0.09 85);
  --chart-4: oklch(0.66 0.13 35);
  --chart-5: oklch(0.58 0.11 30);
}
```

- [ ] **Step 3: Create `components/theme-provider.tsx`**

```tsx
"use client";
/* AI-CONTEXT-NOTE:{"R":"next-themes wrapper mounted once in the root layout to provide class-based dark mode.","IDD":[{"?":"defaultTheme=system, enableSystem=true; attribute='class' matches the @custom-variant dark in globals.css."}],"A":[{"?":"every component using bg-background/text-foreground etc."}],"AB":[{"?":"app/layout.tsx"},{"?":"components/settings/SettingsView.tsx theme toggle reads/writes this"}],"E":[{"!!":"npm run build"}]} */
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
```

- [ ] **Step 4: Update `app/layout.tsx`**

Keep existing fonts (`Roboto` -> `--font-sans`, Geist pair) and `LayoutProps<"/">` typing. Add line-1 AI-CONTEXT-NOTE, metadata + viewport, providers:

```tsx
/* AI-CONTEXT-NOTE:{"R":"Root layout - fonts, PWA metadata/viewport, manifest link, wraps all routes in ThemeProvider + Toaster.","IDD":[{"?":"appleWebApp + manifest metadata make the app installable on iOS/Android standalone."},{"?":"suppressHydrationWarning required because next-themes swaps classes on <html>."},{"?":"Pages are force-dynamic client-driven; this is the server shell."}],"A":[{"!!!":"all routes","CRITICAL":"removing ThemeProvider or Toaster breaks theming/toasts app-wide"},{"?":"public/manifest.webmanifest (linked here)"}],"AB":[{"?":"components/theme-provider.tsx"},{"?":"components/ui/sonner.tsx"},{"?":"app/globals.css font vars"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify manifest/appleWebApp/viewport survive refactors"}]} */
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DayDrop",
  description: "Your day, dropped in - a story-like journal tracker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DayDrop" },
};

export const viewport: Viewport = { themeColor: "#e8833a", width: "device-width", initialScale: 1 };

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", roboto.variable)}>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

(`geistSans`/`geistMono` declarations already exist in the scaffold - keep them.)

- [ ] **Step 5: Build to verify no regressions**

Run: `npm run build && npm run lint`
Expected: both pass. (`manifest.webmanifest` does not exist yet - that is fine, the link is just metadata.)

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx components/theme-provider.tsx components/ui package.json package-lock.json
git commit -m "feat: DayDrop palette, theme provider, layout shell"
```

---

### Task 3: App shell - Header, BottomNav, Fab, stub routes

**Files:**
- Create: `components/shared/Header.tsx`, `components/shared/BottomNav.tsx`, `components/shared/Fab.tsx`
- Modify: `app/page.tsx`, create `app/habits/page.tsx`, `app/settings/page.tsx`

**Interfaces:**
- Consumes: layout from Task 2.
- Produces: `<Header title="..."/>`; `<BottomNav/>` (active tab via `usePathname`, items Home `/` IconHome, Habits `/habits` IconChecklist, Settings `/settings` IconSettings); `<Fab onClick icon="plus"/|"edit"/>` fixed bottom-right above nav (`bottom-24 right-4 z-20`). Route pages render `<X>View` stubs inside the standard shell: `<Header/><main className="mx-auto w-full max-w-md px-4 pb-20">`.

- [ ] **Step 1: Create Header** - copy cash-guard `components/shared/Header.tsx` verbatim, then adjust: title prop typed `string`, keep theme toggle button. Add AI-CONTEXT-NOTE line 1 describing role.

- [ ] **Step 2: Create BottomNav** - copy cash-guard version; replace its 4 items with the 3 DayDrop tabs above (Tabler icons `IconHome`, `IconChecklist`, `IconSettings`); keep `fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur` styling and active `text-primary` logic. Add AI-CONTEXT-NOTE.

- [ ] **Step 3: Create Fab**

```tsx
"use client";
/* AI-CONTEXT-NOTE:{"R":"Floating action button bottom-right above BottomNav; starts or edits today's journal.","IDD":[{"?":"Fixed positioning bottom-24 clears the nav bar; z-20 sits above content but below dialogs."}],"A":[{"?":"components/dashboard/DashboardView.tsx which passes onClick + mode"}],"AB":[],"E":[{"?":"Tap target >=48px for mobile"}]} */
import { IconPlus, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Fab({ mode, onClick }: { mode: "plus" | "edit"; onClick: () => void }) {
  return (
    <Button size="icon" onClick={onClick} aria-label={mode === "plus" ? "Start journal" : "Edit today's journal"}
      className={cn("fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg text-xl")}>
      {mode === "plus" ? <IconPlus className="size-6" /> : <IconPencil className="size-6" />}
    </Button>
  );
}
```

- [ ] **Step 4: Stub routes**

Create `components/shared/StorageFallback.tsx` first (spec section 11: IndexedDB unavailable -> full-screen fallback, no app shell):

```tsx
/* AI-CONTEXT-NOTE:{"R":"Full-screen fallback rendered when IndexedDB is unavailable (private-mode edge cases).","IDD":[{"?":"Probes window.indexedDB existence only - Dexie opens lazily later."}],"A":[{"!":"app/layout.tsx gates all page content behind this check"}],"AB":[],"E":[{"?":"Must render even without any DB"}]} */
"use client";
import { IconDatabaseOff } from "@tabler/icons-react";

export function StorageUnavailable() {
  if (typeof window === "undefined" || window.indexedDB) return null;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <IconDatabaseOff className="size-10 text-muted-foreground" />
      <p className="font-semibold">DayDrop needs local storage</p>
      <p className="text-sm text-muted-foreground">
        Your browser is blocking IndexedDB (private mode?), so DayDrop cannot save your
        journal. Disable private browsing or allow site data and reload.
      </p>
    </div>
  );
}
```

In `app/layout.tsx` body wrap `{children}` with `<StorageUnavailable />` sibling gating is NOT required for MVP - instead each route's View renders it above its own content via a tiny `useStorageAvailable()` hook added to `lib/hooks/useHydrated.ts` file:

```ts
export function useStorageAvailable(): boolean | null {
  const hydrated = useHydrated();
  if (!hydrated) return null; // unknown yet
  return typeof window !== "undefined" && !!window.indexedDB;
}
```

Views (Tasks 13/14/15/16) early-return `<StorageUnavailable/>` when the hook returns false.

`app/page.tsx` (and siblings) follow the scaffold's page typing style; every route is `force-dynamic`:

```tsx
/* AI-CONTEXT-NOTE:{"R":"Dashboard route - thin server shell rendering DashboardView.","IDD":[{"?":"force-dynamic because all data comes from client IndexedDB."}],"A":[{"?":"components/dashboard/DashboardView.tsx"}],"AB":[{"?":"app/layout.tsx"}],"E":[{"!!":"npm run build"}]} */
export const dynamic = "force-dynamic";

export default function Page() {
  return <div id="dashboard-root" />;
}
```

Create `app/habits/page.tsx` and `app/settings/page.tsx` identically (root ids `habits-root`, `settings-root`, titles in comments adjusted). Views get wired in later tasks.

- [ ] **Step 5: Build + lint**

Run: `npm run build && npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add components/shared app
git commit -m "feat: app shell - header, bottom nav, fab, stub routes"
```

### Task 4: `lib/format.ts` - date/time helpers (TDD)

**Files:**
- Create: `lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Produces (used by scoring/streaks/repository/components):
  - `todayStr(): string` -> `'YYYY-MM-DD'` local time
  - `toStr(d: Date): string`, `fromStr(s: string): Date`
  - `addDays(s: string, n: number): string`
  - `diffDays(a: string, b: string): number` (a minus b, in days)
  - `monthKeyOf(s: string): string` -> `'YYYY-MM'`
  - `daysInMonth(year: number, monthIdx0: number): number`
  - `hhmmToMinutes(t: string): number`, `minutesToHHmm(m: number): string`
  - `sleepHours(sleptAt: string, wokeAt: string): number` (mod-24 duration)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  addDays, diffDays, fromStr, hhmmToMinutes, monthKeyOf,
  sleepHours, toStr, todayStr, minutesToHHmm, daysInMonth,
} from "@/lib/format";

describe("format", () => {
  it("round-trips date strings", () => {
    expect(toStr(fromStr("2026-08-23"))).toBe("2026-08-23");
  });
  it("todayStr is local YYYY-MM-DD", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("adds and diffs days across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDays("2026-08-23", "2026-08-20")).toBe(3);
    expect(diffDays("2026-08-20", "2026-08-23")).toBe(-3);
  });
  it("month keys and lengths", () => {
    expect(monthKeyOf("2026-08-23")).toBe("2026-08");
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026
    expect(daysInMonth(2024, 1)).toBe(29); // leap Feb
    expect(daysInMonth(2026, 7)).toBe(31);
  });
  it("time helpers", () => {
    expect(hhmmToMinutes("22:30")).toBe(1350);
    expect(minutesToHHmm(1350)).toBe("22:30");
  });
  it("sleep hours wraps midnight", () => {
    expect(sleepHours("22:30", "06:30")).toBe(8);
    expect(sleepHours("23:00", "23:00")).toBe(24);
    expect(sleepHours("20:00", "10:00")).toBe(14);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- format`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"Pure date/time helpers; all persistence uses 'YYYY-MM-DD' strings and 'HH:mm' times.","IDD":[{"?":"Local time everywhere (no UTC shifts) - personal journal is single-timezone."},{"?":"sleepHours uses mod-24 wrap for overnight sleep."}],"A":[{"?":"lib/scoring.ts s8 banding"},{"?":"lib/streaks.ts"},{"?":"lib/db/repository.ts"},{"?":"dashboard components"}],"AB":[],"E":[{"!!":"tests/format.test.ts"}]} */

export function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toStr(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export function diffDays(a: string, b: string): number {
  const MS = 86_400_000;
  return Math.round((fromStr(a).getTime() - fromStr(b).getTime()) / MS);
}

export function monthKeyOf(s: string): string {
  return s.slice(0, 7);
}

export function daysInMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHmm(min: number): string {
  const h = String(Math.floor(min / 60) % 24).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function sleepHours(sleptAt: string, wokeAt: string): number {
  const slept = hhmmToMinutes(sleptAt);
  const woke = hhmmToMinutes(wokeAt);
  let mins = woke - slept;
  if (mins <= 0) mins += 1440;
  return mins / 60;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts tests/format.test.ts
git commit -m "feat: pure date/time helpers"
```

---

### Task 5: `lib/journal/steps.ts` - the STEPS[16] config

**Files:**
- Create: `lib/journal/steps.ts`
- Test: `tests/journal-steps.test.ts`

**Interfaces:**
- Produces (consumed by scoring, validations, wizard UI, repository):
  - `type StepId = 'work'|'health'|'weather'|'steps'|'workout'|'screenTime'|'reading'|'sleep'|'mood'|'highlight'|'improve'|'grateful'|'todayTasks'|'tomorrowPlan'|'bucketList'|'habits'`
  - `interface StepOption { id: string; label: string; points?: number }`
  - `interface StepDef { id: StepId; order: number; question: string; type: 'radio'|'checkbox'|'tier-radio'|'sleep'|'text'|'tasks'|'tomorrow'|'habits'; options?: StepOption[]; tierScores?: number[]; minChars?: number; optional?: boolean }`
  - `STEPS: readonly StepDef[]` (16 entries, `order` 1..16)
  - helpers: `stepById(id: StepId): StepDef`, `optionLabel(stepId: StepId, optionId: string): string`, `TIER_SCORES` lookups via each step's `tierScores`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { STEPS, stepById, optionLabel } from "@/lib/journal/steps";

describe("steps config", () => {
  it("has exactly 16 ordered steps", () => {
    expect(STEPS).toHaveLength(16);
    expect(STEPS.map((s) => s.order)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it("types match spec", () => {
    expect(stepById("health").type).toBe("radio");
    expect(stepById("weather").type).toBe("checkbox");
    expect(stepById("steps").type).toBe("tier-radio");
    expect(stepById("screenTime").type).toBe("tier-radio");
    expect(stepById("reading").type).toBe("tier-radio");
    expect(stepById("sleep").type).toBe("sleep");
    expect(stepById("highlight").minChars).toBe(20);
    expect(stepById("improve").minChars).toBe(20);
    expect(stepById("grateful").minChars).toBe(20);
    expect(stepById("bucketList").optional).toBe(true);
  });
  it("option counts match spec", () => {
    expect(stepById("work").options).toHaveLength(5);
    expect(stepById("health").options).toHaveLength(6);
    expect(stepById("weather").options).toHaveLength(6);
    expect(stepById("steps").options).toHaveLength(7);
    expect(stepById("workout").options).toHaveLength(7);
    expect(stepById("screenTime").options).toHaveLength(8);
    expect(stepById("reading").options).toHaveLength(7);
    expect(stepById("mood").options).toHaveLength(9);
  });
  it("resolves labels by id", () => {
    expect(optionLabel("health", "healthy")).toBe("i feel healthy today");
    expect(optionLabel("steps", "little-bit")).toBe("i did a little bit (3001-5000)");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- journal-steps`
Expected: FAIL.

- [ ] **Step 3: Implement the full config**

```ts
/* AI-CONTEXT-NOTE:{"R":"Single source of truth for the 16 wizard steps: question copy, option ids/labels, tier scores, validation hints.","IDD":[{"?":"Option ids are stable slugs persisted in entries; labels may change freely."},{"?":"points on options feed lib/scoring.ts; tierScores are per-tier arrays."},{"?":"s5 rest-day exclusivity is enforced in CheckboxStep UI, ids here stay plain."}],"A":[{"!!!":"lib/scoring.ts","CRITICAL":"scoring maps hard-code these option ids"},{"?":"lib/validations/journal.ts"},{"?":"components/journal/** renders this config"},{"?":"lib/carryover.ts"}],"AB":[],"E":[{"!!":"tests/journal-steps.test.ts"},{"?":"Changing an option id requires a data migration"}]} */

export type StepId =
  | "work" | "health" | "weather" | "steps" | "workout" | "screenTime"
  | "reading" | "sleep" | "mood" | "highlight" | "improve" | "grateful"
  | "todayTasks" | "tomorrowPlan" | "bucketList" | "habits";

export interface StepOption { id: string; label: string; points?: number }

export interface StepDef {
  id: StepId;
  order: number;
  question: string;
  type: "radio" | "checkbox" | "tier-radio" | "sleep" | "text" | "tasks" | "tomorrow" | "habits";
  options?: StepOption[];
  tierScores?: number[];
  minChars?: number;
  optional?: boolean;
}

const opt = (id: string, label: string, points?: number): StepOption => ({ id, label, points });

export const STEPS: readonly StepDef[] = [
  { id: "work", order: 1, question: "how was your work today?", type: "radio", options: [
    opt("fun", "i had fun today"), opt("productive", "i was super productive"),
    opt("boring", "it was boring as hell"), opt("stressful", "soooo stressful"),
    opt("annoying", "annoying honestly..."),
  ]},
  { id: "health", order: 2, question: "how was your health today?", type: "radio", options: [
    opt("healthy", "i feel healthy today", 10), opt("under-weather", "I'm feeling under the weather", 5),
    opt("cold-symptoms", "I've got cold symptoms ugh", 4), opt("headache", "i had a headache", 4),
    opt("stomach-ache", "my stomach hurts", 3), opt("feverish", "i'm feverish...", 2),
  ]},
  { id: "weather", order: 3, question: "what's the weather like today?", type: "checkbox", options: [
    opt("hot-sunny", "it's hot and sunny out"), opt("sunny-clouds", "it's sunny with some clouds"),
    opt("cloudy-gloomy", "it's cloudy and gloomy"), opt("light-rain", "there's light rain falling"),
    opt("heavy-rain", "it's pouring rain outside"), opt("stormy", "it's literally stormy out there"),
  ]},
  { id: "steps", order: 4, question: "how many steps did you take today?", type: "tier-radio",
    tierScores: [1, 2, 4, 6, 8, 9, 10], options: [
    opt("barely-walked", "barely walked (just 0-3000 steps)"),
    opt("little-bit", "i did a little bit (3001-5000)"),
    opt("decent-amount", "i walked a decent amount (5001-7000)"),
    opt("active", "i was active today (7001-8000)"),
    opt("walked-lot", "i walked a lot (8001-9000)"),
    opt("on-fire", "i was on fire (9001-10000)"),
    opt("above-beyond", "i went above and beyond (10000+ steps!)"),
  ]},
  { id: "workout", order: 5, question: "what workout did you do today?", type: "checkbox", options: [
    opt("rest-day", "it's a rest day for me", 1), opt("walk", "i went for a walk", 3),
    opt("run", "i went for a run", 6), opt("sports", "i played sports", 5),
    opt("upper-body", "i did upper body", 5), opt("lower-body", "i did lower body", 5),
    opt("full-body", "i did a full body workout", 8),
  ]},
  { id: "screenTime", order: 6, question: "how much screen time did you have?", type: "tier-radio",
    tierScores: [10, 9, 7, 5, 4, 3, 2, 1], options: [
    opt("barely-used", "i barely used my phone (just 0-1 hour)"),
    opt("a-little", "i used it a little (2 hours)"),
    opt("moderately", "i used it moderately (3 hours)"),
    opt("quite-some", "i spent quite some time (4 hours)"),
    opt("on-it-lot", "i was on it a lot (5 hours)"),
    opt("glued", "i was glued to it (6 hours)"),
    opt("way-too-much", "i was on it way too much (7 hours)"),
    opt("ashamed", "i'm ashamed (8+ hours)"),
  ]},
  { id: "reading", order: 7, question: "how many pages did you read today?", type: "tier-radio",
    tierScores: [1, 3, 5, 7, 8, 9, 10], options: [
    opt("none", "i didn't read at all (0-10 pages)"),
    opt("a-bit", "i read a bit (11-20 pages)"),
    opt("decent", "i read a decent amount (21-40 pages)"),
    opt("a-lot", "i read a lot (41-60 pages)"),
    opt("on-a-roll", "i was on a roll (61-80 pages)"),
    opt("almost-book", "i almost finished a book (81-100 pages)"),
    opt("reading-machine", "i'm a reading machine (100+ pages!)"),
  ]},
  { id: "sleep", order: 8, question: "when did you sleep and wake up?", type: "sleep" },
  { id: "mood", order: 9, question: "how are you feeling today?", type: "radio", options: [
    opt("happy", "i'm really happy"), opt("energetic", "i'm full of energy"),
    opt("okay", "i'm just okay"), opt("bored", "i'm bored out of my mind"),
    opt("tired", "i'm so tired"), opt("anxious", "i'm feeling anxious"),
    opt("sad", "i'm feeling sad today"), opt("angry", "i'm lowkey angry"),
    opt("lonely", "i'm feeling lonely"),
  ]},
  { id: "highlight", order: 10, question: "what was the highlight of your day?", type: "text", minChars: 20 },
  { id: "improve", order: 11, question: "how could today have been better?", type: "text", minChars: 20 },
  { id: "grateful", order: 12, question: "what am i grateful for today?", type: "text", minChars: 20 },
  { id: "todayTasks", order: 13, question: "what's your daily plan looking like today?", type: "tasks" },
  { id: "tomorrowPlan", order: 14, question: "what's your daily plan for tomorrow?", type: "tomorrow" },
  { id: "bucketList", order: 15, question: "what's on my bucket list for this month?", type: "text", optional: true },
  { id: "habits", order: 16, question: "what habit did you solidify today?", type: "habits" },
];

export function stepById(id: StepId): StepDef {
  const s = STEPS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown step ${id}`);
  return s;
}

export function optionLabel(stepId: StepId, optionId: string): string {
  const o = stepById(stepId).options?.find((x) => x.id === optionId);
  if (!o) throw new Error(`unknown option ${optionId} on ${stepId}`);
  return o.label;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- journal-steps`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/journal/steps.ts tests/journal-steps.test.ts
git commit -m "feat: STEPS[16] wizard config"
```

### Task 6: `lib/scoring.ts` - metric scores + monthly reward math (TDD)

**Files:**
- Create: `lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Consumes: `StepId`/`stepById` from Task 5, `DayEntry` from Task 8 (`lib/db/schema.ts`) - for the type only; if schema.ts does not exist yet, declare a structural input type here and let Task 8's entry satisfy it. **Write this task AFTER Task 8** or use the structural type; plan order places Task 8 before first repository usage, so scoring may import `{ type DayEntry } from "@/lib/db/schema"`.
- Produces:
  - `GOOD_SCORE_THRESHOLD = 7`, `MAX_METRIC_SCORE = 10`, `METRIC_COUNT = 7`, `MIN_MONTH_COVERAGE_RATIO = 0.5`
  - `type MetricKey = 'health'|'steps'|'workout'|'screenTime'|'reading'|'sleep'|'habits'`
  - `scoreEntry(e: DayEntry): Record<MetricKey, number> & { total: number }`
  - `monthScore(entries: DayEntry[]): number`
  - `evaluateMonth(entries: DayEntry[], monthKey: string): { score: number; maxPossible: number; ratio: number; eligible: boolean; unlocked: boolean }`

Rules (verbatim from spec): health points live on step options (Task 5); steps tierScores `[1,2,4,6,8,9,10]`; workout sum of option points cap 10 floor 1 (rest-day alone = 1); screenTime `[10,9,7,5,4,3,2,1]`; reading `[1,3,5,7,8,9,10]`; sleep hours bands [7,9]=10, [6,7) or (9,10]=7, [5,6) or (10,11]=4, else=2; habits all=10, partial=`1+round(9*checked/total)` over ACTIVE habits that day (total = habitsChecked.length counts toward checked; total active habits passed in via `activeHabitCount` - see note), none=1. Because `DayEntry` does not store the active-habit total, `scoreEntry` takes an optional second arg `activeHabitCount?: number` defaulting to `e.habitsChecked.length` (so partial scoring uses checked count when total unknown - tests pin both behaviors). Daily total max 70.

Monthly: maxPossible = entries.length * 70; ratio = score/maxPossible (0 when no entries); eligible = entries.length >= ceil(daysInMonth * MIN_MONTH_COVERAGE_RATIO); unlocked = eligible && ratio >= 0.80.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { evaluateMonth, scoreEntry } from "@/lib/scoring";
import type { DayEntry } from "@/lib/db/schema";

const base: DayEntry = {
  date: "2026-08-23", work: "fun",
  health: "healthy", weather: ["hot-sunny"], stepsTier: 6,
  workouts: ["full-body"], screenTimeTier: 0, readingTier: 6,
  sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
  highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
  todayTasks: [{ text: "t", done: true }], tomorrowPlan: ["a"], bucketList: null,
  habitsChecked: [], createdAt: 0, updatedAt: 0,
};

describe("scoreEntry", () => {
  it("scores a perfect-ish day at expected per-metric values", () => {
    const s = scoreEntry(base);
    expect(s.health).toBe(10);
    expect(s.steps).toBe(8);          // tier 6 of [1,2,4,6,8,9,10]
    expect(s.workout).toBe(8);        // full-body
    expect(s.screenTime).toBe(10);    // tier 0 inverted
    expect(s.reading).toBe(10);       // tier 6
    expect(s.sleep).toBe(10);         // exactly 8h
    expect(s.habits).toBe(1);         // none checked
    expect(s.total).toBe(57);
  });
  it("workout sums and caps at 10, floors at 1", () => {
    expect(scoreEntry({ ...base, workouts: ["run", "sports"] }).workout).toBe(10); // 11 capped
    expect(scoreEntry({ ...base, workouts: ["rest-day"] }).workout).toBe(1);
  });
  it("sleep banding", () => {
    expect(scoreEntry({ ...base, sleptAt: "23:00", wokeAt: "05:00" }).sleep).toBe(2);   // 6h
    expect(scoreEntry({ ...base, sleptAt: "23:00", wokeAt: "04:00" }).sleep).toBe(4);   // 5h
    expect(scoreEntry({ ...base, sleptAt: "21:00", wokeAt: "09:30" }).sleep).toBe(7);   // 12.5h? no:
  });
});
```

Careful with the last case: 21:00->09:30 is 12.5h -> band else -> **2**. Fix the assertion to `.toBe(2)` and add `(10,11]`->4 via sleptAt 22:00 wokeAt 09:00 (11h) `.toBe(4)`.

Add habit-scoring cases:

```ts
it("habit scoring partial vs full", () => {
  // 2 checked of 4 active -> 1 + round(9*2/4) = 6 (approx float: 5.5 rounds to 6 in JS Math.round)
  const e2 = { ...base, habitsChecked: ["a", "b"] };
  expect(scoreEntry(e2, 4).habits).toBe(6);
  const eAll = { ...base, habitsChecked: ["a", "b"] };
  expect(scoreEntry(eAll, 2).habits).toBe(10);
});
```

And monthly:

```ts
describe("evaluateMonth", () => {
  it("unlocks at >=80% with coverage", () => {
    const perfect = { ...base };
    const r = evaluateMonth([perfect], "2026-08");       // Aug has 31 days, need ceil(15.5)=16
    expect(r.eligible).toBe(false);                      // 1 entry < 16
    expect(r.unlocked).toBe(false);
  });
  it("coverage guard blocks thin months", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...perfect }));
    const r = evaluateMonth(many, "2026-02");            // Feb: ceil(28*0.5)=14 <= 20 OK
    expect(r.eligible).toBe(true);
    expect(r.unlocked).toBe(r.ratio >= 0.8);
  });
  it("empty month is safe", () => {
    const r = evaluateMonth([], "2026-08");
    expect(r.score).toBe(0); expect(r.maxPossible).toBe(0); expect(r.ratio).toBe(0);
    expect(r.unlocked).toBe(false);
  });
});
```

Note: test entries share the same `date` key only conceptually; `evaluateMonth` must NOT dedupe (caller passes real entries). Keep one `date` per fixture by mapping index -> unique date strings.

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- scoring`
Expected: FAIL (no module).

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"Pure scoring engine: per-metric 1-10 daily scores, daily total (max 70), monthly reward evaluation.","IDD":[{"?":"Never returns 0 for a scored metric (floor 1) per spec."},{"?":"Workout sums option points capped at 10."},{"?":"Sleep bands: [7,9]=10, [6,7)/(9,10]=7, [5,6)/(10,11]=4, else 2."},{"?":"Habit partial formula needs active-habit count; defaults to checked length."},{"?":"Monthly unlock needs ratio>=0.8 AND coverage>=ceil(daysInMonth*0.5)."}],"A":[{"!!!":"lib/journal/steps.ts","CRITICAL":"option ids and tierScores arrays are consumed positionally"},{"?":"lib/streaks.ts threshold"},{"?":"components/dashboard/RewardBanner.tsx"},{"?":"lib/db/repository.ts lazy month evaluation"}],"AB":[{"?":"lib/format.ts sleepHours/daysInMonth"}],"E":[{"!!":"tests/scoring.test.ts"},{"?":"Tuning point values: edit STEPS options/tierScores, not this file"}]} */
import { sleepHours, daysInMonth } from "@/lib/format";
import { stepById } from "@/lib/journal/steps";
import type { DayEntry } from "@/lib/db/schema";

export const GOOD_SCORE_THRESHOLD = 7;
export const MAX_METRIC_SCORE = 10;
export const METRIC_COUNT = 7;
export const MIN_MONTH_COVERAGE_RATIO = 0.5;

export type MetricKey =
  | "health" | "steps" | "workout" | "screenTime" | "reading" | "sleep" | "habits";

function optionPoints(stepId: Parameters<typeof stepById>[0], optionId: string): number {
  return stepById(stepId).options?.find((o) => o.id === optionId)?.points ?? 1;
}

function tierScore(stepId: Parameters<typeof stepById>[0], tierIndex: number): number {
  const scores = stepById(stepId).tierScores ?? [];
  return scores[tierIndex] ?? 1;
}

function workoutScore(ids: string[]): number {
  const raw = ids.reduce((sum, id) => sum + optionPoints("workout", id), 0);
  return Math.min(10, Math.max(1, raw || 1));
}

function sleepScore(sleptAt: string, wokeAt: string): number {
  const h = sleepHours(sleptAt, wokeAt);
  if (h >= 7 && h <= 9) return 10;
  if ((h >= 6 && h < 7) || (h > 9 && h <= 10)) return 7;
  if ((h >= 5 && h < 6) || (h > 10 && h <= 11)) return 4;
  return 2;
}

function habitScore(checked: string[], activeTotal?: number): number {
  const total = activeTotal ?? checked.length;
  if (checked.length === 0) return 1;
  if (checked.length >= total) return 10;
  return Math.min(10, 1 + Math.round((9 * checked.length) / Math.max(1, total)));
}

export function scoreEntry(
  e: DayEntry,
  activeHabitCount?: number,
): Record<MetricKey, number> & { total: number } {
  const health = optionPoints("health", e.health);
  const steps = tierScore("steps", e.stepsTier);
  const workout = workoutScore(e.workouts);
  const screenTime = tierScore("screenTime", e.screenTimeTier);
  const reading = tierScore("reading", e.readingTier);
  const sleep = sleepScore(e.sleptAt, e.wokeAt);
  const habits = habitScore(e.habitsChecked, activeHabitCount);
  const total = health + steps + workout + screenTime + reading + sleep + habits;
  return { health, steps, workout, screenTime, reading, sleep, habits, total };
}

export function monthScore(entries: DayEntry[], activeHabitCountByDate?: Map<string, number>): number {
  return entries.reduce(
    (sum, e) => sum + scoreEntry(e, activeHabitCountByDate?.get(e.date)).total,
    0,
  );
}

export function evaluateMonth(entries: DayEntry[], monthKey: string): {
  score: number; maxPossible: number; ratio: number; eligible: boolean; unlocked: boolean;
} {
  const score = monthScore(entries);
  const maxPossible = entries.length * MAX_METRIC_SCORE * METRIC_COUNT;
  const ratio = maxPossible === 0 ? 0 : score / maxPossible;
  const [year, monthIdx0] = monthKey.split("-").map(Number);
  const needed = Math.ceil(daysInMonth(year, monthIdx0 - 1) * MIN_MONTH_COVERAGE_RATIO);
  const eligible = entries.length >= needed;
  return { score, maxPossible, ratio, eligible, unlocked: eligible && ratio >= 0.8 };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- scoring`
Expected: PASS (adjust any arithmetic surprises in favor of the documented bands - the bands above are authoritative).

**Ordering note:** This task imports `@/lib/db/schema`. If executed strictly in order, do Task 8 (schema) BEFORE this task; schema.ts has no dependencies on scoring, so swapping execution order of Tasks 6 and 8 is safe and intended.

- [ ] **Step 5: Commit**

```bash
git add lib/scoring.ts tests/scoring.test.ts
git commit -m "feat: scoring engine + monthly reward math"
```

---

### Task 7: `lib/streaks.ts` + `lib/carryover.ts` (TDD)

**Files:**
- Create: `lib/streaks.ts`, `lib/carryover.ts`
- Test: `tests/streaks.test.ts`, `tests/carryover.test.ts`

**Interfaces:**
- Consumes: `scoreEntry`, `GOOD_SCORE_THRESHOLD`, `MetricKey` (Task 6); `format.ts`.
- Produces:
  - `journalStreak(dates: string[], today: string): number` - consecutive calendar days ending today OR yesterday.
  - `metricStreak(entries: DayEntry[], metric: MetricKey, today: string): number` - consecutive submitted days where that metric's score >= GOOD_SCORE_THRESHOLD; streak anchored same as journalStreak (today-or-yesterday).
  - `allStreaks(entries: DayEntry[], today: string): { journal: number } & Record<MetricKey, number>`
  - `buildTodayChecklist(prevPlan: string[] | undefined): { text: string; done: boolean }[]`
  - `uncheckedTexts(tasks: { text: string; done: boolean }[]): string[]`
  - `mergeCarried(plan: string[] | undefined, carried: string[]): string[]` - dedupe case-insensitive, carried appended after existing.

- [ ] **Step 1: Write failing tests**

```ts
// tests/streaks.test.ts
import { describe, expect, it } from "vitest";
import { journalStreak, metricStreak, allStreaks } from "@/lib/streaks";
import type { DayEntry } from "@/lib/db/schema";

function entry(date: string, over: Partial<DayEntry> = {}): DayEntry {
  return {
    date, work: "fun", health: "healthy", weather: [], stepsTier: 6, workouts: [],
    screenTimeTier: 0, readingTier: 6, sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
    highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
    todayTasks: [], tomorrowPlan: ["t"], bucketList: null, habitsChecked: [],
    createdAt: 0, updatedAt: 0, ...over,
  };
}

describe("journalStreak", () => {
  it("counts back from today", () => {
    expect(journalStreak(["2026-08-23", "2026-08-22", "2026-08-21"], "2026-08-23")).toBe(3);
  });
  it("survives when today is missing but yesterday exists", () => {
    expect(journalStreak(["2026-08-22", "2026-08-21"], "2026-08-23")).toBe(2);
  });
  it("breaks on gaps", () => {
    expect(journalStreak(["2026-08-23", "2026-08-21"], "2026-08-23")).toBe(1);
    expect(journalStreak(["2026-08-20"], "2026-08-23")).toBe(0);
  });
});

describe("metricStreak", () => {
  it("requires score >= 7 per consecutive day", () => {
    const entries = [
      entry("2026-08-23", { health: "healthy" }),                       // 10
      entry("2026-08-22", { health: "under-weather" }),                 // 5 breaks
      entry("2026-08-21", { health: "healthy" }),                       // 10 (before break)
    ];
    expect(metricStreak(entries, "health", "2026-08-23")).toBe(1);
  });
  it("skipped days break the streak too", () => {
    const entries = [entry("2026-08-23"), entry("2026-08-21")];
    expect(metricStreak(entries, "steps", "2026-08-23")).toBe(1);
  });
});

describe("allStreaks", () => {
  it("returns journal plus 7 metrics", () => {
    const all = allStreaks([entry("2026-08-23")], "2026-08-23");
    expect(all.journal).toBe(1);
    expect(Object.keys(all)).toHaveLength(8);
  });
});
```

```ts
// tests/carryover.test.ts
import { describe, expect, it } from "vitest";
import { buildTodayChecklist, uncheckedTexts, mergeCarried } from "@/lib/carryover";

describe("carryover", () => {
  it("builds unchecked checklist from yesterday's plan", () => {
    expect(buildTodayChecklist(["a", "b"])).toEqual([
      { text: "a", done: false }, { text: "b", done: false },
    ]);
    expect(buildTodayChecklist(undefined)).toEqual([]);
  });
  it("extracts unchecked texts", () => {
    expect(uncheckedTexts([{ text: "a", done: true }, { text: "b", done: false }])).toEqual(["b"]);
  });
  it("merge dedupes case-insensitively and appends carried", () => {
    expect(mergeCarried(["Buy milk", "call mom"], ["buy MILK", "read"])).toEqual([
      "Buy milk", "call mom", "read",
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- streaks carryover`
Expected: FAIL.

- [ ] **Step 3: Implement streaks**

```ts
/* AI-CONTEXT-NOTE:{"R":"Pure streak computations: journaling streak + per-metric good-day streaks.","IDD":[{"?":"A streak anchors on today OR yesterday (you haven't journaled today yet without breaking it)."},{"?":"Metric good bar = GOOD_SCORE_THRESHOLD (7)."},{"?":"Missing calendar days break metric streaks like failures do."}],"A":[{"?":"components/dashboard/StreakChips.tsx greeting flame chip"}],"AB":[{"?":"lib/scoring.ts scoreEntry/threshold"},{"?":"lib/format.ts diffDays/addDays"}],"E":[{"!!":"tests/streaks.test.ts"}]} */
import { addDays } from "@/lib/format";
```

Actual implementation (single file, no extra util):

```ts
import { addDays, diffDays } from "@/lib/format";
import { GOOD_SCORE_THRESHOLD, scoreEntry, type MetricKey } from "@/lib/scoring";
import type { DayEntry } from "@/lib/db/schema";

export function journalStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function metricStreak(entries: DayEntry[], metric: MetricKey, today: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let cursor = byDate.has(today) ? today : addDays(today, -1);
  if (!byDate.has(cursor)) return 0;
  let n = 0;
  while (byDate.has(cursor)) {
    const e = byDate.get(cursor)!;
    if (scoreEntry(e)[metric] < GOOD_SCORE_THRESHOLD) break;
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function allStreaks(entries: DayEntry[], today: string): { journal: number } & Record<MetricKey, number> {
  const metrics: MetricKey[] =
    ["health", "steps", "workout", "screenTime", "reading", "sleep", "habits"];
  const out = { journal: journalStreak(entries.map((e) => e.date), today) } as
    { journal: number } & Record<MetricKey, number>;
  for (const m of metrics) out[m] = metricStreak(entries, m, today);
  return out;
}
```

- [ ] **Step 4: Implement carryover**

```ts
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
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- streaks carryover`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/streaks.ts lib/carryover.ts tests/streaks.test.ts tests/carryover.test.ts
git commit -m "feat: streaks + task carry-over logic"
```

### Task 8: `lib/db/schema.ts` - Dexie database + types

**Files:**
- Create: `lib/db/schema.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces (everything downstream imports from here):
  - `interface ChecklistItem { text: string; done: boolean }`
  - `interface DayEntry { date: string; work: string; health: string; weather: string[]; stepsTier: number; workouts: string[]; screenTimeTier: number; readingTier: number; sleptAt: string; wokeAt: string; mood: string; highlight: string; improve: string; grateful: string; todayTasks: ChecklistItem[]; tomorrowPlan: string[]; bucketList: string | null; habitsChecked: string[]; createdAt: number; updatedAt: number }`
  - `interface Habit { id: string; name: string; startedOn: string; archivedAt: string | null }`
  - `type RewardStatus = 'pending'|'active'|'earned'|'missed'|'claimed'`
  - `interface RewardRecord { month: string; text: string | null; status: RewardStatus; score?: number; maxPossible?: number; ratio?: number }`
  - `interface JournalDraft { date: string; stepIndex: number; answers: Partial<DayEntry> }`
  - `const DRAFT_KEY = 'journal-draft'`, `rewardKey(month: string): string` -> `'reward:YYYY-MM'`, `celebratedKey(habitId: string): string`
  - `class DayDropDB extends Dexie` with tables `entries!: Table<DayEntry, string>`, `habits!: Table<Habit, string>`, `meta!: Table<MetaRow, string>`; stores `entries: "date"`, `habits: "id, archivedAt, startedOn"`, `meta: "key"` under version(1)
  - `export const db = new DayDropDB()` singleton
  - `newId(): string` (uuid)

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { DRAFT_KEY, celebratedKey, rewardKey } from "@/lib/db/schema";

describe("schema keys", () => {
  it("namespaced meta keys", () => {
    expect(DRAFT_KEY).toBe("journal-draft");
    expect(rewardKey("2026-08")).toBe("reward:2026-08");
    expect(celebratedKey("abc")).toBe("celebrated:abc");
  });
});
```

(Instantiating the real Dexie class in happy-dom without IndexedDB is avoided by tests using the mock pattern in later tasks; here we only pin key helpers.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- schema`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"Dexie database definition and ALL persisted types for DayDrop.","IDD":[{"?":"date 'YYYY-MM-DD' is the entries primary key -> one entry per day."},{"?":"Meta rows are namespaced single-key documents: draft, reward:YYYY-MM, celebrated:<habitId>."},{"?":"Versioned additive migrations only; never edit an existing store shape in place."}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"repository is the ONLY writer; hooks read via useLiveQuery"},{"?":"lib/scoring.ts consumes DayEntry"},{"?":"components/journal/** consume StepId-typed fields"}],"AB":[{"?":"dexie"},{"?":"uuid"}],"E":[{"!!":"tests/schema.test.ts"},{"!!":"npm run build"}]} */
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

export interface ChecklistItem { text: string; done: boolean }

export interface DayEntry {
  date: string;
  work: string;
  health: string;
  weather: string[];
  stepsTier: number;
  workouts: string[];
  screenTimeTier: number;
  readingTier: number;
  sleptAt: string;
  wokeAt: string;
  mood: string;
  highlight: string;
  improve: string;
  grateful: string;
  todayTasks: ChecklistItem[];
  tomorrowPlan: string[];
  bucketList: string | null;
  habitsChecked: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  startedOn: string;
  archivedAt: string | null;
}

export type RewardStatus = "pending" | "active" | "earned" | "missed" | "claimed";

export interface RewardRecord {
  month: string;
  text: string | null;
  status: RewardStatus;
  score?: number;
  maxPossible?: number;
  ratio?: number;
}

export interface JournalDraft {
  date: string;
  stepIndex: number;
  answers: Partial<DayEntry>;
}

export interface MetaRow { key: string; value: unknown }

export const DRAFT_KEY = "journal-draft";
export function rewardKey(month: string): string { return `reward:${month}`; }
export function celebratedKey(habitId: string): string { return `celebrated:${habitId}`; }

export class DayDropDB extends Dexie {
  entries!: Table<DayEntry, string>;
  habits!: Table<Habit, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("day-drop");
    this.version(1).stores({
      entries: "date",
      habits: "id, archivedAt, startedOn",
      meta: "key",
    });
  }
}

export const db = new DayDropDB();

export function newId(): string {
  return uuidv4();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema.ts tests/schema.test.ts
git commit -m "feat: dexie schema + persisted types"
```

---

### Task 9: `lib/validations/journal.ts` - zod per-step schemas (TDD)

**Files:**
- Create: `lib/validations/journal.ts`
- Test: `tests/validations-journal.test.ts`

**Interfaces:**
- Consumes: `StepDef`/`STEPS` (Task 5), types from Task 8.
- Produces:
  - `validateStep(step: StepDef, value: unknown): { ok: true } | { ok: false; error: string }` - dispatches on step.type:
    - radio/tier-radio: value must be one of step.options ids
    - checkbox: array of valid ids (may be empty unless step is workout? NO - s5 may be empty too; only tomorrowPlan enforces min 1)
    - sleep: `{ sleptAt: 'HH:mm' in 20:00..23:59, wokeAt: 'HH:mm' in 00:00..10:00 }`
    - text: string; if optional and empty -> ok(null); else trimmed length >= minChars
    - tasks/tomorrow: tasks -> any array ok; tomorrow -> string[] length >= 1 after trim
    - habits: array of habit ids (non-empty strings), may be empty

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { validateStep } from "@/lib/validations/journal";
import { stepById } from "@/lib/journal/steps";

describe("validateStep", () => {
  it("radio rejects unknown option", () => {
    expect(validateStep(stepById("health"), "nope").ok).toBe(false);
    expect(validateStep(stepById("health"), "healthy").ok).toBe(true);
  });
  it("checkbox accepts empty and valid arrays", () => {
    expect(validateStep(stepById("weather"), []).ok).toBe(true);
    expect(validateStep(stepById("weather"), ["stormy", "light-rain"]).ok).toBe(true);
    expect(validateStep(stepById("weather"), ["bogus"]).ok).toBe(false);
  });
  it("sleep validates windows", () => {
    expect(validateStep(stepById("sleep"), { sleptAt: "22:30", wokeAt: "06:30" }).ok).toBe(true);
    expect(validateStep(stepById("sleep"), { sleptAt: "19:00", wokeAt: "06:30" }).ok).toBe(false);
    expect(validateStep(stepById("sleep"), { sleptAt: "22:30", wokeAt: "11:00" }).ok).toBe(false);
  });
  it("text enforces minChars, optional allows empty", () => {
    expect(validateStep(stepById("highlight"), "short").ok).toBe(false);
    expect(validateStep(stepById("highlight"), "this is definitely long enough").ok).toBe(true);
    expect(validateStep(stepById("bucketList"), "").ok).toBe(true);
  });
  it("tomorrow requires >=1 task", () => {
    expect(validateStep(stepById("tomorrowPlan"), []).ok).toBe(false);
    expect(validateStep(stepById("tomorrowPlan"), ["ship MVP"]).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- validations-journal`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"zod-backed validation for each wizard step; wizard Next button gates on validateStep.","IDD":[{"?":"Dispatches on StepDef.type; option id membership comes live from STEPS config."},{"?":"Sleep window clamps: sleptAt 20:00-23:59, wokeAt 00:00-10:00."},{"?":"Optional text steps (bucketList) allow empty and normalize to null upstream."}],"A":[{"?":"components/journal/JournalWizard.tsx canAdvance"},{"?":"lib/exportImport.ts full-entry validation"}],"AB":[{"?":"zod"},{"?":"lib/journal/steps.ts"}],"E":[{"!!":"tests/validations-journal.test.ts"}]} */
import { z } from "zod";
import type { StepDef } from "@/lib/journal/steps";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function minuteOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function validateStep(
  step: StepDef,
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  switch (step.type) {
    case "radio":
    case "tier-radio": {
      const ids = (step.options ?? []).map((o) => o.id);
      const schema = z.enum(ids as [string, ...string[]]);
      const r = schema.safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "pick one to continue" };
    }
    case "checkbox": {
      const ids = new Set((step.options ?? []).map((o) => o.id));
      const r = z.array(z.string()).safeParse(value);
      if (!r.success || !r.data.every((id) => ids.has(id))) {
        return { ok: false, error: "invalid selection" };
      }
      return { ok: true };
    }
    case "sleep": {
      const schema = z.object({
        sleptAt: z.string().regex(HHMM).refine((t) => minuteOf(t) >= 20 * 60 && minuteOf(t) <= 23 * 60 + 59),
        wokeAt: z.string().regex(HHMM).refine((t) => minuteOf(t) <= 10 * 60),
      });
      return schema.safeParse(value).success
        ? { ok: true }
        : { ok: false, error: "pick both times (8pm - 10am)" };
    }
    case "text": {
      const raw = typeof value === "string" ? value.trim() : "";
      if (step.optional && raw === "") return { ok: true };
      const min = step.minChars ?? 0;
      return raw.length >= min ? { ok: true } : { ok: false, error: `write at least ${min} characters` };
    }
    case "tasks": {
      const r = z.array(z.object({ text: z.string().min(1), done: z.boolean() })).safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "invalid checklist" };
    }
    case "tomorrow": {
      const r = z.array(z.string().trim().min(1)).safeParse(value);
      if (!r.success || r.data.length < 1) return { ok: false, error: "add at least 1 task for tomorrow" };
      return { ok: true };
    }
    case "habits": {
      const r = z.array(z.string().min(1)).safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "invalid habit list" };
    }
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- validations-journal`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/journal.ts tests/validations-journal.test.ts
git commit -m "feat: per-step zod validation"
```

### Task 10: `lib/journal/machine.ts` - headless wizard reducer (TDD)

**Files:**
- Create: `lib/journal/machine.ts`
- Test: `tests/machine.test.ts`

**Interfaces:**
- Consumes: `STEPS`/`StepDef` (Task 5), `validateStep` (Task 9).
- Produces:
  - `interface WizardState { stepIndex: number; answers: Partial<DayEntry> }`
  - `type WizardAction = { type: 'answer'; patch: Partial<DayEntry> } | { type: 'next' } | { type: 'back' } | { type: 'goto'; index: number }`
  - `reducer(state: WizardState, action: WizardAction): WizardState`
    - `answer`: merges patch (does NOT move)
    - `next`: only advances if `canAdvance(state)` passes; clamps at last step
    - `back`: never below 0
    - `goto`: only to indexes <= furthest reachable (simple rule: any index <= current max visited is fine; MVP allows goto only backwards or +1)
  - `canAdvance(state: WizardState): boolean` - validateStep on STEPS[state.stepIndex] with the answer field for that step
  - `answerFor(stepId: StepId, answers: Partial<DayEntry>): unknown` - maps step id -> the answers field it edits (identical names; e.g. steps.id 'screenTime' <-> DayEntry.screenTimeTier)

Field mapping note (single source in machine.ts): `steps->stepsTier`, `screenTime->screenTimeTier`, `reading->readingTier`, everything else shares the StepId name.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { answerFor, canAdvance, initialWizardState, reducer } from "@/lib/journal/machine";

describe("machine", () => {
  it("starts at step 0 empty", () => {
    const s = initialWizardState();
    expect(s.stepIndex).toBe(0);
    expect(s.answers).toEqual({});
  });
  it("cannot advance past an unanswered radio", () => {
    expect(canAdvance(initialWizardState())).toBe(false);
  });
  it("answers then advances through s1 and blocks on s2", () => {
    let s = reducer(initialWizardState(), { type: "answer", patch: { work: "fun" } });
    expect(canAdvance(s)).toBe(true);
    s = reducer(s, { type: "next" });
    expect(s.stepIndex).toBe(1);
    expect(canAdvance(s)).toBe(false);
  });
  it("maps tier ids to tier fields", () => {
    let s = reducer(
      reducer(initialWizardState(), { type: "goto", index: 3 }),
      { type: "answer", patch: { stepsTier: 6 } },
    );
    expect(answerFor("steps", s.answers)).toBe(6);
    expect(canAdvance(s)).toBe(true);
  });
  it("back preserves answers", () => {
    let s = reducer(initialWizardState(), { type: "answer", patch: { work: "fun" } });
    s = reducer(s, { type: "next" });
    s = reducer(s, { type: "back" });
    expect(s.answers.work).toBe("fun");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- machine`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"Headless wizard state machine over STEPS[16]: answers, advance gating via validateStep.","IDD":[{"?":"stepIndex indexes STEPS array (0-based); order field is display-only."},{"?":"Tier steps map StepId 'steps'/'screenTime'/'reading' to *Tier fields; others share names."},{"?":"Pure reducer - persistence of drafts happens in JournalWizard via repository.saveDraft."}],"A":[{"!!!":"components/journal/JournalWizard.tsx","CRITICAL":"UI drives this reducer; do not duplicate validation there"},{"?":"tests/machine.test.ts pins behavior"}],"AB":[{"?":"lib/journal/steps.ts"},{"?":"lib/validations/journal.ts"}],"E":[{"!!":"tests/machine.test.ts"}]} */
import { stepById, STEPS, type StepDef, type StepId } from "@/lib/journal/steps";
import { validateStep } from "@/lib/validations/journal";
import type { DayEntry } from "@/lib/db/schema";

export interface WizardState {
  stepIndex: number;
  answers: Partial<DayEntry>;
}

export type WizardAction =
  | { type: "answer"; patch: Partial<DayEntry> }
  | { type: "next" }
  | { type: "back" }
  | { type: "goto"; index: number };

const FIELD_BY_STEP: Record<Exclude<StepId, "sleep">, keyof DayEntry> = {
  work: "work", health: "health", weather: "weather",
  steps: "stepsTier", workout: "workouts", screenTime: "screenTimeTier",
  reading: "readingTier", mood: "mood", highlight: "highlight",
  improve: "improve", grateful: "grateful", todayTasks: "todayTasks",
  tomorrowPlan: "tomorrowPlan", bucketList: "bucketList", habits: "habitsChecked",
};

export function answerFor(stepId: StepId, answers: Partial<DayEntry>): unknown {
  if (stepId === "sleep") {
    if (answers.sleptAt == null && answers.wokeAt == null) return undefined;
    return { sleptAt: answers.sleptAt, wokeAt: answers.wokeAt };
  }
  return answers[FIELD_BY_STEP[stepId]];
}

export function canAdvance(state: WizardState): boolean {
  const step: StepDef | undefined = STEPS[state.stepIndex];
  if (!step) return false;
  return validateStep(step, answerFor(step.id, state.answers)).ok;
}

export function initialWizardState(): WizardState {
  return { stepIndex: 0, answers: {} };
}

export function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "answer":
      return { ...state, answers: { ...state.answers, ...action.patch } };
    case "next": {
      if (!canAdvance(state)) return state;
      return { ...state, stepIndex: Math.min(STEPS.length - 1, state.stepIndex + 1) };
    }
    case "back":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "goto":
      // Free navigation within bounds (progress dots are informational in MVP).
      return { ...state, stepIndex: Math.min(Math.max(0, action.index), STEPS.length - 1) };
  }
}
```

Sleep note: `answerFor("sleep", ...)` returns `{sleptAt, wokeAt}` (or undefined when neither set); `canAdvance` validates that object against the sleep schema. There is no `sleep` key on `DayEntry` - the two real fields are `sleptAt`/`wokeAt`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- machine`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/journal/machine.ts tests/machine.test.ts
git commit -m "feat: headless wizard state machine"
```

---

### Task 11: `lib/db/repository.ts` + read hooks

**Files:**
- Create: `lib/db/repository.ts`, `lib/hooks/useEntries.ts`, `lib/hooks/useHabits.ts`, `lib/hooks/useMeta.ts`, `lib/hooks/useHydrated.ts`, `lib/hooks/useServiceWorkerUpdate.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Consumes: schema types/db (Task 8), scoring (Task 6), carryover (Task 7), format (Task 4).
- Produces (all writes go through here):
  - `getDraft(): Promise<JournalDraft | undefined>` / `saveDraft(draft: JournalDraft): Promise<void>` / `clearDraft(): Promise<void>`
  - `getTodayEntry(today: string): Promise<DayEntry | undefined>`
  - `getLatestEntryBefore(date: string): Promise<DayEntry | undefined>`
  - `submitEntry(payload: DayEntry, activeHabitIds: string[]): Promise<{ archivedHabits: Habit[] }>` - atomic `db.transaction('rw', ...)`: put entry, clear draft, auto-archive habits whose day-100 date equals payload.date (startedOn + 99 days) AND are checked-or-not regardless (archive by calendar, per spec), write celebrated flags NOT here (UI does after seeing result)
  - `addHabit(name: string): Promise<Habit>` (startedOn = today, archivedAt null), `renameHabit(id, name)`, `deleteHabit(id)`
  - `getActiveHabits(): Promise<Habit[]>`, `getArchivedHabits(): Promise<Habit[]>`
  - `getReward(month: string): Promise<RewardRecord | undefined>`
  - `setMonthlyReward(month: string, text: string): Promise<void>` - upsert with status 'active' (or keep earned/claimed status if already evaluated)
  - `claimReward(month: string): Promise<void>` - earned -> claimed
  - `evaluateFinishedMonths(today: string): Promise<{ month: string; unlocked: boolean }[]>` - for each monthKey strictly before today's month having >=1 entry but no final reward row (status earned|missed|claimed): fetch entries of that month, evaluateMonth, setMonthlyReward text preserved, set status earned/missed with score fields. Returns newly evaluated months.
  - Hooks: `useEntries(): DayEntry[] | undefined`, `useHabits(): Habit[] | undefined`, `useMetaValue<T>(key: string, fallback?: T): T | undefined`, plus verbatim copies of cash-guard `useHydrated` and `useServiceWorkerUpdate`.

- [ ] **Step 1: Write failing tests (mock-Dexie pattern)**

Create a mock table helper at top of `tests/repository.test.ts` (same pattern as cash-guard tests - `vi.hoisted` store objects implementing the used surface):

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => {
  function makeTable() {
    const map = new Map<string, any>();
    return {
      get: async (k: string) => map.get(k),
      put: async (v: any, k?: string) => {
        map.set(k ?? v.date ?? v.key ?? v.id, v);
        return k ?? v.date ?? v.key ?? v.id;
      },
      delete: async (k: string) => void map.delete(k),
      toArray: async () => [...map.values()],
      bulkPut: async (vs: any[]) => void vs.forEach((v) => map.set(v.date ?? v.key ?? v.id, v)),
      where: (_idx: string) => ({
        equals: (v: any) => ({
          count: async () => [...map.values()].filter((x) => x[_idx] === v).length,
          modify: async (fn: (x: any) => void) =>
            [...map.values()].filter((x) => x[_idx] === v).forEach(fn),
          toArray: async () => [...map.values()].filter((x) => x[_idx] === v),
        }),
      }),
      __map: map,
    };
  }
  const tables = { entries: makeTable(), habits: makeTable(), meta: makeTable() };
  return { mockDb: tables };
});

vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return { ...actual, db: mockDb as unknown as typeof actual.db };
});

import {
  addHabit, claimReward, clearDraft, deleteHabit, evaluateFinishedMonths,
  getDraft, getLatestEntryBefore, getTodayEntry, renameHabit, saveDraft,
  setMonthlyReward, submitEntry,
} from "@/lib/db/repository";
```

Then the cases:

```ts
const TODAY = "2026-08-23";

function fullEntry(date: string): Parameters<typeof submitEntry>[0] {
  return {
    date, work: "fun", health: "healthy", weather: [], stepsTier: 6, workouts: [],
    screenTimeTier: 0, readingTier: 6, sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
    highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
    todayTasks: [], tomorrowPlan: ["ship"], bucketList: null, habitsChecked: [],
    createdAt: 1, updatedAt: 1,
  };
}

beforeEach(() => {
  mockDb.entries.__map.clear();
  mockDb.habits.__map.clear();
  mockDb.meta.__map.clear();
});

describe("drafts", () => {
  it("save/get/clear round-trip", async () => {
    await saveDraft({ date: TODAY, stepIndex: 2, answers: { work: "fun" } });
    expect(await getDraft()).toMatchObject({ stepIndex: 2 });
    await clearDraft();
    expect(await getDraft()).toBeUndefined();
  });
});

describe("entries", () => {
  it("getTodayEntry finds by exact date", async () => {
    await submitEntry(fullEntry(TODAY), []);
    expect((await getTodayEntry(TODAY))?.date).toBe(TODAY);
    expect(await getTodayEntry("2026-08-22")).toBeUndefined();
  });
  it("getLatestEntryBefore picks most recent earlier entry", async () => {
    await submitEntry(fullEntry("2026-08-20"), []);
    await submitEntry(fullEntry("2026-08-22"), []);
    expect((await getLatestEntryBefore(TODAY))?.date).toBe("2026-08-22");
  });
  it("resubmitting today overwrites (same-day edit)", async () => {
    await submitEntry(fullEntry(TODAY), []);
    await submitEntry({ ...fullEntry(TODAY), mood: "tired" }, []);
    const rows = [...mockDb.entries.__map.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].mood).toBe("tired");
  });
  it("submit clears the draft", async () => {
    await saveDraft({ date: TODAY, stepIndex: 5, answers: {} });
    await submitEntry(fullEntry(TODAY), []);
    expect(await getDraft()).toBeUndefined();
  });
});

describe("habits", () => {
  it("auto-archives habit hitting day 100 on entry date", async () => {
    const h = await addHabit("meditate");
    // force startedOn so that day 100 lands on TODAY
    const startedOn = "2026-05-15";
    mockDb.habits.__map.set(h.id, { ...h, startedOn });
    const res = await submitEntry(fullEntry(TODAY), [h.id]);
    expect(res.archivedHabits.map((x) => x.name)).toContain("meditate");
    expect((await mockDb.habits.get(h.id)).archivedAt).not.toBeNull();
  });
  it("rename/delete", async () => {
    const h = await addHabit("old");
    await renameHabit(h.id, "new");
    expect((await mockDb.habits.get(h.id)).name).toBe("new");
    await deleteHabit(h.id);
    expect(await mockDb.habits.get(h.id)).toBeUndefined();
  });
});

describe("monthly rewards", () => {
  it("set/claim lifecycle", async () => {
    await setMonthlyReward("2026-08", "buy a game");
    await claimReward("2026-08"); // not yet evaluated -> no-op safe
    // simulate evaluation result
    await setMonthlyReward("2026-07", "dinner out");
    await mockDb.meta.put({ key: "reward:2026-07", value: { month: "2026-07", text: "dinner out", status: "earned" } });
    await claimReward("2026-07");
    expect((await mockDb.meta.get("reward:2026-07")).value.status).toBe("claimed");
  });

  it("evaluateFinishedMonths grades past month once", async () => {
    // 16 perfect entries in July 2026 -> eligible + ratio high
    for (let d = 1; d <= 16; d++) {
      const date = `2026-07-${String(d).padStart(2, "0")}`;
      await submitEntry(fullEntry(date), []);
    }
    const res = await evaluateFinishedMonths("2026-08-01");
    expect(res).toContainEqual({ month: "2026-07", unlocked: true });
    const rec = (await mockDb.meta.get("reward:2026-07")).value;
    expect(rec.status).toBe("earned"); // even without preset text, earned is recorded
    // idempotent
    expect(await evaluateFinishedMonths("2026-08-01")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- repository`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement repository**

```ts
/* AI-CONTEXT-NOTE:{"R":"Sole write path to IndexedDB: entries, habits, meta (drafts/rewards).","IDD":[{"?":"Every mutation is an exported async fn; components/hooks NEVER touch db.write directly."},{"?":"submitEntry runs atomically: entry upsert + draft clear + habit day-100 auto-archive."},{"?":"evaluateFinishedMonths is lazy grading called on app open; idempotent via final statuses."},{"?":"Day-100 archive is calendar-based: archivedAt set when entry.date == startedOn+99d."}],"A":[{"!!!":"lib/hooks/*.ts consume these; never call from inside useLiveQuery"},{"?":"components/journal/JournalWizard.tsx submit flow"},{"?":"components/settings/SettingsView.tsx import/export"}],"AB":[{"?":"lib/db/schema.ts"},{"?":"lib/scoring.ts evaluateMonth"},{"?":"lib/format.ts addDays/monthKeyOf"}],"E":[{"!!":"tests/repository.test.ts"},{"!!":"npm run build"}]} */
import {
  db, DRAFT_KEY, newId, rewardKey,
  type DayEntry, type Habit, type JournalDraft, type MetaRow, type RewardRecord, type RewardStatus,
} from "@/lib/db/schema";
import { addDays, monthKeyOf, todayStr } from "@/lib/format";
import { evaluateMonth } from "@/lib/scoring";

async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

async function putMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export function getDraft() { return getMeta<JournalDraft>(DRAFT_KEY); }
export function saveDraft(draft: JournalDraft) { return putMeta(DRAFT_KEY, draft); }
export function clearDraft() { return db.meta.delete(DRAFT_KEY); }

export function getTodayEntry(today: string) { return db.entries.get(today); }

export async function getLatestEntryBefore(date: string): Promise<DayEntry | undefined> {
  const all = await db.entries.toArray();
  const before = all.filter((e) => e.date < date).sort((a, b) => b.date.localeCompare(a.date));
  return before[0];
}

export async function submitEntry(
  payload: DayEntry,
  _activeHabitIds: string[],
): Promise<{ archivedHabits: Habit[] }> {
  const archivedHabits: Habit[] = [];
  await db.transaction("rw", db.entries, db.habits, db.meta, async () => {
    await db.entries.put({ ...payload, updatedAt: Date.now() });
    await db.meta.delete(DRAFT_KEY);
    const actives = await db.habits.where("archivedAt").equals(null).toArray();
    for (const h of actives) {
      if (payload.date === addDays(h.startedOn, 99)) {
        const archived: Habit = { ...h, archivedAt: payload.date };
        await db.habits.put(archived);
        archivedHabits.push(archived);
      }
    }
  });
  return { archivedHabits };
}

export async function addHabit(name: string): Promise<Habit> {
  const habit: Habit = { id: newId(), name: name.trim(), startedOn: todayStr(), archivedAt: null };
  await db.habits.add(habit);
  return habit;
}

export async function renameHabit(id: string, name: string): Promise<void> {
  await db.habits.update(id, { name: name.trim() });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.habits.delete(id);
}

export function getActiveHabits(): Promise<Habit[]> {
  return db.habits.where("archivedAt").equals(null).toArray();
}

export function getArchivedHabits(): Promise<Habit[]> {
  return db.habits.filter((h) => h.archivedAt !== null).toArray();
}

const FINAL: RewardStatus[] = ["earned", "missed", "claimed"];

export function getReward(month: string) {
  return getMeta<RewardRecord>(rewardKey(month));
}

export async function setMonthlyReward(month: string, text: string): Promise<void> {
  const existing = await getReward(month);
  const status: RewardStatus =
    existing && FINAL.includes(existing.status) ? existing.status : existing?.status === "pending" || !existing ? "active" : existing.status;
  await putMeta(rewardKey(month), { ...(existing ?? { month }), month, text, status } satisfies RewardRecord);
}

export async function claimReward(month: string): Promise<void> {
  const existing = await getReward(month);
  if (existing?.status !== "earned") return;
  await putMeta(rewardKey(month), { ...existing, status: "claimed" } satisfies RewardRecord);
}

export async function evaluateFinishedMonths(
  today: string,
): Promise<{ month: string; unlocked: boolean }[]> {
  const results: { month: string; unlocked: boolean }[] = [];
  const all = await db.entries.toArray();
  const months = new Set(all.map((e) => monthKeyOf(e.date)));
  const currentMonth = monthKeyOf(today);
  for (const month of months) {
    if (month >= currentMonth) continue;
    const existing = await getReward(month);
    if (existing && FINAL.includes(existing.status)) continue;
    const monthEntries = all.filter((e) => monthKeyOf(e.date) === month);
    const evaluation = evaluateMonth(monthEntries, month);
    const status: RewardStatus = evaluation.unlocked ? "earned" : "missed";
    const record: RewardRecord = {
      month,
      text: existing?.text ?? null,
      status,
      score: evaluation.score,
      maxPossible: evaluation.maxPossible,
      ratio: evaluation.ratio,
    };
    await putMeta(rewardKey(month), record);
    results.push({ month, unlocked: evaluation.unlocked });
  }
  return results;
}
```

- [ ] **Step 4: Read hooks**

`lib/hooks/useEntries.ts`:

```ts
/* AI-CONTEXT-NOTE:{"R":"Read hook: all entries newest-first. READ ONLY - never write inside useLiveQuery.","IDD":[{}],"A":[{"?":"dashboard/habits/settings views"}],"AB":[{"?":"dexie-react-hooks"},{"?":"lib/db/schema.ts"}],"E":[{"!!":"never call repository fns inside the querier"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useEntries() {
  return useLiveQuery(() =>
    db.entries.orderBy("date").reverse().toArray(), []);
}
```

`lib/hooks/useHabits.ts`:

```ts
/* AI-CONTEXT-NOTE:{"R":"Read hooks for habits (active + archived lists). READ ONLY.","IDD":[{}],"A":[{"?":"components/journal/steps/HabitsStep.tsx"},{"?":"components/habits/HabitsView.tsx"}],"AB":[{"?":"dexie-react-hooks"}],"E":[{"!!":"writes go through lib/db/repository.ts"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useActiveHabits() {
  return useLiveQuery(() => db.habits.where("archivedAt").equals(null).toArray(), []);
}

export function useArchivedHabits() {
  return useLiveQuery(() => db.habits.filter((h) => h.archivedAt !== null).toArray(), []);
}
```

`lib/hooks/useMeta.ts`:

```ts
/* AI-CONTEXT-NOTE:{"R":"Generic reactive reader for one meta row (drafts, rewards). READ ONLY.","IDD":[{"?":"Returns undefined while loading - callers must handle pending."}],"A":[{"?":"dashboard RewardBanner reads reward:YYYY-MM rows"}],"AB":[{"?":"dexie-react-hooks"}],"E":[{"!!":"writes via lib/db/repository.ts"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useMetaValue<T>(key: string): T | undefined {
  return useLiveQuery(async () => {
    const row = await db.meta.get(key);
    return row?.value as T | undefined;
  }, [key]);
}
```

Copy cash-guard's `useHydrated.ts` and `useServiceWorkerUpdate.ts` verbatim into `lib/hooks/`.

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- repository`
Expected: PASS.

- [ ] **Step 6: Build + lint**

Run: `npm run build && npm run lint`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add lib/db/repository.ts lib/hooks tests/repository.test.ts
git commit -m "feat: repository write path + reactive read hooks"
```

### Task 12: `lib/exportImport.ts` (TDD)

**Files:**
- Create: `lib/exportImport.ts`
- Test: `tests/exportImport.test.ts`

**Interfaces:**
- Consumes: schema types, zod.
- Produces:
  - `interface BackupFile { app: 'day-drop'; version: number; exportedAt: string; entries: DayEntry[]; habits: Habit[]; rewards: RewardRecord[] }`
  - `buildBackup(entries: DayEntry[], habits: Habit[], rewards: RewardRecord[]): BackupFile`
  - `parseBackup(json: string): { ok: true; data: BackupFile } | { ok: false; error: string }` - strict zod validation
  - `mergeBackup(data: BackupFile): Promise<{ importedEntries: number; skippedEntries: number; importedHabits: number; importedRewards: number }>` - skips rows whose primary key exists; habits merge by id.

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => {
  function makeTable() {
    const map = new Map<string, any>();
    return {
      get: async (k: string) => map.get(k),
      put: async (v: any) => void map.set(v.date ?? v.key ?? v.id, v),
      bulkAdd: async (vs: any[]) =>
        void vs.forEach((v) => map.set(v.date ?? v.key ?? v.id, v)),
      toArray: async () => [...map.values()],
      __map: map,
    };
  }
  return { mockDb: { entries: makeTable(), habits: makeTable(), meta: makeTable() } };
});

vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return { ...actual, db: mockDb as unknown as typeof actual.db };
});

import { buildBackup, mergeBackup, parseBackup } from "@/lib/exportImport";
import type { DayEntry } from "@/lib/db/schema";

const entry: DayEntry = {
  date: "2026-08-23", work: "fun", health: "healthy", weather: [], stepsTier: 3,
  workouts: [], screenTimeTier: 2, readingTier: 2, sleptAt: "22:30", wokeAt: "06:30",
  mood: "happy", highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
  todayTasks: [], tomorrowPlan: ["a"], bucketList: null, habitsChecked: [],
  createdAt: 1, updatedAt: 1,
};

beforeEach(() => {
  mockDb.entries.__map.clear();
  mockDb.habits.__map.clear();
  mockDb.meta.__map.clear();
});

describe("exportImport", () => {
  it("round-trips a backup", () => {
    const backup = buildBackup([entry], [], []);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.entries[0].date).toBe("2026-08-23");
  });
  it("rejects garbage", () => {
    expect(parseBackup("{not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other" })).ok).toBe(false);
  });
  it("merge skips duplicates and counts", async () => {
    await mockDb.entries.put(entry);
    const res = await mergeBackup({ ...buildBackup([entry, { ...entry, date: "2026-08-24" }], [], []), });
    expect(res.importedEntries).toBe(1);
    expect(res.skippedEntries).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- exportImport`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
/* AI-CONTEXT-NOTE:{"R":"JSON backup build/parse/merge for settings import-export.","IDD":[{"?":"Strict zod validation before touching the DB; duplicates by primary key are skipped."},{"?":"Rewards are restored as-is (they are already final or active records)."}],"A":[{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"zod"},{"?":"lib/db/schema.ts"},{"?":"lib/db/repository.ts is NOT used here - direct db writes in one transaction"}],"E":[{"!!":"tests/exportImport.test.ts"},{"?":"Never partially import: wrap merge in db.transaction"}]} */
import { z } from "zod";
import { db, type DayEntry, type Habit, type RewardRecord } from "@/lib/db/schema";

const checklistItemSchema = z.object({ text: z.string(), done: z.boolean() });

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  work: z.string(), health: z.string(), weather: z.array(z.string()),
  stepsTier: z.number().int().min(0).max(6),
  workouts: z.array(z.string()),
  screenTimeTier: z.number().int().min(0).max(7),
  readingTier: z.number().int().min(0).max(6),
  sleptAt: z.string(), wokeAt: z.string(), mood: z.string(),
  highlight: z.string(), improve: z.string(), grateful: z.string(),
  todayTasks: z.array(checklistItemSchema),
  tomorrowPlan: z.array(z.string()),
  bucketList: z.string().nullable(),
  habitsChecked: z.array(z.string()),
  createdAt: z.number(), updatedAt: z.number(),
});

const habitSchema = z.object({
  id: z.string(), name: z.string(),
  startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const rewardSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  text: z.string().nullable(),
  status: z.enum(["pending", "active", "earned", "missed", "claimed"]),
  score: z.number().optional(), maxPossible: z.number().optional(), ratio: z.number().optional(),
});

const backupSchema = z.object({
  app: z.literal("day-drop"),
  version: z.number(),
  exportedAt: z.string(),
  entries: z.array(entrySchema),
  habits: z.array(habitSchema),
  rewards: z.array(rewardSchema),
});

export type BackupFile = z.infer<typeof backupSchema>;

export function buildBackup(
  entries: DayEntry[], habits: Habit[], rewards: RewardRecord[],
): BackupFile {
  return {
    app: "day-drop", version: 1, exportedAt: new Date().toISOString(),
    entries, habits, rewards,
  };
}

export function parseBackup(json: string):
  { ok: true; data: BackupFile } | { ok: false; error: string } {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return { ok: false, error: "Not valid JSON" }; }
  const parsed = backupSchema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "Unrecognized backup format" };
}

export async function mergeBackup(data: BackupFile) {
  let importedEntries = 0, skippedEntries = 0, importedHabits = 0, importedRewards = 0;
  await db.transaction("rw", db.entries, db.habits, db.meta, async () => {
    for (const e of data.entries) {
      if (await db.entries.get(e.date)) skippedEntries++;
      else { await db.entries.put(e); importedEntries++; }
    }
    for (const h of data.habits) {
      if (!(await db.habits.get(h.id))) { await db.habits.put(h); importedHabits++; }
    }
    for (const r of data.rewards) {
      const key = `reward:${r.month}`;
      if (!(await db.meta.get(key))) { await db.meta.put({ key, value: r }); importedRewards++; }
    }
  });
  return { importedEntries, skippedEntries, importedHabits, importedRewards };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- exportImport`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/exportImport.ts tests/exportImport.test.ts
git commit -m "feat: json backup export/import"
```

---

### Task 13: Wizard UI components

**Files:**
- Create: `components/journal/JournalWizard.tsx`, `components/journal/StepRenderer.tsx`, `components/journal/steps/RadioStep.tsx`, `components/journal/steps/CheckboxStep.tsx`, `components/journal/steps/SleepStep.tsx`, `components/journal/steps/TextStep.tsx`, `components/journal/steps/TasksChecklistStep.tsx`, `components/journal/steps/TomorrowPlanStep.tsx`, `components/journal/steps/HabitsStep.tsx`, `components/journal/CelebrationScreen.tsx`
- Modify: `app/page.tsx` (render DashboardView placeholder that mounts wizard on Fab click - full dashboard lands in Task 14)
- Test: extend `tests/machine.test.ts` coverage only; UI verified via build/lint/manual smoke

**Interfaces:**
- Consumes: machine reducer/canAdvance/answerFor (Task 10), STEPS config (Task 5), repository draft fns + submitEntry (Task 11), carryover helpers (Task 7), useActiveHabits (Task 11).
- Produces: `<JournalWizard open onOpenChange onSubmitted />` - full-screen fixed overlay (`fixed inset-0 z-50 bg-background flex flex-col`). Internal flow: on open -> load draft via repository.getDraft(); if draft.date !== today start fresh at saved stepIndex 0 with answers {}; every answer/step change -> saveDraft (fire-and-forget). On final submit -> assemble full DayEntry (defaults: weather [] allowed, bucketList empty->null), call submitEntry(entry, activeHabitIds.map(id)), show CelebrationScreen when result.archivedHabits non-empty OR reward evaluation pending flag, then onOpenChange(false) + onSubmitted() callback so parent refreshes banner.

Component contracts (each receives `{ step: StepDef; value: unknown; onChange(patch: Partial<DayEntry>): void }` plus extras noted):

- `RadioStep` - renders question + option list as large tappable rows (button per option, selected state `bg-primary text-primary-foreground`); tier-radio identical rendering.
- `CheckboxStep` - multi-toggle rows with check icons; if step.id === 'workout', enforce rest-day exclusivity: toggling any workout id removes 'rest-day' and vice versa (pure onChange patch logic here).
- `SleepStep` - two shadcn Selects; sleptAt options 20:00->23:45 step 15min; wokeAt 00:00->10:00 step 15min; writes `{sleptAt, wokeAt}`.
- `TextStep` - textarea + live char counter `n/minChars`; optional steps show "(optional)" hint; empty optional writes null for bucketList at submit (component emits "" and wizard normalizes).
- `TasksChecklistStep` - receives extra prop `tasks: ChecklistItem[]`; checkbox rows; Next press while unchecked exist triggers sonner warning toast ("You have N unfinished tasks") AND opens AlertDialog "Move N unfinished tasks to tomorrow?" - Yes: stash carried texts into wizard-local state consumed by TomorrowPlanStep, mark tasks done=false but proceed (they simply won't be in tomorrowPlan unless confirmed); No: proceed dropping them.
- `TomorrowPlanStep` - local editable list seeded from carried texts + existing answers.tomorrowPlan; input+add button, delete icon per row; writes array on every change.
- `HabitsStep` - lists active habits w/ `day N/100` badge (N = diffDays(today, startedOn)+1 clamped 1..100); toggle adds/removes habit id in answers.habitsChecked; empty state links to /habits.
- `CelebrationScreen` - confetti-free simple celebratory card (big emoji, habit names solidified); button "Let's go!" dismisses.

- [ ] **Step 1: Implement step components** following the contracts above. Each file starts with an AI-CONTEXT-NOTE. Use existing ui primitives (`Button`, `Checkbox`, `Label`, `Select`, `Textarea`, `AlertDialog`, `Badge`). Keep each component under ~120 lines; no business logic beyond stated exclusivity/carryover wiring.

- [ ] **Step 2: Implement StepRenderer**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Dispatches a StepDef to its typed step component.","IDD":[{"?":"Keeps JournalWizard free of per-type branching."}],"A":[{"?":"components/journal/JournalWizard.tsx"}],"AB":[{"?":"components/journal/steps/*"}],"E":[{"!!":"new step types must be added here AND to STEPS config together"}]} */
"use client";
import type { StepDef } from "@/lib/journal/steps";
import type { DayEntry, ChecklistItem } from "@/lib/db/schema";
import { RadioStep } from "./steps/RadioStep";
import { CheckboxStep } from "./steps/CheckboxStep";
// ...one import per step component

interface RendererProps {
  step: StepDef;
  answers: Partial<DayEntry>;
  answerValue: unknown;
  tasks?: ChecklistItem[];
  carried?: string[];
  onCarried?(texts: string[]): void;
  onChange(patch: Partial<DayEntry>): void;
}
```

Switch on `step.type`: radio/tier-radio -> RadioStep; checkbox -> CheckboxStep; sleep -> SleepStep; text -> TextStep; tasks -> TasksChecklistStep (pass tasks + carried handlers); tomorrow -> TomorrowPlanStep (pass carried); habits -> HabitsStep. Return null default.

- [ ] **Step 3: Implement JournalWizard** - structure:

```tsx
/* AI-CONTEXT-NOTE header here */
"use client";
// state: WizardState via useReducer(machine), carried: string[], celebration: Habit[]|null
// effects:
//   on open: getDraft() inside try/catch -> hydrate state (answers, stepIndex clamp);
//     any error or draft.date !== today => start from initialWizardState() (corrupt drafts are
//     silently discarded, never crash the wizard)
//   on state change: saveDraft({date: todayStr(), stepIndex, answers})
// footer: Back button (hidden step 0) + progress dots + Next/Finish button disabled by !canAdvance
// last step Finish -> build entry, normalize bucketList "" -> null,
//   await submitEntry(entry, activeHabits.map(h=>h.id)) -> setCelebration(result.archivedHabits)
//   -> after user dismisses celebration: clearDraft already done; call onOpenChange(false)+onSubmitted()
```

Render nothing when `!open`. Question header shows `step.order`/16 dots. All copy from `step.question`.

- [ ] **Step 4: Wire into `app/page.tsx`** temporarily: client wrapper component `components/dashboard/DashboardView.tsx` created now as minimal orchestrator (header shell + Fab mode plus/edit based on `useEntries()` today lookup + `<JournalWizard/>`); page stays thin server component rendering it.

```tsx
/* AI-CONTEXT-NOTE:{"R":"Dashboard orchestrator: greeting, reward banner, heatmap, streak chips, trend chart, Fab + JournalWizard mount.","IDD":[{"?":"Fab switches to edit mode when today's entry exists."},{"?":"SW registration mounts here in production (PWA task)."}],"A":[{"?":"app/page.tsx"}],"AB":[{"?":"lib/hooks/useEntries.ts"},{"?":"components/journal/JournalWizard.tsx"},{"?":"dashboard sub-components (later tasks)"}],"E":[{"!!":"npm run build"}]} */
"use client";
// Minimal version for this task: Header + main + Fab + JournalWizard.
// Tasks 14 fills the sections between header and fab.
```

- [ ] **Step 5: Build + lint + manual smoke**

Run: `npm run build && npm run lint && npm test`
Expected: pass. Manual: `npm run dev`, click through all 16 steps with real taps; verify toast+dialog on s13 with unchecked task; verify s14 seeds carried task; verify draft resume after mid-wizard reload; verify same-day edit prefills.

- [ ] **Step 6: Commit**

```bash
git add components/journal components/dashboard app/page.tsx
git commit -m "feat: journal wizard overlay + step components"
```

### Task 14: Dashboard components

**Files:**
- Create/complete: `components/dashboard/RewardBanner.tsx`, `components/dashboard/HeatmapCalendar.tsx`, `components/dashboard/DayDetailSheet.tsx`, `components/dashboard/StreakChips.tsx`, `components/dashboard/TrendChart.tsx`; complete `components/dashboard/DashboardView.tsx`
- Test: `tests/dashboard-view.test.ts` (render states with mocked hooks)

**Interfaces:**
- Consumes: `useEntries`, `useMetaValue<RewardRecord>(rewardKey(month))`, `evaluateFinishedMonths` on mount (Task 11), `allStreaks` (Task 7), `scoreEntry` (Task 6), STEPS labels via `optionLabel` (Task 5), format helpers.
- Produces: composed `<DashboardView/>` rendering, top to bottom inside the shell:
  1. Greeting row: "DayDrop" date line + flame chip showing journal streak (`IconFlame` + count).
  2. `<RewardBanner month rewardRecord monthEntriesCount />`: three states - no record or text null -> CTA card linking to /settings ("set your monthly reward"); active -> progress bar `score/(0.8*maxSoFar)` where score = sum of scoreEntry totals for current-month entries and maxSoFar = daysWithEntries*70; earned/claimed -> celebratory card + claim button when status==='earned' calling repository.claimReward(month).
  3. `<HeatmapCalendar entries onPickDay />`: month state (default current), grid Mon-Sun columns, cells colored by bucket of day total over 70 (`bg-primary` opacity classes for 1-17/18-35/36-52/53-70; empty = `bg-muted`), future days disabled, tap journaled past/today cell -> onPickDay(date). Month nav arrows prev/next (next disabled at current month).
  4. `<DayDetailSheet entry />` (shadcn Sheet bottom): story-style readout - mood label as title, weather icons row, workout chips via optionLabel, sleep window "slept 22:30 -> woke 06:30", highlight/grateful/improve as quote blocks, todayTasks with check/cross icons, habits checked list, steps/reading/screen tiers as labels. Unknown habit ids render "(removed habit)".
  5. `<StreakChips streaks />`: horizontal scroll row of 8 chips (IconFlame journal + IconRun steps + IconSalad health? use Tabler: IconHeart health, IconRun steps, IconBarbell workout, IconDeviceMobile screenTime, IconBook reading, IconBed sleep, IconChecklist habits) each `name N`.
  6. `<TrendChart entries />`: recharts LineChart of last 30 daily totals (nulls as connectable gaps), wrapped in shadcn ChartContainer with 1 series colored chart-1.

- [ ] **Step 1: Implement the five leaf components per contracts above. AI-CONTEXT-NOTE on each. Keep HeatmapCalendar math local (first weekday offset via fromStr().getDay(), Monday-first remap).**

- [ ] **Step 2: Complete DashboardView** - mount order above; on mount effect calls `repository.evaluateFinishedMonths(todayStr())` once (guarded by a ref); Fab mode plus vs edit from `useEntries()`; passes picked day to DayDetailSheet.

- [ ] **Step 3: Write render-state test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

const { useEntries } = vi.hoisted(() => ({ useEntries: vi.fn() }));
vi.mock("@/lib/hooks/useEntries", () => ({ useEntries }));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: (fn: unknown) => undefined }));

import { StreakChips } from "@/components/dashboard/StreakChips";

describe("dashboard pieces", () => {
  it("renders zero-state streak chips", () => {
    const zero = { journal: 0 } as any;
    render(createElement(StreakChips, { streaks: zero }));
    expect(screen.getByText(/start a streak/i)).toBeInTheDocument();
  });
});
```

Extend with RewardBanner earned-state assertion if time permits (mock `useMetaValue`).

- [ ] **Step 4: Run tests/build/lint**

Run: `npm test && npm run build && npm run lint`
Expected: all pass.

- [ ] **Step 5: Manual smoke**

`npm run dev` -> submit one real entry -> dashboard shows flame=1, heatmap today colored, chips populated, trend point visible, tapping today opens detail sheet. Same-day edit via pencil FAB prefills wizard.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard tests/dashboard-view.test.ts
git commit -m "feat: dashboard - heatmap, streaks, trend, reward banner"
```

---

### Task 15: Habits page

**Files:**
- Create: `components/habits/HabitsView.tsx`, `components/habits/HabitDialog.tsx`
- Modify: `app/habits/page.tsx` (render HabitsView)
- Test: none beyond build/lint (thin CRUD UI); logic already covered by repository tests

**Interfaces:**
- Consumes: `useActiveHabits`, `useArchivedHabits`, repository `addHabit/renameHabit/deleteHabit`, ui Dialog/Input/Button/AlertDialog/Progress/Badge.
- Produces: HabitsView - two sections. Active: rows with name, `day N/100` badge (N = clamp(diffDays(today, startedOn)+1, 1, 100)), thin Progress bar (N%), edit + delete actions (delete uses AlertDialog confirm; note in confirm body that history keeps the id). Archived "Solidified": name + completed-on date. Floating add button opens HabitDialog (name input, save -> addHabit). Soft cap: when >=12 active, show muted warning text in dialog.

- [ ] **Step 1: Implement HabitDialog** (create/edit modes; controlled open props).
- [ ] **Step 2: Implement HabitsView** wiring hooks + dialogs; empty states ("no habits yet - add your first").
- [ ] **Step 3: Update `app/habits/page.tsx`** to render `<HabitsView/>` inside standard shell.
- [ ] **Step 4: Verify**

Run: `npm run build && npm run lint && npm test`
Manual smoke: add a habit -> it appears with `day 1/100` and shows up in wizard step 16; rename and delete work (delete confirms first). Archived section only fills via the submitEntry day-100 path or manual archive - not by editing startedOn directly.

- [ ] **Step 5: Commit**

```bash
git add components/habits app/habits
git commit -m "feat: habits manager page"
```

---

### Task 16: Settings page

**Files:**
- Create: `components/settings/SettingsView.tsx`
- Modify: `app/settings/page.tsx`
- Test: none new (logic covered by exportImport/repository tests)

**Interfaces:**
- Consumes: repository `getReward/setMonthlyReward/getActiveHabits/getArchivedHabits`, db direct reads via hooks pattern for export data (`useLiveQuery` reads of entries+habits+meta rewards are fine here since export only READS then builds file client-side), `buildBackup/parseBackup/mergeBackup`, `useHydrated`, theme from next-themes `useTheme`, cash-guard `useServiceWorkerUpdate`, APP_VERSION from `lib/version.ts`.
- Produces: cards:
  1. Monthly reward - month input (type="month") defaulting to current, textarea for reward text, Save button -> setMonthlyReward; shows current record status badge.
  2. Scoring reference - static read-only table rendered FROM `STEPS` config (option labels + points / tierScores) so docs can never drift from code.
  3. Data - Export button (build backup from live queries -> JSON blob download `day-drop-backup-YYYY-MM-DD.json` via URL.createObjectURL); Import file input -> parseBackup -> mergeBackup -> sonner success/error toast with counts.
  4. Appearance - light/dark/system toggle group.
  5. About - version + "check for update" area using useServiceWorkerUpdate (Restart button posts SKIP_WAITING).

- [ ] **Step 1: Implement SettingsView per contract** (AI-CONTEXT-NOTE header; semantic tokens; no hardcoded hex).
- [ ] **Step 2: Update `app/settings/page.tsx`.**
- [ ] **Step 3: Verify**

Run: `npm run build && npm run lint && npm test`
Manual: export downloads valid JSON; importing the same file reports 0 imported (all skipped); setting reward text reflects on dashboard banner.

- [ ] **Step 4: Commit**

```bash
git add components/settings app/settings
git commit -m "feat: settings - reward preset, scoring reference, backup, theme"
```

---

### Task 17: PWA - manifest, service worker, version stamping, icon

**Files:**
- Create: `public/manifest.webmanifest`, `public/sw.js`, `public/images/launcher-512.png` (copied), `scripts/stamp-version.mjs`, generate `lib/version.ts` via script
- Modify: `package.json` (build script), `components/dashboard/DashboardView.tsx` (register SW in production)

**Interfaces:**
- Consumes: cash-guard reference files.
- Produces: installable standalone PWA with user-approved updates.

- [ ] **Step 1: Copy infra files**

```bash
mkdir -p public/images scripts
cp ../cash-guard/scripts/stamp-version.mjs scripts/stamp-version.mjs
cp ../cash-guard/public/sw.js public/sw.js
cp ../cash-guard/public/images/android/launchericon-512x512.png public/images/launcher-512.png
```Edit copied files: replace every `cash-guard-v` cache prefix with `day-drop-v`; manifest name/short_name `DayDrop`, description, theme_color/background_color matching palette (`#e8833a` family), `src: "/images/launcher-512.png"` sizes `512x512` purpose `"any maskable"`. Add AI-CONTEXT-NOTE to sw.js + stamp-version.mjs line 1.

- [ ] **Step 2: package.json scripts**

`"build": "node scripts/stamp-version.mjs && next build"` (keep dev/test/lint as-is).

- [ ] **Step 3: Register SW in DashboardView** - copy cash-guard's registration snippet into DashboardView's mount effect:

```tsx
useEffect(() => {
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
}, []);
```

(If cash-guard registers elsewhere, mirror their placement but DayDrop has no TransactionsView - dashboard mount is correct.)

- [ ] **Step 4: Verify stamping + build**

Run: `npm run build`
Expected: `lib/version.ts` generated exporting APP_VERSION matching package.json; sw.js VERSION stamped; dist output includes manifest.

- [ ] **Step 5: Manual PWA smoke (production)**

```bash
npm run start
```

Desktop Chrome DevTools > Application: manifest loads, SW activated, offline reload works (cache-first shell). Lighthouse PWA installable check green. iOS Safari: Add to Home Screen opens standalone.

- [ ] **Step 6: Commit**

```bash
git add public scripts lib/version.ts package.json components/dashboard/DashboardView.tsx
git commit -m "feat: pwa - manifest, service worker, installable offline shell"
```

---

### Task 18: Final verification gate

**Files:** none created; repo-wide verification.

- [ ] **Step 1: Full gate**

Run: `npm run build && npm run lint && npm test`
Expected: all green, zero TS errors, no lint warnings left unfixed.

- [ ] **Step 2: Spec conformance sweep**

Walk `docs/superpowers/specs/2026-08-23-day-drop-mvp-design.md` section by section against the running app: 16 questions exact copy; min-20-char validation; carry-over toast+dialog; >=1 tomorrow task rule; same-day edit lock after midnight (change device clock or temporarily mock todayStr in a scratch test to confirm lock); scoring spot-checks (rest-day=1pt day totals 1+... etc); monthly banner progress math; habit day-100 celebration; export/import; offline reload; dark mode.

- [ ] **Step 3: Fix findings, commit any fixes**

```bash
git add -A
git commit -m "fix: spec conformance fixes from final sweep"
```

(Only if needed.)

---

## Execution notes

- Tasks 6 and 8 may execute in either order (scoring imports schema types). Recommended order stays 1..18 with that swap if a subagent hits the import.
- Every task ends green: its own tests pass AND `npm run build && npm run lint` clean before commit.
- Never modify an executed task's committed behavior without updating its tests in the same commit.

