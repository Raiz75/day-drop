/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/db/repository.ts — draft save/get/clear round-trip, same-day entry overwrite, submit-clears-draft, habit day-100 calendar auto-archive, rename/delete habits, and redeemAura (one aura:<uuid> row per call). Uses an in-memory mock of the Dexie db (vi.mock of schema.ts) so no IndexedDB is needed.","IDD":[{"?":"vi.hoisted store objects implement only the Dexie surface repository.ts uses; extend the mock when a new repository fn needs a missing op, keeping real-Dexie semantics"},{"?":"db.transaction('rw',...) mock invokes the callback so atomic rw logic inside submitEntry runs"},{"?":"Mock put keys by date(key)/key(meta)/id(habits) mirroring each table's primary key"},{"?":"newId/types kept real via importOriginal; only db is replaced"}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"sole writer exercised here - day-100 archive, draft clear, redeemAura must not regress"},{"?":"components/journal/JournalWizard.tsx","submit flow consumes archivedHabits result"},{"?":"components/settings/SettingsView.tsx","import/export goes through repository"}],"AB":[{"?":"tests/repository.test.ts in cash-guard repo","source of the mock-table helper pattern"},{"?":"vitest.config.mts","tsconfigPaths @ alias + happy-dom"}],"E":[{"!!!":"npm test -- repository","must pass before any repository change merges"},{"!!":"resubmitting same date overwrites exactly one row"},{"!!":"redeemAura writes exactly one aura:<uuid> meta row per call"}]} */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => {
  interface Row { date?: string; key?: string; id?: string; [field: string]: unknown }
  function makeTable() {
    const map = new Map<string, Row>();
    const keyOf = (v: Row): string => {
      const k = v.date ?? v.key ?? v.id;
      if (k === undefined) throw new Error("mock row has no primary key");
      return k;
    };
    return {
      get: async (k: string) => map.get(k),
      put: async (v: Row, k?: string) => {
        const key = k ?? keyOf(v);
        map.set(key, v);
        return key;
      },
      add: async (v: Row, k?: string) => {
        const key = k ?? keyOf(v);
        if (map.has(key)) throw new Error("Key already exists");
        map.set(key, v);
        return key;
      },
      update: async (k: string, changes: Record<string, unknown>) => {
        const cur = map.get(k);
        if (!cur) return 0;
        map.set(k, { ...cur, ...changes });
        return 1;
      },
      delete: async (k: string) => void map.delete(k),
      toArray: async () => [...map.values()],
      bulkPut: async (vs: Row[]) => void vs.forEach((v) => map.set(keyOf(v), v)),
      filter: (fn: (x: Row) => boolean) => ({
        toArray: async () => [...map.values()].filter(fn),
      }),
      where: (_idx: string) => ({
        equals: (v: unknown) => ({
          count: async () => [...map.values()].filter((x) => x[_idx] === v).length,
          modify: async (fn: (x: Row) => void) =>
            [...map.values()].filter((x) => x[_idx] === v).forEach(fn),
          toArray: async () => [...map.values()].filter((x) => x[_idx] === v),
        }),
      }),
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

import {
  addHabit, clearDraft, deleteHabit,
  getDraft, getLatestEntryBefore, getTodayEntry, redeemAura, renameHabit, saveDraft,
  submitEntry,
} from "@/lib/db/repository";

const TODAY = "2026-08-23";

function fullEntry(date: string): Parameters<typeof submitEntry>[0] {
  return {
    date,
    sleepDuration: 2, exercise: "heavy", nutrition: ["home-cooked", "protein", "veggies"],
    hydration: 3, timeOutdoor: 2, physicalFeeling: "energetic",
    moodCheck: "happy", reading: "bookworm", highlights: "x".repeat(25),
    couldHaveBeenBetter: "y".repeat(25), storyOfTheDay: "z".repeat(25),
    familyTime: true, conversations: true, kindnessActs: true, connectionStatus: "connected",
    learnedToday: "a".repeat(10), tasksFinished: "b".repeat(10),
    deepWorkHours: 4, workFeeling: "focused",
    habitsChecked: ["any"], activeHabitCount: 1, createdAt: 1, updatedAt: 1,
  };
}

beforeEach(() => {
  mockDb.entries.__map.clear();
  mockDb.habits.__map.clear();
  mockDb.meta.__map.clear();
});

describe("drafts", () => {
  it("save/get/clear round-trip", async () => {
    await saveDraft({ date: TODAY, stepIndex: 2, answers: { moodCheck: "happy" } });
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
    await submitEntry({ ...fullEntry(TODAY), moodCheck: "tired" }, []);
    const rows = [...mockDb.entries.__map.values()];
    expect(rows).toHaveLength(1);
    expect(rows[0].moodCheck).toBe("tired");
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
    // force startedOn so that day 100 lands on TODAY (startedOn + 99 == 2026-08-23)
    const startedOn = "2026-05-16";
    mockDb.habits.__map.set(h.id, { ...h, startedOn });
    const res = await submitEntry(fullEntry(TODAY), [h.id]);
    expect(res.archivedHabits.map((x) => x.name)).toContain("meditate");
    expect((await mockDb.habits.get(h.id))!.archivedAt).not.toBeNull();
  });
  it("rename/delete", async () => {
    const h = await addHabit("old");
    await renameHabit(h.id, "new");
    expect((await mockDb.habits.get(h.id))!.name).toBe("new");
    await deleteHabit(h.id);
    expect(await mockDb.habits.get(h.id)).toBeUndefined();
  });
});

describe("redeemAura", () => {
  it("writes one aura:<id> meta row per call with an ISO timestamp", async () => {
    await redeemAura();
    let rows = [...mockDb.meta.__map.values()];
    expect(rows).toHaveLength(1);
    expect(String(rows[0].key)).toMatch(/^aura:[0-9a-f-]{36}$/);
    expect(new Date((rows[0].value as { at: string }).at).toString()).not.toBe("Invalid Date");
    await redeemAura();
    rows = [...mockDb.meta.__map.values()];
    expect(rows).toHaveLength(2);
  });
});
