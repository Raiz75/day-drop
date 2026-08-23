/* AI-CONTEXT-NOTE:{"R":"Dexie database definition and ALL persisted types for DayDrop.","IDD":[{"?":"date 'YYYY-MM-DD' is the entries primary key -> one entry per day."},{"?":"Meta rows are namespaced single-key documents: draft, reward:YYYY-MM, celebrated:<habitId>."},{"?":"Versioned additive migrations only; never edit an existing store shape in place."}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"repository is the ONLY writer; hooks read via useLiveQuery"},{"?":"lib/scoring.ts consumes DayEntry"},{"?":"components/journal/** consume StepId-typed fields"}],"AB":[{"?":"dexie"},{"?":"uuid"}],"E":[{"!!":"tests/schema.test.ts"},{"!!":"npm run build"}]} */
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
  createdAt: number;
  updatedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  startedOn: string;
  archivedAt: string | null;
}

export type RewardStatus = "pending" | "active" | "earned" | "missed" | "claimed";

export interface RewardRecord {
  month: string;
  text: string | null;
  status: RewardStatus;
  score?: number;
  maxPossible?: number;
  ratio?: number;
}

export interface JournalDraft {
  date: string;
  stepIndex: number;
  answers: Partial<DayEntry>;
}

export interface MetaRow { key: string; value: unknown }

export const DRAFT_KEY = "journal-draft";
export function rewardKey(month: string): string { return `reward:${month}`; }
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
  }
}

export const db = new DayDropDB();

export function newId(): string {
  return uuidv4();
}
