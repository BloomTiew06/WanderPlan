import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Avatar, Card, Chip, Notice, Spinner } from '../components/ui';
import { useStore } from '../store/store';
import { findDestination } from '../data/destinations';
import { formatRange } from '../domain/dates';
import { hasSubmitted } from '../domain/availability';
import { buildSnapshot, detectConflicts, INTEREST_ICONS } from '../domain/preferences';
import { generateItinerary } from '../services/ai';

/**
 * The live checklist. In a real build a realtime listener drives this as members
 * join, submit and finish; here the same view updates from local state as the
 * organizer walks the group through.
 */
export default function Waiting() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state, updateTrip, setActiveTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);
  const dest = trip ? findDestination(trip.destinationId) : undefined;
  const [busy, setBusy] = useState(false);

  if (!trip || !dest) return <Notice tone="warn">That trip no longer exists.</Notice>;

  const snap = buildSnapshot(trip.members);
  const allDone = trip.members.every((m) => m.quiz);

  const generate = async () => {
    setBusy(true);
    setActiveTrip(trip.id);
    const days = await generateItinerary(trip, dest);
    const conflicts = detectConflicts(trip.members, trip.votes);
    updateTrip(trip.id, (t) => ({
      ...t,
      days,
      votes: [...t.votes, ...conflicts],
      stage: 'planning',
    }));
    navigate(`/trip/${trip.id}/itinerary`);
  };

  return (
    <SetupShell
      step={5}
      total={5}
      title="Almost there"
      subtitle="Everything's in one place now. Generate the itinerary when you're ready."
      onBack={() => navigate(`/setup/${trip.id}/quiz`)}
    >
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h3 className="font-display text-2xl">{trip.destinationName}</h3>
          {trip.dates && <Chip tone="info">{formatRange(trip.dates)}</Chip>}
          {trip.outsideRecommendedSeason && <Chip tone="warn">Outside ideal season</Chip>}
        </div>

        <div className="label">Everyone's status</div>
        <div className="stack gap-2">
          {trip.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl bg-sand/60 px-3 py-2.5">
              <Avatar name={m.name} color={m.avatarColor} />
              <div className="min-w-0 flex-1 text-sm font-semibold">{m.name}</div>
              <div className="flex gap-1.5">
                <Chip tone="good">✓ Joined</Chip>
                <Chip tone={hasSubmitted(m) ? 'good' : 'neutral'}>
                  {hasSubmitted(m) ? '✓ Dates' : '– Dates'}
                </Chip>
                <Chip tone={m.quiz ? 'good' : 'warn'}>{m.quiz ? '✓ Quiz' : 'Quiz pending'}</Chip>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {snap.respondents > 0 && (
        <Card className="mt-4 p-5">
          <div className="label">Group snapshot</div>
          <h3 className="font-display text-xl">{snap.headline}</h3>
          <ul className="mt-2 grid gap-1 text-sm muted">
            {snap.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          {snap.interestCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {snap.interestCounts.map((i) => (
                <Chip key={i.tag} tone={i.share > 0.5 ? 'good' : 'neutral'} className="capitalize">
                  {INTEREST_ICONS[i.tag]} {i.tag} · {i.count}
                </Chip>
              ))}
            </div>
          )}
          {snap.mustDos.length > 0 && (
            <div className="mt-4">
              <div className="label">Must-dos going straight in</div>
              <div className="flex flex-wrap gap-1.5">
                {snap.mustDos.map((md, i) => (
                  <Chip key={i} tone="bad">
                    ★ {md.text} — {md.memberName}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!allDone && (
        <div className="mt-4">
          <Notice tone="info">
            {trip.members.filter((m) => !m.quiz).map((m) => m.name).join(', ')} still
            {trip.members.filter((m) => !m.quiz).length === 1 ? ' has' : ' have'} the quiz to do. You
            can generate now and their answers will fold in when they finish.
          </Notice>
        </div>
      )}

      <button className="btn-accent mt-8 w-full py-3.5 text-base" onClick={generate} disabled={busy}>
        {busy ? <Spinner label="Building your itinerary…" /> : '✨ Generate Itinerary'}
      </button>
    </SetupShell>
  );
}
