import React, { useEffect, useState } from 'react';

export function Card({
  className = '',
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Avatar({
  name,
  color,
  size = 32,
  dim = false,
}: {
  name: string;
  color: string;
  size?: number;
  dim?: boolean;
}) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${dim ? 'opacity-35' : ''}`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </span>
  );
}

export function ProgressBar({
  value = 0,
  max = 1,
  color = '#15171c',
  height = 8,
  segments,
}: {
  /** Ignored when `segments` is given. */
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  /** Stacked segments, for a bar split across categories. */
  segments?: { value: number; color: string; label?: string }[];
}) {
  if (segments) {
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    return (
      <div className="flex w-full overflow-hidden rounded-full bg-sand" style={{ height }}>
        {segments.map((s, i) => (
          <div
            key={i}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={s.label}
            className="transition-all duration-500"
          />
        ))}
      </div>
    );
  }
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="w-full overflow-hidden rounded-full bg-sand" style={{ height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct * 100}%`, background: color }}
      />
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
  className = '',
  ...rest
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
} & React.HTMLAttributes<HTMLSpanElement>) {
  const tones = {
    neutral: 'bg-sand text-ink/70',
    good: 'bg-moss/15 text-moss',
    warn: 'bg-amber-500/15 text-amber-700',
    bad: 'bg-clay/15 text-clay',
    info: 'bg-sky/15 text-sky',
  };
  return (
    <span className={`chip ${tones[tone]} ${className}`} {...rest}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="absolute inset-0"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`rise relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="h2">{title}</h2>
          <button className="btn-quiet -mr-2 -mt-1 px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-moss' : 'bg-sand'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="max-w-sm text-sm muted">{body}</p>
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
      {label}
    </span>
  );
}

const SYMBOLS: Record<string, string> = { MYR: 'RM', JPY: '¥', USD: '$', SGD: 'S$', EUR: '€', GBP: '£' };

export function money(amount: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? `${currency} `;
  const rounded = currency === 'JPY' ? Math.round(amount) : Math.round(amount * 100) / 100;
  // The sign goes outside the symbol: "-RM733.33", never "RM-733.33".
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  return `${sign}${symbol}${abs.toLocaleString('en-GB', {
    minimumFractionDigits: currency === 'JPY' ? 0 : abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  })}`;
}

export function Money({ amount, currency }: { amount: number; currency: string }) {
  return <span className="tabular-nums">{money(amount, currency)}</span>;
}

/** Small banner used for soft warnings that must never block the user. */
export function Notice({
  tone = 'warn',
  children,
}: {
  tone?: 'warn' | 'info' | 'good';
  children: React.ReactNode;
}) {
  const tones = {
    warn: 'border-amber-500/30 bg-amber-500/10 text-amber-900',
    info: 'border-sky/25 bg-sky/10 text-sky',
    good: 'border-moss/25 bg-moss/10 text-moss',
  };
  const icon = { warn: '⚠️', info: 'ℹ️', good: '✓' }[tone];
  return (
    <div className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${tones[tone]}`}>
      <span aria-hidden>{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Inline "why is this number what it is" popover. */
export function InfoDot({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink/10 text-[10px] font-bold text-ink/60 hover:bg-ink/20"
        aria-label="Why?"
      >
        ?
      </button>
      {open && (
        <span className="rise absolute bottom-6 left-1/2 z-30 w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs font-normal leading-relaxed text-paper shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="h2">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 text-center ring-1 ring-black/5">
      <div className="font-display text-xl leading-none">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/45">{label}</div>
    </div>
  );
}
