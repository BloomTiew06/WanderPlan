import type { InterestTag, Member, Pace, Vote } from '../types';

export const INTEREST_TAGS: InterestTag[] = [
  'food', 'nature', 'nightlife', 'culture', 'shopping', 'adventure', 'relaxation', 'photography',
];

export const INTEREST_ICONS: Record<InterestTag, string> = {
  food: '🍜', nature: '🌿', nightlife: '🍸', culture: '🏛️',
  shopping: '🛍️', adventure: '🧗', relaxation: '🧘', photography: '📷',
};

export const PACE_LABELS: Record<Pace, string> = {
  chill: 'Chill — two or three things a day, long lunches',
  balanced: 'Balanced — a full day without running',
  packed: 'Packed — squeeze everything in, sleep on the plane',
};

export interface GroupSnapshot {
  respondents: number;
  memberCount: number;
  avgBudget: number;
  budgetSpread: number;
  paceCounts: Record<Pace, number>;
  dominantPace: Pace;
  paceAgreement: number;
  interestCounts: { tag: InterestTag; count: number; share: number }[];
  topInterest: InterestTag | null;
  mustDos: { text: string; memberId: string; memberName: string }[];
  headline: string;
  /** Secondary one-liners for the snapshot card. */
  lines: string[];
}

const PACES: Pace[] = ['chill', 'balanced', 'packed'];

export function buildSnapshot(members: Member[]): GroupSnapshot {
  const answered = members.filter((m) => m.quiz);
  const paceCounts: Record<Pace, number> = { chill: 0, balanced: 0, packed: 0 };
  const interest = new Map<InterestTag, number>();
  const mustDos: GroupSnapshot['mustDos'] = [];
  let budgetSum = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const m of answered) {
    const q = m.quiz!;
    paceCounts[q.pace] += 1;
    budgetSum += q.budget;
    min = Math.min(min, q.budget);
    max = Math.max(max, q.budget);
    for (const t of q.interests) interest.set(t, (interest.get(t) ?? 0) + 1);
    for (const text of q.mustDos) {
      if (text.trim()) mustDos.push({ text: text.trim(), memberId: m.id, memberName: m.name });
    }
  }

  const n = answered.length || 1;
  const dominantPace = PACES.reduce((a, b) => (paceCounts[b] > paceCounts[a] ? b : a), 'balanced');
  const paceAgreement = answered.length ? paceCounts[dominantPace] / answered.length : 0;
  const interestCounts = [...interest.entries()]
    .map(([tag, count]) => ({ tag, count, share: count / n }))
    .sort((a, b) => b.count - a.count);
  const topInterest = interestCounts[0]?.tag ?? null;

  const pct = Math.round(paceAgreement * 100);
  const headline = answered.length
    ? paceAgreement >= 0.6
      ? `${pct}% of you want a ${dominantPace} pace`
      : 'No clear winner on pace yet'
    : 'Waiting on the first quiz';

  const lines: string[] = [];
  if (topInterest) {
    lines.push(`${INTEREST_ICONS[topInterest]} ${cap(topInterest)} is the top shared interest (${interestCounts[0].count} of ${answered.length}).`);
  }
  if (answered.length) {
    lines.push(`Budgets run ${Math.round(min)}–${Math.round(max)} per person, averaging ${Math.round(budgetSum / n)}.`);
  }
  if (mustDos.length) {
    lines.push(`${mustDos.length} must-do${mustDos.length === 1 ? '' : 's'} flagged between you.`);
  }

  return {
    respondents: answered.length,
    memberCount: members.length,
    avgBudget: answered.length ? budgetSum / n : 0,
    budgetSpread: answered.length ? max - min : 0,
    paceCounts,
    dominantPace,
    paceAgreement,
    interestCounts,
    topInterest,
    mustDos,
    headline,
    lines,
  };
}

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** Preferences vary past this much and it's a real split, not noise. */
export const CONFLICT_THRESHOLD = 0.55;

/**
 * Surface genuine splits as votes rather than silently averaging them away
 * (section 3). Only returns conflicts that don't already have an open vote.
 */
export function detectConflicts(members: Member[], existing: Vote[]): Vote[] {
  const snap = buildSnapshot(members);
  if (snap.respondents < 2) return [];
  const open = new Set(existing.map((v) => v.id.split('--')[0]));
  const now = new Date().toISOString();
  const out: Vote[] = [];

  if (snap.paceAgreement < CONFLICT_THRESHOLD && !open.has('conflict-pace')) {
    const options = PACES.filter((p) => snap.paceCounts[p] > 0).map((p) => ({
      id: p,
      label: cap(p),
      detail: PACE_LABELS[p],
    }));
    out.push({
      id: `conflict-pace--${Date.now()}`,
      question: 'How hard are we going?',
      why: `Pace is split ${PACES.map((p) => `${snap.paceCounts[p]} ${p}`).filter((s) => !s.startsWith('0')).join(' / ')}. Worth settling before the itinerary gets built around the wrong assumption.`,
      options,
      ballots: {},
      comments: [],
      createdAt: now,
      status: 'open',
      effect: { kind: 'pace', value: snap.dominantPace },
    });
  }

  // A big budget spread means somebody is going to feel squeezed.
  if (snap.respondents >= 2 && snap.avgBudget > 0 && snap.budgetSpread / snap.avgBudget > 0.6 && !open.has('conflict-budget')) {
    out.push({
      id: `conflict-budget--${Date.now()}`,
      question: 'Whose budget are we planning to?',
      why: `Budgets range by ${Math.round(snap.budgetSpread)} per person. Planning to the top of that range leaves someone paying more than they signed up for.`,
      options: [
        { id: 'lowest', label: 'Plan to the lowest budget', detail: 'Nobody gets stretched. Optional extras stay optional.' },
        { id: 'average', label: 'Plan to the average', detail: 'Split the difference and flag anything pricey as opt-in.' },
      ],
      ballots: {},
      comments: [],
      createdAt: now,
      status: 'open',
      effect: { kind: 'note', value: 'budget-strategy' },
    });
  }

  // Two interests each strongly held by a different half of the group.
  const contested = snap.interestCounts.filter((i) => i.share >= 0.35 && i.share <= 0.65);
  if (contested.length >= 2 && !open.has('conflict-interest')) {
    const [a, b] = contested;
    out.push({
      id: `conflict-interest--${Date.now()}`,
      question: `${cap(a.tag)} or ${b.tag} for the free afternoon?`,
      why: `${a.count} of you picked ${a.tag}, ${b.count} picked ${b.tag}. Both won't fit on day two.`,
      options: [
        { id: a.tag, label: `${INTEREST_ICONS[a.tag]} ${cap(a.tag)}` },
        { id: b.tag, label: `${INTEREST_ICONS[b.tag]} ${cap(b.tag)}` },
      ],
      ballots: {},
      comments: [],
      createdAt: now,
      status: 'open',
      effect: { kind: 'note', value: 'interest-priority' },
    });
  }

  return out;
}
