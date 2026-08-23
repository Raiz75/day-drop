/* AI-CONTEXT-NOTE:{"R":"Dispatches a StepDef to its typed step component.","IDD":[{"?":"Keeps JournalWizard free of per-type branching."},{"?":"gateRef is the one navigation hook: TasksChecklistStep registers an attempt() gate so the wizard footer's Next can be intercepted by the s13 carry-over dialog (UI stays in the step component)."}],"A":[{"?":"components/journal/JournalWizard.tsx"}],"AB":[{"?":"components/journal/steps/*"}],"E":[{"!!":"new step types must be added here AND to STEPS config together"}]} */
"use client";

import type { RefObject } from "react";
import type { ChecklistItem, DayEntry } from "@/lib/db/schema";
import type { StepDef } from "@/lib/journal/steps";
import { CheckboxStep } from "./steps/CheckboxStep";
import { HabitsStep } from "./steps/HabitsStep";
import { RadioStep } from "./steps/RadioStep";
import { SleepStep } from "./steps/SleepStep";
import { TasksChecklistStep, type TasksGate } from "./steps/TasksChecklistStep";
import { TextStep } from "./steps/TextStep";
import { TomorrowPlanStep } from "./steps/TomorrowPlanStep";

interface RendererProps {
  step: StepDef;
  answers: Partial<DayEntry>;
  answerValue: unknown;
  tasks?: ChecklistItem[];
  carried?: string[];
  onCarried?(texts: string[]): void;
  gateRef?: RefObject<TasksGate | null>;
  onChange(patch: Partial<DayEntry>): void;
}

export function StepRenderer({
  step,
  answerValue,
  tasks,
  carried,
  onCarried,
  gateRef,
  onChange,
}: RendererProps) {
  switch (step.type) {
    case "radio":
    case "tier-radio":
      return <RadioStep step={step} value={answerValue} onChange={onChange} />;
    case "checkbox":
      return <CheckboxStep step={step} value={answerValue} onChange={onChange} />;
    case "sleep":
      return <SleepStep value={answerValue} onChange={onChange} />;
    case "text":
      return <TextStep step={step} value={answerValue} onChange={onChange} />;
    case "tasks":
      return (
        <TasksChecklistStep
          tasks={tasks ?? []}
          value={answerValue}
          onCarried={onCarried}
          gateRef={gateRef}
          onChange={onChange}
        />
      );
    case "tomorrow":
      return <TomorrowPlanStep value={answerValue} carried={carried} onChange={onChange} />;
    case "habits":
      return <HabitsStep value={answerValue} onChange={onChange} />;
    default:
      return null;
  }
}
