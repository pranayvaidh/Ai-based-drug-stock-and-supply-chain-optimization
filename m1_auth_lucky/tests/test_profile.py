"""GET/PUT /users/me: FR-1.5."""
from .helpers import login


def test_get_profile_resolves_names(client, hdr):
    res = client.get("/users/me", headers=hdr["supplier"])
    assert res.status_code == 200
    u = res.get_json()["user"]
    assert u["email"] == "supplier@demo.com"
    assert u["supplier_name"] == "Rajasthan Pharma Distributors"
    assert "password_hash" not in u


def test_update_name(client, hdr):
    res = client.put("/users/me", headers=hdr["pharmacist"], json={"name": "Priya S."})
    assert res.status_code == 200
    assert res.get_json()["user"]["name"] == "Priya S."
    assert client.get("/users/me", headers=hdr["pharmacist"]).get_json()["user"]["name"] == "Priya S."


def test_cannot_change_email_or_role(client, hdr):
    res = client.put("/users/me", headers=hdr["pharmacist"], json={"role": "admin"})
    assert res.status_code == 400


def test_change_password_requires_old_password(client, hdr):
    bad = client.put("/users/me", headers=hdr["pharmacist"],
                     json={"current_password": "wrong", "new_password": "NewPass@99"})
    assert bad.status_code == 400
    assert "current_password" in bad.get_json()["error"]["details"]
    short = client.put("/users/me", headers=hdr["pharmacist"],
                       json={"current_password": "Demo@1234", "new_password": "short"})
    assert short.status_code == 400
    ok = client.put("/users/me", headers=hdr["pharmacist"],
                    json={"current_password": "Demo@1234", "new_password": "NewPass@99"})
    assert ok.status_code == 200 and ok.get_json()["password_changed"] is True
    login(client, "pharmacist@demo.com", "NewPass@99")
