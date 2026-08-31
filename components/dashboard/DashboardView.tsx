/* AI-CONTEXT-NOTE:{"R":"Dashboard orchestrator: greeting + flame streak chip, aura banner, heatmap calendar, streak chips, 30-day trend, daily tasks checklist, DayDetailSheet for picked days, Fab + JournalWizard mount, BottomNav.","IDD":[{"?":"balance = pointsBalance(all entries, auraCount) recomputed live - never stored"},{"?":"ALL hooks run before the storage early-returns to keep hook order stable."},{"?":"Picked heatmap day opens DayDetailSheet only when that day's entry exists."},{"?":"SW registration effect mounts here in production only; public/sw.js + public/manifest.webmanifest back it."},{"?":"Early-returns StorageUnavailable when IndexedDB is blocked; null (still hydrating) renders nothing."},{"?":"DailyTasksChecklist reads tasksForToday/tasksChecked from today's entry; onToggle calls updateEntry."}],"A":[{"!!!":"components/dashboard/RewardBanner.tsx","CRITICAL":"consumes balance/auraCount/onRedeem this view computes"},{"?":"app/page.tsx"},{"?":"HeatmapCalendar/StreakChips/TrendChart/DailyTasksChecklist/DayDetailSheet"}],"AB":[{"?":"lib/hooks/useEntries.ts + useAura.ts"},{"?":"lib/db/repository.ts redeemAura, updateEntry"},{"?":"lib/scoring.ts pointsBalance"},{"?":"lib/streaks.ts allStreaks"},{"?":"components/journal/JournalWizard.tsx"},{"?":"components/shared/BottomNav.tsx fixed height dictates pb-20 shell padding"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"},{"!!":"npm run build"},{"?":"Manual smoke: submit entry -> banner X/1000 grows; at 1000 'Reward self' -> +1 aura toast"}]} */
"use client";

import { useEffect, useMemo, useState } from "react";
import { IconFlame } from "@tabler/icons-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Fab } from "@/components/shared/Fab";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { StorageUnavailable } from "@/components/shared/StorageFallback";
import { JournalWizard } from "@/components/journal/JournalWizard";
import { RewardBanner } from "./RewardBanner";
import { HeatmapCalendar } from "./HeatmapCalendar";
import { StreakChips, type Streaks } from "./StreakChips";
import { TrendChart } from "./TrendChart";
import { DailyTasksChecklist } from "./DailyTasksChecklist";
import { DayDetailSheet } from "./DayDetailSheet";
import { todayStr, fromStr } from "@/lib/format";
import { redeemAura, updateEntry } from "@/lib/db/repository";
import { useEntries } from "@/lib/hooks/useEntries";
import { useAuraRecords } from "@/lib/hooks/useAura";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";
import { allStreaks } from "@/lib/streaks";
import { pointsBalance } from "@/lib/scoring";

const ZERO_STREAKS = {
  journal: 0, physical: 0, mental: 0, social: 0, productivity: 0,
} as const satisfies Streaks;

export function DashboardView() {
  const storage = useStorageAvailable();
  const entries = useEntries();
  const auraRecords = useAuraRecords();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const today = todayStr();

  const streaks = useMemo<Streaks>(
    () => (entries ? allStreaks(entries, today) : ZERO_STREAKS),
    [entries, today],
  );

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const list = entries ?? [];
  const auraCount = auraRecords?.length ?? 0;
  const balance = entries ? pointsBalance(list, auraCount) : undefined;
  const handleRedeem = () => {
    void redeemAura()
      .then(() => toast.success("+1 aura"))
      .catch(() => {});
  };
  const pickedEntry = pickedDate
    ? list.find((e) => e.date === pickedDate) ?? null
    : null;
  const todayEntry = list.find((e) => e.date === today);
  const tasksForToday = todayEntry?.tasksForToday ?? [];
  const tasksChecked = todayEntry?.tasksChecked ?? [];
  const handleTaskToggle = (task: string) => {
    if (!todayEntry) return;
    const next = tasksChecked.includes(task)
      ? tasksChecked.filter((t) => t !== task)
      : [...tasksChecked, task];
    void updateEntry(today, { tasksChecked: next }).catch(() => {});
  };
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
  }).format(fromStr(today));

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="DayDrop" />
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-4 pb-20">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">{dateLine}</h2>
          <Badge variant="secondary" className="h-auto shrink-0 gap-1 py-1" aria-label={`journal streak ${streaks.journal}`}>
            <IconFlame className={streaks.journal > 0 ? "size-3.5 text-primary" : "size-3.5"} />
            <span className="tabular-nums">{streaks.journal}</span>
          </Badge>
        </div>
        <RewardBanner balance={balance} auraCount={auraCount} onRedeem={handleRedeem} />
        <HeatmapCalendar entries={list} onPickDay={setPickedDate} />
        <StreakChips streaks={streaks} />
        <TrendChart entries={list} />
        <DailyTasksChecklist tasks={tasksForToday} checked={tasksChecked} onToggle={handleTaskToggle} />
      </main>
      <Fab
        mode={list.some((e) => e.date === today) ? "edit" : "plus"}
        onClick={() => setWizardOpen(true)}
      />
      <JournalWizard open={wizardOpen} onOpenChange={setWizardOpen} onSubmitted={() => {}} />
      <DayDetailSheet
        entry={pickedEntry}
        open={pickedDate !== null && pickedEntry !== null}
        onOpenChange={(o) => {
          if (!o) setPickedDate(null);
        }}
      />
      <BottomNav />
    </div>
  );
}
