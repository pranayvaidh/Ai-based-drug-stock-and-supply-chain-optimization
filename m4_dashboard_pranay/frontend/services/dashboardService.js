/**
 * Module 4 data access. Today every call resolves sample JSON (after a 300 ms delay) and applies
 * the filters client-side, so the filter bar really works. The JSON is shaped exactly like the
 * agreed contracts in m4_dashboard_pranay/contracts/DASHBOARD_API_CONTRACT.md.
 *
 * Switching to the real API (Jan 2027, Sprint 5) is a one-line change: set USE_MOCK = false.
 * Each function already contains the real call, e.g.
 *     const { data } = await api.get('/dashboard/overview', { params: filters });
 */
import api from '@m1/api/client';
import alertsMock from '../mocks/alerts.json';
import forecastMock from '../mocks/forecast_sample.json';
import overviewMock from '../mocks/overview.json';
import settingsMock from '../mocks/settings.json';
import suppliersMock from '../mocks/suppliers.json';
import usersMock from '../mocks/users.json';

export const USE_MOCK = true;
export const SPRINT = { overview: 5, suppliers: 7, forecast: 7, alerts: 6, settings: 7, users: 4, reports: 5 };

const delay = (value, ms = 300) => new Promise((res) => setTimeout(() => res(structuredClone(value)), ms));
const categoryOf = Object.fromEntries(overviewMock.drugs.map((d) => [d.name, d.category]));

export const META = {
  branches: overviewMock.branches,
  categories: [...new Set(overviewMock.drugs.map((d) => d.category))].sort(),
  drugs: overviewMock.drugs.map((d) => d.name),
  refreshedAt: overviewMock.refreshed_at,
};

function matches(item, { branch, category } = {}) {
  if (branch && item.branch !== branch) return false;
  if (category && categoryOf[item.drug] !== category) return false;
  return true;
}

function inRange(iso, { from, to } = {}) {
  const d = iso.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** GET /dashboard/overview?branch_id=&category=&from=&to= */
export async function getOverview(filters = {}) {
  if (!USE_MOCK) {
    const { data } = await api.get('/dashboard/overview', { params: filters });
    return data;
  }
  const cells = overviewMock.heatmap.cells.filter((c) => matches(c, filters));
  const batches = overviewMock.expiry.batches.filter((b) => matches(b, filters));
  const alerts = alertsMock.alerts.filter((a) => !a.resolved && matches(a, filters));
  const orders = overviewMock.open_orders.filter((o) => matches(o, filters));
  const drugs = overviewMock.drugs.filter((d) => !filters.category || d.category === filters.category).map((d) => d.name);
  const branches = overviewMock.branches.filter((b) => !filters.branch || b === filters.branch);
  return delay({
    kpis: {
      items_at_risk: cells.filter((c) => c.status === 'STOCKOUT_RISK').length,
      expiring_batches_30d: batches.filter((b) => b.days_left <= 30).length,
      open_orders: orders.length,
      active_alerts: alerts.length,
    },
    heatmap: { drugs, branches, cells },
    expiry: {
      d30: batches.filter((b) => b.days_left <= 30).length,
      d60: batches.filter((b) => b.days_left > 30 && b.days_left <= 60).length,
      d90: batches.filter((b) => b.days_left > 60 && b.days_left <= 90).length,
      batches,
    },
    latest_alerts: alerts.slice(0, 5),
    refreshed_at: overviewMock.refreshed_at,
  });
}

/** GET /dashboard/suppliers */
export async function getSuppliers() {
  if (!USE_MOCK) {
    const { data } = await api.get('/dashboard/suppliers');
    return data;
  }
  return delay(suppliersMock.suppliers);
}

/** GET /forecast/{drug_id}?branch_id= */
export async function getForecast(drug, branch) {
  if (!USE_MOCK) {
    const { data } = await api.get(`/forecast/${encodeURIComponent(drug)}`, { params: { branch_id: branch } });
    return data;
  }
  return delay(forecastMock.forecasts.find((f) => f.drug_id === drug && f.branch_id === branch) || null);
}

/** Series that have sample forecasts (selector options). */
export function getForecastSeries() {
  return forecastMock.forecasts.map((f) => ({ drug: f.drug_id, branch: f.branch_id, model: f.model_used, mape: f.mape }));
}

/** GET /alerts?type=&severity=&branch_id=&category=&from=&to=&include_resolved= */
export async function getAlerts(filters = {}) {
  if (!USE_MOCK) {
    const { data } = await api.get('/alerts', { params: filters });
    return data;
  }
  const out = alertsMock.alerts.filter((a) => matches(a, filters)
    && (!filters.type || a.type === filters.type)
    && (!filters.severity || a.severity === filters.severity)
    && (filters.include_resolved || !a.resolved)
    && inRange(a.created_at, filters));
  return delay(out);
}

/** GET /settings */
export async function getSettings() {
  if (!USE_MOCK) {
    const { data } = await api.get('/settings');
    return data;
  }
  return delay(settingsMock.settings);
}

/** Sample user list for the Admin ▸ Users tab (user management planned Sprint 4). */
export async function getUsers() {
  return delay(usersMock.users);
}

export function categoryForDrug(drug) {
  return categoryOf[drug];
}
