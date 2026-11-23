import clsx from 'clsx';
import { ArrowRight, CheckCircle2, FileUp, Receipt, UploadCloud, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { getErrorCode, getErrorMessage, getFieldErrors } from '@m1/api/client';
import { useAuth } from '@m1/context/AuthContext';
import { Badge, Button, DataSourceBadge, DataTable, EmptyState, FormField, Input, PageHeader, Select } from '../components/ui';
import { fmtDate, num, todayISO } from '../lib/format';
import useMasterData from '../lib/useMasterData';

function RecordSale({ onRecorded }) {
  const { user, role } = useAuth();
  const isPharm = role === 'pharmacist';
  const md = useMasterData();
  const [form, setForm] = useState({ drug_id: '', branch_id: isPharm ? user.branch_id : '', quantity: '', sale_date: todayISO() });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(null);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const refreshAvailable = useCallback(async (drug, branch) => {
    if (!drug || !branch) { setAvailable(null); return; }
    try {
      const { data } = await api.get('/stock', { params: { group: 'batches', drug_id: drug, branch_id: branch, limit: 100 } });
      const usable = data.items.filter((b) => b.days_to_expiry >= 0);
      setAvailable({ total: usable.reduce((s, b) => s + b.quantity, 0), batches: usable });
    } catch { setAvailable(null); }
  }, []);

  useEffect(() => { refreshAvailable(form.drug_id, form.branch_id); }, [form.drug_id, form.branch_id, refreshAvailable]);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const submit = async (e) => {
    e.preventDefault();
    const fe = {};
    if (!form.drug_id) fe.drug_id = 'Select a drug';
    if (!form.branch_id) fe.branch_id = 'Select a branch';
    if (!(Number.isInteger(Number(form.quantity)) && Number(form.quantity) > 0)) fe.quantity = 'Enter a positive whole number';
    if (form.sale_date > todayISO()) fe.sale_date = 'Sale date cannot be in the future';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    setFailure(null);
    try {
      const { data } = await api.post('/sales', { ...form, quantity: Number(form.quantity) });
      setResult(data);
      toast.success(`Sale recorded: ${data.quantity} × ${data.drug_name}`);
      setForm((f) => ({ ...f, quantity: '' }));
      refreshAvailable(form.drug_id, form.branch_id);
      onRecorded?.();
    } catch (err) {
      setResult(null);
      if (getErrorCode(err) === 'INSUFFICIENT_STOCK') {
        setFailure(err.response.data.error);
        refreshAvailable(form.drug_id, form.branch_id);
      } else {
        setErrors(getFieldErrors(err));
        toast.error(getErrorMessage(err));
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-5">
      <form onSubmit={submit} className="card p-5 xl:col-span-2" noValidate>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><Receipt className="h-4 w-4" /> Record a sale</h2>
        <div className="space-y-4">
          <FormField label="Drug" required error={errors.drug_id}><Select value={form.drug_id} onChange={set('drug_id')} placeholder="Select drug" options={md.drugOptions} error={errors.drug_id} /></FormField>
          <FormField label="Branch" required error={errors.branch_id} hint={isPharm ? 'Locked to your branch' : 'Admin can record for any pharmacy (demo)'}>
            <Select value={form.branch_id} onChange={set('branch_id')} placeholder="Select branch" options={md.pharmacyOptions} disabled={isPharm} error={errors.branch_id} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantity" required error={errors.quantity}><Input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} error={errors.quantity} /></FormField>
            <FormField label="Sale date" required error={errors.sale_date}><Input type="date" max={todayISO()} value={form.sale_date} onChange={set('sale_date')} error={errors.sale_date} /></FormField>
          </div>
          {available && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Available (non-expired): <span className="font-semibold text-slate-800">{num(available.total)}</span> units in {available.batches.length} batch{available.batches.length === 1 ? '' : 'es'}
            </div>
          )}
          <Button type="submit" className="w-full" loading={busy}>Record sale</Button>
        </div>
      </form>

      <div className="card p-5 xl:col-span-3">
        <h2 className="mb-1 text-sm font-semibold text-slate-700">FEFO breakdown</h2>
        <p className="mb-4 text-xs text-slate-500">Stock is taken from the batch that expires first. Expired batches are never sold.</p>
        {failure ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-red-700"><XCircle className="h-4 w-4" /> Sale rejected: insufficient stock</p>
            <p className="mt-1 text-sm text-red-700">Requested {num(failure.details?.requested)}, only {num(failure.details?.available)} available. <span className="font-medium">No stock was changed.</span></p>
          </div>
        ) : result ? (
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {result.quantity} × {result.drug_name} at {result.branch_name} on {fmtDate(result.sale_date)}</p>
            <ol className="space-y-2">
              {result.batches_used.map((b, i) => (
                <li key={b.batch_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                  <span className="font-mono text-xs text-slate-700">{b.batch_no}</span>
                  <span className="text-xs text-slate-500">expires {fmtDate(b.expiry_date)}</span>
                  <span className="flex-1" />
                  <Badge tone="blue">took {b.taken}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <Badge tone={b.remaining === 0 ? 'slate' : 'green'}>{b.remaining} left</Badge>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <EmptyState icon={Receipt} title="No sale recorded yet" description="Record a sale larger than the earliest batch to see FEFO split it across batches." />
        )}
      </div>
    </div>
  );
}

function CsvUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const pick = (f) => {
    setResult(null); setError('');
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) { setError('Only .csv files are accepted'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('File is larger than 5 MB'); return; }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/sales/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
      setResult(data);
      toast.success(`${data.saved} rows saved`);
      onUploaded?.();
    } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileUp className="h-4 w-4" /> Upload sales history (CSV)</h2>
          <p className="mt-1 text-xs text-slate-500">Columns: <code className="rounded bg-slate-100 px-1">date,drug_name,branch_name,quantity</code>. Saved rows are <b>historical training data</b> for forecasting and do not reduce current stock.</p>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={clsx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition',
          drag ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-300 hover:bg-slate-50')}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">{file ? file.name : 'Drag & drop a CSV here, or click to browse'}</p>
        <p className="mt-1 text-xs text-slate-400">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Max 5 MB'}</p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex justify-end gap-2">
        {file && <Button variant="ghost" onClick={() => { setFile(null); setResult(null); }}>Clear</Button>}
        <Button icon={UploadCloud} disabled={!file} loading={busy} onClick={upload}>Upload</Button>
      </div>

      {result && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Rows in file</p><p className="text-xl font-semibold text-slate-800">{num(result.total_rows)}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Saved</p><p className="text-xl font-semibold text-emerald-700">{num(result.saved)}</p></div>
            <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-700">Rejected</p><p className="text-xl font-semibold text-red-700">{num(result.rejected.length)}</p></div>
          </div>
          {result.rejected.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">Rejected rows</p>
              <div className="max-h-80 overflow-y-auto">
                <DataTable dense rowKey="row_number" rows={result.rejected} columns={[
                  { key: 'row_number', header: 'Line', align: 'right' },
                  { key: 'date', header: 'Date', render: (r) => r.row.date || '—' },
                  { key: 'drug', header: 'Drug', render: (r) => r.row.drug_name || r.row.drug_id || '—' },
                  { key: 'branch', header: 'Branch', render: (r) => r.row.branch_name || r.row.branch_id || '—' },
                  { key: 'qty', header: 'Qty', render: (r) => r.row.quantity || '—' },
                  { key: 'reason', header: 'Reason', render: (r) => <span className="text-red-600">{r.reason}</span> },
                ]} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecentSales({ refreshKey }) {
  const { user, role } = useAuth();
  const md = useMasterData();
  const [branch, setBranch] = useState(role === 'pharmacist' ? user.branch_id : '');
  const [source, setSource] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/sales', { params: { page, limit, branch_id: branch || undefined, source: source || undefined } })
      .then(({ data }) => { if (alive) { setRows(data.items); setTotal(data.total); } })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [page, branch, source, refreshKey]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Recent sales</h2>
        <div className="flex flex-wrap gap-2">
          <Select className="h-9 w-52" value={branch} onChange={(e) => { setBranch(e.target.value); setPage(1); }} placeholder="All branches" options={md.pharmacyOptions} />
          <Select className="h-9 w-36" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} placeholder="All sources" options={[{ value: 'manual', label: 'Manual' }, { value: 'csv', label: 'CSV history' }]} />
        </div>
      </div>
      <DataTable loading={loading} rows={rows} pagination={{ page, limit, total, onPage: setPage }}
        empty={<EmptyState icon={Receipt} title="No sales yet" description="Record a sale or upload a CSV of sales history." />}
        columns={[
          { key: 'sale_date', header: 'Date', render: (r) => fmtDate(r.sale_date) },
          { key: 'drug_name', header: 'Drug', render: (r) => <span className="font-medium text-slate-800">{r.drug_name}</span> },
          { key: 'branch_name', header: 'Branch' },
          { key: 'quantity', header: 'Qty', align: 'right', render: (r) => num(r.quantity) },
          { key: 'source', header: 'Source', render: (r) => <Badge tone={r.source === 'manual' ? 'blue' : 'purple'}>{r.source === 'manual' ? 'Manual' : 'CSV history'}</Badge> },
        ]} />
    </div>
  );
}

export default function SalesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);
  return (
    <div className="space-y-5">
      <PageHeader title="Sales" description="Record sales (FEFO stock reduction) and upload historical sales for forecasting." badge={<DataSourceBadge live />} />
      <RecordSale onRecorded={bump} />
      <div className="grid gap-5 xl:grid-cols-2">
        <CsvUpload onUploaded={bump} />
        <RecentSales refreshKey={refreshKey} />
      </div>
    </div>
  );
}
