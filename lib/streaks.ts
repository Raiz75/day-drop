/* AI-CONTEXT-NOTE:{"R":"Pure streak computations: journaling streak + per-metric good-day streaks.","IDD":[{"?":"A streak anchors on today OR yesterday (you haven't journaled today yet without breaking it)."},{"?":"Metric good bar = GOOD_SCORE_THRESHOLD (7)."},{"?":"Missing calendar days break metric streaks like failures do."}],"A":[{"?":"components/dashboard/StreakChips.tsx greeting flame chip"}],"AB":[{"?":"lib/scoring.ts scoreEntry/threshold"},{"?":"lib/format.ts diffDays/addDays"}],"E":[{"!!":"tests/streaks.test.ts"}]} */
import { addDays } from "@/lib/format";
import { GOOD_SCORE_THRESHOLD, scoreEntry, type MetricKey } from "@/lib/scoring";
import type { DayEntry } from "@/lib/db/schema";

export function journalStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  if (!set.has(cursor)) return 0;
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function metricStreak(entries: DayEntry[], metric: MetricKey, today: string): number {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  let cursor = byDate.has(today) ? today : addDays(today, -1);
  if (!byDate.has(cursor)) return 0;
  let n = 0;
  while (byDate.has(cursor)) {
    const e = byDate.get(cursor)!;
    if (scoreEntry(e)[metric] < GOOD_SCORE_THRESHOLD) break;
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function allStreaks(entries: DayEntry[], today: string): { journal: number } & Record<MetricKey, number> {
  const metrics: MetricKey[] =
    ["physical", "mental", "social", "productivity"];
  const out = { journal: journalStreak(entries.map((e) => e.date), today) } as
    { journal: number } & Record<MetricKey, number>;
  for (const m of metrics) out[m] = metricStreak(entries, m, today);
  return out;
}
