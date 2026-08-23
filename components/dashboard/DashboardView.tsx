/* AI-CONTEXT-NOTE:{"R":"Dashboard orchestrator: greeting + flame streak chip, reward banner, heatmap calendar, streak chips, 30-day trend, DayDetailSheet for picked days, Fab + JournalWizard mount, BottomNav.","IDD":[{"?":"evaluateFinishedMonths runs once per app open, guarded by a ref, fire-and-forget with catch - grading past months lazily."},{"?":"Reward record read via useMetaValue(rewardKey(currentMonth)); month score/count derived from current-month entries inside RewardBanner."},{"?":"ALL hooks run before the storage early-returns to keep hook order stable."},{"?":"Picked heatmap day opens DayDetailSheet only when that day's entry exists."},{"?":"SW registration mounts here in production (PWA task)."},{"?":"Early-returns StorageUnavailable when IndexedDB is blocked; null (still hydrating) renders nothing."}],"A":[{"!!!":"components/dashboard/RewardBanner.tsx","CRITICAL":"consumes monthEntries + rewardRecord this view computes"},{"?":"app/page.tsx"},{"?":"HeatmapCalendar/StreakChips/TrendChart/DayDetailSheet"}],"AB":[{"?":"lib/hooks/useEntries.ts + useMeta.ts"},{"?":"lib/db/repository.ts evaluateFinishedMonths"},{"?":"lib/streaks.ts allStreaks"},{"?":"lib/db/schema.ts rewardKey/RewardRecord"},{"?":"components/journal/JournalWizard.tsx"},{"?":"components/shared/BottomNav.tsx fixed height dictates pb-20 shell padding"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"},{"!!":"npm run build"},{"?":"Manual smoke: submit entry -> flame=1, heatmap today colored, chips populated, trend point, tap today opens sheet; pencil FAB prefills wizard"}]} */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconFlame } from "@tabler/icons-react";
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
import { DayDetailSheet } from "./DayDetailSheet";
import { todayStr, fromStr, monthKeyOf } from "@/lib/format";
import {
  evaluateFinishedMonths,
} from "@/lib/db/repository";
import { useEntries } from "@/lib/hooks/useEntries";
import { useMetaValue } from "@/lib/hooks/useMeta";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";
import { allStreaks } from "@/lib/streaks";
import { rewardKey, type RewardRecord } from "@/lib/db/schema";

const ZERO_STREAKS = {
  journal: 0, health: 0, steps: 0, workout: 0,
  screenTime: 0, reading: 0, sleep: 0, habits: 0,
} as const satisfies Streaks;

export function DashboardView() {
  const storage = useStorageAvailable();
  const entries = useEntries();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const evaluated = useRef(false);

  useEffect(() => {
    if (evaluated.current) return;
    evaluated.current = true;
    void evaluateFinishedMonths(todayStr()).catch(() => {});
  }, []);

  const today = todayStr();
  const month = monthKeyOf(today);
  const rewardRecord = useMetaValue<RewardRecord>(rewardKey(month));

  const streaks = useMemo<Streaks>(
    () => (entries ? allStreaks(entries, today) : ZERO_STREAKS),
    [entries, today],
  );

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const list = entries ?? [];
  const monthEntries = list.filter((e) => monthKeyOf(e.date) === month);
  const pickedEntry = pickedDate
    ? list.find((e) => e.date === pickedDate) ?? null
    : null;
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
        <RewardBanner month={month} record={rewardRecord} monthEntries={monthEntries} />
        <HeatmapCalendar entries={list} onPickDay={setPickedDate} />
        <StreakChips streaks={streaks} />
        <TrendChart entries={list} />
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
