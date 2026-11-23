import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { homePathFor, useAuth } from '@m1/context/AuthContext';

export default function NotFoundPage() {
  const { role } = useAuth();
  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100"><Compass className="h-7 w-7 text-slate-500" /></div>
      <p className="text-sm font-semibold text-slate-500">404</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to={homePathFor(role)} className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">Back to home</Link>
    </div>
  );
}
