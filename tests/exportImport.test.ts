/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/exportImport.ts — backup round-trip via buildBackup+parseBackup, strict zod rejection of garbage, and mergeBackup duplicate-skip counting. Uses an in-memory mock of the Dexie db (vi.mock of schema.ts) so no IndexedDB is needed.","IDD":[{"?":"vi.hoisted store objects implement only the Dexie surface exportImport.ts uses; extend the mock when a new fn needs a missing op, keeping real-Dexie semantics"},{"?":"db.transaction('rw',...) mock invokes the callback so atomic rw logic inside mergeBackup runs"},{"?":"Mock put keys by date(key)/key(meta)/id(habits) mirroring each table's primary key"},{"?":"types kept real via importOriginal; only db is replaced"}],"A":[{"!!!":"lib/exportImport.ts","CRITICAL":"sole code under test - parse strictness and merge skip logic must not regress"},{"?":"components/settings/SettingsView.tsx","import/export UI consumes these fns"}],"AB":[{"?":"tests/repository.test.ts","source of the mock-table helper pattern"},{"?":"vitest.config.mts","tsconfigPaths @ alias"}],"E":[{"!!!":"npm test -- exportImport","must pass before any exportImport change merges"},{"!!":"parseBackup rejects invalid JSON and wrong app literal"},{"!!":"mergeBackup imports new rows once and skips existing keys"}]} */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => {
  interface Row { date?: string; key?: string; id?: string; [field: string]: unknown }
  function keyOf(v: Row): string {
    const k = v.date ?? v.key ?? v.id;
    if (k === undefined) throw new Error("mock row has no primary key");
    return k;
  }
  function makeTable() {
    const map = new Map<string, Row>();
    return {
      get: async (k: string) => map.get(k),
      put: async (v: Row) => void map.set(keyOf(v), v),
      bulkAdd: async (vs: Row[]) => void vs.forEach((v) => map.set(keyOf(v), v)),
      toArray: async () => [...map.values()],
      __map: map,
    };
  }
  const tables = { entries: makeTable(), habits: makeTable(), meta: makeTable() };
  const db = {
    ...tables,
    transaction: async (_mode: string, ...args: unknown[]) => {
      const cb = args[args.length - 1] as (() => unknown) | undefined;
      await cb?.();
    },
  };
  return { mockDb: db };
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
