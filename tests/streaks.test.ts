import { describe, expect, it } from "vitest";
import { journalStreak, metricStreak, allStreaks } from "@/lib/streaks";
import type { DayEntry } from "@/lib/db/schema";

function entry(date: string, over: Partial<DayEntry> = {}): DayEntry {
  return {
    date, work: "fun", health: "healthy", weather: [], stepsTier: 6, workouts: [],
    screenTimeTier: 0, readingTier: 6, sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
    highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
    todayTasks: [], tomorrowPlan: ["t"], bucketList: null, habitsChecked: [],
    activeHabitCount: 0, createdAt: 0, updatedAt: 0, ...over,
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
      entry("2026-08-23", { health: "healthy" }),                       // 10
      entry("2026-08-22", { health: "under-weather" }),                 // 5 breaks
      entry("2026-08-21", { health: "healthy" }),                       // 10 (before break)
    ];
    expect(metricStreak(entries, "health", "2026-08-23")).toBe(1);
  });
  it("skipped days break the streak too", () => {
    const entries = [entry("2026-08-23"), entry("2026-08-21")];
    expect(metricStreak(entries, "steps", "2026-08-23")).toBe(1);
  });
});

describe("allStreaks", () => {
  it("returns journal plus 7 metrics", () => {
    const all = allStreaks([entry("2026-08-23")], "2026-08-23");
    expect(all.journal).toBe(1);
    expect(Object.keys(all)).toHaveLength(8);
  });
});
