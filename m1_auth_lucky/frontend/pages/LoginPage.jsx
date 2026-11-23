import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, DataSourceBadge, FormField, Input } from '@m2/components/ui';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { homePathFor, useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';

const DEMO = [
  { label: 'Admin', email: 'admin@demo.com', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { label: 'Pharmacist', email: 'pharmacist@demo.com', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { label: 'Pharmacist 2', email: 'pharmacist2@demo.com', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  { label: 'Supplier', email: 'supplier@demo.com', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  { label: 'Supplier 2', email: 'supplier2@demo.com', tone: 'bg-teal-50 text-teal-700 ring-teal-200' },
];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (isAuthenticated) return <Navigate to={homePathFor(role)} replace />;

  const validate = () => {
    const e = {};
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome, ${user.name}`);
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : homePathFor(user.role), { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Login failed'));
      setErrors(getFieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })); };

  return (
    <AuthShell>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1><DataSourceBadge live /></div>
      <p className="mt-1 text-sm text-slate-500">Use your work account to continue.</p>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {formError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{formError}</div>}
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="username" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} className="pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={busy} icon={LogIn}>Sign in</Button>
      </form>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <p className="text-xs font-medium text-slate-600">Demo accounts <span className="font-normal text-slate-400">· password Demo@1234</span></p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button key={d.email} type="button" onClick={() => { setForm({ email: d.email, password: 'Demo@1234' }); setErrors({}); setFormError(''); }}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:brightness-95 ${d.tone}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here? <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">Create an account</Link>
      </p>
    </AuthShell>
  );
}
