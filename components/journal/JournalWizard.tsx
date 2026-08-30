/* AI-CONTEXT-NOTE:{"R":"Full-screen journal wizard overlay: draft resume/autosave via repository, machine-driven navigation, submitEntry on Finish, celebration on day-100 archives.","IDD":[{"?":"Remounts fresh per open: outer component keys the inner flow by session so stale answers never leak across sessions"},{"?":"On mount: getDraft() try/catch - wrong-date or corrupt drafts are silently discarded, never crash; with no draft, today's submitted entry prefills for editing (createdAt preserved on resubmit)"},{"?":"Autosave is fire-and-forget and gated until draft hydration finished (never overwrites a draft it has not read)"},{"?":"Tier answers stay numeric indexes; sleep uses tier-radio for sleepDuration - UI never writes option-id strings into tier fields"},{"?":"storyOfTheDay '' -> null normalized at submit; createdAt preserved on same-day edit"},{"?":"entry.activeHabitCount is a type-satisfying placeholder - repository.submitEntry overwrites it with the active-habit snapshot from its arg"},{"?":"Category celebration fires on category boundary advancement via fireCategoryCelebration"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx mounts <JournalWizard open onOpenChange onSubmitted/>"}],"AB":[{"?":"lib/journal/machine.ts reducer/canAdvance/answerFor"},{"?":"lib/journal/steps.ts STEPS, CATEGORIES, getCategoryForStep"},{"?":"lib/db/repository.ts getDraft/saveDraft/submitEntry/getTodayEntry/getLatestEntryBefore"},{"?":"components/journal/StepRenderer.tsx"},{"?":"components/journal/CelebrationScreen.tsx"},{"?":"components/journal/CategoryBanner.tsx"},{"?":"components/journal/ProgressDots.tsx"},{"?":"components/journal/CategoryCelebration.tsx"}],"E":[{"!!":"npm run build"},{"!!":"npm test tests/machine.test.ts pins machine behavior"},{"?":"Manual smoke: mid-wizard reload resumes draft; same-day edit prefills"}]} */
"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { CelebrationScreen } from "./CelebrationScreen";
import { StepRenderer } from "./StepRenderer";
import { ProgressDots } from "./ProgressDots";
import { CategoryBanner } from "./CategoryBanner";
import { fireCategoryCelebration } from "./CategoryCelebration";
import type { DayEntry, Habit } from "@/lib/db/schema";
import {
  getDraft,
  getLatestEntryBefore,
  getTodayEntry,
  saveDraft,
  submitEntry,
} from "@/lib/db/repository";
import { todayStr } from "@/lib/format";
import { useActiveHabits } from "@/lib/hooks/useHabits";
import { canAdvance, initialWizardState, reducer, answerFor } from "@/lib/journal/machine";
import { STEPS, CATEGORIES, getCategoryForStep } from "@/lib/journal/steps";
import { cn } from "@/lib/utils";

export interface JournalWizardProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onSubmitted(): void;
}

export function JournalWizard({ open, onOpenChange, onSubmitted }: JournalWizardProps) {
  const [session, setSession] = useState(0);
  if (!open) return null;
  const close = () => {
    setSession((s) => s + 1);
    onOpenChange(false);
  };
  return (
    <WizardFlow
      key={session}
      onClose={close}
      onSubmitted={() => {
        setSession((s) => s + 1);
        onSubmitted();
      }}
    />
  );
}

function WizardFlow({ onClose, onSubmitted }: { onClose(): void; onSubmitted(): void }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialWizardState);
  const [ready, setReady] = useState(false);
  const [celebration, setCelebration] = useState<Habit[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const activeHabits = useActiveHabits();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = todayStr();
        const [draft, todayEntry] = await Promise.all([
          getDraft(),
          getTodayEntry(today),
        ]);
        if (cancelled) return;
        if (
          draft &&
          draft.date === today &&
          typeof draft.stepIndex === "number" &&
          draft.answers &&
          typeof draft.answers === "object"
        ) {
          dispatch({
            type: "goto",
            index: Math.min(Math.max(0, draft.stepIndex), STEPS.length - 1),
          });
          dispatch({
            type: "answer",
            patch: {
              ...draft.answers,
              habitsChecked: draft.answers.habitsChecked ?? [],
            },
          });
        } else if (todayEntry) {
          // Same-day edit: no in-progress draft, prefill from the submitted entry.
          const { date, createdAt, updatedAt, ...answers } = todayEntry;
          void date;
          void createdAt;
          void updatedAt;
          dispatch({ type: "answer", patch: answers });
        } else {
          dispatch({ type: "answer", patch: { habitsChecked: [] } });
        }
      } catch {
        if (!cancelled) dispatch({ type: "answer", patch: { habitsChecked: [] } });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDraft({ date: todayStr(), stepIndex: state.stepIndex, answers: state.answers }).catch(
      () => {},
    );
  }, [ready, state]);

  const step = STEPS[state.stepIndex];
  const last = state.stepIndex === STEPS.length - 1;
  const handleNext = () => {
    if (!canAdvance(state)) return;
    const currentCategory = getCategoryForStep(state.stepIndex);
    dispatch({ type: "next" });
    // Fire celebration when crossing a category boundary
    if (currentCategory) {
      const nextCategory = getCategoryForStep(state.stepIndex + 1);
      if (!nextCategory || nextCategory.id !== currentCategory.id) {
        fireCategoryCelebration(currentCategory);
      }
    }
  };

  const handleFinish = async () => {
    if (!canAdvance(state) || submitting) return;
    setSubmitting(true);
    try {
      const today = todayStr();
      const a = state.answers;
      const existing = await getTodayEntry(today);
      const entry: DayEntry = {
        date: today,
        // Physical Well-being
        sleepDuration: a.sleepDuration ?? 0,
        exercise: a.exercise ?? "light",
        nutrition: a.nutrition ?? [],
        hydration: a.hydration ?? 0,
        timeOutdoor: a.timeOutdoor ?? 0,
        physicalFeeling: a.physicalFeeling ?? "okay",
        // Mental & Emotional
        moodCheck: a.moodCheck ?? "okay",
        reading: a.reading ?? "none",
        highlights: a.highlights ?? "",
        couldHaveBeenBetter: a.couldHaveBeenBetter ?? "",
        storyOfTheDay: a.storyOfTheDay ?? null,
        // Relationship Well-being
        familyTime: a.familyTime ?? false,
        conversations: a.conversations ?? false,
        kindnessActs: a.kindnessActs ?? false,
        connectionStatus: a.connectionStatus ?? "neutral",
        // Work & Productivity
        learnedToday: a.learnedToday ?? "",
        tasksFinished: a.tasksFinished ?? "",
        deepWorkHours: a.deepWorkHours ?? 0,
        workFeeling: a.workFeeling ?? "scattered",
        // Habits
        habitsChecked: a.habitsChecked ?? [],
        activeHabitCount: 0,
        // Meta
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      const result = await submitEntry(entry, (activeHabits ?? []).map((h) => h.id));
      if (result.archivedHabits.length > 0) {
        setCelebration(result.archivedHabits);
      } else {
        onClose();
        onSubmitted();
      }
    } catch {
      toast.error("could not save your entry - please try again");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex flex-col gap-3 bg-background px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-3">
            <CategoryBanner stepIndex={state.stepIndex} />
            <ProgressDots currentStepIndex={state.stepIndex} />
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Close journal" onClick={onClose}>
            <IconX className="size-5" />
          </Button>
        </div>
        <h2 className="font-heading text-xl font-semibold leading-snug">{step.question}</h2>
      </header>
      <main className="flex-1 overflow-y-auto px-5 pb-6">
        {ready ? (
          <StepRenderer
            step={step}
            answers={state.answers}
            answerValue={answerFor(step.id, state.answers)}
            onChange={(patch) => dispatch({ type: "answer", patch })}
          />
        ) : null}
      </main>
      <footer className="flex items-center justify-between gap-3 border-t bg-background px-5 py-3">
        {state.stepIndex > 0 ? (
          <Button variant="ghost" onClick={() => dispatch({ type: "back" })}>
            <IconArrowLeft data-icon="inline-start" />
            Back
          </Button>
        ) : (
          <span />
        )}
        {last ? (
          <Button onClick={handleFinish} disabled={!canAdvance(state) || submitting}>
            Finish
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!canAdvance(state)}>
            Next
            <IconArrowRight data-icon="inline-end" />
          </Button>
        )}
      </footer>
      {celebration && (
        <CelebrationScreen
          habits={celebration}
          onDismiss={() => {
            onClose();
            onSubmitted();
          }}
        />
      )}
    </div>
  );
}
