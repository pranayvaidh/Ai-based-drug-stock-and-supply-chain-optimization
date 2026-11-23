"""End-to-end Module 3 demo against the RUNNING ML service (§7.4).

    python m3_ml_kushagra/scripts/demo_forecast.py [--service-url http://localhost:5051] [--key KEY]

1. Reads data/sales_history.csv and calls POST /ml/forecast for 3 series
2. Prints a MAPE comparison table and saves outputs/forecast_<drug>_<branch>.png
3. Prints the SRS worked reorder example using reorder.py (ROP 70, qty 80)
4. Calls POST /ml/anomaly and prints the 501 "planned Sprint 6" response
"""
import argparse
import csv
import json
import os
import re
import sys
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
M3 = HERE.parent
sys.path.insert(0, str(M3.parent))

from dotenv import load_dotenv  # noqa: E402

from m3_ml_kushagra.ml_service.reorder import reorder_point, reorder_quantity  # noqa: E402

load_dotenv(M3.parent / ".env")

SERIES = [  # (drug, branch, why)
    ("Paracetamol 500 mg", "Malviya Nagar Pharmacy", "long history, weekly pattern + spike"),
    ("Metformin 500 mg", "Malviya Nagar Pharmacy", "steady trend - regression likely wins"),
    ("Insulin Glargine 100 IU/ml", "Jagatpura Pharmacy", "only 40 days - moving-average fallback"),
]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def load_rows():
    with open(M3 / "data" / "sales_history.csv", newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def fmt(v):
    return "-" if v is None else f"{v:.2f}"


def plot(drug, branch, sales, result, out_dir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt
    import pandas as pd

    from m3_ml_kushagra.ml_service.preprocessing import build_daily_series

    series, _ = build_daily_series(sales)
    hist = series.iloc[-60:]
    pred = pd.DataFrame(result["daily_predictions"])
    pred["date"] = pd.to_datetime(pred["date"])
    fig, ax = plt.subplots(figsize=(10, 4.2), dpi=110)
    ax.plot(hist.index, hist.values, color="#1d4ed8", lw=1.6, label="Actual (last 60 days)")
    ax.plot(pred["date"], pred["yhat"], color="#ea580c", lw=1.8, ls="--", label=f"Forecast ({result['model_used']})")
    ax.fill_between(pred["date"], pred["yhat_lower"], pred["yhat_upper"], color="#fb923c", alpha=0.2,
                    label="Interval")
    mape = result["mape"]
    ax.set_title(f"{drug} @ {branch}\nMAPE {fmt(mape)}% · confidence {result['confidence']}", fontsize=11)
    ax.set_ylabel("Units / day")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%d %b"))
    ax.grid(alpha=0.25)
    ax.legend(loc="upper left", fontsize=8, frameon=False)
    fig.tight_layout()
    out = out_dir / f"forecast_{slug(drug)}_{slug(branch)}.png"
    fig.savefig(out)
    plt.close(fig)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--service-url", default=os.getenv("ML_SERVICE_URL", "http://localhost:5051"))
    ap.add_argument("--key", default=os.getenv("ML_SERVICE_KEY", "dev-ml-service-key"))
    args = ap.parse_args()
    base = args.service_url.rstrip("/")
    headers = {"X-Service-Key": args.key}

    try:
        health = requests.get(f"{base}/health", timeout=5).json()
    except requests.RequestException as exc:
        print(f"ML service not reachable at {base} ({exc}).\nStart it with: python -m m3_ml_kushagra.ml_service.app")
        sys.exit(1)
    print(f"ML service: {base}  prophet_available={health.get('prophet_available')}\n")

    rows = load_rows()
    out_dir = M3 / "outputs"
    out_dir.mkdir(exist_ok=True)
    table, pngs = [], []
    for drug, branch, why in SERIES:
        sales = [{"date": r["date"], "quantity": r["quantity"]} for r in rows
                 if r["drug_name"] == drug and r["branch_name"] == branch]
        res = requests.post(f"{base}/ml/forecast", headers=headers, timeout=120,
                            json={"drug_id": drug, "branch_id": branch, "horizon_days": 30, "sales": sales})
        if res.status_code != 200:
            print(f"forecast failed for {drug} @ {branch}: {res.status_code} {res.text}")
            sys.exit(1)
        r = res.json()
        c = r["candidates"]
        chosen = r["model_used"]
        if chosen == "moving_average_14d":
            chosen += f" (MAPE {fmt(r['mape'])})"
        table.append([drug, branch, str(r["history_days"]), fmt(c.get("prophet", {}).get("mape")),
                      fmt(c.get("linear_regression", {}).get("mape")), chosen, r["confidence"],
                      f"{r['avg_daily_demand']:.2f}"])
        pngs.append(plot(drug, branch, sales, r, out_dir))
        print(f"  ✓ {drug} @ {branch}: {why}; preprocessing={r['preprocessing']}")

    head = ["drug", "branch", "history days", "prophet MAPE", "regression MAPE", "chosen model", "confidence",
            "avg daily demand"]
    widths = [max(len(h), *(len(row[i]) for row in table)) for i, h in enumerate(head)]
    line = "+".join("-" * (w + 2) for w in widths)
    print("\n" + line)
    print("|".join(f" {h:<{w}} " for h, w in zip(head, widths)))
    print(line)
    for row in table:
        print("|".join(f" {v:<{w}} " for v, w in zip(row, widths)))
    print(line)
    print("Model choice: both models are trained on the first 80% of days and scored on the most recent 20%;")
    print("the lower-MAPE model is refit on 100% and used. History < 60 days -> 14-day moving average.\n")
    print("Charts saved:")
    for p in pngs:
        print(f"  {p}")

    print("\nSRS worked example (reorder.py, FR-3.4):")
    d, lead, ss, stock, review = 10, 5, 20, 60, 7
    rop = reorder_point(d, lead, ss)
    qty = reorder_quantity(d, lead, review, ss, stock, on_order=0)
    print(f"  d={d}/day, L={lead} days, safety stock={ss}  ->  ROP = d*L + SS = {rop:g}")
    print(f"  stock={stock}, R={review} days           ->  reorder qty = d*(L+R) + SS - stock = {qty:g}")

    print("\nPOST /ml/anomaly (skeleton):")
    an = requests.post(f"{base}/ml/anomaly", headers=headers, timeout=10,
                       json={"sales": [{"date": "2026-10-01", "quantity": 5}], "z_limit": 3})
    print(f"  HTTP {an.status_code}")
    print("  " + json.dumps(an.json(), ensure_ascii=False))


if __name__ == "__main__":
    main()
