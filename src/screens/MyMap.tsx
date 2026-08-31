import { useMemo, useState } from 'react';
import { Card, Chip, EmptyState, Stat } from '../components/ui';
import { WorldMap } from '../components/WorldMap';
import { useStore } from '../store/store';
import { totalDistanceKm } from '../domain/geo';
import { formatDate } from '../domain/dates';
import type { Visit } from '../types';

export default function MyMap() {
  const { state } = useStore();
  const [selected, setSelected] = useState<Visit | null>(null);

  const visits = useMemo(
    () =>
      state.trips
        .flatMap((t) => t.visits)
        .filter((v) => v.memberId === state.profile.memberId)
        .sort((a, b) => a.at.localeCompare(b.at)),
    [state.trips, state.profile.memberId],
  );

  const countries = new Set(visits.map((v) => v.countryCode));
  const cities = new Set(visits.map((v) => v.city));
  const trips = new Set(visits.map((v) => v.tripId));
  const km = totalDistanceKm(visits.map((v) => ({ lat: v.lat, lng: v.lng })));

  const selectedTrip = selected ? state.trips.find((t) => t.id === selected.tripId) : null;
  const photos = selected
    ? (selectedTrip?.media ?? []).filter((m) => m.activityId === selected.activityId)
    : [];

  return (
    <div className="stack gap-4">
      <div>
        <h1 className="h1">Everywhere you've been</h1>
        <p className="mt-2 muted">
          Pins land automatically when you're at an activity during its time slot, or when you tap
          “I'm here” on a card.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={countries.size} label="Countries" />
        <Stat value={cities.size} label="Cities" />
        <Stat value={trips.size} label="Trips" />
        <Stat value={`${km.toLocaleString()} km`} label="Travelled" />
      </div>

      {visits.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No pins yet"
          body="Check in at somewhere on an itinerary and this fills in — countries shade, cities pin, stickers unlock."
        />
      ) : (
        <>
          <WorldMap visits={visits} onPick={setSelected} selectedId={selected?.id} />

          {selected && (
            <Card className="rise p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl">{selected.placeName}</h2>
                <Chip tone="info">{selected.method === 'auto' ? 'Auto check-in' : 'Tapped “I’m here”'}</Chip>
              </div>
              <p className="mt-1 text-sm muted">
                {selected.city}, {selected.country} ·{' '}
                {formatDate(selected.at.slice(0, 10), { weekday: 'long', year: 'numeric' })}
                {selectedTrip && ` · ${selectedTrip.destinationName} trip`}
              </p>
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photos.map((p) => (
                    <img key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <div className="label">All check-ins ({visits.length})</div>
            <div className="stack gap-1">
              {[...visits].reverse().map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-sand ${selected?.id === v.id ? 'bg-sand' : ''}`}
                >
                  <span>📍</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{v.placeName}</span>
                  <span className="text-xs muted">{v.city}</span>
                  <span className="text-xs text-ink/35">{formatDate(v.at.slice(0, 10))}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
