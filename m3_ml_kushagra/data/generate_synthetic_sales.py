"""Deterministic synthetic sales history (Form-3C wk 4).

    python m3_ml_kushagra/data/generate_synthetic_sales.py [--end YYYY-MM-DD]

3 pharmacy branches x 12 drugs, 240 days ending yesterday (or --end).
quantity = base x weekly pattern x trend x season + Poisson noise, plus:
  * Insulin Glargine @ Jagatpura has only the last 40 days (moving-average fallback demo)
  * a ~5x demand spike for 2 days: Paracetamol @ Malviya Nagar ~3 weeks ago (anomaly demo)
  * a few missing days and 4 bad rows (negative / text qty) for preprocessing to clean
"""
import argparse
import csv
from datetime import date, timedelta
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parent / "sales_history.csv"
DAYS = 240

BRANCHES = {"Malviya Nagar Pharmacy": 1.15, "Vaishali Nagar Pharmacy": 1.0, "Jagatpura Pharmacy": 0.8}
# drug: (base daily demand, season type, trend per 240 days)
DRUGS = {
    "Paracetamol 500 mg": (38, "winter_mild", 0.08),
    "Amoxicillin 250 mg": (14, "winter_mild", 0.0),
    "Metformin 500 mg": (24, None, 0.05),
    "Cetirizine 10 mg": (16, "winter", 0.0),
    "Azithromycin 500 mg": (6, "winter_mild", 0.0),
    "Pantoprazole 40 mg": (20, None, 0.04),
    "ORS Sachet": (26, "summer", 0.0),
    "Dextromethorphan Syrup 100 ml": (9, "winter", 0.0),
    "Insulin Glargine 100 IU/ml": (3, None, 0.0),
    "Atorvastatin 10 mg": (15, None, 0.35),   # strong linear trend -> regression tends to win
    "Vitamin D3 60K": (6, "winter_mild", 0.1),
    "Ibuprofen 400 mg": (17, None, 0.0),
}
WEEKLY = {0: 1.18, 1: 1.0, 2: 0.95, 3: 0.97, 4: 1.02, 5: 1.2, 6: 0.78}  # Mon & Sat higher


def season_factor(kind, d):
    m = d.month
    if kind == "winter":
        return {11: 1.35, 12: 1.6, 1: 1.6, 2: 1.35, 10: 1.1}.get(m, 0.85)
    if kind == "winter_mild":
        return {11: 1.15, 12: 1.25, 1: 1.25, 2: 1.1}.get(m, 0.95)
    if kind == "summer":
        return {4: 1.4, 5: 1.7, 6: 1.7, 7: 1.4, 8: 1.15}.get(m, 0.8)
    return 1.0


def generate(end):
    rng = np.random.default_rng(42)
    start = end - timedelta(days=DAYS - 1)
    rows = []
    for drug, (base, season, trend) in DRUGS.items():
        for branch, bscale in BRANCHES.items():
            for i in range(DAYS):
                d = start + timedelta(days=i)
                if drug.startswith("Insulin") and branch == "Jagatpura Pharmacy" and i < DAYS - 40:
                    continue
                lam = base * bscale * WEEKLY[d.weekday()] * (1 + trend * i / DAYS) * season_factor(season, d)
                qty = int(rng.poisson(max(lam, 0.1)))
                if drug.startswith("Paracetamol") and branch == "Malviya Nagar Pharmacy" and \
                        (end - d).days in (21, 22):
                    qty = int(round(lam * 5))
                rows.append([d.isoformat(), drug, branch, qty])
    # a few missing days (preprocessing zero-fills them)
    drop = {int(x) for x in rng.choice(len(rows), size=12, replace=False)}
    rows = [r for idx, r in enumerate(rows) if idx not in drop]
    # obviously bad rows
    rows += [
        [(start + timedelta(days=30)).isoformat(), "Metformin 500 mg", "Vaishali Nagar Pharmacy", -6],
        [(start + timedelta(days=75)).isoformat(), "Ibuprofen 400 mg", "Jagatpura Pharmacy", "ten"],
        [(start + timedelta(days=120)).isoformat(), "Cetirizine 10 mg", "Malviya Nagar Pharmacy", -2],
        [(start + timedelta(days=160)).isoformat(), "ORS Sachet", "Vaishali Nagar Pharmacy", "n/a"],
    ]
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--end", help="last date (default: yesterday)")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()
    end = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)
    rows = generate(end)
    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["date", "drug_name", "branch_name", "quantity"])
        w.writerows(rows)
    print(f"wrote {len(rows)} rows ({end - timedelta(days=DAYS - 1)} .. {end}) -> {args.out}")


if __name__ == "__main__":
    main()
