import { useOutletContext } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, EmptyState, money, Stat } from '../components/ui';
import {
  byCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  spendByDay,
  totalSpend,
} from '../domain/budget';
import { formatDate } from '../domain/dates';
import type { Trip } from '../types';

export default function Spending() {
  const trip = useOutletContext<Trip>();
  const cats = byCategory(trip).filter((c) => c.total > 0);
  const daily = spendByDay(trip);
  const spend = totalSpend(trip.costItems);

  if (trip.costItems.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Nothing spent yet"
        body="Book something, import a booking, or add an expense and the breakdown fills in here."
      />
    );
  }

  const pieData = cats.map((c) => ({
    name: CATEGORY_LABELS[c.category],
    value: Math.round(c.total),
    color: CATEGORY_COLORS[c.category],
  }));

  const dayData = daily.map((d) => ({
    date: formatDate(d.date),
    spend: Math.round(d.spend),
    cumulative: Math.round(d.cumulative),
  }));

  const biggest = cats.reduce((a, b) => (b.total > a.total ? b : a), cats[0]);

  return (
    <div className="stack gap-4">
      <h1 className="h1">Where the money's going</h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={money(spend, trip.currency)} label="Total spend" />
        <Stat
          value={money(trip.members.length ? spend / trip.members.length : 0, trip.currency)}
          label="Per person"
        />
        <Stat value={CATEGORY_LABELS[biggest.category]} label="Biggest category" />
        <Stat value={`${Math.round((spend / Math.max(1, trip.budgetCap)) * 100)}%`} label="Of budget" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 font-display text-xl">By category</h2>
          <p className="mb-3 text-xs muted">
            Every cost carries a category from the moment it's created — a hotel import tags itself
            accommodation, a ride tags itself transport.
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="82%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [money(v, trip.currency), n]}
                  contentStyle={tooltipStyle}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 font-display text-xl">Day by day</h2>
          <p className="mb-3 text-xs muted">
            Bars are what you spent that day; the line is the running total against the budget.
          </p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dayData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#00000010" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v: number, n: string) => [
                    money(v, trip.currency),
                    n === 'spend' ? 'That day' : 'Running total',
                  ]}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="spend" fill="#c9603f" radius={[4, 4, 0, 0]} maxBarSize={38} />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#2f6f70"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-xl">Against the caps</h2>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byCategory(trip).map((c) => ({
                name: CATEGORY_LABELS[c.category],
                spent: Math.round(c.total),
                cap: c.cap ? Math.round(c.cap) : null,
                color: CATEGORY_COLORS[c.category],
              }))}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="#00000010" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number, n: string) => [money(v, trip.currency), n === 'spent' ? 'Spent' : 'Cap']}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="cap" fill="#e6ded0" radius={[4, 4, 0, 0]} maxBarSize={44} />
              <Bar dataKey="spent" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {byCategory(trip).map((c) => (
                  <Cell key={c.category} fill={c.over ? '#c9603f' : CATEGORY_COLORS[c.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs muted">
          Grey is the cap where one is set. A bar that turns red has gone past it.
        </p>
      </Card>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,.08)',
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(21,23,28,.3)',
};
