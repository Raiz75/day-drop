/* AI-CONTEXT-NOTE:{"R":"zod-backed validation for each wizard step; wizard Next button gates on validateStep.","IDD":[{"?":"Dispatches on StepDef.type; option id membership comes live from STEPS config."},{"?":"Sleep window clamps: sleptAt 20:00-23:59, wokeAt 00:00-10:00."},{"?":"Optional text steps (bucketList) allow empty and normalize to null upstream."}],"A":[{"?":"components/journal/JournalWizard.tsx canAdvance"},{"?":"lib/exportImport.ts full-entry validation"}],"AB":[{"?":"zod"},{"?":"lib/journal/steps.ts"}],"E":[{"!!":"tests/validations-journal.test.ts"}]} */
import { z } from "zod";
import type { StepDef } from "@/lib/journal/steps";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function minuteOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

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
    case "sleep": {
      const schema = z.object({
        sleptAt: z.string().regex(HHMM).refine((t) => minuteOf(t) >= 20 * 60 && minuteOf(t) <= 23 * 60 + 59),
        wokeAt: z.string().regex(HHMM).refine((t) => minuteOf(t) <= 10 * 60),
      });
      return schema.safeParse(value).success
        ? { ok: true }
        : { ok: false, error: "pick both times (8pm - 10am)" };
    }
    case "text": {
      const raw = typeof value === "string" ? value.trim() : "";
      if (step.optional && raw === "") return { ok: true };
      const min = step.minChars ?? 0;
      return raw.length >= min ? { ok: true } : { ok: false, error: `write at least ${min} characters` };
    }
    case "tasks": {
      const r = z.array(z.object({ text: z.string().min(1), done: z.boolean() })).safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "invalid checklist" };
    }
    case "tomorrow": {
      const r = z.array(z.string().trim().min(1)).safeParse(value);
      if (!r.success || r.data.length < 1) return { ok: false, error: "add at least 1 task for tomorrow" };
      return { ok: true };
    }
    case "habits": {
      const r = z.array(z.string().min(1)).safeParse(value);
      return r.success ? { ok: true } : { ok: false, error: "invalid habit list" };
    }
  }
}
