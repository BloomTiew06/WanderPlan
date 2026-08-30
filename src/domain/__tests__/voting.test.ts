import { describe, expect, it } from 'vitest';
import {
  memberWeight,
  pickRandomTieBreaker,
  resolveVote,
  tallyVote,
  weightsFor,
} from '../voting';
import type { Member, Vote } from '../../types';

function member(id: string, contributed: number, role: Member['role'] = 'member'): Member {
  return {
    id,
    name: id,
    joinedAt: '2026-01-01T00:00:00Z',
    availability: [],
    availabilitySubmitted: true,
    quiz: null,
    costContributed: contributed,
    role,
    avatarColor: '#000',
    language: 'en',
  };
}

function vote(ballots: Record<string, string>, createdAt = new Date().toISOString()): Vote {
  return {
    id: 'v1',
    question: 'Beach or mountain?',
    why: 'split',
    options: [{ id: 'beach', label: 'Beach' }, { id: 'mountain', label: 'Mountain' }],
    ballots,
    comments: [],
    createdAt,
    status: 'open',
  };
}

describe('memberWeight', () => {
  it('starts everyone at 1 so nobody is zeroed out', () => {
    const w = memberWeight(member('a', 0), 0);
    expect(w.weight).toBe(1);
  });

  it('adds the cost share', () => {
    const w = memberWeight(member('a', 300), 1000);
    expect(w.weight).toBeCloseTo(1.3);
    expect(w.explanation).toContain('cost share');
  });

  it('adds the organizer bonus', () => {
    const w = memberWeight(member('a', 0, 'organizer'), 1000);
    expect(w.weight).toBeCloseTo(1.25);
    expect(w.explanation).toContain('organizer');
  });

  it('shows the full arithmetic so the tooltip is auditable', () => {
    const w = memberWeight(member('a', 500, 'organizer'), 1000);
    expect(w.weight).toBeCloseTo(1.75);
    expect(w.explanation).toBe('base 1.00 +0.50 cost share +0.25 organizer = 1.75');
  });
});

describe('weightsFor', () => {
  it('normalises cost share against the group total', () => {
    const ws = weightsFor([member('a', 750), member('b', 250)]);
    expect(ws.a.weight).toBeCloseTo(1.75);
    expect(ws.b.weight).toBeCloseTo(1.25);
  });
});

describe('tallyVote', () => {
  const members = [member('a', 800, 'organizer'), member('b', 100), member('c', 100)];

  it('weights the tally rather than counting heads', () => {
    const state = tallyVote(vote({ a: 'beach', b: 'mountain', c: 'mountain' }), members, new Date());
    const beach = state.tallies.find((t) => t.optionId === 'beach')!;
    const mountain = state.tallies.find((t) => t.optionId === 'mountain')!;
    // a carries 2.05 on their own; b and c together carry 2.2, so they still edge it.
    expect(beach.headcount).toBe(1);
    expect(mountain.headcount).toBe(2);
    expect(beach.weighted).toBeCloseTo(2.05);
    expect(mountain.weighted).toBeCloseTo(2.2);
    expect(state.leader?.optionId).toBe('mountain');
  });

  it('lets a heavy voter beat a bare majority', () => {
    const heavy = [member('a', 980, 'organizer'), member('b', 10), member('c', 10)];
    const state = tallyVote(vote({ a: 'beach', b: 'mountain', c: 'mountain' }), heavy, new Date());
    expect(state.leader?.optionId).toBe('beach');
  });

  it('flags a dead heat once everyone has voted', () => {
    const even = [member('a', 100), member('b', 100)];
    const state = tallyVote(vote({ a: 'beach', b: 'mountain' }), even, new Date());
    expect(state.stuck).toBe(true);
    expect(state.stuckReason).toMatch(/dead heat/);
  });

  it('flags a long-open close vote as stuck', () => {
    const even = [member('a', 100), member('b', 100), member('c', 100)];
    const old = new Date(Date.now() - 90 * 60_000).toISOString();
    const state = tallyVote(vote({ a: 'beach', b: 'mountain' }, old), even, new Date());
    expect(state.stuck).toBe(true);
    expect(state.stuckReason).toMatch(/minutes/);
  });

  it('does not flag a clear winner as stuck', () => {
    const state = tallyVote(vote({ a: 'beach', b: 'beach', c: 'beach' }), members, new Date());
    expect(state.stuck).toBe(false);
    expect(state.margin).toBeCloseTo(1);
  });

  it('ignores ballots from members no longer on the trip', () => {
    const state = tallyVote(vote({ a: 'beach', ghost: 'mountain' }), members, new Date());
    expect(state.castCount).toBe(2);
    expect(state.tallies.find((t) => t.optionId === 'mountain')!.weighted).toBe(0);
  });
});

describe('pickRandomTieBreaker', () => {
  it('picks from the member list', () => {
    const members = [member('a', 0), member('b', 0), member('c', 0)];
    expect(pickRandomTieBreaker(members, () => 0).id).toBe('a');
    expect(pickRandomTieBreaker(members, () => 0.99).id).toBe('c');
  });
});

describe('resolveVote', () => {
  it('routes a tie-breaker call through the same path as a weighted win', () => {
    const at = new Date().toISOString();
    const weighted = resolveVote(vote({}), 'beach', { kind: 'weighted', at });
    const broken = resolveVote(vote({}), 'beach', {
      kind: 'tiebreaker',
      byMemberId: 'sam',
      tieBreakerPickedBy: 'random',
      at,
    });
    expect(weighted.status).toBe('resolved');
    expect(broken.status).toBe('resolved');
    expect(weighted.winningOptionId).toBe(broken.winningOptionId);
  });
});
