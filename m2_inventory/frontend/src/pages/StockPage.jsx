import { Boxes, Layers, Plus, Rows3 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, getFieldErrors } from '@m1/api/client';
import { useAuth } from '@m1/context/AuthContext';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, Modal, PageHeader, Select } from '../components/ui';
import { addDaysISO, fmtDate, num } from '../lib/format';
import useMasterData from '../lib/useMasterData';

/** Plain display of days until expiry. Risk scoring (FR-3.6) comes from Module 3 later. */
export function DaysToExpiry({ days }) {
  if (days == null) return '—';
  if (days < 0) return <Badge tone="slate">Expired {Math.abs(days)} d ago</Badge>;
  return <Badge tone="slate">{days} day{days === 1 ? '' : 's'}</Badge>;
}

export default function StockPage() {
  const { user, role } = useAuth();
  const isPharm = role === 'pharmacist';
  const md = useMasterData();
  const [view, setView] = useState('batches');
  const [filters, setFilters] = useState({ drug_id: '', branch_id: isPharm ? user.branch_id : '' });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/stock', { params: { page, limit, group: view, drug_id: filters.drug_id || undefined, branch_id: filters.branch_id || undefined } });
      setRows(data.items);
      setTotal(data.total);
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  }, [page, view, filters]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setErrors({});
    setForm({ drug_id: filters.drug_id || '', branch_id: isPharm ? user.branch_id : (filters.branch_id || ''), supplier_id: '', batch_no: '', quantity: '', expiry_date: addDaysISO(365) });
    setOpen(true);
  };
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const save = async () => {
    const fe = {};
    ['drug_id', 'branch_id', 'supplier_id', 'batch_no'].forEach((k) => { if (!form[k]) fe[k] = 'Required'; });
    if (!(Number.isInteger(Number(form.quantity)) && Number(form.quantity) > 0)) fe.quantity = 'Enter a positive whole number';
    if (!form.expiry_date || form.expiry_date <= addDaysISO(0)) fe.expiry_date = 'Expiry must be in the future';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    try {
      const { data } = await api.post('/stock', { ...form, quantity: Number(form.quantity), batch_no: form.batch_no.trim() });
      toast.success(`Batch ${data.batch_no} added (${data.quantity} units)`);
      setOpen(false);
      setView('batches');
      setFilters((f) => ({ ...f, drug_id: data.drug_id }));
      setPage(1);
    } catch (e) {
      setErrors(getFieldErrors(e));
      toast.error(getErrorMessage(e));
    } finally { setSaving(false); }
  };

  const batchCols = [
    { key: 'drug_name', header: 'Drug', render: (r) => <span className="font-medium text-slate-800">{r.drug_name}</span> },
    { key: 'branch_name', header: 'Branch' },
    { key: 'batch_no', header: 'Batch no', render: (r) => <span className="font-mono text-xs">{r.batch_no}</span> },
    { key: 'quantity', header: 'Qty', align: 'right', render: (r) => num(r.quantity) },
    { key: 'expiry_date', header: 'Expiry date', render: (r) => fmtDate(r.expiry_date) },
    { key: 'days_to_expiry', header: 'Days to expiry', render: (r) => <DaysToExpiry days={r.days_to_expiry} /> },
    { key: 'supplier_name', header: 'Supplier' },
  ];
  const totalCols = [
    { key: 'drug_name', header: 'Drug', render: (r) => <span className="font-medium text-slate-800">{r.drug_name}</span> },
    { key: 'branch_name', header: 'Branch' },
    { key: 'total_quantity', header: 'Total qty', align: 'right', render: (r) => <span className="font-semibold">{num(r.total_quantity)}</span> },
    { key: 'batch_count', header: 'Batches', align: 'right' },
    { key: 'nearest_expiry', header: 'Nearest expiry', render: (r) => fmtDate(r.nearest_expiry) },
    { key: 'days', header: 'Days to nearest', render: (r) => <DaysToExpiry days={r.days_to_nearest_expiry} /> },
  ];

  return (
    <div>
      <PageHeader title="Stock" description="Batches per branch with expiry dates. Sales reduce stock earliest-expiry-first (FEFO)."
        badge={<DataSourceBadge live />} actions={<Button icon={Plus} onClick={openAdd}>Add batch</Button>} />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 lg:flex-row lg:items-center">
          <Select className="lg:w-64" value={filters.drug_id} onChange={(e) => { setFilters({ ...filters, drug_id: e.target.value }); setPage(1); }} placeholder="All drugs" options={md.drugOptions} />
          <Select className="lg:w-64" value={filters.branch_id} onChange={(e) => { setFilters({ ...filters, branch_id: e.target.value }); setPage(1); }} placeholder="All branches" options={md.branchOptions} />
          <div className="flex-1" />
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-sm" role="tablist">
            {[{ v: 'batches', l: 'Batches', i: Rows3 }, { v: 'totals', l: 'Per-drug totals', i: Layers }].map(({ v, l, i: I }) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => { setView(v); setPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium ${view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <I className="h-4 w-4" />{l}
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={view === 'batches' ? batchCols : totalCols} rows={rows} loading={loading} rowKey={view === 'batches' ? 'id' : 'drug_id'}
          pagination={{ page, limit, total, onPage: setPage }}
          empty={<EmptyState icon={Boxes} title="No stock found" description="Change the filters or add a batch." />} />
      </div>

      <Modal open={open} title="Add stock batch" onClose={() => setOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={save}>Add batch</Button></>}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Drug" required error={errors.drug_id} className="sm:col-span-2"><Select value={form.drug_id} onChange={set('drug_id')} placeholder="Select drug" options={md.drugOptions} error={errors.drug_id} /></FormField>
            <FormField label="Branch" required error={errors.branch_id} hint={isPharm ? 'Locked to your branch' : undefined}>
              <Select value={form.branch_id} onChange={set('branch_id')} placeholder="Select branch" options={md.branchOptions} error={errors.branch_id} disabled={isPharm} />
            </FormField>
            <FormField label="Supplier" required error={errors.supplier_id}><Select value={form.supplier_id} onChange={set('supplier_id')} placeholder="Select supplier" options={md.supplierOptions} error={errors.supplier_id} /></FormField>
            <FormField label="Batch number" required error={errors.batch_no}><Input value={form.batch_no} onChange={set('batch_no')} error={errors.batch_no} placeholder="e.g. PCM-2611-A" /></FormField>
            <FormField label="Quantity" required error={errors.quantity}><Input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} error={errors.quantity} /></FormField>
            <FormField label="Expiry date" required error={errors.expiry_date} className="sm:col-span-2"><Input type="date" min={addDaysISO(1)} value={form.expiry_date} onChange={set('expiry_date')} error={errors.expiry_date} /></FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
