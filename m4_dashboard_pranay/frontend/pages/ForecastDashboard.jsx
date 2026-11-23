import { Info, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataSourceBadge, EmptyState, PageHeader, Select, Tooltip } from '@m2/components/ui';
import ForecastChart from '../components/ForecastChart';
import { getForecast, getForecastSeries, SPRINT } from '../services/dashboardService';

const MODEL_LABEL = {
  prophet: 'Prophet',
  linear_regression: 'Linear regression (Ridge)',
  moving_average_14d: '14-day moving average',
};

export default function ForecastDashboard() {
  const series = useMemo(() => getForecastSeries(), []);
  const drugs = [...new Set(series.map((s) => s.drug))];
  const [drug, setDrug] = useState(series[0].drug);
  const branches = series.filter((s) => s.drug === drug).map((s) => s.branch);
  const [branch, setBranch] = useState(series[0].branch);
  const [fc, setFc] = useState(null);
  const [loading, setLoading] = useState(true);

  const pickDrug = (d) => {
    setDrug(d);
    const options = series.filter((s) => s.drug === d).map((s) => s.branch);
    if (!options.includes(branch)) setBranch(options[0]);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getForecast(drug, branch).then((d) => alive && setFc(d)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [drug, branch]);

  const low = fc && fc.confidence === 'LOW';
  return (
    <div>
      <PageHeader
        title="Demand forecast"
        description="Actual daily sales vs the 30-day forecast for one drug at one branch."
        badge={<DataSourceBadge sprint={SPRINT.forecast} />}
        actions={(
          <Tooltip text="Backend ↔ ML integration planned Sprint 7 (FR-3.8)">
            <Button variant="secondary" icon={RefreshCw} disabled>Re-run forecast</Button>
          </Tooltip>
        )}
      />

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-3">
        <label className="w-full text-xs font-medium text-slate-500 sm:w-64">Drug
          <Select className="mt-1" value={drug} onChange={(e) => pickDrug(e.target.value)} options={drugs.map((d) => ({ value: d, label: d }))} />
        </label>
        <label className="w-full text-xs font-medium text-slate-500 sm:w-64">Branch
          <Select className="mt-1" value={branch} onChange={(e) => setBranch(e.target.value)} options={branches.map((b) => ({ value: b, label: b }))} />
        </label>
        <p className="text-[11px] text-slate-400 sm:ml-auto">Sample series produced by the Module 3 pipeline on synthetic history.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <div className="card xl:col-span-3">
          <div className="card-header"><h2 className="card-title">{drug} · {branch}</h2><DataSourceBadge sprint={SPRINT.forecast} /></div>
          <div className="p-4">
            {loading ? <div className="skeleton h-[340px] w-full" /> : fc ? <ForecastChart forecast={fc} /> : <EmptyState title="No forecast for this series" />}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Forecast accuracy (MAPE)</p>
            {loading || !fc ? <div className="skeleton mt-2 h-8 w-24" /> : (
              <>
                <p className={`mt-1 text-3xl font-semibold tabular-nums ${low ? 'text-amber-600' : 'text-slate-900'}`}>{fc.mape != null ? `${fc.mape}%` : '—'}</p>
                <div className="mt-2">{low ? <Badge tone="amber" dot>Low confidence</Badge> : <Badge tone="green" dot>Confidence OK</Badge>}</div>
                <p className="mt-2 text-[11px] text-slate-400">Low confidence when MAPE &gt; 25% or it can&apos;t be computed (NFR-006).</p>
              </>
            )}
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Model used</p>
            {fc && <p className="mt-1 text-sm font-semibold text-slate-800">{MODEL_LABEL[fc.model_used]}</p>}
            {fc && (
              <ul className="mt-3 space-y-1.5 text-xs">
                {Object.entries(fc.candidates).map(([m, c]) => (
                  <li key={m} className="flex justify-between gap-2">
                    <span className={m === fc.model_used ? 'font-semibold text-slate-800' : 'text-slate-500'}>{MODEL_LABEL[m] || m}</span>
                    <span className="tabular-nums text-slate-600">{c.mape != null ? `${c.mape}%` : '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-4 text-xs">
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-slate-500">History</dt><dd className="font-medium text-slate-800">{fc?.history_days ?? '—'} days</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Avg daily demand</dt><dd className="font-medium text-slate-800">{fc?.avg_daily_demand ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Horizon</dt><dd className="font-medium text-slate-800">{fc?.horizon_days ?? '—'} days</dd></div>
            </dl>
            <p className="mt-3 flex gap-1.5 text-[11px] text-slate-400">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Both models train on the first 80% of days and are scored on the last 20%; the lower MAPE wins. Under 60 days of history → 14-day moving average.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
