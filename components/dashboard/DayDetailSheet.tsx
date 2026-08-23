/* AI-CONTEXT-NOTE:{"R":"Bottom sheet readout of one journal entry: mood title, weather icons, workout chips, sleep window, quote blocks, task checks, habit list (unknown ids => '(removed habit)'), tier labels.","IDD":[{"?":"Habit-name resolution needs active+archived habits; hooks live in inner SheetBody so they only run while the sheet is open."},{"?":"optionLabel throws on unknown ids - safeLabel/tierLabel wrap it with fallbacks so corrupt entries never crash the sheet."},{"?":"Weather option ids map to Tabler icons: hot-sunny SunHigh, sunny-clouds Sun, cloudy-gloomy Cloud, light-rain Umbrella, heavy-rain CloudRain, stormy CloudStorm."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes picked entry + open state"},{"?":"components/ui/sheet.tsx bottom side"}],"AB":[{"!":"lib/journal/steps.ts optionLabel/stepById","renaming an option id changes readout fallbacks"},{"?":"lib/hooks/useHabits active+archived lists"},{"?":"lib/db/schema.ts DayEntry"}],"E":[{"!!":"npm run build"},{"?":"Empty-string fields must render nothing, not throw"},{"*":"Removed habit ids fall back to '(removed habit)'"}]} */
"use client";

import type { ComponentType } from "react";
import {
  IconCheck, IconCloud, IconCloudRain, IconCloudStorm, IconQuote,
  IconSun, IconSunHigh, IconUmbrella, IconX,
} from "@tabler/icons-react";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { DayEntry } from "@/lib/db/schema";
import {
  useActiveHabits, useArchivedHabits,
} from "@/lib/hooks/useHabits";
import { optionLabel, stepById, type StepId } from "@/lib/journal/steps";
import { fromStr } from "@/lib/format";

interface Props {
  entry: DayEntry | null;
  open: boolean;
  onOpenChange(open: boolean): void;
}

const WEATHER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "hot-sunny": IconSunHigh,
  "sunny-clouds": IconSun,
  "cloudy-gloomy": IconCloud,
  "light-rain": IconUmbrella,
  "heavy-rain": IconCloudRain,
  "stormy": IconCloudStorm,
};

function safeLabel(stepId: StepId, optionId: string): string {
  if (!optionId) return "";
  try {
    return optionLabel(stepId, optionId);
  } catch {
    return optionId;
  }
}

function tierLabel(stepId: StepId, tier: number): string | null {
  const options = stepById(stepId).options;
  if (!options || tier < 0 || tier >= options.length) return null;
  return options[tier].label;
}

export function DayDetailSheet({ entry, open, onOpenChange }: Props) {
  return (
    <Sheet open={open && entry !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        {entry && <SheetBody entry={entry} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ entry }: { entry: DayEntry }) {
  const actives = useActiveHabits() ?? [];
  const archived = useArchivedHabits() ?? [];
  const names = new Map([...actives, ...archived].map((h) => [h.id, h.name]));
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
  }).format(fromStr(entry.date));

  const quotes: [string, string][] = [
    ["highlight", entry.highlight],
    ["grateful for", entry.grateful],
    ["could be better", entry.improve],
  ];
  const tiers: [string, StepId, number][] = [
    ["steps", "steps", entry.stepsTier],
    ["screen time", "screenTime", entry.screenTimeTier],
    ["reading", "reading", entry.readingTier],
  ];

  return (
    <div className="flex flex-col gap-5 px-6 pb-8">
      <SheetHeader className="p-0">
        <SheetTitle>{safeLabel("mood", entry.mood) || "journal entry"}</SheetTitle>
        <SheetDescription>{dateLine}</SheetDescription>
      </SheetHeader>

      {entry.weather.length > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          {entry.weather.map((id) => {
            const Icon = WEATHER_ICONS[id] ?? IconCloud;
            return <Icon key={id} className="size-5" aria-label={safeLabel("weather", id)} />;
          })}
        </div>
      )}

      {entry.workouts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.workouts.map((id) => (
            <Badge key={id} variant="secondary">{safeLabel("workout", id)}</Badge>
          ))}
        </div>
      )}

      {(entry.sleptAt || entry.wokeAt) && (
        <p className="text-sm text-muted-foreground">
          slept {entry.sleptAt || "?"} → woke {entry.wokeAt || "?"}
        </p>
      )}

      {quotes
        .filter(([, text]) => text)
        .map(([label, text]) => (
          <blockquote key={label} className="border-l-2 border-primary/40 pl-3">
            <IconQuote className="mb-1 size-4 text-primary/60" />
            <p className="text-sm italic">{text}</p>
            <footer className="mt-1 text-xs text-muted-foreground">{label}</footer>
          </blockquote>
        ))}

      {entry.todayTasks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {entry.todayTasks.map((t, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {t.done ? (
                <IconCheck className="size-4 shrink-0 text-primary" aria-label="done" />
              ) : (
                <IconX className="size-4 shrink-0 text-muted-foreground" aria-label="not done" />
              )}
              <span className={t.done ? "" : "text-muted-foreground"}>{t.text}</span>
            </li>
          ))}
        </ul>
      )}

      {entry.habitsChecked.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">habits</p>
          <ul className="flex flex-col gap-1">
            {entry.habitsChecked.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <IconCheck className="size-4 shrink-0 text-primary" />
                {names.get(id) ?? "(removed habit)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="flex flex-col gap-1.5 border-t pt-3">
        {tiers
          .map(([label, stepId, tier]) => ({ label, text: tierLabel(stepId, tier) }))
          .filter(({ text }) => text !== null)
          .map(({ label, text }) => (
            <div key={label} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm">{text}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
