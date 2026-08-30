import type { Activity } from '../types';

export interface Point {
  lat: number;
  lng: number;
}

/** Great-circle distance in km. */
export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

export type TravelMode = 'walk' | 'transit' | 'ride';

export interface Leg {
  km: number;
  minutes: number;
  mode: TravelMode;
  /** True when this hop is long enough to be worth flagging. */
  impractical: boolean;
}

/**
 * Stand-in for a maps directions call. Real speeds vary wildly; these averages
 * are close enough to sort a day sensibly and to flag genuinely silly hops.
 */
export function estimateLeg(a: Point, b: Point): Leg {
  const km = haversineKm(a, b);
  // Straight-line distance underestimates real routes; 1.35 is the usual fudge.
  const routeKm = km * 1.35;
  let mode: TravelMode;
  let speed: number;
  if (routeKm < 1.2) {
    mode = 'walk';
    speed = 4.5;
  } else if (routeKm < 12) {
    mode = 'transit';
    speed = 18;
  } else {
    mode = 'ride';
    speed = 40;
  }
  const minutes = Math.max(3, Math.round((routeKm / speed) * 60));
  return { km: Math.round(routeKm * 10) / 10, minutes, mode, impractical: minutes > 90 };
}

/** Sort a day's activities by proximity, nearest-neighbour from the first stop. */
export function sortByProximity(activities: Activity[]): Activity[] {
  const locked = activities.filter((a) => a.locked);
  const free = activities.filter((a) => !a.locked);
  if (free.length <= 2) return [...locked, ...free];
  const out: Activity[] = [free[0]];
  const rest = free.slice(1);
  while (rest.length) {
    const last = out[out.length - 1];
    let bestIdx = 0;
    let bestKm = Infinity;
    rest.forEach((c, i) => {
      const km = haversineKm(last, c);
      if (km < bestKm) {
        bestKm = km;
        bestIdx = i;
      }
    });
    out.push(rest.splice(bestIdx, 1)[0]);
  }
  return [...locked, ...out];
}

export interface Cluster {
  centroid: Point;
  items: (Point & { id: string })[];
}

/**
 * Distance-based clustering for social-sourced spots (section 3d): grow a
 * cluster while everything stays within `radiusKm` of its centroid, so each
 * cluster is roughly "one day's worth of walking around".
 */
export function clusterByDistance<T extends Point & { id: string }>(
  points: T[],
  radiusKm = 6,
  maxPerCluster = 4,
): T[][] {
  const remaining = [...points];
  const clusters: T[][] = [];
  while (remaining.length) {
    const seed = remaining.shift()!;
    const cluster: T[] = [seed];
    let centroid: Point = seed;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (cluster.length >= maxPerCluster) break;
      if (haversineKm(centroid, remaining[i]) <= radiusKm) {
        cluster.push(remaining.splice(i, 1)[0]);
        centroid = {
          lat: cluster.reduce((s, p) => s + p.lat, 0) / cluster.length,
          lng: cluster.reduce((s, p) => s + p.lng, 0) / cluster.length,
        };
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/** A point at exactly 0,0 is a missing coordinate, not a place in the Atlantic. */
export function isPositioned(p: Point): boolean {
  return p.lat !== 0 || p.lng !== 0;
}

/** Rough kilometres travelled across a list of visited coordinates. */
export function totalDistanceKm(points: Point[]): number {
  const real = points.filter(isPositioned);
  let sum = 0;
  for (let i = 1; i < real.length; i++) sum += haversineKm(real[i - 1], real[i]);
  return Math.round(sum);
}

/** Equirectangular projection to 0..100 percentage coords for the SVG map. */
export function projectToPercent(p: Point): { x: number; y: number } {
  return { x: ((p.lng + 180) / 360) * 100, y: ((90 - p.lat) / 180) * 100 };
}
