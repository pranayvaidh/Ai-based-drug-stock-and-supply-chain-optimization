"""Model evaluation helpers: chronological 80/20 split and MAPE.

MAPE ignores days where the actual value is 0 (division by zero would make it
undefined). If every holdout day is 0 the MAPE is ``None``.
"""
import math

import numpy as np


def time_split(series, test_frac=0.2):
    """Chronological split: the most recent ``test_frac`` of days is held out for testing."""
    n = len(series)
    n_test = max(1, int(math.ceil(n * test_frac))) if n > 1 else 0
    return series.iloc[: n - n_test], series.iloc[n - n_test:]


def mape(actual, forecast):
    """Mean absolute percentage error in %, rounded to 2 decimals; zero-actual days excluded."""
    a = np.asarray(actual, dtype=float)
    f = np.asarray(forecast, dtype=float)
    if a.shape != f.shape:
        raise ValueError("actual and forecast must have the same length")
    mask = a != 0
    if not mask.any():
        return None
    return round(float(np.mean(np.abs((a[mask] - f[mask]) / a[mask])) * 100), 2)
