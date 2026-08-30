import { describe, expect, it } from 'vitest';
import {
  clusterByDistance,
  estimateLeg,
  haversineKm,
  isPositioned,
  sortByProximity,
  totalDistanceKm,
} from '../geo';
import type { Activity } from '../../types';

const KL = { lat: 3.139, lng: 101.6869 };
const SINGAPORE = { lat: 1.3521, lng: 103.8198 };
const KK = { lat: 5.9804, lng: 116.0735 };

describe('haversineKm', () => {
  it('matches the known KL–Singapore distance', () => {
    // ~309 km great-circle between these two city-centre points.
    expect(haversineKm(KL, SINGAPORE)).toBeGreaterThan(305);
    expect(haversineKm(KL, SINGAPORE)).toBeLessThan(315);
  });

  it('is zero for the same point and symmetric otherwise', () => {
    expect(haversineKm(KL, KL)).toBe(0);
    expect(haversineKm(KL, KK)).toBeCloseTo(haversineKm(KK, KL), 6);
  });
});

describe('estimateLeg', () => {
  it('calls a short hop a walk', () => {
    const leg = estimateLeg({ lat: 5.9804, lng: 116.0735 }, { lat: 5.9836, lng: 116.0793 });
    expect(leg.mode).toBe('walk');
    expect(leg.impractical).toBe(false);
  });

  it('calls a cross-city hop transit', () => {
    expect(estimateLeg({ lat: 5.9804, lng: 116.0735 }, { lat: 6.0086, lng: 116.1094 }).mode)
      .toBe('transit');
  });

  it('flags a hop hours away as impractical', () => {
    const leg = estimateLeg(KK, { lat: 5.4239, lng: 115.7069 });
    expect(leg.mode).toBe('ride');
    expect(leg.impractical).toBe(true);
  });

  it('never returns a sub-3-minute leg', () => {
    expect(estimateLeg(KL, { lat: 3.1391, lng: 101.687 }).minutes).toBeGreaterThanOrEqual(3);
  });
});

function act(id: string, lat: number, lng: number, locked = false): Activity {
  return {
    id, name: id, description: '', address: '', lat, lng, start: '09:00',
    durationMin: 60, cost: 0, category: 'activities', source: 'ai', icon: '📍', locked,
  };
}

describe('sortByProximity', () => {
  it('orders stops nearest-neighbour from the first', () => {
    const out = sortByProximity([
      act('a', 5.98, 116.07),
      act('far', 6.05, 116.22),
      act('near', 5.99, 116.08),
      act('mid', 6.01, 116.11),
    ]);
    expect(out.map((a) => a.id)).toEqual(['a', 'near', 'mid', 'far']);
  });

  it('keeps locked bookings pinned at the front', () => {
    const out = sortByProximity([
      act('a', 5.98, 116.07),
      act('hotel', 6.05, 116.22, true),
      act('near', 5.99, 116.08),
    ]);
    expect(out[0].id).toBe('hotel');
  });

  it('leaves a one- or two-stop day alone', () => {
    const input = [act('a', 1, 1), act('b', 2, 2)];
    expect(sortByProximity(input).map((a) => a.id)).toEqual(['a', 'b']);
  });
});

describe('clusterByDistance', () => {
  it('groups nearby spots and separates distant ones', () => {
    const clusters = clusterByDistance([
      { id: 'kk1', lat: 5.980, lng: 116.073 },
      { id: 'kk2', lat: 5.984, lng: 116.079 },
      { id: 'klias', lat: 5.424, lng: 115.707 },
    ], 6);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].map((c) => c.id).sort()).toEqual(['kk1', 'kk2']);
    expect(clusters[1].map((c) => c.id)).toEqual(['klias']);
  });

  it('respects the per-day cap even when everything is close', () => {
    const pts = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, lat: 5.98 + i * 0.001, lng: 116.07 }));
    const clusters = clusterByDistance(pts, 6, 3);
    expect(clusters.every((c) => c.length <= 3)).toBe(true);
    expect(clusters.flat()).toHaveLength(7);
  });

  it('returns nothing for no input', () => {
    expect(clusterByDistance([])).toEqual([]);
  });
});

describe('totalDistanceKm', () => {
  it('sums consecutive hops', () => {
    expect(totalDistanceKm([KL, SINGAPORE, KL])).toBeCloseTo(2 * Math.round(haversineKm(KL, SINGAPORE)), -1);
  });

  it('is zero for a single point', () => {
    expect(totalDistanceKm([KL])).toBe(0);
  });

  it('ignores unpositioned points instead of routing via Null Island', () => {
    const withGap = totalDistanceKm([KK, { lat: 0, lng: 0 }, { lat: 5.99, lng: 116.08 }]);
    // KK to a point a kilometre away — not a 26,000 km round trip to 0,0.
    expect(withGap).toBeLessThan(5);
  });
});

describe('isPositioned', () => {
  it('treats exactly 0,0 as a missing coordinate', () => {
    expect(isPositioned({ lat: 0, lng: 0 })).toBe(false);
    expect(isPositioned(KL)).toBe(true);
    expect(isPositioned({ lat: 0, lng: 0.5 })).toBe(true);
  });
});
