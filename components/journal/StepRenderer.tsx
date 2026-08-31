/* AI-CONTEXT-NOTE:{"R":"Dispatches a StepDef to its typed step component.","IDD":[{"?":"Keeps JournalWizard free of per-type branching."}],"A":[{"?":"components/journal/JournalWizard.tsx"}],"AB":[{"?":"components/journal/steps/*"}],"E":[{"!!":"new step types must be added here AND to STEPS config together"}]} */
"use client";

import type { DayEntry } from "@/lib/db/schema";
import type { StepDef } from "@/lib/journal/steps";
import { CheckboxStep } from "./steps/CheckboxStep";
import { HabitsStep } from "./steps/HabitsStep";
import { RadioStep } from "./steps/RadioStep";
import { TextStep } from "./steps/TextStep";
import { TaskForTodayStep } from "./steps/TaskForTodayStep";
import { TaskForTomorrowStep } from "./steps/TaskForTomorrowStep";
import { BucketListStep } from "./steps/BucketListStep";

interface RendererProps {
  step: StepDef;
  answers: Partial<DayEntry>;
  answerValue: unknown;
  onChange(patch: Partial<DayEntry>): void;
}

export function StepRenderer({
  step,
  answers,
  answerValue,
  onChange,
}: RendererProps) {
  switch (step.type) {
    case "radio":
    case "tier-radio":
      return <RadioStep step={step} value={answerValue} onChange={onChange} />;
    case "checkbox":
      return <CheckboxStep step={step} value={answerValue} onChange={onChange} />;
    case "text":
      return <TextStep step={step} value={answerValue} onChange={onChange} />;
    case "habits":
      return <HabitsStep value={answerValue} onChange={onChange} />;
    case "tasks-checklist":
      return <TaskForTodayStep value={answerValue} checked={answers.tasksChecked ?? []} onChange={onChange} />;
    case "tasks-list":
      return <TaskForTomorrowStep value={answerValue} onChange={onChange} />;
    case "bucket-list":
      return <BucketListStep value={answerValue} onChange={onChange} />;
    default:
      return null;
  }
}