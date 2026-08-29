/* AI-CONTEXT-NOTE:{"R":"Unit tests for lib/journal/steps.ts: step definitions, categories, option labels.","IDD":[],"A":[],"AB":["lib/journal/steps.ts"],"E":["npm test tests/journal-steps.test.ts"]} */
import { describe, expect, it } from "vitest";
import { STEPS, stepById, optionLabel, CATEGORIES } from "@/lib/journal/steps";

describe("steps config", () => {
  it("has exactly 20 ordered steps", () => {
    expect(STEPS).toHaveLength(20);
    expect(STEPS.map((s) => s.order)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("each step has a unique id", () => {
    const ids = STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(20);
  });

  it("step types match expected", () => {
    expect(stepById("sleepDuration").type).toBe("tier-radio");
    expect(stepById("exercise").type).toBe("radio");
    expect(stepById("nutrition").type).toBe("checkbox");
    expect(stepById("hydration").type).toBe("tier-radio");
    expect(stepById("timeOutdoor").type).toBe("tier-radio");
    expect(stepById("physicalFeeling").type).toBe("radio");
    expect(stepById("moodCheck").type).toBe("radio");
    expect(stepById("reading").type).toBe("radio");
    expect(stepById("highlights").type).toBe("text");
    expect(stepById("couldHaveBeenBetter").type).toBe("text");
    expect(stepById("storyOfTheDay").type).toBe("text");
    expect(stepById("familyTime").type).toBe("radio");
    expect(stepById("conversations").type).toBe("radio");
    expect(stepById("kindnessActs").type).toBe("radio");
    expect(stepById("connectionStatus").type).toBe("radio");
    expect(stepById("learnedToday").type).toBe("text");
    expect(stepById("tasksFinished").type).toBe("text");
    expect(stepById("deepWorkHours").type).toBe("tier-radio");
    expect(stepById("workFeeling").type).toBe("radio");
    expect(stepById("habits").type).toBe("habits");
  });

  it("minChars values are correct", () => {
    expect(stepById("highlights").minChars).toBe(50);
    expect(stepById("couldHaveBeenBetter").minChars).toBe(50);
    expect(stepById("learnedToday").minChars).toBe(20);
    expect(stepById("tasksFinished").minChars).toBe(20);
  });

  it("storyOfTheDay is optional", () => {
    expect(stepById("storyOfTheDay").optional).toBe(true);
  });

  it("option counts match spec", () => {
    expect(stepById("sleepDuration").options).toHaveLength(6);
    expect(stepById("exercise").options).toHaveLength(3);
    expect(stepById("nutrition").options).toHaveLength(3);
    expect(stepById("hydration").options).toHaveLength(4);
    expect(stepById("timeOutdoor").options).toHaveLength(4);
    expect(stepById("physicalFeeling").options).toHaveLength(4);
    expect(stepById("moodCheck").options).toHaveLength(9);
    expect(stepById("reading").options).toHaveLength(6);
    expect(stepById("familyTime").options).toHaveLength(2);
    expect(stepById("conversations").options).toHaveLength(2);
    expect(stepById("kindnessActs").options).toHaveLength(2);
    expect(stepById("connectionStatus").options).toHaveLength(3);
    expect(stepById("deepWorkHours").options).toHaveLength(5);
    expect(stepById("workFeeling").options).toHaveLength(4);
  });

  it("resolves labels by id", () => {
    expect(optionLabel("exercise", "heavy")).toBe("heavy");
    expect(optionLabel("moodCheck", "happy")).toBe("happy");
  });
});

describe("categories", () => {
  it("has exactly 4 categories", () => {
    expect(CATEGORIES).toHaveLength(4);
  });

  it("category ids are physical, mental, social, productivity", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(["physical", "mental", "social", "productivity"]);
  });

  it("each category references valid step ids", () => {
    const allStepIds = new Set(STEPS.map((s) => s.id));
    for (const cat of CATEGORIES) {
      for (const stepId of cat.stepIds) {
        expect(allStepIds.has(stepId)).toBe(true);
      }
    }
  });

  it("all category steps are valid and non-duplicate", () => {
    const allCategoryStepIds = CATEGORIES.flatMap((c) => c.stepIds);
    expect(new Set(allCategoryStepIds).size).toBe(allCategoryStepIds.length);
  });

  it("habits step exists but is not in any category", () => {
    const allCategoryStepIds = CATEGORIES.flatMap((c) => c.stepIds);
    expect(allCategoryStepIds).not.toContain("habits");
  });
});
