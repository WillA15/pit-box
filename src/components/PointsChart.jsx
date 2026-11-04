import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { interpolateStandings } from '../lib/standingsHistory.js';

/**
 * Points-over-season chart. `t` is the fractional round index from the replay, so lines
 * grow smoothly between races instead of jumping a round at a time.
 * series: [{ id, label, color, dashed, highlight }]
 */
export default function PointsChart({ history, kind, series, t, raceName, animate }) {
  const whole = Math.floor(t);
  const data = history.rounds.slice(0, whole + 1).map((round, x) => {
    const row = { x, round };
    for (const r of history[kind][round]) row[r.id] = r.points;
    return row;
  });
  if (t > whole) {
    const row = { x: t, round: null };
    for (const r of interpolateStandings(history, kind, t)) row[r.id] = r.points;
    data.push(row);
  }
  const ticks = history.rounds.map((_, i) => i);
  const maxPts = Math.max(10, ...history[kind][history.rounds.at(-1)].map((r) => r.points));

  return (
    <div className="points-chart" style={{ width: '100%', height: 340 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, history.rounds.length - 1]}
            ticks={ticks}
            tickFormatter={(i) => `R${history.rounds[i]}`}
            stroke="var(--muted)"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
          />
          {/* Fixed y-axis so the scale doesn't jump while the replay runs. */}
          <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} domain={[0, Math.ceil(maxPts / 50) * 50]} />
          <Tooltip
            contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--line)' }}
            labelFormatter={(x, p) => raceName(p?.[0]?.payload?.round) ?? ''}
            formatter={(v) => Math.round(v)}
            itemSorter={(i) => -i.value}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Line
              key={s.id}
              dataKey={s.id}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.highlight ? 3 : 2}
              strokeDasharray={s.dashed ? '5 4' : undefined}
              dot={false}
              isAnimationActive={animate}
              animationDuration={2200}
              animationEasing="ease-in-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
