/* AI-CONTEXT-NOTE:{"R":"Habits manager view: Active rows (day N/100 badge + thin progress + edit/delete), Solidified archive list, floating add button, delete-confirm dialog.","IDD":[{"?":"ALL hooks run before the storage early-returns to keep hook order stable"},{"?":"Active sorted oldest startedOn first; Solidified sorted most recent archivedAt first"},{"?":"day N = clamp(diffDays(today,startedOn)+1, 1, 100) - mirrors wizard step 16"},{"?":"Thin bar via arbitrary-variant override of shared Progress (no ui/ change)"},{"?":"Delete only removes the habit row; past entries keep the habit id by design"}],"A":[{"!!!":"app/habits/page.tsx","CRITICAL":"renders this view as the whole route"},{"?":"components/habits/HabitDialog.tsx"},{"?":"components/shared/BottomNav.tsx fixed height dictates pb-20 shell padding"}],"AB":[{"?":"lib/hooks/useHabits.ts live queries"},{"?":"lib/db/repository.ts deleteHabit"},{"?":"lib/format.ts diffDays/todayStr/fromStr"},{"?":"lib/hooks/useHydrated.ts useStorageAvailable"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Manual smoke: add/rename/delete flows; empty state text; solidified completion dates"}]} */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/shared/BottomNav";
import { Header } from "@/components/shared/Header";
import { StorageUnavailable } from "@/components/shared/StorageFallback";
import type { Habit } from "@/lib/db/schema";
import { deleteHabit } from "@/lib/db/repository";
import { diffDays, fromStr, todayStr } from "@/lib/format";
import { useActiveHabits, useArchivedHabits } from "@/lib/hooks/useHabits";
import { useStorageAvailable } from "@/lib/hooks/useHydrated";
import { HabitDialog } from "./HabitDialog";

const DAY_TOTAL = 100;
const completedFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function dayOf(startedOn: string, today: string): number {
  return Math.min(Math.max(diffDays(today, startedOn) + 1, 1), DAY_TOTAL);
}

export function HabitsView() {
  const storage = useStorageAvailable();
  const activeHabits = useActiveHabits();
  const archivedHabits = useArchivedHabits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null);

  if (storage === false) return <StorageUnavailable />;
  if (storage === null) return null;

  const today = todayStr();
  const loaded = activeHabits !== undefined && archivedHabits !== undefined;
  const actives = [...(activeHabits ?? [])].sort((a, b) =>
    a.startedOn.localeCompare(b.startedOn),
  );
  const solidified = [...(archivedHabits ?? [])]
    .filter((h) => h.archivedAt !== null)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (habit: Habit) => {
    setEditing(habit);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteHabit(pendingDelete.id);
    } catch {
      toast.error("could not delete the habit - please try again");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Habits" />
      <main className="mx-auto w-full max-w-md flex-1 space-y-8 px-4 pt-4 pb-20">
        {!loaded ? (
          <p className="py-8 text-center text-sm text-muted-foreground">loading habits...</p>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-heading text-xl font-semibold">Active</h2>
              {actives.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
                  <p className="text-sm text-muted-foreground">no habits yet - add your first</p>
                  <Button onClick={openCreate}>
                    <IconPlus data-icon="inline-start" />
                    Add habit
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {actives.map((habit) => {
                    const day = dayOf(habit.startedOn, today);
                    return (
                      <li
                        key={habit.id}
                        className="rounded-2xl border border-border bg-input/30 px-4 py-3"
                      >
                        <div className="flex items-center gap-1">
                          <span className="min-w-0 flex-1 truncate text-base">{habit.name}</span>
                          <Badge variant="secondary" aria-label={`day ${day} of ${DAY_TOTAL}`}>
                            day {day}/{DAY_TOTAL}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`edit ${habit.name}`}
                            onClick={() => openEdit(habit)}
                          >
                            <IconPencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`delete ${habit.name}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(habit)}
                          >
                            <IconTrash />
                          </Button>
                        </div>
                        <Progress
                          value={day}
                          aria-label={`${habit.name} progress`}
                          className="mt-2 [&_[data-slot=progress-track]]:h-1"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            {solidified.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-heading text-xl font-semibold">Solidified</h2>
                <ul className="space-y-2">
                  {solidified.map((habit) => (
                    <li
                      key={habit.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-input/30 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 truncate text-base">{habit.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        completed{" "}
                        {habit.archivedAt ? completedFormat.format(fromStr(habit.archivedAt)) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <Button
        size="icon"
        aria-label="Add habit"
        onClick={openCreate}
        className="fixed right-4 bottom-24 z-20 h-14 w-14 rounded-full text-xl shadow-lg"
      >
        <IconPlus className="size-6" />
      </Button>
      <HabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        habit={editing}
        activeCount={actives.length}
      />
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from your active list. Past journal entries keep their record -
              they store this habit&rsquo;s id in their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}
