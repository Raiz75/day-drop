import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { DRAFT_KEY, auraKey, celebratedKey, db } from "@/lib/db/schema";

describe("schema keys", () => {
  it("namespaced meta keys", () => {
    expect(DRAFT_KEY).toBe("journal-draft");
    expect(auraKey("abc")).toBe("aura:abc");
    expect(celebratedKey("abc")).toBe("celebrated:abc");
  });
});

describe("v3 schema", () => {
  it("entries, habits, and meta tables exist and accept data", async () => {
    await db.entries.add({
      date: "2026-01-01",
      sleepDuration: 2,
      exercise: "heavy",
      nutrition: ["meat"],
      hydration: 3,
      timeOutdoor: 3,
      physicalFeeling: "energetic",
      moodCheck: "happy",
      reading: "bookworm",
      highlights: "x".repeat(60),
      couldHaveBeenBetter: "y".repeat(60),
      storyOfTheDay: "z",
      familyTime: true,
      conversations: true,
      kindnessActs: true,
      connectionStatus: "connected",
      learnedToday: "a".repeat(30),
      tasksFinished: "b".repeat(30),
      deepWorkHours: 4,
      workFeeling: "focused",
      habitsChecked: [],
      activeHabitCount: 0,
      createdAt: 0,
      updatedAt: 0,
    });
    await db.habits.add({ id: "h1", name: "test", startedOn: "2026-01-01", archivedAt: null });
    await db.meta.add({ key: "test-meta", value: "hello" });

    expect(await db.entries.count()).toBe(1);
    expect(await db.habits.count()).toBe(1);
    expect(await db.meta.count()).toBe(1);

    await db.entries.clear();
    await db.habits.clear();
    await db.meta.clear();
  });

  it("entries can be cleared independently of habits and meta", async () => {
    await db.entries.add({
      date: "2026-02-01",
      sleepDuration: 2,
      exercise: "heavy",
      nutrition: ["meat"],
      hydration: 3,
      timeOutdoor: 3,
      physicalFeeling: "energetic",
      moodCheck: "happy",
      reading: "bookworm",
      highlights: "x".repeat(60),
      couldHaveBeenBetter: "y".repeat(60),
      storyOfTheDay: "z",
      familyTime: true,
      conversations: true,
      kindnessActs: true,
      connectionStatus: "connected",
      learnedToday: "a".repeat(30),
      tasksFinished: "b".repeat(30),
      deepWorkHours: 4,
      workFeeling: "focused",
      habitsChecked: [],
      activeHabitCount: 0,
      createdAt: 0,
      updatedAt: 0,
    });
    await db.habits.add({ id: "h2", name: "run", startedOn: "2026-01-01", archivedAt: null });
    await db.meta.add({ key: "meta2", value: 42 });

    await db.entries.clear();

    expect(await db.entries.count()).toBe(0);
    expect(await db.habits.count()).toBe(1);
    expect(await db.meta.count()).toBe(1);

    await db.habits.clear();
    await db.meta.clear();
  });
});
