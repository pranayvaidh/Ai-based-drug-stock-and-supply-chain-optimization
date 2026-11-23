# Module 4: Analytics, Visualization & Dashboard

**Owner:** Pranay Vaidh · 23ESKIT124 · **Form-3 progress: 35 %** · Hard deadline 20 Mar 2027

A complete dashboard UI running on **sample data shaped exactly like the agreed API contracts**
(decision D4). The aggregation APIs are scheduled for Jan 2027 (Sprint 5). Every card and page header has a
`DataSourceBadge`: green **LIVE** for real API data, slate **"Sample data · planned Sprint N"** otherwise.

## Done
| Feature | Ref | Data |
|---|---|---|
| Dashboard shell: collapsible sidebar (drawer under 1024 px) with role-based items, topbar (name, role chip, logout), responsive grid, filter bar | Form-3D wk 5 | LIVE (UI) |
| KPI cards: items at risk, expiring batches, open orders, active alerts | Form-3D wk 7 | Sample |
| Drugs × branches heatmap with hover tooltip (stock, days of cover, ROP) and legend | FR-4.2 | Sample |
| Actual (solid) vs forecast (dashed) line chart with shaded interval, MAPE + confidence chip, model label | FR-4.1 | Sample (real output of the M3 pipeline on synthetic history) |
| Alert list with severity/type filters; 30/60/90-day expiry columns and bars | FR-4.3, FR-4.4 | Sample |
| Supplier performance: Chart.js bar (on-time %) + line (lead-time trend) + scorecard | FR-4.5 | Sample |
| Admin settings: Thresholds form + Users tab | FR-4.7 | Sample |
| Reports: filter bar + preview + **Download CSV** (client-side, filename includes the date) | FR-4.6, FR-4.8 | Sample |
| Contracts for `/dashboard/overview`, `/dashboard/suppliers`, `/forecast/{id}`, `/alerts`, `/settings` | — | [contract doc](contracts/DASHBOARD_API_CONTRACT.md) |

## Planned
| Feature | When |
|---|---|
| Aggregation APIs (`/dashboard/overview`, `/dashboard/suppliers`) → flip `USE_MOCK` | Sprint 5 (Jan 2027) |
| Alerts API + resolve | Sprint 6 (Jan–Feb 2027) |
| Forecast API from the `forecasts` collection, re-run button, auto-refresh, settings save | Sprint 7 (Feb–Mar 2027) |
| Admin user management | Sprint 4 (with Module 1) |

## How the sample data works
- `frontend/mocks/*.json` use the **same drug and branch names** as the seeded database.
- `frontend/services/dashboardService.js` exposes `getOverview(filters)`, `getSuppliers()`,
  `getForecast(drug, branch)`, `getAlerts(filters)`, `getSettings()`. Each resolves after 300 ms and applies
  the filters client-side, so the filter bar really works.
- KPI counts are **derived** from the heatmap cells, expiry batches, alerts and open orders, so every widget
  agrees: 6 stockout-risk cells = "Items at risk 6", 18 unresolved alerts = "Active alerts 18", 4 open
  orders = the 4 seeded Pending purchase orders.
- **Switching to the real API:** set `USE_MOCK = false` in `dashboardService.js`. Each function already has
  the real call (`api.get('/dashboard/overview', { params: filters })`, …).

Colours (SRS §5.1.2) live in `components/StatusLegend.jsx`: red = stockout/critical, amber =
overstock/warning, green = healthy, grey = no data.

## Files
```
layout/      AppLayout.jsx, Sidebar.jsx, Topbar.jsx, FilterBar.jsx, navConfig.js (role-based nav)
components/  KpiCard, StockHeatmap, ForecastChart (Recharts), AlertList, ExpiryRiskIndicator,
             SupplierPerformanceChart (Chart.js), StatusLegend
pages/       DashboardHome, ForecastDashboard, HeatmapPage, AlertsPage, SupplierPerformancePage,
             AdminSettingsPage, ReportsPage
services/    dashboardService.js (USE_MOCK = true)
mocks/       overview.json, alerts.json, forecast_sample.json, suppliers.json, settings.json, users.json
contracts/   DASHBOARD_API_CONTRACT.md
```

## Role-based navigation
- **Admin:** everything
- **Pharmacist:** Dashboard, Forecast, Heatmap, Alerts, Drugs (read), Stock, Sales, Purchase Orders, Reports, Profile
- **Supplier:** Supplier Portal, Profile

## Demo (about 3–4 minutes)
1. Dashboard Home: KPI cards, the colour convention and legend, latest alerts. Change the branch filter: the KPIs follow.
2. Heatmap: hover tooltips; category filter (e.g. Antibiotic).
3. Forecast: Paracetamol @ Malviya Nagar (Prophet, MAPE 17.6 %, OK). Then Cetirizine @ Jagatpura or
   ORS @ Vaishali Nagar (MAPE > 25 %) to show the **Low confidence** chip.
4. Alerts & Expiry (30/60/90 columns); Supplier Performance (Chart.js).
5. Reports: pick filters → **Download CSV**.
6. Open `contracts/DASHBOARD_API_CONTRACT.md` and `services/dashboardService.js`: `USE_MOCK` switches to the
   real API in Jan 2027. Point out the "Sample data" badges.
