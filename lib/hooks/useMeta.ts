/* AI-CONTEXT-NOTE:{"R":"Generic reactive reader for one meta row (drafts, rewards). READ ONLY.","IDD":[{"?":"Returns undefined while loading - callers must handle pending."}],"A":[{"?":"dashboard RewardBanner reads reward:YYYY-MM rows"}],"AB":[{"?":"dexie-react-hooks"}],"E":[{"!!":"writes via lib/db/repository.ts"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";

export function useMetaValue<T>(key: string): T | undefined {
  return useLiveQuery(async () => {
    const row = await db.meta.get(key);
    return row?.value as T | undefined;
  }, [key]);
}
