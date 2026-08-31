/* AI-CONTEXT-NOTE:{"R":"Unit tests for lib/journal/steps.ts: step definitions, categories, option labels.","IDD":[],"A":[],"AB":["lib/journal/steps.ts"],"E":["npm test tests/journal-steps.test.ts"]} */
import { describe, expect, it } from "vitest";
import { STEPS, stepById, optionLabel, CATEGORIES, getCategoryForStep } from "@/lib/journal/steps";

describe("steps config", () => {
  it("has exactly 22 ordered steps", () => {
    expect(STEPS).toHaveLength(22);
    expect(STEPS.map((s) => s.order)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it("each step has a unique id", () => {
    const ids = STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(22);
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
    expect(stepById("deepWorkHours").type).toBe("tier-radio");
    expect(stepById("workFeeling").type).toBe("radio");
    expect(stepById("taskForToday").type).toBe("tasks-checklist");
    expect(stepById("taskForTomorrow").type).toBe("tasks-list");
    expect(stepById("monthBucketList").type).toBe("bucket-list");
    expect(stepById("habits").type).toBe("habits");
  });

  it("minChars values are correct", () => {
    expect(stepById("highlights").minChars).toBe(50);
    expect(stepById("couldHaveBeenBetter").minChars).toBe(50);
    expect(stepById("learnedToday").minChars).toBe(20);
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
  it("has exactly 5 categories", () => {
    expect(CATEGORIES).toHaveLength(5);
  });

  it("category ids are physical, mental, social, productivity, habits-plans", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(["physical", "mental", "social", "productivity", "habits-plans"]);
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

  it("habits step exists and is in habits-plans category", () => {
    const allCategoryStepIds = CATEGORIES.flatMap((c) => c.stepIds);
    expect(allCategoryStepIds).toContain("habits");
    const habitsCategory = CATEGORIES.find((c) => c.stepIds.includes("habits"));
    expect(habitsCategory?.id).toBe("habits-plans");
  });

  it("getCategoryForStep returns correct category for each step index", () => {
    // Physical: indices 0-5
    expect(getCategoryForStep(0)?.id).toBe("physical");
    expect(getCategoryForStep(5)?.id).toBe("physical");
    // Mental: indices 6-10
    expect(getCategoryForStep(6)?.id).toBe("mental");
    expect(getCategoryForStep(10)?.id).toBe("mental");
    // Social: indices 11-14
    expect(getCategoryForStep(11)?.id).toBe("social");
    expect(getCategoryForStep(14)?.id).toBe("social");
    // Productivity: indices 15-17
    expect(getCategoryForStep(15)?.id).toBe("productivity");
    expect(getCategoryForStep(17)?.id).toBe("productivity");
    // Habits-plans: indices 18-21
    expect(getCategoryForStep(18)?.id).toBe("habits-plans");
    expect(getCategoryForStep(21)?.id).toBe("habits-plans");
    // Out of bounds returns undefined
    expect(getCategoryForStep(22)).toBeUndefined();
  });

  it("each category has color and icon fields", () => {
    for (const cat of CATEGORIES) {
      expect(cat.color).toBeTruthy();
      expect(cat.icon).toBeTruthy();
    }
  });
});
