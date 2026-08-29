/* AI-CONTEXT-NOTE:{"R":"Dexie database definition and ALL persisted types for DayDrop.","IDD":[{"?":"date 'YYYY-MM-DD' is the entries primary key -> one entry per day."},{"?":"Meta rows are namespaced single-key documents: draft, aura:<uuid>, celebrated:<habitId> (legacy reward:* rows inert)."},{"!":"v3 replaces 16-step journal fields with 4-category well-being fields (Physical, Mental, Social, Productivity). Old entries wiped."},{"?":"Versioned additive migrations only; never edit an existing store shape in place."}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"repository is the ONLY writer; hooks read via useLiveQuery"},{"?":"lib/scoring.ts consumes DayEntry"},{"?":"components/journal/** consume StepId-typed fields"}],"AB":[{"?":"dexie"},{"?":"uuid"}],"E":[{"!!":"tests/schema.test.ts"},{"!!":"npm run build"},{"*":"version(3) stores identical to version(2) - schema change only, no index change"}]} */
import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

export interface ChecklistItem { text: string; done: boolean }

export interface DayEntry {
  date: string;
  // Physical Well-being
  sleepDuration: number;
  exercise: string;
  nutrition: string[];
  hydration: number;
  timeOutdoor: number;
  physicalFeeling: string;
  // Mental & Emotional
  moodCheck: string;
  reading: string;
  highlights: string;
  couldHaveBeenBetter: string;
  storyOfTheDay: string | null;
  // Relationship Well-being
  familyTime: boolean;
  conversations: boolean;
  kindnessActs: boolean;
  connectionStatus: string;
  // Work & Productivity
  learnedToday: string;
  tasksFinished: string;
  deepWorkHours: number;
  workFeeling: string;
  // Habits (unchanged)
  habitsChecked: string[];
  activeHabitCount: number;
  // Meta
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
    this.version(3).stores({
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
