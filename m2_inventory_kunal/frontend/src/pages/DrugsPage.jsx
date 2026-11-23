import { Pencil, Pill, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, getFieldErrors } from '@m1/api/client';
import { useAuth } from '@m1/context/AuthContext';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, Modal, PageHeader, Select } from '../components/ui';
import { inr } from '../lib/format';
import { invalidateMasterData } from '../lib/useMasterData';

const EMPTY = { name: '', category: '', unit: '', price: '', strength: '' };
const UNITS = ['strip of 10', 'strip of 4', 'strip of 3', 'bottle', 'sachet', 'vial', 'tube', 'box'];

export default function DrugsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {mode, data}
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const limit = 10;

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/drugs', { params: { page, limit, q: debouncedQ || undefined, category: category || undefined } });
      setRows(data.items);
      setTotal(data.total);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally { setLoading(false); }
  }, [page, debouncedQ, category]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/drugs/categories').then((r) => setCategories(r.data.items)).catch(() => {}); }, []);

  const open = (data) => { setErrors({}); setModal({ mode: data ? 'edit' : 'add', data: data ? { ...EMPTY, ...data, strength: data.strength || '' } : { ...EMPTY } }); };
  const setField = (k) => (e) => setModal((m) => ({ ...m, data: { ...m.data, [k]: e.target.value } }));

  const save = async () => {
    const d = modal.data;
    const fe = {};
    ['name', 'category', 'unit'].forEach((k) => { if (!String(d[k]).trim()) fe[k] = 'Required'; });
    if (d.price === '' || Number(d.price) < 0 || Number.isNaN(Number(d.price))) fe.price = 'Enter a price ≥ 0';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    const body = { name: d.name.trim(), category: d.category.trim(), unit: d.unit.trim(), price: Number(d.price), strength: d.strength.trim() || null };
    try {
      if (modal.mode === 'add') await api.post('/drugs', body);
      else await api.put(`/drugs/${d.id}`, body);
      toast.success(modal.mode === 'add' ? 'Drug added' : 'Drug updated');
      setModal(null);
      invalidateMasterData();
      load();
      api.get('/drugs/categories').then((r) => setCategories(r.data.items)).catch(() => {});
    } catch (e) {
      setErrors(getFieldErrors(e));
      toast.error(getErrorMessage(e));
    } finally { setSaving(false); }
  };

  const columns = [
    { key: 'name', header: 'Drug', render: (r) => <div><p className="font-medium text-slate-800">{r.name}</p>{r.strength && <p className="text-xs text-slate-400">{r.strength}</p>}</div> },
    { key: 'category', header: 'Category', render: (r) => <Badge tone="blue">{r.category}</Badge> },
    { key: 'unit', header: 'Unit' },
    { key: 'price', header: 'Price', align: 'right', render: (r) => inr(r.price) },
    ...(isAdmin ? [{ key: 'actions', header: '', align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => open(r)}>Edit</Button> }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Drugs"
        description={isAdmin ? 'Master list of medicines. Add or edit name, category, unit and price.' : 'Master list of medicines (read-only for pharmacists).'}
        badge={<DataSourceBadge live />}
        actions={isAdmin && <Button icon={Plus} onClick={() => open(null)}>Add drug</Button>}
      />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drugs by name…" className="pl-9" />
          </div>
          <Select className="sm:w-56" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} placeholder="All categories" options={categories.map((c) => ({ value: c, label: c }))} />
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} pagination={{ page, limit, total, onPage: setPage }}
          empty={<EmptyState icon={Pill} title="No drugs match" description="Try a different search or category." />} />
      </div>

      <Modal open={!!modal} title={modal?.mode === 'add' ? 'Add drug' : 'Edit drug'} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
        {modal && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name} className="sm:col-span-2"><Input value={modal.data.name} onChange={setField('name')} error={errors.name} placeholder="e.g. Paracetamol 500 mg" /></FormField>
            <FormField label="Category" required error={errors.category}>
              <Input list="drug-categories" value={modal.data.category} onChange={setField('category')} error={errors.category} placeholder="e.g. Analgesic" />
              <datalist id="drug-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </FormField>
            <FormField label="Unit" required error={errors.unit}>
              <Input list="drug-units" value={modal.data.unit} onChange={setField('unit')} error={errors.unit} placeholder="e.g. strip of 10" />
              <datalist id="drug-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            </FormField>
            <FormField label="Price (₹)" required error={errors.price}><Input type="number" min="0" step="0.01" value={modal.data.price} onChange={setField('price')} error={errors.price} /></FormField>
            <FormField label="Strength" hint="Optional"><Input value={modal.data.strength} onChange={setField('strength')} placeholder="e.g. 500 mg" /></FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
