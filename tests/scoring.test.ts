import { describe, expect, it } from "vitest";
import { evaluateMonth, scoreEntry } from "@/lib/scoring";
import type { DayEntry } from "@/lib/db/schema";

const base: DayEntry = {
  date: "2026-08-23", work: "fun",
  health: "healthy", weather: ["hot-sunny"], stepsTier: 4,
  workouts: ["full-body"], screenTimeTier: 0, readingTier: 6,
  sleptAt: "22:30", wokeAt: "06:30", mood: "happy",
  highlight: "x".repeat(25), improve: "y".repeat(25), grateful: "z".repeat(25),
  todayTasks: [{ text: "t", done: true }], tomorrowPlan: ["a"], bucketList: null,
  habitsChecked: [], activeHabitCount: 4, createdAt: 0, updatedAt: 0,
};

describe("scoreEntry", () => {
  it("scores a perfect-ish day at expected per-metric values", () => {
    const s = scoreEntry(base);
    expect(s.health).toBe(10);
    expect(s.steps).toBe(8);          // tier 4 of [1,2,4,6,8,9,10]
    expect(s.workout).toBe(8);        // full-body
    expect(s.screenTime).toBe(10);    // tier 0 inverted
    expect(s.reading).toBe(10);       // tier 6
    expect(s.sleep).toBe(10);         // exactly 8h
    expect(s.habits).toBe(1);         // none checked
    expect(s.total).toBe(57);
  });
  it("workout sums and caps at 10, floors at 1", () => {
    expect(scoreEntry({ ...base, workouts: ["run", "sports"] }).workout).toBe(10); // 11 capped
    expect(scoreEntry({ ...base, workouts: ["rest-day"] }).workout).toBe(1);
  });
  it("sleep banding", () => {
    expect(scoreEntry({ ...base, sleptAt: "23:00", wokeAt: "03:00" }).sleep).toBe(2);   // 4h -> else band
    expect(scoreEntry({ ...base, sleptAt: "23:00", wokeAt: "04:00" }).sleep).toBe(4);   // 5h -> [5,6)
    expect(scoreEntry({ ...base, sleptAt: "21:00", wokeAt: "09:30" }).sleep).toBe(2);   // 12.5h -> else band
    expect(scoreEntry({ ...base, sleptAt: "22:00", wokeAt: "09:00" }).sleep).toBe(4);   // 11h -> (10,11]
  });
  it("habit scoring partial vs full", () => {
    // 2 checked of 4 active -> 1 + round(9*2/4) = 1 + round(4.5) = 6
    const e2 = { ...base, habitsChecked: ["a", "b"] };
    expect(scoreEntry(e2, 4).habits).toBe(6);
    const eAll = { ...base, habitsChecked: ["a", "b"] };
    expect(scoreEntry(eAll, 2).habits).toBe(10);
  });
  it("uses the stored activeHabitCount snapshot when no arg is passed", () => {
    // 1 checked of 3 active (snapshot) -> 1 + round(9*1/3) = 4
    expect(scoreEntry({ ...base, habitsChecked: ["a"], activeHabitCount: 3 }).habits).toBe(4);
  });
  it("v1 rows without a snapshot fall back to checked length", () => {
    const full = { ...base, habitsChecked: ["a", "b"] };
    const legacy = Object.fromEntries(
      Object.entries(full).filter(([key]) => key !== "activeHabitCount"),
    ) as unknown as DayEntry;
    expect(scoreEntry(legacy).habits).toBe(10);
  });
});

describe("evaluateMonth", () => {
  it("unlocks at >=80% with coverage", () => {
    const perfect = { ...base };
    const r = evaluateMonth([perfect], "2026-08");       // Aug has 31 days, need ceil(15.5)=16
    expect(r.eligible).toBe(false);                      // 1 entry < 16
    expect(r.unlocked).toBe(false);
  });
  it("coverage guard blocks thin months", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...base, date: `2026-02-${String(i + 1).padStart(2, "0")}`,   // unique dates per entry
    }));
    const r = evaluateMonth(many, "2026-02");            // Feb: ceil(28*0.5)=14 <= 20 OK
    expect(r.eligible).toBe(true);
    expect(r.unlocked).toBe(r.ratio >= 0.8);
  });
  it("empty month is safe", () => {
    const r = evaluateMonth([], "2026-08");
    expect(r.score).toBe(0); expect(r.maxPossible).toBe(0); expect(r.ratio).toBe(0);
    expect(r.unlocked).toBe(false);
  });
});
