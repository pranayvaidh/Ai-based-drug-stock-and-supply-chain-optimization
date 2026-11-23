import clsx from 'clsx';
import { useState } from 'react';
import { STATUS } from './StatusLegend';

const short = (b) => b.replace(' Pharmacy', '').replace('Central Warehouse Jaipur', 'Warehouse');

/** Drugs × branches grid (FR-4.2) with hover tooltip: stock, days of cover, ROP. */
export default function StockHeatmap({ drugs, branches, cells, compact = false }) {
  const [hover, setHover] = useState(null);
  const byKey = Object.fromEntries(cells.map((c) => [`${c.drug}|${c.branch}`, c]));
  const h = compact ? 'h-7' : 'h-10';
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: compact ? 3 : 4 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white" />
            {branches.map((b) => (
              <th key={b} className="min-w-[84px] px-1 pb-1 text-center text-[11px] font-semibold text-slate-500" title={b}>{short(b)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drugs.map((d) => (
            <tr key={d}>
              <th scope="row" className={clsx('sticky left-0 z-10 whitespace-nowrap bg-white pr-3 text-left font-medium text-slate-700', compact ? 'text-[11px]' : 'text-xs')}>{d}</th>
              {branches.map((b) => {
                const c = byKey[`${d}|${b}`];
                const s = STATUS[c?.status || 'NO_DATA'];
                return (
                  <td key={b} className="p-0">
                    <div
                      tabIndex={0}
                      onMouseEnter={() => setHover({ d, b, c })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ d, b, c })}
                      onBlur={() => setHover(null)}
                      className={clsx('flex items-center justify-center rounded-md text-[11px] font-semibold tabular-nums outline-none ring-brand-500 transition hover:scale-[1.04] hover:shadow focus:ring-2', h, s.cell)}
                      aria-label={`${d} at ${b}: ${s.label}`}
                    >
                      {!compact && c && c.stock != null ? c.stock : ''}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {hover && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
          <p className="font-semibold text-slate-800">{hover.d}</p>
          <p className="text-slate-500">{hover.b}</p>
          {hover.c ? (
            <dl className="mt-2 grid grid-cols-2 gap-y-1">
              <dt className="text-slate-500">Status</dt><dd className={clsx('text-right font-medium', STATUS[hover.c.status].text)}>{STATUS[hover.c.status].label}</dd>
              <dt className="text-slate-500">Stock</dt><dd className="text-right font-medium text-slate-800">{hover.c.stock ?? '—'}</dd>
              <dt className="text-slate-500">Days of cover</dt><dd className="text-right font-medium text-slate-800">{hover.c.days_of_cover ?? '—'}</dd>
              <dt className="text-slate-500">Reorder point</dt><dd className="text-right font-medium text-slate-800">{hover.c.rop ?? '—'}</dd>
              <dt className="text-slate-500">Avg demand / day</dt><dd className="text-right font-medium text-slate-800">{hover.c.avg_daily_demand ?? '—'}</dd>
            </dl>
          ) : <p className="mt-2 text-slate-500">No data</p>}
        </div>
      )}
    </div>
  );
}
