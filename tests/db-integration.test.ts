import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import {
  addHabit, addHabit as _addHabit, deleteHabit, getActiveHabits,
  getArchivedHabits, getTodayEntry, renameHabit, submitEntry,
} from "@/lib/db/repository";
import { db } from "@/lib/db/schema";

function fullEntry(date: string) {
  return {
    date,
    sleepDuration: 7,
    exercise: "medium",
    nutrition: ["meat", "vegetables"],
    hydration: 2,
    timeOutdoor: 1,
    physicalFeeling: "healthy",
    moodCheck: "happy",
    reading: "decent",
    highlights: "x".repeat(50),
    couldHaveBeenBetter: "y".repeat(50),
    storyOfTheDay: null,
    familyTime: true,
    conversations: true,
    kindnessActs: false,
    connectionStatus: "connected",
    learnedToday: "learned about testing".repeat(2),
    tasksFinished: "finished tasks".repeat(2),
    deepWorkHours: 2,
    workFeeling: "productive",
    habitsChecked: [],
    activeHabitCount: 0,
    createdAt: 1,
    updatedAt: 1,
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
    expect(e?.date).toBe("2026-08-23");
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
