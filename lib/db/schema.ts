/* AI-CONTEXT-NOTE:{"R":"Dexie database definition and ALL persisted types for DayDrop.","IDD":[{"?":"date 'YYYY-MM-DD' is the entries primary key -> one entry per day."},{"?":"Meta rows are namespaced single-key documents: draft, aura:<uuid>, celebrated:<habitId> (legacy reward:* rows inert)."},{"!":"v2 adds DayEntry.activeHabitCount snapshot (active habits at submit time); v1 rows lack the field and habit scoring falls back to checked length"},{"?":"Versioned additive migrations only; never edit an existing store shape in place."}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"repository is the ONLY writer; hooks read via useLiveQuery"},{"?":"lib/scoring.ts consumes DayEntry"},{"?":"components/journal/** consume StepId-typed fields"}],"AB":[{"?":"dexie"},{"?":"uuid"}],"E":[{"!!":"tests/schema.test.ts"},{"!!":"npm run build"},{"*":"version(2) stores strings must stay identical to version(1) - identical declaration = no-op upgrade"}]} */
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

export interface ChecklistItem { text: string; done: boolean }

export interface DayEntry {
  date: string;
  work: string;
  health: string;
  weather: string[];
  stepsTier: number;
  workouts: string[];
  screenTimeTier: number;
  readingTier: number;
  sleptAt: string;
  wokeAt: string;
  mood: string;
  highlight: string;
  improve: string;
  grateful: string;
  todayTasks: ChecklistItem[];
  tomorrowPlan: string[];
  bucketList: string | null;
  habitsChecked: string[];
  activeHabitCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  startedOn: string;
  archivedAt: string | null;
}

export interface AuraRecord {
  at: string;
}

export interface JournalDraft {
  date: string;
  stepIndex: number;
  answers: Partial<DayEntry>;
}

export interface MetaRow { key: string; value: unknown }

export const DRAFT_KEY = "journal-draft";
export function auraKey(id: string): string { return `aura:${id}`; }
export function celebratedKey(habitId: string): string { return `celebrated:${habitId}`; }

export class DayDropDB extends Dexie {
  entries!: Table<DayEntry, string>;
  habits!: Table<Habit, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("day-drop");
    this.version(1).stores({
      entries: "date",
      habits: "id, archivedAt, startedOn",
      meta: "key",
    });
    this.version(2).stores({
      entries: "date",
      habits: "id, archivedAt, startedOn",
      meta: "key",
    });
  }
}

export const db = new DayDropDB();

export function newId(): string {
  return uuidv4();
}
