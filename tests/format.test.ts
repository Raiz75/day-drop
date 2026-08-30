import { describe, expect, it } from "vitest";
import {
  addDays, diffDays, fromStr, hhmmToMinutes, monthKeyOf,
  toStr, todayStr, minutesToHHmm, daysInMonth,
} from "@/lib/format";

describe("format", () => {
  it("round-trips date strings", () => {
    expect(toStr(fromStr("2026-08-23"))).toBe("2026-08-23");
  });
  it("todayStr is local YYYY-MM-DD", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("adds and diffs days across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDays("2026-08-23", "2026-08-20")).toBe(3);
    expect(diffDays("2026-08-20", "2026-08-23")).toBe(-3);
  });
  it("month keys and lengths", () => {
    expect(monthKeyOf("2026-08-23")).toBe("2026-08");
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026
    expect(daysInMonth(2024, 1)).toBe(29); // leap Feb
    expect(daysInMonth(2026, 7)).toBe(31);
  });
  it("time helpers", () => {
    expect(hhmmToMinutes("22:30")).toBe(1350);
    expect(minutesToHHmm(1350)).toBe("22:30");
  });
});
