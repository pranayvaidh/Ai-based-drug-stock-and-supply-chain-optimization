import { KeyRound, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, CardSkeleton, DataSourceBadge, FormField, Input, PageHeader } from '@m2/components/ui';
import api, { decodeJwt, getErrorMessage, getFieldErrors } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ROLE_TONE = { admin: 'purple', pharmacist: 'blue', supplier: 'green' };

export default function ProfilePage() {
  const { updateUser, token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api.get('/users/me').then((r) => { setProfile(r.data.user); setName(r.data.user.name); })
      .catch((e) => toast.error(getErrorMessage(e)));
  }, []);

  const saveName = async (e) => {
    e.preventDefault();
    setBusy('name');
    try {
      const { data } = await api.put('/users/me', { name });
      setProfile(data.user);
      updateUser(data.user);
      setErrors({});
      toast.success('Profile updated');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally { setBusy(''); }
  };

  const savePw = async (e) => {
    e.preventDefault();
    const fe = {};
    if (pw.new_password.length < 8) fe.new_password = 'Password must be at least 8 characters';
    if (pw.confirm !== pw.new_password) fe.confirm = 'Passwords do not match';
    if (!pw.current_password) fe.current_password = 'Enter your current password';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy('pw');
    try {
      await api.put('/users/me', { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    } finally { setBusy(''); }
  };

  const claims = token ? decodeJwt(token) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="My profile" description="View and edit your account. Email and role are managed by an admin." badge={<DataSourceBadge live />} />
      {!profile ? <CardSkeleton rows={5} /> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">{profile.name?.[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{profile.name}</p>
                <p className="truncate text-sm text-slate-500">{profile.email}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Role</dt><dd><Badge tone={ROLE_TONE[profile.role]} className="capitalize">{profile.role}</Badge></dd></div>
              {profile.branch_name && <div className="flex justify-between gap-2"><dt className="text-slate-500">Branch</dt><dd className="text-right font-medium text-slate-700">{profile.branch_name}</dd></div>}
              {profile.supplier_name && <div className="flex justify-between gap-2"><dt className="text-slate-500">Supplier</dt><dd className="text-right font-medium text-slate-700">{profile.supplier_name}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Member since</dt><dd className="text-slate-700">{profile.created_at?.slice(0, 10)}</dd></div>
              {claims && <div className="flex justify-between gap-2"><dt className="text-slate-500">Session expires</dt><dd className="text-slate-700">{new Date(claims.exp * 1000).toLocaleTimeString()}</dd></div>}
            </dl>
          </div>
          <div className="space-y-5 lg:col-span-3">
            <form onSubmit={saveName} className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><UserRound className="h-4 w-4" /> Personal details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name" htmlFor="pname" error={errors.name}><Input id="pname" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} /></FormField>
                <FormField label="Email" hint="Cannot be changed here"><Input value={profile.email} disabled /></FormField>
              </div>
              <div className="mt-4 flex justify-end"><Button type="submit" icon={Save} loading={busy === 'name'} disabled={name.trim() === profile.name}>Save changes</Button></div>
            </form>
            <form onSubmit={savePw} className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><KeyRound className="h-4 w-4" /> Change password</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Current password" error={errors.current_password}><Input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} error={errors.current_password} autoComplete="current-password" /></FormField>
                <FormField label="New password" error={errors.new_password}><Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} error={errors.new_password} autoComplete="new-password" /></FormField>
                <FormField label="Confirm" error={errors.confirm}><Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={errors.confirm} autoComplete="new-password" /></FormField>
              </div>
              <div className="mt-4 flex justify-end"><Button type="submit" variant="secondary" loading={busy === 'pw'}>Update password</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
