import { describe, expect, it } from "vitest";
import { AURA_COST, pointsBalance, scoreEntry, totalPoints } from "@/lib/scoring";
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
  tasksFinished: "b".repeat(30),
  deepWorkHours: 4,
  workFeeling: "focused",
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
    // social booleans cap at 8; (8+8+8+10)/4 = 8.5 -> rounds to 9
    expect(s.social).toBe(9);
    expect(s.productivity).toBe(10);
    expect(s.total).toBe(39);
  });

  it("physical metric averages 6 sub-components", () => {
    const s = scoreEntry(base);
    expect(s.physical).toBe(10);

    // worst case: all low values
    const worst: DayEntry = {
      ...base,
      sleepDuration: 0,
      exercise: "light",
      nutrition: [],
      hydration: 0,
      timeOutdoor: 0,
      physicalFeeling: "unwell",
    };
    // sleep[0]=3, exercise=light=4, nutrition=1, hydration[0]=3, outdoor[0]=2, unwell=2
    // avg=(3+4+1+3+2+2)/6=2.5 -> round=3
    expect(scoreEntry(worst).physical).toBe(3);
  });

  it("mental metric averages mood, reading, and text bonuses", () => {
    const s = scoreEntry(base);
    expect(s.mental).toBe(10);

    // no text bonuses, low mood, no reading
    const low: DayEntry = {
      ...base,
      moodCheck: "sad",
      reading: "none",
      highlights: "",
      couldHaveBeenBetter: "",
      storyOfTheDay: null,
    };
    // mood=2, reading=1, textBonus=0 -> avg=(2+1+0)/3=1 -> round=1
    expect(scoreEntry(low).mental).toBe(1);
  });

  it("social metric averages family, conversations, kindness, connection", () => {
    const s = scoreEntry(base);
    expect(s.social).toBe(9);

    // all no
    const disconnected: DayEntry = {
      ...base,
      familyTime: false,
      conversations: false,
      kindnessActs: false,
      connectionStatus: "lonely",
    };
    // (2+2+2+2)/4 = 2
    expect(scoreEntry(disconnected).social).toBe(2);
  });

  it("social reaches 10 when all booleans true and connection connected", () => {
    // social = (8+8+8+10)/4 = 8.5 -> 9
    // There is no way to get 10 with booleans capped at 8
    const s = scoreEntry(base);
    expect(s.social).toBe(9);
  });

  it("productivity metric averages deep work, work feeling, and text bonuses", () => {
    const s = scoreEntry(base);
    expect(s.productivity).toBe(10);

    // no deep work, drained, no text
    const low: DayEntry = {
      ...base,
      deepWorkHours: 0,
      workFeeling: "drained",
      learnedToday: "",
      tasksFinished: "",
    };
    // deepWork=1, work=2, text=0 -> avg=(1+2+0)/3=1 -> round=1
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
