/* AI-CONTEXT-NOTE:{"R":"Pure scoring engine: per-metric 1-10 daily scores across 4 metrics (physical, mental, social, productivity), daily total (max 40), lifetime aura-points balance (1000 pts per redemption).","IDD":[{"?":"Never returns 0 for a scored metric (floor 1) per spec."},{"?":"Max daily score is 40 (4 metrics × 10 each)."},{"?":"AURA_COST = 1000 (previously 1500)."},{"?":"MetricKey changed from 7 metrics to 4 category-level metrics."},{"?":"Tier/option scores are defined in lib/journal/steps.ts; this file consumes them."}],"A":[{"!!!":"lib/journal/steps.ts","CRITICAL":"option ids and tierScores arrays are consumed positionally"},{"?":"lib/streaks.ts threshold"},{"?":"components/dashboard/RewardBanner.tsx + DashboardView.tsx consume AURA_COST/pointsBalance"},{"?":"components/dashboard/StreakChips.tsx consumes MetricKey type"},{"?":"components/dashboard/TrendChart.tsx consumes scoreEntry"},{"?":"components/dashboard/HeatmapCalendar.tsx consumes scoreEntry"}],"AB":[{"?":"lib/db/schema.ts DayEntry"}],"E":[{"!!":"tests/scoring.test.ts"},{"?":"Tuning point values: edit STEPS options/tierScores, not this file"}]} */
import type { DayEntry } from "@/lib/db/schema";

export const GOOD_SCORE_THRESHOLD = 7;
export const MAX_METRIC_SCORE = 10;
export const METRIC_COUNT = 4;

export type MetricKey = "physical" | "mental" | "social" | "productivity";

export const AURA_COST = 1000;

function physicalScore(e: DayEntry): number {
  const sleepScores = [3, 5, 10, 8, 6, 3];
  const sleep = sleepScores[e.sleepDuration] ?? 1;
  const exerciseScores: Record<string, number> = { light: 4, medium: 7, heavy: 10 };
  const exercise = exerciseScores[e.exercise] ?? 1;
  const nutritionScore = Math.min(10, (e.nutrition.length || 0) * 3 + 1);
  const hydrationScores = [3, 5, 8, 10];
  const hydration = hydrationScores[e.hydration] ?? 1;
  const outdoorScores = [2, 5, 8, 10];
  const outdoor = outdoorScores[e.timeOutdoor] ?? 1;
  const feelingScores: Record<string, number> = { unwell: 2, okay: 5, healthy: 8, energetic: 10 };
  const feeling = feelingScores[e.physicalFeeling] ?? 1;
  const avg = (sleep + exercise + nutritionScore + hydration + outdoor + feeling) / 6;
  return Math.min(10, Math.max(1, Math.round(avg)));
}

function mentalScore(e: DayEntry): number {
  const moodScores: Record<string, number> = {
    happy: 10, energetic: 9, okay: 6, bored: 4, tired: 3, anxious: 3, sad: 2, angry: 2, lonely: 2,
  };
  const mood = moodScores[e.moodCheck] ?? 1;
  const readingScores: Record<string, number> = {
    none: 1, "a-bit": 3, decent: 5, "a-lot": 7, "on-a-roll": 9, bookworm: 10,
  };
  const reading = readingScores[e.reading] ?? 1;
  const textBonuses = [e.highlights, e.couldHaveBeenBetter, e.storyOfTheDay].filter((t) => t && t.length > 0).length;
  const textBonusScaled = Math.round((textBonuses / 3) * 10);
  const avg = (mood + reading + textBonusScaled) / 3;
  return Math.min(10, Math.max(1, Math.round(avg)));
}

function socialScore(e: DayEntry): number {
  const family = e.familyTime ? 8 : 2;
  const convos = e.conversations ? 8 : 2;
  const kindness = e.kindnessActs ? 8 : 2;
  const connectionScores: Record<string, number> = { connected: 10, neutral: 5, lonely: 2 };
  const connection = connectionScores[e.connectionStatus] ?? 1;
  const avg = (family + convos + kindness + connection) / 4;
  return Math.min(10, Math.max(1, Math.round(avg)));
}

function productivityScore(e: DayEntry): number {
  const deepWorkScores = [1, 4, 7, 9, 10];
  const deepWork = deepWorkScores[e.deepWorkHours] ?? 1;
  const workScores: Record<string, number> = { focused: 10, productive: 8, scattered: 4, drained: 2 };
  const work = workScores[e.workFeeling] ?? 1;
  const learnedBonus = e.learnedToday && e.learnedToday.length > 0 ? 10 : 0;
  const avg = (deepWork + work + learnedBonus) / 3;
  return Math.min(10, Math.max(1, Math.round(avg)));
}

export function tasksScore(e: DayEntry): number {
  return e.tasksChecked.length * 2;
}

export function bucketListScore(e: DayEntry): number {
  return e.bucketListChecked.length * 10;
}

export function habitsBonusScore(e: DayEntry): number {
  return e.habitsChecked.length * 2;
}

export function scoreEntry(
  e: DayEntry,
): Record<MetricKey, number> & { tasks: number; bucketList: number; habitsBonus: number; total: number } {
  const physical = physicalScore(e);
  const mental = mentalScore(e);
  const social = socialScore(e);
  const productivity = productivityScore(e);
  const tasks = tasksScore(e);
  const bucketList = bucketListScore(e);
  const habitsBonus = habitsBonusScore(e);
  const total = physical + mental + social + productivity + tasks + bucketList + habitsBonus;
  return { physical, mental, social, productivity, tasks, bucketList, habitsBonus, total };
}

export function totalPoints(entries: DayEntry[]): number {
  return entries.reduce((sum, e) => sum + scoreEntry(e).total, 0);
}

export function pointsBalance(entries: DayEntry[], redeemedCount: number): number {
  return totalPoints(entries) - AURA_COST * redeemedCount;
}
