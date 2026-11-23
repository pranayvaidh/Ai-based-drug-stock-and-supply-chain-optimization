import { AlertOctagon, CalendarClock, PackageX, TrendingUp, Warehouse } from 'lucide-react';
import { Badge, Button, EmptyState, Tooltip } from '@m2/components/ui';
import { SEVERITY } from './StatusLegend';

const TYPE = {
  STOCKOUT: { label: 'Stockout', icon: PackageX },
  OVERSTOCK: { label: 'Overstock', icon: Warehouse },
  EXPIRY_RISK: { label: 'Expiry risk', icon: CalendarClock },
  ANOMALY: { label: 'Anomaly', icon: TrendingUp },
};

const ago = (iso) => {
  const h = Math.round((new Date('2026-11-16T06:00:00Z') - new Date(iso)) / 36e5);
  return h < 24 ? `${Math.max(h, 1)} h ago` : `${Math.round(h / 24)} d ago`;
};

export default function AlertList({ alerts, showResolve = false, compact = false }) {
  if (!alerts.length) return <EmptyState icon={AlertOctagon} title="No alerts" description="Nothing matches the current filters." />;
  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map((a) => {
        const T = TYPE[a.type] || TYPE.ANOMALY;
        const S = SEVERITY[a.severity];
        return (
          <li key={a.id} className={`flex gap-3 ${compact ? 'px-4 py-2.5' : 'px-4 py-3'} ${a.resolved ? 'opacity-60' : ''}`}>
            <span className={`w-1 shrink-0 rounded-full ${S.bar}`} />
            <T.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-medium text-slate-800">{a.drug}</span>
                <Badge tone={S.tone}>{S.label}</Badge>
                {!compact && <Badge tone="slate">{T.label}</Badge>}
                {a.resolved && <Badge tone="green">Resolved</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{a.branch}{a.batch_no ? ` · ${a.batch_no}` : ''}</p>
              <p className={`mt-1 text-xs text-slate-600 ${compact ? 'line-clamp-1' : ''}`}>{a.message}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[11px] text-slate-400">{ago(a.created_at)}</span>
              {showResolve && !a.resolved && (
                <Tooltip text="Resolve workflow planned Sprint 6"><Button size="sm" variant="secondary" disabled>Resolve</Button></Tooltip>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
