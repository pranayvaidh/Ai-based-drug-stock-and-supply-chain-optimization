"""Seed master data, stock batches and purchase orders. Idempotent (upserts by natural key).

All names are fictional. Expiry dates are relative to today, so the demo always has
near-expiry batches for FEFO.
"""
import random
from datetime import datetime, timedelta

from .models import midnight, today

BRANCHES = [
    {"name": "Central Warehouse Jaipur", "type": "warehouse", "location": "Sitapura Industrial Area, Jaipur"},
    {"name": "Malviya Nagar Pharmacy", "type": "pharmacy", "location": "Malviya Nagar, Jaipur"},
    {"name": "Vaishali Nagar Pharmacy", "type": "pharmacy", "location": "Vaishali Nagar, Jaipur"},
    {"name": "Jagatpura Pharmacy", "type": "pharmacy", "location": "Jagatpura, Jaipur"},
]

SUPPLIERS = [
    {"name": "Rajasthan Pharma Distributors", "contact": "orders@rajpharma.example · +91 141 400 1101",
     "avg_lead_time_days": 5},
    {"name": "MedLine Wholesale", "contact": "supply@medline.example · +91 141 400 2202", "avg_lead_time_days": 7},
    {"name": "Shree Ganesh Medical Agencies", "contact": "sgma@example.in · +91 141 400 3303",
     "avg_lead_time_days": 3},
]

DRUGS = [
    {"name": "Paracetamol 500 mg", "category": "Analgesic", "unit": "strip of 10", "price": 22.0, "strength": "500 mg"},
    {"name": "Amoxicillin 250 mg", "category": "Antibiotic", "unit": "strip of 10", "price": 68.0, "strength": "250 mg"},
    {"name": "Metformin 500 mg", "category": "Antidiabetic", "unit": "strip of 10", "price": 35.0, "strength": "500 mg"},
    {"name": "Cetirizine 10 mg", "category": "Antihistamine", "unit": "strip of 10", "price": 18.0, "strength": "10 mg"},
    {"name": "Azithromycin 500 mg", "category": "Antibiotic", "unit": "strip of 3", "price": 119.0, "strength": "500 mg"},
    {"name": "Pantoprazole 40 mg", "category": "Antacid", "unit": "strip of 10", "price": 95.0, "strength": "40 mg"},
    {"name": "ORS Sachet", "category": "Electrolyte", "unit": "sachet", "price": 21.0, "strength": "21.8 g"},
    {"name": "Dextromethorphan Syrup 100 ml", "category": "Cough & Cold", "unit": "bottle", "price": 105.0,
     "strength": "10 mg/5 ml"},
    {"name": "Insulin Glargine 100 IU/ml", "category": "Antidiabetic", "unit": "vial", "price": 780.0,
     "strength": "100 IU/ml"},
    {"name": "Atorvastatin 10 mg", "category": "Cardiovascular", "unit": "strip of 10", "price": 64.0,
     "strength": "10 mg"},
    {"name": "Vitamin D3 60K", "category": "Supplement", "unit": "strip of 4", "price": 132.0, "strength": "60000 IU"},
    {"name": "Ibuprofen 400 mg", "category": "Analgesic", "unit": "strip of 10", "price": 28.0, "strength": "400 mg"},
]

PHARMACIES = ["Malviya Nagar Pharmacy", "Vaishali Nagar Pharmacy", "Jagatpura Pharmacy"]
BRANCH_CODES = {"Malviya Nagar Pharmacy": "MN", "Vaishali Nagar Pharmacy": "VN", "Jagatpura Pharmacy": "JP"}

PURCHASE_ORDERS = [  # (seed_key, drug, branch, supplier, qty, status, created_days_ago)
    ("PO-SEED-1", "Paracetamol 500 mg", "Malviya Nagar Pharmacy", "Rajasthan Pharma Distributors", 200, "Pending", 2),
    ("PO-SEED-2", "Amoxicillin 250 mg", "Vaishali Nagar Pharmacy", "MedLine Wholesale", 120, "Pending", 3),
    ("PO-SEED-3", "ORS Sachet", "Jagatpura Pharmacy", "Shree Ganesh Medical Agencies", 300, "Pending", 1),
    ("PO-SEED-4", "Insulin Glargine 100 IU/ml", "Malviya Nagar Pharmacy", "MedLine Wholesale", 20, "Pending", 4),
    ("PO-SEED-5", "Cetirizine 10 mg", "Malviya Nagar Pharmacy", "Rajasthan Pharma Distributors", 150, "Delivered", 18),
]


def _upsert_by_name(coll, docs):
    ids = {}
    for d in docs:
        coll.update_one({"name": d["name"]}, {"$set": d}, upsert=True)
        ids[d["name"]] = coll.find_one({"name": d["name"]}, {"_id": 1})["_id"]
    return ids


def seed_inventory(db):
    rng = random.Random(7)  # deterministic
    branch_ids = _upsert_by_name(db.branches, BRANCHES)
    supplier_ids = _upsert_by_name(db.suppliers, SUPPLIERS)
    drug_ids = _upsert_by_name(db.drugs, DRUGS)
    sup_names = [s["name"] for s in SUPPLIERS]
    t = today()
    now = datetime.utcnow()

    batches = 0
    for di, drug in enumerate(DRUGS):
        for branch in PHARMACIES:
            n = 2 + ((di + PHARMACIES.index(branch)) % 2)  # 2 or 3 batches
            for k in range(n):
                if k == 0:  # earliest batch: near expiry (15–75 days) and small, so FEFO is visible
                    exp_days, qty = rng.choice([15, 22, 30, 45, 60, 75]), rng.randint(20, 45)
                elif k == 1:
                    exp_days, qty = rng.randint(120, 300), rng.randint(60, 160)
                else:
                    exp_days, qty = rng.randint(330, 540), rng.randint(80, 200)
                batch_no = f"{BRANCH_CODES[branch]}-{di + 1:02d}{chr(65 + k)}-{(t.year % 100):02d}"
                key = {"drug_id": drug_ids[drug["name"]], "branch_id": branch_ids[branch], "batch_no": batch_no}
                doc = {**key, "supplier_id": supplier_ids[sup_names[(di + k) % 3]], "quantity": qty,
                       "expiry_date": midnight(t + timedelta(days=exp_days)),
                       "received_at": now - timedelta(days=rng.randint(10, 90))}
                db.stock_batches.update_one(key, {"$set": doc}, upsert=True)
                batches += 1

    admin = db.users.find_one({"email": "admin@demo.com"}, {"_id": 1})
    for key, drug, branch, sup, qty, status, ago in PURCHASE_ORDERS:
        created = now - timedelta(days=ago)
        doc = {"seed_key": key, "drug_id": drug_ids[drug], "branch_id": branch_ids[branch],
               "supplier_id": supplier_ids[sup], "quantity": qty, "status": status,
               "created_by": admin["_id"] if admin else None, "created_at": created,
               "delivered_at": created + timedelta(days=5) if status == "Delivered" else None}
        db.purchase_orders.update_one({"seed_key": key}, {"$set": doc}, upsert=True)

    return {"branches": len(BRANCHES), "suppliers": len(SUPPLIERS), "drugs": len(DRUGS),
            "stock_batches": batches, "purchase_orders": len(PURCHASE_ORDERS)}
