/* AI-CONTEXT-NOTE:{"R":"Sleep step body: two Base UI selects (sleptAt 20:00-23:45, wokeAt 00:00-10:00, 15-min steps).","IDD":[{"?":"Select value uses string|null (null shows placeholder); onValueChange may deliver null"},{"?":"Writes {sleptAt, wokeAt}; validation window lives in lib/validations/journal.ts"}],"A":[{"?":"components/journal/StepRenderer.tsx dispatches sleep here"}],"AB":[{"?":"components/ui/select.tsx"},{"?":"components/ui/label.tsx"},{"?":"lib/format.ts minutesToHHmm"}],"E":[{"!!":"npm run build"}]} */
"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DayEntry } from "@/lib/db/schema";
import { minutesToHHmm } from "@/lib/format";

function slots(fromMin: number, toMin: number): string[] {
  const out: string[] = [];
  for (let m = fromMin; m <= toMin; m += 15) out.push(minutesToHHmm(m));
  return out;
}

const SLEPT = slots(20 * 60, 23 * 60 + 45);
const WOKE = slots(0, 10 * 60);

export function SleepStep({
  value,
  onChange,
}: {
  value: unknown;
  onChange(patch: Partial<DayEntry>): void;
}) {
  const v =
    typeof value === "object" && value !== null
      ? (value as { sleptAt?: unknown; wokeAt?: unknown })
      : {};
  const sleptAt = typeof v.sleptAt === "string" ? v.sleptAt : null;
  const wokeAt = typeof v.wokeAt === "string" ? v.wokeAt : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="sleptAt">slept at</Label>
          <Select
            value={sleptAt}
            onValueChange={(t) => {
              if (typeof t === "string") onChange({ sleptAt: t });
            }}
          >
            <SelectTrigger id="sleptAt" className="w-full">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {SLEPT.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="wokeAt">woke up</Label>
          <Select
            value={wokeAt}
            onValueChange={(t) => {
              if (typeof t === "string") onChange({ wokeAt: t });
            }}
          >
            <SelectTrigger id="wokeAt" className="w-full">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent>
              {WOKE.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">evening to morning window · 15-minute steps</p>
    </div>
  );
}
