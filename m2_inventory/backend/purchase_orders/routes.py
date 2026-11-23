"""/purchase-orders (FR-2.6). Status workflow (FR-2.7) and supplier confirm/reject (FR-2.8)
are planned for Sprint 4 and intentionally not implemented yet."""
from datetime import datetime

from flask import Blueprint, jsonify, request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_db
from m1_auth_lucky.backend.rbac import current_user, roles_required

from ..models import PO_STATUSES, Errors, NameMaps, json_body, page_args, paginated, parse_oid, ref_exists, \
    ser_po, to_positive_int

bp = Blueprint("purchase_orders", __name__, url_prefix="/purchase-orders")


def _scope_query(user):
    """Admin sees all; pharmacist sees own branch; supplier sees own supplier_id only."""
    if user.is_("admin"):
        return {}
    if user.is_("pharmacist"):
        return {"branch_id": parse_oid(user.branch_id, "branch_id")}
    return {"supplier_id": parse_oid(user.supplier_id, "supplier_id")}


@bp.get("")
@roles_required("admin", "pharmacist", "supplier")
def list_orders():
    page, limit = page_args()
    q = _scope_query(current_user())
    if request.args.get("status") in PO_STATUSES:
        q["status"] = request.args["status"]
    names = NameMaps(get_db())
    return jsonify(paginated(get_db().purchase_orders, q, [("created_at", -1)],
                             lambda p: ser_po(p, names), page, limit))


@bp.get("/<po_id>")
@roles_required("admin", "pharmacist", "supplier")
def get_order(po_id):
    db = get_db()
    po = db.purchase_orders.find_one({"_id": parse_oid(po_id)})
    if not po:
        raise ApiError(404, "NOT_FOUND", "Purchase order not found")
    user = current_user()
    if user.is_("supplier") and str(po["supplier_id"]) != user.supplier_id:
        raise ApiError(403, "FORBIDDEN", "This purchase order belongs to another supplier")
    if user.is_("pharmacist") and str(po["branch_id"]) != user.branch_id:
        raise ApiError(403, "FORBIDDEN", "This purchase order belongs to another branch")
    return jsonify(ser_po(po, NameMaps(db)))


@bp.post("")
@roles_required("admin", "pharmacist")
def create_order():
    db = get_db()
    user = current_user()
    body = json_body()
    errors = Errors()
    drug = ref_exists(db, "drugs", body.get("drug_id"), "drug_id", errors)
    branch = ref_exists(db, "branches", body.get("branch_id"), "branch_id", errors)
    supplier = ref_exists(db, "suppliers", body.get("supplier_id"), "supplier_id", errors)
    qty = to_positive_int(body.get("quantity"), "quantity", errors)
    errors.raise_if_any()
    if user.is_("pharmacist") and str(branch["_id"]) != user.branch_id:
        raise ApiError(403, "FORBIDDEN", "Pharmacists can only create orders for their own branch")
    doc = {"drug_id": drug["_id"], "branch_id": branch["_id"], "supplier_id": supplier["_id"],
           "quantity": qty, "status": "Pending", "created_by": user.oid,
           "created_at": datetime.utcnow(), "delivered_at": None}
    doc["_id"] = db.purchase_orders.insert_one(doc).inserted_id
    return jsonify(ser_po(doc, NameMaps(db))), 201
