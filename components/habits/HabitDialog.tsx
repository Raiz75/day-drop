/* AI-CONTEXT-NOTE:{"R":"Create/edit modal for habits: name input saves via addHabit/renameHabit; muted soft-cap warning at >=12 active habits.","IDD":[{"?":"Form lives inside DialogContent so Base UI unmounts it on close - state re-initializes per open without effects"},{"?":"Trimmed-empty name disables save; Enter submits through the form"},{"?":"Save errors toast and keep the dialog open for retry"}],"A":[{"?":"components/habits/HabitsView.tsx mounts it"},{"?":"Wizard step 16 reflects results instantly via live queries"}],"AB":[{"?":"lib/db/repository.ts addHabit/renameHabit"},{"?":"components/ui/dialog.tsx/input.tsx/label.tsx/button.tsx"},{"?":"sonner Toaster mounted in app/layout.tsx"},{"?":"react-hooks/set-state-in-effect forbids reset-via-effect"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Manual smoke: create adds a day 1/100 row; rename persists; cancel discards; >=12 actives shows the muted warning"}]} */
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Habit } from "@/lib/db/schema";
import { addHabit, renameHabit } from "@/lib/db/repository";

const SOFT_CAP = 12;
const MAX_NAME = 60;

export interface HabitDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Non-null switches the dialog into edit (rename) mode. */
  habit: Habit | null;
  activeCount: number;
}

export function HabitDialog({ open, onOpenChange, habit, activeCount }: HabitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
          <DialogDescription>
            {habit
              ? "Rename it - its history stays intact."
              : "A small daily rep you want to keep dropping."}
          </DialogDescription>
        </DialogHeader>
        <HabitForm
          key={habit?.id ?? "new"}
          habit={habit}
          activeCount={activeCount}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function HabitForm({
  habit,
  activeCount,
  onClose,
}: {
  habit: Habit | null;
  activeCount: number;
  onClose(): void;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (habit) await renameHabit(habit.id, trimmed);
      else await addHabit(trimmed);
      onClose();
    } catch {
      toast.error("could not save the habit - please try again");
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
      className="grid gap-4"
    >
      <div className="grid gap-2">
        <Label htmlFor="habit-name">Name</Label>
        <Input
          id="habit-name"
          value={name}
          maxLength={MAX_NAME}
          required
          placeholder="e.g. read 10 pages"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {activeCount >= SOFT_CAP && (
        <p className="text-xs text-muted-foreground">
          you are tracking {activeCount} active habits - consider letting some solidify before
          adding more.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSave}>
          {habit ? "Save" : "Add habit"}
        </Button>
      </DialogFooter>
    </form>
  );
}
