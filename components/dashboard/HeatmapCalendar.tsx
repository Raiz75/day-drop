/* AI-CONTEXT-NOTE:{"R":"Month-view heatmap calendar: Monday-first grid of day cells bucketed by daily score total over 70, with month nav and pick-a-day callback.","IDD":[{"?":"Buckets: 1-17 bg-primary/20, 18-35 /40, 36-52 /65, 53-70 full; no entry = bg-muted; future days disabled."},{"?":"Monday-first offset = (fromStr(firstOfMonth).getDay()+6)%7 - all math local, no date lib."},{"?":"Only days <= today with an entry are buttons calling onPickDay(date); view month state defaults to current month."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - onPickDay feeds DayDetailSheet pickedDate"},{"?":"lib/format.ts fromStr/addDays/monthKeyOf/daysInMonth"}],"AB":[{"?":"lib/scoring.ts scoreEntry totals drive buckets"},{"?":"@tabler/icons-react chevron icons"}],"E":[{"!!":"npm run build (SSR: initial month from todayStr() must not crash server render)"},{"?":"Edge: month starting Sunday => offset 6 leading blanks"},{"*":"Next arrow must disable exactly at the real current month"}]} */
"use client";

import { useMemo, useState } from "react";
import {
  IconChevronLeft, IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { DayEntry } from "@/lib/db/schema";
import {
  addDays, daysInMonth, fromStr, monthKeyOf, todayStr,
} from "@/lib/format";
import { scoreEntry } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface Props {
  entries: DayEntry[];
  onPickDay(date: string): void;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 1));
}

export function HeatmapCalendar({ entries, onPickDay }: Props) {
  const [viewMonth, setViewMonth] = useState(() => monthKeyOf(todayStr()));

  const totals = useMemo(
    () => new Map(entries.map((e) => [e.date, scoreEntry(e).total])),
    [entries],
  );

  const today = todayStr();
  const currentMonth = monthKeyOf(today);
  const [year, monthIdx0] = [Number(viewMonth.slice(0, 4)), Number(viewMonth.slice(5, 7)) - 1];

  const cells = useMemo(() => {
    const first = `${viewMonth}-01`;
    const offset = (fromStr(first).getDay() + 6) % 7;
    const blanks = Array.from({ length: offset }, (_, i) => i);
    const days = Array.from({ length: daysInMonth(year, monthIdx0) }, (_, i) =>
      addDays(first, i));
    return { blanks, days };
  }, [viewMonth, year, monthIdx0]);

  const cellClass = (total: number | undefined, isFuture: boolean) =>
    cn(
      "flex size-full items-center justify-center rounded-md text-xs",
      isFuture && "bg-muted/40 text-muted-foreground/60",
      !isFuture && total === undefined && "bg-muted text-muted-foreground",
      !isFuture && total !== undefined &&
        (total > 52
          ? "bg-primary font-medium text-primary-foreground"
          : total > 35
            ? "bg-primary/65"
            : total > 17
              ? "bg-primary/40"
              : "bg-primary/20"),
    );

  return (
    <section aria-label="journal heatmap">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold">{monthLabel(viewMonth)}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon-xs" aria-label="Previous month"
            onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
          >
            <IconChevronLeft />
          </Button>
          <Button
            variant="ghost" size="icon-xs" aria-label="Next month"
            disabled={viewMonth === currentMonth}
            onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
          >
            <IconChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="text-center text-[10px] font-medium text-muted-foreground"
          >
            {d}
          </span>
        ))}
        {cells.blanks.map((i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {cells.days.map((date) => {
          const dayNum = Number(date.slice(8));
          const total = totals.get(date);
          const isFuture = date > today;
          const journaled = total !== undefined && !isFuture;
          return (
            <button
              key={date}
              type="button"
              disabled={!journaled}
              onClick={() => journaled && onPickDay(date)}
              aria-label={`${monthLabel(viewMonth)} ${dayNum}${journaled ? ", open entry" : ""}`}
              className={cn(cellClass(total, isFuture), journaled && "cursor-pointer")}
            >
              {dayNum}
            </button>
          );
        })}
      </div>
    </section>
  );
}
