// Pure helpers for the admin calendar: which days fill a month grid, and which
// Pueblo (Los Angeles) calendar day an event's start time falls on.

const TZ = "America/Los_Angeles";

export type CalendarDay = { key: string; day: number; inMonth: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

// "2026-10" -> weeks of 7 days, Sunday first, including the days of the neighbouring months that fill the first and last week.
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86400000);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7);
  const out: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 86400000);
      row.push({
        key: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month - 1,
      });
    }
    out.push(row);
  }
  return out;
}

// The local calendar day (YYYY-MM-DD) an ISO timestamp falls on in Los Angeles.
export function puebloDayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Parses "YYYY-MM"; falls back to the given default for anything else.
export function parseMonth(raw: string | undefined, fallback: { year: number; month: number }): { year: number; month: number } {
  const m = raw ? /^(\d{4})-(\d{2})$/.exec(raw) : null;
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return fallback;
  return { year, month };
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;
