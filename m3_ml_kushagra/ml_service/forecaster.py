"""Model selection (FR-3.2, FR-3.3, SRS §5.1.1 fallback, NFR-006 confidence).

* history < 60 days      → 14-day moving average (MAPE on the holdout when possible, else null)
* history >= 60 days     → fit Prophet and Ridge regression on the first 80 %, score both on the
                           last 20 % with MAPE, keep the lower one, refit it on 100 % and forecast.
* predictions are clipped at 0; confidence = "LOW" if MAPE > 25 or MAPE is null, else "OK".
"""
import logging
from datetime import datetime, timezone

from .evaluation import mape, time_split
from .models import moving_average, prophet_model, regression_model

log = logging.getLogger(__name__)
MIN_HISTORY_DAYS = 60
LOW_CONFIDENCE_MAPE = 25.0


def _clip(df):
    return df.clip(lower=0)


def _score(fit_fn, train, test):
    try:
        pred = fit_fn(train, len(test))
        return mape(test.values, _clip(pred)["yhat"].values)
    except Exception as exc:  # noqa: BLE001
        log.warning("model failed during evaluation: %s", exc)
        return "error"


def select_and_forecast(series, horizon=30):
    """Return (model_name, candidates, chosen_mape, forecast_df)."""
    n = len(series)
    if n < MIN_HISTORY_DAYS:
        train, test = time_split(series)
        score = None
        if len(train) >= 7 and len(test) > 0:
            score = mape(test.values, moving_average.forecast(train, len(test))["yhat"].values)
        return (moving_average.NAME, {moving_average.NAME: {"mape": score}}, score,
                _clip(moving_average.forecast(series, horizon)))

    train, test = time_split(series)
    candidates = {}
    fitters = {regression_model.NAME: regression_model.fit_forecast}
    if prophet_model.AVAILABLE:
        fitters = {prophet_model.NAME: prophet_model.fit_forecast, **fitters}
    else:
        candidates[prophet_model.NAME] = {"mape": None, "available": False}
    for name, fn in fitters.items():
        s = _score(fn, train, test)
        candidates[name] = {"mape": None if s == "error" else s}
        if s == "error":
            candidates[name]["error"] = True

    scored = [(c["mape"], name) for name, c in candidates.items() if c.get("mape") is not None]
    if scored:
        best_mape, best = min(scored)
    else:  # all MAPEs null (e.g. all-zero holdout) → prefer regression, then Prophet
        best = regression_model.NAME if regression_model.NAME in fitters else next(iter(fitters))
        best_mape = None
    fc = _clip(fitters[best](series, horizon))
    return best, candidates, best_mape, fc


def forecast(series, horizon=30, drug_id=None, branch_id=None, preprocessing=None):
    """Full contract response for POST /ml/forecast."""
    model, candidates, score, fc = select_and_forecast(series, horizon)
    preds = [{"date": d.date().isoformat(), "yhat": round(float(r.yhat), 2),
              "yhat_lower": round(float(r.yhat_lower), 2), "yhat_upper": round(float(r.yhat_upper), 2)}
             for d, r in fc.iterrows()]
    avg = round(sum(p["yhat"] for p in preds) / len(preds), 2) if preds else 0.0
    return {
        "drug_id": drug_id, "branch_id": branch_id, "model_used": model, "horizon_days": horizon,
        "history_days": int(len(series)), "candidates": candidates, "mape": score,
        "confidence": "LOW" if score is None or score > LOW_CONFIDENCE_MAPE else "OK",
        "avg_daily_demand": avg, "daily_predictions": preds, "preprocessing": preprocessing or {},
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    }
