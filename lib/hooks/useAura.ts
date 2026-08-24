/* AI-CONTEXT-NOTE:{"R":"Read hook for aura redemption records (meta aura:* rows). READ ONLY.","IDD":[{"?":"Returns undefined while loading; sorted newest-first by ISO 'at'."},{"!":"useMetaValue was deleted with the monthly-reward wipe - this replaces it for aura reads"}],"A":[{"?":"components/dashboard/DashboardView.tsx"},{"?":"components/settings/SettingsView.tsx"}],"AB":[{"?":"dexie-react-hooks"},{"?":"lib/db/schema.ts"}],"E":[{"!!":"writes go through lib/db/repository.ts redeemAura"}]} */
import { useLiveQuery } from "dexie-react-hooks";
import { db, type AuraRecord } from "@/lib/db/schema";

export function useAuraRecords(): AuraRecord[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.meta.filter((row) => row.key.startsWith("aura:")).toArray();
    return rows
      .map((row) => row.value as AuraRecord)
      .filter((v) => typeof v?.at === "string")
      .sort((a, b) => b.at.localeCompare(a.at));
  }, []);
}
