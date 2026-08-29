/* AI-CONTEXT-NOTE:{"R":"LineChart of the last 30 days' daily score totals inside shadcn ChartContainer, single chart-1 series with gaps for missing days.","IDD":[{"?":"Missing days are null values + connectNulls={false} so the line breaks instead of faking data."},{"?":"X axis shows day-of-month only; Y domain fixed 0..70 (max daily total) and hidden for mobile space."},{"?":"Series color flows through ChartConfig color var(--chart-1) -> ChartStyle --color-total."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes all entries"},{"?":"components/ui/chart.tsx ChartContainer/ChartTooltipContent"}],"AB":[{"!":"lib/scoring.ts scoreEntry totals"},{"?":"recharts v3 LineChart API"}],"E":[{"!!":"npm run build (recharts SSR-safe: component is client-only)"},{"*":"Empty entries render an empty flat line area, never a crash"}]} */
"use client";

import { useMemo } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import type { DayEntry } from "@/lib/db/schema";
import { addDays, todayStr } from "@/lib/format";
import { scoreEntry } from "@/lib/scoring";

const config = {
  physical: { label: "physical", color: "var(--chart-1)" },
  mental: { label: "mental", color: "var(--chart-2)" },
  social: { label: "social", color: "var(--chart-3)" },
  productivity: { label: "productivity", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function TrendChart({ entries }: { entries: DayEntry[] }) {
  const data = useMemo(() => {
    const metrics = new Map(
      entries.map((e) => {
        const s = scoreEntry(e);
        return [e.date, { physical: s.physical, mental: s.mental, social: s.social, productivity: s.productivity }];
      }),
    );
    const today = todayStr();
    return Array.from({ length: 30 }, (_, i) => {
      const date = addDays(today, -29 + i);
      const m = metrics.get(date);
      return {
        day: date.slice(8),
        physical: m?.physical ?? null,
        mental: m?.mental ?? null,
        social: m?.social ?? null,
        productivity: m?.productivity ?? null,
      };
    });
  }, [entries]);

  return (
    <section aria-label="last 30 days trend">
      <h3 className="mb-2 font-heading text-sm font-semibold">last 30 days</h3>
      <ChartContainer config={config} className="h-36 w-full">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis domain={[0, 70]} hide />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Line
            type="monotone"
            dataKey="physical"
            stroke="var(--color-physical)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="mental"
            stroke="var(--color-mental)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="social"
            stroke="var(--color-social)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="productivity"
            stroke="var(--color-productivity)"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}
