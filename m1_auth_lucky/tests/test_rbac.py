"""Role decorators: FR-1.4, TC-03, TC-12, token errors."""
from datetime import timedelta

from flask_jwt_extended import create_access_token

from .helpers import auth


def test_tc03_pharmacist_cannot_use_admin_route(client, hdr):
    res = client.post("/drugs", headers=hdr["pharmacist"],
                      json={"name": "Test", "category": "X", "unit": "strip", "price": 1})
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "FORBIDDEN"


def test_admin_can_use_admin_route(client, hdr):
    res = client.post("/drugs", headers=hdr["admin"],
                      json={"name": "Test Drug 5 mg", "category": "Other", "unit": "strip of 10", "price": 10})
    assert res.status_code == 201


def test_supplier_cannot_read_inventory(client, hdr):
    assert client.get("/drugs", headers=hdr["supplier"]).status_code == 403
    assert client.get("/stock", headers=hdr["supplier"]).status_code == 403


def test_tc12_supplier_cannot_open_other_suppliers_po(client, db, hdr):
    rpd = db.suppliers.find_one({"name": "Rajasthan Pharma Distributors"})["_id"]
    po = db.purchase_orders.find_one({"supplier_id": rpd})
    res = client.get(f"/purchase-orders/{po['_id']}", headers=hdr["supplier2"])
    assert res.status_code == 403
    assert res.get_json()["error"]["code"] == "FORBIDDEN"
    assert client.get(f"/purchase-orders/{po['_id']}", headers=hdr["supplier"]).status_code == 200


def test_missing_token_401(client):
    res = client.get("/users/me")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_garbage_token_401(client):
    res = client.get("/users/me", headers=auth("not.a.jwt"))
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "UNAUTHORIZED"


def test_expired_token_rejected(app, client, db):
    user = db.users.find_one({"email": "admin@demo.com"})
    with app.app_context():
        token = create_access_token(identity=str(user["_id"]), additional_claims={"role": "admin"},
                                    expires_delta=timedelta(seconds=-5))
    res = client.get("/users/me", headers=auth(token))
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "TOKEN_EXPIRED"


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.get_json()["db"] == "up"
