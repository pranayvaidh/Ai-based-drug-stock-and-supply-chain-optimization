import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext';

export default function ForbiddenPage({ requiredRoles }) {
  const { role } = useAuth();
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50"><ShieldAlert className="h-7 w-7 text-red-500" /></div>
      <p className="text-sm font-semibold text-red-600">403 · Forbidden</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-slate-500">
        You are signed in as <span className="font-medium capitalize text-slate-700">{role}</span>.
        {requiredRoles && <> This page needs: <span className="font-medium capitalize text-slate-700">{requiredRoles.join(', ')}</span>.</>}
      </p>
      <Link to={homePathFor(role)} className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">Go to my home page</Link>
    </div>
  );
}
