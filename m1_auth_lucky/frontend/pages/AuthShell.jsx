import { Activity, ShieldCheck, TrendingUp } from 'lucide-react';

/** Two-column layout shared by the login and register pages. */
export default function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-slate-900 p-10 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><span className="text-lg font-bold">+</span></div>
          <div><p className="text-sm font-semibold">MedStock AI</p><p className="text-[11px] text-brand-200">SKIT Jaipur · 2026-27-AIML-28</p></div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight">Drug stock &amp; supply chain,<br />forecast-driven.</h2>
          <p className="mt-3 max-w-sm text-sm text-brand-100">Track batches with first-expiry-first-out, raise purchase orders, and plan stock from demand forecasts.</p>
          <ul className="mt-8 space-y-3 text-sm text-brand-50">
            <li className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-brand-200" /> Role-based access for admins, pharmacists, suppliers</li>
            <li className="flex items-center gap-3"><Activity className="h-4 w-4 text-brand-200" /> FEFO stock reduction on every sale</li>
            <li className="flex items-center gap-3"><TrendingUp className="h-4 w-4 text-brand-200" /> Prophet + regression demand forecasting</li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">Academic project demo. All names and data are fictional.</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
