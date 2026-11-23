import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, DataSourceBadge, FormField, Input, Select } from '@m2/components/ui';
import api, { getErrorMessage, getFieldErrors } from '../api/client';
import AuthShell from './AuthShell';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'admin', label: 'Admin' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'pharmacist', branch_id: '', supplier_id: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    // Public, names-only endpoints owned by Module 2.
    api.get('/branches/public', { params: { type: 'pharmacy' } }).then((r) => setBranches(r.data.items)).catch(() => {});
    api.get('/suppliers/public').then((r) => setSuppliers(r.data.items)).catch(() => {});
  }, []);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    if (form.role === 'pharmacist' && !form.branch_id) e.branch_id = 'Select your branch';
    if (form.role === 'supplier' && !form.supplier_id) e.supplier_id = 'Select your supplier company';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const body = { name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role };
      if (form.role === 'pharmacist') body.branch_id = form.branch_id;
      if (form.role === 'supplier') body.supplier_id = form.supplier_id;
      await api.post('/auth/register', body);
      toast.success('Account created. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Registration failed'));
      setErrors(getFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create an account</h1><DataSourceBadge live /></div>
      <p className="mt-1 text-sm text-slate-500">Choose your role. Pharmacists pick their branch; suppliers pick their company.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</div>}
        <FormField label="Full name" htmlFor="name" error={errors.name} required>
          <Input id="name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <Input id="email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters" required>
            <Input id="password" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
          </FormField>
          <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm} required>
            <Input id="confirm" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
          </FormField>
        </div>
        <FormField label="Role" htmlFor="role" error={errors.role} required>
          <Select id="role" value={form.role} onChange={set('role')} options={ROLES} error={errors.role} />
        </FormField>
        {form.role === 'pharmacist' && (
          <FormField label="Branch" htmlFor="branch" error={errors.branch_id} required>
            <Select id="branch" value={form.branch_id} onChange={set('branch_id')} placeholder="Select a pharmacy branch" options={branches.map((b) => ({ value: b.id, label: b.name }))} error={errors.branch_id} />
          </FormField>
        )}
        {form.role === 'supplier' && (
          <FormField label="Supplier company" htmlFor="supplier" error={errors.supplier_id} required>
            <Select id="supplier" value={form.supplier_id} onChange={set('supplier_id')} placeholder="Select a supplier" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} error={errors.supplier_id} />
          </FormField>
        )}
        <Button type="submit" className="w-full" size="lg" loading={busy} icon={UserPlus}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered? <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
      </p>
    </AuthShell>
  );
}
