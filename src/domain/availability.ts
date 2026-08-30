import type { DateRange, Member } from '../types';
import { addDays, daysBetween, eachDate, rangeLength } from './dates';

/**
 * Group availability overlap (section 1, steps 8–9).
 *
 * Members who never submitted are excluded from the calculation rather than
 * treated as fully unavailable, so one slow friend can't stall the trip.
 */

export interface OverlapResult {
  /** Best window found, or null if nobody submitted anything. */
  window: DateRange | null;
  /** True when every responder is free for the whole window. */
  full: boolean;
  /** Members counted in the calculation. */
  responders: string[];
  /** Members who never submitted — treated as "no restriction". */
  nonResponders: string[];
  /** For partial overlaps: who'd be missing, and on which days. */
  missing: { memberId: string; dates: string[] }[];
  /** Every candidate window, best first — useful for showing runners-up. */
  candidates: { range: DateRange; memberIds: string[] }[];
}

export function hasSubmitted(m: Member): boolean {
  return m.availabilitySubmitted && m.availability.length > 0;
}

/** Days a member marked free, as a Set for cheap lookups. */
export function availableDaySet(m: Member): Set<string> {
  const set = new Set<string>();
  for (const r of m.availability) for (const d of eachDate(r)) set.add(d);
  return set;
}

/** Collapse a sorted list of ISO dates into contiguous ranges. */
export function toRanges(dates: string[]): DateRange[] {
  const sorted = [...new Set(dates)].sort();
  const out: DateRange[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && daysBetween(last.end, d) === 1) last.end = d;
    else out.push({ start: d, end: d });
  }
  return out;
}

export interface OverlapOptions {
  /** Ignore windows shorter than this many days. */
  minDays?: number;
  /** Prefer windows inside these months (the recommended season). */
  preferredMonths?: number[];
}

/**
 * Find the window the most members share, longest first. Falls back to the
 * best partial overlap when no window works for everyone.
 */
export function findOverlap(members: Member[], opts: OverlapOptions = {}): OverlapResult {
  const minDays = opts.minDays ?? 3;
  const responders = members.filter(hasSubmitted);
  const nonResponders = members.filter((m) => !hasSubmitted(m)).map((m) => m.id);

  if (responders.length === 0) {
    return {
      window: null, full: false, responders: [], nonResponders,
      missing: [], candidates: [],
    };
  }

  // Count how many responders are free on each day across the union of all days.
  const perDay = new Map<string, string[]>();
  for (const m of responders) {
    for (const d of availableDaySet(m)) {
      const list = perDay.get(d) ?? [];
      list.push(m.id);
      perDay.set(d, list);
    }
  }
  const allDays = [...perDay.keys()].sort();
  if (allDays.length === 0) {
    return { window: null, full: false, responders: responders.map((m) => m.id), nonResponders, missing: [], candidates: [] };
  }

  // Walk every contiguous run at each "at least k members free" threshold. The
  // day counts are small (a season window), so brute force is plenty fast and
  // far easier to reason about than an interval tree.
  const candidates: { range: DateRange; memberIds: string[] }[] = [];
  for (let k = responders.length; k >= 1; k--) {
    let runStart: string | null = null;
    let prev: string | null = null;
    const flush = (endDay: string) => {
      if (!runStart) return;
      const range = { start: runStart, end: endDay };
      if (rangeLength(range) >= minDays) {
        const shared = responders
          .filter((m) => {
            const set = availableDaySet(m);
            return eachDate(range).every((d) => set.has(d));
          })
          .map((m) => m.id);
        // A run can clear the "k members free each day" bar without any one
        // member covering the whole span. Those windows work for nobody, so
        // they are not candidates.
        if (shared.length > 0) candidates.push({ range, memberIds: shared });
      }
      runStart = null;
    };
    for (const d of allDays) {
      const free = (perDay.get(d) ?? []).length >= k;
      if (free) {
        if (runStart === null) runStart = d;
        else if (prev !== null && daysBetween(prev, d) !== 1) {
          flush(prev);
          runStart = d;
        }
      } else if (runStart !== null) {
        flush(prev ?? d);
      }
      prev = d;
    }
    if (runStart !== null && prev !== null) flush(prev);
  }

  if (candidates.length === 0) {
    return { window: null, full: false, responders: responders.map((m) => m.id), nonResponders, missing: [], candidates: [] };
  }

  const inPreferred = (r: DateRange) => {
    const months = opts.preferredMonths;
    if (!months || months.length === 0) return 0;
    const days = eachDate(r);
    const hits = days.filter((d) => months.includes(new Date(`${d}T00:00:00Z`).getUTCMonth())).length;
    return hits / days.length;
  };

  // Rank: most members first, then longest, then most inside the good season.
  candidates.sort((a, b) => {
    if (b.memberIds.length !== a.memberIds.length) return b.memberIds.length - a.memberIds.length;
    const lenDiff = rangeLength(b.range) - rangeLength(a.range);
    if (lenDiff !== 0) return lenDiff;
    return inPreferred(b.range) - inPreferred(a.range);
  });

  // De-duplicate windows that are subsets of a better one already kept.
  const kept: typeof candidates = [];
  for (const c of candidates) {
    const covered = kept.some(
      (k) =>
        k.memberIds.length >= c.memberIds.length &&
        daysBetween(k.range.start, c.range.start) >= 0 &&
        daysBetween(c.range.end, k.range.end) >= 0,
    );
    if (!covered) kept.push(c);
  }

  const best = kept[0];
  const full = best.memberIds.length === responders.length;
  const missing = responders
    .filter((m) => !best.memberIds.includes(m.id))
    .map((m) => {
      const set = availableDaySet(m);
      return { memberId: m.id, dates: eachDate(best.range).filter((d) => !set.has(d)) };
    });

  return {
    window: best.range,
    full,
    responders: responders.map((m) => m.id),
    nonResponders,
    missing,
    candidates: kept.slice(0, 4),
  };
}

/** Trim a window to a target trip length, keeping it centred. */
export function trimToLength(r: DateRange, targetDays: number): DateRange {
  const len = rangeLength(r);
  if (len <= targetDays) return r;
  const off = Math.floor((len - targetDays) / 2);
  const start = addDays(r.start, off);
  return { start, end: addDays(start, targetDays - 1) };
}

/** Soft check for the "heads up, this is outside the ideal window" banner. */
export function isOutsideSeason(r: DateRange, recommendedMonths: number[]): boolean {
  if (recommendedMonths.length === 0) return false;
  const days = eachDate(r);
  const inside = days.filter((d) => recommendedMonths.includes(new Date(`${d}T00:00:00Z`).getUTCMonth()));
  return inside.length / days.length < 0.5;
}
