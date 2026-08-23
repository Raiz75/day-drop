/* AI-CONTEXT-NOTE:{"R":"Simple celebratory card after submit when habits hit day-100 and were archived.","IDD":[{"?":"Shown only for non-empty archivedHabits; dismissal closes the wizard and notifies the parent"}],"A":[{"?":"components/journal/JournalWizard.tsx renders it over the overlay"}],"AB":[{"?":"lib/db/schema.ts Habit"},{"?":"components/ui/button.tsx"}],"E":[{"?":"Keep confetti-free per MVP scope"}]} */
"use client";

import type { Habit } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

export function CelebrationScreen({
  habits,
  onDismiss,
}: {
  habits: Habit[];
  onDismiss(): void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center gap-5 bg-background p-8 text-center">
      <span className="text-7xl" aria-hidden>
        🎉
      </span>
      <h2 className="font-heading text-2xl font-bold">100 days strong!</h2>
      <p className="text-sm text-muted-foreground">you solidified:</p>
      <ul className="flex w-full max-w-xs flex-col gap-2">
        {habits.map((h) => (
          <li key={h.id} className="rounded-2xl bg-muted px-4 py-3 font-medium">
            {h.name}
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={onDismiss}>
        Let&apos;s go!
      </Button>
    </div>
  );
}
