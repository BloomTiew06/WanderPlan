import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { careState } from '../domain/stickers';
import { formatRange } from '../domain/dates';

const TRIP_TABS = [
  { to: 'itinerary', key: 'nav.itinerary', icon: '🗓️' },
  { to: 'group', key: 'nav.group', icon: '👥' },
  { to: 'stays', key: 'nav.stays', icon: '✈️' },
  { to: 'budget', key: 'nav.budget', icon: '💰' },
  { to: 'spending', key: 'nav.spending', icon: '📊' },
  { to: 'language', key: 'nav.language', icon: '🗣️' },
  { to: 'checkins', key: 'nav.checkins', icon: '📸' },
  { to: 'recap', key: 'nav.recap', icon: '🎞️' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, t, trip, now } = useStore();
  const navigate = useNavigate();
  const care = careState(state.profile, now);
  // The setup wizard has its own progress chrome; trip tabs would just be dead
  // links to screens that need a generated itinerary.
  const inSetup = useLocation().pathname.startsWith('/setup/');

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-paper/85 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <button
            className="flex items-center gap-2 font-display text-xl"
            onClick={() => navigate('/')}
          >
            <span aria-hidden>🧳</span>
            <span>WanderPlan</span>
          </button>

          <nav className="ml-auto flex items-center gap-1">
            <TopLink to="/" label={t('nav.trips')} />
            <TopLink to="/map" label={t('nav.map')} />
            <TopLink to="/passport" label={t('nav.passport')} />
            <TopLink to="/profile" label={t('nav.profile')} />
            <span
              className="ml-1 hidden text-lg sm:inline"
              title={`${state.profile.mascot.name} is ${care} · ${state.profile.mascot.points} pts`}
            >
              {care === 'happy' ? '😊' : care === 'neutral' ? '😐' : '🥺'}
            </span>
          </nav>
        </div>

        {trip && !inSetup && trip.stage !== 'setup' && (
          <div className="flex items-center gap-3 overflow-x-auto border-t border-black/5 px-4 py-2 no-scrollbar sm:px-6">
            <button
              onClick={() => navigate(`/trip/${trip.id}/itinerary`)}
              className="shrink-0 text-left"
            >
              <div className="text-sm font-semibold leading-tight">{trip.destinationName}</div>
              <div className="text-[11px] muted">
                {trip.dates ? formatRange(trip.dates) : 'Dates not set'} ·{' '}
                {trip.members.length} {trip.members.length === 1 ? 'traveller' : 'travellers'}
              </div>
            </button>
            <div className="ml-2 flex items-center gap-1">
              {TRIP_TABS.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={`/trip/${trip.id}/${tab.to}`}
                  className={({ isActive }) =>
                    `chip shrink-0 whitespace-nowrap ${isActive ? 'bg-ink text-paper' : 'bg-white text-ink/60 ring-1 ring-black/5 hover:bg-sand'}`
                  }
                >
                  <span aria-hidden>{tab.icon}</span>
                  <span className="hidden sm:inline">{t(tab.key)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <footer className="px-4 pb-8 pt-4 text-center text-xs text-ink/35 sm:px-6">
        WanderPlan — a group travel planner. Demo data; no bookings are real.
      </footer>
    </div>
  );
}

function TopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-ink text-paper' : 'text-ink/60 hover:bg-black/5 hover:text-ink'}`
      }
    >
      {label}
    </NavLink>
  );
}

/** Wizard chrome for the trip-setup flow, which sits outside the tab shell. */
export function SetupShell({
  step,
  total,
  title,
  subtitle,
  children,
  onBack,
}: {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          {onBack && (
            <button className="btn-quiet -ml-2 px-2" onClick={onBack}>
              ← Back
            </button>
          )}
          <div className="ml-auto flex gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i < step ? 'w-6 bg-ink' : 'w-3 bg-sand'}`}
              />
            ))}
          </div>
        </div>
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-2 muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
