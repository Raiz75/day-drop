# DayDrop — Aura Points System Design

Date: 2026-08-23
Status: Approved (approach A chosen by user; full-wipe confirmed by user)

## Summary

Replace the monthly-reward system with a lifetime **points pool**. Every journal entry's daily total (`scoreEntry(e).total`, max 70/day) accumulates forever — past and future stack together. When the pool reaches **1500 points**, the home banner says *"you can reward yourself now my dude"* with a **[Reward self]** button. Tapping it consumes 1500 points and mints one **Aura** record. The long-term goal becomes collecting as much Aura as possible.

## User-approved decisions

1. **Approach A — derived balance**: `balance = Σ scoreEntry(entry).total over ALL entries − 1500 × auraCount`. Nothing about the balance is ever stored; it is recomputed live from source-of-truth entries (same philosophy as streaks/trends).
2. **Cost is fixed at 1500** (`AURA_COST` constant in `lib/scoring.ts`). Not settings-adjustable.
3. **FULL WIPE of monthly rewards** — the app is new, no compatibility shims: delete `RewardRecord`, `RewardStatus`, `rewardKey`, all monthly repo fns, and the `rewards` array from the backup format entirely. Old backups are simply rejected as an unrecognized format.
4. Redemption records are automatic timestamped **"aura"** entries — no free-text notes.

## Data model

No Dexie version bump: `meta` values are schemaless JSON and no stores/indexes change (versioned additive-only rule satisfied trivially).

- `lib/db/schema.ts`
  - **Delete**: `RewardRecord`, `RewardStatus`, `rewardKey`.
  - **Add**: `interface AuraRecord { at: string }` (ISO datetime) and `function auraKey(id: string): string` returning `` `aura:${id}` ``.
- Aura rows live in `meta`: `{ key: "aura:<uuid>", value: { at } }`.

## Pure domain core (`lib/scoring.ts`)

```ts
export const AURA_COST = 1500;

export function totalPoints(entries: DayEntry[]): number {
  return entries.reduce((sum, e) => sum + scoreEntry(e).total, 0);
}

export function pointsBalance(entries: DayEntry[], redeemedCount: number): number {
  return totalPoints(entries) - AURA_COST * redeemedCount;
}
```

- Remove: `monthScore`, `evaluateMonth`, `MIN_MONTH_COVERAGE_RATIO`.
- Keep: `MAX_METRIC_SCORE`, `METRIC_COUNT`, `GOOD_SCORE_THRESHOLD` (still used by streaks/tests).
- Edge case (accepted): deleting entries after a redemption can push the raw balance negative; math stays unclamped, UI displays the raw number.

## Repository (`lib/db/repository.ts`) — sole write path

- Add: `redeemAura(): Promise<void>` — writes `putMeta(auraKey(newId()), { at: new Date().toISOString() })`.
- Remove: `getReward`, `setMonthlyReward`, `claimReward`, `evaluateFinishedMonths` and the `evaluateMonth` import.

## Read hook (`lib/hooks/useAura.ts` — new)

`useAuraRecords(): AuraRecord[] | undefined` via `useLiveQuery` filtering `meta` keys with the `aura:` prefix, newest first. READ-ONLY per the strict read/write split.

## UI changes

### `components/dashboard/RewardBanner.tsx` — rewritten (presentational)

Props: `{ balance: number | undefined, auraCount: number, onRedeem: () => void }`.

- **Progress state** (`balance < 1500`): gift icon, `{balance} / 1500` label, Progress bar toward next aura.
- **Ready state** (`balance >= 1500`): sparkles icon, copy *"you can reward yourself now my dude"*, `[Reward self]` button.
- Both states show an aura counter chip (`aura: N`).
- `DashboardView` owns behavior: computes `balance = pointsBalance(entries, auraCount)` from `useEntries()` (ALL entries, not month-scoped) + `useAuraRecords()`; `onRedeem` calls `repository.redeemAura()` fire-and-forget with catch, then `toast.success("+1 aura")`.
- Remove `evaluateFinishedMonths` call and all `rewardKey`/`RewardRecord` wiring from `DashboardView`.

### `components/settings/SettingsView.tsx`

- Replace the "Monthly reward" card with an **Aura card**: current balance, points remaining to next aura, redemption history list (formatted timestamps, newest first).
- Remove: `REWARD_BADGE`, `RewardEditor`, month input, `setMonthlyReward`/`rewardKey`/`RewardRecord` usage and the `rewardRowSchema` export filter.
- Export/import card stays; its data reads switch from `reward:*` rows to `aura:` rows.

## Backup format (`lib/exportImport.ts`) — breaking change

Backup shape becomes:

```jsonc
{ "app": "day-drop", "version": 2, "exportedAt": "...",
  "entries": [...], "habits": [...], "aura": [{ "id": "<uuid>", "at": "<iso>" }] }
```

- Delete `rewardSchema` and the `rewards` array; add required `aura` array.
- `buildBackup(entries, habits, aura)` — signature shrinks.
- `mergeBackup` inserts `aura:<id>` meta rows when absent; counts reported in the import toast.
- Old (v1) backups fail zod parse → "Unrecognized backup format". Accepted per full-wipe decision.

## Testing plan (Vitest, mirroring existing structure)

| File | Change |
|---|---|
| `tests/scoring.test.ts` | Drop `evaluateMonth` block; add `pointsBalance`/`totalPoints` cases (empty, stacking across months, subtraction, negative edge) |
| `tests/repository.test.ts` | Replace reward-lifecycle block with `redeemAura` (writes `aura:`-prefixed row, increments count) |
| `tests/dashboard-view.test.ts` | Rewrite banner cases: progress state math/copy, ready state copy + button, button click invokes `onRedeem`, aura chip |
| `tests/exportImport.test.ts` | Aura round-trip; v1 backup without `aura` rejects |
| `tests/schema.test.ts` | Swap `rewardKey` assertion for `auraKey` |
| `tests/settings-reward.test.ts` | Update to pin Aura card rendering (no loading text, history list present) |

Verification gates: `npm test` and `npm run build` must pass; `npm run lint` for touched components.

## Docs

`AGENTS.md` feature bullets updated (dashboard/settings descriptions mention aura pool instead of monthly rewards).

## Out of scope

- Adjustable cost, animations, retroactive aura grants (existing entries simply seed the initial pool naturally on first computation).
