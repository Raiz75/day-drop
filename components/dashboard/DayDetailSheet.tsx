/* AI-CONTEXT-NOTE:{"R":"Bottom sheet readout of one journal entry: mood title, physical feeling, tier labels, text quotes, task checks, habit list (unknown ids => '(removed habit)'), tasks & bucket list.","IDD":[{"?":"Habit-name resolution needs active+archived habits; hooks live in inner SheetBody so they only run while the sheet is open."},{"?":"optionLabel throws on unknown ids - safeLabel/tierLabel wrap it with fallbacks so corrupt entries never crash the sheet."},{"!":"tasksForToday is the full list of tasks; tasksChecked holds the ones the user checked off."},{"?":"bucketListChecked is a flat array of completed bucket list item texts."},{"!":"Uses scoreEntry for daily score display; mood emoji mapped from moodCheck option id."}],"A":[{"!!!":"components/dashboard/DashboardView.tsx","CRITICAL":"sole consumer - passes picked entry + open state"},{"?":"components/ui/sheet.tsx bottom side"}],"AB":[{"!":"lib/journal/steps.ts optionLabel/stepById","renaming an option id changes readout fallbacks"},{"?":"lib/hooks/useHabits active+archived lists"},{"?":"lib/db/schema.ts DayEntry"},{"?":"lib/scoring.ts scoreEntry"}],"E":[{"!!":"npm run build"},{"?":"Empty-string fields must render nothing, not throw"},{"*":"Removed habit ids fall back to '(removed habit)'"}]} */
"use client";

import type { ComponentType } from "react";
import {
  IconCheck, IconQuote, IconX, IconMoodHappy, IconMoodSmile,
  IconMoodSad, IconMoodAngry, IconMoodNervous, IconMoodMinus, IconMoodUnamused,
  IconMoodCry, IconMoodKid, IconFlame, IconHeart, IconBrain, IconBolt,
  IconBed, IconDroplet, IconTree, IconClock, IconRun, IconBook,
  IconStar, IconTarget,
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
import { scoreEntry } from "@/lib/scoring";

interface Props {
  entry: DayEntry | null;
  open: boolean;
  onOpenChange(open: boolean): void;
}

const MOOD_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  happy: IconMoodHappy,
  energetic: IconMoodKid,
  okay: IconMoodSmile,
  bored: IconMoodMinus,
  tired: IconMoodUnamused,
  anxious: IconMoodNervous,
  sad: IconMoodSad,
  angry: IconMoodAngry,
  lonely: IconMoodCry,
};

const MOOD_COLORS: Record<string, string> = {
  happy: "text-amber-500",
  energetic: "text-orange-500",
  okay: "text-emerald-500",
  bored: "text-slate-400",
  tired: "text-indigo-400",
  anxious: "text-rose-400",
  sad: "text-blue-400",
  angry: "text-red-500",
  lonely: "text-purple-400",
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
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
        {entry && <SheetBody entry={entry} />}
      </SheetContent>
    </Sheet>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-accent/30 p-4 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, label, color = "text-primary" }: { icon: ComponentType<{ className?: string }>; label: string; color?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className={`size-4 ${color}`} />
      <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function SheetBody({ entry }: { entry: DayEntry }) {
  const actives = useActiveHabits() ?? [];
  const archived = useArchivedHabits() ?? [];
  const names = new Map([...actives, ...archived].map((h) => [h.id, h.name]));
  const dateLine = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric",
  }).format(fromStr(entry.date));

  const scores = scoreEntry(entry);
  const MoodIcon = MOOD_ICONS[entry.moodCheck] ?? IconMoodSmile;
  const moodColor = MOOD_COLORS[entry.moodCheck] ?? "text-muted-foreground";

  const reflections: [string, string, ComponentType<{ className?: string }>[]][] = [
    ["highlight", entry.highlights, [IconStar]],
    ["could be better", entry.couldHaveBeenBetter, [IconTarget]],
    ["story", entry.storyOfTheDay ?? "", [IconBook]],
  ];

  return (
    <div className="flex flex-col gap-4 px-5 pb-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pr-10">
        <div className="flex items-center gap-3">
          <div className={`flex size-12 items-center justify-center rounded-2xl bg-accent/50 ${moodColor}`}>
            <MoodIcon className="size-6" />
          </div>
          <div>
            <SheetHeader className="p-0">
              <SheetTitle className="text-lg">
                {safeLabel("moodCheck", entry.moodCheck) || "journal entry"}
              </SheetTitle>
              <SheetDescription>{dateLine}</SheetDescription>
            </SheetHeader>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-2xl bg-primary/10 px-3 py-2">
          <IconFlame className="size-4 text-primary" />
          <span className="text-sm font-bold tabular-nums text-primary">{scores.total}</span>
          <span className="text-[10px] text-muted-foreground">/40</span>
        </div>
      </div>

      {/* Quick Stats & Daily Metrics */}
      <SectionCard>
        <SectionHeader icon={IconFlame} label="Daily Overview" color="text-primary" />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconBed className="size-4 shrink-0 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">sleep</span>
              <span className="text-xs font-medium">{tierLabel("sleepDuration", entry.sleepDuration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconRun className="size-4 shrink-0 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">exercise</span>
              <span className="text-xs font-medium">{safeLabel("exercise", entry.exercise)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconDroplet className="size-4 shrink-0 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">hydration</span>
              <span className="text-xs font-medium">{tierLabel("hydration", entry.hydration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconMoodSmile className="size-4 shrink-0 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">body feels</span>
              <span className="text-xs font-medium">{safeLabel("physicalFeeling", entry.physicalFeeling)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconTree className="size-4 shrink-0 text-green-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">outdoor</span>
              <span className="text-xs font-medium">{tierLabel("timeOutdoor", entry.timeOutdoor)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconClock className="size-4 shrink-0 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">deep work</span>
              <span className="text-xs font-medium">{tierLabel("deepWorkHours", entry.deepWorkHours)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconBolt className="size-4 shrink-0 text-sky-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">work felt</span>
              <span className="text-xs font-medium">{safeLabel("workFeeling", entry.workFeeling)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-background/60 p-2.5">
            <IconHeart className="size-4 shrink-0 text-violet-500" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">connection</span>
              <span className="text-xs font-medium">{safeLabel("connectionStatus", entry.connectionStatus)}</span>
            </div>
          </div>
        </div>
        {entry.nutrition.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.nutrition.map((id) => (
              <Badge key={id} variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {safeLabel("nutrition", id)}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entry.familyTime && (
            <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400">
              family time
            </Badge>
          )}
          {entry.conversations && (
            <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400">
              conversations
            </Badge>
          )}
          {entry.kindnessActs && (
            <Badge variant="secondary" className="bg-rose-500/10 text-rose-700 dark:text-rose-400">
              kindness
            </Badge>
          )}
        </div>
      </SectionCard>

      {/* Reflections */}
      {reflections.some(([, text]) => text) && (
        <SectionCard>
          <SectionHeader icon={IconBrain} label="Reflections" color="text-sky-500" />
          <div className="flex flex-col gap-3">
            {reflections
              .filter(([, text]) => text)
              .map(([label, text]) => (
                <blockquote key={label} className="border-l-2 border-amber-400 pl-3">
                  <IconQuote className="mb-1 size-4 text-amber-400" />
                  <p className="text-sm italic leading-relaxed">{text}</p>
                  <footer className="mt-1 text-xs text-muted-foreground">{label}</footer>
                </blockquote>
              ))}
          </div>
        </SectionCard>
      )}

      {/* Learned */}
      {entry.learnedToday && (
        <SectionCard>
          <SectionHeader icon={IconBolt} label="Learned" color="text-amber-500" />
          <p className="text-sm leading-relaxed">{entry.learnedToday}</p>
        </SectionCard>
      )}

      {/* Habits */}
      {entry.habitsChecked.length > 0 && (
        <SectionCard>
          <SectionHeader icon={IconStar} label="Habits" color="text-rose-500" />
          <ul className="flex flex-col gap-1.5">
            {entry.habitsChecked.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <IconCheck className="size-4 shrink-0 text-emerald-500" />
                {names.get(id) ?? "(removed habit)"}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Tasks */}
      {entry.tasksForToday.length > 0 && (
        <SectionCard>
          <SectionHeader icon={IconTarget} label="Tasks" color="text-primary" />
          <ul className="flex flex-col gap-1.5">
            {entry.tasksForToday.map((task) => (
              <li key={task} className="flex items-center gap-2 text-sm">
                {entry.tasksChecked.includes(task) ? (
                  <IconCheck className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <IconX className="size-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className={entry.tasksChecked.includes(task) ? "text-muted-foreground line-through" : ""}>
                  {task}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Bucket List */}
      {entry.bucketListChecked.length > 0 && (
        <SectionCard>
          <SectionHeader icon={IconHeart} label="Bucket List" color="text-rose-500" />
          <ul className="flex flex-col gap-1.5">
            {entry.bucketListChecked.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <IconCheck className="size-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
