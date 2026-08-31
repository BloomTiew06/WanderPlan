import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Chip, EmptyState, money, Notice, Stat } from '../components/ui';
import { useStore } from '../store/store';
import { byCategory, CATEGORY_LABELS, totalSpend } from '../domain/budget';
import { formatDate, formatRange } from '../domain/dates';
import { totalDistanceKm } from '../domain/geo';
import { STICKER_CATALOG } from '../data/stickers';
import type { Media, Trip } from '../types';

export default function Recap() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const [order, setOrder] = useState<string[] | null>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [shared, setShared] = useState<string | null>(null);

  const gallery = useMemo(
    () =>
      [...trip.media]
        .filter((m) => m.tag === 'gallery')
        .sort((a, b) => a.at.localeCompare(b.at)),
    [trip.media],
  );

  const ordered = useMemo(() => {
    if (!order) return gallery;
    const byId = new Map(gallery.map((m) => [m.id, m]));
    return order.map((id) => byId.get(id)).filter(Boolean) as Media[];
  }, [order, gallery]);

  const stats = useMemo(() => {
    const spend = totalSpend(trip.costItems);
    const cats = byCategory(trip).filter((c) => c.total > 0);
    const top = cats.sort((a, b) => b.count - a.count)[0];
    const km = totalDistanceKm(trip.visits.map((v) => ({ lat: v.lat, lng: v.lng })));
    const earned = store.state.profile.stickers.filter((s) => s.tripId === trip.id);
    return { spend, top, km, earned };
  }, [trip, store.state.profile.stickers]);

  useEffect(() => {
    if (!playing || ordered.length === 0) return;
    const id = setInterval(() => {
      setFrame((f) => {
        if (f + 1 >= ordered.length) {
          setPlaying(false);
          return f;
        }
        return f + 1;
      });
    }, 2600);
    return () => clearInterval(id);
  }, [playing, ordered.length]);

  const move = (id: string, dir: -1 | 1) => {
    const list = ordered.map((m) => m.id);
    const i = list.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setOrder(list);
  };

  const isOver = trip.stage === 'complete';

  return (
    <div className="stack gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Trip recap</h1>
        {!isOver && <Chip tone="info">Builds as you go — final version lands after the last day</Chip>}
      </div>

      <Card className="overflow-hidden">
        <div className="bg-ink p-6 text-paper">
          <div className="text-xs uppercase tracking-widest text-paper/50">
            {trip.dates ? formatRange(trip.dates) : 'Dates TBC'}
          </div>
          <h2 className="mt-1 font-display text-3xl">{trip.destinationName}</h2>
          <p className="mt-1 text-sm text-paper/70">
            {trip.members.map((m) => m.name).join(', ')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          <Stat value={trip.days.length} label="Days" />
          <Stat value={money(stats.spend, trip.currency)} label="Spent" />
          <Stat value={trip.visits.length} label="Places visited" />
          <Stat value={`${stats.km} km`} label="Travelled" />
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
          <Stat
            value={`${Math.round((stats.spend / Math.max(1, trip.budgetCap)) * 100)}%`}
            label="Of budget"
          />
          <Stat value={stats.top ? CATEGORY_LABELS[stats.top.category] : '—'} label="Most-booked" />
          <Stat value={stats.earned.length} label="Stickers earned" />
          <Stat value={gallery.length} label="Photos & clips" />
        </div>
      </Card>

      {stats.earned.length > 0 && (
        <Card className="p-5">
          <div className="label">New on the suitcase</div>
          <div className="flex flex-wrap gap-2">
            {stats.earned.map((s) => {
              const def = STICKER_CATALOG.find((x) => x.id === s.stickerId);
              if (!def) return null;
              return (
                <div key={s.stickerId} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2">
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <div className="text-sm font-semibold">{def.displayName}</div>
                    <div className="text-[11px] muted">{formatDate(s.at.slice(0, 10))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {gallery.length === 0 ? (
        <EmptyState
          icon="🎞️"
          title="No photos yet"
          body="Attach photos and clips to activity cards on the itinerary and they build this album as the trip goes."
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="relative bg-ink">
              <MediaFrame media={ordered[Math.min(frame, ordered.length - 1)]} trip={trip} />
              <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
                {ordered.map((m, i) => (
                  <span
                    key={m.id}
                    className={`h-1 flex-1 rounded-full ${i <= frame ? 'bg-paper' : 'bg-paper/25'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3">
              <button
                className="btn-primary"
                onClick={() => {
                  if (frame >= ordered.length - 1) setFrame(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? '⏸ Pause' : '▶︎ Play recap'}
              </button>
              <button className="btn-quiet text-xs" onClick={() => setFrame((f) => Math.max(0, f - 1))}>
                ← Prev
              </button>
              <button
                className="btn-quiet text-xs"
                onClick={() => setFrame((f) => Math.min(ordered.length - 1, f + 1))}
              >
                Next →
              </button>
              <span className="ml-auto text-xs muted">
                {frame + 1} of {ordered.length}
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="label">Reorder or trim before sharing</div>
            <div className="stack gap-2">
              {ordered.map((m, i) => {
                const activity = trip.days
                  .flatMap((d) => d.activities)
                  .find((a) => a.id === m.activityId);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-sand/50 p-2">
                    {m.kind === 'video' ? (
                      <video src={m.url} className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <img src={m.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {activity?.name ?? 'Trip photo'}
                      </div>
                      <div className="truncate text-xs muted">{m.caption ?? formatDate(m.at.slice(0, 10))}</div>
                    </div>
                    <button className="btn-quiet px-2 text-xs" onClick={() => move(m.id, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      className="btn-quiet px-2 text-xs"
                      onClick={() => move(m.id, 1)}
                      disabled={i === ordered.length - 1}
                    >
                      ↓
                    </button>
                    <button className="btn-quiet px-2 text-xs text-clay" onClick={() => store.removeMedia(m.id)}>
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Card className="p-5">
        <div className="label">Share it</div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-accent"
            onClick={() => setShared(`${window.location.origin}${window.location.pathname}#/r/${trip.id}`)}
          >
            🔗 Get a public link
          </button>
          <button className="btn-ghost" disabled title="Client-side video export is a stretch goal">
            🎬 Export as a video
          </button>
        </div>
        {shared && (
          <div className="mt-3">
            <Notice tone="good">
              Anyone with this link can view the recap in a browser — no account, no app download.
              <code className="mt-1 block truncate rounded bg-white/60 px-2 py-1 text-xs">{shared}</code>
            </Notice>
          </div>
        )}
        <p className="mt-3 text-xs muted">
          Every member keeps their own copy in their trip history, and it stays reachable from My Map
          and the sticker book.
        </p>
      </Card>

      {!isOver && trip.dates && (
        <button
          className="btn-ghost mx-auto text-xs"
          onClick={() =>
            store.updateActiveTrip((t) => ({
              ...t,
              stage: 'complete',
              completedAt: t.dates?.end ?? store.today,
            }))
          }
        >
          Mark this trip finished
        </button>
      )}
    </div>
  );
}

function MediaFrame({ media, trip }: { media?: Media; trip: Trip }) {
  if (!media) return <div className="aspect-[4/5] w-full bg-sand" />;
  const activity = trip.days.flatMap((d) => d.activities).find((a) => a.id === media.activityId);
  const by = trip.members.find((m) => m.id === media.by);
  return (
    <div className="relative aspect-[4/5] w-full sm:aspect-[16/9]">
      {media.kind === 'video' ? (
        <video src={media.url} className="h-full w-full object-cover" autoPlay muted loop />
      ) : (
        <img src={media.url} alt={media.caption ?? ''} className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-5 text-paper">
        {activity && <div className="font-display text-2xl">{activity.name}</div>}
        {media.caption && <p className="mt-1 text-sm text-paper/80">{media.caption}</p>}
        <div className="mt-1 text-xs text-paper/50">
          {formatDate(media.at.slice(0, 10), { weekday: 'long' })}
          {by && ` · ${by.name}`}
        </div>
      </div>
    </div>
  );
}
