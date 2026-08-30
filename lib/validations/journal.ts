/* AI-CONTEXT-NOTE:{"R":"zod-backed validation for each wizard step AND full DayEntry schema; wizard Next button gates on validateStep, exportImport uses dayEntrySchema.","IDD":[{"?":"Dispatches on StepDef.type; option id membership comes live from STEPS config."},{"!":"dayEntrySchema matches DayEntry in lib/db/schema.ts exactly."},{"?":"Optional text steps (storyOfTheDay) allow empty and normalize to null upstream."}],"A":[{"?":"components/journal/JournalWizard.tsx canAdvance"},{"!!":"lib/exportImport.ts full-entry validation"}],"AB":[{"?":"zod"},{"?":"lib/journal/steps.ts"},{"?":"lib/db/schema.ts DayEntry"}],"E":[{"!!":"tests/validations-journal.test.ts"},{"!!":"npm run build"}]} */
import { z } from "zod";
import type { StepDef } from "@/lib/journal/steps";

export function validateStep(
  step: StepDef,
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  switch (step.type) {
    case "radio":
    case "tier-radio": {
      const ids = (step.options ?? []).map((o) => o.id);
      const schema = z.enum(ids as [string, ...string[]]);
      const r = schema.safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "pick one to continue" };
    }
    case "checkbox": {
      const ids = new Set((step.options ?? []).map((o) => o.id));
      const r = z.array(z.string()).safeParse(value);
      if (!r.success || !r.data.every((id) => ids.has(id))) {
        return { ok: false, error: "invalid selection" };
      }
      return { ok: true };
    }
    case "text": {
      const raw = typeof value === "string" ? value.trim() : "";
      if (step.optional && raw === "") return { ok: true };
      const min = step.minChars ?? 0;
      return raw.length >= min ? { ok: true } : { ok: false, error: `write at least ${min} characters` };
    }
    case "habits": {
      const r = z.array(z.string().min(1)).safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "invalid habit list" };
    }
  }
}

export const dayEntrySchema = z.object({
  date: z.string(),
  // Physical Well-being
  sleepDuration: z.number().int().min(0).max(5),
  exercise: z.enum(["light", "medium", "heavy"]),
  nutrition: z.array(z.enum(["meat", "vegetables", "fruit"])).min(1),
  hydration: z.number().int().min(0).max(3),
  timeOutdoor: z.number().int().min(0).max(3),
  physicalFeeling: z.enum(["unwell", "okay", "healthy", "energetic"]),
  // Mental & Emotional
  moodCheck: z.enum(["happy", "energetic", "okay", "bored", "tired", "anxious", "sad", "angry", "lonely"]),
  reading: z.enum(["none", "a-bit", "decent", "a-lot", "on-a-roll", "bookworm"]),
  highlights: z.string().min(50),
  couldHaveBeenBetter: z.string().min(50),
  storyOfTheDay: z.string().nullable(),
  // Relationship Well-being
  familyTime: z.boolean(),
  conversations: z.boolean(),
  kindnessActs: z.boolean(),
  connectionStatus: z.enum(["connected", "neutral", "lonely"]),
  // Work & Productivity
  learnedToday: z.string().min(20),
  tasksFinished: z.string().min(20),
  deepWorkHours: z.number().int().min(0).max(4),
  workFeeling: z.enum(["focused", "scattered", "productive", "drained"]),
  // Habits
  habitsChecked: z.array(z.string()),
  activeHabitCount: z.number().int().min(0),
  // Meta
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type DayEntryInput = z.infer<typeof dayEntrySchema>;