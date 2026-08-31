import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SetupShell } from '../components/Layout';
import { Avatar, Card, Chip, money, Notice } from '../components/ui';
import { useStore } from '../store/store';
import { INTEREST_ICONS, INTEREST_TAGS, PACE_LABELS } from '../domain/preferences';
import type { InterestTag, Pace, Quiz as QuizAnswers } from '../types';

const BUDGET_STEPS: Record<string, number[]> = {
  MYR: [300, 5000],
  JPY: [40000, 600000],
};

export default function Quiz() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { state, setQuiz, setActiveTrip, updateTrip } = useStore();
  const trip = state.trips.find((t) => t.id === tripId);

  const [who, setWho] = useState<string | null>(null);
  const [budget, setBudget] = useState(0);
  const [pace, setPace] = useState<Pace>('balanced');
  const [interests, setInterests] = useState<InterestTag[]>([]);
  const [mustDos, setMustDos] = useState(['', '', '']);

  if (!trip) return <Notice tone="warn">That trip no longer exists.</Notice>;

  const [min, max] = BUDGET_STEPS[trip.currency] ?? [200, 4000];
  const done = trip.members.filter((m) => m.quiz);
  const pending = trip.members.filter((m) => !m.quiz);

  const open = (id: string) => {
    const m = trip.members.find((x) => x.id === id)!;
    setWho(id);
    setBudget(m.quiz?.budget ?? Math.round((min + max) / 4));
    setPace(m.quiz?.pace ?? 'balanced');
    setInterests(m.quiz?.interests ?? []);
    setMustDos([...(m.quiz?.mustDos ?? []), '', '', ''].slice(0, 3));
  };

  const save = () => {
    if (!who) return;
    const answers: QuizAnswers = {
      budget,
      pace,
      interests,
      mustDos: mustDos.map((s) => s.trim()).filter(Boolean),
    };
    setActiveTrip(trip.id);
    setQuiz(who, answers);
    setWho(null);
  };

  const finish = () => {
    const total = trip.members.reduce((s, m) => s + (m.quiz?.budget ?? 0), 0);
    updateTrip(trip.id, (t) => ({ ...t, budgetCap: total, stage: 'planning' }));
    navigate(`/setup/${trip.id}/waiting`);
  };

  return (
    <SetupShell
      step={5}
      total={5}
      title="What are you all after?"
      subtitle="Four quick questions each. This is what the itinerary gets built from."
      onBack={() => navigate(`/setup/${trip.id}/dates`)}
    >
      <Card className="p-5">
        <div className="label">Quiz progress ({done.length}/{trip.members.length})</div>
        <div className="stack gap-2">
          {trip.members.map((m) => (
            <button
              key={m.id}
              onClick={() => open(m.id)}
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-sand"
            >
              <Avatar name={m.name} color={m.avatarColor} dim={!m.quiz} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="truncate text-xs muted">
                  {m.quiz
                    ? `${money(m.quiz.budget, trip.currency)} · ${m.quiz.pace} · ${m.quiz.interests.map((i) => INTEREST_ICONS[i]).join('')}`
                    : 'Not done yet'}
                </div>
              </div>
              {m.quiz ? <Chip tone="good">✓ Done</Chip> : <Chip tone="warn">Pending</Chip>}
            </button>
          ))}
        </div>
      </Card>

      {who && (
        <Card className="rise mt-4 p-5">
          <h3 className="mb-4 font-display text-xl">
            {trip.members.find((m) => m.id === who)!.name}'s preferences
          </h3>

          <div className="mb-6">
            <div className="label">Budget for the whole trip</div>
            <div className="mb-2 font-display text-2xl">{money(budget, trip.currency)}</div>
            <input
              type="range"
              min={min}
              max={max}
              step={(max - min) / 100}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink/40">
              <span>{money(min, trip.currency)}</span>
              <span>{money(max, trip.currency)}</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="label">Pace</div>
            <div className="stack gap-2">
              {(['chill', 'balanced', 'packed'] as Pace[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPace(p)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${pace === p ? 'border-ink bg-ink text-paper' : 'border-black/10 bg-white hover:bg-sand'}`}
                >
                  {PACE_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <div className="label">Interests — pick as many as you like</div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAGS.map((tag) => {
                const on = interests.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setInterests((prev) => (on ? prev.filter((x) => x !== tag) : [...prev, tag]))
                    }
                    className={`chip capitalize ${on ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                  >
                    {INTEREST_ICONS[tag]} {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <div className="label">Up to 3 must-dos</div>
            <p className="mb-2 text-xs muted">
              Non-negotiables. These get forced into the itinerary and badged with your name.
            </p>
            <div className="stack gap-2">
              {mustDos.map((v, i) => (
                <input
                  key={i}
                  className="field"
                  placeholder={i === 0 ? 'e.g. Mount Kinabalu' : 'Optional'}
                  value={v}
                  onChange={(e) =>
                    setMustDos((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-quiet" onClick={() => setWho(null)}>
              Cancel
            </button>
            <button className="btn-primary ml-auto" onClick={save} disabled={interests.length === 0}>
              Save answers
            </button>
          </div>
        </Card>
      )}

      <button
        className="btn-primary mt-8 w-full py-3"
        onClick={finish}
        disabled={done.length === 0}
      >
        {pending.length === 0
          ? 'Everyone’s in — continue'
          : `Continue with ${done.length} of ${trip.members.length} done`}
      </button>
    </SetupShell>
  );
}
