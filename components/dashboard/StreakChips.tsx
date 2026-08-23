/* AI-CONTEXT-NOTE:{"R":"Horizontal scroll row of 8 metric-streak chips; all-zero renders a single 'start a streak' chip.","IDD":[{"?":"All-zero state collapses to ONE chip reading 'start a streak 0' (test pins uniqueness of that text)."},{"?":"Chip order fixed: journal, health, steps, workout, screen, reading, sleep, habits."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes allStreaks() result"},{"?":"tests/dashboard-view.test.ts pins zero-state copy"}],"AB":[{"?":"lib/streaks.ts shape {journal}&Record<MetricKey,number>"},{"?":"@tabler/icons-react icon set"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts zero-state assertion"},{"?":"Adding an 8th+ metric means editing CHIPS + streaks.ts together"}]} */
"use client";

import {
  IconBarbell, IconBed, IconBook, IconChecklist, IconDeviceMobile,
  IconFlame, IconHeart, IconRun,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import type { MetricKey } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type Streaks = { journal: number } & Record<MetricKey, number>;

const CHIPS: { key: keyof Streaks; label: string; Icon: typeof IconFlame }[] = [
  { key: "journal", label: "journal", Icon: IconFlame },
  { key: "health", label: "health", Icon: IconHeart },
  { key: "steps", label: "steps", Icon: IconRun },
  { key: "workout", label: "workout", Icon: IconBarbell },
  { key: "screenTime", label: "screen", Icon: IconDeviceMobile },
  { key: "reading", label: "reading", Icon: IconBook },
  { key: "sleep", label: "sleep", Icon: IconBed },
  { key: "habits", label: "habits", Icon: IconChecklist },
];

export function StreakChips({ streaks }: { streaks: Streaks }) {
  const allZero = CHIPS.every((c) => !streaks[c.key]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="list" aria-label="streaks">
      {allZero ? (
        <Badge variant="secondary" className="h-auto shrink-0 gap-1.5 py-1">
          <IconFlame className="size-3.5" />
          start a streak
          <span className="tabular-nums">0</span>
        </Badge>
      ) : (
        CHIPS.map(({ key, label, Icon }) => (
          <Badge
            key={key}
            variant={streaks[key] > 0 ? "default" : "secondary"}
            className={cn("h-auto shrink-0 gap-1.5 py-1")}
            role="listitem"
          >
            <Icon className="size-3.5" />
            {label}
            <span className="tabular-nums">{streaks[key]}</span>
          </Badge>
        ))
      )}
    </div>
  );
}
