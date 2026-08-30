import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, Chip, Notice, Spinner } from '../components/ui';
import { useStore } from '../store/store';
import { findDestination } from '../data/destinations';
import { clusterByDistance, estimateLeg } from '../domain/geo';
import { extractedToActivity, extractFromSocial, type ExtractedPlace } from '../services/ai';
import { formatDate } from '../domain/dates';
import type { Trip } from '../types';

const SAMPLE_LINKS = [
  'https://www.instagram.com/reel/C8xK2qBvNq1/',
  'https://www.tiktok.com/@travelwithmei/video/7398112345678901234',
  'https://www.xiaohongshu.com/explore/65f2a1b3000000001203c8d9',
  'https://www.instagram.com/p/C7mLpQrsTuv/',
  'https://youtu.be/dQw4w9WgXcQ',
];

/**
 * Build from saved posts (section 3d).
 *
 * Live account integrations need platform approval well past a hackathon
 * timeline, so pasted links are the supported path and the demo ships a set
 * that's known to parse cleanly.
 */
export default function Social() {
  const trip = useOutletContext<Trip>();
  const navigate = useNavigate();
  const store = useStore();
  const dest = findDestination(trip.destinationId)!;

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [places, setPlaces] = useState<ExtractedPlace[] | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());

  /** Anything already on the itinerary, so an import can't duplicate a stop. */
  const alreadyPlanned = useMemo(() => {
    const ids = new Set<string>();
    for (const day of trip.days) {
      for (const a of day.activities) {
        if (a.poiId) ids.add(a.poiId);
        if (a.dishId) ids.add(a.dishId);
      }
    }
    return ids;
  }, [trip.days]);

  const isDuplicate = (p: ExtractedPlace) =>
    Boolean((p.poiId && alreadyPlanned.has(p.poiId)) || (p.dishId && alreadyPlanned.has(p.dishId)));

  const kept = useMemo(
    () => (places ?? []).filter((p) => !dropped.has(p.id) && !isDuplicate(p)),
    [places, dropped, alreadyPlanned],
  );

  const clusters = useMemo(
    () => (kept.length ? clusterByDistance(kept, 8, 4) : []),
    [kept],
  );

  const extract = async () => {
    const links = text.split(/\s+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
    if (links.length === 0) return;
    setBusy(true);
    setPlaces(await extractFromSocial(links, dest));
    setDropped(new Set());
    setBusy(false);
  };

  const build = () => {
    const startIndex = 0;
    const days = [...trip.days];
    clusters.forEach((cluster, i) => {
      const dayIdx = startIndex + i;
      const activities = cluster.map(extractedToActivity);
      if (days[dayIdx]) {
        days[dayIdx] = {
          ...days[dayIdx],
          activities: [...days[dayIdx].activities, ...activities],
          note: 'Includes spots imported from your saved posts.',
        };
      } else {
        // No day to hang these on — append to the last one rather than losing them.
        const last = days.length - 1;
        if (last >= 0) {
          days[last] = { ...days[last], activities: [...days[last].activities, ...activities] };
        }
      }
    });
    store.setDays(days);
    navigate(`/trip/${trip.id}/itinerary`);
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="h1">Build from your saved posts</h1>
        <p className="mt-2 max-w-2xl muted">
          Thirty saved Reels across three apps aren't an itinerary. Paste the links and we'll pull
          out the actual places, geocode them, and cluster them into days that make sense to walk.
        </p>
      </div>

      <Card className="p-5">
        <div className="label">Paste links</div>
        <textarea
          className="field min-h-[110px] font-mono text-xs"
          placeholder="One link per line — Instagram, TikTok, RedNote, YouTube…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={extract} disabled={busy || !text.trim()}>
            {busy ? <Spinner label="Reading captions and on-screen text…" /> : 'Extract places'}
          </button>
          <button className="btn-quiet text-xs" onClick={() => setText(SAMPLE_LINKS.join('\n'))}>
            Use the demo set
          </button>
        </div>
        <p className="mt-3 text-xs muted">
          Captions, location tags and OCR'd on-screen text go to the model as one blob; it returns
          structured places. Platform APIs don't expose enough to do this live without approval, so
          pasted links are the supported route.
        </p>
      </Card>

      {places && (
        <>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="label mb-0">
                Extracted places ({kept.length} of {places.length} kept)
                {places.some(isDuplicate) && (
                  <span className="ml-2 font-normal normal-case tracking-normal text-ink/40">
                    Anything already on the itinerary is skipped.
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {places.map((p) => {
                const dupe = isDuplicate(p);
                const out = dropped.has(p.id) || dupe;
                return (
                  <Card
                    key={p.id}
                    className={`flex gap-3 p-3.5 transition ${out ? 'opacity-40' : ''}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand text-2xl">
                      {p.thumbnail}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        {dupe ? (
                          <Chip tone="info">Already in your plan</Chip>
                        ) : (
                          <Chip tone={p.confidence > 0.8 ? 'good' : 'warn'}>
                            {Math.round(p.confidence * 100)}%
                          </Chip>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs muted">{p.activity}</p>
                      <div className="mt-1 text-[11px] text-ink/40">
                        📍 {p.locationHint} · from {p.platform}
                      </div>
                    </div>
                    {!dupe && (
                      <button
                        className="btn-quiet self-start px-2 text-xs"
                        onClick={() =>
                          setDropped((d) => {
                            const n = new Set(d);
                            if (n.has(p.id)) n.delete(p.id);
                            else n.add(p.id);
                            return n;
                          })
                        }
                      >
                        {dropped.has(p.id) ? 'Undo' : '✕'}
                      </button>
                    )}
                  </Card>
                );
              })}
            </div>
          </Card>

          {clusters.length > 0 && (
            <Card className="p-5">
              <div className="label">Suggested route</div>
              <p className="mb-3 text-sm muted">
                Grouped by distance so each day is roughly one area. Anything that would be a
                slog gets flagged rather than quietly crammed in.
              </p>
              <div className="grid gap-3">
                {clusters.map((cluster, i) => {
                  const target = trip.days[i];
                  const worst = cluster
                    .slice(1)
                    .map((c, j) => ({ leg: estimateLeg(cluster[j], c), a: cluster[j], b: c }))
                    .sort((x, y) => y.leg.minutes - x.leg.minutes)[0];
                  return (
                    <div key={i} className="rounded-xl bg-sand/60 p-3.5">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        Day {i + 1}
                        {target && <span className="muted">· {formatDate(target.date)}</span>}
                        {!target && <Chip tone="warn">No day for this — will append to the last day</Chip>}
                      </div>
                      <div className="grid gap-1.5">
                        {cluster.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 text-sm">
                            <span>{c.thumbnail}</span>
                            <span>{c.name}</span>
                            <span className="ml-auto text-[11px] text-ink/40">{c.platform}</span>
                          </div>
                        ))}
                      </div>
                      {worst?.leg.impractical && (
                        <div className="mt-2">
                          <Notice tone="warn">
                            {worst.a.name} and {worst.b.name} are about{' '}
                            {Math.round(worst.leg.minutes / 60)} hours apart. Want to split these
                            across two days?
                          </Notice>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn-accent mt-4 w-full py-3" onClick={build} disabled={kept.length === 0}>
                Add {kept.length} spots to the itinerary
              </button>
              <p className="mt-2 text-center text-xs muted">
                They become normal activity cards — swappable, votable, droppable like anything else.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
