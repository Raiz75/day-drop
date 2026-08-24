# Aura Points System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace monthly rewards with a lifetime points pool where 1500 accumulated journal points can be redeemed for "+1 Aura".

**Architecture:** Balance is always *derived* (`Σ scoreEntry totals − 1500 × auraCount`); redemptions are timestamped `aura:<uuid>` rows in the existing Dexie `meta` table. Monthly reward machinery is fully wiped (types, repo fns, UI, backup format).

**Tech Stack:** Next.js App Router + React 19, TypeScript, Dexie 4 (`useLiveQuery`), Tailwind v4 + shadcn/ui, Vitest + Testing Library.

## Global Constraints

- Every code file created/edited MUST carry the single-line `AI-CONTEXT-NOTE` JSON header as its FIRST line (no spaces after `:` `,` `{` `}`); never delete an existing note — update it.
- Only `lib/db/repository.ts` may write IndexedDB; hooks/components read via `useLiveQuery` only.
- All hooks before early returns in Views; no setState-in-effect (lint-enforced).
- Dexie migrations versioned/additive only — this feature adds NO store/index changes (meta values are schemaless).
- Verify each task with targeted `npm test -- <file>`; finish with `npm test`, `npm run lint`, `npm run build`.
- Copy strings verbatim from this plan (user-chosen voice): `"you can reward yourself now my dude"`, button `"Reward self"`, toast `"+1 aura"`.

---

### Task 1: Domain core — points math in `lib/scoring.ts`

**Files:**
- Modify: `lib/scoring.ts`
- Test: `tests/scoring.test.ts`

**Interfaces:**
- Produces: `AURA_COST: number` (=1500), `totalPoints(entries: DayEntry[]): number`, `pointsBalance(entries: DayEntry[], redeemedCount: number): number`. Removes `monthScore`, `evaluateMonth`, `MIN_MONTH_COVERAGE_RATIO`.

- [ ] **Step 1: Replace the `evaluateMonth` test block** in `tests/scoring.test.ts` (keep the `scoreEntry` describe intact). Update the import line to `import { AURA_COST, pointsBalance, scoreEntry, totalPoints } from "@/lib/scoring";` and replace lines 57–77 with:

```ts
describe("aura points", () => {
  it("totalPoints sums daily totals across entries", () => {
    expect(totalPoints([])).toBe(0);
    expect(totalPoints([base])).toBe(57);
    expect(totalPoints([{ ...base, date: "2026-08-24" }, base])).toBe(114);
  });
  it("pointsBalance subtracts 1500 per redemption", () => {
    expect(pointsBalance([], 0)).toBe(0);
    expect(pointsBalance([base], 0)).toBe(57);
    expect(pointsBalance([base], 1)).toBe(-1443);
    expect(AURA_COST).toBe(1500);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/scoring.test.ts`
Expected: FAIL — missing exports `AURA_COST`/`totalPoints`/`pointsBalance`

- [ ] **Step 3: Implement in `lib/scoring.ts`** — delete `MIN_MONTH_COVERAGE_RATIO`, `monthScore`, `evaluateMonth`; drop `daysInMonth` from the `@/lib/format` import; append:

```ts
export const AURA_COST = 1500;

export function totalPoints(entries: DayEntry[]): number {
  return entries.reduce((sum, e) => sum + scoreEntry(e).total, 0);
}

export function pointsBalance(entries: DayEntry[], redeemedCount: number): number {
  return totalPoints(entries) - AURA_COST * redeemedCount;
}
```

Update the AI-CONTEXT-NOTE: role becomes "...daily total (max 70), lifetime aura-points balance (1500 pts per redemption)"; IDD gains `{"?":"pointsBalance derives from entries live - never stored","!":"evaluateMonth/monthScore removed in full wipe - old reward:* meta rows are inert"}`; E adds `tests/settings-aura.test.ts` consumers.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/scoring.test.ts`
Expected: PASS

---

### Task 2: Schema — swap Reward types for Aura

**Files:**
- Modify: `lib/db/schema.ts:38-58`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Produces: `interface AuraRecord { at: string }`, `function auraKey(id: string): string` → `` `aura:${id}` ``. Deletes `RewardStatus`, `RewardRecord`, `rewardKey`.

- [ ] **Step 1: Update `tests/schema.test.ts`** — import `{ DRAFT_KEY, auraKey, celebratedKey }`; replace the `expect(rewardKey("2026-08")).toBe("reward:2026-08")` line with `expect(auraKey("abc")).toBe("aura:abc");`

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/schema.test.ts`
Expected: FAIL — no `auraKey` export

- [ ] **Step 3: Edit `lib/db/schema.ts`** — replace lines 38–47 (`RewardStatus` + `RewardRecord`) with:

```ts
export interface AuraRecord {
  at: string;
}
```

and replace line 58 `rewardKey` with:

```ts
export function auraKey(id: string): string { return `aura:${id}`; }
```

Update the note's IDD meta-namespaces line to `draft, aura:<uuid>, celebrated:<habitId> (legacy reward:* rows inert)`.

Note: `npm test -- tests/schema.test.ts` alone fails compile-free, but `repository.test.ts`/`exportImport.test.ts`/components still import deleted symbols until Tasks 3/5/6/7 land — that ordering is expected; only assert schema test here.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/schema.test.ts`
Expected: PASS

---

### Task 3: Repository — `redeemAura()` replaces monthly fns

**Files:**
- Modify: `lib/db/repository.ts`
- Test: `tests/repository.test.ts`

**Interfaces:**
- Consumes: `auraKey` (Task 2), `newId()` (existing).
- Produces: `redeemAura(): Promise<void>` — sole redemption write path.

- [ ] **Step 1: In `tests/repository.test.ts`**, change the repository import list to drop `claimReward, evaluateFinishedMonths, getReward?, setMonthlyReward` and add `redeemAura`:

```ts
import {
  addHabit, clearDraft, deleteHabit,
  getDraft, getLatestEntryBefore, getTodayEntry, redeemAura, renameHabit, saveDraft,
  submitEntry,
} from "@/lib/db/repository";
```

Replace the whole `describe("monthly rewards", ...)` block (lines 144–168) with:

```ts
describe("redeemAura", () => {
  it("writes one aura:<id> meta row per call with an ISO timestamp", async () => {
    await redeemAura();
    let rows = [...mockDb.meta.__map.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toMatch(/^aura:[0-9a-f-]{36}$/);
    expect(new Date((rows[0].value as { at: string }).at).toString()).not.toBe("Invalid Date");
    await redeemAura();
    rows = [...mockDb.meta.__map.values()];
    expect(rows).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/repository.test.ts`
Expected: FAIL — `redeemAura` not exported

- [ ] **Step 3: Edit `lib/db/repository.ts`** — imports become:

```ts
import {
  db, DRAFT_KEY, newId, auraKey,
  type DayEntry, type Habit, type JournalDraft,
} from "./schema";
```

(adjust relative/alias to match current file: `@/lib/db/schema`) and delete `import { evaluateMonth } from "@/lib/scoring";`. Delete `getReward`, `setMonthlyReward`, `claimReward`, `evaluateFinishedMonths` (lines ~81–124). Append:

```ts
export async function redeemAura(): Promise<void> {
  await putMeta(auraKey(newId()), { at: new Date().toISOString() });
}
```

Update the AI-CONTEXT-NOTE: R stays; IDD swaps the `evaluateFinishedMonths` bullet for `{"?":"redeemAura appends an aura:<uuid> meta row; balance math lives in lib/scoring.pointsBalance"}`; AB drops `lib/scoring.ts evaluateMonth`, adds nothing; E drops month-grading pins, adds `!!":"redeemAura writes exactly one row per call"`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/repository.test.ts`
Expected: PASS

---

### Task 4: Read hook — `useAuraRecords`

**Files:**
- Create: `lib/hooks/useAura.ts`

**Interfaces:**
- Consumes: `db`, `AuraRecord` from `@/lib/db/schema`.
- Produces: `useAuraRecords(): AuraRecord[] | undefined` — newest-first; `undefined` while loading.

- [ ] **Step 1: Create `lib/hooks/useAura.ts`:**

```ts
/* AI-CONTEXT-NOTE:{"R":"Read hook for aura redemption records (meta aura:* rows). READ ONLY.","IDD":[{"?":"Returns undefined while loading; sorted newest-first by ISO 'at'."},{"!":"useMetaValue was deleted with the monthly-reward wipe - this replaces it for aura reads"}],"A":[{"?":"components/dashboard/DashboardView.tsx"},{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"dexie-react-hooks"},{"?":"lib/db/schema.ts"}],"E":[{"!!":"writes go through lib/db/repository.ts redeemAura"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db, type AuraRecord } from "@/lib/db/schema";

export function useAuraRecords(): AuraRecord[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.meta.filter((row) => row.key.startsWith("aura:")).toArray();
    return rows
      .map((row) => row.value as AuraRecord)
      .filter((v) => typeof v?.at === "string")
      .sort((a, b) => b.at.localeCompare(a.at));
  }, []);
}
```

- [ ] **Step 2: Verify nothing breaks yet**

Run: `npm test -- tests/repository.test.ts`
Expected: PASS (hook has no unit test — it is covered indirectly by Task 6/7 render tests mocking `useLiveQuery`)

---

### Task 5: Backup format v2 — drop `rewards`, add `aura`

**Files:**
- Modify: `lib/exportImport.ts`
- Test: `tests/exportImport.test.ts`

**Interfaces:**
- Produces: `buildBackup(entries: DayEntry[], habits: Habit[], aura: BackupAura[])` where `BackupAura = { id: string; at: string }`; `BackupFile` gains `aura: BackupAura[]`, loses `rewards`; `version: 2`; merge returns `importedAura` instead of `importedRewards`.

- [ ] **Step 1: Rewrite `tests/exportImport.test.ts`** body pieces:

```ts
import { buildBackup, mergeBackup, parseBackup } from "@/lib/exportImport";
```

Replace the three `it` blocks with:

```ts
describe("exportImport", () => {
  const aura = [{ id: "a1", at: "2026-08-23T10:00:00.000Z" }];

  it("round-trips entries, habits and aura", () => {
    const backup = buildBackup([entry], [], aura);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.entries[0].date).toBe("2026-08-23");
      expect(parsed.data.aura[0]).toEqual(aura[0]);
    }
  });
  it("rejects garbage and legacy v1 backups", () => {
    expect(parseBackup("{not json").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: "other" })).ok).toBe(false);
    const legacy = { app: "day-drop", version: 1, exportedAt: "t", entries: [], habits: [], rewards: [] };
    expect(parseBackup(JSON.stringify(legacy)).ok).toBe(false);
  });
  it("merge skips duplicates and counts auras", async () => {
    await mockDb.entries.put(entry as unknown as Parameters<typeof mockDb.entries.put>[0]);
    await mockDb.meta.put({ key: "aura:a1", value: { at: aura[0].at } });
    const res = await mergeBackup(buildBackup([entry, { ...entry, date: "2026-08-24" }], [], aura));
    expect(res.importedEntries).toBe(1);
    expect(res.skippedEntries).toBe(1);
    expect(res.importedAura).toBe(0);
    const res2 = await mergeBackup(buildBackup([], [], [{ ...aura[0], id: "a2" }]));
    expect(res2.importedAura).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/exportImport.test.ts`
Expected: FAIL — signature/zod mismatches

- [ ] **Step 3: Rewrite `lib/exportImport.ts`**: delete `rewardSchema`, `rewards` from `backupSchema`; add:

```ts
export interface BackupAura { id: string; at: string }

const backupSchema = z.object({
  app: z.literal("day-drop"),
  version: z.number(),
  exportedAt: z.string(),
  entries: z.array(entrySchema),
  habits: z.array(habitSchema),
  aura: z.array(z.object({ id: z.string(), at: z.string() })),
});
```

Change `buildBackup(entries, habits, aura): BackupFile` returning `version: 2` + `aura`; drop `RewardRecord` import. In `mergeBackup`, replace the rewards loop with:

```ts
let importedAura = 0;
for (const a of data.aura) {
  const key = `aura:${a.id}`;
  if (!(await db.meta.get(key))) { await db.meta.put({ key, value: { at: a.at } }); importedAura++; }
}
return { importedEntries, skippedEntries, importedHabits, importedAura };
```

(counters init updated accordingly). Update the AI-CONTEXT-NOTE: IDD notes `{"!":"v2 format dropped rewards entirely - v1 backups reject as unrecognized (full-wipe decision)"}`.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- tests/exportImport.test.ts`
Expected: PASS

---

### Task 6: Banner + dashboard rewiring

**Files:**
- Modify: `components/dashboard/RewardBanner.tsx` (rewrite)
- Modify: `components/dashboard/DashboardView.tsx`
- Test: `tests/dashboard-view.test.ts` (rewrite banner cases)

**Interfaces:**
- Consumes: `AURA_COST` (Task 1), `redeemAura` (Task 3), `useAuraRecords` (Task 4), `pointsBalance` (Task 1).
- Produces: `RewardBanner({ balance, auraCount, onRedeem })` presentational props.

- [ ] **Step 1: Rewrite `tests/dashboard-view.test.ts`** — keep StreakChips case + mocks; change repository mock to `vi.mock("@/lib/db/repository", () => ({ redeemAura: vi.fn(async () => {}) }));`, drop RewardBanner earned/CTA cases, add:

```ts
import { fireEvent } from "@testing-library/react";
import { AURA_COST } from "@/lib/scoring";

const onRedeem = vi.fn();

it("progress state shows balance toward the next aura", () => {
  render(createElement(RewardBanner, { balance: 57, auraCount: 2, onRedeem }));
  expect(screen.getByText(/57 \/ 1500 pts/i)).toBeInTheDocument();
  expect(screen.getByText(/aura: 2/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /reward self/i })).not.toBeInTheDocument();
});
it("ready state offers the reward-self action", () => {
  render(createElement(RewardBanner, { balance: AURA_COST + 100, auraCount: 2, onRedeem }));
  expect(screen.getByText(/you can reward yourself now my dude/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /reward self/i }));
  expect(onRedeem).toHaveBeenCalledTimes(1);
});
```

(`const onRedeem = vi.fn();` declared at module scope; no `month`/`record`/`monthEntries` props remain.)

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/dashboard-view.test.ts`
Expected: FAIL — current banner requires `record` prop

- [ ] **Step 3: Rewrite `components/dashboard/RewardBanner.tsx`:**

```tsx
/* AI-CONTEXT-NOTE:{"R":"Aura points banner: X/1500 progress toward next aura; ready state offers 'Reward self'. Presentational.","IDD":[{"?":"balance derived upstream via lib/scoring.pointsBalance(all entries, auraCount) - never stored"},{"?":"Copy pinned by tests: 'you can reward yourself now my dude', button 'Reward self'"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes balance/auraCount/onRedeem"},{"?":"tests/dashboard-view.test.ts pins copy + button"}],"AB":[{"?":"lib/scoring.ts AURA_COST"},{"?":"ui/card|badge|button|progress"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"},{"*":"balance undefined (loading) renders 0-progress safely"}]} */
"use client";

import { IconGift, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AURA_COST } from "@/lib/scoring";

interface Props {
  balance: number | undefined;
  auraCount: number;
  onRedeem: () => void;
}

export function RewardBanner({ balance, auraCount, onRedeem }: Props) {
  const ready = balance !== undefined && balance >= AURA_COST;
  const pct =
    balance === undefined ? 0 : Math.max(0, Math.min(100, Math.round((balance / AURA_COST) * 100)));

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {ready ? (
              <IconSparkles className="size-6 shrink-0 text-primary" />
            ) : (
              <IconGift className="size-6 shrink-0 text-primary" />
            )}
            {ready ? (
              <p className="font-heading text-base font-semibold">
                you can reward yourself now my dude
              </p>
            ) : (
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium tabular-nums">
                  {balance ?? 0} / {AURA_COST} pts
                </p>
                <Progress value={pct} aria-label={`aura progress ${balance ?? 0} of ${AURA_COST}`} />
              </div>
            )}
          </div>
          <Badge variant="secondary" className="h-auto shrink-0 py-1" aria-label={`aura count ${auraCount}`}>
            aura: {auraCount}
          </Badge>
        </div>
        {ready && <Button onClick={onRedeem}>Reward self</Button>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Rewire `components/dashboard/DashboardView.tsx`:** remove the `evaluated` ref + `evaluateFinishedMonths` effect, remove `useMetaValue`/`rewardKey`/`RewardRecord`/`evaluateFinishedMonths` imports and `rewardRecord`; remove `month`/`monthKeyOf`/`monthEntries` (now unused); add:

```ts
import { toast } from "sonner";
import { redeemAura } from "@/lib/db/repository";
import { useAuraRecords } from "@/lib/hooks/useAura";
import { pointsBalance } from "@/lib/scoring";
```

Inside the component, with other hooks (before early returns): `const auraRecords = useAuraRecords();`
After `const list = entries ?? [];`:

```ts
const auraCount = auraRecords?.length ?? 0;
const balance = entries ? pointsBalance(list, auraCount) : undefined;
const handleRedeem = () => {
  void redeemAura()
    .then(() => toast.success("+1 aura"))
    .catch(() => {});
};
```

Render: `<RewardBanner balance={balance} auraCount={auraCount} onRedeem={handleRedeem} />`.
Update the AI-CONTEXT-NOTE: drop lazy-grading/reward-record bullets, add `{"?":"balance = pointsBalance(all entries, auraCount) recomputed live"}`; AB swaps repository fn + schema refs accordingly.

- [ ] **Step 5: Run to verify pass (dashboard only)**

Run: `npm test -- tests/dashboard-view.test.ts`
Expected: PASS (SettingsView still references old fns → full-suite/build deferred to Task 8)

---

### Task 7: Settings Aura card + cleanup

**Files:**
- Modify: `components/settings/SettingsView.tsx`
- Create: `tests/settings-aura.test.ts`
- Delete: `tests/settings-reward.test.ts`, `lib/hooks/useMeta.ts` (verify zero consumers first)

**Interfaces:**
- Consumes: `useAuraRecords`, `pointsBalance`, `AURA_COST`, `buildBackup(entries, habits, aura)` (Task 5).

- [ ] **Step 1: Create `tests/settings-aura.test.ts`:**

```ts
/* AI-CONTEXT-NOTE:{"R":"Regression/render test: Settings shows the Aura card (balance + history) with no loading gate.","IDD":[{"?":"Replaces tests/settings-reward.test.ts after the monthly-reward full wipe."},{"?":"Hooks mocked: storage available=true, useAuraRecords=one record, useLiveQuery=[] (empty habits/aura meta reads)."}],"A":[{"!!!":"components/settings/SettingsView.tsx","CRITICAL":"must render Aura card without any saved-state gating"}],"AB":[{"?":"vitest.config.mts happy-dom + globals"}],"E":[{"!!":"npm test tests/settings-aura.test.ts"}]} */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/hooks/useHydrated", () => ({
  useHydrated: () => true,
  useStorageAvailable: () => true,
}));
vi.mock("@/lib/hooks/useAura", () => ({
  useAuraRecords: () => [{ at: "2026-08-23T10:00:00.000Z" }],
}));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => [] }));
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));
vi.mock("@/lib/hooks/useServiceWorkerUpdate", () => ({
  useServiceWorkerUpdate: () => ({
    status: "up-to-date",
    checkForUpdates: vi.fn(),
    applyUpdate: vi.fn(),
  }),
}));

import { SettingsView } from "@/components/settings/SettingsView";

describe("settings aura card", () => {
  it("renders balance and redemption history without loading gates", () => {
    render(createElement(SettingsView));
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getByText(/aura/i)).toBeInTheDocument();
    // 1 redemption, no entries -> raw derived balance is negative (accepted edge case);
    // pin the structural "X / 1500 pts" line, not the exact number.
    expect(screen.getByText(/\/ 1500 pts/i)).toBeInTheDocument();
    expect(screen.getByText(/\+1 aura/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- tests/settings-aura.test.ts`
Expected: FAIL — old monthly card still rendered / compile error from Task 5 signature change

- [ ] **Step 3: Edit `components/settings/SettingsView.tsx`:**
  - Delete: `REWARD_BADGE`, `rewardRowSchema`, `RewardEditor`, `month`/`setMonth` state, `handleMonthChange`, `rewardRecord`, the whole Monthly reward `<Card>`, and now-unused imports (`Badge`, `Input`, `Label`, `Textarea`, `setMonthlyReward`, `rewardKey`, `RewardRecord`, `RewardStatus`, `useMetaValue`). Keep `Label/Input/Textarea` ONLY if still referenced after edits (they are not — verify by grep).
  - Add imports: `useAuraRecords` from `@/lib/hooks/useAura`; `AURA_COST, pointsBalance` from `@/lib/scoring`.
  - Hook additions (before early returns): `const auraRecords = useAuraRecords();` and replace `rewardRows` useLiveQuery with:

```ts
const auraRows = useLiveQuery(
  () => db.meta.filter((row) => row.key.startsWith("aura:")).toArray(),
  [],
);
```

  - `exportReady = entries !== undefined && habits !== undefined && auraRows !== undefined;`
  - `handleExport` builds aura from rows and passes to the new signature:

```ts
const aura = (auraRows ?? []).map((row) => ({
  id: row.key.slice("aura:".length),
  at: (row.value as { at: string }).at,
}));
const backup = buildBackup(entries, habits, aura);
```

  - Import toast: `` `imported ${counts.importedEntries} entries, ${counts.importedHabits} habits, ${counts.importedAura} auras - ${counts.skippedEntries} duplicates skipped` ``.
  - New card where Monthly reward stood:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Aura</CardTitle>
    <CardDescription>every {AURA_COST} pts becomes one aura - collect them</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3">
    <p className="text-sm tabular-nums">
      {entries ? pointsBalance(entries, auraRecords?.length ?? 0) : 0} / {AURA_COST} pts
    </p>
    {(auraRecords ?? []).map((record, index) => (
      <div key={`${record.at}-${index}`} className="flex items-center justify-between gap-2 text-sm">
        <span>+1 aura</span>
        <span className="text-muted-foreground">
          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(record.at))}
        </span>
      </div>
    ))}
    {(auraRecords ?? []).length === 0 && (
      <p className="text-sm text-muted-foreground">no auras yet - keep dropping days</p>
    )}
  </CardContent>
</Card>
```

  - Update the AI-CONTEXT-NOTE: R becomes "Settings view: aura card, scoring reference table, JSON backup export/import (v2), theme toggle, About/SW card"; IDD drops RewardEditor/remount + rewardRowSchema bullets, adds `{"?":"aura balance derived via pointsBalance - display only, no writes here"}`; AB swaps `setMonthlyReward`→`useAuraRecords`.

- [ ] **Step 4: Confirm `useMetaValue` has zero remaining consumers, then delete**

Run: `grep -r "useMetaValue\|useMeta" components lib app --include=*.ts --include=*.tsx` (via Grep tool)
Expected: no hits outside `lib/hooks/useMeta.ts` itself → delete `lib/hooks/useMeta.ts`. If hits exist, stop and rewire them first.

- [ ] **Step 5: Delete superseded test**

Run: `git rm tests/settings-reward.test.ts` (or plain delete)

- [ ] **Step 6: Run settings test**

Run: `npm test -- tests/settings-aura.test.ts`
Expected: PASS

---

### Task 8: Docs + full verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update `AGENTS.md`:**
  - Intro sentence: replace "monthly self-reward gamification" with "an aura-point pool (every 1500 pts unlocks a self-reward, redeemed as +1 aura)".
  - Dashboard bullet: "reward banner" → "aura banner (X/1500 pts, Reward self at threshold, +1 aura toast)".
  - Settings bullet: "monthly reward editor, JSON backup export/import (zod-validated)" → "aura collection card, JSON backup export/import v2 (zod-validated)".
  - Architecture table `lib/*.ts` row: mention "aura points" alongside scoring/streaks.
- [ ] **Step 2: Full suite**

Run: `npm test`
Expected: all files PASS

- [ ] **Step 3: Lint + build**

Run: `npm run lint`
Expected: clean
Run: `npm run build`
Expected: compiles, routes prerender/dynamic as before

- [ ] **Step 4: Manual smoke (dev server)**

Run: `npm run dev` — submit/edit a day, confirm banner shows `X / 1500 pts`; temporarily raise balance above 1500 (e.g., submit multiple days via wizard) to see *"you can reward yourself now my dude"* + **Reward self**; click → toast `+1 aura`, badge increments, Settings Aura card lists timestamp; Export backup → JSON contains `"version": 2` and `aura` array, no `rewards`.

- [ ] **Step 5: Commit (only if user approves committing)**

```bash
git add -A
git commit -m "feat: replace monthly rewards with aura point pool"
```
