import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Chip, Notice, Spinner, Toggle } from '../components/ui';
import { useStore } from '../store/store';
import { findDestination } from '../data/destinations';
import { LANGUAGES, PHRASES, type Phrase } from '../i18n/strings';
import { speak, TRANSLATE_MODE, translateSign, translateText } from '../services/translate';
import type { Trip } from '../types';

const CATEGORIES: { id: Phrase['category']; label: string; icon: string }[] = [
  { id: 'basics', label: 'Basics', icon: '👋' },
  { id: 'directions', label: 'Getting around', icon: '🧭' },
  { id: 'food', label: 'Eating', icon: '🍽️' },
  { id: 'help', label: 'If things go wrong', icon: '🆘' },
];

export default function Language() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const dest = findDestination(trip.destinationId)!;
  const phrases = PHRASES[trip.localLanguage] ?? [];

  const [category, setCategory] = useState<Phrase['category']>('basics');
  const [signText, setSignText] = useState('');
  const [signResult, setSignResult] = useState<string[] | null>(null);
  const [freeText, setFreeText] = useState('');
  const [freeResult, setFreeResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">Speaking the language</h1>
        <Chip tone={TRANSLATE_MODE === 'live' ? 'good' : 'neutral'}>
          {TRANSLATE_MODE === 'live' ? 'Live translation API' : 'Offline glossary'}
        </Chip>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              Local language in {dest.city}: {dest.localLanguageName}
            </div>
            <p className="mt-0.5 text-xs muted">
              Turning this on adds a translate button to every activity card and address.
            </p>
          </div>
          <Toggle
            checked={trip.translationEnabled}
            label="Translation layer"
            onChange={(v) => store.updateActiveTrip((t) => ({ ...t, translationEnabled: v }))}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="label">Your app language</div>
        <p className="mb-3 text-xs muted">
          Per-user. Change it and nobody else's view of the trip changes.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => store.updateProfile((p) => ({ ...p, language: l.code }))}
              className={`chip ${store.state.profile.language === l.code ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
            >
              {l.native}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl">{store.t('phrase.title')}</h2>
          <span className="text-xs muted">Tap any phrase to hear it.</span>
        </div>

        {phrases.length === 0 ? (
          <Notice tone="info">
            No phrasebook on file for {dest.localLanguageName} yet. The translate box below still
            works for anything you need to say.
          </Notice>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`chip ${category === c.id ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {phrases
                .filter((p) => p.category === category)
                .map((p) => (
                  <button
                    key={p.en}
                    onClick={() => speak(p.local, trip.localLanguage)}
                    className="flex items-center gap-3 rounded-xl bg-sand/60 px-3.5 py-3 text-left transition hover:bg-sand"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold">{p.local}</div>
                      {p.romanised && <div className="text-xs italic muted">{p.romanised}</div>}
                      <div className="mt-0.5 text-sm muted">{p.en}</div>
                    </div>
                    <span className="text-lg" aria-hidden>
                      🔊
                    </span>
                  </button>
                ))}
            </div>
          </>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-display text-xl">Translate anything</h2>
          <p className="mb-3 text-xs muted">Type it here, show the screen.</p>
          <input
            className="field"
            placeholder="e.g. Mount Kinabalu"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
          />
          <button
            className="btn-ghost mt-2"
            disabled={!freeText.trim() || busy}
            onClick={async () => {
              setBusy(true);
              setFreeResult(await translateText(freeText.trim(), trip.localLanguage));
              setBusy(false);
            }}
          >
            {busy ? <Spinner /> : `Translate to ${dest.localLanguageName}`}
          </button>
          {freeResult && (
            <div className="rise mt-3 rounded-xl bg-sand p-4">
              <div className="font-display text-xl">{freeResult}</div>
              <button
                className="btn-quiet mt-2 text-xs"
                onClick={() => speak(freeResult, trip.localLanguage)}
              >
                🔊 Hear it
              </button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-display text-xl">Menus and signs</h2>
          <p className="mb-3 text-xs muted">
            A real build points the camera at it and runs OCR first. Paste or type the text here and
            the second half of that pipeline is the same.
          </p>
          <textarea
            className="field min-h-[100px]"
            placeholder={'One line per item…\nMount Kinabalu\nTanjung Aru Beach'}
            value={signText}
            onChange={(e) => setSignText(e.target.value)}
          />
          <button
            className="btn-ghost mt-2"
            disabled={!signText.trim()}
            onClick={async () => setSignResult(await translateSign(signText, trip.localLanguage))}
          >
            📷 Translate the lines
          </button>
          {signResult && (
            <div className="rise mt-3 grid gap-1.5">
              {signResult.map((line, i) => (
                <div key={i} className="rounded-lg bg-sand px-3 py-2">
                  <div className="text-xs muted">{signText.split('\n').filter(Boolean)[i]}</div>
                  <div className="font-medium">{line}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
