"""CSV sales-history upload (FR-2.5).

Columns: date,drug_name,branch_name,quantity   (drug_id / branch_id columns also accepted).
Valid rows become *historical* sales (source="csv") used for forecasting; they do NOT
reduce current stock. This module has no Flask dependency so the seeder can reuse it.
"""
import csv
import io
from datetime import datetime

from bson import ObjectId

from ..models import midnight, parse_date, today

MAX_BYTES = 5 * 1024 * 1024


class CsvFormatError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _lookup(db):
    drugs_by_name = {d["name"].strip().lower(): d["_id"] for d in db.drugs.find({}, {"name": 1})}
    branches_by_name = {b["name"].strip().lower(): b["_id"] for b in db.branches.find({}, {"name": 1})}
    drug_ids = {str(v): v for v in drugs_by_name.values()}
    branch_ids = {str(v): v for v in branches_by_name.values()}
    return drugs_by_name, branches_by_name, drug_ids, branch_ids


def _parse_quantity(raw):
    s = (raw or "").strip()
    try:
        num = float(s)
    except ValueError:
        return None, "Quantity is not a number"
    if not num.is_integer():
        return None, "Quantity must be a whole number"
    if num < 0:
        return None, "Quantity cannot be negative"
    return int(num), None


def import_sales_csv(db, raw, recorded_by=None):
    """Validate + save rows. ``raw`` is bytes or str. Returns the API response dict."""
    if isinstance(raw, bytes):
        if len(raw) > MAX_BYTES:
            raise CsvFormatError("FILE_TOO_LARGE", "File is larger than 5 MB")
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise CsvFormatError("INVALID_FILE", "File must be UTF-8 encoded CSV")
    else:
        text = raw
    reader = csv.DictReader(io.StringIO(text))
    headers = [h.strip().lower() for h in (reader.fieldnames or [])]
    reader.fieldnames = headers
    has_drug = "drug_name" in headers or "drug_id" in headers
    has_branch = "branch_name" in headers or "branch_id" in headers
    missing = [h for h, ok in (("date", "date" in headers), ("drug_name", has_drug),
                               ("branch_name", has_branch), ("quantity", "quantity" in headers)) if not ok]
    if missing:
        raise CsvFormatError("MISSING_HEADERS",
                             f"Missing required column(s): {', '.join(missing)}. "
                             "Expected: date,drug_name,branch_name,quantity")

    drugs_by_name, branches_by_name, drug_ids, branch_ids = _lookup(db)
    existing = {(s["drug_id"], s["branch_id"], s["sale_date"], s["quantity"])
                for s in db.sales.find({"source": "csv"}, {"drug_id": 1, "branch_id": 1, "sale_date": 1,
                                                          "quantity": 1, "_id": 0})}
    seen, to_insert, rejected, total = set(), [], [], 0
    now, today_ = datetime.utcnow(), today()

    for line_no, row in enumerate(reader, start=2):  # header is line 1
        total += 1
        clean_row = {k: (v if v is not None else "") for k, v in row.items() if k}

        def reject(reason):
            rejected.append({"row_number": line_no, "row": clean_row, "reason": reason})

        d = parse_date(row.get("date"))
        if not d:
            reject("Invalid or missing date")
            continue
        if d > today_:
            reject("Date is in the future")
            continue
        drug_key = (row.get("drug_id") or "").strip()
        drug_id = drug_ids.get(drug_key) if drug_key else drugs_by_name.get((row.get("drug_name") or "").strip().lower())
        if not drug_id:
            reject(f"Unknown drug '{(row.get('drug_name') or drug_key).strip()}'")
            continue
        branch_key = (row.get("branch_id") or "").strip()
        branch_id = (branch_ids.get(branch_key) if branch_key
                     else branches_by_name.get((row.get("branch_name") or "").strip().lower()))
        if not branch_id:
            reject(f"Unknown branch '{(row.get('branch_name') or branch_key).strip()}'")
            continue
        qty, err = _parse_quantity(row.get("quantity"))
        if err:
            reject(err)
            continue
        key = (drug_id, branch_id, midnight(d), qty)
        if key in seen:
            reject("Duplicate row (same date, drug, branch and quantity appears earlier in the file)")
            continue
        if key in existing:
            reject("Duplicate of a sales-history row that was already uploaded")
            continue
        seen.add(key)
        to_insert.append({"drug_id": drug_id, "branch_id": branch_id, "quantity": qty,
                          "sale_date": midnight(d), "source": "csv",
                          "recorded_by": ObjectId(recorded_by) if recorded_by else None, "created_at": now})

    for i in range(0, len(to_insert), 1000):
        db.sales.insert_many(to_insert[i:i + 1000], ordered=False)
    return {"total_rows": total, "saved": len(to_insert), "rejected_count": len(rejected), "rejected": rejected,
            "note": "Saved rows are historical sales for forecasting; they do not reduce current stock."}
