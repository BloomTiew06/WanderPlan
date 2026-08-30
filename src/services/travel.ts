/**
 * Flights, stays and rides.
 *
 * Live search would go through Amadeus self-service (flights/hotels) and Grab
 * or Uber (rides). All three are behind the same interface as the mocked data
 * below so swapping in a real key is a one-file change, and the demo has a
 * working path if a key doesn't come through in time.
 */

import type { DateRange } from '../types';
import type { Destination } from '../data/destinations';
import { daysBetween } from '../domain/dates';

export const LIVE_SEARCH = Boolean((import.meta as any).env?.VITE_AMADEUS_ENDPOINT);

export interface FlightOffer {
  id: string;
  airline: string;
  code: string;
  from: string;
  to: string;
  departTime: string;
  arriveTime: string;
  stops: number;
  durationMin: number;
  price: number;
  currency: string;
}

export interface StayOffer {
  id: string;
  name: string;
  area: string;
  rating: number;
  reviews: number;
  perNight: number;
  currency: string;
  amenities: string[];
  lat: number;
  lng: number;
}

const AIRLINES: Record<string, { airline: string; code: string }[]> = {
  MY: [
    { airline: 'AirAsia', code: 'AK' },
    { airline: 'Malaysia Airlines', code: 'MH' },
    { airline: 'Batik Air Malaysia', code: 'OD' },
  ],
  JP: [
    { airline: 'ANA', code: 'NH' },
    { airline: 'Japan Airlines', code: 'JL' },
    { airline: 'Scoot', code: 'TR' },
  ],
};

const AIRPORTS: Record<string, string> = { 'kota-kinabalu': 'BKI', tokyo: 'HND', penang: 'PEN' };

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export async function searchFlights(
  dest: Destination,
  origin: string,
  dates: DateRange,
): Promise<FlightOffer[]> {
  await delay();
  const rng = seeded(`${dest.id}${origin}${dates.start}`);
  const pool = AIRLINES[dest.countryCode] ?? AIRLINES.MY;
  const base = dest.countryCode === 'JP' ? 1650 : 320;
  return pool
    .flatMap((a, i) => {
      const stops = i === 0 ? 0 : Math.round(rng());
      const durationMin = (dest.countryCode === 'JP' ? 420 : 165) + stops * 95 + Math.round(rng() * 40);
      const depHour = 6 + Math.floor(rng() * 12);
      const price = Math.round((base + rng() * base * 0.7 - stops * base * 0.12) / 5) * 5;
      const arrive = (depHour * 60 + durationMin) % 1440;
      return [{
        id: `fl-${dest.id}-${a.code}-${i}`,
        airline: a.airline,
        code: `${a.code}${100 + Math.floor(rng() * 800)}`,
        from: origin,
        to: AIRPORTS[dest.id] ?? dest.city.slice(0, 3).toUpperCase(),
        departTime: `${String(depHour).padStart(2, '0')}:${rng() > 0.5 ? '30' : '05'}`,
        arriveTime: `${String(Math.floor(arrive / 60)).padStart(2, '0')}:${String(arrive % 60).padStart(2, '0')}`,
        stops,
        durationMin,
        price,
        currency: dest.currency,
      }];
    })
    .sort((a, b) => a.price - b.price);
}

const STAY_NAMES: Record<string, { name: string; area: string; lat: number; lng: number }[]> = {
  'kota-kinabalu': [
    { name: 'Jesselton Waterfront Suites', area: 'City Centre', lat: 5.9812, lng: 116.0741 },
    { name: 'Tanjung Aru Beach Lodge', area: 'Tanjung Aru', lat: 5.9455, lng: 116.0480 },
    { name: 'Signal Hill Hostel', area: 'Old Town', lat: 5.9840, lng: 116.0788 },
    { name: 'Likas Bay Resort', area: 'Likas', lat: 6.0090, lng: 116.1100 },
  ],
  tokyo: [
    { name: 'Shinjuku Station Hotel', area: 'Shinjuku', lat: 35.6900, lng: 139.7000 },
    { name: 'Asakusa Ryokan Kikuya', area: 'Asakusa', lat: 35.7130, lng: 139.7960 },
    { name: 'Shibuya Pod Capsule', area: 'Shibuya', lat: 35.6600, lng: 139.7020 },
    { name: 'Ueno Garden Inn', area: 'Ueno', lat: 35.7140, lng: 139.7760 },
  ],
  penang: [
    { name: 'Armenian Street Heritage House', area: 'George Town', lat: 5.4167, lng: 100.3380 },
    { name: 'Gurney Bayview Hotel', area: 'Gurney', lat: 5.4368, lng: 100.3100 },
    { name: 'Batu Ferringhi Beach Resort', area: 'Batu Ferringhi', lat: 5.4728, lng: 100.2452 },
  ],
};

export async function searchStays(dest: Destination, dates: DateRange): Promise<StayOffer[]> {
  await delay();
  const nights = Math.max(1, daysBetween(dates.start, dates.end));
  const rng = seeded(`${dest.id}stay${dates.start}${nights}`);
  const amenityPool = ['Free WiFi', 'Breakfast', 'Pool', 'Airport shuttle', 'Laundry', 'Kitchen', 'Gym'];
  return (STAY_NAMES[dest.id] ?? STAY_NAMES['kota-kinabalu'])
    .map((s, i) => {
      const base = dest.countryCode === 'JP' ? 9000 : 130;
      return {
        id: `st-${dest.id}-${i}`,
        ...s,
        rating: Math.round((3.8 + rng() * 1.2) * 10) / 10,
        reviews: 120 + Math.floor(rng() * 1800),
        perNight: Math.round((base + rng() * base * 1.4) / 5) * 5,
        currency: dest.currency,
        amenities: amenityPool.filter(() => rng() > 0.55).slice(0, 3),
      };
    })
    .sort((a, b) => a.perNight - b.perNight);
}

export interface RideOffer {
  id: string;
  provider: string;
  tier: string;
  seats: number;
  etaMin: number;
  price: number;
  currency: string;
}

export async function searchRides(dest: Destination, km: number, riders: number): Promise<RideOffer[]> {
  await delay(350);
  if (!dest.rideHailing) return [];
  const rng = seeded(`${dest.id}${km.toFixed(1)}${riders}`);
  const perKm = dest.countryCode === 'JP' ? 320 : 1.8;
  const flag = dest.countryCode === 'JP' ? 500 : 4;
  const tiers = [
    { tier: 'Standard', seats: 4, mult: 1 },
    { tier: 'Comfort', seats: 4, mult: 1.35 },
    { tier: 'XL', seats: 6, mult: 1.7 },
  ].filter((t) => t.seats >= riders);
  return tiers.map((t, i) => ({
    id: `ride-${i}`,
    provider: dest.rideHailing!,
    tier: t.tier,
    seats: t.seats,
    etaMin: 2 + Math.floor(rng() * 8),
    price: Math.round((flag + km * perKm) * t.mult),
    currency: dest.currency,
  }));
}

/** Flight status polling — mocked, but the shape a real status API returns. */
export type FlightStatus = 'on-time' | 'delayed' | 'gate-change' | 'cancelled';

export interface StatusUpdate {
  flightNumber: string;
  status: FlightStatus;
  message: string;
  at: string;
}

export function pollFlightStatus(flightNumber: string, tick: number): StatusUpdate | null {
  // Deliberately quiet most of the time; the demo triggers a delay on tick 2.
  if (tick !== 2) return null;
  return {
    flightNumber,
    status: 'delayed',
    message: `${flightNumber} is delayed 1h 25m. Your first activity now starts before you land.`,
    at: new Date().toISOString(),
  };
}

function delay(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
