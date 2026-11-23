import clsx from 'clsx';

/**
 * Keeps the demo honest: green "LIVE" chip for real API data, slate chip for sample data.
 *   <DataSourceBadge live />
 *   <DataSourceBadge sprint={7} />
 */
export default function DataSourceBadge({ live = false, sprint, className }) {
  if (live) {
    return (
      <span className={clsx('inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20', className)}
        title="Served by the live Flask API + MongoDB">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-400/30', className)}
      title="Finished UI on sample data shaped like the agreed API contract">
      Sample data · planned Sprint {sprint}
    </span>
  );
}
