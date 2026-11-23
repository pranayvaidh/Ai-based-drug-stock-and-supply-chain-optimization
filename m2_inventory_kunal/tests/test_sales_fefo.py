"""FR-2.4 FEFO sales, TC-05."""
from datetime import date, datetime, timedelta

from m1_auth_lucky.tests.helpers import oid_of
from m2_inventory_kunal.backend.sales.fefo import plan_fefo


def _qty_by_batch(db, drug_id, branch_id):
    from bson import ObjectId
    return {b["batch_no"]: b["quantity"] for b in
            db.stock_batches.find({"drug_id": ObjectId(drug_id), "branch_id": ObjectId(branch_id)})}


def _setup_two_batches(db):
    """Replace seeded Paracetamol@Malviya batches with two known ones (later one inserted first)."""
    drug = db.drugs.find_one({"name": "Paracetamol 500 mg"})["_id"]
    branch = db.branches.find_one({"name": "Malviya Nagar Pharmacy"})["_id"]
    sup = db.suppliers.find_one({})["_id"]
    db.stock_batches.delete_many({"drug_id": drug, "branch_id": branch})
    t = datetime.combine(date.today(), datetime.min.time())
    db.stock_batches.insert_many([
        {"drug_id": drug, "branch_id": branch, "supplier_id": sup, "batch_no": "LATE", "quantity": 100,
         "expiry_date": t + timedelta(days=300), "received_at": t},
        {"drug_id": drug, "branch_id": branch, "supplier_id": sup, "batch_no": "EARLY", "quantity": 30,
         "expiry_date": t + timedelta(days=20), "received_at": t},
        {"drug_id": drug, "branch_id": branch, "supplier_id": sup, "batch_no": "EXPIRED", "quantity": 50,
         "expiry_date": t - timedelta(days=1), "received_at": t},
    ])
    return str(drug), str(branch)


def test_fefo_takes_earliest_expiry_first_across_two_batches(client, db, hdr):
    drug, branch = _setup_two_batches(db)
    res = client.post("/sales", headers=hdr["pharmacist"], json={"drug_id": drug, "quantity": 50})
    assert res.status_code == 201, res.get_json()
    used = res.get_json()["batches_used"]
    assert [(u["batch_no"], u["taken"], u["remaining"]) for u in used] == [("EARLY", 30, 0), ("LATE", 20, 80)]
    q = _qty_by_batch(db, drug, branch)
    assert q == {"EARLY": 0, "LATE": 80, "EXPIRED": 50}  # expired batch is never sold
    assert db.sales.count_documents({"source": "manual"}) == 1


def test_tc05_oversell_rejected_and_stock_unchanged(client, db, hdr):
    drug, branch = _setup_two_batches(db)
    before = _qty_by_batch(db, drug, branch)
    res = client.post("/sales", headers=hdr["pharmacist"], json={"drug_id": drug, "quantity": 131})
    assert res.status_code == 400
    err = res.get_json()["error"]
    assert err["code"] == "INSUFFICIENT_STOCK" and err["details"]["available"] == 130
    assert _qty_by_batch(db, drug, branch) == before
    assert db.sales.count_documents({}) == 0


def test_sale_date_cannot_be_future(client, db, hdr):
    drug, _ = _setup_two_batches(db)
    res = client.post("/sales", headers=hdr["pharmacist"],
                      json={"drug_id": drug, "quantity": 1, "sale_date": (date.today() + timedelta(days=1)).isoformat()})
    assert res.status_code == 400


def test_pharmacist_cannot_sell_for_other_branch(client, db, hdr):
    drug, _ = _setup_two_batches(db)
    other = oid_of(db, "branches", "Jagatpura Pharmacy")
    res = client.post("/sales", headers=hdr["pharmacist"], json={"drug_id": drug, "branch_id": other, "quantity": 1})
    assert res.status_code == 403


def test_admin_can_sell_with_branch(client, db, hdr):
    drug, branch = _setup_two_batches(db)
    res = client.post("/sales", headers=hdr["admin"], json={"drug_id": drug, "branch_id": branch, "quantity": 5})
    assert res.status_code == 201
    listed = client.get(f"/sales?branch_id={branch}", headers=hdr["admin"]).get_json()
    assert listed["total"] == 1 and listed["items"][0]["quantity"] == 5


def test_plan_fefo_pure():
    batches = [{"batch_no": "A", "quantity": 5}, {"batch_no": "B", "quantity": 10}]
    plan, avail = plan_fefo(batches, 7)
    assert avail == 15 and [(b["batch_no"], t) for b, t in plan] == [("A", 5), ("B", 2)]
    assert plan_fefo(batches, 16) == (None, 15)
