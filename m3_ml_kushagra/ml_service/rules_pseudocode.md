# Stock-status, expiry and anomaly rules — pseudocode (FR-3.5 – FR-3.7)

> Status per Form-3C: **written and reviewed, not coded yet.** Implementation is planned for
> Sprint 6 (Jan–Feb 2027); integration with the backend for Sprint 7 (FR-3.8).
> Thresholds come from the `settings` collection (defaults shown).

## Inputs
- `forecast(drug, branch)` → `avg_daily_demand d`, `sigma` (std of daily demand), `mape`
- `stock(drug, branch)` → sum of non-expired batch quantities; `on_order` = Pending/Confirmed PO qty
- `supplier.avg_lead_time_days L`; settings `z_value=1.65`, `review_days R=7`,
  `max_cover_days=60`, `expiry_warning_days=30`, `anomaly_limit=3`

## FR-3.5 Stock status (heatmap colour)
```
ss  = safety_stock(Z, sigma, L)                     # reorder.py
rop = reorder_point(d, L, ss)
days_of_cover = stock / d            if d > 0 else INF

if no forecast or history_days == 0:      status = NO_DATA        (grey)
elif stock <= rop:                        status = STOCKOUT_RISK  (red)
       create/refresh alert STOCKOUT, severity CRITICAL if stock <= d*L else WARNING
       suggest PO qty = reorder_quantity(d, L, R, ss, stock, on_order)
elif days_of_cover > max_cover_days:      status = OVERSTOCK      (amber)
       create alert OVERSTOCK, severity WARNING
else:                                     status = HEALTHY        (green)
```

## FR-3.6 Expiry risk
```
for batch in stock_batches(drug, branch, quantity > 0):
    days_left = batch.expiry_date - today
    expected_use = d * days_left           # units we expect to sell before expiry (FEFO order)
    # walk batches in FEFO order, subtracting what earlier batches will absorb
    at_risk_qty = max(0, batch.quantity - (expected_use - qty_of_earlier_batches))
    if days_left <= expiry_warning_days and at_risk_qty > 0:
        alert EXPIRY_RISK, severity CRITICAL if days_left <= 15 else WARNING
        message: "<at_risk_qty> units of batch <batch_no> may expire unsold in <days_left> days"
        bucket into d30 / d60 / d90 for the dashboard
```

## FR-3.7 Demand anomalies (POST /ml/anomaly)
```
series = build_daily_series(sales)               # preprocessing.py (spikes are kept)
rolling_mean = series.rolling(28, min_periods=14).mean().shift(1)
rolling_std  = series.rolling(28, min_periods=14).std().shift(1)
z = (series - rolling_mean) / rolling_std
for day where |z| >= z_limit (default 3):
    type = SPIKE if z > 0 else DROP
    emit {date, quantity, z_score: round(z, 2), type}
    alert ANOMALY, severity WARNING (INFO if |z| < z_limit + 1)
```
Expected demo hit: Paracetamol 500 mg @ Malviya Nagar, ~3 weeks ago (two days at ≈5× demand).

## Re-run triggers (FR-3.8, Sprint 7)
- After each `POST /sales` or `/sales/upload` → mark (drug, branch) dirty → nightly or on-demand re-forecast
- Store results in `forecasts` (unique index on drug_id+branch_id) and alerts in `alerts`
