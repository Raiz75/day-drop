/* AI-CONTEXT-NOTE:{"R":"Settings view: monthly reward editor, scoring reference table rendered from STEPS config, JSON backup export/import, light/dark/system theme toggle, and an About card with APP_VERSION plus service-worker update actions.","IDD":[{"?":"ALL hooks run before the storage early-returns to keep hook order stable"},{"?":"RewardEditor remounts via key={month} so the textarea prefills from the freshly loaded record - no setState-in-effect (lint rejects it)"},{"?":"Scoring reference renders FROM lib/journal/steps.ts STEPS config (options points / tierScores) so docs can never drift from code"},{"?":"Export builds the backup client-side from live queries then downloads via Blob + anchor click; Import parses strictly BEFORE mergeBackup so the DB is untouched on failure"},{"?":"Export data uses useLiveQuery reads directly here per task contract; writes still go through repository only"},{"!":"Export filters meta reward:* values through zod safeParse (rewardRowSchema) - malformed meta rows are skipped, never blind-cast"}],"A":[{"!!!":"app/settings/page.tsx","CRITICAL":"renders this view as the whole route"},{"?":"dashboard RewardBanner shows the reward text saved here"},{"?":"public/sw.js","SKIP_WAITING is posted by applyUpdate in the About card"}],"AB":[{"?":"lib/db/repository.ts setMonthlyReward"},{"?":"lib/exportImport.ts buildBackup/parseBackup/mergeBackup"},{"?":"lib/db/schema.ts rewardKey/RewardRecord/db reads"},{"?":"lib/journal/steps.ts STEPS config"},{"?":"next-themes useTheme"},{"?":"lib/hooks/useServiceWorkerUpdate.ts status/checkForUpdates/applyUpdate"},{"?":"lib/version.ts APP_VERSION (Task 17 stamp script overwrites the placeholder)"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Manual smoke: export downloads valid JSON; re-importing it reports all duplicates skipped; saving a reward reflects on the dashboard banner; theme toggle persists across reloads"}]} */
"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { z } from "zod";
import {
  IconDownload,
  IconRefresh,
  IconUpload,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BottomNav } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import { StorageUnavailable } from "@/components/shared/StorageFallback";
import {
  db,
  rewardKey,
  type RewardRecord,
  type RewardStatus,
} from "@/lib/db/schema";
import { setMonthlyReward } from "@/lib/db/repository";
import { buildBackup, mergeBackup, parseBackup } from "@/lib/exportImport";
import { monthKeyOf, todayStr } from "@/lib/format";
import { useEntries } from "@/lib/hooks/useEntries";
import { useMetaValue } from "@/lib/hooks/useMeta";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";
import { useServiceWorkerUpdate } from "@/lib/hooks/useServiceWorkerUpdate";
import { STEPS, type StepDef } from "@/lib/journal/steps";
import { APP_VERSION } from "@/lib/version";

const REWARD_BADGE: Record<
  RewardStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "pending", variant: "outline" },
  active: { label: "active", variant: "secondary" },
  earned: { label: "earned", variant: "default" },
  missed: { label: "missed", variant: "destructive" },
  claimed: { label: "claimed", variant: "outline" },
};

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

const rewardRowSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  text: z.string().nullable(),
  status: z.enum(["pending", "active", "earned", "missed", "claimed"]),
  score: z.number().optional(),
  maxPossible: z.number().optional(),
  ratio: z.number().optional(),
});

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

function RewardEditor({ month, record }: { month: string; record: RewardRecord }) {
  const [text, setText] = useState(record.text ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await setMonthlyReward(month, text.trim());
      toast.success("reward saved");
    } catch {
      toast.error("could not save the reward - please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reward-text">Your reward</Label>
        <Textarea
          id="reward-text"
          value={text}
          placeholder="what will you treat yourself to?"
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "saving..." : "Save reward"}
      </Button>
    </div>
  );
}

export function SettingsView() {
  const storage = useStorageAvailable();
  const [month, setMonth] = useState(() => monthKeyOf(todayStr()));
  const rewardRecord = useMetaValue<RewardRecord>(rewardKey(month));
  const entries = useEntries();
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  const rewardRows = useLiveQuery(
    () => db.meta.filter((row) => row.key.startsWith("reward:")).toArray(),
    [],
  );
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const sw = useServiceWorkerUpdate();
  const { theme, setTheme } = useTheme();

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const exportReady =
    entries !== undefined && habits !== undefined && rewardRows !== undefined;

  const handleMonthChange = (next: string) => {
    if (/^\d{4}-\d{2}$/.test(next)) setMonth(next);
  };

  const handleExport = () => {
    if (entries === undefined || habits === undefined || rewardRows === undefined) return;
    const rewards = rewardRows.flatMap((row) => {
      const parsed = rewardRowSchema.safeParse(row.value);
      return parsed.success ? [parsed.data] : [];
    });
    const backup = buildBackup(entries, habits, rewards);
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
        `imported ${counts.importedEntries} entries, ${counts.importedHabits} habits, ${counts.importedRewards} rewards - ${counts.skippedEntries} duplicates skipped`,
      );
    } catch {
      toast.error("could not read that file - please try again");
    } finally {
      setImporting(false);
    }
  };

  const badge = rewardRecord ? REWARD_BADGE[rewardRecord.status] : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Settings" />
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 pt-4 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Monthly reward</CardTitle>
            <CardDescription>
              pick what you get for keeping your streak alive
            </CardDescription>
            <CardAction>
              {badge ? (
                <Badge variant={badge.variant} aria-label={`reward ${badge.label}`}>
                  {badge.label}
                </Badge>
              ) : (
                <Badge variant="outline">no record</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reward-month">Month</Label>
              <Input
                id="reward-month"
                type="month"
                value={month}
                onChange={(event) => handleMonthChange(event.target.value)}
              />
            </div>
            {rewardRecord === undefined ? (
              <p className="text-sm text-muted-foreground">loading...</p>
            ) : (
              <RewardEditor key={month} month={month} record={rewardRecord} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring reference</CardTitle>
            <CardDescription>
              points each answer adds toward your monthly score
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
            <CardTitle>Appearance</CardTitle>
            <CardDescription>match the app to your vibe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2" role="group" aria-label="Theme">
              {THEME_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={theme === option.value ? "default" : "outline"}
                  aria-pressed={theme === option.value}
                  onClick={() => setTheme(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
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
