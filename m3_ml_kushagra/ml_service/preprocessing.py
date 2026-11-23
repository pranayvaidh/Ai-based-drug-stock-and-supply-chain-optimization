"""FR-3.1: turn raw sales rows into a continuous daily series for one drug/branch.

* rows with a non-numeric, negative or future quantity/date are dropped (and counted)
* several rows on the same day are summed
* missing days are re-indexed and zero-filled
* spikes are deliberately KEPT: they are material for anomaly detection (FR-3.7)
"""
from datetime import date

import pandas as pd


def _num(value):
    if isinstance(value, bool):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if pd.notna(num) else None


def build_daily_series(records, drug=None, branch=None, today=None):
    """Return ``(series, stats)``.

    ``records``: iterable of dicts with ``date`` and ``quantity`` (and optionally
    ``drug_name``/``branch_name``, used to filter when ``drug``/``branch`` are given).
    ``series``: pandas Series of floats indexed by a continuous daily DatetimeIndex.
    """
    today = pd.Timestamp(today or date.today())
    stats = {"input_rows": 0, "dropped_non_numeric": 0, "dropped_negative": 0, "dropped_future": 0,
             "dropped_bad_date": 0}
    clean = []
    for r in records:
        if drug is not None and r.get("drug_name") != drug:
            continue
        if branch is not None and r.get("branch_name") != branch:
            continue
        stats["input_rows"] += 1
        try:
            d = pd.Timestamp(str(r.get("date"))[:10])
        except (ValueError, TypeError):
            stats["dropped_bad_date"] += 1
            continue
        if pd.isna(d):
            stats["dropped_bad_date"] += 1
            continue
        q = _num(r.get("quantity"))
        if q is None:
            stats["dropped_non_numeric"] += 1
            continue
        if q < 0:
            stats["dropped_negative"] += 1
            continue
        if d > today:
            stats["dropped_future"] += 1
            continue
        clean.append((d.normalize(), q))

    stats["dropped_invalid"] = (stats["dropped_non_numeric"] + stats["dropped_negative"]
                                + stats["dropped_future"] + stats["dropped_bad_date"])
    if not clean:
        stats["zero_filled_days"] = 0
        return pd.Series(dtype=float), stats

    df = pd.DataFrame(clean, columns=["date", "quantity"]).groupby("date")["quantity"].sum()
    full_idx = pd.date_range(df.index.min(), df.index.max(), freq="D")
    stats["zero_filled_days"] = int(len(full_idx) - len(df))
    series = df.reindex(full_idx, fill_value=0.0).astype(float)
    series.index.name = "date"
    return series, stats
