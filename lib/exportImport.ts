/* AI-CONTEXT-NOTE:{"R":"JSON backup build/parse/merge for settings import-export.","IDD":[{"?":"Strict zod validation before touching the DB; duplicates by primary key are skipped."},{"!":"v4 format uses new DayEntry schema with tasks/bucket list fields - v3 backups rejected as unrecognized (full-wipe decision)"},{"?":"Aura rows restore as aura:<id> meta entries; activeHabitCount defaults to 0 on import"}],"A":[{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"zod"},{"?":"lib/db/schema.ts"},{"?":"lib/db/repository.ts is NOT used here - direct db writes in one transaction"}],"E":[{"!!":"tests/exportImport.test.ts"},{"?":"Never partially import: wrap merge in db.transaction"}]} */
import { z } from "zod";
import { db, type DayEntry, type Habit } from "@/lib/db/schema";

const checklistItemSchema = z.object({ text: z.string(), done: z.boolean() });

const entrySchema = z.object({
  date: z.string(),
  sleepDuration: z.number(),
  exercise: z.string(),
  nutrition: z.array(z.string()),
  hydration: z.number(),
  timeOutdoor: z.number(),
  physicalFeeling: z.string(),
  moodCheck: z.string(),
  reading: z.string(),
  highlights: z.string(),
  couldHaveBeenBetter: z.string(),
  storyOfTheDay: z.string().nullable(),
  familyTime: z.boolean(),
  conversations: z.boolean(),
  kindnessActs: z.boolean(),
  connectionStatus: z.string(),
  learnedToday: z.string(),
  deepWorkHours: z.number(),
  workFeeling: z.string(),
  tasksForToday: z.array(z.string()),
  tasksChecked: z.array(z.string()),
  tasksForTomorrow: z.array(z.string()),
  bucketListChecked: z.array(z.string()),
  habitsChecked: z.array(z.string()),
  activeHabitCount: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const habitSchema = z.object({
  id: z.string(), name: z.string(),
  startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export interface BackupAura { id: string; at: string }

const backupSchema = z.object({
  app: z.literal("day-drop"),
  version: z.literal(4),
  exportedAt: z.string(),
  entries: z.array(entrySchema),
  habits: z.array(habitSchema),
  aura: z.array(z.object({ id: z.string(), at: z.string() })),
});

export type BackupFile = z.infer<typeof backupSchema>;

export function buildBackup(
  entries: DayEntry[], habits: Habit[], aura: BackupAura[],
): BackupFile {
  return {
    app: "day-drop", version: 4, exportedAt: new Date().toISOString(),
    entries, habits, aura,
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
  let importedEntries = 0, skippedEntries = 0, importedHabits = 0, importedAura = 0;
  await db.transaction("rw", db.entries, db.habits, db.meta, async () => {
    for (const e of data.entries) {
      if (await db.entries.get(e.date)) skippedEntries++;
      else { await db.entries.put({ ...e, activeHabitCount: e.activeHabitCount ?? 0 }); importedEntries++; }
    }
    for (const h of data.habits) {
      if (!(await db.habits.get(h.id))) { await db.habits.put(h); importedHabits++; }
    }
    for (const a of data.aura) {
      const key = `aura:${a.id}`;
      if (!(await db.meta.get(key))) { await db.meta.put({ key, value: { at: a.at } }); importedAura++; }
    }
  });
  return { importedEntries, skippedEntries, importedHabits, importedAura };
}
