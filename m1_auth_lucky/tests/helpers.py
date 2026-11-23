"""Test helpers shared by Module 1 and Module 2 tests (mongomock, no real MongoDB needed)."""
import mongomock

from m1_auth_lucky.backend.app import create_app
from m1_auth_lucky.backend.seed_users import DEMO_PASSWORD, seed_users
from m2_inventory.backend.seed_inventory import seed_inventory


def make_app(**overrides):
    cfg = {"TESTING": True, "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-32b", "BCRYPT_LOG_ROUNDS": 4,
           "MONGO_DB": "dsc_test"}
    cfg.update(overrides)
    app = create_app(cfg, mongo_client=mongomock.MongoClient())
    db = app.extensions["mongo_db"]
    seed_inventory(db)
    seed_users(db, rounds=4)
    seed_inventory(db)
    return app


def login(client, email, password=DEMO_PASSWORD):
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.get_json()
    return res.get_json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def oid_of(db, collection, name):
    return str(db[collection].find_one({"name": name})["_id"])
