import { describe, expect, it } from 'vitest';
import { localItinerary, localParseBooking, scheduleDay } from '../../services/ai';
import { findDestination } from '../../data/destinations';
import { daysBetween } from '../dates';
import type { Activity, Member, Trip } from '../../types';

const kk = findDestination('kota-kinabalu')!;

function member(id: string, pace: 'chill' | 'balanced' | 'packed', mustDos: string[] = []): Member {
  return {
    id, name: id, joinedAt: '2026-01-01T00:00:00Z', availability: [],
    availabilitySubmitted: true,
    quiz: { budget: 1200, pace, interests: ['nature', 'food'], mustDos },
    costContributed: 0, role: 'member', avatarColor: '#000', language: 'en',
  };
}

function trip(members: Member[], start = '2026-04-10', end = '2026-04-14'): Trip {
  return {
    id: 't1', destinationId: kk.id, destinationName: kk.name, countryCode: 'MY',
    mode: 'group', createdBy: 'a', inviteCode: 'XX', respondBy: null, seasonWindow: null,
    dates: { start, end }, datesConfirmed: true, outsideRecommendedSeason: false,
    budgetCap: 4000, currency: 'MYR', categoryCaps: {}, members, days: [],
    costItems: [], votes: [], media: [], visits: [], checkIns: [], stage: 'planning',
    localLanguage: 'ms', translationEnabled: false, createdAt: '2026-01-01',
  };
}

describe('localItinerary', () => {
  it('produces one day per date in the range', () => {
    const t = trip([member('a', 'balanced')]);
    const days = localItinerary(t, kk);
    expect(days).toHaveLength(daysBetween('2026-04-10', '2026-04-14') + 1);
    expect(days[0].date).toBe('2026-04-10');
    expect(days[days.length - 1].date).toBe('2026-04-14');
  });

  it('never repeats a place across the trip', () => {
    const days = localItinerary(trip([member('a', 'packed')]), kk);
    const poiIds = days.flatMap((d) => d.activities.map((a) => a.poiId).filter(Boolean));
    expect(new Set(poiIds).size).toBe(poiIds.length);
  });

  it('includes a regional food stop every day, arrival and departure included', () => {
    const days = localItinerary(trip([member('a', 'balanced')]), kk);
    for (const day of days) {
      expect(day.activities.some((a) => a.dishId)).toBe(true);
    }
  });

  it('keeps arrival and departure days light', () => {
    const days = localItinerary(trip([member('a', 'packed')]), kk);
    expect(days[0].activities.length).toBeLessThanOrEqual(2);
    expect(days[days.length - 1].activities.length).toBeLessThanOrEqual(2);
    expect(days[0].note).toMatch(/Arrival/);
  });

  it('gives a packed group more stops than a chill one', () => {
    const chill = localItinerary(trip([member('a', 'chill')]), kk);
    const packed = localItinerary(trip([member('b', 'packed')]), kk);
    const count = (ds: typeof chill) => ds.reduce((s, d) => s + d.activities.length, 0);
    expect(count(packed)).toBeGreaterThan(count(chill));
  });

  it('honours a must-do and tags who asked for it', () => {
    const days = localItinerary(trip([member('priya', 'balanced', ['Mount Kinabalu'])]), kk);
    const kinabalu = days.flatMap((d) => d.activities).find((a) => a.poiId === 'kk-kinabalu');
    expect(kinabalu).toBeDefined();
    expect(kinabalu!.mustDoFor).toBe('priya');
  });

  it('matches a loosely-worded must-do', () => {
    const days = localItinerary(trip([member('sam', 'balanced', ['the floating city mosque'])]), kk);
    const mosque = days.flatMap((d) => d.activities).find((a) => a.poiId === 'kk-city-mosque');
    expect(mosque?.mustDoFor).toBe('sam');
  });

  it('returns nothing when dates are not confirmed', () => {
    const t = { ...trip([member('a', 'balanced')]), dates: null };
    expect(localItinerary(t, kk)).toEqual([]);
  });

  it('orders each day so start times run forwards', () => {
    const days = localItinerary(trip([member('a', 'balanced')]), kk);
    for (const day of days) {
      const times = day.activities.map((a) => a.start);
      expect([...times].sort()).toEqual(times);
    }
  });
});

describe('scheduleDay', () => {
  function act(id: string, lat: number, lng: number, durationMin = 60): Activity {
    return {
      id, name: id, description: '', address: '', lat, lng, start: '00:00',
      durationMin, cost: 0, category: 'activities', source: 'ai', icon: '📍',
    };
  }

  it('leaves travel time between consecutive stops', () => {
    const out = scheduleDay([act('a', 5.98, 116.07, 60), act('b', 6.01, 116.11, 60)]);
    const [h1, m1] = out[0].start.split(':').map(Number);
    const [h2, m2] = out[1].start.split(':').map(Number);
    // 60 minutes of activity plus a real travel leg on top.
    expect(h2 * 60 + m2 - (h1 * 60 + m1)).toBeGreaterThan(60);
  });

  it('pushes a closing food stop to a sensible dinner hour', () => {
    const food: Activity = { ...act('dinner', 5.98, 116.07, 75), category: 'food' };
    const out = scheduleDay([act('a', 5.98, 116.07, 60), food]);
    expect(out[out.length - 1].start >= '18:00').toBe(true);
  });

  it('starts the day at 09:00', () => {
    expect(scheduleDay([act('a', 5.98, 116.07)])[0].start).toBe('09:00');
  });
});

describe('localParseBooking', () => {
  it('pulls flight details out of an airline confirmation', () => {
    const raw = [
      'AirAsia Booking Confirmation',
      'Booking reference: QR7K2M',
      'Flight AK5110  KUL → BKI',
      '2026-04-10  06:45  09:20',
      'Total paid: MYR 412.60',
    ].join('\n');
    const b = localParseBooking(raw, 'MYR');
    expect(b.kind).toBe('flight');
    expect(b.flightNumber).toBe('AK5110');
    expect(b.from).toBe('KUL');
    expect(b.to).toBe('BKI');
    expect(b.departDate).toBe('2026-04-10');
    expect(b.departTime).toBe('06:45');
    expect(b.cost).toBeCloseTo(412.6);
    expect(b.currency).toBe('MYR');
    expect(b.reference).toBe('QR7K2M');
  });

  it('recognises a hotel confirmation and its stay dates', () => {
    const raw = [
      'Jesselton Waterfront Suites',
      'Confirmation: HTL9921',
      'Check-in 2026-04-10, check-out 2026-04-14',
      'Address: 12 Jalan Haji Saman, Kota Kinabalu',
      'Room total RM 1,240.00',
    ].join('\n');
    const b = localParseBooking(raw, 'MYR');
    expect(b.kind).toBe('hotel');
    expect(b.checkIn).toBe('2026-04-10');
    expect(b.checkOut).toBe('2026-04-14');
    expect(b.address).toContain('Jalan Haji Saman');
    expect(b.cost).toBe(1240);
  });

  it('picks up a JPY amount from a yen symbol', () => {
    const b = localParseBooking('ANA NH802\n2026-05-02 10:15 16:40\nTotal ¥86,400', 'MYR');
    expect(b.currency).toBe('JPY');
    expect(b.cost).toBe(86400);
  });

  it('degrades gracefully on text it cannot read', () => {
    const b = localParseBooking('thanks for booking with us!', 'MYR');
    expect(b.cost).toBe(0);
    expect(b.currency).toBe('MYR');
    expect(b.reference).toBe('UNKNOWN');
  });
});
