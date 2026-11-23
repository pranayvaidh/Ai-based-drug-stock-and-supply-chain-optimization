"""Prophet forecaster (FR-3.2). Import is guarded: if Prophet is missing the service still runs
and the forecaster falls back to regression / moving average."""
import logging

import pandas as pd

NAME = "prophet"
log = logging.getLogger(__name__)

try:
    from prophet import Prophet  # noqa: F401
    logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
    logging.getLogger("prophet").setLevel(logging.WARNING)
    AVAILABLE = True
except Exception as exc:  # noqa: BLE001 - ImportError or a broken Stan backend
    log.warning("Prophet unavailable (%s); using regression / moving-average only", exc)
    AVAILABLE = False


def fit_forecast(train, horizon):
    if not AVAILABLE:
        raise RuntimeError("Prophet is not installed")
    df = pd.DataFrame({"ds": train.index, "y": train.values})
    m = Prophet(weekly_seasonality=True, yearly_seasonality=len(train) >= 365, daily_seasonality=False,
                interval_width=0.8, uncertainty_samples=300)
    m.fit(df)
    future = m.make_future_dataframe(periods=horizon, freq="D", include_history=False)
    fc = m.predict(future)
    out = fc[["yhat", "yhat_lower", "yhat_upper"]].copy()
    out.index = pd.DatetimeIndex(fc["ds"])
    return out
