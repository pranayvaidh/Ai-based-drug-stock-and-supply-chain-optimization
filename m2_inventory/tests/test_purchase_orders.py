"""FR-2.6 purchase orders + supplier scoping (TC-12)."""
from m1_auth_lucky.tests.helpers import oid_of


def _po(db, **kw):
    body = {"drug_id": oid_of(db, "drugs", "Atorvastatin 10 mg"),
            "branch_id": oid_of(db, "branches", "Malviya Nagar Pharmacy"),
            "supplier_id": oid_of(db, "suppliers", "MedLine Wholesale"), "quantity": 50}
    body.update(kw)
    return body


def test_create_po_starts_pending(client, db, hdr):
    res = client.post("/purchase-orders", headers=hdr["pharmacist"], json=_po(db))
    assert res.status_code == 201
    po = res.get_json()
    assert po["status"] == "Pending" and po["supplier_name"] == "MedLine Wholesale" and po["delivered_at"] is None


def test_po_quantity_validation(client, db, hdr):
    for q in (0, -1):
        assert client.post("/purchase-orders", headers=hdr["admin"], json=_po(db, quantity=q)).status_code == 400


def test_po_unknown_supplier(client, db, hdr):
    res = client.post("/purchase-orders", headers=hdr["admin"], json=_po(db, supplier_id="64b000000000000000000000"))
    assert res.status_code == 400


def test_pharmacist_po_only_own_branch(client, db, hdr):
    body = _po(db, branch_id=oid_of(db, "branches", "Jagatpura Pharmacy"))
    assert client.post("/purchase-orders", headers=hdr["pharmacist"], json=body).status_code == 403


def test_supplier_sees_only_own_orders(client, db, hdr):
    client.post("/purchase-orders", headers=hdr["admin"], json=_po(db))  # MedLine
    rpd = oid_of(db, "suppliers", "Rajasthan Pharma Distributors")
    mine = client.get("/purchase-orders?limit=100", headers=hdr["supplier"]).get_json()["items"]
    assert mine and all(p["supplier_id"] == rpd for p in mine)
    all_orders = client.get("/purchase-orders?limit=100", headers=hdr["admin"]).get_json()
    assert all_orders["total"] == 6


def test_supplier_cannot_create_po(client, db, hdr):
    assert client.post("/purchase-orders", headers=hdr["supplier"], json=_po(db)).status_code == 403


def test_pharmacist_list_scoped_to_branch(client, db, hdr):
    mn = oid_of(db, "branches", "Malviya Nagar Pharmacy")
    items = client.get("/purchase-orders", headers=hdr["pharmacist"]).get_json()["items"]
    assert items and all(p["branch_id"] == mn for p in items)


def test_status_workflow_not_built_yet(client, db, hdr):
    po = db.purchase_orders.find_one({})
    res = client.put(f"/purchase-orders/{po['_id']}/status", headers=hdr["admin"], json={"status": "Confirmed"})
    assert res.status_code in (404, 405)  # FR-2.7 planned for Sprint 4
