import { Pencil, Plus, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, getFieldErrors } from '@m1/api/client';
import { Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, Modal, PageHeader } from '../components/ui';
import { invalidateMasterData } from '../lib/useMasterData';

export default function SuppliersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const limit = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers', { params: { page, limit } });
      setRows(data.items); setTotal(data.total);
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const open = (r) => { setErrors({}); setModal({ mode: r ? 'edit' : 'add', data: r ? { ...r } : { name: '', contact: '', avg_lead_time_days: '' } }); };
  const set = (k) => (e) => setModal((m) => ({ ...m, data: { ...m.data, [k]: e.target.value } }));

  const save = async () => {
    const d = modal.data;
    const fe = {};
    if (String(d.name).trim().length < 2) fe.name = 'Name must be at least 2 characters';
    if (!String(d.contact).trim()) fe.contact = 'Required';
    if (!(Number.isInteger(Number(d.avg_lead_time_days)) && Number(d.avg_lead_time_days) > 0)) fe.avg_lead_time_days = 'Whole number of days > 0';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    const body = { name: d.name.trim(), contact: d.contact.trim(), avg_lead_time_days: Number(d.avg_lead_time_days) };
    try {
      if (modal.mode === 'add') await api.post('/suppliers', body); else await api.put(`/suppliers/${d.id}`, body);
      toast.success(modal.mode === 'add' ? 'Supplier added' : 'Supplier updated');
      setModal(null); invalidateMasterData(); load();
    } catch (e) { setErrors(getFieldErrors(e)); toast.error(getErrorMessage(e)); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Suppliers" description="Supplier companies and their average lead time (used for reorder points)." badge={<DataSourceBadge live />}
        actions={<Button icon={Plus} onClick={() => open(null)}>Add supplier</Button>} />
      <div className="card">
        <DataTable loading={loading} rows={rows} pagination={{ page, limit, total, onPage: setPage }}
          empty={<EmptyState icon={Truck} title="No suppliers yet" />}
          columns={[
            { key: 'name', header: 'Supplier', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
            { key: 'contact', header: 'Contact', className: 'text-slate-500' },
            { key: 'avg_lead_time_days', header: 'Avg lead time', align: 'right', render: (r) => `${r.avg_lead_time_days} days` },
            { key: 'a', header: '', align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => open(r)}>Edit</Button> },
          ]} />
      </div>
      <Modal open={!!modal} title={modal?.mode === 'add' ? 'Add supplier' : 'Edit supplier'} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
        {modal && (
          <div className="space-y-4">
            <FormField label="Name" required error={errors.name}><Input value={modal.data.name} onChange={set('name')} error={errors.name} /></FormField>
            <FormField label="Contact" required error={errors.contact} hint="Email and/or phone"><Input value={modal.data.contact} onChange={set('contact')} error={errors.contact} /></FormField>
            <FormField label="Average lead time (days)" required error={errors.avg_lead_time_days}><Input type="number" min="1" step="1" value={modal.data.avg_lead_time_days} onChange={set('avg_lead_time_days')} error={errors.avg_lead_time_days} /></FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
