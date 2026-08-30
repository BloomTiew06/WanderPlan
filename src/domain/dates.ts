import type { DateRange } from '../types';

export const MS_DAY = 86_400_000;

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** ISO date (YYYY-MM-DD) for a Date, in UTC so the demo is timezone-stable. */
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISO(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function addDays(s: string, n: number): string {
  return iso(new Date(parseISO(s).getTime() + n * MS_DAY));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / MS_DAY);
}

/** Inclusive length of a range in nights+1. */
export function rangeLength(r: DateRange): number {
  return daysBetween(r.start, r.end) + 1;
}

export function eachDate(r: DateRange): string[] {
  const out: string[] = [];
  for (let d = r.start; daysBetween(d, r.end) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthOf(s: string): number {
  return parseISO(s).getUTCMonth();
}

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseISO(s).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...opts,
  });
}

export function formatRange(r: DateRange): string {
  const a = parseISO(r.start);
  const b = parseISO(r.end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_LONG[a.getUTCMonth()]}`;
  }
  return `${formatDate(r.start)} – ${formatDate(r.end)}`;
}

/** Month numbers covered by a start..end month window, wrapping across December. */
export function monthsInWindow(startMonth: number, endMonth: number): number[] {
  const out: number[] = [];
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    out.push(m);
    if (m === endMonth) break;
    m = (m + 1) % 12;
  }
  return out;
}

/** Human countdown to an ISO timestamp. Returns null once it has passed. */
export function countdownTo(isoTs: string, now: Date): string | null {
  const ms = new Date(isoTs).getTime() - now.getTime();
  if (ms <= 0) return null;
  const d = Math.floor(ms / MS_DAY);
  const h = Math.floor((ms % MS_DAY) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
