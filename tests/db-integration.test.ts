import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  addHabit, addHabit as _addHabit, deleteHabit, getActiveHabits,
  getArchivedHabits, getTodayEntry, renameHabit, submitEntry,
} from "@/lib/db/repository";
import { db } from "@/lib/db/schema";

function fullEntry(date: string, tomorrowPlan: string[] = ["ship"]) {
  return {
    date, work: "fun", health: "healthy", weather: [], stepsTier: 3,
    workouts: [], screenTimeTier: 2, readingTier: 2, sleptAt: "22:30", wokeAt: "06:30",
    mood: "happy", highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
    todayTasks: [], tomorrowPlan, bucketList: null, habitsChecked: [],
    activeHabitCount: 0, createdAt: 1, updatedAt: 1,
  };
}

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.habits.clear(), db.meta.clear()]);
});

describe("real dexie integration (fake-indexeddb)", () => {
  it("addHabit then getActiveHabits finds it via archivedAt query", async () => {
    await addHabit("meditate");
    const active = await getActiveHabits();
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("meditate");
    expect(active[0].archivedAt).toBeNull();
  });

  it("submitEntry archives habit at day-100 and moves it out of active", async () => {
    const h = await addHabit("stretch");
    // day 100 = startedOn + 99 days
    const day100 = (() => {
      const [y, m, d] = h.startedOn.split("-").map(Number);
      const dt = new Date(y, m - 1, d + 99);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    })();
    const res = await submitEntry({ ...fullEntry(day100), habitsChecked: [h.id] }, [h.id]);
    expect(res.archivedHabits.map((x) => x.id)).toContain(h.id);
    expect(await getActiveHabits()).toHaveLength(0);
    expect((await getArchivedHabits()).map((x) => x.id)).toContain(h.id);
  });

  it("entry roundtrip through real indexeddb", async () => {
    await submitEntry(fullEntry("2026-08-23"), []);
    const e = await getTodayEntry("2026-08-23");
    expect(e?.tomorrowPlan).toEqual(["ship"]);
    expect(e?.activeHabitCount).toBe(0);
  });

  it("rename and delete still work against live engine", async () => {
    const h = await addHabit("old name");
    await renameHabit(h.id, "new name");
    expect((await getActiveHabits())[0].name).toBe("new name");
    await deleteHabit(h.id);
    expect(await getActiveHabits()).toHaveLength(0);
  });
});
