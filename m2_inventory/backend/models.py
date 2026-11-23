"""Field lists, validators and serializers for Module 2 collections (SRS §5.3.1)."""
from datetime import date, datetime

from flask import request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.utils import iso_date, iso_dt, midnight, parse_oid  # noqa: F401 (re-export)

BRANCH_TYPES = ("warehouse", "pharmacy")
PO_STATUSES = ("Pending", "Confirmed", "Delivered", "Cancelled")
DATE_FORMATS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")


def today():
    return date.today()


# ---------------------------------------------------------------- validation helpers
def json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError(400, "VALIDATION_ERROR", "Request body must be a JSON object")
    return body


class Errors(dict):
    def raise_if_any(self, message="Please fix the highlighted fields"):
        if self:
            raise ApiError(400, "VALIDATION_ERROR", message, dict(self))


def req_str(body, field, errors, min_len=1, max_len=200):
    val = body.get(field)
    if not isinstance(val, str) or len(val.strip()) < min_len:
        errors[field] = f"{field.replace('_', ' ').capitalize()} is required"
        return None
    val = val.strip()
    if len(val) > max_len:
        errors[field] = f"Must be at most {max_len} characters"
        return None
    return val


def opt_str(body, field, max_len=200):
    val = body.get(field)
    if val is None:
        return None
    return str(val).strip()[:max_len] or None


def to_positive_int(value, field, errors, allow_zero=False):
    if isinstance(value, bool):
        value = None
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, str) and value.strip().lstrip("-").isdigit():
        value = int(value.strip())
    if not isinstance(value, int) or (value < 0 if allow_zero else value <= 0):
        errors[field] = "Must be a whole number ≥ 0" if allow_zero else "Must be a positive whole number"
        return None
    return value


def to_non_negative_number(value, field, errors):
    if isinstance(value, bool):
        value = None
    try:
        num = float(value)
    except (TypeError, ValueError):
        errors[field] = "Must be a number"
        return None
    if num < 0:
        errors[field] = "Must be ≥ 0"
        return None
    return round(num, 2)


def parse_date(value):
    """Parse a date string in a few common formats; returns ``date`` or None."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    s = value.strip()[:10]
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def ref_exists(db, collection, value, field, errors):
    """Parse an id and confirm the referenced document exists."""
    if value in (None, ""):
        errors[field] = "Required"
        return None
    try:
        oid = parse_oid(value, field)
    except ApiError:
        errors[field] = "Invalid id"
        return None
    doc = db[collection].find_one({"_id": oid})
    if not doc:
        errors[field] = "Not found"
        return None
    return doc


# ---------------------------------------------------------------- pagination
def page_args(default_limit=20, max_limit=100):
    try:
        page = max(1, int(request.args.get("page", 1)))
    except ValueError:
        page = 1
    try:
        limit = int(request.args.get("limit", default_limit))
    except ValueError:
        limit = default_limit
    limit = max(1, min(max_limit, limit))
    return page, limit


def paginated(collection, query, sort, serializer, page, limit):
    total = collection.count_documents(query)
    cursor = collection.find(query).sort(sort).skip((page - 1) * limit).limit(limit)
    return {"items": [serializer(d) for d in cursor], "page": page, "limit": limit, "total": total}


def paginate_list(items, page, limit):
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "page": page, "limit": limit, "total": len(items)}


# ---------------------------------------------------------------- name lookups
class NameMaps:
    """Resolve ids → names for drugs, branches, suppliers (master data is small)."""

    def __init__(self, db):
        self.drugs = {d["_id"]: d for d in db.drugs.find({}, {"name": 1, "unit": 1, "category": 1})}
        self.branches = {b["_id"]: b for b in db.branches.find({}, {"name": 1, "type": 1})}
        self.suppliers = {s["_id"]: s for s in db.suppliers.find({}, {"name": 1})}

    def drug(self, oid):
        d = self.drugs.get(oid)
        return d["name"] if d else None

    def branch(self, oid):
        b = self.branches.get(oid)
        return b["name"] if b else None

    def supplier(self, oid):
        s = self.suppliers.get(oid)
        return s["name"] if s else None


# ---------------------------------------------------------------- serializers
def ser_drug(d):
    return {"id": str(d["_id"]), "name": d.get("name"), "category": d.get("category"),
            "unit": d.get("unit"), "price": d.get("price"), "strength": d.get("strength")}


def ser_supplier(s):
    return {"id": str(s["_id"]), "name": s.get("name"), "contact": s.get("contact"),
            "avg_lead_time_days": s.get("avg_lead_time_days")}


def ser_branch(b):
    return {"id": str(b["_id"]), "name": b.get("name"), "type": b.get("type"), "location": b.get("location")}


def ser_batch(b, names):
    exp = b.get("expiry_date")
    days = (exp.date() - today()).days if isinstance(exp, datetime) else None
    return {
        "id": str(b["_id"]), "batch_no": b.get("batch_no"), "quantity": b.get("quantity"),
        "drug_id": str(b["drug_id"]), "drug_name": names.drug(b["drug_id"]),
        "branch_id": str(b["branch_id"]), "branch_name": names.branch(b["branch_id"]),
        "supplier_id": str(b["supplier_id"]) if b.get("supplier_id") else None,
        "supplier_name": names.supplier(b.get("supplier_id")),
        "expiry_date": iso_date(exp), "days_to_expiry": days, "received_at": iso_dt(b.get("received_at")),
    }


def ser_sale(s, names):
    return {
        "id": str(s["_id"]), "drug_id": str(s["drug_id"]), "drug_name": names.drug(s["drug_id"]),
        "branch_id": str(s["branch_id"]), "branch_name": names.branch(s["branch_id"]),
        "quantity": s.get("quantity"), "sale_date": iso_date(s.get("sale_date")),
        "source": s.get("source"), "recorded_by": str(s["recorded_by"]) if s.get("recorded_by") else None,
        "created_at": iso_dt(s.get("created_at")),
    }


def ser_po(p, names):
    return {
        "id": str(p["_id"]), "drug_id": str(p["drug_id"]), "drug_name": names.drug(p["drug_id"]),
        "branch_id": str(p["branch_id"]), "branch_name": names.branch(p["branch_id"]),
        "supplier_id": str(p["supplier_id"]), "supplier_name": names.supplier(p["supplier_id"]),
        "quantity": p.get("quantity"), "status": p.get("status"),
        "created_by": str(p["created_by"]) if p.get("created_by") else None,
        "created_at": iso_dt(p.get("created_at")), "delivered_at": iso_dt(p.get("delivered_at")),
    }
