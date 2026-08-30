<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# What This App Is

**DayDrop** — an offline-first, installable **PWA journal tracker** ("Your day, dropped in"). Every day the user completes a 20-step guided journaling wizard across 4 well-being categories (Physical, Mental, Social, Productivity); answers are scored across 4 daily metrics (40 pts max/day) and visualized on a dashboard (heatmap, streaks, 30-day trend). Includes an aura-point pool (every 1000 pts unlocks a self-reward, redeemed as "+1 aura") and 100-day habit challenges. **No backend/auth — all data lives in browser IndexedDB via Dexie.**

## Key Features

- **Journal wizard** (`components/journal/`) — headless reducer state machine (`lib/journal/machine.ts`), validation-gated steps, draft autosave/resume, same-day edit; category headers between step groups.
- **Dashboard** (`/`) — month heatmap, flame streak, streak chips, trend chart, aura banner (X/1000 pts, Reward self at threshold, +1 aura toast), FAB launching the wizard.
- **Habits** (`/habits`) — 100-day challenges, auto-archive ("Solidified") on day 100.
- **Settings** (`/settings`) — aura collection card, JSON backup export/import v3 (zod-validated), theme toggle, SW update button.
- **PWA** — hand-written `public/sw.js` (cache-first shell, offline fallback, user-approved updates).

## Architecture Map

| Location | Role |
|---|---|
| `app/*/page.tsx` | Thin `force-dynamic` server shells → render one client View each |
| `components/<feature>/` | `"use client"` feature Views (dashboard, habits, journal, settings) + `shared/` + shadcn `ui/` |
| `lib/db/schema.ts` | Dexie DB `day-drop`: `entries` (keyed by date string), `habits`, `meta` |
| `lib/db/repository.ts` | **Sole write path** for IndexedDB (incl. atomic `submitEntry`) |
| `lib/hooks/` | Read-only reactive hooks (`useLiveQuery`) |
| `lib/*.ts` | Pure domain core: scoring (incl. aura points), streaks, format, exportImport |
| `lib/journal/steps.ts` | Single source of truth for wizard steps/options/points |
| `tests/*.test.ts` | Vitest unit tests mirroring `lib/` modules |

Stack: Next.js (App Router) + React 19, TypeScript, Tailwind v4 + shadcn/ui (base-maia/@base-ui), Dexie 4, zod, recharts, sonner, next-themes, Vitest + Testing Library + fake-indexeddb.

## Hard Conventions

1. **Strict read/write split** — only `lib/db/repository.ts` writes to IndexedDB; components/hooks read exclusively via hooks and never write inside them.
2. **Views early-return** `null` while hydrating / `<StorageUnavailable />` when IndexedDB is blocked — keep **all hooks before early returns**.
3. **No setState-in-effect** (lint-enforced) — use `useSyncExternalStore`, promise-callback settling, or key-based remounts.
4. **Dates persist as local `'YYYY-MM-DD'` strings**, times as `'HH:mm'`.
5. **Wizard option ids are stable slugs** persisted in entries — labels change freely, changing an id requires a migration. Dexie migrations are versioned and additive only.
6. **Version stamping** — `package.json` version is stamped into `lib/version.ts` and `sw.js` at build time; bump package.json only.
7. Run `npm run build` to verify; run `npm test` (Vitest) for domain-logic changes.

# File Convention: AI-CONTEXT-NOTE

Every code file created or edited in this project MUST carry a token-efficient `AI-CONTEXT-NOTE` JSON header as the FIRST line of the file.

- Wrap the JSON in a comment matching the file language (`/* ... */` for TS/TSX, `#` for scripts, `<!-- -->` for HTML).
- The JSON MUST be one single line with NO spaces after `:`, `,`, `{`, or `}` (spaces inside string values are fine).
- Schema keys: `R` (role), `IDD` (important developer decisions), `A` (files that depend on this), `AB` (files/deps this depends on), `E` (what to verify on edit). Severity markers: `!`, `!!`, `!!!`, plus `?` informational and `*` extra checks; `CRITICAL` names what breaks.
- Never delete an existing note; update `R`/`A`/`AB`/`E` when purpose or dependencies change.
