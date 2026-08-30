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
  it("tasks-checklist accepts any string array", () => {
    expect(validateStep(stepById("taskForToday"), []).ok).toBe(true);
    expect(validateStep(stepById("taskForToday"), ["fix bug", "ship feature"]).ok).toBe(true);
    expect(validateStep(stepById("taskForToday"), [123]).ok).toBe(false);
  });
  it("tasks-list requires non-empty array of non-empty strings", () => {
    expect(validateStep(stepById("taskForTomorrow"), []).ok).toBe(false);
    expect(validateStep(stepById("taskForTomorrow"), ["write tests"]).ok).toBe(true);
    expect(validateStep(stepById("taskForTomorrow"), [""]).ok).toBe(false);
  });
  it("bucket-list accepts any string array", () => {
    expect(validateStep(stepById("monthBucketList"), []).ok).toBe(true);
    expect(validateStep(stepById("monthBucketList"), ["read 5 books"]).ok).toBe(true);
    expect(validateStep(stepById("monthBucketList"), [42]).ok).toBe(false);
  });
});