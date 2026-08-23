/* AI-CONTEXT-NOTE:{"R":"Headless wizard state machine over STEPS[16]: answers, advance gating via validateStep.","IDD":[{"?":"stepIndex indexes STEPS array (0-based); order field is display-only."},{"?":"Tier steps map StepId 'steps'/'screenTime'/'reading' to *Tier fields; others share names."},{"?":"Tier answers are numeric indexes; canAdvance translates index->option id before validateStep."},{"?":"Pure reducer - persistence of drafts happens in JournalWizard via repository.saveDraft."}],"A":[{"!!!":"components/journal/JournalWizard.tsx","CRITICAL":"UI drives this reducer; do not duplicate validation there"},{"?":"tests/machine.test.ts pins behavior"}],"AB":[{"?":"lib/journal/steps.ts"},{"?":"lib/validations/journal.ts"}],"E":[{"!!":"tests/machine.test.ts"}]} */
import { STEPS, type StepDef, type StepId } from "@/lib/journal/steps";
import { validateStep } from "@/lib/validations/journal";
import type { DayEntry } from "@/lib/db/schema";

export interface WizardState {
  stepIndex: number;
  answers: Partial<DayEntry>;
}

export type WizardAction =
  | { type: "answer"; patch: Partial<DayEntry> }
  | { type: "next" }
  | { type: "back" }
  | { type: "goto"; index: number };

const FIELD_BY_STEP: Record<Exclude<StepId, "sleep">, keyof DayEntry> = {
  work: "work", health: "health", weather: "weather",
  steps: "stepsTier", workout: "workouts", screenTime: "screenTimeTier",
  reading: "readingTier", mood: "mood", highlight: "highlight",
  improve: "improve", grateful: "grateful", todayTasks: "todayTasks",
  tomorrowPlan: "tomorrowPlan", bucketList: "bucketList", habits: "habitsChecked",
};

export function answerFor(stepId: StepId, answers: Partial<DayEntry>): unknown {
  if (stepId === "sleep") {
    if (answers.sleptAt == null && answers.wokeAt == null) return undefined;
    return { sleptAt: answers.sleptAt, wokeAt: answers.wokeAt };
  }
  return answers[FIELD_BY_STEP[stepId]];
}

export function canAdvance(state: WizardState): boolean {
  const step: StepDef | undefined = STEPS[state.stepIndex];
  if (!step) return false;
  const raw = answerFor(step.id, state.answers);
  // Tier answers are stored as numeric indexes (Partial<DayEntry>); translate
  // to the option id validateStep expects. Strings/out-of-range pass through.
  const value =
    step.type === "tier-radio" && typeof raw === "number" && Number.isInteger(raw)
      ? step.options?.[raw]?.id
      : raw;
  return validateStep(step, value).ok;
}

export function initialWizardState(): WizardState {
  return { stepIndex: 0, answers: {} };
}

export function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "answer":
      return { ...state, answers: { ...state.answers, ...action.patch } };
    case "next": {
      if (!canAdvance(state)) return state;
      return { ...state, stepIndex: Math.min(STEPS.length - 1, state.stepIndex + 1) };
    }
    case "back":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "goto":
      // Free navigation within bounds (progress dots are informational in MVP).
      return { ...state, stepIndex: Math.min(Math.max(0, action.index), STEPS.length - 1) };
  }
}
