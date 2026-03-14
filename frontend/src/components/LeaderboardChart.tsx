import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { LeaderboardRow } from '../data/types';

const TOP_N = 20;

export function LeaderboardChart({ rows }: { rows: LeaderboardRow[] }) {
  const chartData = rows
    .slice()
    .sort((a, b) => b.metricValue - a.metricValue)
    .slice(0, TOP_N)
    .map((r) => ({
      name: r.model ? `${r.dataset} (${r.model})` : r.dataset,
      value: r.metricValue,
      metric: r.metricName,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 60 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11 }} width={36} />
          <Tooltip
            formatter={(value: unknown) => [typeof value === 'number' ? value.toFixed(2) : String(value)]}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="value" fill="rgb(15, 118, 110)" radius={[2, 2, 0, 0]} name="Metric" />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-muted">
        Top {Math.min(TOP_N, chartData.length)} by metric value
      </p>
    </div>
  );
}
