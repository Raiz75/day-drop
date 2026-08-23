import { describe, expect, it } from "vitest";
import { answerFor, canAdvance, initialWizardState, reducer } from "@/lib/journal/machine";

describe("machine", () => {
  it("starts at step 0 empty", () => {
    const s = initialWizardState();
    expect(s.stepIndex).toBe(0);
    expect(s.answers).toEqual({});
  });
  it("cannot advance past an unanswered radio", () => {
    expect(canAdvance(initialWizardState())).toBe(false);
  });
  it("answers then advances through s1 and blocks on s2", () => {
    let s = reducer(initialWizardState(), { type: "answer", patch: { work: "fun" } });
    expect(canAdvance(s)).toBe(true);
    s = reducer(s, { type: "next" });
    expect(s.stepIndex).toBe(1);
    expect(canAdvance(s)).toBe(false);
  });
  it("maps tier ids to tier fields", () => {
    const s = reducer(
      reducer(initialWizardState(), { type: "goto", index: 3 }),
      { type: "answer", patch: { stepsTier: 6 } },
    );
    expect(answerFor("steps", s.answers)).toBe(6);
    expect(canAdvance(s)).toBe(true);
  });
  it("back preserves answers", () => {
    let s = reducer(initialWizardState(), { type: "answer", patch: { work: "fun" } });
    s = reducer(s, { type: "next" });
    s = reducer(s, { type: "back" });
    expect(s.answers.work).toBe("fun");
  });
});
