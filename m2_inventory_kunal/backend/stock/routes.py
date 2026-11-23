"""/stock: batch entry and stock list (FR-2.3, TC-04)."""
from datetime import datetime

from flask import Blueprint, jsonify, request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_db
from m1_auth_lucky.backend.rbac import current_user, roles_required

from ..models import Errors, NameMaps, iso_date, json_body, midnight, page_args, paginate_list, parse_date, \
    parse_oid, ref_exists, req_str, ser_batch, to_positive_int, today

bp = Blueprint("stock", __name__, url_prefix="/stock")


def _query_from_args():
    q = {}
    if request.args.get("drug_id"):
        q["drug_id"] = parse_oid(request.args["drug_id"], "drug_id")
    if request.args.get("branch_id"):
        q["branch_id"] = parse_oid(request.args["branch_id"], "branch_id")
    if request.args.get("include_empty") not in ("1", "true"):
        q["quantity"] = {"$gt": 0}
    return q


@bp.get("")
@roles_required("admin", "pharmacist")
def list_stock():
    db = get_db()
    page, limit = page_args()
    q = _query_from_args()
    names = NameMaps(db)
    batches = list(db.stock_batches.find(q).sort([("expiry_date", 1), ("batch_no", 1)]))

    if request.args.get("group") == "totals":
        groups = {}
        for b in batches:
            key = (b["drug_id"], b["branch_id"])
            g = groups.setdefault(key, {
                "drug_id": str(b["drug_id"]), "drug_name": names.drug(b["drug_id"]),
                "branch_id": str(b["branch_id"]), "branch_name": names.branch(b["branch_id"]),
                "total_quantity": 0, "batch_count": 0, "nearest_expiry": None})
            g["total_quantity"] += b.get("quantity", 0)
            g["batch_count"] += 1
            exp = iso_date(b.get("expiry_date"))
            if exp and (g["nearest_expiry"] is None or exp < g["nearest_expiry"]):
                g["nearest_expiry"] = exp
        items = sorted(groups.values(), key=lambda g: (g["drug_name"] or "", g["branch_name"] or ""))
        for g in items:
            g["days_to_nearest_expiry"] = ((parse_date(g["nearest_expiry"]) - today()).days
                                           if g["nearest_expiry"] else None)
        return jsonify({**paginate_list(items, page, limit), "group": "totals"})

    items = [ser_batch(b, names) for b in batches]
    return jsonify({**paginate_list(items, page, limit), "group": "batches"})


@bp.post("")
@roles_required("admin", "pharmacist")
def add_batch():
    db = get_db()
    user = current_user()
    body = json_body()
    errors = Errors()
    drug = ref_exists(db, "drugs", body.get("drug_id"), "drug_id", errors)
    branch = ref_exists(db, "branches", body.get("branch_id"), "branch_id", errors)
    supplier = ref_exists(db, "suppliers", body.get("supplier_id"), "supplier_id", errors)
    batch_no = req_str(body, "batch_no", errors, max_len=40)
    qty = to_positive_int(body.get("quantity"), "quantity", errors)
    exp = parse_date(body.get("expiry_date"))
    if not exp:
        errors["expiry_date"] = "A valid expiry date (YYYY-MM-DD) is required"
    elif exp <= today():
        errors["expiry_date"] = "Expiry date must be in the future"
    errors.raise_if_any()

    if user.is_("pharmacist") and str(branch["_id"]) != user.branch_id:
        raise ApiError(403, "FORBIDDEN", "Pharmacists can only add stock to their own branch")
    if db.stock_batches.find_one({"drug_id": drug["_id"], "branch_id": branch["_id"], "batch_no": batch_no}):
        raise ApiError(409, "DUPLICATE", "This batch number already exists for this drug at this branch",
                       {"batch_no": "Already exists"})

    doc = {"drug_id": drug["_id"], "branch_id": branch["_id"], "supplier_id": supplier["_id"],
           "batch_no": batch_no, "quantity": qty, "expiry_date": midnight(exp),
           "received_at": datetime.utcnow(), "created_by": user.oid}
    doc["_id"] = db.stock_batches.insert_one(doc).inserted_id
    return jsonify(ser_batch(doc, NameMaps(db))), 201
