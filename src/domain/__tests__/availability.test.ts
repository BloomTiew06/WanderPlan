import { describe, expect, it } from 'vitest';
import { findOverlap, isOutsideSeason, toRanges, trimToLength } from '../availability';
import type { Member } from '../../types';

function member(id: string, ranges: [string, string][], submitted = true): Member {
  return {
    id,
    name: id,
    joinedAt: '2026-01-01T00:00:00Z',
    availability: ranges.map(([start, end]) => ({ start, end })),
    availabilitySubmitted: submitted,
    quiz: null,
    costContributed: 0,
    role: 'member',
    avatarColor: '#000',
    language: 'en',
  };
}

describe('findOverlap', () => {
  it('finds the window everyone shares', () => {
    const res = findOverlap([
      member('a', [['2026-06-10', '2026-06-20']]),
      member('b', [['2026-06-12', '2026-06-25']]),
      member('c', [['2026-06-12', '2026-06-18']]),
    ]);
    expect(res.full).toBe(true);
    expect(res.window).toEqual({ start: '2026-06-12', end: '2026-06-18' });
    expect(res.missing).toEqual([]);
  });

  it('falls back to the best partial overlap and names who would miss out', () => {
    const res = findOverlap([
      member('a', [['2026-06-01', '2026-06-10']]),
      member('b', [['2026-06-05', '2026-06-14']]),
      member('c', [['2026-08-01', '2026-08-10']]),
    ]);
    expect(res.full).toBe(false);
    expect(res.window).toEqual({ start: '2026-06-05', end: '2026-06-10' });
    expect(res.missing.map((m) => m.memberId)).toEqual(['c']);
    expect(res.missing[0].dates.length).toBe(6);
  });

  it('treats non-responders as no restriction rather than blocking', () => {
    const res = findOverlap([
      member('a', [['2026-06-10', '2026-06-20']]),
      member('b', [['2026-06-12', '2026-06-22']]),
      member('slow', [], false),
    ]);
    expect(res.nonResponders).toEqual(['slow']);
    expect(res.full).toBe(true);
    expect(res.window).toEqual({ start: '2026-06-12', end: '2026-06-20' });
  });

  it('returns nothing when nobody has submitted', () => {
    const res = findOverlap([member('a', [], false), member('b', [], false)]);
    expect(res.window).toBeNull();
    expect(res.nonResponders).toHaveLength(2);
  });

  it('handles fragmented availability with gaps', () => {
    const res = findOverlap([
      member('a', [['2026-07-01', '2026-07-05'], ['2026-07-10', '2026-07-20']]),
      member('b', [['2026-07-03', '2026-07-04'], ['2026-07-12', '2026-07-18']]),
    ]);
    expect(res.full).toBe(true);
    // The 3-day minimum rules out the 2-day July 3–4 overlap.
    expect(res.window).toEqual({ start: '2026-07-12', end: '2026-07-18' });
  });

  it('prefers the recommended season when windows are otherwise equal', () => {
    const res = findOverlap(
      [
        member('a', [['2026-03-01', '2026-03-07'], ['2026-11-01', '2026-11-07']]),
        member('b', [['2026-03-01', '2026-03-07'], ['2026-11-01', '2026-11-07']]),
      ],
      { preferredMonths: [2] },
    );
    expect(res.window?.start).toBe('2026-03-01');
  });

  it('ignores windows shorter than the minimum', () => {
    const res = findOverlap(
      [member('a', [['2026-06-01', '2026-06-02']]), member('b', [['2026-06-01', '2026-06-02']])],
      { minDays: 3 },
    );
    expect(res.window).toBeNull();
  });
});

describe('toRanges', () => {
  it('collapses contiguous days and splits on gaps', () => {
    expect(toRanges(['2026-01-02', '2026-01-01', '2026-01-03', '2026-01-06'])).toEqual([
      { start: '2026-01-01', end: '2026-01-03' },
      { start: '2026-01-06', end: '2026-01-06' },
    ]);
  });

  it('de-duplicates', () => {
    expect(toRanges(['2026-01-01', '2026-01-01'])).toEqual([
      { start: '2026-01-01', end: '2026-01-01' },
    ]);
  });
});

describe('trimToLength', () => {
  it('centres a shorter trip inside a longer window', () => {
    expect(trimToLength({ start: '2026-06-01', end: '2026-06-10' }, 4)).toEqual({
      start: '2026-06-04',
      end: '2026-06-07',
    });
  });

  it('leaves a window that is already short enough alone', () => {
    const r = { start: '2026-06-01', end: '2026-06-03' };
    expect(trimToLength(r, 5)).toBe(r);
  });
});

describe('isOutsideSeason', () => {
  it('flags a window mostly outside the recommended months', () => {
    // October window against a Mar–May recommendation.
    expect(isOutsideSeason({ start: '2026-10-01', end: '2026-10-07' }, [2, 3, 4])).toBe(true);
  });

  it('does not flag a window inside the recommended months', () => {
    expect(isOutsideSeason({ start: '2026-04-01', end: '2026-04-07' }, [2, 3, 4])).toBe(false);
  });

  it('never flags when there is no seasonal data', () => {
    expect(isOutsideSeason({ start: '2026-10-01', end: '2026-10-07' }, [])).toBe(false);
  });
});
