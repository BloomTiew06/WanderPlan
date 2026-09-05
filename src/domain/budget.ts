import type { CostCategory, CostItem, Member, Trip } from '../types';
import { COST_CATEGORIES } from '../types';
import { CHART } from '../theme.js';

/** Per-category subtotals plus cap status (section 5). */
export interface CategoryTotal {
  category: CostCategory;
  total: number;
  cap: number | null;
  /** 0..1+ against the cap, null when no cap is set. */
  pct: number | null;
  /** True when spend is past 80% of a cap but not yet over. */
  trendingOver: boolean;
  over: boolean;
  count: number;
}

export function totalSpend(items: CostItem[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}

export function byCategory(trip: Trip): CategoryTotal[] {
  return COST_CATEGORIES.map((category) => {
    const rows = trip.costItems.filter((i) => i.category === category);
    const total = totalSpend(rows);
    const cap = trip.categoryCaps[category] ?? null;
    const pct = cap ? total / cap : null;
    return {
      category,
      total,
      cap,
      pct,
      trendingOver: pct !== null && pct >= 0.8 && pct <= 1,
      over: pct !== null && pct > 1,
      count: rows.length,
    };
  });
}

/** Cumulative spend per day, for the running line chart. */
export function spendByDay(trip: Trip): { date: string; spend: number; cumulative: number }[] {
  const map = new Map<string, number>();
  for (const i of trip.costItems) map.set(i.date, (map.get(i.date) ?? 0) + i.amount);
  const dates = [...map.keys()].sort();
  let running = 0;
  return dates.map((date) => {
    running += map.get(date) ?? 0;
    return { date, spend: map.get(date) ?? 0, cumulative: running };
  });
}

/** Net balance per member: positive means the group owes them. */
export function netBalances(trip: Trip): Record<string, number> {
  const bal: Record<string, number> = {};
  for (const m of trip.members) bal[m.id] = 0;
  for (const item of trip.costItems) {
    const shares = item.splitAmong.length > 0 ? item.splitAmong : trip.members.map((m) => m.id);
    const per = item.amount / shares.length;
    if (bal[item.paidBy] !== undefined) bal[item.paidBy] += item.amount;
    for (const s of shares) if (bal[s] !== undefined) bal[s] -= per;
  }
  return bal;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Debt simplification: greedily match the largest debtor to the largest
 * creditor until everyone nets out. Produces at most n-1 transfers instead of
 * one per shared expense.
 */
export function settleUp(trip: Trip, epsilon = 0.01): Settlement[] {
  const bal = netBalances(trip);
  const debtors = Object.entries(bal)
    .filter(([, v]) => v < -epsilon)
    .map(([id, v]) => ({ id, amt: -v }));
  const creditors = Object.entries(bal)
    .filter(([, v]) => v > epsilon)
    .map(([id, v]) => ({ id, amt: v }));

  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);

  const out: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    if (pay > epsilon) out.push({ from: debtors[i].id, to: creditors[j].id, amount: round2(pay) });
    debtors[i].amt -= pay;
    creditors[j].amt -= pay;
    if (debtors[i].amt <= epsilon) i++;
    if (creditors[j].amt <= epsilon) j++;
  }
  return out;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function perPerson(trip: Trip): number {
  return trip.members.length > 0 ? totalSpend(trip.costItems) / trip.members.length : 0;
}

export function memberOwedSummary(trip: Trip, member: Member): number {
  return round2(netBalances(trip)[member.id] ?? 0);
}

export const CATEGORY_LABELS: Record<CostCategory, string> = {
  flights: 'Flights',
  accommodation: 'Accommodation',
  food: 'Food',
  activities: 'Activities',
  transport: 'Transport',
  other: 'Shopping / Other',
};

export const CATEGORY_COLORS: Record<CostCategory, string> = CHART as Record<CostCategory, string>;

export const CATEGORY_ICONS: Record<CostCategory, string> = {
  flights: '✈️',
  accommodation: '🏨',
  food: '🍜',
  activities: '🎟️',
  transport: '🚕',
  other: '🛍️',
};
