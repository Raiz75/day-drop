/* AI-CONTEXT-NOTE:{"R":"Read hook: all entries newest-first. READ ONLY - never write inside useLiveQuery.","IDD":[{}],"A":[{"?":"dashboard/habits/settings views"}],"AB":[{"?":"dexie-react-hooks"},{"?":"lib/db/schema.ts"}],"E":[{"!!":"never call repository fns inside the querier"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useEntries() {
  return useLiveQuery(() =>
    db.entries.orderBy("date").reverse().toArray(), []);
}
