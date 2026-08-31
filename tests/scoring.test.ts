/* AI-CONTEXT-NOTE:{"R":"Unit tests for lib/scoring.ts: physical/mental/social/productivity scores, bonus scoring (tasks, bucket list, habits), total, aura points.","IDD":[],"A":[],"AB":["lib/scoring.ts","lib/db/schema.ts"],"E":["npm test tests/scoring.test.ts"]} */
import { describe, expect, it } from "vitest";
import { AURA_COST, bucketListScore, habitsBonusScore, pointsBalance, scoreEntry, tasksScore, totalPoints } from "@/lib/scoring";
import type { DayEntry } from "@/lib/db/schema";

const base: DayEntry = {
  date: "2026-08-29",
  sleepDuration: 2,
  exercise: "heavy",
  nutrition: ["meat", "vegetables", "fruit"],
  hydration: 3,
  timeOutdoor: 3,
  physicalFeeling: "energetic",
  moodCheck: "happy",
  reading: "bookworm",
  highlights: "x".repeat(60),
  couldHaveBeenBetter: "y".repeat(60),
  storyOfTheDay: "z".repeat(60),
  familyTime: true,
  conversations: true,
  kindnessActs: true,
  connectionStatus: "connected",
  learnedToday: "a".repeat(30),
  deepWorkHours: 4,
  workFeeling: "focused",
  tasksForToday: [],
  tasksChecked: [],
  tasksForTomorrow: [],
  bucketListChecked: [],
  habitsChecked: [],
  activeHabitCount: 0,
  createdAt: 0,
  updatedAt: 0,
};

describe("scoreEntry", () => {
  it("scores a perfect day correctly (max 40)", () => {
    const s = scoreEntry(base);
    expect(s.physical).toBe(10);
    expect(s.mental).toBe(10);
    expect(s.social).toBe(9);
    expect(s.productivity).toBe(10);
    expect(s.total).toBe(39);
  });

  it("physical metric averages 6 sub-components", () => {
    const s = scoreEntry(base);
    expect(s.physical).toBe(10);

    const worst: DayEntry = {
      ...base,
      sleepDuration: 0,
      exercise: "light",
      nutrition: [],
      hydration: 0,
      timeOutdoor: 0,
      physicalFeeling: "unwell",
    };
    expect(scoreEntry(worst).physical).toBe(3);
  });

  it("mental metric averages mood, reading, and text bonuses", () => {
    const s = scoreEntry(base);
    expect(s.mental).toBe(10);

    const low: DayEntry = {
      ...base,
      moodCheck: "sad",
      reading: "none",
      highlights: "",
      couldHaveBeenBetter: "",
      storyOfTheDay: null,
    };
    expect(scoreEntry(low).mental).toBe(1);
  });

  it("social metric averages family, conversations, kindness, connection", () => {
    const s = scoreEntry(base);
    expect(s.social).toBe(9);

    const disconnected: DayEntry = {
      ...base,
      familyTime: false,
      conversations: false,
      kindnessActs: false,
      connectionStatus: "lonely",
    };
    expect(scoreEntry(disconnected).social).toBe(2);
  });

  it("social reaches 10 when all booleans true and connection connected", () => {
    const s = scoreEntry(base);
    expect(s.social).toBe(9);
  });

  it("productivity metric averages deep work, work feeling, and learned bonus", () => {
    const s = scoreEntry(base);
    expect(s.productivity).toBe(10);

    const low: DayEntry = {
      ...base,
      deepWorkHours: 0,
      workFeeling: "drained",
      learnedToday: "",
    };
    expect(scoreEntry(low).productivity).toBe(1);
  });

  it("all metric scores are between 1 and 10", () => {
    const s = scoreEntry(base);
    for (const key of ["physical", "mental", "social", "productivity"] as const) {
      expect(s[key]).toBeGreaterThanOrEqual(1);
      expect(s[key]).toBeLessThanOrEqual(10);
    }
  });
});

describe("aura points", () => {
  it("totalPoints sums daily totals across entries", () => {
    expect(totalPoints([])).toBe(0);
    expect(totalPoints([base])).toBe(39);
    expect(totalPoints([{ ...base, date: "2026-08-30" }, base])).toBe(78);
  });

  it("pointsBalance subtracts 1000 per redemption", () => {
    expect(pointsBalance([], 0)).toBe(0);
    expect(pointsBalance([base], 0)).toBe(39);
    expect(pointsBalance([base], 1)).toBe(-961);
    expect(AURA_COST).toBe(1000);
  });
});

describe("bonus scoring", () => {
  it("tasksScore returns 2 per checked task", () => {
    expect(tasksScore(base)).toBe(0);
    expect(tasksScore({ ...base, tasksChecked: ["a"] })).toBe(2);
    expect(tasksScore({ ...base, tasksChecked: ["a", "b", "c"] })).toBe(6);
  });

  it("bucketListScore returns 10 per checked item", () => {
    expect(bucketListScore(base)).toBe(0);
    expect(bucketListScore({ ...base, bucketListChecked: ["x"] })).toBe(10);
    expect(bucketListScore({ ...base, bucketListChecked: ["x", "y"] })).toBe(20);
  });

  it("habitsBonusScore returns 2 per checked habit", () => {
    expect(habitsBonusScore(base)).toBe(0);
    expect(habitsBonusScore({ ...base, habitsChecked: ["h1"] })).toBe(2);
    expect(habitsBonusScore({ ...base, habitsChecked: ["h1", "h2", "h3", "h4", "h5"] })).toBe(10);
  });

  it("scoreEntry includes bonus fields and adds them to total", () => {
    const s = scoreEntry({
      ...base,
      tasksChecked: ["a", "b"],
      bucketListChecked: ["x"],
      habitsChecked: ["h1"],
    });
    expect(s.tasks).toBe(4);
    expect(s.bucketList).toBe(10);
    expect(s.habitsBonus).toBe(2);
    expect(s.total).toBe(39 + 4 + 10 + 2);
  });
});
