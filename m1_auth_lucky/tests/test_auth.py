"""Registration and login: FR-1.1 – FR-1.3, TC-01, TC-02."""
import bcrypt
from flask_jwt_extended import decode_token

from .helpers import oid_of


def _reg(client, **kw):
    body = {"name": "New Pharmacist", "email": "new.pharm@demo.com", "password": "Strong@123", "role": "admin"}
    body.update(kw)
    return client.post("/auth/register", json=body)


def test_tc01_password_is_bcrypt_hashed(client, db):
    res = _reg(client)
    assert res.status_code == 201
    assert "password_hash" not in res.get_json()["user"]
    stored = db.users.find_one({"email": "new.pharm@demo.com"})
    assert stored["password_hash"] != "Strong@123"
    assert stored["password_hash"].startswith("$2")
    assert bcrypt.checkpw(b"Strong@123", stored["password_hash"].encode())


def test_register_pharmacist_requires_existing_branch(client, db):
    assert _reg(client, role="pharmacist").status_code == 400
    bid = oid_of(db, "branches", "Jagatpura Pharmacy")
    res = _reg(client, role="pharmacist", branch_id=bid)
    assert res.status_code == 201
    assert res.get_json()["user"]["branch_id"] == bid


def test_register_supplier_requires_supplier(client, db):
    res = _reg(client, role="supplier")
    assert res.status_code == 400
    assert "supplier_id" in res.get_json()["error"]["details"]


def test_duplicate_email_rejected(client):
    assert _reg(client).status_code == 201
    res = _reg(client, email="NEW.PHARM@demo.com")  # emails are case-insensitive
    assert res.status_code == 409
    assert res.get_json()["error"]["code"] == "EMAIL_EXISTS"


def test_short_password_rejected(client):
    res = _reg(client, password="Abc@123")  # 7 chars
    assert res.status_code == 400
    body = res.get_json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert "8 characters" in body["details"]["password"]


def test_invalid_role_rejected(client):
    res = _reg(client, role="superuser")
    assert res.status_code == 400
    assert "role" in res.get_json()["error"]["details"]


def test_tc02_wrong_password_401(client):
    res = client.post("/auth/login", json={"email": "admin@demo.com", "password": "wrong-password"})
    assert res.status_code == 401
    assert res.get_json()["error"]["message"] == "Invalid email or password"
    res2 = client.post("/auth/login", json={"email": "nobody@demo.com", "password": "whatever1"})
    assert res2.status_code == 401
    assert res2.get_json()["error"]["message"] == "Invalid email or password"


def test_login_returns_jwt_with_role_and_expiry(app, client):
    res = client.post("/auth/login", json={"email": "Pharmacist@Demo.com", "password": "Demo@1234"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["expires_in"] == 3600
    assert data["user"]["role"] == "pharmacist"
    assert data["user"]["branch_name"] == "Malviya Nagar Pharmacy"
    with app.app_context():
        claims = decode_token(data["access_token"])
    assert claims["role"] == "pharmacist"
    assert claims["sub"] == data["user"]["id"]
    assert "exp" in claims


def test_login_validation(client):
    res = client.post("/auth/login", json={"email": ""})
    assert res.status_code == 400
