import React, { useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ActivityCard, formatDuration } from '../components/ActivityCard';
import { Card, Chip, EmptyState, Modal, money, Notice, Spinner } from '../components/ui';
import { useStore } from '../store/store';
import { findDestination } from '../data/destinations';
import { formatDate } from '../domain/dates';
import { estimateLeg } from '../domain/geo';
import { regenerateDay, replanDay, swapAlternatives } from '../services/ai';
import { searchRides, type RideOffer } from '../services/travel';
import type { Activity, Trip } from '../types';
import { STICKER_CATALOG } from '../data/stickers';

export default function Itinerary() {
  const trip = useOutletContext<Trip>();
  const navigate = useNavigate();
  const store = useStore();
  const dest = findDestination(trip.destinationId)!;

  const [dayIndex, setDayIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<Activity | null>(null);
  const [alternatives, setAlternatives] = useState<Activity[] | null>(null);
  const [rideFor, setRideFor] = useState<{ from: Activity; to: Activity; km: number } | null>(null);
  const [rides, setRides] = useState<RideOffer[] | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [photoFor, setPhotoFor] = useState<Activity | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const day = trip.days[dayIndex];
  const visitedIds = useMemo(
    () => new Set(trip.visits.map((v) => v.activityId)),
    [trip.visits],
  );

  if (trip.days.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        title="No itinerary yet"
        body="Finish setup and generate a plan, or build one from your saved social posts."
        action={
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => navigate(`/setup/${trip.id}/waiting`)}>
              Back to setup
            </button>
            <button className="btn-ghost" onClick={() => navigate(`/trip/${trip.id}/social`)}>
              Build from saved posts
            </button>
          </div>
        }
      />
    );
  }

  const dayCost = day.activities.reduce((s, a) => s + a.cost, 0);

  const doSwap = async (a: Activity) => {
    setSwapFor(a);
    setAlternatives(null);
    setAlternatives(await swapAlternatives(trip, dest, a));
  };

  const doRegenerate = async () => {
    setBusy('regen');
    const next = await regenerateDay(trip, dest, dayIndex);
    store.setDays(trip.days.map((d, i) => (i === dayIndex ? next : d)));
    setBusy(null);
  };

  const doCheckIn = (a: Activity) => {
    const before = new Set(store.state.profile.stickers.map((s) => s.stickerId));
    store.checkIn(a, 'manual');
    // Report what this check-in earned. Recomputed from the catalog rather than
    // read back from state, which has not re-rendered yet at this point.
    const itemId = a.poiId ?? a.dishId;
    const def = STICKER_CATALOG.find((s) => s.itemId === itemId);
    if (def && !before.has(def.id)) {
      setUnlocked((u) => [...u, def.id]);
      setTimeout(() => setUnlocked((u) => u.filter((x) => x !== def.id)), 4200);
    }
  };

  const openRide = async (from: Activity, to: Activity) => {
    const leg = estimateLeg(from, to);
    setRideFor({ from, to, km: leg.km });
    setRides(null);
    setRides(await searchRides(dest, leg.km, trip.members.length));
  };

  const bookRide = (offer: RideOffer) => {
    if (!rideFor) return;
    store.addCostItem({
      label: `${offer.provider} ${offer.tier}: ${rideFor.from.name} → ${rideFor.to.name}`,
      amount: offer.price,
      category: 'transport',
      paidBy: store.state.profile.memberId,
      splitAmong: trip.members.map((m) => m.id),
      date: day.date,
      source: 'manual',
    });
    setRideFor(null);
    setRides(null);
  };

  const onDrop = (to: number) => {
    if (dragFrom.current === null || dragFrom.current === to) return;
    store.reorderActivity(dayIndex, dragFrom.current, to);
    dragFrom.current = null;
    setDragging(null);
  };

  return (
    <div className="stack gap-4">
      {unlocked.map((id) => {
        const def = STICKER_CATALOG.find((s) => s.id === id)!;
        return (
          <div key={id} className="pop fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-paper shadow-2xl">
              <span className="text-3xl">{def.icon}</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-paper/60">Sticker unlocked</div>
                <div className="font-display text-lg">{def.displayName}</div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {trip.days.map((d, i) => (
            <button
              key={d.date}
              onClick={() => setDayIndex(i)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-left transition ${i === dayIndex ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/5 hover:bg-sand'}`}
            >
              <div className="text-[10px] uppercase tracking-wide opacity-60">Day {i + 1}</div>
              <div className="text-sm font-semibold">{formatDate(d.date, { weekday: 'short' })}</div>
            </button>
          ))}
        </div>
        <button className="btn-accent ml-auto shrink-0" onClick={() => setChangeOpen(true)}>
          ⚡ Something changed
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h2">
          Day {dayIndex + 1} ·{' '}
          {formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
        <Chip tone="neutral">{money(dayCost, trip.currency)} planned</Chip>
        <div className="ml-auto flex gap-1.5">
          <button className="btn-ghost text-xs" onClick={() => navigate(`/trip/${trip.id}/social`)}>
            📱 Add from saved posts
          </button>
          <button className="btn-ghost text-xs" onClick={doRegenerate} disabled={busy === 'regen'}>
            {busy === 'regen' ? <Spinner /> : '🔁 Regenerate day'}
          </button>
        </div>
      </div>

      {day.note && (
        <Notice tone="info">
          <strong>Note on this day:</strong> {day.note}
        </Notice>
      )}

      <div className="stack gap-2">
        {day.activities.map((a, i) => (
          <React.Fragment key={a.id}>
            {i > 0 && <TravelLeg from={day.activities[i - 1]} to={a} onRide={openRide} dest={dest} />}
            <ActivityCard
              activity={a}
              trip={trip}
              index={i}
              dayIndex={dayIndex}
              visited={visitedIds.has(a.id)}
              photoCount={trip.media.filter((m) => m.activityId === a.id && m.tag === 'gallery').length}
              onSwap={() => doSwap(a)}
              onRemove={() => store.removeActivity(dayIndex, a.id)}
              onCheckIn={() => doCheckIn(a)}
              onPhotos={() => setPhotoFor(a)}
              onDragStart={() => {
                dragFrom.current = i;
                setDragging(i);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              dragging={dragging === i}
            />
          </React.Fragment>
        ))}
        {day.activities.length === 0 && (
          <EmptyState
            icon="🌤️"
            title="Nothing planned"
            body="A free day is a legitimate choice. Regenerate the day if you'd rather have a plan."
          />
        )}
      </div>

      <p className="text-center text-xs muted">
        Drag a card to reorder. Times and travel gaps recalculate on the next regenerate.
      </p>

      <SwapModal
        activity={swapFor}
        alternatives={alternatives}
        currency={trip.currency}
        onClose={() => {
          setSwapFor(null);
          setAlternatives(null);
        }}
        onPick={(alt) => {
          if (!swapFor) return;
          store.replaceActivity(dayIndex, swapFor.id, { ...alt, start: swapFor.start });
          setSwapFor(null);
          setAlternatives(null);
        }}
      />

      <RideModal
        target={rideFor}
        rides={rides}
        dest={dest}
        riders={trip.members.length}
        currency={trip.currency}
        onClose={() => {
          setRideFor(null);
          setRides(null);
        }}
        onBook={bookRide}
      />

      <SomethingChanged
        open={changeOpen}
        trip={trip}
        dayIndex={dayIndex}
        onClose={() => setChangeOpen(false)}
        onApply={(nextDay) => {
          store.setDays(trip.days.map((d, i) => (i === dayIndex ? nextDay : d)));
          setChangeOpen(false);
        }}
      />

      <PhotoModal activity={photoFor} trip={trip} onClose={() => setPhotoFor(null)} />
    </div>
  );
}

function TravelLeg({
  from,
  to,
  dest,
  onRide,
}: {
  from: Activity;
  to: Activity;
  dest: ReturnType<typeof findDestination>;
  onRide: (a: Activity, b: Activity) => void;
}) {
  const leg = estimateLeg(from, to);
  const icon = { walk: '🚶', transit: '🚌', ride: '🚕' }[leg.mode];
  return (
    <div className="flex items-center gap-2 pl-6 text-xs">
      <span className="h-6 w-px bg-black/10" />
      <span className="muted">
        {icon} {leg.km} km · {formatDuration(leg.minutes)} by {leg.mode}
      </span>
      {leg.mode !== 'walk' && (
        <button className="chip bg-white ring-1 ring-black/10 hover:bg-sand" onClick={() => onRide(from, to)}>
          {dest?.rideHailing ? `Get there with ${dest.rideHailing}` : 'Get there'}
        </button>
      )}
      {leg.impractical && <Chip tone="warn">That's a long way for one day</Chip>}
    </div>
  );
}

function SwapModal({
  activity,
  alternatives,
  currency,
  onClose,
  onPick,
}: {
  activity: Activity | null;
  alternatives: Activity[] | null;
  currency: string;
  onClose: () => void;
  onPick: (a: Activity) => void;
}) {
  return (
    <Modal open={Boolean(activity)} onClose={onClose} title={`Swap ${activity?.name ?? ''}`}>
      {!alternatives ? (
        <div className="py-8 text-center">
          <Spinner label="Finding alternatives nearby…" />
        </div>
      ) : alternatives.length === 0 ? (
        <p className="text-sm muted">
          Nothing else on file nearby that isn't already in the plan. Try regenerating the whole day.
        </p>
      ) : (
        <div className="stack gap-2">
          {alternatives.map((alt) => (
            <button key={alt.id} onClick={() => onPick(alt)} className="text-left">
              <Card className="p-3.5 transition hover:border-black/20">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{alt.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{alt.name}</div>
                    <p className="mt-0.5 text-xs muted">{alt.description}</p>
                    <div className="mt-1.5 flex gap-2 text-[11px] text-ink/50">
                      <span>{formatDuration(alt.durationMin)}</span>
                      <span>{money(alt.cost, currency)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function RideModal({
  target,
  rides,
  dest,
  riders,
  currency,
  onClose,
  onBook,
}: {
  target: { from: Activity; to: Activity; km: number } | null;
  rides: RideOffer[] | null;
  dest: ReturnType<typeof findDestination>;
  riders: number;
  currency: string;
  onClose: () => void;
  onBook: (o: RideOffer) => void;
}) {
  return (
    <Modal open={Boolean(target)} onClose={onClose} title="Get there">
      {target && (
        <>
          <div className="mb-4 rounded-xl bg-sand p-3.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-ink/40">From</span>
              <span className="font-medium">{target.from.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-ink/40">To</span>
              <span className="font-medium">{target.to.name}</span>
            </div>
            <div className="mt-1 text-xs muted">{target.km} km · pickup and drop-off pre-filled from the stops</div>
          </div>

          {!rides ? (
            <div className="py-6 text-center">
              <Spinner label="Checking live ride options…" />
            </div>
          ) : rides.length === 0 ? (
            <div>
              <Notice tone="info">
                No ride-hailing coverage here. A local driver for the day is usually the better
                option anyway.
              </Notice>
              <div className="mt-3 stack gap-2">
                {dest?.localDrivers.map((d) => (
                  <Card key={d.name} className="flex items-center gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{d.name}</div>
                      <div className="text-xs muted">
                        {d.vehicle} · ★ {d.rating}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{money(d.perDay, currency)}/day</div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="stack gap-2">
              {riders > 1 && (
                <Notice tone="good">
                  {riders} of you are heading the same way — one shared ride, fare split{' '}
                  {riders} ways and tagged to Transport.
                </Notice>
              )}
              {rides.map((r) => (
                <button key={r.id} onClick={() => onBook(r)} className="text-left">
                  <Card className="flex items-center gap-3 p-3.5 transition hover:border-black/20">
                    <span className="text-xl">🚕</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">
                        {r.provider} {r.tier}
                      </div>
                      <div className="text-xs muted">
                        {r.seats} seats · driver {r.etaMin} min away
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{money(r.price, r.currency)}</div>
                      {riders > 1 && (
                        <div className="text-[11px] muted">
                          {money(r.price / riders, r.currency)} each
                        </div>
                      )}
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function SomethingChanged({
  open,
  trip,
  dayIndex,
  onClose,
  onApply,
}: {
  open: boolean;
  trip: Trip;
  dayIndex: number;
  onClose: () => void;
  onApply: (day: Trip['days'][number]) => void;
}) {
  const dest = findDestination(trip.destinationId)!;
  const [reason, setReason] = useState('');
  const [fromTime, setFromTime] = useState('12:00');
  const [result, setResult] = useState<{ day: Trip['days'][number]; summary: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult(await replanDay(trip, dest, dayIndex, fromTime, reason));
    setBusy(false);
  };

  const PRESETS = [
    'Heavy rain all afternoon',
    'The museum is closed today',
    'Flight landed two hours late',
    'We are running over budget',
    'Someone is not feeling well',
  ];

  return (
    <Modal open={open} onClose={onClose} title="Something changed" wide>
      <p className="mb-4 text-sm muted">
        Tell us what happened and from when. Only the rest of this day gets reworked — your budget,
        preferences and anything booked stay as they are.
      </p>

      <div className="mb-4">
        <div className="label">What happened?</div>
        <textarea
          className="field min-h-[80px]"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. it started pouring and the island trip is cancelled"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setReason(p)} className="chip bg-sand hover:bg-sand/70">
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="label">Rework from</div>
        <div className="flex flex-wrap gap-1.5">
          {trip.days[dayIndex]?.activities.map((a) => (
            <button
              key={a.id}
              onClick={() => setFromTime(a.start)}
              className={`chip ${fromTime === a.start ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
            >
              {a.start} {a.name}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <Card className="rise mb-4 p-4">
          <div className="label">Proposed rest of the day</div>
          <p className="mb-3 text-sm">{result.summary}</p>
          <div className="stack gap-1.5">
            {result.day.activities.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-sand px-3 py-2 text-sm">
                <span>{a.icon}</span>
                <span className="tabular-nums text-xs text-ink/50">{a.start}</span>
                <span className="font-medium">{a.name}</span>
                <span className="ml-auto text-xs muted">{money(a.cost, trip.currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={run} disabled={!reason.trim() || busy}>
          {busy ? <Spinner /> : result ? '🔁 Try again' : 'Rework the day'}
        </button>
        {result && (
          <button className="btn-primary ml-auto" onClick={() => onApply(result.day)}>
            ✓ Accept changes
          </button>
        )}
      </div>
    </Modal>
  );
}

function PhotoModal({
  activity,
  trip,
  onClose,
}: {
  activity: Activity | null;
  trip: Trip;
  onClose: () => void;
}) {
  const store = useStore();
  const [caption, setCaption] = useState('');
  if (!activity) return null;

  const photos = trip.media.filter((m) => m.activityId === activity.id && m.tag === 'gallery');

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    for (const f of files) {
      const reader = new FileReader();
      reader.onload = () => {
        store.addMedia({
          activityId: activity.id,
          url: String(reader.result),
          kind: f.type.startsWith('video') ? 'video' : 'photo',
          caption: caption || undefined,
          by: store.state.profile.memberId,
          at: store.now.toISOString(),
          tag: 'gallery',
        });
        setCaption('');
      };
      reader.readAsDataURL(f);
    }
    e.target.value = '';
  };

  return (
    <Modal open onClose={onClose} title={activity.name} wide>
      <p className="mb-3 text-sm muted">
        Everything added here lands in the one shared trip album, and feeds the recap at the end.
      </p>
      <input className="field mb-2" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <label className="btn-ghost mb-4 cursor-pointer">
        📷 Add photos or clips
        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFile} />
      </label>

      {photos.length === 0 ? (
        <p className="text-sm muted">Nothing here yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((m) => (
            <figure key={m.id} className="group relative overflow-hidden rounded-xl bg-sand">
              {m.kind === 'video' ? (
                <video src={m.url} className="aspect-square w-full object-cover" controls />
              ) : (
                <img src={m.url} alt={m.caption ?? activity.name} className="aspect-square w-full object-cover" />
              )}
              {m.caption && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1 text-[11px] text-paper">
                  {m.caption}
                </figcaption>
              )}
              <button
                className="absolute right-1 top-1 hidden rounded-full bg-ink/70 px-2 py-0.5 text-xs text-paper group-hover:block"
                onClick={() => store.removeMedia(m.id)}
              >
                ✕
              </button>
            </figure>
          ))}
        </div>
      )}
    </Modal>
  );
}
