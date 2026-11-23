import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

/** Actual (solid) vs forecast (dashed) with a shaded interval (FR-4.1). Recharts. */
export default function ForecastChart({ forecast, height = 340 }) {
  const rows = [
    ...forecast.actuals.map((a) => ({ date: a.date, actual: a.quantity })),
    ...forecast.daily_predictions.map((p) => ({ date: p.date, forecast: p.yhat, band: [p.yhat_lower, p.yhat_upper] })),
  ];
  // connect the two lines at the boundary
  const lastActual = forecast.actuals[forecast.actuals.length - 1];
  const joinIdx = forecast.actuals.length - 1;
  if (lastActual) rows[joinIdx] = { ...rows[joinIdx], forecast: lastActual.quantity };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={28} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            labelFormatter={fmt}
            formatter={(v, name) => (Array.isArray(v) ? [`${v[0]} – ${v[1]}`, 'Interval'] : [v, name])}
            contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area dataKey="band" name="Interval" stroke="none" fill="#fb923c" fillOpacity={0.18} isAnimationActive={false} />
          <Line dataKey="actual" name="Actual" stroke="#1d4ed8" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="forecast" name="Forecast" stroke="#ea580c" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
