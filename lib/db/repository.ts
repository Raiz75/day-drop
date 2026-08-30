/* AI-CONTEXT-NOTE:{"R":"Sole write path to IndexedDB: entries, habits, meta (drafts/aura, bucket list).","IDD":[{"?":"Every mutation is an exported async fn; components/hooks NEVER touch db.write directly."},{"?":"submitEntry runs atomically: entry upsert + draft clear + habit day-100 auto-archive."},{"!":"submitEntry stamps entries.activeHabitCount from its activeHabitIds arg - the per-day scoring snapshot"},{"?":"redeemAura appends an aura:<uuid> meta row; balance math lives in lib/scoring.pointsBalance"},{"?":"Day-100 archive is calendar-based: archivedAt set when entry.date == startedOn+99d."},{"?":"Bucket list items stored in meta under key bucketList:<monthKey>."}],"A":[{"!!!":"lib/hooks/*.ts consume these; never call from inside useLiveQuery"},{"?":"components/journal/JournalWizard.tsx submit flow"},{"?":"components/dashboard/DashboardView.tsx redeem flow"},{"?":"components/bucket-list/* (future)"}],"AB":[{"?":"lib/db/schema.ts"},{"?":"lib/format.ts addDays/todayStr"}],"E":[{"!!":"tests/repository.test.ts"},{"!!":"npm run build"},{"!!":"redeemAura writes exactly one row per call"}]} */
import {
  db, DRAFT_KEY, newId, auraKey,
  type DayEntry, type Habit, type JournalDraft,
  type BucketListItem, type BucketListMonth,
} from "@/lib/db/schema";
import { addDays, todayStr } from "@/lib/format";

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

function bucketListKey(monthKey: string): string {
  return `bucketList:${monthKey}`;
}

export async function getBucketList(monthKey: string): Promise<BucketListItem[]> {
  const row = await db.meta.get(bucketListKey(monthKey));
  const bl = row?.value as BucketListMonth | undefined;
  return bl?.items ?? [];
}

export async function saveBucketList(monthKey: string, items: BucketListItem[]): Promise<void> {
  await putMeta(bucketListKey(monthKey), { items } satisfies BucketListMonth);
}

export async function updateBucketListItem(monthKey: string, itemText: string, done: boolean): Promise<void> {
  const items = await getBucketList(monthKey);
  const updated = items.map((item) =>
    item.text === itemText
      ? { ...item, done, doneAt: done ? new Date().toISOString() : null }
      : item
  );
  await saveBucketList(monthKey, updated);
}

export async function redeemAura(): Promise<void> {
  await putMeta(auraKey(newId()), { at: new Date().toISOString() });
}
