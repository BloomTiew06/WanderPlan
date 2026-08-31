import { useMemo, useState } from 'react';
import { Card, Chip, Modal, Notice, ProgressBar, Stat } from '../components/ui';
import { Suitcase } from '../components/Suitcase';
import { useStore } from '../store/store';
import { STICKER_CATALOG } from '../data/stickers';
import { careState, collectionProgress, FEED_COST, groupStickersFor } from '../domain/stickers';
import { formatDate } from '../domain/dates';
import type { StickerDef } from '../types';

export default function Passport() {
  const store = useStore();
  const { profile, trips } = store.state;
  const [tab, setTab] = useState<'suitcase' | 'book' | 'trunk'>('suitcase');
  const [detail, setDetail] = useState<StickerDef | null>(null);

  const care = careState(profile, store.now);
  const progress = collectionProgress(profile);
  const earnedIds = new Set(profile.stickers.map((s) => s.stickerId));
  const groupUnlocks = useMemo(() => groupStickersFor(trips, profile), [trips, profile]);

  const regions = useMemo(() => {
    const map = new Map<string, StickerDef[]>();
    for (const s of STICKER_CATALOG) {
      if (s.type === 'group') continue;
      const list = map.get(s.region) ?? [];
      list.push(s);
      map.set(s.region, list);
    }
    return [...map.entries()];
  }, []);

  const earnedRecord = (id: string) => profile.stickers.find((s) => s.stickerId === id);

  return (
    <div className="stack gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Passport</h1>
        <Chip tone="neutral">
          {progress.earned} of {progress.total} stickers
        </Chip>
        <div className="ml-auto flex gap-1.5">
          {(['suitcase', 'book', 'trunk'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip capitalize ${tab === t ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10 hover:bg-sand'}`}
            >
              {t === 'suitcase' ? '🧳 Suitcase' : t === 'book' ? '📖 Sticker book' : '👥 Group Trunk'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'suitcase' && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[auto,1fr]">
          <Card className="flex flex-col items-center gap-4 p-6">
            <Suitcase
              stickers={profile.stickers}
              care={care}
              name={profile.mascot.name}
              onStickerClick={(id) => setDetail(STICKER_CATALOG.find((s) => s.id === id) ?? null)}
              onMove={(id, x, y) => store.moveSticker(id, x, y)}
            />
            <p className="max-w-[240px] text-center text-xs muted">
              Drag stickers around the shell — it's your suitcase, decorate it how you like.
            </p>
          </Card>

          <div className="stack content-start gap-4">
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <div className="label mb-0.5">{profile.mascot.name} is</div>
                  <div className="font-display text-2xl capitalize">
                    {care === 'hungry' ? 'a bit peckish' : care}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="label mb-0.5">Points</div>
                  <div className="font-display text-2xl">{profile.mascot.points}</div>
                </div>
              </div>
              <p className="mt-2 text-sm muted">
                Points come from completing activities, checking in, and opening the app. Spend them
                on keeping {profile.mascot.name} fed between trips.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn-accent"
                  disabled={profile.mascot.points < FEED_COST}
                  onClick={store.feedMascot}
                >
                  🍩 Feed ({FEED_COST} pts)
                </button>
                <button className="btn-ghost" onClick={store.restMascot}>
                  😴 Let it rest
                </button>
              </div>
              {profile.mascot.lastFedAt && (
                <p className="mt-2 text-xs muted">
                  Last fed{' '}
                  {new Date(profile.mascot.lastFedAt).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  .
                </p>
              )}
            </Card>

            <Card className="p-5">
              <div className="label">Collection</div>
              <ProgressBar value={progress.earned} max={progress.total} color="#2f6f70" height={10} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Stat
                  value={profile.stickers.filter((s) => STICKER_CATALOG.find((d) => d.id === s.stickerId)?.type === 'landmark').length}
                  label="Landmarks"
                />
                <Stat
                  value={profile.stickers.filter((s) => STICKER_CATALOG.find((d) => d.id === s.stickerId)?.type === 'food').length}
                  label="Dishes"
                />
                <Stat value={groupUnlocks.length} label="Group" />
              </div>
            </Card>

            <Card className="p-5">
              <div className="label">Pinned to your profile card</div>
              {profile.mascot.pinnedStickerId ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl">
                    {STICKER_CATALOG.find((s) => s.id === profile.mascot.pinnedStickerId)?.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl">
                      {STICKER_CATALOG.find((s) => s.id === profile.mascot.pinnedStickerId)?.displayName}
                    </div>
                  </div>
                  <button className="btn-quiet text-xs" onClick={() => store.pinSticker(null)}>
                    Unpin
                  </button>
                </div>
              ) : (
                <p className="text-sm muted">
                  Nothing pinned. Tap a sticker in the book and pin your favourite.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'book' && (
        <div className="stack gap-4">
          <p className="muted">
            Locked stickers show as silhouettes with the name hidden — the book always looks worth
            filling, even on day one.
          </p>
          {regions.map(([region, defs]) => {
            const got = defs.filter((d) => earnedIds.has(d.id)).length;
            return (
              <Card key={region} className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl">{region}</h2>
                  <Chip tone={got === defs.length ? 'good' : 'neutral'}>
                    {got}/{defs.length}
                  </Chip>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                  {defs.map((d) => {
                    const earned = earnedIds.has(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDetail(d)}
                        className="flex flex-col items-center gap-1.5 text-center"
                      >
                        <span
                          className={`flex aspect-square w-full items-center justify-center rounded-2xl text-3xl transition ${
                            earned
                              ? 'bg-white shadow-card ring-2 ring-white hover:scale-105'
                              : 'bg-sand/70 opacity-45 grayscale'
                          }`}
                        >
                          {earned ? d.icon : '❓'}
                        </span>
                        <span className={`text-[11px] leading-tight ${earned ? 'font-medium' : 'text-ink/35'}`}>
                          {earned ? d.displayName : '???'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'trunk' && (
        <div className="stack gap-4">
          <Card className="p-5">
            <h2 className="font-display text-xl">Group Trunk</h2>
            <p className="mt-1 text-sm muted">
              A shared suitcase any member of the group can open. Stickers here come from travelling
              with the same people more than once.
            </p>
          </Card>

          {groupUnlocks.length === 0 ? (
            <Notice tone="info">
              Nothing unlocked yet. Finish a second trip with the same crew and Squad Goals lands
              here.
            </Notice>
          ) : (
            groupUnlocks.map((g) => (
              <Card key={g.sticker.id} className="flex items-center gap-4 p-5">
                <span className="text-5xl">{g.sticker.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xl">{g.sticker.displayName}</div>
                  <p className="text-sm muted">
                    {g.count} trips with {g.crew.join(', ')}.
                  </p>
                </div>
                <Chip tone="good">Unlocked</Chip>
              </Card>
            ))
          )}

          <Card className="p-5">
            <div className="label">Next tier</div>
            <div className="stack gap-2">
              {STICKER_CATALOG.filter((s) => s.type === 'group').map((s) => {
                const got = groupUnlocks.some((g) => g.sticker.id === s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl bg-sand/60 px-3.5 py-2.5">
                    <span className={`text-2xl ${got ? '' : 'opacity-40 grayscale'}`}>{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{s.displayName}</div>
                      <div className="text-xs muted">{s.hint}</div>
                    </div>
                    {got ? <Chip tone="good">✓</Chip> : <Chip tone="neutral">Locked</Chip>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <StickerModal
        def={detail}
        earned={detail ? earnedRecord(detail.id) : undefined}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function StickerModal({
  def,
  earned,
  onClose,
}: {
  def: StickerDef | null;
  earned?: { stickerId: string; tripId: string; at: string };
  onClose: () => void;
}) {
  const store = useStore();
  if (!def) return null;
  const trip = earned ? store.state.trips.find((t) => t.id === earned.tripId) : null;
  const visit = trip?.visits.find((v) => (v.poiId ?? v.dishId) === def.itemId);
  const photos = visit ? (trip?.media ?? []).filter((m) => m.activityId === visit.activityId) : [];

  return (
    <Modal open onClose={onClose} title={earned ? def.displayName : 'Not earned yet'}>
      <div className="flex items-start gap-4">
        <span className={`text-6xl ${earned ? '' : 'opacity-40 grayscale'}`}>
          {earned ? def.icon : '❓'}
        </span>
        <div className="min-w-0 flex-1">
          {earned ? (
            <>
              <Chip tone="good" className="capitalize">
                {def.type} sticker
              </Chip>
              <p className="mt-2 text-sm">
                {def.region}
                {visit && ` · ${visit.placeName}`}
              </p>
              <p className="mt-1 text-sm muted">
                Earned {formatDate(earned.at.slice(0, 10), { weekday: 'long', year: 'numeric' })}
                {trip && ` on the ${trip.destinationName} trip`}.
              </p>
            </>
          ) : (
            <>
              <Chip tone="neutral">Locked</Chip>
              <p className="mt-2 text-sm muted">{def.hint}</p>
              <p className="mt-1 text-xs text-ink/35">
                The name stays hidden until you've actually been.
              </p>
            </>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <img key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}

      {earned && (
        <button
          className="btn-ghost mt-4 w-full"
          onClick={() => {
            store.pinSticker(store.state.profile.mascot.pinnedStickerId === def.id ? null : def.id);
            onClose();
          }}
        >
          {store.state.profile.mascot.pinnedStickerId === def.id
            ? 'Unpin from profile'
            : '📌 Pin to my profile card'}
        </button>
      )}
    </Modal>
  );
}
