/* AI-CONTEXT-NOTE:{"R":"Single source of truth for the 20 wizard steps across 4 categories: question copy, option ids/labels, tier scores, validation hints.","IDD":[{"?":"Option ids are stable slugs persisted in entries; labels may change freely."},{"?":"points on options feed lib/scoring.ts; tierScores are per-tier arrays."},{"?":"CATEGORIES defines the 4-category structure for the journal redesign."}],"A":[{"!!!":"lib/scoring.ts","CRITICAL":"scoring maps hard-code these option ids"},{"?":"components/journal/** renders this config"}],"AB":[],"E":[{"!!":"tests/journal-steps.test.ts"},{"?":"Changing an option id requires a data migration"}]} */

export type StepId =
  | "sleepDuration" | "exercise" | "nutrition" | "hydration" | "timeOutdoor" | "physicalFeeling"
  | "moodCheck" | "reading" | "highlights" | "couldHaveBeenBetter" | "storyOfTheDay"
  | "familyTime" | "conversations" | "kindnessActs" | "connectionStatus"
  | "learnedToday" | "tasksFinished" | "deepWorkHours" | "workFeeling"
  | "habits";

export interface StepOption { id: string; label: string; points?: number }

export interface StepDef {
  id: StepId;
  order: number;
  question: string;
  type: "radio" | "checkbox" | "tier-radio" | "text" | "habits";
  options?: StepOption[];
  tierScores?: number[];
  minChars?: number;
  optional?: boolean;
}

export interface CategoryDef {
  id: string;
  name: string;
  stepIds: StepId[];
}

export const CATEGORIES: readonly CategoryDef[] = [
  { id: "physical", name: "Physical Well-being", stepIds: ["sleepDuration", "exercise", "nutrition", "hydration", "timeOutdoor", "physicalFeeling"] },
  { id: "mental", name: "Mental & Emotional", stepIds: ["moodCheck", "reading", "highlights", "couldHaveBeenBetter", "storyOfTheDay"] },
  { id: "social", name: "Relationship Well-being", stepIds: ["familyTime", "conversations", "kindnessActs", "connectionStatus"] },
  { id: "productivity", name: "Work & Productivity", stepIds: ["learnedToday", "tasksFinished", "deepWorkHours", "workFeeling"] },
];

const opt = (id: string, label: string, points?: number): StepOption => ({ id, label, points });

export const STEPS: readonly StepDef[] = [
  // Physical Well-being
  { id: "sleepDuration", order: 1, question: "how many hours did you sleep?", type: "tier-radio",
    tierScores: [3, 5, 10, 8, 6, 3], options: [
      opt("5-6h", "5-6 hours"), opt("6-7h", "6-7 hours"), opt("7-8h", "7-8 hours"),
      opt("8-9h", "8-9 hours"), opt("9-10h", "9-10 hours"), opt("10h+", "10+ hours"),
  ]},
  { id: "exercise", order: 2, question: "what level of exercise did you get?", type: "radio", options: [
      opt("light", "light", 4), opt("medium", "medium", 7), opt("heavy", "heavy", 10),
  ]},
  { id: "nutrition", order: 3, question: "what did you eat today?", type: "checkbox", options: [
      opt("meat", "meat"), opt("vegetables", "vegetables"), opt("fruit", "fruit"),
  ]},
  { id: "hydration", order: 4, question: "how much water did you drink?", type: "tier-radio",
    tierScores: [3, 5, 8, 10], options: [
      opt("500ml", "500ml"), opt("1L", "1 liter"), opt("1.5L", "1.5 liters"), opt("2L+", "2+ liters"),
  ]},
  { id: "timeOutdoor", order: 5, question: "how much time did you spend outside?", type: "tier-radio",
    tierScores: [2, 5, 8, 10], options: [
      opt("under-30min", "less than 30 minutes"), opt("30-60min", "30-60 minutes"),
      opt("1-2h", "1-2 hours"), opt("2h+", "2+ hours"),
  ]},
  { id: "physicalFeeling", order: 6, question: "how does your body feel?", type: "radio", options: [
      opt("unwell", "unwell", 2), opt("okay", "okay", 5),
      opt("healthy", "healthy", 8), opt("energetic", "energetic", 10),
  ]},
  // Mental & Emotional
  { id: "moodCheck", order: 7, question: "how are you feeling today?", type: "radio", options: [
      opt("happy", "happy", 10), opt("energetic", "energetic", 9),
      opt("okay", "okay", 6), opt("bored", "bored", 4),
      opt("tired", "tired", 3), opt("anxious", "anxious", 3),
      opt("sad", "sad", 2), opt("angry", "angry", 2), opt("lonely", "lonely", 2),
  ]},
  { id: "reading", order: 8, question: "how many pages did you read today?", type: "radio", options: [
      opt("none", "none (0-10 pages)", 1), opt("a-bit", "a bit (11-20 pages)", 3),
      opt("decent", "decent (21-30 pages)", 5), opt("a-lot", "a lot (31-40 pages)", 7),
      opt("on-a-roll", "on a roll (41-50 pages)", 9), opt("bookworm", "bookworm (51+ pages)", 10),
  ]},
  { id: "highlights", order: 9, question: "what was the highlight of your day?", type: "text", minChars: 50 },
  { id: "couldHaveBeenBetter", order: 10, question: "how could today have been better?", type: "text", minChars: 50 },
  { id: "storyOfTheDay", order: 11, question: "what's the story of your day?", type: "text", optional: true },
  // Relationship Well-being
  { id: "familyTime", order: 12, question: "did you spend time with your loved ones or people that are dear to you?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "conversations", order: 13, question: "did you have meaningful conversations today?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "kindnessActs", order: 14, question: "did you perform any acts of kindness today?", type: "radio", options: [
      opt("yes", "yes", 8), opt("no", "no", 2),
  ]},
  { id: "connectionStatus", order: 15, question: "how connected do you feel?", type: "radio", options: [
      opt("connected", "connected", 10), opt("neutral", "neutral", 5), opt("lonely", "lonely", 2),
  ]},
  // Work & Productivity
  { id: "learnedToday", order: 16, question: "what did you learn today?", type: "text", minChars: 20 },
  { id: "tasksFinished", order: 17, question: "what tasks did you finish?", type: "text", minChars: 20 },
  { id: "deepWorkHours", order: 18, question: "how many hours of deep work did you do?", type: "tier-radio",
    tierScores: [1, 4, 7, 9, 10], options: [
      opt("0h", "0 hours"), opt("1h", "1 hour"), opt("2h", "2 hours"),
      opt("3h", "3 hours"), opt("4h+", "4+ hours"),
  ]},
  { id: "workFeeling", order: 19, question: "how did work feel?", type: "radio", options: [
      opt("focused", "focused", 10), opt("productive", "productive", 8),
      opt("scattered", "scattered", 4), opt("drained", "drained", 2),
  ]},
  // Habits (unchanged)
  { id: "habits", order: 20, question: "what habit did you solidify today?", type: "habits" },
];

export function stepById(id: StepId): StepDef {
  const s = STEPS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown step ${id}`);
  return s;
}

export function optionLabel(stepId: StepId, optionId: string): string {
  const o = stepById(stepId).options?.find((x) => x.id === optionId);
  if (!o) throw new Error(`unknown option ${optionId} on ${stepId}`);
  return o.label;
}
