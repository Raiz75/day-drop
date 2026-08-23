/* AI-CONTEXT-NOTE:{"R":"Monthly reward banner: CTA when unset, progress bar while active (score vs 0.8*maxSoFar), celebratory card with Claim button once earned/claimed.","IDD":[{"?":"score = sum of scoreEntry totals for monthEntries; maxSoFar = daysWithEntries*70; target = 0.8*maxSoFar."},{"?":"Claim button only on status 'earned'; calls repository.claimReward fire-and-forget - useMetaValue live query re-renders to claimed."},{"?":"No record OR text null => settings CTA; missed renders subdued text card; pending falls through to text card."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes current-month entries + useMetaValue(rewardKey(month)) result"},{"?":"tests/dashboard-view.test.ts pins earned-state copy + Claim button"},{"?":"app/settings/page.tsx is the CTA link target"}],"AB":[{"!":"lib/scoring.ts scoreEntry/MAX_METRIC_SCORE/METRIC_COUNT","threshold changes shift the progress math"},{"?":"lib/db/repository.ts claimReward"},{"?":"lib/db/schema.ts RewardRecord"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts earned assertion"},{"?":"Progress stays 0 when maxSoFar=0 (no entries yet) - no NaN"},{"*":"Claim click must not throw when record already claimed"}]} */
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { IconGift, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MAX_METRIC_SCORE, METRIC_COUNT, scoreEntry,
} from "@/lib/scoring";
import type { DayEntry, RewardRecord } from "@/lib/db/schema";
import { claimReward } from "@/lib/db/repository";

interface Props {
  month: string;
  record: RewardRecord | undefined;
  monthEntries: DayEntry[];
}

export function RewardBanner({ month, record, monthEntries }: Props) {
  const score = useMemo(
    () => monthEntries.reduce((sum, e) => sum + scoreEntry(e).total, 0),
    [monthEntries],
  );
  const maxSoFar = monthEntries.length * MAX_METRIC_SCORE * METRIC_COUNT;
  const target = Math.round(0.8 * maxSoFar);
  const pct = target > 0 ? Math.min(100, Math.round((score / target) * 100)) : 0;

  if (!record || record.text === null) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconGift className="size-6 shrink-0 text-primary" />
            <p className="text-sm font-medium">Set your monthly reward</p>
          </div>
          <Button nativeButton={false} render={<Link href="/settings" />}>Choose</Button>
        </CardContent>
      </Card>
    );
  }

  if (record.status === "earned" || record.status === "claimed") {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <IconSparkles className="size-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-heading text-base font-semibold">reward unlocked!</p>
              <p className="truncate text-sm text-muted-foreground">{record.text}</p>
            </div>
          </div>
          {record.status === "earned" && (
            <Button onClick={() => void claimReward(month).catch(() => {})}>
              Claim reward
            </Button>
          )}
          {record.status === "claimed" && (
            <p className="text-xs text-muted-foreground">claimed - enjoy it!</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (record.status === "active") {
    return (
      <Card size="sm">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium">{record.text}</p>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {score}/{target}
            </p>
          </div>
          <Progress value={pct} aria-label={`reward progress ${score} of ${target}`} />
        </CardContent>
      </Card>
    );
  }

  // "missed"/"pending": keep the text visible without action affordances.
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <IconGift className="size-6 shrink-0 text-muted-foreground" />
        <p className="min-w-0 truncate text-sm text-muted-foreground">{record.text}</p>
      </CardContent>
    </Card>
  );
}
