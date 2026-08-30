import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Avatar, Card, Chip, Modal, money, Notice, ProgressBar } from '../components/ui';
import { useStore } from '../store/store';
import {
  byCategory,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  netBalances,
  round2,
  settleUp,
  totalSpend,
} from '../domain/budget';
import { COST_CATEGORIES, type CostCategory, type CostItem, type Trip } from '../types';
import { formatDate } from '../domain/dates';

export default function Budget() {
  const trip = useOutletContext<Trip>();
  const store = useStore();
  const [tab, setTab] = useState<'breakdown' | 'settle'>('breakdown');
  const [editing, setEditing] = useState<CostItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [capFor, setCapFor] = useState<CostCategory | null>(null);

  const spend = totalSpend(trip.costItems);
  const cats = byCategory(trip);
  const perHead = trip.members.length ? spend / trip.members.length : 0;

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label mb-0.5">Spend so far</div>
            <div className="font-display text-4xl">{money(spend, trip.currency)}</div>
            <div className="mt-1 text-sm muted">
              of {money(trip.budgetCap, trip.currency)} group budget ·{' '}
              {money(perHead, trip.currency)} each
            </div>
          </div>
          <div className="text-right">
            <div className="label mb-0.5">Left</div>
            <div
              className={`font-display text-2xl ${spend > trip.budgetCap ? 'text-clay' : 'text-moss'}`}
            >
              {money(Math.max(0, trip.budgetCap - spend), trip.currency)}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            height={12}
            segments={cats
              .filter((c) => c.total > 0)
              .map((c) => ({
                value: c.total,
                color: CATEGORY_COLORS[c.category],
                label: `${CATEGORY_LABELS[c.category]}: ${money(c.total, trip.currency)}`,
              }))}
          />
        </div>
        {spend > trip.budgetCap && trip.budgetCap > 0 && (
          <div className="mt-3">
            <Notice tone="warn">
              You're {money(spend - trip.budgetCap, trip.currency)} over the group budget. Nothing
              stops you — but it's worth a conversation before anyone books more.
            </Notice>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {(['breakdown', 'settle'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip ${tab === t ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10 hover:bg-sand'}`}
          >
            {t === 'breakdown' ? '📂 By category' : '🤝 Who owes who'}
          </button>
        ))}
        <button className="btn-ghost ml-auto text-xs" onClick={() => setAdding(true)}>
          + Add an expense
        </button>
      </div>

      {tab === 'breakdown' ? (
        <div className="grid gap-3">
          {cats.map((c) => {
            const items = trip.costItems.filter((i) => i.category === c.category);
            return (
              <Card key={c.category} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg">{CATEGORY_ICONS[c.category]}</span>
                  <span className="font-semibold">{CATEGORY_LABELS[c.category]}</span>
                  {c.over && <Chip tone="bad">Over cap</Chip>}
                  {c.trendingOver && <Chip tone="warn">Trending over</Chip>}
                  <span className="ml-auto font-display text-lg">
                    {money(c.total, trip.currency)}
                  </span>
                </div>

                <div className="mt-2">
                  <ProgressBar
                    value={c.cap ? c.total : c.total}
                    max={c.cap ?? Math.max(1, spend)}
                    color={c.over ? '#c9603f' : CATEGORY_COLORS[c.category]}
                    height={6}
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] muted">
                    <span>
                      {c.count} {c.count === 1 ? 'item' : 'items'}
                      {c.cap && ` · cap ${money(c.cap, trip.currency)}`}
                    </span>
                    <button className="underline underline-offset-2" onClick={() => setCapFor(c.category)}>
                      {c.cap ? 'Change cap' : 'Set a cap'}
                    </button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-3 grid gap-1">
                    {items.map((i) => {
                      const payer = trip.members.find((m) => m.id === i.paidBy);
                      return (
                        <button
                          key={i.id}
                          onClick={() => setEditing(i)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-sand"
                        >
                          <span className="min-w-0 flex-1 truncate">{i.label}</span>
                          {i.source === 'imported' && <Chip tone="info">Imported</Chip>}
                          <span className="text-[11px] muted">{formatDate(i.date)}</span>
                          {payer && <Avatar name={payer.name} color={payer.avatarColor} size={20} />}
                          <span className="w-20 text-right tabular-nums">
                            {money(i.amount, trip.currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <SettleUp trip={trip} />
      )}

      <CapModal
        category={capFor}
        trip={trip}
        onClose={() => setCapFor(null)}
        onSave={(cat, cap) => {
          store.updateActiveTrip((t) => ({
            ...t,
            categoryCaps: { ...t.categoryCaps, [cat]: cap > 0 ? cap : undefined },
          }));
          setCapFor(null);
        }}
      />

      <ExpenseModal
        trip={trip}
        item={editing}
        open={adding || Boolean(editing)}
        onClose={() => {
          setEditing(null);
          setAdding(false);
        }}
      />
    </div>
  );
}

function SettleUp({ trip }: { trip: Trip }) {
  const balances = netBalances(trip);
  const transfers = settleUp(trip);

  return (
    <div className="grid gap-3">
      <Card className="p-5">
        <div className="label">Net position</div>
        <div className="grid gap-2">
          {trip.members.map((m) => {
            const bal = round2(balances[m.id] ?? 0);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.name} color={m.avatarColor} />
                <span className="min-w-0 flex-1 text-sm font-medium">{m.name}</span>
                <span
                  className={`text-sm font-semibold tabular-nums ${bal > 0 ? 'text-moss' : bal < 0 ? 'text-clay' : 'muted'}`}
                >
                  {bal > 0 && '+'}
                  {money(bal, trip.currency)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="label">Settle up</div>
        {transfers.length === 0 ? (
          <p className="text-sm muted">Everyone's square. Nothing to send.</p>
        ) : (
          <>
            <p className="mb-3 text-xs muted">
              Netted down to the fewest transfers — no chasing individual receipts.
            </p>
            <div className="grid gap-2">
              {transfers.map((s, i) => {
                const from = trip.members.find((m) => m.id === s.from)!;
                const to = trip.members.find((m) => m.id === s.to)!;
                return (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl bg-sand/60 px-3.5 py-3">
                    <Avatar name={from.name} color={from.avatarColor} size={26} />
                    <span className="text-sm font-medium">{from.name}</span>
                    <span className="text-sm muted">pays</span>
                    <Avatar name={to.name} color={to.avatarColor} size={26} />
                    <span className="text-sm font-medium">{to.name}</span>
                    <span className="ml-auto font-display text-lg">
                      {money(s.amount, trip.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function CapModal({
  category,
  trip,
  onClose,
  onSave,
}: {
  category: CostCategory | null;
  trip: Trip;
  onClose: () => void;
  onSave: (c: CostCategory, cap: number) => void;
}) {
  const [value, setValue] = useState(0);
  React.useEffect(() => {
    if (category) setValue(trip.categoryCaps[category] ?? 0);
  }, [category, trip.categoryCaps]);

  if (!category) return null;
  return (
    <Modal open onClose={onClose} title={`Cap for ${CATEGORY_LABELS[category]}`}>
      <p className="mb-4 text-sm muted">
        You'll get a warning as this category approaches the cap, and a clearer one when it goes
        past. It never blocks a booking.
      </p>
      <input
        type="number"
        className="field"
        value={value || ''}
        placeholder="Leave empty for no cap"
        onChange={(e) => setValue(Number(e.target.value))}
      />
      <div className="mt-4 flex gap-2">
        <button className="btn-quiet" onClick={() => onSave(category, 0)}>
          Remove cap
        </button>
        <button className="btn-primary ml-auto" onClick={() => onSave(category, value)}>
          Save
        </button>
      </div>
    </Modal>
  );
}

function ExpenseModal({
  trip,
  item,
  open,
  onClose,
}: {
  trip: Trip;
  item: CostItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<CostCategory>('food');
  const [paidBy, setPaidBy] = useState(store.state.profile.memberId);
  const [split, setSplit] = useState<string[]>(trip.members.map((m) => m.id));
  const [date, setDate] = useState(trip.dates?.start ?? '');

  React.useEffect(() => {
    if (!open) return;
    setLabel(item?.label ?? '');
    setAmount(item?.amount ?? 0);
    setCategory(item?.category ?? 'food');
    setPaidBy(item?.paidBy ?? store.state.profile.memberId);
    setSplit(item?.splitAmong.length ? item.splitAmong : trip.members.map((m) => m.id));
    setDate(item?.date ?? trip.dates?.start ?? '');
  }, [open, item?.id]);

  if (!open) return null;

  const save = () => {
    if (item) {
      store.updateCostItem(item.id, (c) => ({ ...c, label, amount, category, paidBy, splitAmong: split, date }));
    } else {
      store.addCostItem({ label, amount, category, paidBy, splitAmong: split, date, source: 'manual' });
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={item ? 'Edit expense' : 'Add an expense'}>
      <div className="grid gap-4">
        <div>
          <div className="label">What was it?</div>
          <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="label">Amount ({trip.currency})</div>
            <input
              type="number"
              className="field"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <div className="label">Date</div>
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <div className="label">Category</div>
          <div className="flex flex-wrap gap-1.5">
            {COST_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`chip ${category === c ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
              >
                {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Paid by</div>
          <div className="flex flex-wrap gap-1.5">
            {trip.members.map((m) => (
              <button
                key={m.id}
                onClick={() => setPaidBy(m.id)}
                className={`chip ${paidBy === m.id ? 'bg-ink text-paper' : 'bg-sand hover:bg-sand/70'}`}
              >
                <Avatar name={m.name} color={m.avatarColor} size={16} /> {m.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">Split between ({split.length})</div>
          <p className="mb-2 text-xs muted">Untick anyone sitting this one out.</p>
          <div className="flex flex-wrap gap-1.5">
            {trip.members.map((m) => {
              const on = split.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    setSplit((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                  }
                  className={`chip ${on ? 'bg-moss/15 text-moss ring-1 ring-moss/30' : 'bg-sand opacity-50'}`}
                >
                  {on ? '✓' : '○'} {m.name}
                  {on && amount > 0 && (
                    <span className="ml-1 text-[10px] opacity-70">
                      {money(amount / split.length, trip.currency)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {item && (
          <button
            className="btn-quiet text-clay"
            onClick={() => {
              store.removeCostItem(item.id);
              onClose();
            }}
          >
            Delete
          </button>
        )}
        <button className="btn-primary ml-auto" onClick={save} disabled={!label.trim() || amount <= 0}>
          Save
        </button>
      </div>
    </Modal>
  );
}
