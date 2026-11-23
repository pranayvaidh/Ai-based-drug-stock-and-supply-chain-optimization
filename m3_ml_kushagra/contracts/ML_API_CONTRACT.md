# ML Service API contract (Module 3)

Agreed between Module 3 (Kushagra) and Module 1 / 4. Service runs standalone on **port 5051**.
Backend integration (`ML_SERVICE_URL`) is planned for **Sprint 7 (Feb–Mar 2027), FR-3.8**.

## Authentication
Every `/ml/*` request must send `X-Service-Key: <ML_SERVICE_KEY>` (from `.env`).
Missing or wrong key → **401**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "Missing or invalid X-Service-Key header" } }
```

## `GET /health` — public
```json
{ "status": "ok", "service": "ml-forecast-service", "prophet_available": true }
```

## `POST /ml/forecast` — LIVE
Request
```json
{
  "drug_id": "Paracetamol 500 mg",
  "branch_id": "Malviya Nagar Pharmacy",
  "horizon_days": 30,
  "sales": [ { "date": "2026-03-21", "quantity": 41 }, { "date": "2026-03-22", "quantity": 37 } ]
}
```
| field | rules |
|---|---|
| `drug_id`, `branch_id` | required strings (ObjectIds once integrated; names during the standalone phase) |
| `horizon_days` | integer 1–90, default 30 |
| `sales` | non-empty list of `{date, quantity}`; invalid rows are dropped and counted, not rejected |

Response **200**
```json
{
  "drug_id": "Paracetamol 500 mg",
  "branch_id": "Malviya Nagar Pharmacy",
  "model_used": "prophet",
  "horizon_days": 30,
  "history_days": 240,
  "candidates": { "prophet": { "mape": 17.59 }, "linear_regression": { "mape": 17.65 } },
  "mape": 17.59,
  "confidence": "OK",
  "avg_daily_demand": 47.1,
  "daily_predictions": [
    { "date": "2026-11-16", "yhat": 52.3, "yhat_lower": 43.9, "yhat_upper": 60.8 }
  ],
  "preprocessing": {
    "input_rows": 240, "dropped_non_numeric": 0, "dropped_negative": 0, "dropped_future": 0,
    "dropped_bad_date": 0, "dropped_invalid": 0, "zero_filled_days": 0
  },
  "generated_at": "2026-11-16T10:30:00+00:00"
}
```
`model_used ∈ {prophet, linear_regression, moving_average_14d}`.

Model selection rules:
- `history_days < 60` → `moving_average_14d`; `candidates = {"moving_average_14d": {"mape": x | null}}`
- otherwise Prophet and Ridge regression are trained on the first 80 % and scored on the last 20 %;
  the lower MAPE wins and is refit on all data. If Prophet is not installed:
  `"prophet": {"mape": null, "available": false}`.
- `mape` excludes days whose actual is 0; `null` if no non-zero actuals in the holdout.
- `confidence = "LOW"` if `mape > 25` or `mape` is `null`, else `"OK"` (NFR-006).
- predictions are clipped at 0.

Errors: **400** `VALIDATION_ERROR` (with `details` per field) or `NO_VALID_SALES`.

## `POST /ml/anomaly` — SKELETON (planned Sprint 6, FR-3.7)
Request
```json
{ "sales": [ { "date": "2026-10-25", "quantity": 210 } ], "z_limit": 3 }
```
Input is validated now (same `sales` shape; `z_limit` positive number, default 3).
Response **501**
```json
{
  "status": "not_implemented",
  "planned": "Sprint 6 (Jan–Feb 2027), FR-3.7",
  "z_limit": 3,
  "contract": { "anomalies": [ { "date": "YYYY-MM-DD", "quantity": 0, "z_score": 0.0, "type": "SPIKE|DROP" } ] }
}
```
Once implemented the response will be **200** with the `contract` object's shape. The detection
rule is in [`ml_service/rules_pseudocode.md`](../ml_service/rules_pseudocode.md).
