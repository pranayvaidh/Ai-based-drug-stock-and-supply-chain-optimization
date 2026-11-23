import numpy as np
import pandas as pd
import pytest

from m3_ml_kushagra.ml_service import forecaster
from m3_ml_kushagra.ml_service.models import prophet_model


def _series(n, seed=1, base=20):
    rng = np.random.default_rng(seed)
    idx = pd.date_range(end="2026-11-15", periods=n, freq="D")
    weekly = np.array([1.2, 1.0, 0.95, 0.97, 1.0, 1.2, 0.8])[idx.dayofweek]
    return pd.Series(rng.poisson(base * weekly).astype(float), index=idx)


def test_short_history_uses_moving_average():
    r = forecaster.forecast(_series(40), 30, "d", "b")
    assert r["model_used"] == "moving_average_14d"
    assert r["history_days"] == 40 and len(r["daily_predictions"]) == 30
    assert set(r["candidates"]) == {"moving_average_14d"}


def test_long_history_picks_lower_mape_model():
    r = forecaster.forecast(_series(150), 30, "d", "b")
    assert r["model_used"] in ("prophet", "linear_regression")
    preds = r["daily_predictions"]
    assert len(preds) == 30 and all(p["yhat"] >= 0 and p["yhat_lower"] >= 0 for p in preds)
    scored = {k: v["mape"] for k, v in r["candidates"].items() if v.get("mape") is not None}
    assert r["mape"] == min(scored.values())
    assert r["confidence"] == ("LOW" if r["mape"] > 25 else "OK")


def test_confidence_low_when_mape_null():
    idx = pd.date_range(end="2026-11-15", periods=20, freq="D")
    r = forecaster.forecast(pd.Series(np.zeros(20), index=idx), 7)
    assert r["mape"] is None and r["confidence"] == "LOW"


def test_predictions_clipped_at_zero():
    idx = pd.date_range(end="2026-11-15", periods=90, freq="D")
    falling = pd.Series(np.linspace(30, 0.5, 90), index=idx)
    r = forecaster.forecast(falling, 30)
    assert all(p["yhat"] >= 0 for p in r["daily_predictions"])


@pytest.mark.skipif(not prophet_model.AVAILABLE, reason="Prophet not installed")
def test_prophet_is_a_candidate_when_available():
    r = forecaster.forecast(_series(120), 30)
    assert r["candidates"]["prophet"]["mape"] is not None
