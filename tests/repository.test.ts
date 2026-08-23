/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/db/repository.ts — draft save/get/clear round-trip, same-day entry overwrite, submit-clears-draft, habit day-100 calendar auto-archive, rename/delete habits, reward set/claim lifecycle, and evaluateFinishedMonths grading + idempotence. Uses an in-memory mock of the Dexie db (vi.mock of schema.ts) so no IndexedDB is needed.","IDD":[{"?":"vi.hoisted store objects implement only the Dexie surface repository.ts uses; extend the mock when a new repository fn needs a missing op, keeping real-Dexie semantics"},{"?":"db.transaction('rw',...) mock invokes the callback so atomic rw logic inside submitEntry runs"},{"?":"Mock put keys by date(key)/key(meta)/id(habits) mirroring each table's primary key"},{"?":"newId/types kept real via importOriginal; only db is replaced"}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"sole writer exercised here - day-100 archive, draft clear, month grading must not regress"},{"?":"components/journal/JournalWizard.tsx","submit flow consumes archivedHabits result"},{"?":"components/settings/SettingsView.tsx","import/export goes through repository"}],"AB":[{"?":"tests/repository.test.ts in cash-guard repo","source of the mock-table helper pattern"},{"?":"vitest.config.mts","tsconfigPaths @ alias + happy-dom"},{"?":"lib/scoring.ts","evaluateMonth thresholds pin earned/missed outcomes"}],"E":[{"!!!":"npm test -- repository","must pass before any repository change merges"},{"!!":"resubmitting same date overwrites exactly one row"},{"!!":"claimReward only transitions earned->claimed"},{"*":"evaluateFinishedMonths second call returns [] (idempotent)"}]} */
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
  addHabit, claimReward, clearDraft, deleteHabit, evaluateFinishedMonths,
  getDraft, getLatestEntryBefore, getTodayEntry, renameHabit, saveDraft,
  setMonthlyReward, submitEntry,
} from "@/lib/db/repository";

const TODAY = "2026-08-23";

function fullEntry(date: string): Parameters<typeof submitEntry>[0] {
  // maxes all 7 metrics: health 10, steps tier 6->10, workouts run+sports capped 10,
  // screenTime tier 0->10, reading tier 6->10, sleep 8h->10, habits 1/1 checked->10
  return {
    date, work: "fun", health: "healthy", weather: [], stepsTier: 6, workouts: ["run", "sports"],
    screenTimeTier: 0, readingTier: 6, sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
    highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
    todayTasks: [], tomorrowPlan: ["ship"], bucketList: null, habitsChecked: ["any"],
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

describe("monthly rewards", () => {
  it("set/claim lifecycle", async () => {
    await setMonthlyReward("2026-08", "buy a game");
    await claimReward("2026-08"); // not yet evaluated -> no-op safe
    // simulate evaluation result
    await setMonthlyReward("2026-07", "dinner out");
    await mockDb.meta.put({ key: "reward:2026-07", value: { month: "2026-07", text: "dinner out", status: "earned" } });
    await claimReward("2026-07");
    expect(((await mockDb.meta.get("reward:2026-07"))!.value as { status: string }).status).toBe("claimed");
  });

  it("evaluateFinishedMonths grades past month once", async () => {
    // 16 perfect entries in July 2026 -> eligible + ratio high
    for (let d = 1; d <= 16; d++) {
      const date = `2026-07-${String(d).padStart(2, "0")}`;
      await submitEntry(fullEntry(date), []);
    }
    const res = await evaluateFinishedMonths("2026-08-01");
    expect(res).toContainEqual({ month: "2026-07", unlocked: true });
    const rec = (await mockDb.meta.get("reward:2026-07"))!.value as { status: string };
    expect(rec.status).toBe("earned"); // even without preset text, earned is recorded
    // idempotent
    expect(await evaluateFinishedMonths("2026-08-01")).toHaveLength(0);
  });
});
