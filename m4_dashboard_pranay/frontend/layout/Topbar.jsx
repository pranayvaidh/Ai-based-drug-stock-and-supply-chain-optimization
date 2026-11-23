import { LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@m1/context/AuthContext';
import { titleFor } from './navConfig';

const ROLE_CHIP = {
  admin: 'bg-violet-100 text-violet-700',
  pharmacist: 'bg-blue-100 text-blue-700',
  supplier: 'bg-emerald-100 text-emerald-700',
};

export default function Topbar({ onOpenMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const sub = user?.branch_name || user?.supplier_name;

  const doLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button onClick={onOpenMobile} className="-ml-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-500">{titleFor(pathname)}</p>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="max-w-[200px] truncate text-sm font-medium text-slate-800">{user?.name}</p>
          {sub && <p className="max-w-[200px] truncate text-[11px] text-slate-500">{sub}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${ROLE_CHIP[user?.role] || 'bg-slate-100 text-slate-600'}`}>{user?.role}</span>
        <button onClick={doLogout} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50" title="Log out">
          <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
