import { useEffect, useState } from 'react';
import { DataSourceBadge, PageHeader } from '@m2/components/ui';
import StatusLegend, { STATUS } from '../components/StatusLegend';
import StockHeatmap from '../components/StockHeatmap';
import FilterBar from '../layout/FilterBar';
import { getOverview, META, SPRINT } from '../services/dashboardService';

export default function HeatmapPage() {
  const [filters, setFilters] = useState({ category: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getOverview(filters).then((d) => alive && setData(d)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filters]);

  const counts = data ? Object.keys(STATUS).map((k) => [k, data.heatmap.cells.filter((c) => c.status === k).length]) : [];
  return (
    <div>
      <PageHeader
        title="Stock heatmap"
        description="Every drug at every branch, coloured by stock status. Hover a cell for stock, days of cover and reorder point."
        badge={<DataSourceBadge sprint={SPRINT.overview} />}
      />
      <FilterBar value={filters} onChange={setFilters} categories={META.categories} fields={['category']} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(data ? counts : Object.keys(STATUS).map((k) => [k, null])).map(([k, n]) => (
          <div key={k} className={`rounded-xl p-3 ${STATUS[k].soft}`}>
            <p className={`text-xs font-medium ${STATUS[k].text}`}>{STATUS[k].label}</p>
            {n == null ? <div className="skeleton mt-1 h-7 w-10" /> : <p className={`text-2xl font-semibold tabular-nums ${STATUS[k].text}`}>{n}</p>}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><StatusLegend /><DataSourceBadge sprint={SPRINT.overview} /></div>
        <div className="p-4">
          {loading || !data
            ? <div className="skeleton h-[480px] w-full" />
            : <StockHeatmap drugs={data.heatmap.drugs} branches={data.heatmap.branches} cells={data.heatmap.cells} />}
        </div>
        <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          Status rule (FR-3.5): stock ≤ ROP → stockout risk; days of cover &gt; 60 → overstock; no forecast → no data. The number in each cell is units in stock.
        </p>
      </div>
    </div>
  );
}
