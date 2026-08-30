import { describe, expect, it } from 'vitest';
import { byCategory, netBalances, settleUp, spendByDay, totalSpend } from '../budget';
import type { CostItem, Member, Trip } from '../../types';

function member(id: string): Member {
  return {
    id, name: id, joinedAt: '2026-01-01T00:00:00Z', availability: [],
    availabilitySubmitted: true, quiz: null, costContributed: 0,
    role: 'member', avatarColor: '#000', language: 'en',
  };
}

function trip(costItems: CostItem[], memberIds = ['a', 'b', 'c']): Trip {
  return {
    id: 't1', destinationId: 'penang', destinationName: 'Penang', countryCode: 'MY',
    mode: 'group', createdBy: 'a', inviteCode: 'XX', respondBy: null, seasonWindow: null,
    dates: { start: '2026-06-01', end: '2026-06-05' }, datesConfirmed: true,
    outsideRecommendedSeason: false, budgetCap: 3000, currency: 'MYR',
    categoryCaps: { food: 400 }, members: memberIds.map(member), days: [],
    costItems, votes: [], media: [], visits: [], checkIns: [], stage: 'planning',
    localLanguage: 'ms', translationEnabled: false, createdAt: '2026-01-01',
  };
}

function cost(id: string, amount: number, paidBy: string, splitAmong: string[], extra: Partial<CostItem> = {}): CostItem {
  return {
    id, label: id, amount, category: 'food', paidBy, splitAmong,
    date: '2026-06-01', source: 'manual', ...extra,
  };
}

describe('netBalances', () => {
  it('credits the payer and debits everyone sharing', () => {
    const bal = netBalances(trip([cost('c1', 300, 'a', ['a', 'b', 'c'])]));
    expect(bal.a).toBeCloseTo(200);
    expect(bal.b).toBeCloseTo(-100);
    expect(bal.c).toBeCloseTo(-100);
  });

  it('sums to zero across the group', () => {
    const bal = netBalances(trip([
      cost('c1', 300, 'a', ['a', 'b', 'c']),
      cost('c2', 90, 'b', ['a', 'b']),
    ]));
    expect(Object.values(bal).reduce((s, v) => s + v, 0)).toBeCloseTo(0);
  });

  it('splits across everyone when splitAmong is empty', () => {
    const bal = netBalances(trip([cost('c1', 300, 'a', [])]));
    expect(bal.b).toBeCloseTo(-100);
  });

  it('handles a member opting out of a paid activity', () => {
    const bal = netBalances(trip([cost('c1', 200, 'a', ['a', 'b'])]));
    expect(bal.c).toBe(0);
    expect(bal.b).toBeCloseTo(-100);
  });
});

describe('settleUp', () => {
  it('nets the group down to the fewest transfers', () => {
    const s = settleUp(trip([
      cost('c1', 300, 'a', ['a', 'b', 'c']),
      cost('c2', 300, 'b', ['a', 'b', 'c']),
    ]));
    // a and b each covered 300 of a 600 total, so only c owes anything.
    expect(s).toHaveLength(2);
    expect(s.every((x) => x.from === 'c')).toBe(true);
    expect(s.reduce((sum, x) => sum + x.amount, 0)).toBeCloseTo(200);
  });

  it('produces at most n-1 transfers', () => {
    const s = settleUp(trip([
      cost('c1', 90, 'a', ['a', 'b', 'c']),
      cost('c2', 60, 'b', ['a', 'b', 'c']),
      cost('c3', 30, 'c', ['a', 'b', 'c']),
      cost('c4', 120, 'a', ['a', 'b', 'c']),
    ]));
    expect(s.length).toBeLessThanOrEqual(2);
  });

  it('returns nothing when everyone is square', () => {
    expect(settleUp(trip([cost('c1', 300, 'a', ['a'])], ['a']))).toEqual([]);
  });

  it('matches the largest debtor to the largest creditor first', () => {
    const s = settleUp(trip([
      cost('c1', 600, 'a', ['a', 'b', 'c']),
      cost('c2', 30, 'b', ['a', 'b', 'c']),
    ]));
    expect(s[0].from).toBe('c');
    expect(s[0].to).toBe('a');
  });
});

describe('byCategory', () => {
  it('subtotals per category and flags a cap being approached', () => {
    const rows = byCategory(trip([
      cost('c1', 340, 'a', ['a'], { category: 'food' }),
      cost('c2', 200, 'a', ['a'], { category: 'flights' }),
    ]));
    const food = rows.find((r) => r.category === 'food')!;
    expect(food.total).toBe(340);
    expect(food.cap).toBe(400);
    expect(food.trendingOver).toBe(true);
    expect(food.over).toBe(false);
  });

  it('flags going over a cap', () => {
    const food = byCategory(trip([cost('c1', 480, 'a', ['a'], { category: 'food' })]))
      .find((r) => r.category === 'food')!;
    expect(food.over).toBe(true);
  });

  it('leaves pct null for categories with no cap', () => {
    const flights = byCategory(trip([cost('c1', 900, 'a', ['a'], { category: 'flights' })]))
      .find((r) => r.category === 'flights')!;
    expect(flights.pct).toBeNull();
    expect(flights.trendingOver).toBe(false);
  });

  it('always returns every category, even empty ones', () => {
    expect(byCategory(trip([]))).toHaveLength(6);
  });
});

describe('spendByDay', () => {
  it('accumulates chronologically', () => {
    const rows = spendByDay(trip([
      cost('c1', 100, 'a', ['a'], { date: '2026-06-02' }),
      cost('c2', 50, 'a', ['a'], { date: '2026-06-01' }),
      cost('c3', 25, 'a', ['a'], { date: '2026-06-02' }),
    ]));
    expect(rows).toEqual([
      { date: '2026-06-01', spend: 50, cumulative: 50 },
      { date: '2026-06-02', spend: 125, cumulative: 175 },
    ]);
  });
});

describe('totalSpend', () => {
  it('sums every item', () => {
    expect(totalSpend([cost('a', 10, 'a', []), cost('b', 15.5, 'a', [])])).toBe(25.5);
  });
});
