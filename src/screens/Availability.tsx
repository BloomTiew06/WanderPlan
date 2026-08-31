import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Avatar, Card, Chip, Notice } from '../components/ui';
import { Calendar } from '../components/Calendar';
import { useStore } from '../store/store';
import { findDestination, recommendedMonths } from '../data/destinations';
import { addDays, countdownTo, formatRange, iso, MONTHS_LONG, monthsInWindow, rangeLength } from '../domain/dates';
import { findOverlap, hasSubmitted, isOutsideSeason, trimToLength } from '../domain/availability';
import type { DateRange } from '../types';
import { remindAvailability } from '../services/notify';

export default function Availability() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state, updateTrip, setAvailability, setActiveTrip, now } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);
  const dest = trip ? findDestination(trip.destinationId) : undefined;

  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [draft, setDraft] = useState<DateRange[]>([]);
  const [locked, setLocked] = useState(false);
  const [chosen, setChosen] = useState<DateRange | null>(null);
  const [tripLength, setTripLength] = useState(5);
  const [reminded, setReminded] = useState(false);

  const recommended = useMemo(() => (dest ? recommendedMonths(dest) : []), [dest]);

  const windowMonths = useMemo(() => {
    if (!trip?.seasonWindow) return recommended;
    return monthsInWindow(trip.seasonWindow.startMonth, trip.seasonWindow.endMonth);
  }, [trip?.seasonWindow, recommended]);

  // Start the calendar on the first month of the chosen season, this year or next.
  const calendarStart = useMemo(() => {
    if (!trip?.seasonWindow) return iso(now);
    const y = now.getUTCFullYear();
    const m = trip.seasonWindow.startMonth;
    const thisYear = new Date(Date.UTC(y, m, 1));
    return iso(thisYear.getTime() < now.getTime() ? new Date(Date.UTC(y + 1, m, 1)) : thisYear);
  }, [trip?.seasonWindow, now]);

  const overlap = useMemo(
    () => (trip ? findOverlap(trip.members, { preferredMonths: windowMonths, minDays: 3 }) : null),
    [trip, windowMonths],
  );

  if (!trip || !dest || !overlap) return <Notice tone="warn">That trip no longer exists.</Notice>;

  const submitted = trip.members.filter(hasSubmitted);
  const pending = trip.members.filter((m) => !hasSubmitted(m));
  const countdown = trip.respondBy ? countdownTo(trip.respondBy, now) : null;
  const deadlinePassed = Boolean(trip.respondBy && !countdown);
  const isLocked = locked || deadlinePassed;
  const everyoneIn = pending.length === 0;
  const showResult = isLocked || everyoneIn;

  const proposed = chosen ?? (overlap.window ? trimToLength(overlap.window, tripLength) : null);
  const outsideSeason = proposed ? isOutsideSeason(proposed, recommended) : false;

  const openFor = (id: string) => {
    const m = trip.members.find((x) => x.id === id)!;
    setActiveMember(id);
    setDraft(m.availability);
  };

  const save = () => {
    if (!activeMember) return;
    setActiveTrip(trip.id);
    setAvailability(activeMember, draft);
    setActiveMember(null);
    setDraft([]);
  };

  const confirmDates = () => {
    if (!proposed) return;
    updateTrip(trip.id, (t) => ({
      ...t,
      dates: proposed,
      datesConfirmed: true,
      outsideRecommendedSeason: outsideSeason,
      stage: 'quiz',
    }));
    navigate(`/setup/${trip.id}/quiz`);
  };

  return (
    <SetupShell
      step={4}
      total={5}
      title="When is everyone actually free?"
      subtitle={`Mark the days you can travel. The recommended season for ${dest.city} is highlighted, but you're not locked into it.`}
      onBack={() => navigate(trip.mode === 'group' ? `/setup/${trip.id}/invite` : `/setup/${trip.id}/best-time`)}
    >
      {trip.respondBy && (
        <Card className="mb-4 flex flex-wrap items-center gap-4 p-4">
          <div>
            <div className="label mb-0.5">Responses close</div>
            <div className="font-display text-xl">
              {new Date(trip.respondBy).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short',
              })}
              , {new Date(trip.respondBy).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="label mb-0.5">Time left</div>
            <div className={`font-display text-2xl ${isLocked ? 'text-clay' : ''}`}>
              {isLocked ? 'Closed' : countdown}
            </div>
          </div>
          {!isLocked && pending.length > 0 && (
            <div className="flex w-full flex-wrap gap-2 border-t border-black/5 pt-3">
              <button
                className="btn-ghost text-xs"
                onClick={() => {
                  remindAvailability(pending.map((m) => m.name), trip.respondBy!);
                  setReminded(true);
                }}
              >
                🔔 Send a reminder to {pending.length} {pending.length === 1 ? 'person' : 'people'}
              </button>
              <button className="btn-quiet text-xs" onClick={() => setLocked(true)}>
                Close responses now
              </button>
              {reminded && <Chip tone="good">Reminder queued — see the outbox on Check-ins</Chip>}
            </div>
          )}
        </Card>
      )}

      <Card className="p-5">
        <div className="label">Who's responded</div>
        <div className="stack gap-2">
          {trip.members.map((m) => {
            const done = hasSubmitted(m);
            const days = m.availability.reduce((s, r) => s + rangeLength(r), 0);
            return (
              <button
                key={m.id}
                onClick={() => openFor(m.id)}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-sand"
              >
                <Avatar name={m.name} color={m.avatarColor} dim={!done} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {m.name}
                    {m.id === trip.createdBy && <span className="ml-2 text-[10px] uppercase text-ink/35">organizer</span>}
                  </div>
                  <div className="text-xs muted">
                    {done ? `${days} days marked free` : isLocked ? 'Never responded' : 'Waiting on them'}
                  </div>
                </div>
                {done ? (
                  <Chip tone="good">✓ In</Chip>
                ) : isLocked ? (
                  <Chip tone="neutral">No restriction</Chip>
                ) : (
                  <Chip tone="warn">Pending</Chip>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {activeMember && (
        <Card className="rise mt-4 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl">
              {trip.members.find((m) => m.id === activeMember)!.name}'s availability
            </h3>
            <span className="text-xs muted">Tap days, or drag across a run of them.</span>
            <button className="btn-quiet ml-auto text-xs" onClick={() => setActiveMember(null)}>
              Cancel
            </button>
          </div>
          <Calendar
            value={draft}
            onChange={setDraft}
            recommendedMonths={windowMonths}
            startMonth={calendarStart}
            minDate={iso(now)}
            monthCount={2}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm muted">
              {draft.reduce((s, r) => s + rangeLength(r), 0)} days marked
            </span>
            <button className="btn-quiet text-xs" onClick={() => setDraft([])}>
              Clear
            </button>
            <button className="btn-primary ml-auto" onClick={save} disabled={draft.length === 0}>
              Submit availability
            </button>
          </div>
        </Card>
      )}

      {showResult && (
        <Card className="rise mt-4 p-5">
          <div className="label">The overlap</div>

          {!overlap.window && (
            <Notice tone="warn">
              Nothing lines up yet across the {submitted.length} response
              {submitted.length === 1 ? '' : 's'} so far. Either someone needs to widen their dates,
              or you pick a window that works for most of you and go from there.
            </Notice>
          )}

          {overlap.window && (
            <>
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="font-display text-2xl">{formatRange(overlap.window)}</h3>
                {overlap.full ? (
                  <Chip tone="good">Everyone's free</Chip>
                ) : (
                  <Chip tone="warn">Best partial overlap</Chip>
                )}
              </div>

              <p className="mt-2 text-sm muted">
                {overlap.full
                  ? `All ${overlap.responders.length} responders can do this whole window.`
                  : `${overlap.candidates[0].memberIds.length} of ${overlap.responders.length} responders can do this whole window.`}
                {overlap.nonResponders.length > 0 && (
                  <>
                    {' '}
                    {overlap.nonResponders.length} never responded (
                    {overlap.nonResponders
                      .map((id) => trip.members.find((m) => m.id === id)?.name)
                      .join(', ')}
                    ), so we've treated them as no restriction rather than blocking the trip.
                  </>
                )}
              </p>

              {overlap.missing.length > 0 && (
                <div className="mt-3 grid gap-1.5">
                  {overlap.missing.map((m) => {
                    const member = trip.members.find((x) => x.id === m.memberId)!;
                    return (
                      <div key={m.memberId} className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
                        <Avatar name={member.name} color={member.avatarColor} size={22} />
                        <span>
                          <strong>{member.name}</strong> would miss {m.dates.length} of these days
                          {m.dates.length <= 3 && ` (${m.dates.map((d) => d.slice(8)).join(', ')} ${MONTHS_LONG[new Date(`${m.dates[0]}T00:00:00Z`).getUTCMonth()]})`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-5">
                <div className="label">How long are you going for?</div>
                <div className="flex flex-wrap items-center gap-2">
                  {[3, 4, 5, 7].filter((n) => n <= rangeLength(overlap.window!)).map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setTripLength(n);
                        setChosen(trimToLength(overlap.window!, n));
                      }}
                      className={`chip ${(chosen ? rangeLength(chosen) : tripLength) === n ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                    >
                      {n} days
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setChosen(overlap.window);
                      setTripLength(rangeLength(overlap.window!));
                    }}
                    className={`chip ${chosen && rangeLength(chosen) === rangeLength(overlap.window) ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                  >
                    All {rangeLength(overlap.window)} days
                  </button>
                </div>
              </div>

              {overlap.candidates.length > 1 && (
                <div className="mt-4">
                  <div className="label">Runners-up</div>
                  <div className="flex flex-wrap gap-2">
                    {overlap.candidates.slice(1).map((c) => (
                      <button
                        key={`${c.range.start}-${c.range.end}`}
                        onClick={() => setChosen(c.range)}
                        className="chip bg-white ring-1 ring-black/10 hover:bg-sand"
                      >
                        {formatRange(c.range)} · {c.memberIds.length}/{overlap.responders.length} free
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {proposed && (
                <div className="mt-5 rounded-xl bg-sand p-4">
                  <div className="label mb-1">Proposed dates</div>
                  <div className="font-display text-2xl">{formatRange(proposed)}</div>
                  <div className="mt-1 text-sm muted">
                    {rangeLength(proposed)} days · {addDays(proposed.end, 1) && ''}
                    {outsideSeason ? 'outside' : 'inside'} the recommended season
                  </div>
                </div>
              )}

              {outsideSeason && (
                <div className="mt-3">
                  <Notice tone="warn">
                    Heads up: this window falls outside the ideal stretch for {dest.city}. Work
                    leave and school terms usually beat perfect weather, so this is a nudge, not a
                    block — just pack for it.
                  </Notice>
                </div>
              )}

              <button className="btn-primary mt-5 w-full py-3" onClick={confirmDates}>
                Lock in {proposed ? formatRange(proposed) : 'these dates'}
              </button>
              <p className="mt-2 text-center text-xs muted">
                The organizer confirms; everyone sees the decision immediately.
              </p>
            </>
          )}
        </Card>
      )}

      {!showResult && (
        <p className="mt-4 text-center text-sm muted">
          The overlap appears once everyone's responded, or once the deadline closes.
        </p>
      )}
    </SetupShell>
  );
}
