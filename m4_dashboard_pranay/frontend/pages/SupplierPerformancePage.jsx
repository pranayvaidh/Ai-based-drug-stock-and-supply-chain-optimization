import { useEffect, useState } from 'react';
import { DataSourceBadge, DataTable, PageHeader } from '@m2/components/ui';
import { LeadTimeTrendChart, OnTimeBarChart } from '../components/SupplierPerformanceChart';
import { getSuppliers, SPRINT } from '../services/dashboardService';

const pct = (x) => `${Math.round(x * 100)}%`;

export default function SupplierPerformancePage() {
  const [rows, setRows] = useState(null);
  useEffect(() => { getSuppliers().then(setRows); }, []);
  return (
    <div className="space-y-5">
      <PageHeader title="Supplier performance" description="On-time delivery and lead-time trends per supplier (FR-4.5)." badge={<DataSourceBadge sprint={SPRINT.suppliers} />} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="card-header"><h2 className="card-title">On-time delivery rate</h2><DataSourceBadge sprint={SPRINT.suppliers} /></div>
          <div className="p-4">{rows ? <OnTimeBarChart suppliers={rows} /> : <div className="skeleton h-64 w-full" />}</div>
        </div>
        <div className="card">
          <div className="card-header"><h2 className="card-title">Average lead time (last 6 months)</h2><DataSourceBadge sprint={SPRINT.suppliers} /></div>
          <div className="p-4">{rows ? <LeadTimeTrendChart suppliers={rows} /> : <div className="skeleton h-64 w-full" />}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><h2 className="card-title">Scorecard</h2><DataSourceBadge sprint={SPRINT.suppliers} /></div>
        <DataTable
          loading={!rows}
          rows={rows || []}
          rowKey="supplier"
          columns={[
            { key: 'supplier', header: 'Supplier', render: (r) => <span className="font-medium text-slate-800">{r.supplier}</span> },
            { key: 'on_time_rate', header: 'On-time', align: 'right', render: (r) => <span className={r.on_time_rate < 0.85 ? 'font-semibold text-amber-600' : 'text-emerald-700'}>{pct(r.on_time_rate)}</span> },
            { key: 'fill_rate', header: 'Fill rate', align: 'right', render: (r) => pct(r.fill_rate) },
            { key: 'avg_lead_time_days', header: 'Avg lead time', align: 'right', render: (r) => `${r.avg_lead_time_days} d` },
            { key: 'orders_delivered', header: 'Orders delivered', align: 'right' },
          ]}
        />
      </div>
    </div>
  );
}
