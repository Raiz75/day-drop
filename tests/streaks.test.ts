import { describe, expect, it } from "vitest";
import { journalStreak, metricStreak, allStreaks } from "@/lib/streaks";
import type { DayEntry } from "@/lib/db/schema";

function entry(date: string, over: Partial<DayEntry> = {}): DayEntry {
  return {
    date,
    sleepDuration: 2, exercise: "medium", nutrition: ["meal1", "meal2"], hydration: 2,
    timeOutdoor: 2, physicalFeeling: "healthy", moodCheck: "happy", reading: "decent",
    highlights: "x".repeat(25), couldHaveBeenBetter: "y".repeat(25), storyOfTheDay: "z",
    familyTime: true, conversations: true, kindnessActs: true, connectionStatus: "connected",
    learnedToday: "a", deepWorkHours: 3, workFeeling: "focused",
    tasksForToday: [], tasksChecked: [], tasksForTomorrow: [], bucketListChecked: [],
    habitsChecked: [], activeHabitCount: 0, createdAt: 0, updatedAt: 0, ...over,
  };
}

describe("journalStreak", () => {
  it("counts back from today", () => {
    expect(journalStreak(["2026-08-23", "2026-08-22", "2026-08-21"], "2026-08-23")).toBe(3);
  });
  it("survives when today is missing but yesterday exists", () => {
    expect(journalStreak(["2026-08-22", "2026-08-21"], "2026-08-23")).toBe(2);
  });
  it("breaks on gaps", () => {
    expect(journalStreak(["2026-08-23", "2026-08-21"], "2026-08-23")).toBe(1);
    expect(journalStreak(["2026-08-20"], "2026-08-23")).toBe(0);
  });
});

describe("metricStreak", () => {
  it("requires score >= 7 per consecutive day", () => {
    const entries = [
      entry("2026-08-23", { physicalFeeling: "healthy" }),               // physical ~8
      entry("2026-08-22", { physicalFeeling: "unwell", sleepDuration: 0, exercise: "none", hydration: 0, timeOutdoor: 0 }), // physical low, breaks
      entry("2026-08-21", { physicalFeeling: "healthy" }),               // before break
    ];
    expect(metricStreak(entries, "physical", "2026-08-23")).toBe(1);
  });
  it("skipped days break the streak too", () => {
    const entries = [entry("2026-08-23"), entry("2026-08-21")];
    expect(metricStreak(entries, "mental", "2026-08-23")).toBe(1);
  });
});

describe("allStreaks", () => {
  it("returns journal plus 4 metrics", () => {
    const all = allStreaks([entry("2026-08-23")], "2026-08-23");
    expect(all.journal).toBe(1);
    expect(Object.keys(all)).toHaveLength(5);
  });
});
