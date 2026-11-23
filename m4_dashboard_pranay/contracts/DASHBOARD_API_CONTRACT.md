# Dashboard API contract (Module 4)

**Status:** agreed, **not built yet.** The aggregation endpoints are scheduled for **Sprint 5 (Jan 2027)**;
alerts/settings write paths for Sprints 6–7. Until then every dashboard screen reads sample JSON in
[`frontend/mocks/`](../frontend/mocks) that has **exactly these shapes**, through
[`frontend/services/dashboardService.js`](../frontend/services/dashboardService.js).

Switching to the real API is one line: set `USE_MOCK = false` in `dashboardService.js`. Each service
function already contains the real `api.get(...)` call (axios instance from Module 1, Bearer token,
`/api` → Flask via the Vite proxy).

All endpoints require a JWT (`Authorization: Bearer …`). Roles: **admin**, **pharmacist** (scoped to own
branch by default) unless noted. Errors use the project-wide format
`{"error": {"code", "message", "details"?}}`.

Colour/status convention (SRS §5.1.2): `STOCKOUT_RISK` = red, `OVERSTOCK` = amber, `HEALTHY` = green,
`NO_DATA` = grey.

---

## `GET /dashboard/overview`
Query: `branch_id`, `category`, `from`, `to` (all optional; dates `YYYY-MM-DD`).

```json
{
  "kpis": { "items_at_risk": 6, "expiring_batches_30d": 6, "open_orders": 4, "active_alerts": 18 },
  "heatmap": {
    "drugs": ["Paracetamol 500 mg", "Amoxicillin 250 mg"],
    "branches": ["Malviya Nagar Pharmacy", "Vaishali Nagar Pharmacy", "Jagatpura Pharmacy", "Central Warehouse Jaipur"],
    "cells": [
      { "drug": "Paracetamol 500 mg", "branch": "Malviya Nagar Pharmacy", "status": "STOCKOUT_RISK",
        "stock": 120, "days_of_cover": 2.3, "rop": 359, "avg_daily_demand": 52.4 },
      { "drug": "Azithromycin 500 mg", "branch": "Central Warehouse Jaipur", "status": "NO_DATA",
        "stock": 331, "days_of_cover": null, "rop": null, "avg_daily_demand": null }
    ]
  },
  "expiry": {
    "d30": 6, "d60": 4, "d90": 5,
    "batches": [
      { "drug": "Amoxicillin 250 mg", "branch": "Jagatpura Pharmacy", "batch_no": "JP-02A-26", "quantity": 34,
        "expiry_date": "2026-11-25", "days_left": 9, "at_risk_qty": 26 }
    ]
  },
  "latest_alerts": [ { "...": "same shape as GET /alerts items, newest first, max 5" } ],
  "refreshed_at": "2026-11-16T06:00:00Z"
}
```
Rules:
- `kpis.items_at_risk` = number of heatmap cells with `STOCKOUT_RISK` (after filters)
- `kpis.expiring_batches_30d` = `expiry.d30`
- `kpis.open_orders` = purchase orders with status `Pending` or `Confirmed`
- `kpis.active_alerts` = alerts with `resolved = false`
- `d30` = days_left ≤ 30, `d60` = 31–60, `d90` = 61–90

## `GET /dashboard/suppliers` (admin)
```json
[
  { "supplier": "Rajasthan Pharma Distributors", "on_time_rate": 0.92, "avg_lead_time_days": 5.2,
    "orders_delivered": 48, "fill_rate": 0.97,
    "trend": [ { "month": "Jun", "on_time_rate": 0.88, "avg_lead_time_days": 5.6 } ] }
]
```
`on_time_rate` and `fill_rate` are fractions 0–1; `trend` covers the last 6 months.

## `GET /forecast/{drug_id}?branch_id=`
Same body as the ML service's `POST /ml/forecast` response
([`m3_ml_kushagra/contracts/ML_API_CONTRACT.md`](../../m3_ml_kushagra/contracts/ML_API_CONTRACT.md)), plus:
```json
{ "actuals": [ { "date": "2026-11-15", "quantity": 42 } ] }
```
`actuals` = the last 60 days of daily sales (zero-filled). Served from the `forecasts` collection once the
backend ↔ ML integration lands (Sprint 7, FR-3.8).

## `GET /alerts`
Query: `type`, `severity`, `branch_id`, `category`, `from`, `to`, `include_resolved` (default `false`).
```json
[
  { "id": "al-001", "type": "STOCKOUT", "severity": "CRITICAL", "drug": "Paracetamol 500 mg",
    "branch": "Malviya Nagar Pharmacy", "batch_no": null,
    "message": "Stock 120 at or below reorder point 359 (~2.3 days of cover)",
    "created_at": "2026-11-15T22:00:00Z", "resolved": false }
]
```
`type ∈ {STOCKOUT, OVERSTOCK, EXPIRY_RISK, ANOMALY}` · `severity ∈ {CRITICAL, WARNING, INFO}`.
`PUT /alerts/{id}/resolve` is planned for Sprint 6.

## `GET /settings` · `PUT /settings` (PUT admin only)
```json
{ "expiry_warning_days": 30, "max_cover_days": 60, "review_days": 7, "z_value": 1.65, "anomaly_limit": 3 }
```
PUT accepts any subset of these keys; validation: integers ≥ 1 for day values, `z_value` 0.5–3.5,
`anomaly_limit` 1–6. Planned Sprint 7 (FR-4.7).

## Reports / CSV (FR-4.8)
No endpoint: the Reports screen exports the **currently displayed preview** to CSV in the browser
(`report_<type>_<YYYY-MM-DD>.csv`). Report types: stock status (heatmap cells), expiring batches, alerts.
