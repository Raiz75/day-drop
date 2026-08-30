/* AI-CONTEXT-NOTE:{"R":"Headless wizard state machine over STEPS[20]: answers, advance gating via validateStep.","IDD":[{"?":"stepIndex indexes STEPS array (0-based); order field is display-only."},{"?":"Tier steps map StepId to tier index fields; others share names."},{"?":"Tier answers are stored as numeric indexes (Partial<DayEntry>); canAdvance translates index->option id before validateStep."},{"?":"Pure reducer - persistence of drafts happens in JournalWizard via repository.saveDraft."}],"A":[{"!!!":"components/journal/JournalWizard.tsx","CRITICAL":"UI drives this reducer; do not duplicate validation there"},{"?":"tests/machine.test.ts pins behavior"}],"AB":[{"?":"lib/journal/steps.ts"},{"?":"lib/validations/journal.ts"}],"E":[{"!!":"tests/machine.test.ts"}]} */
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

const FIELD_BY_STEP: Record<StepId, keyof DayEntry> = {
  sleepDuration: "sleepDuration",
  exercise: "exercise",
  nutrition: "nutrition",
  hydration: "hydration",
  timeOutdoor: "timeOutdoor",
  physicalFeeling: "physicalFeeling",
  moodCheck: "moodCheck",
  reading: "reading",
  highlights: "highlights",
  couldHaveBeenBetter: "couldHaveBeenBetter",
  storyOfTheDay: "storyOfTheDay",
  familyTime: "familyTime",
  conversations: "conversations",
  kindnessActs: "kindnessActs",
  connectionStatus: "connectionStatus",
  learnedToday: "learnedToday",
  tasksFinished: "tasksFinished",
  deepWorkHours: "deepWorkHours",
  workFeeling: "workFeeling",
  habits: "habitsChecked",
};

export function answerFor(stepId: StepId, answers: Partial<DayEntry>): unknown {
  return answers[FIELD_BY_STEP[stepId]];
}

export function canAdvance(state: WizardState): boolean {
  const step: StepDef | undefined = STEPS[state.stepIndex];
  if (!step) return false;
  const raw = answerFor(step.id, state.answers);
  // Tier answers are stored as numeric indexes (Partial<DayEntry>); translate
  // to the option id validateStep expects. Booleans (yes/no radio) translate
  // to "yes"/"no" option ids. Strings pass through.
  let value: unknown = raw;
  if (step.type === "tier-radio" && typeof raw === "number" && Number.isInteger(raw)) {
    value = step.options?.[raw]?.id;
  } else if (typeof raw === "boolean") {
    value = raw ? "yes" : "no";
  }
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