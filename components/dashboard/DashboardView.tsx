/* AI-CONTEXT-NOTE:{"R":"Dashboard orchestrator: greeting, reward banner, heatmap, streak chips, trend chart, Fab + JournalWizard mount.","IDD":[{"?":"Fab switches to edit mode when today's entry exists."},{"?":"SW registration mounts here in production (PWA task)."},{"?":"Early-returns StorageUnavailable when IndexedDB is blocked; null (still hydrating) renders nothing."}],"A":[{"?":"app/page.tsx"}],"AB":[{"?":"lib/hooks/useEntries.ts"},{"?":"components/journal/JournalWizard.tsx"},{"?":"dashboard sub-components (later tasks)"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { useState } from "react";
import { Fab } from "@/components/shared/Fab";
import { Header } from "@/components/shared/Header";
import { StorageUnavailable } from "@/components/shared/StorageFallback";
import { JournalWizard } from "@/components/journal/JournalWizard";
import { todayStr } from "@/lib/format";
import { useEntries } from "@/lib/hooks/useEntries";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";

// Minimal version for this task: Header + main + Fab + JournalWizard.
// Task 14 fills the sections between header and fab.
export function DashboardView() {
  const storage = useStorageAvailable();
  const entries = useEntries();
  const [wizardOpen, setWizardOpen] = useState(false);

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const doneToday = entries?.some((e) => e.date === todayStr()) ?? false;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="DayDrop" />
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-20">
        {/* TASK 14 MOUNT POINT: greeting, reward banner, heatmap, streak chips, trend chart */}
      </main>
      <Fab mode={doneToday ? "edit" : "plus"} onClick={() => setWizardOpen(true)} />
      {/* onSubmitted is a no-op until Task 14's reward banner lands; useEntries() already
          re-renders reactively so the Fab flips plus -> edit after a submit. */}
      <JournalWizard open={wizardOpen} onOpenChange={setWizardOpen} onSubmitted={() => {}} />
    </div>
  );
}
