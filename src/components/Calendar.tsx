import { useMemo, useRef, useState } from 'react';
import type { DateRange } from '../types';
import { addDays, daysBetween, iso, MONTHS_LONG, parseISO } from '../domain/dates';
import { toRanges } from '../domain/availability';

/**
 * Month calendar with tap-to-toggle and drag-across-a-range selection, plus a
 * highlight for the recommended season so members pick inside a good window
 * instead of blind.
 */
export function Calendar({
  value,
  onChange,
  recommendedMonths = [],
  monthCount = 2,
  startMonth,
  minDate,
  highlight,
  readOnly = false,
}: {
  value: DateRange[];
  onChange?: (ranges: DateRange[]) => void;
  recommendedMonths?: number[];
  monthCount?: number;
  startMonth?: string;
  minDate?: string;
  /** A window drawn on top of the selection, e.g. the group's overlap. */
  highlight?: DateRange | null;
  readOnly?: boolean;
}) {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dragging = useRef(false);

  const selected = useMemo(() => {
    const s = new Set<string>();
    for (const r of value) {
      for (let d = r.start; daysBetween(d, r.end) >= 0; d = addDays(d, 1)) s.add(d);
    }
    return s;
  }, [value]);

  const firstMonth = startMonth ?? iso(new Date());
  const months = Array.from({ length: monthCount }, (_, i) => {
    const base = parseISO(firstMonth);
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
  });

  const inDrag = (d: string): boolean => {
    if (!anchor || !hover) return false;
    const [a, b] = [anchor, hover].sort();
    return d >= a && d <= b;
  };

  const commit = (end: string) => {
    if (!anchor || !onChange) return;
    const [a, b] = [anchor, end].sort();
    const days: string[] = [];
    for (let d = a; daysBetween(d, b) >= 0; d = addDays(d, 1)) days.push(d);
    // Dragging over an already-selected block clears it, which is what people
    // expect from a toggle grid.
    const allSelected = days.every((d) => selected.has(d));
    const next = new Set(selected);
    for (const d of days) (allSelected ? next.delete(d) : next.add(d));
    onChange(toRanges([...next]));
    setAnchor(null);
    setHover(null);
    dragging.current = false;
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {months.map((m) => (
        <MonthGrid
          key={m.toISOString()}
          month={m}
          selected={selected}
          recommended={recommendedMonths.includes(m.getUTCMonth())}
          minDate={minDate}
          highlight={highlight}
          readOnly={readOnly}
          inDrag={inDrag}
          onDown={(d) => {
            if (readOnly) return;
            dragging.current = true;
            setAnchor(d);
            setHover(d);
          }}
          onEnter={(d) => dragging.current && setHover(d)}
          onUp={(d) => {
            if (readOnly) return;
            commit(d);
          }}
        />
      ))}
    </div>
  );
}

function MonthGrid({
  month,
  selected,
  recommended,
  minDate,
  highlight,
  readOnly,
  inDrag,
  onDown,
  onEnter,
  onUp,
}: {
  month: Date;
  selected: Set<string>;
  recommended: boolean;
  minDate?: string;
  highlight?: DateRange | null;
  readOnly: boolean;
  inDrag: (d: string) => boolean;
  onDown: (d: string) => void;
  onEnter: (d: string) => void;
  onUp: (d: string) => void;
}) {
  const year = month.getUTCFullYear();
  const mi = month.getUTCMonth();
  const first = new Date(Date.UTC(year, mi, 1));
  const daysInMonth = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate();
  // Monday-first grid.
  const lead = (first.getUTCDay() + 6) % 7;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-lg">
          {MONTHS_LONG[mi]} {year}
        </h3>
        {recommended && (
          <span className="chip bg-moss/15 text-moss">Recommended season</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-ink/35">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div
        className={`mt-1 grid grid-cols-7 gap-1 ${recommended ? 'rounded-xl bg-moss/5 p-1 ring-1 ring-moss/15' : 'p-1'}`}
        onMouseLeave={() => onEnter('')}
      >
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = iso(new Date(Date.UTC(year, mi, i + 1)));
          const disabled = readOnly || (minDate ? d < minDate : false);
          const isSel = selected.has(d);
          const isDrag = inDrag(d);
          const isHi = highlight ? d >= highlight.start && d <= highlight.end : false;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled && !isHi && !isSel}
              onMouseDown={() => !disabled && onDown(d)}
              onMouseEnter={() => !disabled && onEnter(d)}
              onMouseUp={() => !disabled && onUp(d)}
              onTouchStart={() => !disabled && onDown(d)}
              onTouchEnd={() => !disabled && onUp(d)}
              aria-pressed={isSel}
              aria-label={d}
              className={[
                'relative aspect-square rounded-lg text-xs font-medium transition',
                disabled ? 'cursor-default text-ink/20' : 'hover:bg-ink/10',
                isSel ? 'bg-ink text-paper hover:bg-ink' : '',
                isDrag && !isSel ? 'bg-ink/25' : '',
                isHi && !isSel ? 'bg-sky/25 ring-1 ring-sky/50' : '',
                isHi && isSel ? 'ring-2 ring-sky' : '',
              ].join(' ')}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
