"""Seed demo users (password for all: Demo@1234). Idempotent: upserts by email.

Requires branches and suppliers to exist (run via scripts/seed_all.py).
"""
from datetime import datetime

import bcrypt as _bcrypt

DEMO_PASSWORD = "Demo@1234"

DEMO_USERS = [
    {"name": "Asha Admin", "email": "admin@demo.com", "role": "admin"},
    {"name": "Priya Sharma", "email": "pharmacist@demo.com", "role": "pharmacist",
     "branch": "Malviya Nagar Pharmacy"},
    {"name": "Rohit Meena", "email": "pharmacist2@demo.com", "role": "pharmacist",
     "branch": "Vaishali Nagar Pharmacy"},
    {"name": "Vikram Singh", "email": "supplier@demo.com", "role": "supplier",
     "supplier": "Rajasthan Pharma Distributors"},
    {"name": "Neha Agarwal", "email": "supplier2@demo.com", "role": "supplier",
     "supplier": "MedLine Wholesale"},
]


def seed_users(db, rounds=12):
    pw_hash = _bcrypt.hashpw(DEMO_PASSWORD.encode(), _bcrypt.gensalt(rounds=rounds)).decode()
    count = 0
    for u in DEMO_USERS:
        branch = db.branches.find_one({"name": u["branch"]}) if u.get("branch") else None
        supplier = db.suppliers.find_one({"name": u["supplier"]}) if u.get("supplier") else None
        if u.get("branch") and not branch:
            raise RuntimeError(f"Branch {u['branch']!r} missing - seed inventory first")
        if u.get("supplier") and not supplier:
            raise RuntimeError(f"Supplier {u['supplier']!r} missing - seed inventory first")
        doc = {
            "name": u["name"], "email": u["email"], "role": u["role"],
            "branch_id": branch["_id"] if branch else None,
            "supplier_id": supplier["_id"] if supplier else None,
            "password_hash": pw_hash,
        }
        db.users.update_one({"email": u["email"]},
                            {"$set": doc, "$setOnInsert": {"created_at": datetime.utcnow()}}, upsert=True)
        count += 1
    return count
