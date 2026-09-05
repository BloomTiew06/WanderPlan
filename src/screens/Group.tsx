import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Avatar, Card, Chip, EmptyState, InfoDot, Modal, money, Notice, ProgressBar } from '../components/ui';
import { useStore } from '../store/store';
import { buildSnapshot, detectConflicts, INTEREST_ICONS, PACE_LABELS } from '../domain/preferences';
import {
  applyVoteEffect,
  pickRandomTieBreaker,
  resolveVote,
  tallyVote,
  weightsFor,
} from '../domain/voting';
import type { Member, Trip, Vote } from '../types';
import { COLORS } from '../theme.js';

export default function Group() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const snap = buildSnapshot(trip.members);
  const weights = weightsFor(trip.members);
  const open = trip.votes.filter((v) => v.status === 'open');
  const resolved = trip.votes.filter((v) => v.status === 'resolved');
  const totalContributed = trip.members.reduce((s, m) => s + m.costContributed, 0);

  const scan = () => {
    const found = detectConflicts(trip.members, trip.votes);
    for (const v of found) store.addVote(v);
  };

  return (
    <div className="stack gap-4">
      <Card className="p-5">
        <div className="label">Group snapshot</div>
        <h1 className="h2">{snap.headline}</h1>
        {trip.decidedPace && (
          <p className="mt-1 text-sm">
            <Chip tone="good">Settled: {trip.decidedPace} pace</Chip>{' '}
            <span className="muted">
              — the vote decided this, so it's what the planner builds to. Everyone's own answers
              below are untouched.
            </span>
          </p>
        )}
        <ul className="mt-2 grid gap-1 text-sm muted">
          {snap.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="label">Pace</div>
            {(['chill', 'balanced', 'packed'] as const).map((p) => (
              <div key={p} className="mb-1.5">
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="capitalize">{p}</span>
                  <span className="muted">{snap.paceCounts[p]}</span>
                </div>
                <ProgressBar
                  value={snap.paceCounts[p]}
                  max={Math.max(1, snap.respondents)}
                  color={p === (trip.decidedPace ?? snap.dominantPace) ? COLORS.sea : COLORS.silt}
                  height={6}
                />
              </div>
            ))}
          </div>
          <div>
            <div className="label">Shared interests</div>
            <div className="flex flex-wrap gap-1.5">
              {snap.interestCounts.map((i) => (
                <Chip key={i.tag} tone={i.share > 0.5 ? 'good' : 'neutral'} className="capitalize">
                  {INTEREST_ICONS[i.tag]} {i.tag} · {i.count}/{snap.respondents}
                </Chip>
              ))}
            </div>
            {snap.mustDos.length > 0 && (
              <>
                <div className="label mt-4">Must-dos</div>
                <div className="flex flex-wrap gap-1.5">
                  {snap.mustDos.map((md, i) => (
                    <Chip key={i} tone="bad">
                      ★ {md.text} — {md.memberName}
                    </Chip>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="label mb-0">Vote weights</div>
            <p className="text-xs muted">
              Shown openly so nobody has to guess why a vote moved the bar further.
            </p>
          </div>
        </div>
        <div className="stack gap-2">
          {trip.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} color={m.avatarColor} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">
                  {m.name}
                  {m.role === 'organizer' && (
                    <span className="ml-2 text-[10px] uppercase text-ink/35">organizer</span>
                  )}
                </div>
                <div className="text-[11px] muted">
                  Paid in {money(m.costContributed, trip.currency)}
                  {totalContributed > 0 &&
                    ` · ${Math.round((m.costContributed / totalContributed) * 100)}% of costs so far`}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                ×{weights[m.id].weight.toFixed(2)}
                <InfoDot text={`weight = ${weights[m.id].explanation}. Everyone starts at 1.00 so nobody's vote can be zeroed out; the rest comes from what they've paid toward the trip and whether they're the organizer.`} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {open.length === 0 && resolved.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="No conflicts to settle"
          body="When preferences split far enough apart, a vote card shows up here instead of the difference being quietly averaged away."
          action={
            <button className="btn-ghost" onClick={scan}>
              Check for splits again
            </button>
          }
        />
      ) : (
        <>
          {open.map((v) => (
            <VoteCard key={v.id} vote={v} trip={trip} />
          ))}
          {resolved.map((v) => (
            <ResolvedCard key={v.id} vote={v} trip={trip} />
          ))}
          <button className="btn-quiet mx-auto text-xs" onClick={scan}>
            Check for new splits
          </button>
        </>
      )}
    </div>
  );
}

function VoteCard({ vote, trip }: { vote: Vote; trip: Trip }) {
  const store = useStore();
  const state = tallyVote(vote, trip.members, store.now);
  const weights = weightsFor(trip.members);
  const [comment, setComment] = useState('');
  const [voterId, setVoterId] = useState(store.state.profile.memberId);
  const [tieOpen, setTieOpen] = useState(false);

  const resolveWeighted = () => {
    if (!state.leader) return;
    store.updateVote(vote.id, (v) =>
      resolveVote(v, state.leader!.optionId, { kind: 'weighted', at: new Date().toISOString() }),
    );
    store.updateActiveTrip((t) => applyVoteEffect(t, { ...vote, winningOptionId: state.leader!.optionId }));
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl">{vote.question}</h2>
          <p className="mt-1 text-sm muted">{vote.why}</p>
        </div>
        <Chip tone="info">
          {state.castCount}/{state.memberCount} voted
        </Chip>
      </div>

      <div className="mt-4 stack gap-3">
        {state.tallies.map((t) => {
          const option = vote.options.find((o) => o.id === t.optionId)!;
          const isLeader = state.leader?.optionId === t.optionId && t.weighted > 0;
          return (
            <div key={t.optionId}>
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <button
                  className={`chip ${vote.ballots[voterId] === t.optionId ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                  onClick={() => store.castVote(vote.id, voterId, t.optionId)}
                >
                  {option.label}
                </button>
                <span className="text-xs muted">
                  {t.weighted.toFixed(2)} weighted · {t.headcount}{' '}
                  {t.headcount === 1 ? 'vote' : 'votes'}
                </span>
                {isLeader && <Chip tone="good">Leading</Chip>}
                <span className="ml-auto flex -space-x-2">
                  {t.voterIds.map((id) => {
                    const m = trip.members.find((x) => x.id === id)!;
                    return (
                      <span key={id} title={`${m.name} · ×${weights[id].weight.toFixed(2)}`}>
                        <Avatar name={m.name} color={m.avatarColor} size={22} />
                      </span>
                    );
                  })}
                </span>
              </div>
              <ProgressBar value={t.share} color={isLeader ? COLORS.sea : COLORS.silt} height={10} />
              {option.detail && <p className="mt-1 text-xs muted">{option.detail}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-black/5 pt-3">
        <div className="label">Voting as</div>
        <div className="flex flex-wrap gap-1.5">
          {trip.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setVoterId(m.id)}
              className={`chip ${voterId === m.id ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10 hover:bg-sand'}`}
            >
              <Avatar name={m.name} color={m.avatarColor} size={16} />
              {m.name} ×{weights[m.id].weight.toFixed(2)}
            </button>
          ))}
        </div>
      </div>

      {vote.comments.length > 0 && (
        <div className="mt-4 grid gap-1.5">
          {vote.comments.map((c) => {
            const m = trip.members.find((x) => x.id === c.memberId);
            return (
              <div key={c.id} className="flex gap-2 text-sm">
                <Avatar name={m?.name ?? '?'} color={m?.avatarColor ?? '#999'} size={22} />
                <span>
                  <strong className="mr-1">{m?.name}</strong>
                  {c.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!comment.trim()) return;
          store.addComment(vote.id, voterId, comment.trim());
          setComment('');
        }}
      >
        <input
          className="field"
          placeholder="Make your case…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="btn-ghost shrink-0" type="submit">
          Post
        </button>
      </form>

      {state.stuck && (
        <div className="mt-4">
          <Notice tone="warn">
            <strong>This one's stuck.</strong> {state.stuckReason}{' '}
            <button className="underline underline-offset-2" onClick={() => setTieOpen(true)}>
              Assign a tie-breaker?
            </button>
          </Notice>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn-primary"
          disabled={!state.leader}
          onClick={resolveWeighted}
        >
          Lock in the leading option
        </button>
        {!state.stuck && state.castCount >= 2 && (
          <button className="btn-quiet text-xs" onClick={() => setTieOpen(true)}>
            Assign a tie-breaker anyway
          </button>
        )}
      </div>

      <TieBreakerModal open={tieOpen} vote={vote} trip={trip} onClose={() => setTieOpen(false)} />
    </Card>
  );
}

function TieBreakerModal({
  open,
  vote,
  trip,
  onClose,
}: {
  open: boolean;
  vote: Vote;
  trip: Trip;
  onClose: () => void;
}) {
  const store = useStore();
  const [assigned, setAssigned] = useState<{ member: Member; how: 'chosen' | 'random' } | null>(null);

  const decide = (optionId: string) => {
    if (!assigned) return;
    store.updateVote(vote.id, (v) =>
      resolveVote(v, optionId, {
        kind: 'tiebreaker',
        byMemberId: assigned.member.id,
        tieBreakerPickedBy: assigned.how,
        at: new Date().toISOString(),
      }),
    );
    store.updateActiveTrip((t) => applyVoteEffect(t, { ...vote, winningOptionId: optionId }));
    setAssigned(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign a tie-breaker">
      {!assigned ? (
        <>
          <p className="mb-4 text-sm muted">
            One person makes the final call on this decision only. Pick someone, or let the app pick
            fairly — either way it's logged, so “why them?” has an answer.
          </p>
          <div className="stack gap-2">
            {trip.members.map((m) => (
              <button key={m.id} onClick={() => setAssigned({ member: m, how: 'chosen' })} className="text-left">
                <Card className="flex items-center gap-3 p-3 transition hover:border-black/20">
                  <Avatar name={m.name} color={m.avatarColor} />
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.role === 'organizer' && <Chip tone="info">Trip lead</Chip>}
                </Card>
              </button>
            ))}
          </div>
          <button
            className="btn-ghost mt-3 w-full"
            onClick={() => setAssigned({ member: pickRandomTieBreaker(trip.members), how: 'random' })}
          >
            🎲 Pick someone at random
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-sand p-4">
            <Avatar name={assigned.member.name} color={assigned.member.avatarColor} size={40} />
            <div>
              <div className="font-display text-lg">{assigned.member.name} decides</div>
              <div className="text-xs muted">
                {assigned.how === 'random'
                  ? 'Picked at random from the group — logged for the record.'
                  : 'Chosen by the group as trip lead for this call.'}
              </div>
            </div>
          </div>
          <p className="mb-3 text-sm muted">One tap. Both options, side by side.</p>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
            {vote.options.map((o) => (
              <button key={o.id} onClick={() => decide(o.id)} className="text-left">
                <Card className="h-full p-4 transition hover:border-ink">
                  <div className="font-display text-lg">{o.label}</div>
                  {o.detail && <p className="mt-1 text-xs muted">{o.detail}</p>}
                </Card>
              </button>
            ))}
          </div>
          <button className="btn-quiet mt-3 text-xs" onClick={() => setAssigned(null)}>
            ← Pick someone else
          </button>
        </>
      )}
    </Modal>
  );
}

function ResolvedCard({ vote, trip }: { vote: Vote; trip: Trip }) {
  const winner = vote.options.find((o) => o.id === vote.winningOptionId);
  const by = vote.resolution?.byMemberId
    ? trip.members.find((m) => m.id === vote.resolution!.byMemberId)
    : undefined;
  return (
    <Card className="border-moss/25 bg-moss/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="good">✓ Settled</Chip>
        <span className="text-sm font-semibold">{vote.question}</span>
      </div>
      <div className="mt-1 text-sm">
        <strong>{winner?.label}</strong>
        {by ? (
          <span className="muted">
            {' '}
            — final call made by {by.name}
            {vote.resolution?.tieBreakerPickedBy === 'random' ? ' (picked at random)' : ''}.
          </span>
        ) : (
          <span className="muted"> — carried on the weighted tally.</span>
        )}
      </div>
      {vote.effect?.kind === 'pace' && trip.decidedPace && (
        <p className="mt-1 text-xs muted">
          Folded in automatically: {PACE_LABELS[trip.decidedPace].toLowerCase()}. Regenerating a day
          plans to it.
        </p>
      )}
    </Card>
  );
}
