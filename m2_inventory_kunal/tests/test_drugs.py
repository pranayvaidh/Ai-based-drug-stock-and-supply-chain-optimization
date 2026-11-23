"""FR-2.1 drugs, FR-2.2 suppliers/branches."""
from m1_auth_lucky.tests.helpers import oid_of


def test_list_drugs_paginated_and_search(client, hdr):
    res = client.get("/drugs?limit=5", headers=hdr["pharmacist"])
    data = res.get_json()
    assert res.status_code == 200 and data["total"] == 12 and len(data["items"]) == 5 and data["limit"] == 5
    found = client.get("/drugs?q=para", headers=hdr["pharmacist"]).get_json()
    assert [d["name"] for d in found["items"]] == ["Paracetamol 500 mg"]
    abx = client.get("/drugs?category=Antibiotic", headers=hdr["admin"]).get_json()
    assert abx["total"] == 2


def test_limit_capped_at_100(client, hdr):
    assert client.get("/drugs?limit=500", headers=hdr["admin"]).get_json()["limit"] == 100


def test_create_and_update_drug(client, hdr):
    res = client.post("/drugs", headers=hdr["admin"],
                      json={"name": "Levocetirizine 5 mg", "category": "Antihistamine", "unit": "strip of 10",
                            "price": 45.5})
    assert res.status_code == 201
    did = res.get_json()["id"]
    upd = client.put(f"/drugs/{did}", headers=hdr["admin"], json={"price": 48})
    assert upd.status_code == 200 and upd.get_json()["price"] == 48


def test_drug_validation(client, hdr):
    res = client.post("/drugs", headers=hdr["admin"], json={"name": "X", "category": "Y", "unit": "Z", "price": -1})
    assert res.status_code == 400 and "price" in res.get_json()["error"]["details"]
    dup = client.post("/drugs", headers=hdr["admin"],
                      json={"name": "paracetamol 500 MG", "category": "A", "unit": "B", "price": 1})
    assert dup.status_code == 409


def test_pharmacist_cannot_edit_drugs(client, db, hdr):
    did = oid_of(db, "drugs", "Paracetamol 500 mg")
    assert client.put(f"/drugs/{did}", headers=hdr["pharmacist"], json={"price": 1}).status_code == 403


def test_suppliers_and_branches(client, hdr):
    res = client.post("/suppliers", headers=hdr["admin"],
                      json={"name": "Pink City Pharma", "contact": "pc@example.in", "avg_lead_time_days": 4})
    assert res.status_code == 201 and res.get_json()["avg_lead_time_days"] == 4
    bad = client.post("/suppliers", headers=hdr["admin"], json={"name": "Bad", "contact": "x", "avg_lead_time_days": 0})
    assert bad.status_code == 400
    assert client.get("/suppliers", headers=hdr["pharmacist"]).status_code == 200
    assert client.post("/suppliers", headers=hdr["pharmacist"], json={}).status_code == 403
    br = client.post("/branches", headers=hdr["admin"],
                     json={"name": "Mansarovar Pharmacy", "type": "pharmacy", "location": "Mansarovar"})
    assert br.status_code == 201
    assert client.post("/branches", headers=hdr["admin"],
                       json={"name": "X Y", "type": "shop", "location": "x"}).status_code == 400


def test_public_lists_need_no_auth(client):
    b = client.get("/branches/public").get_json()["items"]
    s = client.get("/suppliers/public").get_json()["items"]
    assert len(b) == 4 and set(b[0]) == {"id", "name", "type"}
    assert len(s) == 3 and set(s[0]) == {"id", "name"}
