/* AI-CONTEXT-NOTE:{"R":"Pure date/time helpers; all persistence uses 'YYYY-MM-DD' strings and 'HH:mm' times.","IDD":[{"?":"Local time everywhere (no UTC shifts) - personal journal is single-timezone."},{"?":"sleepHours uses mod-24 wrap for overnight sleep."}],"A":[{"?":"lib/scoring.ts s8 banding"},{"?":"lib/streaks.ts"},{"?":"lib/db/repository.ts"},{"?":"dashboard components"}],"AB":[],"E":[{"!!":"tests/format.test.ts"}]} */

export function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toStr(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export function diffDays(a: string, b: string): number {
  const MS = 86_400_000;
  return Math.round((fromStr(a).getTime() - fromStr(b).getTime()) / MS);
}

export function monthKeyOf(s: string): string {
  return s.slice(0, 7);
}

export function daysInMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToHHmm(min: number): string {
  const h = String(Math.floor(min / 60) % 24).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function sleepHours(sleptAt: string, wokeAt: string): number {
  const slept = hhmmToMinutes(sleptAt);
  const woke = hhmmToMinutes(wokeAt);
  let mins = woke - slept;
  if (mins <= 0) mins += 1440;
  return mins / 60;
}
