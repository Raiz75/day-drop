/* AI-CONTEXT-NOTE:{"R":"Aura points banner: X/1500 progress toward next aura; ready state offers 'Reward self'. Presentational.","IDD":[{"?":"balance derived upstream via lib/scoring.pointsBalance(all entries, auraCount) - never stored"},{"?":"Copy pinned by tests: 'you can reward yourself now my dude', button 'Reward self'"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes balance/auraCount/onRedeem"},{"?":"tests/dashboard-view.test.ts pins copy + button"}],"AB":[{"?":"lib/scoring.ts AURA_COST"},{"?":"ui/card|badge|button|progress"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts"},{"*":"balance undefined (loading) renders 0-progress safely"}]} */
"use client";

import { IconGift, IconSparkles } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AURA_COST } from "@/lib/scoring";

interface Props {
  balance: number | undefined;
  auraCount: number;
  onRedeem: () => void;
}

export function RewardBanner({ balance, auraCount, onRedeem }: Props) {
  const ready = balance !== undefined && balance >= AURA_COST;
  const pct =
    balance === undefined ? 0 : Math.max(0, Math.min(100, Math.round((balance / AURA_COST) * 100)));

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {ready ? (
              <IconSparkles className="size-6 shrink-0 text-primary" />
            ) : (
              <IconGift className="size-6 shrink-0 text-primary" />
            )}
            {ready ? (
              <p className="font-heading text-base font-semibold">
                you can reward yourself now my dude
              </p>
            ) : (
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-sm font-medium tabular-nums">
                  {balance ?? 0} / {AURA_COST} pts
                </p>
                <Progress value={pct} aria-label={`aura progress ${balance ?? 0} of ${AURA_COST}`} />
              </div>
            )}
          </div>
          <Badge variant="secondary" className="h-auto shrink-0 py-1" aria-label={`aura count ${auraCount}`}>
            aura: {auraCount}
          </Badge>
        </div>
        {ready && <Button onClick={onRedeem}>Reward self</Button>}
      </CardContent>
    </Card>
  );
}
