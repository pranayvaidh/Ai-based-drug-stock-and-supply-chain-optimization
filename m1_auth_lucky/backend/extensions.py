"""Shared extensions: MongoDB handle, JWT manager, bcrypt.

M2 blueprints import ``get_db`` and ``bcrypt`` from here — that is the real
"auth connected with inventory" integration point (Form-3A wk 11).
"""
from flask import current_app
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError

jwt = JWTManager()
bcrypt = Bcrypt()


def connect_mongo(uri, db_name, timeout_ms=3000):
    """Create a client and ping it. Raises RuntimeError with a clear message if Mongo is down."""
    client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
    try:
        client.admin.command("ping")
    except PyMongoError as exc:
        raise RuntimeError(
            f"Cannot reach MongoDB at {uri!r}. Start MongoDB (local service or "
            f"`docker compose up -d`) and check MONGO_URI in .env. Details: {exc}"
        ) from exc
    return client, client[db_name]


def get_db():
    return current_app.extensions["mongo_db"]


def get_client():
    return current_app.extensions["mongo_client"]


def supports_transactions():
    """True only on a replica set / mongos; standalone servers and mongomock return False."""
    try:
        hello = get_client().admin.command("hello")
        return bool(hello.get("setName") or hello.get("msg") == "isdbgrid")
    except Exception:  # noqa: BLE001 - mongomock or old server
        return False


def ensure_indexes(db):
    """Create collections + indexes from SRS §5.3.1. Safe to call repeatedly."""
    existing = set(db.list_collection_names())
    for name in ("users", "branches", "drugs", "suppliers", "stock_batches", "sales",
                 "purchase_orders", "forecasts", "alerts", "settings"):
        if name not in existing:
            try:
                db.create_collection(name)
            except Exception:  # noqa: BLE001 - race / already exists
                pass
    db.users.create_index([("email", ASCENDING)], unique=True, name="uniq_email")
    db.sales.create_index([("drug_id", ASCENDING), ("branch_id", ASCENDING), ("sale_date", ASCENDING)],
                          name="sales_drug_branch_date")
    db.stock_batches.create_index([("drug_id", ASCENDING), ("branch_id", ASCENDING), ("expiry_date", ASCENDING)],
                                  name="stock_drug_branch_expiry")
    db.forecasts.create_index([("drug_id", ASCENDING), ("branch_id", ASCENDING)], unique=True,
                              name="uniq_forecast_drug_branch")
    db.alerts.create_index([("resolved", ASCENDING), ("type", ASCENDING)], name="alerts_resolved_type")
    db.purchase_orders.create_index([("supplier_id", ASCENDING), ("created_at", ASCENDING)], name="po_supplier")
