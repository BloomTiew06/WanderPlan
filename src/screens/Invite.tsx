import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Avatar, Card, Notice } from '../components/ui';
import { useStore } from '../store/store';
import { SUGGESTED_FRIENDS } from '../store/seed';
import { addDays } from '../domain/dates';

/**
 * Invite screen: share code, response deadline, and joining friends.
 *
 * A real build hands out a link that opens a join screen. Here, adding someone
 * stands in for them tapping the link and entering their name, so the whole
 * group flow is walkable by one person on stage.
 */
export default function Invite() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state, updateTrip, addMember, setActiveTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [deadlineTime, setDeadlineTime] = useState('18:00');

  if (!trip) return <Notice tone="warn">That trip no longer exists.</Notice>;

  const link = `${window.location.origin}${window.location.pathname}#/join/${trip.inviteCode}`;
  const respondBy = new Date(`${addDays(new Date().toISOString().slice(0, 10), deadlineDays)}T${deadlineTime}:00`);

  const add = (n: string) => {
    const clean = n.trim();
    if (!clean) return;
    setActiveTrip(trip.id);
    addMember(clean);
    setName('');
  };

  const next = () => {
    updateTrip(trip.id, (t) => ({ ...t, respondBy: respondBy.toISOString() }));
    navigate(`/setup/${trip.id}/dates`);
  };

  return (
    <SetupShell
      step={3}
      total={5}
      title="Get everyone in"
      subtitle="Send the link, set a deadline for dates, and the app chases the stragglers so you don't have to."
      onBack={() => navigate(`/setup/${trip.id}/best-time`)}
    >
      <Card className="p-5">
        <div className="label">Invite link</div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-sand px-3 py-2.5 text-xs">{link}</code>
          <button
            className="btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(link).catch(() => undefined);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div>
            <div className="label">Or share the code</div>
            <div className="font-display text-3xl tracking-[0.3em]">{trip.inviteCode}</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="label">Response deadline</div>
        <p className="mb-3 text-sm muted">
          Everyone sees this on the join screen and on the waiting screen. When it passes, the app
          works with whatever's been submitted rather than waiting forever.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {[2, 3, 5, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDeadlineDays(d)}
                className={`chip ${deadlineDays === d ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
              >
                {d} days
              </button>
            ))}
          </div>
          <input
            type="time"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            className="field w-auto"
          />
        </div>
        <p className="mt-3 text-sm">
          Responses close{' '}
          <strong>
            {respondBy.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })},{' '}
            {deadlineTime}
          </strong>
          .
        </p>
      </Card>

      <Card className="mt-4 p-5">
        <div className="label">Who's joined ({trip.members.length})</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {trip.members.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-2 rounded-full bg-sand py-1 pl-1 pr-3">
              <Avatar name={m.name} color={m.avatarColor} size={26} />
              <span className="text-sm font-medium">{m.name}</span>
              {m.role === 'organizer' && <span className="text-[10px] uppercase text-ink/40">organizer</span>}
            </span>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(name);
          }}
        >
          <input
            className="field"
            placeholder="Add someone who joined via the link…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn-ghost shrink-0" type="submit">
            Add
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTED_FRIENDS.filter((f) => !trip.members.some((m) => m.name === f)).map((f) => (
            <button key={f} onClick={() => add(f)} className="chip bg-white ring-1 ring-black/10 hover:bg-sand">
              + {f}
            </button>
          ))}
        </div>
      </Card>

      <button className="btn-primary mt-8 w-full py-3" onClick={next}>
        {trip.members.length > 1
          ? `Collect availability from ${trip.members.length} people`
          : 'Continue on your own for now'}
      </button>
    </SetupShell>
  );
}
