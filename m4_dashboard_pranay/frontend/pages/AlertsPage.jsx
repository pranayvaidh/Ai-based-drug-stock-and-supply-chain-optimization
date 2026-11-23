import { useEffect, useState } from 'react';
import { Badge, DataSourceBadge, PageHeader, Select } from '@m2/components/ui';
import { fmtDate } from '@m2/lib/format';
import AlertList from '../components/AlertList';
import FilterBar from '../layout/FilterBar';
import { getAlerts, getOverview, META, SPRINT } from '../services/dashboardService';

const COLS = [
  { key: 'd30', title: '≤ 30 days', test: (d) => d <= 30, head: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'd60', title: '31 – 60 days', test: (d) => d > 30 && d <= 60, head: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'd90', title: '61 – 90 days', test: (d) => d > 60 && d <= 90, head: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
];
const TYPES = [
  { value: 'STOCKOUT', label: 'Stockout' }, { value: 'OVERSTOCK', label: 'Overstock' },
  { value: 'EXPIRY_RISK', label: 'Expiry risk' }, { value: 'ANOMALY', label: 'Anomaly' },
];
const SEVERITIES = [{ value: 'CRITICAL', label: 'Critical' }, { value: 'WARNING', label: 'Warning' }, { value: 'INFO', label: 'Info' }];

export default function AlertsPage() {
  const [filters, setFilters] = useState({ branch: '', category: '' });
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [batches, setBatches] = useState(null);

  useEffect(() => {
    let alive = true;
    setAlerts(null);
    getAlerts({ ...filters, type, severity, include_resolved: showResolved }).then((a) => alive && setAlerts(a));
    return () => { alive = false; };
  }, [filters, type, severity, showResolved]);

  useEffect(() => {
    let alive = true;
    setBatches(null);
    getOverview(filters).then((o) => alive && setBatches(o.expiry.batches));
    return () => { alive = false; };
  }, [filters]);

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts & expiry" description="Stockout, overstock, expiry and demand-anomaly alerts with severity." badge={<DataSourceBadge sprint={SPRINT.alerts} />} />
      <FilterBar
        value={filters}
        onChange={setFilters}
        branches={META.branches}
        categories={META.categories}
        extra={(
          <>
            <label className="w-[calc(50%-6px)] text-xs font-medium text-slate-500 sm:w-40">Type
              <Select className="mt-1" value={type} onChange={(e) => setType(e.target.value)} placeholder="All types" options={TYPES} />
            </label>
            <label className="w-[calc(50%-6px)] text-xs font-medium text-slate-500 sm:w-36">Severity
              <Select className="mt-1" value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="All" options={SEVERITIES} />
            </label>
            <label className="flex h-10 items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              Show resolved
            </label>
          </>
        )}
      />

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Alerts {alerts && <span className="font-normal text-slate-400">({alerts.length})</span>}</h2>
          <DataSourceBadge sprint={SPRINT.alerts} />
        </div>
        {alerts
          ? <AlertList alerts={alerts} showResolve />
          : <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full" />)}</div>}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2"><h2 className="text-sm font-semibold text-slate-700">Expiring batches</h2><DataSourceBadge sprint={SPRINT.alerts} /></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {COLS.map((c) => {
            const list = (batches || []).filter((b) => c.test(b.days_left));
            return (
              <div key={c.key} className="card overflow-hidden">
                <div className={`flex items-center justify-between border-b px-4 py-2.5 ${c.head}`}>
                  <span className="text-sm font-semibold">{c.title}</span><span className="text-xs font-semibold">{batches ? list.length : '…'}</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {!batches && <li className="p-4"><div className="skeleton h-10 w-full" /></li>}
                  {batches && list.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-400">No batches</li>}
                  {list.map((b) => (
                    <li key={b.batch_no + b.branch} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-800">{b.drug}</p><Badge tone="slate">{b.days_left} d</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{b.branch} · <span className="font-mono">{b.batch_no}</span></p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {b.quantity} units · expires {fmtDate(b.expiry_date)}
                        {b.at_risk_qty > 0 && <span className="text-red-600"> · ~{b.at_risk_qty} may expire unsold</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
