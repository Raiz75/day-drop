/* AI-CONTEXT-NOTE:{"R":"Full-screen fallback component each route view renders via per-view early-return (if (storage === false) return <StorageUnavailable/>) driven by useStorageAvailable's real IndexedDB probe.","IDD":[{"?":"Per-view early-return design: every view calls useStorageAvailable itself and bails to this component; this file stays dumb and keeps only a cheap window.indexedDB existence guard"},{"?":"Dexie opens lazily later - a successful probe does not guarantee the app DB opens, but covers private-mode blocks"}],"A":[{"!":"Route views (Dashboard/Tasks/Habits/Settings) early-return this component"}],"AB":[{"?":"lib/hooks/useHydrated.ts useStorageAvailable supplies the false signal"}],"E":[{"?":"Must render even without any DB"}]} */
"use client";
import { IconDatabaseOff } from "@tabler/icons-react";

export function StorageUnavailable() {
  if (typeof window === "undefined" || window.indexedDB) return null;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <IconDatabaseOff className="size-10 text-muted-foreground" />
      <p className="font-semibold">DayDrop needs local storage</p>
      <p className="text-sm text-muted-foreground">
        Your browser is blocking IndexedDB (private mode?), so DayDrop cannot save your
        journal. Disable private browsing or allow site data and reload.
      </p>
    </div>
  );
}
