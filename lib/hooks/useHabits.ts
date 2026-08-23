/* AI-CONTEXT-NOTE:{"R":"Read hooks for habits (active + archived lists). READ ONLY.","IDD":[{}],"A":[{"?":"components/journal/steps/HabitsStep.tsx"},{"?":"components/habits/HabitsView.tsx"}],"AB":[{"?":"dexie-react-hooks"}],"E":[{"!!":"writes go through lib/db/repository.ts"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useActiveHabits() {
  return useLiveQuery(() => db.habits.where("archivedAt").equals(null as never).toArray(), []);
}

export function useArchivedHabits() {
  return useLiveQuery(() => db.habits.filter((h) => h.archivedAt !== null).toArray(), []);
}
