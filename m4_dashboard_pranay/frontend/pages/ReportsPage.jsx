import { Download, FileSpreadsheet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@m1/context/AuthContext';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, PageHeader, Select } from '@m2/components/ui';
import { todayISO } from '@m2/lib/format';
import { STATUS } from '../components/StatusLegend';
import FilterBar from '../layout/FilterBar';
import { categoryForDrug, getAlerts, getOverview, META, SPRINT } from '../services/dashboardService';

const REPORTS = {
  stock: {
    label: 'Stock status',
    cols: [['drug', 'Drug'], ['category', 'Category'], ['branch', 'Branch'], ['stock', 'Stock'], ['days_of_cover', 'Days of cover'], ['rop', 'Reorder point'], ['status', 'Status']],
  },
  expiry: {
    label: 'Expiring batches',
    cols: [['drug', 'Drug'], ['category', 'Category'], ['branch', 'Branch'], ['batch_no', 'Batch'], ['quantity', 'Qty'], ['expiry_date', 'Expiry date'], ['days_left', 'Days left']],
  },
  alerts: {
    label: 'Alerts',
    cols: [['created_at', 'Created'], ['type', 'Type'], ['severity', 'Severity'], ['drug', 'Drug'], ['branch', 'Branch'], ['message', 'Message'], ['resolved', 'Resolved']],
  },
};
const NUMERIC = ['stock', 'days_of_cover', 'rop', 'quantity', 'days_left'];
const SEV_TONE = { CRITICAL: 'red', WARNING: 'amber', INFO: 'blue' };

export function toCsv(cols, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([, h]) => esc(h)).join(','), ...rows.map((r) => cols.map(([k]) => esc(r[k])).join(','))].join('\n');
}

async function loadReport(type, filters) {
  if (type === 'alerts') {
    const alerts = await getAlerts({ ...filters, include_resolved: true });
    return alerts.map((a) => ({ ...a, created_at: a.created_at.slice(0, 10), resolved: a.resolved ? 'yes' : 'no' }));
  }
  const o = await getOverview(filters);
  if (type === 'stock') {
    return o.heatmap.cells.map((c) => ({ ...c, category: categoryForDrug(c.drug), status: c.status }));
  }
  return o.expiry.batches
    .filter((b) => (!filters.from || b.expiry_date >= filters.from) && (!filters.to || b.expiry_date <= filters.to))
    .map((b) => ({ ...b, category: categoryForDrug(b.drug) }));
}

export default function ReportsPage() {
  const { user, role } = useAuth();
  const [type, setType] = useState('stock');
  const [filters, setFilters] = useState({ branch: role === 'pharmacist' ? user.branch_name || '' : '', category: '', from: '', to: '' });
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    setRows(null);
    loadReport(type, filters).then((r) => alive && setRows(r));
    return () => { alive = false; };
  }, [type, filters]);

  const cols = REPORTS[type].cols;
  const tableCols = useMemo(() => cols.map(([k, h]) => ({
    key: k,
    header: h,
    align: NUMERIC.includes(k) ? 'right' : undefined,
    className: k === 'message' ? 'max-w-xs truncate' : undefined,
    render: k === 'status'
      ? (r) => <span className={`font-medium ${STATUS[r.status].text}`}>{STATUS[r.status].label}</span>
      : k === 'severity' ? (r) => <Badge tone={SEV_TONE[r.severity]}>{r.severity}</Badge> : undefined,
  })), [cols]);

  const download = () => {
    const blob = new Blob([toCsv(cols, rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${type}_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(`Downloaded ${rows.length} rows`);
  };

  const dateIgnored = type === 'stock' && (filters.from || filters.to);
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Filter, preview and export. The CSV export runs in the browser on the rows shown."
        badge={<DataSourceBadge sprint={SPRINT.reports} />}
        actions={<Button icon={Download} onClick={download} disabled={!rows || rows.length === 0}>Download CSV</Button>}
      />
      <FilterBar
        value={filters}
        onChange={setFilters}
        branches={META.branches}
        categories={META.categories}
        fields={['branch', 'category', 'from', 'to']}
        extra={(
          <label className="w-full text-xs font-medium text-slate-500 sm:w-48">Report
            <Select className="mt-1" value={type} onChange={(e) => setType(e.target.value)} options={Object.entries(REPORTS).map(([v, r]) => ({ value: v, label: r.label }))} />
          </label>
        )}
      />
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{REPORTS[type].label} preview {rows && <span className="font-normal text-slate-400">({rows.length} rows)</span>}</h2>
          <div className="flex items-center gap-2">
            {dateIgnored && <span className="text-[11px] text-slate-400">Date range applies to the expiry and alert reports</span>}
            <DataSourceBadge sprint={SPRINT.reports} />
          </div>
        </div>
        <DataTable
          dense
          loading={!rows}
          rows={rows || []}
          rowKey={type === 'alerts' ? 'id' : 'batch_no'}
          columns={tableCols}
          empty={<EmptyState icon={FileSpreadsheet} title="No rows" description="Loosen the filters to see data." />}
        />
      </div>
    </div>
  );
}
