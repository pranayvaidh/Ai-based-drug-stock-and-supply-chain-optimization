import pandas as pd

from m3_ml_kushagra.ml_service.evaluation import mape, time_split


def test_mape_known_values():
    assert mape([100, 200], [110, 180]) == 10.0
    assert mape([10, 20, 30], [10, 20, 30]) == 0.0


def test_mape_excludes_zero_actuals():
    assert mape([0, 100], [50, 90]) == 10.0
    assert mape([0, 0], [1, 2]) is None


def test_time_split_is_chronological_80_20():
    s = pd.Series(range(100), index=pd.date_range("2026-01-01", periods=100))
    train, test = time_split(s)
    assert len(train) == 80 and len(test) == 20
    assert train.index.max() < test.index.min()
