from datetime import date

from m3_ml_kushagra.ml_service.preprocessing import build_daily_series


def test_zero_fill_length_and_values():
    recs = [{"date": "2026-01-01", "quantity": 5}, {"date": "2026-01-05", "quantity": "7"}]
    s, st = build_daily_series(recs, today=date(2026, 2, 1))
    assert len(s) == 5 and list(s.values) == [5, 0, 0, 0, 7]
    assert st["zero_filled_days"] == 3


def test_invalid_rows_dropped_and_counted():
    recs = [{"date": "2026-01-01", "quantity": 5}, {"date": "2026-01-02", "quantity": -3},
            {"date": "2026-01-03", "quantity": "ten"}, {"date": "2030-01-01", "quantity": 4},
            {"date": "garbage", "quantity": 1}, {"date": "2026-01-02", "quantity": 2}]
    s, st = build_daily_series(recs, today=date(2026, 2, 1))
    assert st["dropped_negative"] == 1 and st["dropped_non_numeric"] == 1
    assert st["dropped_future"] == 1 and st["dropped_bad_date"] == 1 and st["dropped_invalid"] == 4
    assert list(s.values) == [5, 2]


def test_same_day_rows_summed_and_spikes_kept():
    recs = [{"date": "2026-01-01", "quantity": 5}, {"date": "2026-01-01", "quantity": 3},
            {"date": "2026-01-02", "quantity": 500}]
    s, _ = build_daily_series(recs, today=date(2026, 2, 1))
    assert list(s.values) == [8, 500]


def test_filters_by_drug_and_branch():
    recs = [{"date": "2026-01-01", "quantity": 5, "drug_name": "A", "branch_name": "X"},
            {"date": "2026-01-01", "quantity": 9, "drug_name": "B", "branch_name": "X"}]
    s, st = build_daily_series(recs, drug="A", branch="X", today=date(2026, 2, 1))
    assert st["input_rows"] == 1 and s.iloc[0] == 5
