import { Save, SlidersHorizontal, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge, Button, DataSourceBadge, DataTable, FormField, Input, PageHeader, Tooltip } from '@m2/components/ui';
import { fmtDateTime } from '@m2/lib/format';
import { getSettings, getUsers, SPRINT } from '../services/dashboardService';

const FIELDS = [
  { key: 'expiry_warning_days', label: 'Expiry warning (days)', hint: 'Batches expiring within this window raise an alert', step: 1 },
  { key: 'max_cover_days', label: 'Max days of cover', hint: 'Above this a drug is marked overstock', step: 1 },
  { key: 'review_days', label: 'Review period R (days)', hint: 'Used in the reorder quantity formula', step: 1 },
  { key: 'z_value', label: 'Service level Z', hint: '1.65 ≈ 95% service level', step: 0.01 },
  { key: 'anomaly_limit', label: 'Anomaly z-limit', hint: '|z| at or above this flags a spike or drop', step: 0.1 },
];
const ROLE_TONE = { admin: 'purple', pharmacist: 'blue', supplier: 'green' };
const TABS = [{ v: 'thresholds', l: 'Thresholds', i: SlidersHorizontal }, { v: 'users', l: 'Users', i: Users }];

export default function AdminSettingsPage() {
  const [tab, setTab] = useState('thresholds');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState(null);
  useEffect(() => { getSettings().then(setSettings); getUsers().then(setUsers); }, []);

  return (
    <div>
      <PageHeader title="Admin settings" description="Thresholds used by the forecasting and alert rules, and user management." />
      <div className="mb-5 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm" role="tablist">
        {TABS.map(({ v, l, i: I }) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 font-medium ${tab === v ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <I className="h-4 w-4" />{l}
          </button>
        ))}
      </div>

      {tab === 'thresholds' && (
        <div className="card max-w-3xl">
          <div className="card-header"><h2 className="card-title">Alert & reorder thresholds</h2><DataSourceBadge sprint={SPRINT.settings} /></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {!settings
              ? [1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)
              : FIELDS.map((f) => (
                <FormField key={f.key} label={f.label} hint={f.hint}>
                  <Input type="number" step={f.step} value={settings[f.key]} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })} />
                </FormField>
              ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">Saving to the settings collection is planned for Sprint 7</span>
            <Tooltip text="PUT /settings planned Sprint 7 (FR-4.7)"><Button icon={Save} disabled>Save</Button></Tooltip>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="card-header"><h2 className="card-title">Users</h2><DataSourceBadge sprint={SPRINT.users} /></div>
          <DataTable
            loading={!users}
            rows={users || []}
            rowKey="email"
            columns={[
              { key: 'name', header: 'Name', render: (r) => <div><p className="font-medium text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.email}</p></div> },
              { key: 'role', header: 'Role', render: (r) => <Badge tone={ROLE_TONE[r.role]} className="capitalize">{r.role}</Badge> },
              { key: 'scope', header: 'Branch / supplier' },
              { key: 'last_login', header: 'Last login', render: (r) => fmtDateTime(r.last_login) },
              { key: 'active', header: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'slate'} dot>{r.active ? 'Active' : 'Disabled'}</Badge> },
              { key: 'a', header: '', align: 'right', render: () => <Tooltip text="User management planned Sprint 4"><Button size="sm" variant="ghost" disabled>Edit</Button></Tooltip> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
