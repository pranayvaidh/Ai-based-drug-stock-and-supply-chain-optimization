import clsx from 'clsx';

const TONES = {
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
};

export default function KpiCard({ label, value, icon: Icon, tone = 'blue', hint, loading }) {
  return (
    <div className="card flex items-start gap-4 p-4">
      <div className={clsx('rounded-xl p-2.5', TONES[tone])}>{Icon && <Icon className="h-5 w-5" />}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        {loading ? <div className="skeleton mt-2 h-7 w-12" /> : <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>}
        {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}
