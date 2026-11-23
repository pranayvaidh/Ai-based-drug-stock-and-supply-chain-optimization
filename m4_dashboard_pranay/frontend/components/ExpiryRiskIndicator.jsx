import clsx from 'clsx';

const BUCKETS = [
  { key: 'd30', label: '≤ 30 days', bar: 'bg-red-500', soft: 'bg-red-50 text-red-700' },
  { key: 'd60', label: '31–60 days', bar: 'bg-amber-400', soft: 'bg-amber-50 text-amber-700' },
  { key: 'd90', label: '61–90 days', bar: 'bg-yellow-300', soft: 'bg-yellow-50 text-yellow-700' },
];

/** 30/60/90-day expiry indicator (FR-4.4): horizontal bars with counts. */
export default function ExpiryRiskIndicator({ expiry }) {
  const max = Math.max(1, expiry.d30, expiry.d60, expiry.d90);
  return (
    <div className="space-y-3">
      {BUCKETS.map((b) => (
        <div key={b.key}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-600">{b.label}</span>
            <span className={clsx('rounded-full px-2 py-0.5 font-semibold', b.soft)}>{expiry[b.key]} batch{expiry[b.key] === 1 ? '' : 'es'}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={clsx('h-full rounded-full transition-all', b.bar)} style={{ width: `${(expiry[b.key] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function bucketOf(days) {
  if (days <= 30) return 'd30';
  if (days <= 60) return 'd60';
  return 'd90';
}
