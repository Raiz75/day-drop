/* AI-CONTEXT-NOTE:{"R":"Settings view: aura card, scoring reference table rendered from STEPS config, JSON backup export/import (v2), About/SW card. Theme switching lives in the shared Header icon toggle.","IDD":[{"?":"ALL hooks run before the storage early-returns to keep hook order stable"},{"?":"aura balance derived via pointsBalance - display only, no writes here"},{"?":"Export data uses useLiveQuery reads directly here per task contract; writes still go through repository only"},{"?":"Scoring reference renders FROM lib/journal/steps.ts STEPS config (options points / tierScores) so docs can never drift from code"},{"?":"Export builds the backup client-side from live queries then downloads via Blob + anchor click; Import parses strictly BEFORE mergeBackup so the DB is untouched on failure"}],"A":[{"!!!":"app/settings/page.tsx","CRITICAL":"renders this view as the whole route"},{"!!!":"tests/settings-aura.test.ts","CRITICAL":"pins Aura card rendering without loading gates"},{"?":"public/sw.js","SKIP_WAITING is posted by applyUpdate in the About card"}],"AB":[{"?":"lib/hooks/useAura.ts useAuraRecords"},{"?":"lib/scoring.ts AURA_COST/pointsBalance"},{"?":"lib/exportImport.ts buildBackup/parseBackup/mergeBackup (v2 aura signature)"},{"?":"lib/db/schema.ts db reads"},{"?":"lib/journal/steps.ts STEPS config"},{"?":"lib/hooks/useServiceWorkerUpdate.ts status/checkForUpdates/applyUpdate"},{"?":"lib/version.ts APP_VERSION"}],"E":[{"!!":"npm test tests/settings-aura.test.ts"},{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Manual smoke: export downloads v2 JSON with aura array; re-import reports duplicates skipped; redemption timestamps listed newest-first"}]} */
"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import {
  IconDownload,
  IconRefresh,
  IconUpload,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BottomNav } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import { StorageUnavailable } from "@/components/shared/StorageFallback";
import { db } from "@/lib/db/schema";
import { buildBackup, mergeBackup, parseBackup } from "@/lib/exportImport";
import { todayStr } from "@/lib/format";
import { useEntries } from "@/lib/hooks/useEntries";
import { useAuraRecords } from "@/lib/hooks/useAura";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";
import { useServiceWorkerUpdate } from "@/lib/hooks/useServiceWorkerUpdate";
import { STEPS, type StepDef } from "@/lib/journal/steps";
import { APP_VERSION } from "@/lib/version";
import { AURA_COST, pointsBalance } from "@/lib/scoring";

function scoredStepPoints(step: StepDef, optionIndex: number): number | undefined {
  const option = step.options?.[optionIndex];
  if (!option) return undefined;
  return option.points ?? step.tierScores?.[optionIndex];
}

const SCORED_STEPS = STEPS.filter(
  (step) =>
    Array.isArray(step.tierScores) ||
    step.options?.some((option) => typeof option.points === "number"),
);

export function SettingsView() {
  const storage = useStorageAvailable();
  const auraRecords = useAuraRecords();
  const entries = useEntries();
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const auraRows = useLiveQuery(
    () => db.meta.filter((row) => row.key.startsWith("aura:")).toArray(),
    [],
  );
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const sw = useServiceWorkerUpdate();

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const exportReady =
    entries !== undefined && habits !== undefined && auraRows !== undefined;

  const handleExport = () => {
    if (entries === undefined || habits === undefined || auraRows === undefined) return;
    const aura = (auraRows ?? []).map((row) => ({
      id: row.key.slice("aura:".length),
      at: (row.value as { at: string }).at,
    }));
    const backup = buildBackup(entries, habits, aura);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `day-drop-backup-${todayStr()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("backup downloaded");
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      const counts = await mergeBackup(parsed.data);
      toast.success(
        `imported ${counts.importedEntries} entries, ${counts.importedHabits} habits, ${counts.importedAura} auras - ${counts.skippedEntries} duplicates skipped`,
      );
    } catch {
      toast.error("could not read that file - please try again");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Settings" />
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Aura</CardTitle>
            <CardDescription>every {AURA_COST} pts becomes one aura - collect them</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm tabular-nums">
              {entries ? pointsBalance(entries, auraRecords?.length ?? 0) : 0} / {AURA_COST} pts
            </p>
            {(auraRecords ?? []).map((record, index) => (
              <div key={`${record.at}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                <span>+1 aura</span>
                <span className="text-muted-foreground">
                  {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(record.at))}
                </span>
              </div>
            ))}
            {(auraRecords ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">no auras yet - keep dropping days</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring reference</CardTitle>
            <CardDescription>
              points each answer adds toward your daily score
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SCORED_STEPS.map((step) => (
              <div key={step.id}>
                <h3 className="text-sm font-medium">{step.question}</h3>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {step.options?.map((option, index) => {
                      const points = scoredStepPoints(step, index);
                      return (
                        <tr
                          key={option.id}
                          className="border-b border-border/60 last:border-b-0"
                        >
                          <td className="py-1 pr-3 text-muted-foreground">
                            {option.label}
                          </td>
                          <td className="py-1 text-right font-medium tabular-nums">
                            {points ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              sleep scores from your sleep hours and habits from how many you check -
              everything else is display-only and doesn&apos;t count toward your score.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data</CardTitle>
            <CardDescription>
              back up your journal or restore from a file
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={handleExport} disabled={!exportReady}>
              <IconDownload data-icon="inline-start" />
              Export backup
            </Button>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              <IconUpload data-icon="inline-start" />
              {importing ? "Importing..." : "Import backup"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleImportFile(file);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>
              DayDrop v{APP_VERSION} - local-first, your data stays on this device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sw.status === "available" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">a new version is ready</p>
                <Button size="sm" onClick={sw.applyUpdate}>
                  <IconRefresh data-icon="inline-start" />
                  Restart
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {sw.status === "checking"
                    ? "checking for updates..."
                    : "you're on the latest version"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sw.status === "checking"}
                  onClick={() => void sw.checkForUpdates()}
                >
                  Check for updates
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
}
