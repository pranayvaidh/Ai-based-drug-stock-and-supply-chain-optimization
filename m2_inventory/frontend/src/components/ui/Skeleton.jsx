import clsx from 'clsx';

export default function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} />;
}

export function CardSkeleton({ rows = 3 }) {
  return (
    <div className="card space-y-3 p-4">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
    </div>
  );
}
