import { describe, expect, it } from "vitest";
import { buildTodayChecklist, uncheckedTexts, mergeCarried } from "@/lib/carryover";

describe("carryover", () => {
  it("builds unchecked checklist from yesterday's plan", () => {
    expect(buildTodayChecklist(["a", "b"])).toEqual([
      { text: "a", done: false }, { text: "b", done: false },
    ]);
    expect(buildTodayChecklist(undefined)).toEqual([]);
  });
  it("extracts unchecked texts", () => {
    expect(uncheckedTexts([{ text: "a", done: true }, { text: "b", done: false }])).toEqual(["b"]);
  });
  it("merge dedupes case-insensitively and appends carried", () => {
    expect(mergeCarried(["Buy milk", "call mom"], ["buy MILK", "read"])).toEqual([
      "Buy milk", "call mom", "read",
    ]);
  });
});
