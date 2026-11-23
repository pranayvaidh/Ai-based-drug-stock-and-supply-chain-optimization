import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@m1/context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const KEY = 'dsc_sidebar_collapsed';

export default function AppLayout() {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const toggle = () => setCollapsed((c) => {
    try { localStorage.setItem(KEY, c ? '0' : '1'); } catch { /* ignore */ }
    return !c;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} collapsed={collapsed} onToggleCollapsed={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={clsx('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
