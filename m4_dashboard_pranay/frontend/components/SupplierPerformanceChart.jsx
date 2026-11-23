import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const COLORS = ['#1d6ef1', '#f59e0b', '#10b981'];
const base = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { boxWidth: 12, font: { size: 11 } } } },
  scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#eef2f7' }, ticks: { font: { size: 11 } } } },
};

/** Chart.js bar: on-time delivery % per supplier (FR-4.5). */
export function OnTimeBarChart({ suppliers }) {
  const data = {
    labels: suppliers.map((s) => s.supplier.replace(' Distributors', '').replace(' Medical Agencies', '')),
    datasets: [{ label: 'On-time delivery %', data: suppliers.map((s) => Math.round(s.on_time_rate * 100)), backgroundColor: COLORS, borderRadius: 6, maxBarThickness: 56 }],
  };
  const options = { ...base, plugins: { ...base.plugins, legend: { display: false } }, scales: { ...base.scales, y: { ...base.scales.y, min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } } };
  return <div className="h-64"><Bar data={data} options={options} /></div>;
}

/** Chart.js line: average lead-time trend per supplier. */
export function LeadTimeTrendChart({ suppliers }) {
  const data = {
    labels: suppliers[0]?.trend.map((t) => t.month) || [],
    datasets: suppliers.map((s, i) => ({
      label: s.supplier, data: s.trend.map((t) => t.avg_lead_time_days), borderColor: COLORS[i], backgroundColor: COLORS[i], tension: 0.35, pointRadius: 3,
    })),
  };
  const options = { ...base, scales: { ...base.scales, y: { ...base.scales.y, ticks: { callback: (v) => `${v} d` } } } };
  return <div className="h-64"><Line data={data} options={options} /></div>;
}

export default OnTimeBarChart;
