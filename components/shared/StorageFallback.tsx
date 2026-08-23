/* AI-CONTEXT-NOTE:{"R":"Full-screen fallback rendered when IndexedDB is unavailable (private-mode edge cases).","IDD":[{"?":"Probes window.indexedDB existence only - Dexie opens lazily later."}],"A":[{"!":"app/layout.tsx gates all page content behind this check"}],"AB":[],"E":[{"?":"Must render even without any DB"}]} */
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
