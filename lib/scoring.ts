/* AI-CONTEXT-NOTE:{"R":"Pure scoring engine: per-metric 1-10 daily scores, daily total (max 70), monthly reward evaluation.","IDD":[{"?":"Never returns 0 for a scored metric (floor 1) per spec."},{"?":"Workout sums option points capped at 10."},{"?":"Sleep bands: [7,9]=10, [6,7)/(9,10]=7, [5,6)/(10,11]=4, else 2."},{"?":"Habit partial formula needs active-habit count; defaults to checked length."},{"?":"Monthly unlock needs ratio>=0.8 AND coverage>=ceil(daysInMonth*0.5)."}],"A":[{"!!!":"lib/journal/steps.ts","CRITICAL":"option ids and tierScores arrays are consumed positionally"},{"?":"lib/streaks.ts threshold"},{"?":"components/dashboard/RewardBanner.tsx"},{"?":"lib/db/repository.ts lazy month evaluation"}],"AB":[{"?":"lib/format.ts sleepHours/daysInMonth"}],"E":[{"!!":"tests/scoring.test.ts"},{"?":"Tuning point values: edit STEPS options/tierScores, not this file"}]} */
import { sleepHours, daysInMonth } from "@/lib/format";
import { stepById } from "@/lib/journal/steps";
import type { DayEntry } from "@/lib/db/schema";

export const GOOD_SCORE_THRESHOLD = 7;
export const MAX_METRIC_SCORE = 10;
export const METRIC_COUNT = 7;
export const MIN_MONTH_COVERAGE_RATIO = 0.5;

export type MetricKey =
  | "health" | "steps" | "workout" | "screenTime" | "reading" | "sleep" | "habits";

function optionPoints(stepId: Parameters<typeof stepById>[0], optionId: string): number {
  return stepById(stepId).options?.find((o) => o.id === optionId)?.points ?? 1;
}

function tierScore(stepId: Parameters<typeof stepById>[0], tierIndex: number): number {
  const scores = stepById(stepId).tierScores ?? [];
  return scores[tierIndex] ?? 1;
}

function workoutScore(ids: string[]): number {
  const raw = ids.reduce((sum, id) => sum + optionPoints("workout", id), 0);
  return Math.min(10, Math.max(1, raw || 1));
}

function sleepScore(sleptAt: string, wokeAt: string): number {
  const h = sleepHours(sleptAt, wokeAt);
  if (h >= 7 && h <= 9) return 10;
  if ((h >= 6 && h < 7) || (h > 9 && h <= 10)) return 7;
  if ((h >= 5 && h < 6) || (h > 10 && h <= 11)) return 4;
  return 2;
}

function habitScore(checked: string[], activeTotal?: number): number {
  const total = activeTotal ?? checked.length;
  if (checked.length === 0) return 1;
  if (checked.length >= total) return 10;
  return Math.min(10, 1 + Math.round((9 * checked.length) / Math.max(1, total)));
}

export function scoreEntry(
  e: DayEntry,
  activeHabitCount?: number,
): Record<MetricKey, number> & { total: number } {
  const health = optionPoints("health", e.health);
  const steps = tierScore("steps", e.stepsTier);
  const workout = workoutScore(e.workouts);
  const screenTime = tierScore("screenTime", e.screenTimeTier);
  const reading = tierScore("reading", e.readingTier);
  const sleep = sleepScore(e.sleptAt, e.wokeAt);
  const habits = habitScore(e.habitsChecked, activeHabitCount);
  const total = health + steps + workout + screenTime + reading + sleep + habits;
  return { health, steps, workout, screenTime, reading, sleep, habits, total };
}

export function monthScore(entries: DayEntry[], activeHabitCountByDate?: Map<string, number>): number {
  return entries.reduce(
    (sum, e) => sum + scoreEntry(e, activeHabitCountByDate?.get(e.date)).total,
    0,
  );
}

export function evaluateMonth(entries: DayEntry[], monthKey: string): {
  score: number; maxPossible: number; ratio: number; eligible: boolean; unlocked: boolean;
} {
  const score = monthScore(entries);
  const maxPossible = entries.length * MAX_METRIC_SCORE * METRIC_COUNT;
  const ratio = maxPossible === 0 ? 0 : score / maxPossible;
  const [year, monthIdx0] = monthKey.split("-").map(Number);
  const needed = Math.ceil(daysInMonth(year, monthIdx0 - 1) * MIN_MONTH_COVERAGE_RATIO);
  const eligible = entries.length >= needed;
  return { score, maxPossible, ratio, eligible, unlocked: eligible && ratio >= 0.8 };
}
