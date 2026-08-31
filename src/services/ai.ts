/**
 * AI service layer.
 *
 * Everything here follows the same structured-JSON-in / structured-JSON-out
 * shape described in the proposal. If `VITE_AI_ENDPOINT` is configured the
 * request goes to that endpoint (a thin server-side proxy holding the API key —
 * never ship a model key to the browser). With no endpoint configured, each
 * function falls back to a deterministic local planner so the whole app is
 * demo-able offline and on stage.
 *
 * The prompts are kept next to their fallbacks on purpose: the fallback is
 * meant to produce the same shape the prompt asks for, so swapping one for the
 * other changes nothing downstream.
 */

import type { Activity, CostCategory, Day, InterestTag, Member, Trip } from '../types';
import type { Destination, MonthProfile, Poi } from '../data/destinations';
import { addDays, daysBetween } from '../domain/dates';
import { estimateLeg, sortByProximity } from '../domain/geo';
import { buildSnapshot } from '../domain/preferences';

const ENDPOINT = (import.meta as any).env?.VITE_AI_ENDPOINT as string | undefined;

export const AI_MODE: 'live' | 'local' = ENDPOINT ? 'live' : 'local';

interface ModelCall<T> {
  system: string;
  user: unknown;
  /** Runs when no endpoint is configured, or when the call fails. */
  fallback: () => T;
}

async function callModel<T>({ system, user, fallback }: ModelCall<T>): Promise<T> {
  if (!ENDPOINT) return withLatency(fallback);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, input: user }),
    });
    if (!res.ok) throw new Error(`AI endpoint ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[ai] falling back to the local planner:', err);
    return withLatency(fallback);
  }
}

/** A beat of latency so the loading states are visible in the demo. */
function withLatency<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fn()), 550));
}

let seq = 0;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

// ---------------------------------------------------------------------------
// Best time to visit
// ---------------------------------------------------------------------------

const BEST_TIME_SYSTEM = `You summarise when to visit a destination.
Return JSON only: {"months":[{"month":0-11,"rating":"ideal|good|ok|avoid","weather":string,"crowds":"low|medium|high","price":"low|medium|high","note":string?}]}.
Cover all twelve months. Keep weather to one clause with a temperature range. Flag monsoon, typhoon, and festival periods in "note".`;

export async function fetchBestTime(destinationName: string, curated?: MonthProfile[]): Promise<MonthProfile[]> {
  return callModel<MonthProfile[]>({
    system: BEST_TIME_SYSTEM,
    user: { destination: destinationName },
    fallback: () => curated ?? genericYear(),
  });
}

function genericYear(): MonthProfile[] {
  return Array.from({ length: 12 }, (_, month) => ({
    month,
    rating: 'ok' as const,
    weather: 'No seasonal data on file for this destination yet',
    crowds: 'medium' as const,
    price: 'medium' as const,
  }));
}

// ---------------------------------------------------------------------------
// Itinerary generation
// ---------------------------------------------------------------------------

const ITINERARY_SYSTEM = `You are a trip planner. Given a destination, dates, a group budget and an aggregated preference profile, return a day-by-day itinerary.
Return JSON only: {"days":[{"date":"YYYY-MM-DD","activities":[{"name":string,"description":string,"address":string,"lat":number,"lng":number,"start":"HH:mm","durationMin":number,"cost":number,"category":"flights|accommodation|food|activities|transport|other"}]}]}.
Constraints: keep each day geographically coherent, respect the stated pace (chill 3 / balanced 4 / packed 5 stops per day), include one regional food stop per day, keep the total inside the group budget, and never move an activity marked locked.`;

interface ScoredPoi {
  poi: Poi;
  score: number;
  mustDoFor?: string;
}

const PACE_STOPS = { chill: 3, balanced: 4, packed: 5 } as const;

function scorePois(dest: Destination, members: Member[]): ScoredPoi[] {
  const snap = buildSnapshot(members);
  const weight = new Map<InterestTag, number>();
  for (const { tag, share } of snap.interestCounts) weight.set(tag, share);

  const scored: ScoredPoi[] = dest.pois.map((poi) => {
    let score = 0.4;
    for (const t of poi.interests) score += weight.get(t) ?? 0;
    if (poi.landmark) score += 0.35;
    // Nudge expensive stops down when the group is budget-conscious.
    const perDayBudget = snap.avgBudget > 0 ? snap.avgBudget / 6 : Infinity;
    if (poi.cost > perDayBudget) score -= 0.3;
    return { poi, score };
  });

  // Must-dos win outright. Match loosely — people type "the floating mosque".
  for (const md of snap.mustDos) {
    const target = normalise(md.text);
    const hit = scored.find(
      (s) =>
        normalise(s.poi.name).includes(target) ||
        target.includes(normalise(s.poi.name)) ||
        overlapWords(normalise(s.poi.name), target) >= 2,
    );
    if (hit) {
      hit.score += 10;
      hit.mustDoFor = md.memberId;
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function overlapWords(a: string, b: string): number {
  const bs = new Set(b.split(' ').filter((w) => w.length > 3));
  return a.split(' ').filter((w) => w.length > 3 && bs.has(w)).length;
}

const SLOT_TIMES = ['09:00', '12:00', '15:00', '19:00'];

function toActivity(poi: Poi, start: string, mustDoFor?: string): Activity {
  return {
    id: nextId('act'),
    name: poi.name,
    description: poi.description,
    address: poi.address,
    lat: poi.lat,
    lng: poi.lng,
    start,
    durationMin: poi.durationMin,
    cost: poi.cost,
    category: poi.category,
    source: 'ai',
    poiId: poi.id,
    icon: poi.icon,
    mustDoFor,
  };
}

function dishActivity(dest: Destination, index: number): Activity {
  const dish = dest.dishes[index % dest.dishes.length];
  return {
    id: nextId('act'),
    name: dish.name,
    description: dish.description,
    address: dish.venue,
    lat: dish.lat,
    lng: dish.lng,
    start: '19:30',
    durationMin: 75,
    cost: dish.cost,
    category: 'food' as CostCategory,
    source: 'ai',
    dishId: dish.id,
    icon: dish.icon,
  };
}

/** Lay out start times down a day, respecting durations and travel between stops. */
export function scheduleDay(activities: Activity[]): Activity[] {
  const ordered = sortByProximity(activities);
  let clock = 9 * 60;
  return ordered.map((a, i) => {
    if (i > 0) {
      const leg = estimateLeg(ordered[i - 1], a);
      clock += leg.minutes;
    }
    // Nudge evening food stops to a sensible hour rather than 3pm dinner.
    if (a.category === 'food' && i === ordered.length - 1 && clock < 18 * 60) clock = 18 * 60 + 30;
    // Clamp rather than wrap: a day that overruns should read 23:00, not 00:30,
    // which would sort to the top and make the day look scrambled.
    clock = Math.min(clock, 23 * 60);
    const start = `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}`;
    clock += a.durationMin;
    return { ...a, start };
  });
}

export async function generateItinerary(trip: Trip, dest: Destination): Promise<Day[]> {
  return callModel<Day[]>({
    system: ITINERARY_SYSTEM,
    user: {
      destination: dest.name,
      dates: trip.dates,
      currency: trip.currency,
      budgetCap: trip.budgetCap,
      groupSize: trip.members.length,
      profile: buildSnapshot(trip.members),
      decidedPace: trip.decidedPace ?? null,
    },
    fallback: () => localItinerary(trip, dest),
  });
}

export function localItinerary(trip: Trip, dest: Destination): Day[] {
  if (!trip.dates) return [];
  const snap = buildSnapshot(trip.members);
  // A settled vote beats the raw aggregate: the group has already had this
  // argument and the itinerary should reflect what they landed on.
  const stops = PACE_STOPS[trip.decidedPace ?? snap.dominantPace] ?? 4;
  const dayCount = daysBetween(trip.dates.start, trip.dates.end) + 1;
  const ranked = scorePois(dest, trip.members);

  // Arrival and departure days carry less: you land, and you leave. Sizing each
  // day up front rather than generating full days and trimming means a must-do
  // ranked to the top can never be the thing that gets cut.
  const edgeDay = (i: number) => dayCount > 1 && (i === 0 || i === dayCount - 1);
  const hasFullDays = dayCount > 2;
  /** Half a day or more of committed time — not something to land on an edge day. */
  const isBigOuting = (p: Poi) => p.durationMin > 180;
  const pool = [...ranked];
  const days: Day[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = addDays(trip.dates.start, i);
    const isEdge = edgeDay(i);
    const budgetStops = isEdge ? 2 : stops;
    const picked: Activity[] = [];
    const usedSlots = new Set<number>();
    for (let s = 0; s < pool.length && picked.length < budgetStops - 1; s++) {
      const cand = pool[s];
      // Keep the long day trips and the flagged must-dos off arrival and
      // departure days: those are the days most likely to be eaten by a delay,
      // and they're the ones we deliberately keep light.
      if (isEdge && hasFullDays && (cand.mustDoFor || isBigOuting(cand.poi))) continue;
      // Vary the shape of a day rather than stacking four museums before lunch,
      // unless the stop is a must-do, which always goes in.
      if (usedSlots.has(cand.poi.slot) && picked.length > 1 && !cand.mustDoFor) continue;
      usedSlots.add(cand.poi.slot);
      picked.push(toActivity(cand.poi, SLOT_TIMES[cand.poi.slot], cand.mustDoFor));
      pool.splice(s, 1);
      s--;
    }
    picked.push(dishActivity(dest, i));
    days.push({
      date,
      activities: scheduleDay(picked),
      note: i === 0 && dayCount > 1
        ? 'Arrival day — kept light on purpose.'
        : i === dayCount - 1 && dayCount > 1
          ? 'Departure day — nothing that can make you miss a flight.'
          : undefined,
    });
  }
  return days;
}

// ---------------------------------------------------------------------------
// Swap / regenerate
// ---------------------------------------------------------------------------

const SWAP_SYSTEM = `Given an existing itinerary and one activity to replace, propose three alternatives.
Return JSON only: {"alternatives":[{"name":string,"description":string,"address":string,"lat":number,"lng":number,"durationMin":number,"cost":number,"category":string}]}.
Alternatives must be within a short trip of the surrounding stops and must not duplicate anything already in the plan.`;

export async function swapAlternatives(trip: Trip, dest: Destination, activity: Activity): Promise<Activity[]> {
  return callModel<Activity[]>({
    system: SWAP_SYSTEM,
    user: { replacing: activity.name, plan: trip.days.map((d) => d.activities.map((a) => a.name)) },
    fallback: () => {
      const used = new Set(trip.days.flatMap((d) => d.activities.map((a) => a.poiId ?? a.name)));
      const ranked = scorePois(dest, trip.members).filter((s) => !used.has(s.poi.id));
      // Prefer things near the stop being replaced so the day still hangs together.
      const near = ranked
        .map((s) => ({ s, km: estimateLeg(activity, s.poi).km }))
        .sort((a, b) => a.km - b.km || b.s.score - a.s.score)
        .slice(0, 3);
      return near.map(({ s }) => toActivity(s.poi, activity.start, s.mustDoFor));
    },
  });
}

export async function regenerateDay(trip: Trip, dest: Destination, dayIndex: number): Promise<Day> {
  const day = trip.days[dayIndex];
  return callModel<Day>({
    system: ITINERARY_SYSTEM,
    user: { regenerate: day.date, keepLocked: day.activities.filter((a) => a.locked).map((a) => a.name) },
    fallback: () => {
      const snap = buildSnapshot(trip.members);
      const stops = PACE_STOPS[trip.decidedPace ?? snap.dominantPace] ?? 4;
      const locked = day.activities.filter((a) => a.locked);
      const usedElsewhere = new Set(
        trip.days.flatMap((d, i) => (i === dayIndex ? [] : d.activities.map((a) => a.poiId ?? ''))),
      );
      const sameDay = new Set(day.activities.map((a) => a.poiId ?? ''));
      const ranked = scorePois(dest, trip.members).filter(
        (s) => !usedElsewhere.has(s.poi.id) && !sameDay.has(s.poi.id),
      );
      const fresh = ranked.slice(0, Math.max(1, stops - 1 - locked.length))
        .map((s) => toActivity(s.poi, SLOT_TIMES[s.poi.slot], s.mustDoFor));
      const food = dishActivity(dest, dayIndex + trip.days.length);
      return {
        ...day,
        activities: scheduleDay([...locked, ...fresh, food]),
        note: 'Regenerated. Imported bookings stayed put.',
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Mid-trip replanning
// ---------------------------------------------------------------------------

const REPLAN_SYSTEM = `Something changed mid-trip. Rework only the remainder of the affected day (and following days if unavoidable), keeping the same budget and preference profile.
Return JSON only: {"days":[...same shape as the itinerary...],"summary":string}.
Do not touch activities already completed, and do not move anything marked locked.`;

export interface ReplanResult {
  day: Day;
  summary: string;
}

export async function replanDay(
  trip: Trip,
  dest: Destination,
  dayIndex: number,
  fromTime: string,
  reason: string,
): Promise<ReplanResult> {
  return callModel<ReplanResult>({
    system: REPLAN_SYSTEM,
    user: { day: trip.days[dayIndex]?.date, reason, fromTime },
    fallback: () => {
      const day = trip.days[dayIndex];
      const kept = day.activities.filter((a) => a.start < fromTime || a.locked);
      const dropped = day.activities.filter((a) => a.start >= fromTime && !a.locked);
      const usedIds = new Set(trip.days.flatMap((d) => d.activities.map((a) => a.poiId ?? '')));
      const indoorsWanted = /rain|storm|weather|wet|typhoon|monsoon/i.test(reason);
      const cheaperWanted = /expensive|cost|money|budget|over/i.test(reason);

      const ranked = scorePois(dest, trip.members)
        .filter((s) => !usedIds.has(s.poi.id))
        .filter((s) => (indoorsWanted ? !s.poi.interests.includes('nature') : true))
        .filter((s) => (cheaperWanted ? s.poi.cost <= (dropped[0]?.cost ?? Infinity) : true));

      const replacements = ranked.slice(0, Math.max(1, dropped.length))
        .map((s) => toActivity(s.poi, fromTime, s.mustDoFor));

      const summaryBits: string[] = [];
      if (dropped.length) summaryBits.push(`Dropped ${dropped.map((a) => a.name).join(', ')}`);
      if (replacements.length) summaryBits.push(`added ${replacements.map((a) => a.name).join(', ')}`);
      if (indoorsWanted) summaryBits.push('kept the replacements indoors');
      if (cheaperWanted) summaryBits.push('kept the replacements at or under the original cost');

      return {
        day: { ...day, activities: scheduleDay([...kept, ...replacements]), note: reason },
        summary: summaryBits.join(', ') + '.',
      };
    },
  });
}

// ---------------------------------------------------------------------------
// Booking confirmation parsing
// ---------------------------------------------------------------------------

const BOOKING_SYSTEM = `Extract booking details from a raw confirmation email or PDF text.
Return JSON only: {"kind":"flight|hotel","reference":string,"provider":string,"from":string?,"to":string?,"flightNumber":string?,"departDate":"YYYY-MM-DD"?,"departTime":"HH:mm"?,"arriveTime":"HH:mm"?,"checkIn":"YYYY-MM-DD"?,"checkOut":"YYYY-MM-DD"?,"address":string?,"cost":number,"currency":string}.
Handle any airline or hotel format. If a field is genuinely absent, omit it rather than guessing.`;

export interface ParsedBooking {
  kind: 'flight' | 'hotel';
  reference: string;
  provider: string;
  from?: string;
  to?: string;
  flightNumber?: string;
  departDate?: string;
  departTime?: string;
  arriveTime?: string;
  checkIn?: string;
  checkOut?: string;
  address?: string;
  cost: number;
  currency: string;
}

export async function parseBooking(raw: string, fallbackCurrency: string): Promise<ParsedBooking> {
  return callModel<ParsedBooking>({
    system: BOOKING_SYSTEM,
    user: { text: raw },
    fallback: () => localParseBooking(raw, fallbackCurrency),
  });
}

/**
 * Regex fallback. Deliberately forgiving — it only needs to cover the handful
 * of confirmation formats used in the demo, which is exactly the argument for
 * handing this to a model in production.
 */
export function localParseBooking(raw: string, fallbackCurrency: string): ParsedBooking {
  const text = raw.replace(/\r/g, '');
  const flightNo = text.match(/\b([A-Z]{2}\d{2,4})\b/)?.[1];
  const isHotel = /hotel|check[- ]?in|room|guesthouse|resort|hostel/i.test(text) && !flightNo;
  const money = text.match(/(?:MYR|RM|USD|JPY|SGD|EUR|GBP|\$|¥|€|£)\s?([\d,]+(?:\.\d{2})?)/i);
  const currency = text.match(/\b(MYR|USD|JPY|SGD|EUR|GBP)\b/)?.[1]
    ?? (/RM/.test(text) ? 'MYR' : /¥/.test(text) ? 'JPY' : fallbackCurrency);
  const dates = [...text.matchAll(/(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  const times = [...text.matchAll(/\b([0-2]?\d:[0-5]\d)\b/g)].map((m) => m[1]);
  // Find the line that mentions a reference, then take the code off that line.
  // Matching keyword-then-code in one case-insensitive pass reads "Booking
  // Confirmation" as a keyword followed by the code "ation".
  const refLine = text
    .split('\n')
    .find((l) => /\b(?:ref(?:erence)?|booking|confirmation|PNR)\b/i.test(l) && /\b[A-Z0-9]{5,8}\b/.test(l));
  const ref = refLine?.match(/\b([A-Z0-9]{5,8})\b/)?.[1]
    ?? text.match(/\b([A-Z0-9]{6})\b/)?.[1]
    ?? 'UNKNOWN';
  const providerLine = text.split('\n').find((l) => l.trim().length > 2) ?? '';
  const airports = [...text.matchAll(/\b([A-Z]{3})\s*(?:→|->|to)\s*([A-Z]{3})\b/g)][0];

  const base = {
    reference: ref,
    provider: (text.match(/^(?:from:\s*)?(.+?)(?:\s*<|$)/im)?.[1] ?? providerLine).trim().slice(0, 60),
    cost: money ? Number(money[1].replace(/,/g, '')) : 0,
    currency,
  };

  if (isHotel) {
    return {
      ...base,
      kind: 'hotel',
      checkIn: dates[0],
      checkOut: dates[1],
      address: text.match(/(?:address|located at)\s*[:\-]\s*(.+)/i)?.[1]?.trim(),
    };
  }
  return {
    ...base,
    kind: 'flight',
    flightNumber: flightNo,
    from: airports?.[1],
    to: airports?.[2],
    departDate: dates[0],
    departTime: times[0],
    arriveTime: times[1],
  };
}

// ---------------------------------------------------------------------------
// Social-sourced extraction
// ---------------------------------------------------------------------------

const SOCIAL_SYSTEM = `Extract travel places from social post content (caption, location tag, on-screen text from OCR).
Return JSON only: {"places":[{"name":string,"activity":string,"locationHint":string,"confidence":0-1}]}.
Ignore hashtags, engagement bait, and anything that isn't a real place. If a post mentions several stops, return each one separately.`;

export interface ExtractedPlace {
  id: string;
  name: string;
  activity: string;
  locationHint: string;
  confidence: number;
  lat: number;
  lng: number;
  thumbnail: string;
  platform: string;
  url: string;
  caption: string;
  poiId?: string;
  dishId?: string;
  /** Set when geocoding couldn't place it — the user is asked to confirm. */
  unresolved?: boolean;
}

const PLATFORMS: { test: RegExp; name: string }[] = [
  { test: /instagram\.com/i, name: 'Instagram' },
  { test: /tiktok\.com/i, name: 'TikTok' },
  { test: /xiaohongshu|xhslink|rednote/i, name: 'RedNote' },
  { test: /youtube\.com|youtu\.be/i, name: 'YouTube' },
];

export async function extractFromSocial(
  links: string[],
  dest: Destination,
  /** Ids already on the itinerary; the fallback resolves around them. */
  exclude: Set<string> = new Set(),
): Promise<ExtractedPlace[]> {
  return callModel<ExtractedPlace[]>({
    system: SOCIAL_SYSTEM,
    user: { links, destinationHint: dest.name },
    fallback: () => localExtract(links, dest, exclude),
  });
}

/**
 * Without live platform API access (Instagram and TikTok both gate this well
 * beyond a hackathon timeline), the demo path maps each pasted link onto the
 * destination's own places, which is what a real extraction pass would resolve
 * them to anyway after geocoding.
 */
function localExtract(links: string[], dest: Destination, exclude: Set<string>): ExtractedPlace[] {
  const all = [
    ...dest.pois.map((p) => ({ kind: 'poi' as const, item: p })),
    ...dest.dishes.map((d) => ({ kind: 'dish' as const, item: d })),
  ];
  // Resolve to somewhere not already planned where possible — a suggestion the
  // user already has is not a suggestion.
  const fresh = all.filter((c) => !exclude.has(c.item.id));
  const candidates = fresh.length > 0 ? fresh : all;
  return links.map((url, i) => {
    const platform = PLATFORMS.find((p) => p.test.test(url))?.name ?? 'Link';
    // Hash the URL so the same link always resolves to the same place.
    let h = 0;
    for (let j = 0; j < url.length; j++) h = (h * 31 + url.charCodeAt(j)) >>> 0;
    const c = candidates[(h + i) % candidates.length];
    const name = c.item.name;
    const isDish = c.kind === 'dish';
    return {
      id: nextId('sx'),
      name,
      activity: isDish ? `Try the ${name}` : (c.item as Poi).description.split('.')[0],
      locationHint: isDish ? (c.item as any).venue : (c.item as Poi).address,
      confidence: 0.6 + ((h % 35) / 100),
      lat: c.item.lat,
      lng: c.item.lng,
      thumbnail: c.item.icon,
      platform,
      url,
      caption: isDish
        ? `you HAVE to try this in ${dest.city} 😩 #${dest.city.replace(/\s/g, '').toLowerCase()}food`
        : `saving this for our ${dest.city} trip 📍 #travel`,
      poiId: c.kind === 'poi' ? c.item.id : undefined,
      dishId: c.kind === 'dish' ? c.item.id : undefined,
    };
  });
}

export function extractedToActivity(p: ExtractedPlace): Activity {
  return {
    id: nextId('act'),
    name: p.name,
    description: p.activity,
    address: p.locationHint,
    lat: p.lat,
    lng: p.lng,
    start: '10:00',
    durationMin: p.dishId ? 75 : 120,
    cost: 0,
    category: p.dishId ? 'food' : 'activities',
    source: 'social',
    poiId: p.poiId,
    dishId: p.dishId,
    icon: p.thumbnail,
    socialRef: { platform: p.platform, url: p.url, caption: p.caption, thumbnail: p.thumbnail },
  };
}
