"""Fallback model (SRS §5.1.1): mean of the last 14 days, held flat over the horizon."""
import numpy as np
import pandas as pd

WINDOW = 14
NAME = "moving_average_14d"


def forecast(series, horizon):
    window = series.iloc[-WINDOW:]
    level = float(window.mean()) if len(window) else 0.0
    spread = 1.28 * float(window.std(ddof=0)) if len(window) > 1 else 0.0  # ~80% band
    idx = pd.date_range(series.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D")
    yhat = np.full(horizon, level)
    return pd.DataFrame({"yhat": yhat, "yhat_lower": yhat - spread, "yhat_upper": yhat + spread}, index=idx)
