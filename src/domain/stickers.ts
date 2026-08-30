import type { EarnedSticker, Profile, StickerDef, Trip, Visit } from '../types';
import { STICKER_CATALOG } from '../data/stickers';

/** Deterministic-ish scatter so a sticker keeps its spot between renders. */
function shellSlot(stickerId: string, index: number): { x: number; y: number; rotation: number } {
  let h = 0;
  for (let i = 0; i < stickerId.length; i++) h = (h * 31 + stickerId.charCodeAt(i)) >>> 0;
  const col = index % 3;
  const row = Math.floor(index / 3) % 3;
  return {
    x: 0.18 + col * 0.32 + ((h % 40) / 1000 - 0.02),
    y: 0.2 + row * 0.26 + (((h >> 8) % 40) / 1000 - 0.02),
    rotation: ((h >> 16) % 24) - 12,
  };
}

/**
 * Stickers a set of visits should unlock, minus anything already earned.
 * Landmark stickers match a visited POI id; food stickers match a logged dish.
 */
export function newlyUnlocked(visits: Visit[], profile: Profile, tripId: string): EarnedSticker[] {
  const owned = new Set(profile.stickers.map((s) => s.stickerId));
  const out: EarnedSticker[] = [];
  let index = profile.stickers.length;
  for (const v of visits) {
    const itemId = v.poiId ?? v.dishId;
    if (!itemId) continue;
    const def = STICKER_CATALOG.find((s) => s.itemId === itemId);
    if (!def || owned.has(def.id)) continue;
    owned.add(def.id);
    out.push({ stickerId: def.id, tripId, at: v.at, ...shellSlot(def.id, index++) });
  }
  return out;
}

/** Group stickers: same crew, N trips together. */
export function groupStickersFor(
  trips: Trip[],
  profile: Profile,
): { sticker: StickerDef; crew: string[]; count: number }[] {
  const completed = trips.filter((t) => t.stage === 'complete' && t.mode === 'group');
  const crews = new Map<string, { names: string[]; count: number }>();
  for (const t of completed) {
    const ids = t.members
      .map((m) => m.id)
      .filter((id) => id !== profile.memberId)
      .sort();
    if (ids.length === 0) continue;
    const key = ids.join('|');
    const names = t.members.filter((m) => ids.includes(m.id)).map((m) => m.name);
    const prev = crews.get(key);
    crews.set(key, { names, count: (prev?.count ?? 0) + 1 });
  }
  const out: { sticker: StickerDef; crew: string[]; count: number }[] = [];
  for (const { names, count } of crews.values()) {
    for (const s of STICKER_CATALOG) {
      if (s.type === 'group' && s.tripsTogether !== undefined && count >= s.tripsTogether) {
        out.push({ sticker: s, crew: names, count });
      }
    }
  }
  return out;
}

export type CareState = 'happy' | 'neutral' | 'hungry';

/** Mascot care state from how long since it was last fed. */
export function careState(profile: Profile, now: Date): CareState {
  if (!profile.mascot.lastFedAt) return 'hungry';
  const hours = (now.getTime() - new Date(profile.mascot.lastFedAt).getTime()) / 3_600_000;
  if (hours < 12) return 'happy';
  if (hours < 36) return 'neutral';
  return 'hungry';
}

export const FEED_COST = 10;

export function collectionProgress(profile: Profile): { earned: number; total: number } {
  return { earned: profile.stickers.length, total: STICKER_CATALOG.length };
}
