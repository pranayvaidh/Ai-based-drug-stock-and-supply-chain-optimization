import { Ban, CheckCircle2, PackageCheck, Plus, ShoppingCart, Sparkles, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, getFieldErrors } from '@m1/api/client';
import { useAuth } from '@m1/context/AuthContext';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, PageHeader, PO_STATUS_TONE, Select, Tooltip } from '../components/ui';
import { fmtDateTime, num } from '../lib/format';
import useMasterData from '../lib/useMasterData';
import suggestions from '../mocks/suggested_orders.json';

const STATUSES = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
const WORKFLOW_TIP = 'Status workflow planned Sprint 4 (FR-2.7)';

export function StatusPill({ status }) {
  return <Badge tone={PO_STATUS_TONE[status]} dot>{status}</Badge>;
}

function DisabledAction({ icon: Icon, label, tip = WORKFLOW_TIP }) {
  return (
    <Tooltip text={tip}>
      <Button size="sm" variant="ghost" icon={Icon} disabled aria-label={`${label} (${tip})`}>{label}</Button>
    </Tooltip>
  );
}

function SuggestedOrders({ onUse, canUse }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" /> Suggested orders (AI)</h2>
        <DataSourceBadge sprint={7} />
      </div>
      <ul className="divide-y divide-slate-100">
        {suggestions.suggestions.map((s) => (
          <li key={`${s.drug}-${s.branch}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{s.drug}</p>
              <p className="truncate text-xs text-slate-500">{s.branch} · {s.supplier}</p>
              <p className="mt-1 text-xs text-slate-500">
                Stock {s.current_stock} · ROP {s.reorder_point} · {s.avg_daily_demand}/day · lead {s.lead_time_days} d
                {s.confidence === 'LOW' && <Badge tone="amber" className="ml-2">Low confidence</Badge>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right"><p className="text-xs text-slate-400">Suggest</p><p className="text-sm font-semibold text-slate-800">{num(s.suggested_qty)}</p></div>
              <Button size="sm" variant="subtle" icon={Wand2} onClick={() => onUse(s)} disabled={!canUse(s)}>Use suggestion</Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">Reorder qty = max(0, d·(L+R) + SS − stock − on order). Formulas are live in Module 3; wiring to real stock is Sprint 7.</p>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { user, role } = useAuth();
  const isPharm = role === 'pharmacist';
  const md = useMasterData();
  const blank = { drug_id: '', branch_id: isPharm ? user.branch_id : '', supplier_id: '', quantity: '' };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlight, setHighlight] = useState(null);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/purchase-orders', { params: { page, limit, status: status || undefined } });
      setRows(data.items); setTotal(data.total);
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const idByName = (list, name) => list.find((x) => x.name === name)?.id || '';
  const canUse = (s) => !isPharm || idByName(md.branches, s.branch) === user.branch_id;

  const useSuggestion = (s) => {
    setForm({ drug_id: idByName(md.drugs, s.drug), branch_id: idByName(md.branches, s.branch), supplier_id: idByName(md.suppliers, s.supplier), quantity: String(s.suggested_qty) });
    setErrors({});
    toast('Form pre-filled from suggestion. Review and create.', { icon: '✨' });
    document.getElementById('po-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e) => {
    e.preventDefault();
    const fe = {};
    ['drug_id', 'branch_id', 'supplier_id'].forEach((k) => { if (!form[k]) fe[k] = 'Required'; });
    if (!(Number.isInteger(Number(form.quantity)) && Number(form.quantity) > 0)) fe.quantity = 'Enter a positive whole number';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/purchase-orders', { ...form, quantity: Number(form.quantity) });
      toast.success(`Order created for ${data.quantity} × ${data.drug_name} (Pending)`);
      setForm(blank); setHighlight(data.id); setStatus(''); setPage(1); load();
    } catch (err) { setErrors(getFieldErrors(err)); toast.error(getErrorMessage(err)); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Purchase orders" description="Raise orders to suppliers. New orders start as Pending." badge={<DataSourceBadge live />} />
      <div className="grid gap-5 xl:grid-cols-5">
        <form id="po-form" onSubmit={submit} noValidate className="card scroll-mt-24 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Plus className="h-4 w-4" /> Create order</h2>
            <DataSourceBadge live />
          </div>
          <div className="space-y-4">
            <FormField label="Drug" required error={errors.drug_id}><Select value={form.drug_id} onChange={set('drug_id')} placeholder="Select drug" options={md.drugOptions} error={errors.drug_id} /></FormField>
            <FormField label="Branch" required error={errors.branch_id} hint={isPharm ? 'Locked to your branch' : undefined}>
              <Select value={form.branch_id} onChange={set('branch_id')} placeholder="Select branch" options={md.branchOptions} disabled={isPharm} error={errors.branch_id} />
            </FormField>
            <FormField label="Supplier" required error={errors.supplier_id}><Select value={form.supplier_id} onChange={set('supplier_id')} placeholder="Select supplier" options={md.supplierOptions} error={errors.supplier_id} /></FormField>
            <FormField label="Quantity" required error={errors.quantity}><Input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} error={errors.quantity} /></FormField>
            <Button type="submit" className="w-full" loading={saving} icon={ShoppingCart}>Create order</Button>
          </div>
        </form>
        <div className="xl:col-span-3"><SuggestedOrders onUse={useSuggestion} canUse={canUse} /></div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Orders {isPharm && <span className="font-normal text-slate-400">· {user.branch_name}</span>}</h2>
          <Select className="h-9 w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: s }))} />
        </div>
        <DataTable loading={loading} rows={rows} pagination={{ page, limit, total, onPage: setPage }}
          rowClassName={(r) => (r.id === highlight ? 'bg-emerald-50/60' : '')}
          empty={<EmptyState icon={ShoppingCart} title="No orders" description="Create an order above." />}
          columns={[
            { key: 'created_at', header: 'Created', render: (r) => fmtDateTime(r.created_at) },
            { key: 'drug_name', header: 'Drug', render: (r) => <span className="font-medium text-slate-800">{r.drug_name}</span> },
            { key: 'branch_name', header: 'Branch' },
            { key: 'supplier_name', header: 'Supplier' },
            { key: 'quantity', header: 'Qty', align: 'right', render: (r) => num(r.quantity) },
            { key: 'status', header: 'Status', render: (r) => <StatusPill status={r.status} /> },
            { key: 'actions', header: 'Actions', render: () => (
              <div className="flex gap-1">
                <DisabledAction icon={CheckCircle2} label="Confirm" />
                <DisabledAction icon={PackageCheck} label="Mark delivered" />
                <DisabledAction icon={Ban} label="Cancel" />
              </div>
            ) },
          ]} />
      </div>
    </div>
  );
}
