/* AI-CONTEXT-NOTE:{"R":"JSON backup build/parse/merge for settings import-export.","IDD":[{"?":"Strict zod validation before touching the DB; duplicates by primary key are skipped."},{"?":"Rewards are restored as-is (they are already final or active records)."},{"!":"entrySchema keeps activeHabitCount optional so v1 backups import; merge defaults it to 0 (scoring falls back to checked length)"}],"A":[{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"zod"},{"?":"lib/db/schema.ts"},{"?":"lib/db/repository.ts is NOT used here - direct db writes in one transaction"}],"E":[{"!!":"tests/exportImport.test.ts"},{"?":"Never partially import: wrap merge in db.transaction"}]} */
import { z } from "zod";
import { db, type DayEntry, type Habit, type RewardRecord } from "@/lib/db/schema";

const checklistItemSchema = z.object({ text: z.string(), done: z.boolean() });

const entrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  work: z.string(), health: z.string(), weather: z.array(z.string()),
  stepsTier: z.number().int().min(0).max(6),
  workouts: z.array(z.string()),
  screenTimeTier: z.number().int().min(0).max(7),
  readingTier: z.number().int().min(0).max(6),
  sleptAt: z.string(), wokeAt: z.string(), mood: z.string(),
  highlight: z.string(), improve: z.string(), grateful: z.string(),
  todayTasks: z.array(checklistItemSchema),
  tomorrowPlan: z.array(z.string()),
  bucketList: z.string().nullable(),
  habitsChecked: z.array(z.string()),
  activeHabitCount: z.number().optional(),
  createdAt: z.number(), updatedAt: z.number(),
});

const habitSchema = z.object({
  id: z.string(), name: z.string(),
  startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

const rewardSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  text: z.string().nullable(),
  status: z.enum(["pending", "active", "earned", "missed", "claimed"]),
  score: z.number().optional(), maxPossible: z.number().optional(), ratio: z.number().optional(),
});

const backupSchema = z.object({
  app: z.literal("day-drop"),
  version: z.number(),
  exportedAt: z.string(),
  entries: z.array(entrySchema),
  habits: z.array(habitSchema),
  rewards: z.array(rewardSchema),
});

export type BackupFile = z.infer<typeof backupSchema>;

export function buildBackup(
  entries: DayEntry[], habits: Habit[], rewards: RewardRecord[],
): BackupFile {
  return {
    app: "day-drop", version: 1, exportedAt: new Date().toISOString(),
    entries, habits, rewards,
  };
}

export function parseBackup(json: string):
  { ok: true; data: BackupFile } | { ok: false; error: string } {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return { ok: false, error: "Not valid JSON" }; }
  const parsed = backupSchema.safeParse(raw);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "Unrecognized backup format" };
}

export async function mergeBackup(data: BackupFile) {
  let importedEntries = 0, skippedEntries = 0, importedHabits = 0, importedRewards = 0;
  await db.transaction("rw", db.entries, db.habits, db.meta, async () => {
    for (const e of data.entries) {
      if (await db.entries.get(e.date)) skippedEntries++;
      else { await db.entries.put({ ...e, activeHabitCount: e.activeHabitCount ?? 0 }); importedEntries++; }
    }
    for (const h of data.habits) {
      if (!(await db.habits.get(h.id))) { await db.habits.put(h); importedHabits++; }
    }
    for (const r of data.rewards) {
      const key = `reward:${r.month}`;
      if (!(await db.meta.get(key))) { await db.meta.put({ key, value: r }); importedRewards++; }
    }
  });
  return { importedEntries, skippedEntries, importedHabits, importedRewards };
}
