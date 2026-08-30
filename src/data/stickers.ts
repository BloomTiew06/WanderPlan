import type { StickerDef } from '../types';
import { DESTINATIONS } from './destinations';

/**
 * Sticker catalog (section 10). Landmark and food stickers are derived from the
 * destination data so seeding a new demo destination gets its stickers for
 * free; group stickers are milestone-based and destination-independent.
 */

const GROUP_STICKERS: StickerDef[] = [
  { id: 'grp-squad-goals', type: 'group', displayName: 'Squad Goals', icon: '🎒', region: 'Group Trunk', countryCode: '', tripsTogether: 2, hint: 'Travel with the same crew twice.' },
  { id: 'grp-repeat-offenders', type: 'group', displayName: 'Repeat Offenders', icon: '🧳', region: 'Group Trunk', countryCode: '', tripsTogether: 3, hint: 'Three trips with the same people.' },
  { id: 'grp-ride-or-die', type: 'group', displayName: 'Ride or Die', icon: '🔥', region: 'Group Trunk', countryCode: '', tripsTogether: 5, hint: 'Five trips together. Genuinely impressive.' },
];

function buildCatalog(): StickerDef[] {
  const out: StickerDef[] = [];
  for (const d of DESTINATIONS) {
    for (const p of d.pois) {
      if (!p.landmark) continue;
      out.push({
        id: `st-${p.id}`,
        type: 'landmark',
        displayName: p.name.split('(')[0].split('&')[0].trim(),
        icon: p.icon,
        region: d.name,
        countryCode: d.countryCode,
        itemId: p.id,
        hint: `Check in somewhere notable in ${d.city}.`,
      });
    }
    for (const dish of d.dishes) {
      out.push({
        id: `st-${dish.id}`,
        type: 'food',
        displayName: dish.name,
        icon: dish.icon,
        region: d.name,
        countryCode: d.countryCode,
        itemId: dish.id,
        hint: `Eat something regional in ${d.city}.`,
      });
    }
  }
  return [...out, ...GROUP_STICKERS];
}

export const STICKER_CATALOG: StickerDef[] = buildCatalog();

export function findSticker(id: string): StickerDef | undefined {
  return STICKER_CATALOG.find((s) => s.id === id);
}

export function stickersForRegion(region: string): StickerDef[] {
  return STICKER_CATALOG.filter((s) => s.region === region);
}
