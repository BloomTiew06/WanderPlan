import { describe, expect, it } from 'vitest';
import { buildSnapshot, detectConflicts } from '../preferences';
import type { Member, Quiz } from '../../types';

function member(id: string, quiz: Quiz | null): Member {
  return {
    id, name: id, joinedAt: '2026-01-01T00:00:00Z', availability: [],
    availabilitySubmitted: true, quiz, costContributed: 0,
    role: 'member', avatarColor: '#000', language: 'en',
  };
}

const chill: Quiz = { budget: 1000, pace: 'chill', interests: ['food', 'relaxation'], mustDos: [] };
const packed: Quiz = { budget: 1000, pace: 'packed', interests: ['nightlife', 'adventure'], mustDos: [] };

describe('buildSnapshot', () => {
  it('reports the dominant pace and its agreement level', () => {
    const s = buildSnapshot([member('a', chill), member('b', chill), member('c', packed)]);
    expect(s.dominantPace).toBe('chill');
    expect(s.paceAgreement).toBeCloseTo(2 / 3);
    expect(s.headline).toBe('67% of you want a chill pace');
  });

  it('ranks shared interests', () => {
    const s = buildSnapshot([member('a', chill), member('b', chill), member('c', packed)]);
    expect(s.topInterest).toBe('food');
    expect(s.interestCounts[0].count).toBe(2);
  });

  it('collects must-dos with the person who flagged them', () => {
    const q: Quiz = { ...chill, mustDos: ['Mount Kinabalu', '  '] };
    const s = buildSnapshot([member('priya', q)]);
    expect(s.mustDos).toEqual([{ text: 'Mount Kinabalu', memberId: 'priya', memberName: 'priya' }]);
  });

  it('ignores members who have not done the quiz', () => {
    const s = buildSnapshot([member('a', chill), member('b', null)]);
    expect(s.respondents).toBe(1);
    expect(s.memberCount).toBe(2);
  });

  it('survives an empty group without dividing by zero', () => {
    const s = buildSnapshot([]);
    expect(s.avgBudget).toBe(0);
    expect(s.headline).toBe('Waiting on the first quiz');
  });

  it('reports the budget spread', () => {
    const s = buildSnapshot([
      member('a', { ...chill, budget: 500 }),
      member('b', { ...chill, budget: 2000 }),
    ]);
    expect(s.budgetSpread).toBe(1500);
    expect(s.avgBudget).toBe(1250);
  });
});

describe('detectConflicts', () => {
  it('raises a pace vote when the group is genuinely split', () => {
    const conflicts = detectConflicts([member('a', chill), member('b', packed)], []);
    const pace = conflicts.find((c) => c.id.startsWith('conflict-pace'));
    expect(pace).toBeDefined();
    expect(pace!.options.map((o) => o.id).sort()).toEqual(['chill', 'packed']);
    expect(pace!.status).toBe('open');
  });

  it('stays quiet when the group agrees', () => {
    const conflicts = detectConflicts([member('a', chill), member('b', chill)], []);
    expect(conflicts.find((c) => c.id.startsWith('conflict-pace'))).toBeUndefined();
  });

  it('raises a budget vote when the range is wide', () => {
    const conflicts = detectConflicts([
      member('a', { ...chill, budget: 400 }),
      member('b', { ...chill, budget: 2000 }),
    ], []);
    expect(conflicts.some((c) => c.id.startsWith('conflict-budget'))).toBe(true);
  });

  it('does not re-raise a conflict that already has a vote', () => {
    const first = detectConflicts([member('a', chill), member('b', packed)], []);
    const second = detectConflicts([member('a', chill), member('b', packed)], first);
    expect(second.find((c) => c.id.startsWith('conflict-pace'))).toBeUndefined();
  });

  it('needs at least two respondents before flagging anything', () => {
    expect(detectConflicts([member('a', chill)], [])).toEqual([]);
  });
});
