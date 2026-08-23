import { describe, expect, it } from "vitest";
import { STEPS, stepById, optionLabel } from "@/lib/journal/steps";

describe("steps config", () => {
  it("has exactly 16 ordered steps", () => {
    expect(STEPS).toHaveLength(16);
    expect(STEPS.map((s) => s.order)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it("types match spec", () => {
    expect(stepById("health").type).toBe("radio");
    expect(stepById("weather").type).toBe("checkbox");
    expect(stepById("steps").type).toBe("tier-radio");
    expect(stepById("screenTime").type).toBe("tier-radio");
    expect(stepById("reading").type).toBe("tier-radio");
    expect(stepById("sleep").type).toBe("sleep");
    expect(stepById("highlight").minChars).toBe(20);
    expect(stepById("improve").minChars).toBe(20);
    expect(stepById("grateful").minChars).toBe(20);
    expect(stepById("bucketList").optional).toBe(true);
  });
  it("option counts match spec", () => {
    expect(stepById("work").options).toHaveLength(5);
    expect(stepById("health").options).toHaveLength(6);
    expect(stepById("weather").options).toHaveLength(6);
    expect(stepById("steps").options).toHaveLength(7);
    expect(stepById("workout").options).toHaveLength(7);
    expect(stepById("screenTime").options).toHaveLength(8);
    expect(stepById("reading").options).toHaveLength(7);
    expect(stepById("mood").options).toHaveLength(9);
  });
  it("resolves labels by id", () => {
    expect(optionLabel("health", "healthy")).toBe("i feel healthy today");
    expect(optionLabel("steps", "little-bit")).toBe("i did a little bit (3001-5000)");
  });
});
