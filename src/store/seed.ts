import type { AppState, Member, Profile, Trip, Visit } from '../types';
import { findDestination } from '../data/destinations';
import { addDays, iso } from '../domain/dates';
import { localItinerary } from '../services/ai';
import { newlyUnlocked } from '../domain/stickers';

export const YOU_ID = 'm-you';

const COLORS = ['#c9603f', '#2f6f70', '#3d7fc1', '#7a4a6e', '#5c7a4a', '#b08b2e'];

export function makeMember(
  id: string,
  name: string,
  index: number,
  overrides: Partial<Member> = {},
): Member {
  return {
    id,
    name,
    joinedAt: new Date().toISOString(),
    availability: [],
    availabilitySubmitted: false,
    quiz: null,
    costContributed: 0,
    role: index === 0 ? 'organizer' : 'member',
    avatarColor: COLORS[index % COLORS.length],
    language: 'en',
    ...overrides,
  };
}

/**
 * A finished trip so the map, passport and sticker book have something in them
 * on first run — an empty trophy case is a bad first impression, and the
 * proposal leans on the collection loop being visible early.
 */
function pastTrip(today: string): Trip {
  const dest = findDestination('penang')!;
  const start = addDays(today, -120);
  const end = addDays(today, -117);
  const members: Member[] = [
    makeMember(YOU_ID, 'You', 0, {
      quiz: { budget: 900, pace: 'balanced', interests: ['food', 'culture'], mustDos: ['Char kway teow'] },
      costContributed: 620,
    }),
    makeMember('m-priya', 'Priya', 1, {
      quiz: { budget: 850, pace: 'balanced', interests: ['food', 'photography'], mustDos: [] },
      costContributed: 410,
    }),
  ];
  const trip: Trip = {
    id: 'trip-penang-past',
    destinationId: dest.id,
    destinationName: dest.name,
    countryCode: dest.countryCode,
    mode: 'group',
    createdBy: YOU_ID,
    inviteCode: 'PG4T2X',
    respondBy: null,
    seasonWindow: null,
    dates: { start, end },
    datesConfirmed: true,
    outsideRecommendedSeason: false,
    budgetCap: 1750,
    currency: dest.currency,
    categoryCaps: { food: 400 },
    members,
    days: [],
    costItems: [],
    votes: [],
    media: [],
    visits: [],
    checkIns: [],
    stage: 'complete',
    localLanguage: dest.localLanguage,
    translationEnabled: true,
    createdAt: addDays(today, -150),
    completedAt: end,
  };
  trip.days = localItinerary(trip, dest);

  const visited = ['pg-street-art', 'pg-kek-lok-si', 'pg-penang-hill'];
  const dishes = ['pg-laksa', 'pg-ckt'];
  const visits: Visit[] = [];
  trip.days.forEach((day) => {
    for (const a of day.activities) {
      const isPoi = a.poiId && visited.includes(a.poiId);
      const isDish = a.dishId && dishes.includes(a.dishId);
      if (!isPoi && !isDish) continue;
      visits.push({
        id: `visit-${a.id}`,
        memberId: YOU_ID,
        tripId: trip.id,
        activityId: a.id,
        placeName: a.name,
        city: dest.city,
        country: dest.country,
        countryCode: dest.countryCode,
        lat: a.lat,
        lng: a.lng,
        at: `${day.date}T12:00:00.000Z`,
        method: 'manual',
        poiId: a.poiId,
        dishId: a.dishId,
      });
    }
  });
  trip.visits = visits;

  trip.costItems = [
    { id: 'c1', label: 'Flights KUL–PEN return', amount: 460, category: 'flights', paidBy: YOU_ID, splitAmong: [YOU_ID, 'm-priya'], date: start, source: 'imported' },
    { id: 'c2', label: 'Armenian Street Heritage House, 3 nights', amount: 420, category: 'accommodation', paidBy: 'm-priya', splitAmong: [YOU_ID, 'm-priya'], date: start, source: 'imported' },
    { id: 'c3', label: 'Hawker dinners', amount: 180, category: 'food', paidBy: YOU_ID, splitAmong: [YOU_ID, 'm-priya'], date: addDays(start, 1), source: 'manual' },
    { id: 'c4', label: 'Penang Hill funicular', amount: 60, category: 'activities', paidBy: 'm-priya', splitAmong: [YOU_ID, 'm-priya'], date: addDays(start, 2), source: 'ai' },
    { id: 'c5', label: 'Grab rides', amount: 95, category: 'transport', paidBy: YOU_ID, splitAmong: [YOU_ID, 'm-priya'], date: addDays(start, 2), source: 'manual' },
  ];
  return trip;
}

export function initialState(): AppState {
  const today = iso(new Date());
  const past = pastTrip(today);
  const profile: Profile = {
    memberId: YOU_ID,
    name: 'You',
    language: 'en',
    mascot: {
      name: 'Trunk',
      points: 240,
      lastFedAt: new Date(Date.now() - 5 * 3_600_000).toISOString(),
      lastRestedAt: null,
      pinnedStickerId: null,
    },
    stickers: [],
    emergencyContacts: [],
    checkInThresholdHours: 24,
  };
  // Award the stickers those seeded visits earned, through the same path a live
  // check-in takes — otherwise the map shows Penang pins while the passport
  // insists you have never been.
  profile.stickers = newlyUnlocked(past.visits, profile, past.id);

  return {
    profile,
    trips: [past],
    activeTripId: null,
    clockOffsetDays: 0,
  };
}

export const SUGGESTED_FRIENDS = ['Priya', 'Sam', 'Wei Ling', 'Daniel', 'Aisha', 'Marcus'];
