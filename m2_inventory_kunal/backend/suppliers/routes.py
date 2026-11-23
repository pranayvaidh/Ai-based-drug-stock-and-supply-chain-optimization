"""/suppliers (FR-2.2). GET is open to pharmacists for the stock-entry dropdown
(documented deviation from SRS Appendix B)."""
from flask import Blueprint, jsonify

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_db
from m1_auth_lucky.backend.rbac import roles_required

from ..models import Errors, json_body, page_args, paginated, parse_oid, req_str, ser_supplier, to_positive_int

bp = Blueprint("suppliers", __name__, url_prefix="/suppliers")


def _validate(body, partial=False):
    errors, doc = Errors(), {}
    if not partial or "name" in body:
        doc["name"] = req_str(body, "name", errors, min_len=2)
    if not partial or "contact" in body:
        doc["contact"] = req_str(body, "contact", errors)
    if not partial or "avg_lead_time_days" in body:
        doc["avg_lead_time_days"] = to_positive_int(body.get("avg_lead_time_days"), "avg_lead_time_days", errors)
    errors.raise_if_any()
    return doc


@bp.get("/public")
def public_list():
    return jsonify({"items": [{"id": str(s["_id"]), "name": s["name"]}
                              for s in get_db().suppliers.find({}, {"name": 1}).sort("name", 1)]})


@bp.get("")
@roles_required("admin", "pharmacist")
def list_suppliers():
    page, limit = page_args()
    return jsonify(paginated(get_db().suppliers, {}, [("name", 1)], ser_supplier, page, limit))


@bp.post("")
@roles_required("admin")
def create_supplier():
    db = get_db()
    doc = _validate(json_body())
    if db.suppliers.find_one({"name": doc["name"]}):
        raise ApiError(409, "DUPLICATE", "A supplier with this name already exists", {"name": "Already exists"})
    doc["_id"] = db.suppliers.insert_one(doc).inserted_id
    return jsonify(ser_supplier(doc)), 201


@bp.put("/<supplier_id>")
@roles_required("admin")
def update_supplier(supplier_id):
    db = get_db()
    oid = parse_oid(supplier_id)
    if not db.suppliers.find_one({"_id": oid}):
        raise ApiError(404, "NOT_FOUND", "Supplier not found")
    updates = _validate(json_body(), partial=True)
    if not updates:
        raise ApiError(400, "VALIDATION_ERROR", "Nothing to update")
    db.suppliers.update_one({"_id": oid}, {"$set": updates})
    return jsonify(ser_supplier(db.suppliers.find_one({"_id": oid})))
