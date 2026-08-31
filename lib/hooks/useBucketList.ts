/* AI-CONTEXT-NOTE:{"R":"Read hook for bucket list items for a given month. READ ONLY.","IDD":[{"?":"Bucket list items stored in meta under key bucketList:<monthKey>."}],"A":[{"?":"components/dashboard/MonthBucketList.tsx (future)"},{"?":"components/journal/steps/BucketListStep.tsx (could replace useState)"}],"AB":[{"?":"dexie-react-hooks"},{"?":"lib/db/schema.ts BucketListMonth"}],"E":[{"!!":"npm run build"},{"?":"verify hook returns empty array when meta row missing"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useBucketList(monthKey: string) {
  return useLiveQuery(async () => {
    const row = await db.meta.get(`bucketList:${monthKey}`);
    const bl = row?.value as { items: { text: string; done: boolean; doneAt: string | null }[] } | undefined;
    return bl?.items ?? [];
  }, [monthKey]);
}