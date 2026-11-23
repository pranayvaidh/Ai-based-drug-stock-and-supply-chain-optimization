/** CSS-only tooltip. Wraps disabled buttons too (they don't fire hover events themselves). */
export default function Tooltip({ text, children, side = 'top' }) {
  const pos = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
  return (
    <span className="group relative inline-flex" tabIndex={0}>
      {children}
      <span role="tooltip" className={`pointer-events-none absolute left-1/2 z-30 w-max max-w-[220px] -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-center text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 ${pos}`}>
        {text}
      </span>
    </span>
  );
}
