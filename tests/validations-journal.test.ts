import { describe, expect, it } from "vitest";
import { validateStep } from "@/lib/validations/journal";
import { stepById } from "@/lib/journal/steps";

describe("validateStep", () => {
  it("radio rejects unknown option", () => {
    expect(validateStep(stepById("health"), "nope").ok).toBe(false);
    expect(validateStep(stepById("health"), "healthy").ok).toBe(true);
  });
  it("checkbox accepts empty and valid arrays", () => {
    expect(validateStep(stepById("weather"), []).ok).toBe(true);
    expect(validateStep(stepById("weather"), ["stormy", "light-rain"]).ok).toBe(true);
    expect(validateStep(stepById("weather"), ["bogus"]).ok).toBe(false);
  });
  it("sleep validates windows", () => {
    expect(validateStep(stepById("sleep"), { sleptAt: "22:30", wokeAt: "06:30" }).ok).toBe(true);
    expect(validateStep(stepById("sleep"), { sleptAt: "19:00", wokeAt: "06:30" }).ok).toBe(false);
    expect(validateStep(stepById("sleep"), { sleptAt: "22:30", wokeAt: "11:00" }).ok).toBe(false);
  });
  it("text enforces minChars, optional allows empty", () => {
    expect(validateStep(stepById("highlight"), "short").ok).toBe(false);
    expect(validateStep(stepById("highlight"), "this is definitely long enough").ok).toBe(true);
    expect(validateStep(stepById("bucketList"), "").ok).toBe(true);
  });
  it("tomorrow requires >=1 task", () => {
    expect(validateStep(stepById("tomorrowPlan"), []).ok).toBe(false);
    expect(validateStep(stepById("tomorrowPlan"), ["ship MVP"]).ok).toBe(true);
  });
});
