import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';

/**
 * columns: [{ key, header, render?: (row) => node, className?, align? }]
 * pagination: { page, limit, total, onPage }
 */
export default function DataTable({ columns, rows, loading, rowKey = 'id', empty, pagination, dense = false, rowClassName }) {
  const pad = dense ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={clsx(pad, 'whitespace-nowrap text-left text-xs font-semibold uppercase tracking-wide text-slate-500', c.align === 'right' && 'text-right', c.headerClassName)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className={pad}><div className="skeleton h-3.5 w-full max-w-[140px]" /></td>
                  ))}
                </tr>
              ))
              : rows.map((row, i) => (
                <tr key={row[rowKey] ?? i} className={clsx('hover:bg-slate-50/70', rowClassName?.(row))}>
                  {columns.map((c) => (
                    <td key={c.key} className={clsx(pad, 'whitespace-nowrap text-slate-700', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                      {c.render ? c.render(row) : row[c.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (empty || <EmptyState />)}
      {pagination && pagination.total > 0 && <Pagination {...pagination} />}
    </div>
  );
}

function Pagination({ page, limit, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <button className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        <span className="px-1">Page {page} / {pages}</span>
        <button className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
