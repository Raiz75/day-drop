/* AI-CONTEXT-NOTE:{"R":"Sole write path to IndexedDB: entries, habits, meta (drafts/rewards).","IDD":[{"?":"Every mutation is an exported async fn; components/hooks NEVER touch db.write directly."},{"?":"submitEntry runs atomically: entry upsert + draft clear + habit day-100 auto-archive."},{"!":"submitEntry stamps entries.activeHabitCount from its activeHabitIds arg - the per-day scoring snapshot"},{"?":"evaluateFinishedMonths is lazy grading called on app open; idempotent via final statuses."},{"?":"Day-100 archive is calendar-based: archivedAt set when entry.date == startedOn+99d."}],"A":[{"!!!":"lib/hooks/*.ts consume these; never call from inside useLiveQuery"},{"?":"components/journal/JournalWizard.tsx submit flow"},{"?":"components/settings/SettingsView.tsx import/export"}],"AB":[{"?":"lib/db/schema.ts"},{"?":"lib/scoring.ts evaluateMonth"},{"?":"lib/format.ts addDays/monthKeyOf"}],"E":[{"!!":"tests/repository.test.ts"},{"!!":"npm run build"}]} */
import {
  db, DRAFT_KEY, newId, rewardKey,
  type DayEntry, type Habit, type JournalDraft, type RewardRecord, type RewardStatus,
} from "@/lib/db/schema";
import { addDays, monthKeyOf, todayStr } from "@/lib/format";
import { evaluateMonth } from "@/lib/scoring";

// Dexie emulates null-index queries but its IndexableType excludes null.


async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}

async function putMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value });
}

export function getDraft() { return getMeta<JournalDraft>(DRAFT_KEY); }
export function saveDraft(draft: JournalDraft) { return putMeta(DRAFT_KEY, draft); }
export function clearDraft() { return db.meta.delete(DRAFT_KEY); }

export function getTodayEntry(today: string) { return db.entries.get(today); }

export async function getLatestEntryBefore(date: string): Promise<DayEntry | undefined> {
  const all = await db.entries.toArray();
  const before = all.filter((e) => e.date < date).sort((a, b) => b.date.localeCompare(a.date));
  return before[0];
}

export async function submitEntry(
  payload: DayEntry,
  activeHabitIds: string[],
): Promise<{ archivedHabits: Habit[] }> {
  const archivedHabits: Habit[] = [];
  await db.transaction("rw", db.entries, db.habits, db.meta, async () => {
    await db.entries.put({
      ...payload,
      updatedAt: Date.now(),
      activeHabitCount: activeHabitIds.length,
    });
    await db.meta.delete(DRAFT_KEY);
    const actives = await db.habits.filter((h) => h.archivedAt === null).toArray();
    for (const h of actives) {
      if (payload.date === addDays(h.startedOn, 99)) {
        const archived: Habit = { ...h, archivedAt: payload.date };
        await db.habits.put(archived);
        archivedHabits.push(archived);
      }
    }
  });
  return { archivedHabits };
}

export async function addHabit(name: string): Promise<Habit> {
  const habit: Habit = { id: newId(), name: name.trim(), startedOn: todayStr(), archivedAt: null };
  await db.habits.add(habit);
  return habit;
}

export async function renameHabit(id: string, name: string): Promise<void> {
  await db.habits.update(id, { name: name.trim() });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.habits.delete(id);
}

export function getActiveHabits(): Promise<Habit[]> {
  return db.habits.filter((h) => h.archivedAt === null).toArray();
}

export function getArchivedHabits(): Promise<Habit[]> {
  return db.habits.filter((h) => h.archivedAt !== null).toArray();
}

const FINAL: RewardStatus[] = ["earned", "missed", "claimed"];

export function getReward(month: string) {
  return getMeta<RewardRecord>(rewardKey(month));
}

export async function setMonthlyReward(month: string, text: string): Promise<void> {
  const existing = await getReward(month);
  const status: RewardStatus =
    existing && FINAL.includes(existing.status) ? existing.status : existing?.status === "pending" || !existing ? "active" : existing.status;
  await putMeta(rewardKey(month), { ...(existing ?? { month }), month, text, status } satisfies RewardRecord);
}

export async function claimReward(month: string): Promise<void> {
  const existing = await getReward(month);
  if (existing?.status !== "earned") return;
  await putMeta(rewardKey(month), { ...existing, status: "claimed" } satisfies RewardRecord);
}

export async function evaluateFinishedMonths(
  today: string,
): Promise<{ month: string; unlocked: boolean }[]> {
  const results: { month: string; unlocked: boolean }[] = [];
  const all = await db.entries.toArray();
  const months = new Set(all.map((e) => monthKeyOf(e.date)));
  const currentMonth = monthKeyOf(today);
  for (const month of months) {
    if (month >= currentMonth) continue;
    const existing = await getReward(month);
    if (existing && FINAL.includes(existing.status)) continue;
    const monthEntries = all.filter((e) => monthKeyOf(e.date) === month);
    const evaluation = evaluateMonth(monthEntries, month);
    const status: RewardStatus = evaluation.unlocked ? "earned" : "missed";
    const record: RewardRecord = {
      month,
      text: existing?.text ?? null,
      status,
      score: evaluation.score,
      maxPossible: evaluation.maxPossible,
      ratio: evaluation.ratio,
    };
    await putMeta(rewardKey(month), record);
    results.push({ month, unlocked: evaluation.unlocked });
  }
  return results;
}
