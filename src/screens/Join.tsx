import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Card, Chip, Notice } from '../components/ui';
import { useStore } from '../store/store';
import { countdownTo } from '../domain/dates';
import { findDestination, recommendedMonths } from '../data/destinations';
import { MONTHS_LONG } from '../domain/dates';

/** What a friend sees when they tap the invite link. */
export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const store = useStore();
  const [name, setName] = useState('');

  const trip = store.state.trips.find((t) => t.inviteCode === code);
  if (!trip) {
    return (
      <div className="mx-auto max-w-lg">
        <Notice tone="warn">
          No trip found for the code <strong>{code}</strong>. Double-check the link with whoever sent
          it.
        </Notice>
      </div>
    );
  }

  const dest = findDestination(trip.destinationId);
  const countdown = trip.respondBy ? countdownTo(trip.respondBy, store.now) : null;
  const months = dest ? recommendedMonths(dest) : [];

  const join = () => {
    store.setActiveTrip(trip.id);
    const member = store.addMember(name.trim());
    navigate(`/setup/${trip.id}/dates`, { state: { memberId: member.id } });
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6">
        <div className="text-xs uppercase tracking-widest text-ink/40">You're invited to</div>
        <h1 className="h1 mt-1">{trip.destinationName}</h1>
        {dest && <p className="mt-2 muted">{dest.blurb}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="info">
            {trip.members.length} {trip.members.length === 1 ? 'person' : 'people'} so far
          </Chip>
          {months.length > 0 && (
            <Chip tone="good">
              Best time: {MONTHS_LONG[months[0]]}–{MONTHS_LONG[months[months.length - 1]]}
            </Chip>
          )}
        </div>

        <div className="mt-4 flex -space-x-2">
          {trip.members.map((m) => (
            <Avatar key={m.id} name={m.name} color={m.avatarColor} size={34} />
          ))}
        </div>

        {trip.respondBy && (
          <div className="mt-5 rounded-xl bg-sand p-4">
            <div className="label mb-0.5">Get your dates in by</div>
            <div className="font-display text-xl">
              {new Date(trip.respondBy).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              , {new Date(trip.respondBy).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-1 text-sm muted">
              {countdown ? `${countdown} left.` : 'Responses have closed — you can still look around.'}{' '}
              After that the group works with whatever's been submitted.
            </div>
          </div>
        )}

        <div className="mt-5">
          <label className="label" htmlFor="join-name">
            Your name
          </label>
          <input
            id="join-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should everyone call you?"
            autoFocus
          />
        </div>

        <button className="btn-accent mt-4 w-full py-3" disabled={!name.trim()} onClick={join}>
          Join and mark my dates
        </button>
      </Card>
    </div>
  );
}
