# Module 3: AI/ML Demand Forecasting & Risk Detection

**Owner:** Kushagra Sharma · 23ESKIT089 · **Form-3 progress: 35 %** · Hard deadline 15 Mar 2027

A **standalone** Flask microservice on port **5051** (decision D3). The main backend does not call it yet;
that integration is scheduled for 25 Feb – 5 Mar 2027 (Sprint 7, FR-3.8). It is demoed with
`scripts/demo_forecast.py`, Postman and pytest.

## Done (LIVE)
| Feature | Ref | Code |
|---|---|---|
| Deterministic synthetic sales (seed 42): 3 branches × 12 drugs × 240 days, weekly/seasonal patterns, a 40-day Insulin series, a 5× spike, missing days and bad rows | Form-3C wk 4 | `data/generate_synthetic_sales.py` → `data/sales_history.csv` |
| Daily series per drug/branch: drop negative/non-numeric/future rows (counted), sum same-day rows, zero-fill gaps; spikes kept | FR-3.1 | `ml_service/preprocessing.py` |
| Chronological 80/20 split; MAPE (zero-actual days excluded, 2 decimals) | FR-3.2 | `ml_service/evaluation.py` |
| Prophet 30-day forecast (weekly seasonality; yearly when ≥ 365 days); guarded import | FR-3.2 | `ml_service/models/prophet_model.py` |
| Ridge regression on time index + day-of-week + month | FR-3.3 | `ml_service/models/regression_model.py` |
| Best-of-two by holdout MAPE, refit on 100 %, clip ≥ 0; 14-day moving-average fallback under 60 days; `confidence = LOW` if MAPE > 25 or null | FR-3.2, FR-3.3, SRS §5.1.1, NFR-006 | `ml_service/forecaster.py` |
| `safety_stock`, `reorder_point`, `reorder_quantity` with unit tests | FR-3.4 | `ml_service/reorder.py` |
| `POST /ml/forecast` with `X-Service-Key` auth | Form-3C wk 11 | `ml_service/app.py` |

## Skeleton / planned
| Feature | Status |
|---|---|
| `POST /ml/anomaly` | Validates input, returns **HTTP 501** with the agreed contract. Detection: Sprint 6 (FR-3.7) |
| Status / expiry / anomaly rules (FR-3.5 – 3.7) | Pseudocode only: [`ml_service/rules_pseudocode.md`](ml_service/rules_pseudocode.md) |
| Backend ↔ ML integration, auto re-run on new sales, redistribution (FR-3.8, FR-3.9) | Sprint 7; the UI shows these as "Sample data · planned Sprint 7" |

## API
Full contract with examples: [`contracts/ML_API_CONTRACT.md`](contracts/ML_API_CONTRACT.md).

| Method | Path | Auth | Result |
|---|---|---|---|
| GET | `/health` | none | `{status, service, prophet_available}` |
| POST | `/ml/forecast` | `X-Service-Key` | 200 forecast (model, candidates' MAPE, confidence, 30 daily predictions) |
| POST | `/ml/anomaly` | `X-Service-Key` | 501 `not_implemented` + contract |

The key is `ML_SERVICE_KEY` in `.env` (default `dev-ml-service-key`). Missing or wrong key → 401.

## Run
```bash
python -m m3_ml_kushagra.ml_service.app                 # service on :5051
python m3_ml_kushagra/scripts/demo_forecast.py          # needs the service running
python m3_ml_kushagra/data/generate_synthetic_sales.py  # regenerate the CSV (optional, --end YYYY-MM-DD)
pytest m3_ml_kushagra -q
```
The committed CSV ends on 15 Nov 2026. Regenerating changes the dates (it always ends yesterday) but not the
patterns, because the random seed is fixed.

`demo_forecast.py` prints the comparison table, writes `outputs/forecast_<drug>_<branch>.png` (last 60 days
of actuals + 30-day forecast + interval), prints the SRS worked reorder example, and calls `/ml/anomaly`.
Reference run on the committed data:

| drug | branch | history days | prophet MAPE | regression MAPE | chosen | confidence |
|---|---|---|---|---|---|---|
| Paracetamol 500 mg | Malviya Nagar | 240 | 17.59 | 17.65 | prophet | OK |
| Metformin 500 mg | Malviya Nagar | 240 | 15.30 | 14.94 | linear_regression | OK |
| Insulin Glargine 100 IU/ml | Jagatpura | 40 | – | – | moving_average_14d | LOW |

SRS worked example: d = 10, L = 5, SS = 20 → **ROP = 70**; stock 60, R = 7 → **reorder qty = 80**.

**Prophet note:** wheels exist for Python 3.11. If Prophet fails to install, the service still starts
(`prophet_available: false`), the forecaster compares regression only, and Prophet-specific tests are skipped.

## Tests
`test_reorder.py` (SRS example, never negative, safety-stock formula) · `test_preprocessing.py` (zero-fill,
invalid rows) · `test_evaluation.py` (MAPE, zero exclusion, 80/20) · `test_forecaster.py` (< 60 days → moving
average, ≥ 60 days → best model, 30 non-negative predictions) · `test_api.py` (401 without key, 200 shape, 501).

## Demo (about 3–4 minutes)
1. Start the service, open http://localhost:5051/health → `prophet_available: true`.
2. `python m3_ml_kushagra/scripts/demo_forecast.py` → MAPE table. Explain the 80/20 holdout and why the
   lower-MAPE model is kept; point out Insulin @ Jagatpura falling back to the 14-day moving average.
3. Open the PNGs in `m3_ml_kushagra/outputs/` (the Paracetamol chart shows the spike ~3 weeks ago).
4. The script's SRS worked example (ROP 70, reorder 80), then `pytest m3_ml_kushagra -q`.
5. Postman: `/ml/forecast` (200) and `/ml/anomaly` (501, contract agreed, Sprint 6). Show
   `rules_pseudocode.md` as the next step.
