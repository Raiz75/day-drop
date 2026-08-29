import { describe, expect, it } from "vitest";
import { validateStep } from "@/lib/validations/journal";
import { stepById } from "@/lib/journal/steps";

describe("validateStep", () => {
  it("radio rejects unknown option", () => {
    expect(validateStep(stepById("physicalFeeling"), "nope").ok).toBe(false);
    expect(validateStep(stepById("physicalFeeling"), "healthy").ok).toBe(true);
  });
  it("checkbox accepts empty and valid arrays", () => {
    expect(validateStep(stepById("nutrition"), []).ok).toBe(true);
    expect(validateStep(stepById("nutrition"), ["vegetables", "fruit"]).ok).toBe(true);
    expect(validateStep(stepById("nutrition"), ["bogus"]).ok).toBe(false);
  });
  it("sleep validates windows", () => {
    expect(validateStep(stepById("sleepDuration"), "7-8h").ok).toBe(true);
    expect(validateStep(stepById("sleepDuration"), "bogus").ok).toBe(false);
  });
  it("text enforces minChars, optional allows empty", () => {
    expect(validateStep(stepById("highlights"), "short").ok).toBe(false);
    expect(validateStep(stepById("highlights"), "this is definitely long enough to meet the fifty character minimum requirement").ok).toBe(true);
    expect(validateStep(stepById("storyOfTheDay"), "").ok).toBe(true);
  });
  it("tasksFinished requires >=20 chars", () => {
    expect(validateStep(stepById("tasksFinished"), "").ok).toBe(false);
    expect(validateStep(stepById("tasksFinished"), "ship MVP").ok).toBe(false);
    expect(validateStep(stepById("tasksFinished"), "completed the main task for today").ok).toBe(true);
  });
});