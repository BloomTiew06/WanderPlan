import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Card } from '../components/ui';
import { DESTINATIONS, searchDestinations } from '../data/destinations';
import { useStore } from '../store/store';
import { makeMember, YOU_ID } from '../store/seed';
import { nextId } from '../services/ai';
import type { Trip } from '../types';

function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export default function NewTrip() {
  const navigate = useNavigate();
  const { addTrip, state } = useStore();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<'solo' | 'group'>('group');

  const results = useMemo(() => searchDestinations(query), [query]);
  const dest = DESTINATIONS.find((d) => d.id === picked);

  const start = () => {
    if (!dest) return;
    const trip: Trip = {
      id: nextId('trip'),
      destinationId: dest.id,
      destinationName: dest.name,
      countryCode: dest.countryCode,
      mode,
      createdBy: YOU_ID,
      inviteCode: inviteCode(),
      respondBy: null,
      seasonWindow: null,
      dates: null,
      datesConfirmed: false,
      outsideRecommendedSeason: false,
      budgetCap: 0,
      currency: dest.currency,
      categoryCaps: {},
      members: [makeMember(YOU_ID, state.profile.name, 0, { role: 'organizer', language: state.profile.language })],
      days: [],
      costItems: [],
      votes: [],
      media: [],
      visits: [],
      checkIns: [],
      stage: 'setup',
      localLanguage: dest.localLanguage,
      translationEnabled: false,
      createdAt: new Date().toISOString(),
    };
    addTrip(trip);
    navigate(`/setup/${trip.id}/best-time`);
  };

  return (
    <SetupShell
      step={1}
      total={5}
      title="Where are we going?"
      subtitle="Pick a destination and we'll tell you when to go before you pick any dates."
      onBack={() => navigate('/')}
    >
      <input
        className="field mb-4"
        placeholder="Search a destination…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      <div className="stack gap-3">
        {results.map((d) => (
          <button key={d.id} onClick={() => setPicked(d.id)} className="text-left">
            <Card
              className={`p-4 transition ${picked === d.id ? 'ring-2 ring-ink' : 'hover:border-black/15'}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {d.pois[0]?.icon ?? '📍'}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{d.name}</div>
                  <p className="mt-0.5 text-sm muted">{d.blurb}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-ink/45">
                    <span className="chip bg-sand">{d.currency}</span>
                    <span className="chip bg-sand">{d.localLanguageName}</span>
                    <span className="chip bg-sand">{d.pois.length} places on file</span>
                    <span className="chip bg-sand">
                      {d.rideHailing ? `${d.rideHailing} available` : 'No ride-hailing'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </button>
        ))}
        {results.length === 0 && (
          <Card className="p-6 text-center text-sm muted">
            Nothing on file for “{query}”. The demo ships curated data for three destinations;
            anywhere else would fall through to a generated seasonal profile.
          </Card>
        )}
      </div>

      <div className="mt-8">
        <div className="label">Who's coming?</div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {(['group', 'solo'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className="text-left">
              <Card className={`p-4 transition ${mode === m ? 'ring-2 ring-ink' : ''}`}>
                <div className="font-semibold">
                  {m === 'group' ? '👥 A group' : '🧍 Just me'}
                </div>
                <p className="mt-1 text-sm muted">
                  {m === 'group'
                    ? 'Invite friends, collect availability, vote on the split decisions.'
                    : 'Skip the invites and go straight to dates and preferences.'}
                </p>
              </Card>
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary mt-8 w-full py-3" disabled={!dest} onClick={start}>
        {dest ? `Plan a trip to ${dest.city}` : 'Pick a destination'}
      </button>
    </SetupShell>
  );
}
