/* AI-CONTEXT-NOTE:{"R":"Horizontal scroll row of 5 metric-streak chips; all-zero renders a single 'start a streak' chip.","IDD":[{"?":"All-zero state collapses to ONE chip reading 'start a streak 0' (test pins uniqueness of that text)."},{"?":"Chip order fixed: journal, physical, mental, social, productivity."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes allStreaks() result"},{"?":"tests/dashboard-view.test.ts pins zero-state copy"}],"AB":[{"?":"lib/streaks.ts shape {journal}&Record<MetricKey,number>"},{"?":"@tabler/icons-react icon set"}],"E":[{"!!":"npm test tests/dashboard-view.test.ts zero-state assertion"},{"?":"Adding a metric means editing CHIPS + streaks.ts together"}]} */
"use client";

import {
  IconBrain, IconFlame, IconHeart, IconUsers, IconBolt,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import type { MetricKey } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type Streaks = { journal: number } & Record<MetricKey, number>;

const CHIPS: { key: keyof Streaks; label: string; Icon: typeof IconFlame }[] = [
  { key: "journal", label: "journal", Icon: IconFlame },
  { key: "physical", label: "physical", Icon: IconHeart },
  { key: "mental", label: "mental", Icon: IconBrain },
  { key: "social", label: "social", Icon: IconUsers },
  { key: "productivity", label: "productivity", Icon: IconBolt },
];

export function StreakChips({ streaks }: { streaks: Streaks }) {
  const allZero = CHIPS.every((c) => !streaks[c.key]);

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="streaks">
      {allZero ? (
        <Badge variant="secondary" className="h-auto gap-1.5 py-1 px-2.5">
          <IconFlame className="size-3.5" />
          start a streak
          <span className="tabular-nums">0</span>
        </Badge>
      ) : (
        CHIPS.map(({ key, label, Icon }) => (
          <Badge
            key={key}
            variant={streaks[key] > 0 ? "default" : "secondary"}
            className="h-auto gap-1.5 py-1 px-2.5"
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
