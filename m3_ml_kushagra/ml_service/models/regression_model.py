"""scikit-learn alternative (FR-3.3): Ridge regression on time index + day-of-week + month."""
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

NAME = "linear_regression"


def _features(index, t0):
    t = ((index - t0).days.values.astype(float)).reshape(-1, 1)
    dow = np.eye(7)[index.dayofweek]
    month = np.eye(12)[index.month - 1]
    return np.hstack([t, dow, month])


def fit_forecast(train, horizon):
    t0 = train.index[0]
    model = Ridge(alpha=1.0)
    x = _features(train.index, t0)
    model.fit(x, train.values)
    resid_sd = float(np.std(train.values - model.predict(x)))
    idx = pd.date_range(train.index[-1] + pd.Timedelta(days=1), periods=horizon, freq="D")
    yhat = model.predict(_features(idx, t0))
    band = 1.28 * resid_sd  # ~80% interval, same width as Prophet's default
    return pd.DataFrame({"yhat": yhat, "yhat_lower": yhat - band, "yhat_upper": yhat + band}, index=idx)
