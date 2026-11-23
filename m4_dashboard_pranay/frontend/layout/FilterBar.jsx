import { RotateCcw } from 'lucide-react';
import { Button, Select } from '@m2/components/ui';

/**
 * Shared dashboard filter bar (FR-4.6). `fields` picks which controls to show.
 * value = { branch, category, from, to }
 */
export default function FilterBar({ value, onChange, branches = [], categories = [], fields = ['branch', 'category'], extra }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  const hasAny = fields.some((f) => value[f]);
  return (
    <div className="card mb-5 flex flex-wrap items-end gap-3 p-3">
      {fields.includes('branch') && (
        <label className="w-full text-xs font-medium text-slate-500 sm:w-56">Branch
          <Select className="mt-1" value={value.branch || ''} onChange={set('branch')} placeholder="All branches" options={branches.map((b) => ({ value: b, label: b }))} />
        </label>
      )}
      {fields.includes('category') && (
        <label className="w-full text-xs font-medium text-slate-500 sm:w-48">Category
          <Select className="mt-1" value={value.category || ''} onChange={set('category')} placeholder="All categories" options={categories.map((c) => ({ value: c, label: c }))} />
        </label>
      )}
      {fields.includes('from') && (
        <label className="w-[calc(50%-6px)] text-xs font-medium text-slate-500 sm:w-40">From
          <input type="date" value={value.from || ''} onChange={set('from')} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </label>
      )}
      {fields.includes('to') && (
        <label className="w-[calc(50%-6px)] text-xs font-medium text-slate-500 sm:w-40">To
          <input type="date" value={value.to || ''} onChange={set('to')} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </label>
      )}
      {extra}
      {hasAny && <Button variant="ghost" size="md" icon={RotateCcw} onClick={() => onChange(Object.fromEntries(fields.map((f) => [f, ''])))}>Reset</Button>}
    </div>
  );
}
