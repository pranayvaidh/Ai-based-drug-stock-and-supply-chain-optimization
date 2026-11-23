import { Check, ClipboardList, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '@m1/api/client';
import { useAuth } from '@m1/context/AuthContext';
import { Button, DataSourceBadge, DataTable, EmptyState, PageHeader, Tooltip } from '../components/ui';
import { fmtDateTime, num } from '../lib/format';
import { StatusPill } from './PurchaseOrdersPage';

const TIP = 'Confirm / reject planned Sprint 4 (FR-2.8)';

export default function SupplierPortalPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    api.get('/purchase-orders', { params: { page, limit } })
      .then(({ data }) => { setRows(data.items); setTotal(data.total); })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [page]);

  const pending = rows.filter((r) => r.status === 'Pending').length;

  return (
    <div>
      <PageHeader title="Supplier portal" description={`Orders placed with ${user?.supplier_name || 'your company'}. You only see your own orders.`} badge={<DataSourceBadge live />} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-slate-500">Total orders</p><p className="mt-1 text-2xl font-semibold text-slate-800">{loading ? '…' : total}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Awaiting your confirmation</p><p className="mt-1 text-2xl font-semibold text-amber-600">{loading ? '…' : pending}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-500">Company</p><p className="mt-1 truncate text-base font-semibold text-slate-800">{user?.supplier_name}</p></div>
      </div>
      <div className="card">
        <DataTable loading={loading} rows={rows} pagination={{ page, limit, total, onPage: setPage }}
          empty={<EmptyState icon={ClipboardList} title="No orders yet" description="Orders raised by pharmacies for your company will appear here." />}
          columns={[
            { key: 'created_at', header: 'Received', render: (r) => fmtDateTime(r.created_at) },
            { key: 'drug_name', header: 'Drug', render: (r) => <span className="font-medium text-slate-800">{r.drug_name}</span> },
            { key: 'branch_name', header: 'Deliver to' },
            { key: 'quantity', header: 'Qty', align: 'right', render: (r) => num(r.quantity) },
            { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
            { key: 'a', header: 'Actions', render: () => (
              <div className="flex gap-1">
                <Tooltip text={TIP}><Button size="sm" variant="secondary" icon={Check} disabled>Confirm</Button></Tooltip>
                <Tooltip text={TIP}><Button size="sm" variant="ghost" icon={X} disabled>Reject</Button></Tooltip>
              </div>
            ) },
          ]} />
      </div>
    </div>
  );
}
