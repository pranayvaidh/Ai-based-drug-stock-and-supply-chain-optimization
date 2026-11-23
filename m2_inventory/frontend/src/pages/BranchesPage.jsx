import { Building2, Pencil, Plus, Store, Warehouse } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorMessage, getFieldErrors } from '@m1/api/client';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, Modal, PageHeader, Select } from '../components/ui';
import { invalidateMasterData } from '../lib/useMasterData';

const TYPES = [{ value: 'pharmacy', label: 'Pharmacy' }, { value: 'warehouse', label: 'Warehouse' }];

export default function BranchesPage() {
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
      const { data } = await api.get('/branches', { params: { page, limit } });
      setRows(data.items); setTotal(data.total);
    } catch (e) { toast.error(getErrorMessage(e)); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const open = (r) => { setErrors({}); setModal({ mode: r ? 'edit' : 'add', data: r ? { ...r } : { name: '', type: 'pharmacy', location: '' } }); };
  const set = (k) => (e) => setModal((m) => ({ ...m, data: { ...m.data, [k]: e.target.value } }));

  const save = async () => {
    const d = modal.data;
    const fe = {};
    if (String(d.name).trim().length < 2) fe.name = 'Name must be at least 2 characters';
    if (!String(d.location).trim()) fe.location = 'Required';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setSaving(true);
    const body = { name: d.name.trim(), type: d.type, location: d.location.trim() };
    try {
      if (modal.mode === 'add') await api.post('/branches', body); else await api.put(`/branches/${d.id}`, body);
      toast.success(modal.mode === 'add' ? 'Branch added' : 'Branch updated');
      setModal(null); invalidateMasterData(); load();
    } catch (e) { setErrors(getFieldErrors(e)); toast.error(getErrorMessage(e)); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Branches & warehouses" description="Pharmacy branches and the central warehouse." badge={<DataSourceBadge live />}
        actions={<Button icon={Plus} onClick={() => open(null)}>Add branch</Button>} />
      <div className="card">
        <DataTable loading={loading} rows={rows} pagination={{ page, limit, total, onPage: setPage }}
          empty={<EmptyState icon={Building2} title="No branches yet" />}
          columns={[
            { key: 'name', header: 'Name', render: (r) => (
              <span className="flex items-center gap-2 font-medium text-slate-800">
                {r.type === 'warehouse' ? <Warehouse className="h-4 w-4 text-slate-400" /> : <Store className="h-4 w-4 text-slate-400" />}{r.name}
              </span>) },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'warehouse' ? 'purple' : 'blue'} className="capitalize">{r.type}</Badge> },
            { key: 'location', header: 'Location', className: 'text-slate-500' },
            { key: 'a', header: '', align: 'right', render: (r) => <Button size="sm" variant="ghost" icon={Pencil} onClick={() => open(r)}>Edit</Button> },
          ]} />
      </div>
      <Modal open={!!modal} title={modal?.mode === 'add' ? 'Add branch' : 'Edit branch'} onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></>}>
        {modal && (
          <div className="space-y-4">
            <FormField label="Name" required error={errors.name}><Input value={modal.data.name} onChange={set('name')} error={errors.name} /></FormField>
            <FormField label="Type" required error={errors.type}><Select value={modal.data.type} onChange={set('type')} options={TYPES} /></FormField>
            <FormField label="Location" required error={errors.location}><Input value={modal.data.location} onChange={set('location')} error={errors.location} /></FormField>
          </div>
        )}
      </Modal>
    </div>
  );
}
