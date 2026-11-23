"""FR-2.3 stock batches, TC-04."""
from datetime import date, timedelta

from m1_auth_lucky.tests.helpers import oid_of


def _batch(db, **kw):
    body = {"drug_id": oid_of(db, "drugs", "Metformin 500 mg"),
            "branch_id": oid_of(db, "branches", "Malviya Nagar Pharmacy"),
            "supplier_id": oid_of(db, "suppliers", "MedLine Wholesale"),
            "batch_no": "TEST-001", "quantity": 100,
            "expiry_date": (date.today() + timedelta(days=200)).isoformat()}
    body.update(kw)
    return body


def test_tc04_add_batch_and_see_it(client, db, hdr):
    res = client.post("/stock", headers=hdr["pharmacist"], json=_batch(db))
    assert res.status_code == 201
    b = res.get_json()
    assert b["batch_no"] == "TEST-001" and b["quantity"] == 100 and b["days_to_expiry"] == 200
    listed = client.get(f"/stock?drug_id={b['drug_id']}&branch_id={b['branch_id']}&limit=100",
                        headers=hdr["pharmacist"]).get_json()
    assert "TEST-001" in [x["batch_no"] for x in listed["items"]]


def test_expiry_must_be_future(client, db, hdr):
    res = client.post("/stock", headers=hdr["admin"], json=_batch(db, expiry_date=date.today().isoformat()))
    assert res.status_code == 400 and "expiry_date" in res.get_json()["error"]["details"]


def test_quantity_positive_integer(client, db, hdr):
    for bad in (0, -5, 2.5, "abc"):
        res = client.post("/stock", headers=hdr["admin"], json=_batch(db, quantity=bad))
        assert res.status_code == 400, bad


def test_unknown_reference(client, db, hdr):
    res = client.post("/stock", headers=hdr["admin"], json=_batch(db, drug_id="64b000000000000000000000"))
    assert res.status_code == 400 and res.get_json()["error"]["details"]["drug_id"] == "Not found"


def test_pharmacist_cannot_add_to_other_branch(client, db, hdr):
    body = _batch(db, branch_id=oid_of(db, "branches", "Vaishali Nagar Pharmacy"))
    res = client.post("/stock", headers=hdr["pharmacist"], json=body)
    assert res.status_code == 403


def test_duplicate_batch_no(client, db, hdr):
    assert client.post("/stock", headers=hdr["admin"], json=_batch(db)).status_code == 201
    assert client.post("/stock", headers=hdr["admin"], json=_batch(db)).status_code == 409


def test_totals_grouping(client, db, hdr):
    bid = oid_of(db, "branches", "Malviya Nagar Pharmacy")
    res = client.get(f"/stock?group=totals&branch_id={bid}&limit=100", headers=hdr["admin"]).get_json()
    assert res["group"] == "totals" and res["total"] == 12
    row = res["items"][0]
    assert row["total_quantity"] > 0 and row["batch_count"] >= 2 and row["nearest_expiry"]
