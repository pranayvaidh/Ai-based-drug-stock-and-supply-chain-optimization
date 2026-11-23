/** SRS §5.1.2 colour convention, reused on every M4 screen. */
export const STATUS = {
  STOCKOUT_RISK: { label: 'Stockout risk', cell: 'bg-red-500 text-white', dot: 'bg-red-500', text: 'text-red-700', soft: 'bg-red-50' },
  OVERSTOCK: { label: 'Overstock', cell: 'bg-amber-400 text-amber-950', dot: 'bg-amber-400', text: 'text-amber-700', soft: 'bg-amber-50' },
  HEALTHY: { label: 'Healthy', cell: 'bg-emerald-500 text-white', dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  NO_DATA: { label: 'No data', cell: 'bg-slate-300 text-slate-700', dot: 'bg-slate-300', text: 'text-slate-600', soft: 'bg-slate-100' },
};

export const SEVERITY = {
  CRITICAL: { label: 'Critical', tone: 'red', bar: 'bg-red-500' },
  WARNING: { label: 'Warning', tone: 'amber', bar: 'bg-amber-400' },
  INFO: { label: 'Info', tone: 'blue', bar: 'bg-blue-400' },
};

export default function StatusLegend({ className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 ${className}`}>
      {Object.entries(STATUS).map(([k, s]) => (
        <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${s.dot}`} />{s.label}</span>
      ))}
    </div>
  );
}
