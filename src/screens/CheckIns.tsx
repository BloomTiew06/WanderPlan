import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Chip, Modal, Notice } from '../components/ui';
import { useStore } from '../store/store';
import { formatDate } from '../domain/dates';
import { getOutbox, send, subscribe, type OutboxItem } from '../services/notify';
import type { Trip } from '../types';

/**
 * Check-in snapshots for family (section 3c).
 *
 * Delivery is one-way — SMS via Twilio, email via a transactional API — so the
 * recipient needs no account and no app. Everything that would be sent lands in
 * the outbox below instead, which also makes the safety-net behaviour visible.
 */
export default function CheckIns() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const [composeOpen, setComposeOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [outbox, setOutbox] = useState<OutboxItem[]>(getOutbox());

  useEffect(() => subscribe(setOutbox), []);

  const contacts = store.state.profile.emergencyContacts;
  const last = trip.checkIns[0];
  const hoursSince = last
    ? (store.now.getTime() - new Date(last.at).getTime()) / 3_600_000
    : Infinity;
  const overdue = contacts.length > 0 && hoursSince > store.state.profile.checkInThresholdHours;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Check-in snapshots</h1>
        <button className="btn-accent ml-auto" onClick={() => setComposeOpen(true)} disabled={contacts.length === 0}>
          📸 Send a check-in
        </button>
      </div>
      <p className="max-w-2xl muted">
        A photo and a line about where you are, straight to whoever's worrying at home. No account
        needed on their end, no group chat, no tracking.
      </p>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="label mb-0">Emergency contacts ({contacts.length})</div>
          <button className="btn-ghost text-xs" onClick={() => setContactOpen(true)}>
            + Add a contact
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm muted">
            Nobody set up yet. Add a phone number or email — that's all it takes.
          </p>
        ) : (
          <div className="grid gap-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-sand/60 px-3.5 py-2.5">
                <span className="text-lg">{c.channel === 'sms' ? '💬' : '✉️'}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs muted">{c.address}</div>
                </div>
                <button
                  className="btn-quiet text-xs"
                  onClick={() => store.removeEmergencyContact(c.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-black/5 pt-3">
          <div className="label">Nudge me if I go quiet for</div>
          <div className="flex flex-wrap gap-1.5">
            {[12, 24, 48, 72].map((h) => (
              <button
                key={h}
                onClick={() => store.updateProfile((p) => ({ ...p, checkInThresholdHours: h }))}
                className={`chip ${store.state.profile.checkInThresholdHours === h ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
              >
                {h} hours
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs muted">
            You get a reminder first. If there's still nothing shortly after, your contacts get a
            short note with your last known check-in — a safety net, not a tracker.
          </p>
        </div>
      </Card>

      {overdue && (
        <Notice tone="warn">
          It's been {Math.round(hoursSince)} hours since your last check-in, past your{' '}
          {store.state.profile.checkInThresholdHours}-hour threshold.{' '}
          <button
            className="underline underline-offset-2"
            onClick={() => {
              for (const c of contacts) {
                send({
                  channel: c.channel,
                  to: c.address,
                  subject: `Haven't heard from ${store.state.profile.name} in a while`,
                  body: `${store.state.profile.name} hasn't checked in for ${Math.round(hoursSince)} hours on their ${trip.destinationName} trip. Last check-in: ${last ? `${last.location} on ${formatDate(last.at.slice(0, 10))}` : 'none yet'}. This is an automatic note from WanderPlan — no action needed if you've heard from them another way.`,
                });
              }
            }}
          >
            Send the automatic note now
          </button>
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="label">Your check-ins ({trip.checkIns.length})</div>
          {trip.checkIns.length === 0 ? (
            <p className="text-sm muted">Nothing sent yet.</p>
          ) : (
            <div className="grid gap-3">
              {trip.checkIns.map((c) => (
                <div key={c.id} className="flex gap-3">
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-sand text-2xl">
                      📍
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{c.location}</div>
                    <p className="mt-0.5 text-sm muted">{c.status}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="text-[11px] text-ink/40">
                        {new Date(c.at).toLocaleString('en-GB')}
                      </span>
                      {c.sentTo.map((s) => (
                        <Chip key={s} tone="good">
                          → {s}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="label">Outbox ({outbox.length})</div>
          <p className="mb-3 text-xs muted">
            Everything the app would have sent — SMS, email, push. Shown here so you can see exactly
            what leaves the app.
          </p>
          {outbox.length === 0 ? (
            <p className="text-sm muted">Nothing sent yet.</p>
          ) : (
            <div className="grid gap-2">
              {outbox.map((m) => (
                <div key={m.id} className="rounded-xl bg-sand/60 p-3">
                  <div className="flex items-center gap-2">
                    <Chip tone="info">
                      {m.channel === 'sms' ? '💬 SMS' : m.channel === 'email' ? '✉️ Email' : '🔔 Push'}
                    </Chip>
                    <span className="truncate text-xs font-medium">{m.to}</span>
                    <span className="ml-auto text-[11px] text-ink/40">
                      {new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">{m.subject}</div>
                  <p className="mt-0.5 text-sm muted">{m.body}</p>
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ComposeModal open={composeOpen} trip={trip} onClose={() => setComposeOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

function ComposeModal({ open, trip, onClose }: { open: boolean; trip: Trip; onClose: () => void }) {
  const store = useStore();
  const [photo, setPhoto] = useState<string | null>(null);
  const [extra, setExtra] = useState('');
  const [alsoGallery, setAlsoGallery] = useState(false);

  // The status line comes straight from today's itinerary — no new generation.
  const todayIndex = Math.max(0, trip.days.findIndex((d) => d.date === store.today));
  const today = trip.days[todayIndex];
  const nowMin = store.now.getHours() * 60 + store.now.getMinutes();
  const current = today?.activities.filter((a) => toMin(a.start) <= nowMin).slice(-1)[0] ?? today?.activities[0];
  const next = today?.activities.find((a) => toMin(a.start) > nowMin);
  const auto = current
    ? `At ${current.name}${next ? `, heading to ${next.name} next` : ''}.`
    : `In ${trip.destinationName}.`;

  const contacts = store.state.profile.emergencyContacts;

  const sendIt = () => {
    const status = [auto, extra.trim()].filter(Boolean).join(' ');
    for (const c of contacts) {
      send({
        channel: c.channel,
        to: c.address,
        subject: `${store.state.profile.name} checked in from ${trip.destinationName}`,
        body: status,
        imageUrl: photo ?? undefined,
      });
    }
    store.addCheckInSnapshot({
      memberId: store.state.profile.memberId,
      photoUrl: photo ?? '',
      status,
      location: current?.name ?? trip.destinationName,
      at: store.now.toISOString(),
      sentTo: contacts.map((c) => c.name),
    });
    if (alsoGallery && photo) {
      store.addMedia({
        activityId: current?.id,
        url: photo,
        kind: 'photo',
        caption: extra || undefined,
        by: store.state.profile.memberId,
        at: store.now.toISOString(),
        tag: 'gallery',
      });
    }
    setPhoto(null);
    setExtra('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Send a check-in">
      <label className="mb-3 block cursor-pointer">
        {photo ? (
          <img src={photo} alt="" className="h-48 w-full rounded-xl object-cover" />
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 bg-sand/50">
            <span className="text-3xl">📷</span>
            <span className="text-sm muted">Tap to add a photo</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => setPhoto(String(r.result));
            r.readAsDataURL(f);
            e.target.value = '';
          }}
        />
      </label>

      <div className="mb-3 rounded-xl bg-sand p-3.5">
        <div className="label mb-1">Auto-attached status</div>
        <p className="text-sm">{auto}</p>
        <p className="mt-1 text-[11px] text-ink/40">Pulled from today's itinerary.</p>
      </div>

      <input
        className="field mb-3"
        placeholder="Anything to add? (optional)"
        value={extra}
        onChange={(e) => setExtra(e.target.value)}
      />

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={alsoGallery}
          onChange={(e) => setAlsoGallery(e.target.checked)}
        />
        Also add this photo to the trip album
      </label>

      <div className="mb-3 text-xs muted">
        Going to: {contacts.map((c) => `${c.name} (${c.address})`).join(', ')}
      </div>

      <button className="btn-accent w-full" onClick={sendIt} disabled={contacts.length === 0}>
        Send to {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
      </button>
    </Modal>
  );
}

function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [address, setAddress] = useState('');

  return (
    <Modal open={open} onClose={onClose} title="Add an emergency contact">
      <p className="mb-4 text-sm muted">
        They don't need the app or an account. Messages go out one-way.
      </p>
      <div className="grid gap-3">
        <div>
          <div className="label">Name</div>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mum" />
        </div>
        <div>
          <div className="label">How to reach them</div>
          <div className="mb-2 flex gap-1.5">
            {(['sms', 'email'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChannel(c)}
                className={`chip ${channel === c ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
              >
                {c === 'sms' ? '💬 SMS' : '✉️ Email'}
              </button>
            ))}
          </div>
          <input
            className="field"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={channel === 'sms' ? '+60 12-345 6789' : 'name@example.com'}
          />
        </div>
      </div>
      <button
        className="btn-primary mt-4 w-full"
        disabled={!name.trim() || !address.trim()}
        onClick={() => {
          store.addEmergencyContact({ name: name.trim(), channel, address: address.trim() });
          setName('');
          setAddress('');
          onClose();
        }}
      >
        Add contact
      </button>
    </Modal>
  );
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
