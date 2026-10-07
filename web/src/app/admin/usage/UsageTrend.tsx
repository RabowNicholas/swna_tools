'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const label = (week: string) =>
  new Date(`${week}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Successful tool runs per week. One series, so the title names it and there's no legend. */
export function UsageTrend({ data }: { data: { week: string; runs: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="week"
            tickFormatter={label}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
            labelFormatter={(w) => `Week of ${label(String(w))}`}
            formatter={(v) => [v, 'Runs']}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 8,
              color: 'var(--card-foreground)',
              fontSize: 13,
            }}
          />
          <Bar dataKey="runs" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
