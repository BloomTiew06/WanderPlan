import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Chip, Modal, money, Notice, Spinner } from '../components/ui';
import { useStore } from '../store/store';
import { findDestination } from '../data/destinations';
import { daysBetween, formatDate } from '../domain/dates';
import { geocode, LIVE_SEARCH, pollFlightStatus, searchFlights, searchStays, type FlightOffer, type StayOffer, type StatusUpdate } from '../services/travel';
import { nextId, parseBooking, type ParsedBooking } from '../services/ai';
import type { Activity, Trip } from '../types';

/**
 * Sample confirmations for the demo, generated against the trip's real dates so
 * an import lands on the right day rather than falling back to day one.
 */
function sampleFlight(trip: Trip): string {
  const date = trip.dates?.start ?? '2026-04-10';
  return [
    'AirAsia Booking Confirmation',
    'Booking reference: QR7K2M',
    'Flight AK5110  KUL → BKI',
    `${date}  06:45  09:20`,
    `Passengers: ${trip.members.length}`,
    `Total paid: MYR ${(412.6 * trip.members.length).toFixed(2)}`,
  ].join('\n');
}

function sampleHotel(trip: Trip): string {
  return [
    'Jesselton Waterfront Suites',
    'Confirmation: HTL9921',
    `Check-in ${trip.dates?.start ?? '2026-04-10'}, check-out ${trip.dates?.end ?? '2026-04-14'}`,
    'Address: 12 Jalan Haji Saman, Kota Kinabalu',
    '2 rooms, 4 nights',
    'Room total RM 1,240.00',
  ].join('\n');
}

export default function Stays() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const dest = findDestination(trip.destinationId)!;

  const [tab, setTab] = useState<'flights' | 'stays'>('flights');
  const [flights, setFlights] = useState<FlightOffer[] | null>(null);
  const [stays, setStays] = useState<StayOffer[] | null>(null);
  const [origin, setOrigin] = useState('KUL');
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState<StatusUpdate | null>(null);

  const nights = trip.dates ? Math.max(1, daysBetween(trip.dates.start, trip.dates.end)) : 1;

  useEffect(() => {
    if (!trip.dates) return;
    let live = true;
    setFlights(null);
    setStays(null);
    searchFlights(dest, origin, trip.dates).then((f) => live && setFlights(f));
    searchStays(dest, trip.dates).then((s) => live && setStays(s));
    return () => {
      live = false;
    };
  }, [dest, origin, trip.dates?.start, trip.dates?.end]);

  const imported = trip.days
    .flatMap((d) => d.activities)
    .filter((a) => a.source === 'imported');

  const book = (label: string, amount: number, category: 'flights' | 'accommodation') => {
    if (!trip.dates) return;
    store.addCostItem({
      label,
      amount,
      category,
      paidBy: store.state.profile.memberId,
      splitAmong: trip.members.map((m) => m.id),
      date: trip.dates.start,
      source: 'manual',
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Stays & Flights</h1>
        <Chip tone={LIVE_SEARCH ? 'good' : 'neutral'}>
          {LIVE_SEARCH ? 'Live pricing' : 'Sample pricing'}
        </Chip>
        <button className="btn-accent ml-auto" onClick={() => setImportOpen(true)}>
          📄 Import a booking
        </button>
      </div>

      {imported.length > 0 && (
        <Card className="p-5">
          <div className="label">Already booked ({imported.length})</div>
          <p className="mb-3 text-xs muted">
            Imported by someone in the group, so everyone sees the same flight times and check-in
            details. These are locked — the planner won't move them.
          </p>
          <div className="grid gap-2">
            {imported.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-sand/60 px-3.5 py-3">
                <span className="text-xl">{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.name}</div>
                  <div className="text-xs muted">{a.address}</div>
                </div>
                <Chip tone="info">Imported</Chip>
                <span className="text-sm font-semibold">{money(a.cost, trip.currency)}</span>
              </div>
            ))}
          </div>
          {imported.some((a) => a.category === 'flights') && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="btn-ghost text-xs"
                onClick={() => {
                  const flight = imported.find((a) => a.category === 'flights')!;
                  const code = flight.name.match(/\b[A-Z]{2}\d{2,4}\b/)?.[0] ?? 'AK5110';
                  setStatus(pollFlightStatus(code, 2));
                }}
              >
                🛫 Check flight status
              </button>
              <span className="text-xs muted">
                A real build polls this and pushes a notification without you asking.
              </span>
            </div>
          )}
          {status && (
            <div className="mt-3">
              <Notice tone="warn">
                <strong>{status.flightNumber} {status.status}.</strong> {status.message} Use
                “Something changed” on the itinerary to rework the rest of that day.
              </Notice>
            </div>
          )}
        </Card>
      )}

      <div className="flex gap-1.5">
        {(['flights', 'stays'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip capitalize ${tab === t ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10 hover:bg-sand'}`}
          >
            {t === 'flights' ? '✈️ Flights' : '🏨 Stays'}
          </button>
        ))}
        {trip.dates && (
          <span className="chip bg-sand">
            {formatDate(trip.dates.start)} – {formatDate(trip.dates.end)} · {nights} nights
          </span>
        )}
      </div>

      {!trip.dates ? (
        <Notice tone="info">Confirm your dates first and live results will show up here.</Notice>
      ) : tab === 'flights' ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="label mb-0">Flying from</span>
            <div className="flex gap-1">
              {['KUL', 'SIN', 'BKK'].map((o) => (
                <button
                  key={o}
                  onClick={() => setOrigin(o)}
                  className={`chip ${origin === o ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
          {!flights ? (
            <div className="py-8 text-center">
              <Spinner label="Searching flights…" />
            </div>
          ) : (
            <div className="grid gap-2">
              {flights.map((f) => (
                <Card key={f.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {f.airline} {f.code}
                    </div>
                    <div className="text-xs muted">
                      {f.departTime} {f.from} → {f.arriveTime} {f.to} ·{' '}
                      {Math.floor(f.durationMin / 60)}h {f.durationMin % 60}m ·{' '}
                      {f.stops === 0 ? 'direct' : `${f.stops} stop`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg">{money(f.price, f.currency)}</div>
                    <div className="text-[11px] muted">per person</div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => book(`${f.airline} ${f.code} ${f.from}→${f.to}`, f.price * trip.members.length, 'flights')}
                  >
                    Book for {trip.members.length}
                  </button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-5">
          {!stays ? (
            <div className="py-8 text-center">
              <Spinner label="Searching stays…" />
            </div>
          ) : (
            <div className="grid gap-2">
              {stays.map((s) => (
                <Card key={s.id} className="flex flex-wrap items-center gap-3 p-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.name}</div>
                    <div className="text-xs muted">
                      {s.area} · ★ {s.rating} ({s.reviews.toLocaleString()}) ·{' '}
                      {s.amenities.join(', ') || 'No listed amenities'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg">{money(s.perNight, s.currency)}</div>
                    <div className="text-[11px] muted">per night</div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => book(`${s.name}, ${nights} nights`, s.perNight * nights, 'accommodation')}
                  >
                    Book {nights} nights
                  </button>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      <ImportModal open={importOpen} trip={trip} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ImportModal({ open, trip, onClose }: { open: boolean; trip: Trip; onClose: () => void }) {
  const store = useStore();
  const dest = findDestination(trip.destinationId)!;
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);

  const run = async () => {
    setBusy(true);
    setParsed(await parseBooking(raw, trip.currency));
    setBusy(false);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result).slice(0, 8000));
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirm = () => {
    if (!parsed || !trip.dates) return;
    const isFlight = parsed.kind === 'flight';
    const date = (isFlight ? parsed.departDate : parsed.checkIn) ?? trip.dates.start;
    // Slot it onto the matching day where one exists, otherwise day one.
    const dayIndex = Math.max(0, trip.days.findIndex((d) => d.date === date));
    const address = parsed.address ?? (isFlight ? `${parsed.from} airport` : parsed.provider);
    const { lat, lng } = geocode(address, dest);

    const activity: Activity = {
      id: nextId('act'),
      name: isFlight
        ? `${parsed.provider} ${parsed.flightNumber ?? ''} ${parsed.from ?? ''}→${parsed.to ?? ''}`.trim()
        : `Check in — ${parsed.provider}`,
      description: `Booking reference ${parsed.reference}. Imported from a confirmation, not booked through WanderPlan.`,
      address,
      lat,
      lng,
      start: parsed.departTime ?? '14:00',
      durationMin: isFlight ? 180 : 30,
      cost: parsed.cost,
      category: isFlight ? 'flights' : 'accommodation',
      source: 'imported',
      locked: true,
      icon: isFlight ? '✈️' : '🏨',
    };

    if (trip.days.length > 0) store.addActivity(dayIndex, activity);
    store.addCostItem({
      label: activity.name,
      amount: parsed.cost,
      category: activity.category,
      paidBy: store.state.profile.memberId,
      splitAmong: trip.members.map((m) => m.id),
      date,
      source: 'imported',
      activityId: activity.id,
    });
    setParsed(null);
    setRaw('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Import an existing booking" wide>
      <p className="mb-4 text-sm muted">
        Booked somewhere else? Paste the confirmation email or upload the file. We'll pull out the
        details and drop it into the itinerary as a locked card, visible to the whole group.
      </p>

      <textarea
        className="field min-h-[140px] font-mono text-xs"
        placeholder="Paste the confirmation email or PDF text…"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="btn-ghost cursor-pointer text-xs">
          📎 Upload a file
          <input type="file" accept=".txt,.eml,.pdf,text/*" className="hidden" onChange={onFile} />
        </label>
        <button className="btn-quiet text-xs" onClick={() => setRaw(sampleFlight(trip))}>
          Sample flight
        </button>
        <button className="btn-quiet text-xs" onClick={() => setRaw(sampleHotel(trip))}>
          Sample hotel
        </button>
        <button className="btn-primary ml-auto" onClick={run} disabled={!raw.trim() || busy}>
          {busy ? <Spinner /> : 'Parse it'}
        </button>
      </div>

      {parsed && (
        <Card className="rise mt-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Chip tone="info">{parsed.kind === 'flight' ? '✈️ Flight' : '🏨 Hotel'}</Chip>
            <span className="text-sm font-semibold">{parsed.provider}</span>
          </div>
          <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
            <Row label="Reference" value={parsed.reference} />
            {parsed.flightNumber && <Row label="Flight" value={parsed.flightNumber} />}
            {parsed.from && <Row label="Route" value={`${parsed.from} → ${parsed.to}`} />}
            {parsed.departDate && <Row label="Departs" value={`${parsed.departDate} ${parsed.departTime ?? ''}`} />}
            {parsed.arriveTime && <Row label="Arrives" value={parsed.arriveTime} />}
            {parsed.checkIn && <Row label="Check in" value={parsed.checkIn} />}
            {parsed.checkOut && <Row label="Check out" value={parsed.checkOut} />}
            {parsed.address && <Row label="Address" value={parsed.address} />}
            <Row label="Cost" value={money(parsed.cost, parsed.currency)} />
          </dl>
          {parsed.cost === 0 && (
            <div className="mt-3">
              <Notice tone="warn">
                No amount found in that text. It'll import at zero — edit it on the Budget tab.
              </Notice>
            </div>
          )}
          <button className="btn-accent mt-4 w-full" onClick={confirm}>
            Add to itinerary and budget
          </button>
        </Card>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium">{value}</dd>
    </div>
  );
}
