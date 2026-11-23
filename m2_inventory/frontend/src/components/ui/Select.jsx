import clsx from 'clsx';
import { forwardRef } from 'react';

/** options: [{ value, label }] */
const Select = forwardRef(function Select({ options = [], placeholder, error, className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        'block h-10 w-full rounded-lg border bg-white px-3 pr-8 text-sm text-slate-800',
        'focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500',
        error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
        className,
      )}
      aria-invalid={!!error}
      {...props}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
});
export default Select;
