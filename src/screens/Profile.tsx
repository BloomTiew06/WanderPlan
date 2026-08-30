import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Chip, Modal, Notice } from '../components/ui';
import { Suitcase } from '../components/Suitcase';
import { useStore } from '../store/store';
import { careState } from '../domain/stickers';
import { LANGUAGES } from '../i18n/strings';
import { AI_MODE } from '../services/ai';
import { LIVE_SEARCH } from '../services/travel';
import { TRANSLATE_MODE } from '../services/translate';
import { findSticker } from '../data/stickers';

export default function Profile() {
  const store = useStore();
  const navigate = useNavigate();
  const { profile } = store.state;
  const [confirmReset, setConfirmReset] = useState(false);
  const pinned = profile.mascot.pinnedStickerId ? findSticker(profile.mascot.pinnedStickerId) : null;

  return (
    <div className="grid gap-4">
      <h1 className="h1">Profile</h1>

      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Suitcase stickers={profile.stickers} care={careState(profile, store.now)} size={140} />
        <div className="min-w-0 flex-1">
          <input
            className="field mb-2 max-w-xs font-display text-2xl"
            value={profile.name}
            onChange={(e) => store.updateProfile((p) => ({ ...p, name: e.target.value }))}
          />
          <div className="flex flex-wrap items-center gap-2 text-sm muted">
            <Chip tone="neutral">{profile.stickers.length} stickers</Chip>
            <Chip tone="neutral">{profile.mascot.points} points</Chip>
            {pinned && (
              <Chip tone="good">
                {pinned.icon} {pinned.displayName}
              </Chip>
            )}
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="mascot-name">
              Mascot name
            </label>
            <input
              id="mascot-name"
              className="field max-w-[200px]"
              value={profile.mascot.name}
              onChange={(e) =>
                store.updateProfile((p) => ({ ...p, mascot: { ...p.mascot, name: e.target.value } }))
              }
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="label">App language</div>
        <p className="mb-3 text-xs muted">
          Per-user. Group members can each read the app in their own language.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => store.updateProfile((p) => ({ ...p, language: l.code }))}
              className={`chip ${profile.language === l.code ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
            >
              {l.native}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="label">Emergency contacts ({profile.emergencyContacts.length})</div>
        {profile.emergencyContacts.length === 0 ? (
          <p className="text-sm muted">
            Add these from the Check-ins tab on any trip. They receive your check-in snapshots
            one-way — no account needed on their end.
          </p>
        ) : (
          <div className="grid gap-2">
            {profile.emergencyContacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-sand/60 px-3.5 py-2.5">
                <span>{c.channel === 'sms' ? '💬' : '✉️'}</span>
                <span className="min-w-0 flex-1 text-sm font-medium">{c.name}</span>
                <span className="truncate text-xs muted">{c.address}</span>
                <button className="btn-quiet text-xs" onClick={() => store.removeEmergencyContact(c.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="label">Demo controls</div>
        <p className="mb-3 text-xs muted">
          The app treats “today” as a value it reads rather than a constant, so you can walk a trip
          forward without waiting for real time to pass.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-sand">Today: {store.today}</span>
          <button className="btn-ghost text-xs" onClick={() => store.advanceClock(1)}>
            +1 day
          </button>
          <button className="btn-ghost text-xs" onClick={() => store.advanceClock(7)}>
            +1 week
          </button>
          <button
            className="btn-quiet text-xs"
            onClick={() => store.advanceClock(-store.state.clockOffsetDays)}
            disabled={store.state.clockOffsetDays === 0}
          >
            Reset clock
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="label">Integrations</div>
        <div className="grid gap-2 text-sm">
          <Row label="Itinerary & parsing" mode={AI_MODE === 'live' ? 'Live model endpoint' : 'Local planner'} hint="VITE_AI_ENDPOINT" />
          <Row label="Flights & stays" mode={LIVE_SEARCH ? 'Live search' : 'Sample data'} hint="VITE_AMADEUS_ENDPOINT" />
          <Row label="Translation" mode={TRANSLATE_MODE === 'live' ? 'Live API' : 'Offline glossary'} hint="VITE_TRANSLATE_ENDPOINT" />
          <Row label="SMS & email" mode="In-app outbox" hint="Twilio / SendGrid in production" />
        </div>
        <p className="mt-3 text-xs muted">
          Every integration has a working fallback, so nothing on the demo path depends on an API key
          arriving in time.
        </p>
      </Card>

      <Card className="p-5">
        <div className="label">Data</div>
        <p className="mb-3 text-sm muted">
          Everything lives in this browser's local storage. Nothing leaves the device.
        </p>
        <button className="btn-ghost text-clay" onClick={() => setConfirmReset(true)}>
          Reset all data
        </button>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset everything?">
        <Notice tone="warn">
          This deletes every trip, check-in, photo and sticker in this browser and restores the
          starting demo data. It can't be undone.
        </Notice>
        <div className="mt-4 flex gap-2">
          <button className="btn-quiet" onClick={() => setConfirmReset(false)}>
            Cancel
          </button>
          <button
            className="btn-accent ml-auto"
            onClick={() => {
              store.resetAll();
              setConfirmReset(false);
              navigate('/');
            }}
          >
            Yes, reset everything
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, mode, hint }: { label: string; mode: string; hint: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sand/60 px-3.5 py-2.5">
      <span className="font-medium">{label}</span>
      <Chip tone={mode.startsWith('Live') ? 'good' : 'neutral'}>{mode}</Chip>
      <code className="ml-auto text-[11px] text-ink/40">{hint}</code>
    </div>
  );
}
