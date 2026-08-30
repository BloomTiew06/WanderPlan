import { useNavigate } from 'react-router-dom';
import { Avatar, Card, Chip, EmptyState, money, ProgressBar, Stat } from '../components/ui';
import { Suitcase } from '../components/Suitcase';
import { useStore } from '../store/store';
import { careState, collectionProgress } from '../domain/stickers';
import { totalSpend } from '../domain/budget';
import { formatRange } from '../domain/dates';
import { findSticker } from '../data/stickers';

export default function Home() {
  const navigate = useNavigate();
  const store = useStore();
  const { state, t } = store;
  const care = careState(state.profile, store.now);
  const progress = collectionProgress(state.profile);
  const pinned = state.profile.mascot.pinnedStickerId
    ? findSticker(state.profile.mascot.pinnedStickerId)
    : null;

  const active = state.trips.filter((tr) => tr.stage !== 'complete');
  const past = state.trips.filter((tr) => tr.stage === 'complete');

  const open = (id: string, stage: string) => {
    store.setActiveTrip(id);
    if (stage === 'setup') navigate(`/setup/${id}/best-time`);
    else if (stage === 'dates') navigate(`/setup/${id}/dates`);
    else if (stage === 'quiz') navigate(`/setup/${id}/quiz`);
    else navigate(`/trip/${id}/itinerary`);
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
        <div className="flex flex-col justify-center">
          <h1 className="h1">Plan the escape, together.</h1>
          <p className="mt-3 max-w-xl muted">
            Dates everyone can actually do, an itinerary built from what the group wants, a budget
            that splits itself, and a suitcase that fills up with everywhere you've been.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-accent px-5 py-3" onClick={() => navigate('/new')}>
              ✦ {t('action.newTrip')}
            </button>
            <button className="btn-ghost px-5 py-3" onClick={() => navigate('/passport')}>
              🧳 See the suitcase
            </button>
          </div>
        </div>

        <Card className="flex flex-col items-center gap-3 p-6">
          <Suitcase stickers={state.profile.stickers} care={care} size={190} name={state.profile.mascot.name} />
          <div className="w-full">
            <div className="mb-1 flex justify-between text-xs">
              <span className="muted">Sticker collection</span>
              <span className="font-medium">
                {progress.earned}/{progress.total}
              </span>
            </div>
            <ProgressBar value={progress.earned} max={progress.total} color="#2f6f70" height={6} />
          </div>
          {pinned && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xl">{pinned.icon}</span>
              <span className="font-medium">{pinned.displayName}</span>
              <span className="text-[10px] uppercase tracking-wide text-ink/35">pinned</span>
            </div>
          )}
        </Card>
      </div>

      {active.length > 0 && (
        <section>
          <h2 className="h2 mb-3">In progress</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((tr) => (
              <button key={tr.id} onClick={() => open(tr.id, tr.stage)} className="text-left">
                <Card className="h-full p-5 transition hover:border-black/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-xl">{tr.destinationName}</h3>
                    <Chip tone={tr.stage === 'planning' ? 'good' : 'warn'} className="capitalize">
                      {tr.stage === 'setup'
                        ? 'Pick a season'
                        : tr.stage === 'dates'
                          ? 'Collecting dates'
                          : tr.stage === 'quiz'
                            ? 'Quiz in progress'
                            : tr.stage}
                    </Chip>
                  </div>
                  <p className="mt-1 text-sm muted">
                    {tr.dates ? formatRange(tr.dates) : 'Dates not locked in'}
                    {tr.days.length > 0 && ` · ${tr.days.length} days planned`}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {tr.members.map((m) => (
                        <Avatar key={m.id} name={m.name} color={m.avatarColor} size={26} />
                      ))}
                    </div>
                    {tr.budgetCap > 0 && (
                      <span className="ml-auto text-xs muted">
                        {money(totalSpend(tr.costItems), tr.currency)} of{' '}
                        {money(tr.budgetCap, tr.currency)}
                      </span>
                    )}
                  </div>
                  {tr.budgetCap > 0 && (
                    <div className="mt-2">
                      <ProgressBar
                        value={totalSpend(tr.costItems)}
                        max={tr.budgetCap}
                        color={totalSpend(tr.costItems) > tr.budgetCap ? '#c9603f' : '#2f6f70'}
                        height={5}
                      />
                    </div>
                  )}
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="h2 mb-3">Trip history</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((tr) => (
              <button
                key={tr.id}
                onClick={() => {
                  store.setActiveTrip(tr.id);
                  navigate(`/trip/${tr.id}/recap`);
                }}
                className="text-left"
              >
                <Card className="h-full p-5 transition hover:border-black/20">
                  <h3 className="font-display text-xl">{tr.destinationName}</h3>
                  <p className="mt-1 text-sm muted">
                    {tr.dates ? formatRange(tr.dates) : ''} · {tr.members.map((m) => m.name).join(', ')}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Stat value={tr.visits.length} label="Places" />
                    <Stat value={money(totalSpend(tr.costItems), tr.currency)} label="Spent" />
                    <Stat value={tr.media.length} label="Photos" />
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 && past.length === 0 && (
        <EmptyState
          icon="✈️"
          title="No trips yet"
          body="Start one and the whole flow runs from picking a season to the recap at the end."
          action={
            <button className="btn-primary" onClick={() => navigate('/new')}>
              Plan a trip
            </button>
          }
        />
      )}
    </div>
  );
}
