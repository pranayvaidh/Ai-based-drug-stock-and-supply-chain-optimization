import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navFor } from './navConfig';

function Brand({ collapsed }) {
  return (
    <div className="flex h-16 items-center gap-2.5 px-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white shadow-sm">+</div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">MedStock AI</p>
          <p className="truncate text-[11px] text-slate-400">Drug supply chain</p>
        </div>
      )}
    </div>
  );
}

function NavItems({ role, collapsed, onNavigate }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2">
      {navFor(role).map((section) => (
        <div key={section.title}>
          {!collapsed && <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => clsx(
                    'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    collapsed && 'justify-center',
                  )}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && (
                    <span title={item.live ? 'Live API' : 'Sample data'} className={clsx('h-1.5 w-1.5 rounded-full', item.live ? 'bg-emerald-400' : 'bg-slate-500')} />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Legend({ collapsed }) {
  if (collapsed) return null;
  return (
    <div className="border-t border-white/5 px-5 py-3 text-[11px] text-slate-400">
      <span className="mr-3 inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Live</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-500" />Sample data</span>
    </div>
  );
}

/** Collapsible on desktop (≥1024px); off-canvas drawer below that. */
export default function Sidebar({ role, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  return (
    <>
      <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden flex-col bg-slate-900 transition-[width] duration-200 lg:flex', collapsed ? 'w-[72px]' : 'w-64')}>
        <Brand collapsed={collapsed} />
        <NavItems role={role} collapsed={collapsed} />
        <Legend collapsed={collapsed} />
        <button onClick={onToggleCollapsed} className="flex h-11 items-center justify-center border-t border-white/5 text-slate-400 hover:text-white" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className={clsx('fixed inset-0 z-40 lg:hidden', mobileOpen ? '' : 'pointer-events-none')}>
        <div className={clsx('absolute inset-0 bg-slate-900/50 transition-opacity', mobileOpen ? 'opacity-100' : 'opacity-0')} onClick={onCloseMobile} />
        <aside className={clsx('absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 shadow-xl transition-transform duration-200', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
          <div className="flex items-center justify-between pr-3">
            <Brand />
            <button onClick={onCloseMobile} className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
          <NavItems role={role} onNavigate={onCloseMobile} />
          <Legend />
        </aside>
      </div>
    </>
  );
}
