"""Seed everything:  python scripts/seed_all.py [--reset] [--with-sales]

  --reset       drop all collections first, then recreate indexes and seed
  --with-sales  also load m3_ml_kushagra/data/sales_history.csv through the same
                validation code as POST /sales/upload (historical sales, no stock change)

Idempotent: running it twice gives the same data.
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from m1_auth_lucky.backend.config import Config  # noqa: E402
from m1_auth_lucky.backend.extensions import connect_mongo, ensure_indexes  # noqa: E402
from m1_auth_lucky.backend.seed_users import DEMO_PASSWORD, seed_users  # noqa: E402
from m2_inventory_kunal.backend.sales.csv_upload import import_sales_csv  # noqa: E402
from m2_inventory_kunal.backend.seed_inventory import seed_inventory  # noqa: E402

SALES_CSV = ROOT / "m3_ml_kushagra" / "data" / "sales_history.csv"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--reset", action="store_true", help="drop and recreate all collections")
    ap.add_argument("--with-sales", action="store_true", help="load the synthetic sales history CSV")
    args = ap.parse_args()

    try:
        client, db = connect_mongo(Config.MONGO_URI, Config.MONGO_DB)
    except RuntimeError as exc:
        print(f"[seed] {exc}", file=sys.stderr)
        sys.exit(1)

    if args.reset:
        for name in db.list_collection_names():
            db.drop_collection(name)
        print(f"[seed] reset: dropped all collections in '{Config.MONGO_DB}'")
    ensure_indexes(db)

    inv = seed_inventory(db)
    n_users = seed_users(db)
    seed_inventory(db)  # second pass links seeded POs to the admin user created above
    print(f"[seed] branches={inv['branches']} suppliers={inv['suppliers']} drugs={inv['drugs']} "
          f"stock_batches={inv['stock_batches']} purchase_orders={inv['purchase_orders']}")
    print(f"[seed] users={n_users}  (password for all demo users: {DEMO_PASSWORD})")

    if args.with_sales:
        if not SALES_CSV.exists():
            print(f"[seed] {SALES_CSV} not found - run m3_ml_kushagra/data/generate_synthetic_sales.py",
                  file=sys.stderr)
            sys.exit(1)
        admin = db.users.find_one({"email": "admin@demo.com"})
        res = import_sales_csv(db, SALES_CSV.read_bytes(), recorded_by=str(admin["_id"]))
        print(f"[seed] sales history: total_rows={res['total_rows']} saved={res['saved']} "
              f"rejected={res['rejected_count']}")
    print("[seed] done.")


if __name__ == "__main__":
    main()
