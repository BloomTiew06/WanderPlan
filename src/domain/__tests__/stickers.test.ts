import { describe, expect, it } from 'vitest';
import { careState, collectionProgress, groupStickersFor, newlyUnlocked } from '../stickers';
import { STICKER_CATALOG } from '../../data/stickers';
import type { Profile, Trip, Visit } from '../../types';

function profile(stickerIds: string[] = []): Profile {
  return {
    memberId: 'you',
    name: 'You',
    language: 'en',
    mascot: { name: 'Trunk', points: 0, lastFedAt: null, lastRestedAt: null, pinnedStickerId: null },
    stickers: stickerIds.map((stickerId) => ({ stickerId, tripId: 't0', at: '2026-01-01', x: 0, y: 0, rotation: 0 })),
    emergencyContacts: [],
    checkInThresholdHours: 24,
  };
}

function visit(id: string, opts: Partial<Visit>): Visit {
  return {
    id, memberId: 'you', tripId: 't1', activityId: 'a1', placeName: 'x',
    city: 'Kota Kinabalu', country: 'Malaysia', countryCode: 'MY',
    lat: 6, lng: 116, at: '2026-04-11T10:00:00Z', method: 'manual', ...opts,
  };
}

describe('STICKER_CATALOG', () => {
  it('has a sticker for every landmark and every dish, plus group tiers', () => {
    expect(STICKER_CATALOG.some((s) => s.itemId === 'kk-kinabalu' && s.type === 'landmark')).toBe(true);
    expect(STICKER_CATALOG.some((s) => s.itemId === 'pg-laksa' && s.type === 'food')).toBe(true);
    expect(STICKER_CATALOG.filter((s) => s.type === 'group')).toHaveLength(3);
  });

  it('has no duplicate ids', () => {
    const ids = STICKER_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('newlyUnlocked', () => {
  it('unlocks a landmark sticker from a check-in', () => {
    const out = newlyUnlocked([visit('v1', { poiId: 'kk-kinabalu' })], profile(), 't1');
    expect(out).toHaveLength(1);
    expect(out[0].stickerId).toBe('st-kk-kinabalu');
  });

  it('unlocks a food sticker from a logged dish', () => {
    const out = newlyUnlocked([visit('v1', { dishId: 'pg-laksa' })], profile(), 't1');
    expect(out[0].stickerId).toBe('st-pg-laksa');
  });

  it('does not re-award a sticker already earned', () => {
    const out = newlyUnlocked([visit('v1', { poiId: 'kk-kinabalu' })], profile(['st-kk-kinabalu']), 't1');
    expect(out).toEqual([]);
  });

  it('does not double-award within a single batch', () => {
    const out = newlyUnlocked(
      [visit('v1', { poiId: 'kk-kinabalu' }), visit('v2', { poiId: 'kk-kinabalu' })],
      profile(),
      't1',
    );
    expect(out).toHaveLength(1);
  });

  it('ignores check-ins at places with no sticker', () => {
    expect(newlyUnlocked([visit('v1', { poiId: 'kk-sabah-museum' })], profile(), 't1')).toEqual([]);
    expect(newlyUnlocked([visit('v1', {})], profile(), 't1')).toEqual([]);
  });

  it('places stickers inside the suitcase shell', () => {
    const out = newlyUnlocked(
      [visit('v1', { poiId: 'kk-kinabalu' }), visit('v2', { dishId: 'kk-hinava' })],
      profile(),
      't1',
    );
    for (const s of out) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(1);
    }
  });
});

function completedTrip(id: string, memberIds: string[]): Trip {
  return {
    id, destinationId: 'penang', destinationName: 'Penang', countryCode: 'MY',
    mode: 'group', createdBy: 'you', inviteCode: 'X', respondBy: null, seasonWindow: null,
    dates: null, datesConfirmed: true, outsideRecommendedSeason: false, budgetCap: 0,
    currency: 'MYR', categoryCaps: {},
    members: memberIds.map((m) => ({
      id: m, name: m, joinedAt: '', availability: [], availabilitySubmitted: true,
      quiz: null, costContributed: 0, role: 'member' as const, avatarColor: '#000', language: 'en',
    })),
    days: [], costItems: [], votes: [], media: [], visits: [], checkIns: [],
    stage: 'complete', localLanguage: 'ms', translationEnabled: false, createdAt: '',
  };
}

describe('groupStickersFor', () => {
  it('unlocks Squad Goals on a second trip with the same crew', () => {
    const out = groupStickersFor(
      [completedTrip('t1', ['you', 'priya']), completedTrip('t2', ['you', 'priya'])],
      profile(),
    );
    expect(out.map((o) => o.sticker.id)).toContain('grp-squad-goals');
    expect(out[0].count).toBe(2);
  });

  it('stays locked after a single trip', () => {
    expect(groupStickersFor([completedTrip('t1', ['you', 'priya'])], profile())).toEqual([]);
  });

  it('treats a different crew as a different streak', () => {
    const out = groupStickersFor(
      [completedTrip('t1', ['you', 'priya']), completedTrip('t2', ['you', 'sam'])],
      profile(),
    );
    expect(out).toEqual([]);
  });

  it('ignores trips still in progress', () => {
    const inProgress = { ...completedTrip('t2', ['you', 'priya']), stage: 'active' as const };
    expect(groupStickersFor([completedTrip('t1', ['you', 'priya']), inProgress], profile())).toEqual([]);
  });
});

describe('careState', () => {
  const now = new Date('2026-04-10T12:00:00Z');

  it('is hungry when never fed', () => {
    expect(careState(profile(), now)).toBe('hungry');
  });

  it('is happy just after feeding', () => {
    const p = profile();
    p.mascot.lastFedAt = '2026-04-10T09:00:00Z';
    expect(careState(p, now)).toBe('happy');
  });

  it('drifts to neutral then hungry as time passes', () => {
    const p = profile();
    p.mascot.lastFedAt = '2026-04-09T12:00:00Z';
    expect(careState(p, now)).toBe('neutral');
    p.mascot.lastFedAt = '2026-04-08T00:00:00Z';
    expect(careState(p, now)).toBe('hungry');
  });
});

describe('collectionProgress', () => {
  it('counts earned against the full catalog', () => {
    const p = collectionProgress(profile(['st-kk-kinabalu']));
    expect(p.earned).toBe(1);
    expect(p.total).toBe(STICKER_CATALOG.length);
  });
});
