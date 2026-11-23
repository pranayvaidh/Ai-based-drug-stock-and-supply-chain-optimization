import { AlertTriangle, ArrowRight, CalendarClock, PackageX, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@m1/context/AuthContext';
import { CardSkeleton, DataSourceBadge, PageHeader } from '@m2/components/ui';
import AlertList from '../components/AlertList';
import ExpiryRiskIndicator from '../components/ExpiryRiskIndicator';
import KpiCard from '../components/KpiCard';
import StatusLegend from '../components/StatusLegend';
import StockHeatmap from '../components/StockHeatmap';
import FilterBar from '../layout/FilterBar';
import { getOverview, META, SPRINT } from '../services/dashboardService';

export default function DashboardHome() {
  const { user, role } = useAuth();
  const [filters, setFilters] = useState({ branch: role === 'pharmacist' ? user.branch_name || '' : '', category: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getOverview(filters)
      .then((d) => alive && setData(d))
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filters]);

  const k = data?.kpis;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return (
    <div>
      <PageHeader
        title={`Good ${greeting}, ${user?.name?.split(' ')[0] || ''}`}
        description="Stock health across branches at a glance."
        badge={<DataSourceBadge sprint={SPRINT.overview} />}
      />
      <FilterBar value={filters} onChange={setFilters} branches={META.branches} categories={META.categories} />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Items at stockout risk" value={k?.items_at_risk} icon={PackageX} tone="red" hint="Stock at or below reorder point" loading={loading} />
        <KpiCard label="Batches expiring ≤ 30 days" value={k?.expiring_batches_30d} icon={CalendarClock} tone="amber" hint="Plan transfers or discounts" loading={loading} />
        <KpiCard label="Open purchase orders" value={k?.open_orders} icon={ShoppingCart} tone="blue" hint="Pending / confirmed" loading={loading} />
        <KpiCard label="Active alerts" value={k?.active_alerts} icon={AlertTriangle} tone="violet" hint="Unresolved" loading={loading} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <h2 className="card-title">Stock heatmap</h2>
            <div className="flex items-center gap-3">
              <DataSourceBadge sprint={SPRINT.overview} />
              <Link to="/heatmap" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">Full view <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
          <div className="p-4">
            {loading || !data
              ? <div className="skeleton h-72 w-full" />
              : <StockHeatmap compact drugs={data.heatmap.drugs} branches={data.heatmap.branches} cells={data.heatmap.cells} />}
            <StatusLegend className="mt-3" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="card">
            <div className="card-header"><h2 className="card-title">Expiry risk</h2><DataSourceBadge sprint={SPRINT.overview} /></div>
            <div className="p-4">{loading || !data ? <div className="skeleton h-28 w-full" /> : <ExpiryRiskIndicator expiry={data.expiry} />}</div>
          </div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Latest alerts</h2>
              <div className="flex items-center gap-3">
                <DataSourceBadge sprint={SPRINT.alerts} />
                <Link to="/alerts" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">All <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
            {loading || !data ? <div className="p-4"><CardSkeleton rows={4} /></div> : <AlertList compact alerts={data.latest_alerts} />}
          </div>
        </div>
      </div>
      {data && (
        <p className="mt-4 text-right text-[11px] text-slate-400">
          Sample refreshed {new Date(data.refreshed_at).toLocaleString('en-IN')} · auto-refresh planned Sprint 7
        </p>
      )}
    </div>
  );
}
