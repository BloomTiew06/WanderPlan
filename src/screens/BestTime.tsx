import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Card, Chip, Notice, Spinner } from '../components/ui';
import { findDestination, idealMonths } from '../data/destinations';
import type { MonthProfile } from '../data/destinations';
import { MONTHS, MONTHS_LONG } from '../domain/dates';
import { AI_MODE, fetchBestTime } from '../services/ai';
import { useStore } from '../store/store';

const RATING_STYLE: Record<MonthProfile['rating'], { bg: string; label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
  ideal: { bg: 'bg-moss', label: 'Ideal', tone: 'good' },
  good: { bg: 'bg-moss/55', label: 'Good', tone: 'good' },
  ok: { bg: 'bg-amber-400', label: 'Mixed', tone: 'warn' },
  avoid: { bg: 'bg-clay', label: 'Avoid', tone: 'bad' },
};

export default function BestTime() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state, updateTrip, setActiveTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);
  const dest = trip ? findDestination(trip.destinationId) : undefined;

  const [months, setMonths] = useState<MonthProfile[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<number | null>(null);

  useEffect(() => {
    if (!dest) return;
    let live = true;
    fetchBestTime(dest.name, dest.months).then((m) => live && setMonths(m));
    return () => {
      live = false;
    };
  }, [dest]);

  useEffect(() => {
    if (trip) setActiveTrip(trip.id);
  }, [trip?.id]);

  if (!trip || !dest) return <Notice tone="warn">That trip no longer exists.</Notice>;

  // Group the calendar year into runs of consecutive months with the same rating,
  // which is how people actually think about a season.
  const seasons = months ? groupSeasons(months) : [];

  const confirm = () => {
    if (selected === null || !months) return;
    const season = seasons.find((s) => s.months.includes(selected))!;
    updateTrip(trip.id, (t) => ({
      ...t,
      seasonWindow: { startMonth: season.months[0], endMonth: season.months[season.months.length - 1] },
      stage: 'dates',
    }));
    navigate(trip.mode === 'group' ? `/setup/${trip.id}/invite` : `/setup/${trip.id}/dates`);
  };

  return (
    <SetupShell
      step={2}
      total={5}
      title={`When should you go to ${dest.city}?`}
      subtitle="Pick a rough window off this before anyone starts guessing dates. You'll narrow it down on a calendar next."
      onBack={() => navigate('/new')}
    >
      {!months ? (
        <Card className="p-10 text-center">
          <Spinner label={`Working out the seasons in ${dest.city}…`} />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Month by month</span>
              <span className="text-[11px] text-ink/40">
                {AI_MODE === 'live' ? 'Generated live' : 'Curated seasonal data'}
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {months.map((m) => {
                const style = RATING_STYLE[m.rating];
                const isSel = selected !== null && seasons.find((s) => s.months.includes(selected))?.months.includes(m.month);
                return (
                  <button
                    key={m.month}
                    onClick={() => {
                      setSelected(m.month);
                      setDetail(m.month);
                    }}
                    className={`group min-w-[62px] flex-1 rounded-xl p-2 text-center transition ${isSel ? 'bg-ink text-paper' : 'hover:bg-sand'}`}
                  >
                    <div className="text-xs font-semibold">{MONTHS[m.month]}</div>
                    <div className={`mx-auto mt-1.5 h-1.5 w-full rounded-full ${style.bg}`} />
                    <div className={`mt-1.5 text-[10px] ${isSel ? 'text-paper/70' : 'text-ink/45'}`}>
                      {style.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3 text-[11px]">
              {(['ideal', 'good', 'ok', 'avoid'] as const).map((r) => (
                <span key={r} className="inline-flex items-center gap-1.5 text-ink/50">
                  <span className={`h-2 w-4 rounded-full ${RATING_STYLE[r].bg}`} />
                  {RATING_STYLE[r].label}
                </span>
              ))}
            </div>
          </Card>

          {detail !== null && (
            <Card className="rise mt-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl">{MONTHS_LONG[detail]}</h3>
                <Chip tone={RATING_STYLE[months[detail].rating].tone}>
                  {RATING_STYLE[months[detail].rating].label}
                </Chip>
              </div>
              <p className="mt-2 text-sm">{months[detail].weather}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Chip tone="neutral">👥 {months[detail].crowds} crowds</Chip>
                <Chip tone="neutral">💸 {months[detail].price} prices</Chip>
              </div>
              {months[detail].note && (
                <p className="mt-3 rounded-lg bg-sand px-3 py-2 text-sm">💡 {months[detail].note}</p>
              )}
            </Card>
          )}

          <div className="mt-6">
            <div className="label">Seasons at a glance</div>
            <div className="stack gap-2">
              {seasons
                .filter((s) => s.rating !== 'ok')
                .map((s) => (
                  <button
                    key={s.months.join()}
                    onClick={() => {
                      setSelected(s.months[0]);
                      setDetail(s.months[0]);
                    }}
                    className="text-left"
                  >
                    <Card
                      className={`flex items-center gap-3 p-3.5 transition ${selected !== null && s.months.includes(selected) ? 'ring-2 ring-ink' : 'hover:border-black/15'}`}
                    >
                      <span className={`h-9 w-1.5 shrink-0 rounded-full ${RATING_STYLE[s.rating].bg}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">
                          {s.months.length === 1
                            ? MONTHS_LONG[s.months[0]]
                            : `${MONTHS_LONG[s.months[0]]} to ${MONTHS_LONG[s.months[s.months.length - 1]]}`}
                          {' — '}
                          <span className="font-normal muted">{s.summary}</span>
                        </div>
                      </div>
                      {s.rating === 'avoid' ? (
                        <Chip tone="bad">Avoid</Chip>
                      ) : (
                        <Chip tone="good">Go</Chip>
                      )}
                    </Card>
                  </button>
                ))}
            </div>
          </div>

          {selected !== null && months[selected].rating === 'avoid' && (
            <div className="mt-4">
              <Notice tone="warn">
                {MONTHS_LONG[selected]} is a month we'd normally steer you away from. You can still
                plan around it — real constraints beat ideal weather — but go in with eyes open.
              </Notice>
            </div>
          )}

          <button className="btn-primary mt-8 w-full py-3" disabled={selected === null} onClick={confirm}>
            {selected === null
              ? 'Pick a month or season to start from'
              : `Start from ${MONTHS_LONG[seasons.find((s) => s.months.includes(selected))!.months[0]]}` +
                (seasons.find((s) => s.months.includes(selected))!.months.length > 1
                  ? `–${MONTHS_LONG[seasons.find((s) => s.months.includes(selected))!.months.slice(-1)[0]]}`
                  : '')}
          </button>
          <p className="mt-3 text-center text-xs muted">
            Best months here: {idealMonths(dest).map((m) => MONTHS[m]).join(', ')}.
          </p>
        </>
      )}
    </SetupShell>
  );
}

interface Season {
  months: number[];
  rating: MonthProfile['rating'];
  summary: string;
}

function groupSeasons(months: MonthProfile[]): Season[] {
  const out: Season[] = [];
  for (const m of months) {
    const last = out[out.length - 1];
    if (last && last.rating === m.rating) last.months.push(m.month);
    else out.push({ months: [m.month], rating: m.rating, summary: m.weather });
  }
  return out;
}
