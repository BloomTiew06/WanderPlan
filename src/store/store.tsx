import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Activity,
  AppState,
  CheckIn,
  CostItem,
  DateRange,
  Day,
  EmergencyContact,
  Media,
  Member,
  Profile,
  Quiz,
  Trip,
  Visit,
  Vote,
} from '../types';
import { initialState, YOU_ID } from './seed';
import { addDays, iso, MS_DAY } from '../domain/dates';
import { newlyUnlocked } from '../domain/stickers';
import { findDestination } from '../data/destinations';
import { nextId } from '../services/ai';
import { translateKey, type Lang } from '../i18n/strings';

const STORAGE_KEY = 'wanderplan.state.v1';

function load(): AppState {
  if (typeof localStorage === 'undefined') return initialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    // Guard against a stale shape from an earlier build.
    if (!parsed.profile || !Array.isArray(parsed.trips)) return initialState();
    return parsed;
  } catch {
    return initialState();
  }
}

interface StoreApi {
  state: AppState;
  /** Simulated today, so the demo can walk a trip forward without waiting. */
  now: Date;
  today: string;
  t: (key: string) => string;
  trip: Trip | null;
  setActiveTrip: (id: string | null) => void;
  updateProfile: (fn: (p: Profile) => Profile) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, fn: (t: Trip) => Trip) => void;
  updateActiveTrip: (fn: (t: Trip) => Trip) => void;
  deleteTrip: (id: string) => void;
  addMember: (name: string) => Member;
  setAvailability: (memberId: string, ranges: DateRange[]) => void;
  setQuiz: (memberId: string, quiz: Quiz) => void;
  setDays: (days: Day[]) => void;
  replaceActivity: (dayIndex: number, activityId: string, next: Activity) => void;
  removeActivity: (dayIndex: number, activityId: string) => void;
  addActivity: (dayIndex: number, activity: Activity) => void;
  reorderActivity: (dayIndex: number, from: number, to: number) => void;
  addCostItem: (item: Omit<CostItem, 'id'>) => void;
  updateCostItem: (id: string, fn: (c: CostItem) => CostItem) => void;
  removeCostItem: (id: string) => void;
  castVote: (voteId: string, memberId: string, optionId: string) => void;
  addVote: (vote: Vote) => void;
  updateVote: (voteId: string, fn: (v: Vote) => Vote) => void;
  addComment: (voteId: string, memberId: string, text: string) => void;
  checkIn: (activity: Activity, method: 'auto' | 'manual') => Visit[];
  addMedia: (media: Omit<Media, 'id' | 'tripId'>) => void;
  removeMedia: (id: string) => void;
  addCheckInSnapshot: (c: Omit<CheckIn, 'id' | 'tripId'>) => void;
  addEmergencyContact: (c: Omit<EmergencyContact, 'id'>) => void;
  removeEmergencyContact: (id: string) => void;
  feedMascot: () => void;
  restMascot: () => void;
  awardPoints: (n: number) => void;
  pinSticker: (id: string | null) => void;
  moveSticker: (id: string, x: number, y: number) => void;
  advanceClock: (days: number) => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // Quota or private mode — the app still works, it just won't persist.
      console.warn('[store] could not persist state:', err);
    }
  }, [state]);

  const now = useMemo(
    () => new Date(Date.now() + state.clockOffsetDays * MS_DAY),
    [state.clockOffsetDays],
  );
  const today = iso(now);

  const trip = useMemo(
    () => state.trips.find((t) => t.id === state.activeTripId) ?? null,
    [state.trips, state.activeTripId],
  );

  const t = useCallback(
    (key: string) => translateKey(state.profile.language as Lang, key),
    [state.profile.language],
  );

  const updateTrip = useCallback((id: string, fn: (t: Trip) => Trip) => {
    setState((s) => ({ ...s, trips: s.trips.map((x) => (x.id === id ? fn(x) : x)) }));
  }, []);

  const updateActiveTrip = useCallback(
    (fn: (t: Trip) => Trip) => {
      setState((s) =>
        s.activeTripId
          ? { ...s, trips: s.trips.map((x) => (x.id === s.activeTripId ? fn(x) : x)) }
          : s,
      );
    },
    [],
  );

  const api: StoreApi = useMemo(() => {
    const patchMember = (memberId: string, fn: (m: Member) => Member) =>
      updateActiveTrip((tr) => ({
        ...tr,
        members: tr.members.map((m) => (m.id === memberId ? fn(m) : m)),
      }));

    return {
      state,
      now,
      today,
      t,
      trip,
      setActiveTrip: (id) => setState((s) => ({ ...s, activeTripId: id })),
      updateProfile: (fn) => setState((s) => ({ ...s, profile: fn(s.profile) })),
      addTrip: (newTrip) =>
        setState((s) => ({ ...s, trips: [newTrip, ...s.trips], activeTripId: newTrip.id })),
      updateTrip,
      updateActiveTrip,
      deleteTrip: (id) =>
        setState((s) => ({
          ...s,
          trips: s.trips.filter((x) => x.id !== id),
          activeTripId: s.activeTripId === id ? null : s.activeTripId,
        })),

      addMember: (name) => {
        const member: Member = {
          id: nextId('m'),
          name,
          joinedAt: new Date().toISOString(),
          availability: [],
          availabilitySubmitted: false,
          quiz: null,
          costContributed: 0,
          role: 'member',
          avatarColor: ['#c9603f', '#2f6f70', '#3d7fc1', '#7a4a6e', '#5c7a4a', '#b08b2e'][
            Math.floor(Math.random() * 6)
          ],
          language: 'en',
        };
        updateActiveTrip((tr) => ({ ...tr, members: [...tr.members, member] }));
        return member;
      },

      setAvailability: (memberId, ranges) =>
        patchMember(memberId, (m) => ({ ...m, availability: ranges, availabilitySubmitted: true })),

      setQuiz: (memberId, quiz) => patchMember(memberId, (m) => ({ ...m, quiz })),

      setDays: (days) => updateActiveTrip((tr) => ({ ...tr, days })),

      replaceActivity: (dayIndex, activityId, next) =>
        updateActiveTrip((tr) => ({
          ...tr,
          days: tr.days.map((d, i) =>
            i === dayIndex
              ? { ...d, activities: d.activities.map((a) => (a.id === activityId ? next : a)) }
              : d,
          ),
        })),

      removeActivity: (dayIndex, activityId) =>
        updateActiveTrip((tr) => ({
          ...tr,
          days: tr.days.map((d, i) =>
            i === dayIndex ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) } : d,
          ),
        })),

      addActivity: (dayIndex, activity) =>
        updateActiveTrip((tr) => ({
          ...tr,
          days: tr.days.map((d, i) =>
            i === dayIndex ? { ...d, activities: [...d.activities, activity] } : d,
          ),
        })),

      reorderActivity: (dayIndex, from, to) =>
        updateActiveTrip((tr) => ({
          ...tr,
          days: tr.days.map((d, i) => {
            if (i !== dayIndex) return d;
            const next = [...d.activities];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return { ...d, activities: next };
          }),
        })),

      addCostItem: (item) =>
        updateActiveTrip((tr) => ({
          ...tr,
          costItems: [...tr.costItems, { ...item, id: nextId('cost') }],
          members: tr.members.map((m) =>
            m.id === item.paidBy ? { ...m, costContributed: m.costContributed + item.amount } : m,
          ),
        })),

      updateCostItem: (id, fn) =>
        updateActiveTrip((tr) => ({
          ...tr,
          costItems: tr.costItems.map((c) => (c.id === id ? fn(c) : c)),
        })),

      removeCostItem: (id) =>
        updateActiveTrip((tr) => {
          const removed = tr.costItems.find((c) => c.id === id);
          return {
            ...tr,
            costItems: tr.costItems.filter((c) => c.id !== id),
            members: removed
              ? tr.members.map((m) =>
                  m.id === removed.paidBy
                    ? { ...m, costContributed: Math.max(0, m.costContributed - removed.amount) }
                    : m,
                )
              : tr.members,
          };
        }),

      castVote: (voteId, memberId, optionId) =>
        updateActiveTrip((tr) => ({
          ...tr,
          votes: tr.votes.map((v) =>
            v.id === voteId ? { ...v, ballots: { ...v.ballots, [memberId]: optionId } } : v,
          ),
        })),

      addVote: (vote) => updateActiveTrip((tr) => ({ ...tr, votes: [...tr.votes, vote] })),

      updateVote: (voteId, fn) =>
        updateActiveTrip((tr) => ({
          ...tr,
          votes: tr.votes.map((v) => (v.id === voteId ? fn(v) : v)),
        })),

      addComment: (voteId, memberId, text) =>
        updateActiveTrip((tr) => ({
          ...tr,
          votes: tr.votes.map((v) =>
            v.id === voteId
              ? {
                  ...v,
                  comments: [
                    ...v.comments,
                    { id: nextId('cm'), memberId, text, at: new Date().toISOString() },
                  ],
                }
              : v,
          ),
        })),

      /** Writes the Visit record, then unlocks any stickers it earns. */
      checkIn: (activity, method) => {
        if (!trip) return [];
        const dest = findDestination(trip.destinationId);
        const visit: Visit = {
          id: nextId('visit'),
          memberId: state.profile.memberId,
          tripId: trip.id,
          activityId: activity.id,
          placeName: activity.name,
          city: dest?.city ?? trip.destinationName,
          country: dest?.country ?? '',
          countryCode: trip.countryCode,
          lat: activity.lat,
          lng: activity.lng,
          at: now.toISOString(),
          method,
          poiId: activity.poiId,
          dishId: activity.dishId,
        };
        const unlocked = newlyUnlocked([visit], state.profile, trip.id);
        setState((s) => ({
          ...s,
          trips: s.trips.map((x) =>
            x.id === trip.id ? { ...x, visits: [...x.visits, visit] } : x,
          ),
          profile: {
            ...s.profile,
            stickers: [...s.profile.stickers, ...unlocked],
            mascot: { ...s.profile.mascot, points: s.profile.mascot.points + 25 + unlocked.length * 50 },
          },
        }));
        return [visit];
      },

      addMedia: (media) =>
        updateActiveTrip((tr) => ({
          ...tr,
          media: [...tr.media, { ...media, id: nextId('media'), tripId: tr.id }],
        })),

      removeMedia: (id) =>
        updateActiveTrip((tr) => ({ ...tr, media: tr.media.filter((m) => m.id !== id) })),

      addCheckInSnapshot: (c) =>
        updateActiveTrip((tr) => ({
          ...tr,
          checkIns: [{ ...c, id: nextId('ci'), tripId: tr.id }, ...tr.checkIns],
        })),

      addEmergencyContact: (c) =>
        setState((s) => ({
          ...s,
          profile: {
            ...s.profile,
            emergencyContacts: [...s.profile.emergencyContacts, { ...c, id: nextId('ec') }],
          },
        })),

      removeEmergencyContact: (id) =>
        setState((s) => ({
          ...s,
          profile: {
            ...s.profile,
            emergencyContacts: s.profile.emergencyContacts.filter((c) => c.id !== id),
          },
        })),

      feedMascot: () =>
        setState((s) => ({
          ...s,
          profile: {
            ...s.profile,
            mascot: {
              ...s.profile.mascot,
              points: Math.max(0, s.profile.mascot.points - 10),
              lastFedAt: new Date().toISOString(),
            },
          },
        })),

      restMascot: () =>
        setState((s) => ({
          ...s,
          profile: {
            ...s.profile,
            mascot: { ...s.profile.mascot, lastRestedAt: new Date().toISOString() },
          },
        })),

      awardPoints: (n) =>
        setState((s) => ({
          ...s,
          profile: { ...s.profile, mascot: { ...s.profile.mascot, points: s.profile.mascot.points + n } },
        })),

      pinSticker: (id) =>
        setState((s) => ({
          ...s,
          profile: { ...s.profile, mascot: { ...s.profile.mascot, pinnedStickerId: id } },
        })),

      moveSticker: (id, x, y) =>
        setState((s) => ({
          ...s,
          profile: {
            ...s.profile,
            stickers: s.profile.stickers.map((st) =>
              st.stickerId === id ? { ...st, x, y } : st,
            ),
          },
        })),

      advanceClock: (days) =>
        setState((s) => ({ ...s, clockOffsetDays: Math.max(0, s.clockOffsetDays + days) })),

      resetAll: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* nothing to clear */
        }
        setState(initialState());
      },
    };
  }, [state, now, today, t, trip, updateTrip, updateActiveTrip]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export { YOU_ID, addDays };
