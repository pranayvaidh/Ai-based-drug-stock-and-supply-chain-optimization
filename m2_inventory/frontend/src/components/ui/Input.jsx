import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ error, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'block h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500',
        error ? 'border-red-400 focus:ring-red-200' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100',
        className,
      )}
      aria-invalid={!!error}
      {...props}
    />
  );
});
export default Input;
