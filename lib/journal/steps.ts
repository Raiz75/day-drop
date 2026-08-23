/* AI-CONTEXT-NOTE:{"R":"Single source of truth for the 16 wizard steps: question copy, option ids/labels, tier scores, validation hints.","IDD":[{"?":"Option ids are stable slugs persisted in entries; labels may change freely."},{"?":"points on options feed lib/scoring.ts; tierScores are per-tier arrays."},{"?":"s5 rest-day exclusivity is enforced in CheckboxStep UI, ids here stay plain."}],"A":[{"!!!":"lib/scoring.ts","CRITICAL":"scoring maps hard-code these option ids"},{"?":"lib/validations/journal.ts"},{"?":"components/journal/** renders this config"},{"?":"lib/carryover.ts"}],"AB":[],"E":[{"!!":"tests/journal-steps.test.ts"},{"?":"Changing an option id requires a data migration"}]} */

export type StepId =
  | "work" | "health" | "weather" | "steps" | "workout" | "screenTime"
  | "reading" | "sleep" | "mood" | "highlight" | "improve" | "grateful"
  | "todayTasks" | "tomorrowPlan" | "bucketList" | "habits";

export interface StepOption { id: string; label: string; points?: number }

export interface StepDef {
  id: StepId;
  order: number;
  question: string;
  type: "radio" | "checkbox" | "tier-radio" | "sleep" | "text" | "tasks" | "tomorrow" | "habits";
  options?: StepOption[];
  tierScores?: number[];
  minChars?: number;
  optional?: boolean;
}

const opt = (id: string, label: string, points?: number): StepOption => ({ id, label, points });

export const STEPS: readonly StepDef[] = [
  { id: "work", order: 1, question: "how was your work today?", type: "radio", options: [
    opt("fun", "i had fun today"), opt("productive", "i was super productive"),
    opt("boring", "it was boring as hell"), opt("stressful", "soooo stressful"),
    opt("annoying", "annoying honestly..."),
  ]},
  { id: "health", order: 2, question: "how was your health today?", type: "radio", options: [
    opt("healthy", "i feel healthy today", 10), opt("under-weather", "I'm feeling under the weather", 5),
    opt("cold-symptoms", "I've got cold symptoms ugh", 4), opt("headache", "i had a headache", 4),
    opt("stomach-ache", "my stomach hurts", 3), opt("feverish", "i'm feverish...", 2),
  ]},
  { id: "weather", order: 3, question: "what's the weather like today?", type: "checkbox", options: [
    opt("hot-sunny", "it's hot and sunny out"), opt("sunny-clouds", "it's sunny with some clouds"),
    opt("cloudy-gloomy", "it's cloudy and gloomy"), opt("light-rain", "there's light rain falling"),
    opt("heavy-rain", "it's pouring rain outside"), opt("stormy", "it's literally stormy out there"),
  ]},
  { id: "steps", order: 4, question: "how many steps did you take today?", type: "tier-radio",
    tierScores: [1, 2, 4, 6, 8, 9, 10], options: [
    opt("barely-walked", "barely walked (just 0-3000 steps)"),
    opt("little-bit", "i did a little bit (3001-5000)"),
    opt("decent-amount", "i walked a decent amount (5001-7000)"),
    opt("active", "i was active today (7001-8000)"),
    opt("walked-lot", "i walked a lot (8001-9000)"),
    opt("on-fire", "i was on fire (9001-10000)"),
    opt("above-beyond", "i went above and beyond (10000+ steps!)"),
  ]},
  { id: "workout", order: 5, question: "what workout did you do today?", type: "checkbox", options: [
    opt("rest-day", "it's a rest day for me", 1), opt("walk", "i went for a walk", 3),
    opt("run", "i went for a run", 6), opt("sports", "i played sports", 5),
    opt("upper-body", "i did upper body", 5), opt("lower-body", "i did lower body", 5),
    opt("full-body", "i did a full body workout", 8),
  ]},
  { id: "screenTime", order: 6, question: "how much screen time did you have?", type: "tier-radio",
    tierScores: [10, 9, 7, 5, 4, 3, 2, 1], options: [
    opt("barely-used", "i barely used my phone (just 0-1 hour)"),
    opt("a-little", "i used it a little (2 hours)"),
    opt("moderately", "i used it moderately (3 hours)"),
    opt("quite-some", "i spent quite some time (4 hours)"),
    opt("on-it-lot", "i was on it a lot (5 hours)"),
    opt("glued", "i was glued to it (6 hours)"),
    opt("way-too-much", "i was on it way too much (7 hours)"),
    opt("ashamed", "i'm ashamed (8+ hours)"),
  ]},
  { id: "reading", order: 7, question: "how many pages did you read today?", type: "tier-radio",
    tierScores: [1, 3, 5, 7, 8, 9, 10], options: [
    opt("none", "i didn't read at all (0-10 pages)"),
    opt("a-bit", "i read a bit (11-20 pages)"),
    opt("decent", "i read a decent amount (21-40 pages)"),
    opt("a-lot", "i read a lot (41-60 pages)"),
    opt("on-a-roll", "i was on a roll (61-80 pages)"),
    opt("almost-book", "i almost finished a book (81-100 pages)"),
    opt("reading-machine", "i'm a reading machine (100+ pages!)"),
  ]},
  { id: "sleep", order: 8, question: "when did you sleep and wake up?", type: "sleep" },
  { id: "mood", order: 9, question: "how are you feeling today?", type: "radio", options: [
    opt("happy", "i'm really happy"), opt("energetic", "i'm full of energy"),
    opt("okay", "i'm just okay"), opt("bored", "i'm bored out of my mind"),
    opt("tired", "i'm so tired"), opt("anxious", "i'm feeling anxious"),
    opt("sad", "i'm feeling sad today"), opt("angry", "i'm lowkey angry"),
    opt("lonely", "i'm feeling lonely"),
  ]},
  { id: "highlight", order: 10, question: "what was the highlight of your day?", type: "text", minChars: 20 },
  { id: "improve", order: 11, question: "how could today have been better?", type: "text", minChars: 20 },
  { id: "grateful", order: 12, question: "what am i grateful for today?", type: "text", minChars: 20 },
  { id: "todayTasks", order: 13, question: "what's your daily plan looking like today?", type: "tasks" },
  { id: "tomorrowPlan", order: 14, question: "what's your daily plan for tomorrow?", type: "tomorrow" },
  { id: "bucketList", order: 15, question: "what's on my bucket list for this month?", type: "text", optional: true },
  { id: "habits", order: 16, question: "what habit did you solidify today?", type: "habits" },
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
