import type { Member, Pace, Trip, Vote } from '../types';

const PACES: Pace[] = ['chill', 'balanced', 'packed'];

/**
 * Weighted group decisions (section 3b).
 *
 * The formula is deliberately simple and fully derived from data already in the
 * app, so the "why does Sam's vote count more" tooltip can show the real
 * arithmetic rather than a black box.
 */

export const ORGANIZER_BONUS = 0.25;
/** How far from an even split still counts as "stuck". */
export const STUCK_MARGIN = 0.08;
/** A vote left open longer than this with a close split is flagged stuck. */
export const STUCK_AFTER_MINUTES = 30;
/** Or: this much back-and-forth in the thread with no resolution. */
export const STUCK_COMMENT_COUNT = 4;

export interface Weight {
  memberId: string;
  weight: number;
  costShare: number;
  organizerBonus: number;
  explanation: string;
}

/**
 * weight = 1 + (costContributed / totalTripCost) + (organizer ? 0.25 : 0)
 *
 * Everyone starts at 1 so nobody's vote can be zeroed out by not having paid
 * for anything yet.
 */
export function memberWeight(member: Member, totalContributed: number): Weight {
  const costShare = totalContributed > 0 ? member.costContributed / totalContributed : 0;
  const organizerBonus = member.role === 'organizer' ? ORGANIZER_BONUS : 0;
  const weight = 1 + costShare + organizerBonus;
  const parts = ['base 1.00'];
  if (costShare > 0) parts.push(`+${costShare.toFixed(2)} cost share`);
  if (organizerBonus > 0) parts.push(`+${organizerBonus.toFixed(2)} organizer`);
  return {
    memberId: member.id,
    weight,
    costShare,
    organizerBonus,
    explanation: `${parts.join(' ')} = ${weight.toFixed(2)}`,
  };
}

export function weightsFor(members: Member[]): Record<string, Weight> {
  const total = members.reduce((s, m) => s + m.costContributed, 0);
  const out: Record<string, Weight> = {};
  for (const m of members) out[m.id] = memberWeight(m, total);
  return out;
}

export interface Tally {
  optionId: string;
  label: string;
  /** Sum of voter weights. */
  weighted: number;
  /** Plain headcount, shown alongside so the weighting stays legible. */
  headcount: number;
  /** Share of total weight cast, 0..1. */
  share: number;
  voterIds: string[];
}

export interface VoteState {
  tallies: Tally[];
  totalWeight: number;
  castCount: number;
  memberCount: number;
  leader: Tally | null;
  /** Gap between first and second place, as a share of weight cast. */
  margin: number;
  stuck: boolean;
  stuckReason: string | null;
}

export function tallyVote(vote: Vote, members: Member[], now: Date): VoteState {
  const weights = weightsFor(members);
  const tallies: Tally[] = vote.options.map((o) => ({
    optionId: o.id,
    label: o.label,
    weighted: 0,
    headcount: 0,
    share: 0,
    voterIds: [],
  }));
  const byId = new Map(tallies.map((t) => [t.optionId, t]));

  let totalWeight = 0;
  for (const [memberId, optionId] of Object.entries(vote.ballots)) {
    const t = byId.get(optionId);
    const w = weights[memberId]?.weight;
    if (!t || w === undefined) continue;
    t.weighted += w;
    t.headcount += 1;
    t.voterIds.push(memberId);
    totalWeight += w;
  }
  for (const t of tallies) t.share = totalWeight > 0 ? t.weighted / totalWeight : 0;

  const ranked = [...tallies].sort((a, b) => b.weighted - a.weighted);
  const leader = ranked[0] && ranked[0].weighted > 0 ? ranked[0] : null;
  const runnerUp = ranked[1]?.weighted ?? 0;
  const margin = totalWeight > 0 && leader ? (leader.weighted - runnerUp) / totalWeight : 0;

  const castCount = Object.keys(vote.ballots).length;
  const everyoneVoted = castCount >= members.length;
  const ageMin = (now.getTime() - new Date(vote.createdAt).getTime()) / 60_000;

  let stuck = false;
  let stuckReason: string | null = null;
  if (vote.status === 'open' && castCount >= 2 && margin <= STUCK_MARGIN) {
    if (everyoneVoted) {
      stuck = true;
      stuckReason = 'Everyone has voted and it is still a dead heat.';
    } else if (ageMin >= STUCK_AFTER_MINUTES) {
      stuck = true;
      stuckReason = `Open for ${Math.round(ageMin)} minutes and still split down the middle.`;
    } else if (vote.comments.length >= STUCK_COMMENT_COUNT) {
      stuck = true;
      stuckReason = `${vote.comments.length} comments in and no one is budging.`;
    }
  }

  return {
    tallies,
    totalWeight,
    castCount,
    memberCount: members.length,
    leader,
    margin,
    stuck,
    stuckReason,
  };
}

/** Fair random pick, logged so "why this person" is answerable afterwards. */
export function pickRandomTieBreaker(members: Member[], rng: () => number = Math.random): Member {
  return members[Math.floor(rng() * members.length)];
}

/**
 * Both a normal weighted win and a tie-breaker call route through here, so
 * downstream logic that folds the result into the itinerary needs no special
 * casing.
 */
export function resolveVote(
  vote: Vote,
  winningOptionId: string,
  resolution: NonNullable<Vote['resolution']>,
): Vote {
  return { ...vote, status: 'resolved', winningOptionId, resolution };
}

/** Apply a resolved vote's effect to the trip. */
export function applyVoteEffect(trip: Trip, vote: Vote): Trip {
  if (!vote.effect || !vote.winningOptionId) return trip;
  if (vote.effect.kind === 'pace') {
    const pace = vote.winningOptionId as Pace;
    if (!PACES.includes(pace)) return trip;
    return { ...trip, decidedPace: pace };
  }
  return trip;
}
