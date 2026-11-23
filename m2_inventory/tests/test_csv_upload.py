"""FR-2.5 CSV upload."""
import io
from datetime import date, timedelta
from pathlib import Path

SAMPLE = Path(__file__).resolve().parents[1] / "sample_data" / "sales_history_with_errors.csv"


def _upload(client, headers, text, name="sales.csv"):
    data = {"file": (io.BytesIO(text.encode() if isinstance(text, str) else text), name)}
    return client.post("/sales/upload", headers=headers, data=data, content_type="multipart/form-data")


def test_mixed_valid_and_invalid_rows(client, db, hdr):
    stock_before = sum(b["quantity"] for b in db.stock_batches.find())
    future = (date.today() + timedelta(days=3)).isoformat()
    csv_text = "\n".join([
        "date,drug_name,branch_name,quantity",
        "2026-09-01,Paracetamol 500 mg,Malviya Nagar Pharmacy,12",   # ok
        "2026-09-02,paracetamol 500 MG,malviya nagar pharmacy,10",   # ok (case-insensitive)
        "2026-09-02,paracetamol 500 MG,malviya nagar pharmacy,10",   # duplicate
        "2026-09-03,Unknown Drug,Malviya Nagar Pharmacy,4",          # unknown drug
        "2026-09-03,Paracetamol 500 mg,Nowhere Pharmacy,4",          # unknown branch
        "2026-09-04,Paracetamol 500 mg,Malviya Nagar Pharmacy,-3",   # negative
        "2026-09-04,Paracetamol 500 mg,Malviya Nagar Pharmacy,abc",  # text
        f"{future},Paracetamol 500 mg,Malviya Nagar Pharmacy,4",      # future
        "not-a-date,Paracetamol 500 mg,Malviya Nagar Pharmacy,4",    # bad date
        "2026-09-05,ORS Sachet,Jagatpura Pharmacy,0",                # ok (zero allowed)
    ])
    res = _upload(client, hdr["pharmacist"], csv_text)
    assert res.status_code == 200, res.get_json()
    data = res.get_json()
    assert data["total_rows"] == 10 and data["saved"] == 3 and len(data["rejected"]) == 7
    assert [r["row_number"] for r in data["rejected"]] == [4, 5, 6, 7, 8, 9, 10]
    assert all(r["reason"] for r in data["rejected"])
    assert db.sales.count_documents({"source": "csv"}) == 3
    assert sum(b["quantity"] for b in db.stock_batches.find()) == stock_before  # history does not touch stock


def test_reupload_is_flagged_as_duplicate(client, db, hdr):
    text = "date,drug_name,branch_name,quantity\n2026-09-01,ORS Sachet,Jagatpura Pharmacy,7\n"
    assert _upload(client, hdr["admin"], text).get_json()["saved"] == 1
    again = _upload(client, hdr["admin"], text).get_json()
    assert again["saved"] == 0 and "already uploaded" in again["rejected"][0]["reason"]


def test_missing_headers(client, hdr):
    res = _upload(client, hdr["admin"], "day,drug,qty\n2026-01-01,x,1\n")
    assert res.status_code == 400 and res.get_json()["error"]["code"] == "MISSING_HEADERS"


def test_file_over_5mb_rejected(client, hdr):
    big = b"date,drug_name,branch_name,quantity\n" + b"x" * (5 * 1024 * 1024 + 10)
    res = _upload(client, hdr["admin"], big)
    assert res.status_code == 413


def test_non_csv_rejected(client, hdr):
    assert _upload(client, hdr["admin"], "a,b", name="x.txt").status_code == 400


def test_supplier_cannot_upload(client, hdr):
    assert _upload(client, hdr["supplier"], "date,drug_name,branch_name,quantity\n").status_code == 403


def test_sample_errors_file(client, hdr):
    res = _upload(client, hdr["admin"], SAMPLE.read_bytes(), name=SAMPLE.name).get_json()
    assert res["saved"] > 0 and len(res["rejected"]) >= 5
