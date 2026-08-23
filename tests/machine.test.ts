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

  it("sleep step needs both times inside the window", () => {
    const base = reducer(initialWizardState(), { type: "goto", index: 7 });
    expect(canAdvance(base)).toBe(false);
    let s = reducer(base, { type: "answer", patch: { sleptAt: "23:00", wokeAt: "07:30" } });
    expect(canAdvance(s)).toBe(true);
    s = reducer(s, { type: "answer", patch: { sleptAt: "19:45" } });
    expect(canAdvance(s)).toBe(false);
  });

  it("optional empty text advances (bucketList)", () => {
    const s = reducer(initialWizardState(), { type: "goto", index: 14 });
    expect(canAdvance(s)).toBe(true);
  });

  it("required text gates on minChars", () => {
    let s = reducer(initialWizardState(), { type: "goto", index: 9 });
    s = reducer(s, { type: "answer", patch: { highlight: "too short" } });
    expect(canAdvance(s)).toBe(false);
    s = reducer(s, { type: "answer", patch: { highlight: "a".repeat(20) } });
    expect(canAdvance(s)).toBe(true);
  });

  it("out-of-range tier index blocks advance", () => {
    const s = reducer(
      reducer(initialWizardState(), { type: "goto", index: 3 }),
      { type: "answer", patch: { stepsTier: 99 } },
    );
    expect(canAdvance(s)).toBe(false);
  });

  it("empty checkbox and tasks arrays are valid answers", () => {
    let s = reducer(initialWizardState(), { type: "goto", index: 2 });
    expect(canAdvance(s)).toBe(false); // unanswered
    s = reducer(s, { type: "answer", patch: { weather: [] } });
    expect(canAdvance(s)).toBe(true);
    s = reducer(
      reducer(initialWizardState(), { type: "goto", index: 12 }),
      { type: "answer", patch: { todayTasks: [] } },
    );
    expect(canAdvance(s)).toBe(true);
  });

  it("next clamps at the last step and goto stays in bounds", () => {
    const s = reducer(initialWizardState(), { type: "goto", index: 15 });
    expect(canAdvance(reducer(s, { type: "answer", patch: { habitsChecked: ["x"] } }))).toBe(true);
    const end = reducer(reducer(s, { type: "answer", patch: { habitsChecked: [] } }), {
      type: "next",
    });
    expect(end.stepIndex).toBe(15);
    expect(reducer(s, { type: "goto", index: 99 }).stepIndex).toBe(15);
    expect(reducer(s, { type: "goto", index: -5 }).stepIndex).toBe(0);
  });
});
