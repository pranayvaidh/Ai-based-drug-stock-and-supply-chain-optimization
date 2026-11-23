"""/branches: pharmacies and warehouses (FR-2.2)."""
from flask import Blueprint, jsonify, request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_db
from m1_auth_lucky.backend.rbac import roles_required

from ..models import BRANCH_TYPES, Errors, json_body, page_args, paginated, parse_oid, req_str, ser_branch

bp = Blueprint("branches", __name__, url_prefix="/branches")


def _validate(body, partial=False):
    errors, doc = Errors(), {}
    if not partial or "name" in body:
        doc["name"] = req_str(body, "name", errors, min_len=2)
    if not partial or "type" in body:
        if body.get("type") not in BRANCH_TYPES:
            errors["type"] = f"Type must be one of: {', '.join(BRANCH_TYPES)}"
        else:
            doc["type"] = body["type"]
    if not partial or "location" in body:
        doc["location"] = req_str(body, "location", errors)
    errors.raise_if_any()
    return doc


@bp.get("/public")
def public_list():
    q = {"type": request.args["type"]} if request.args.get("type") in BRANCH_TYPES else {}
    return jsonify({"items": [{"id": str(b["_id"]), "name": b["name"], "type": b.get("type")}
                              for b in get_db().branches.find(q, {"name": 1, "type": 1}).sort("name", 1)]})


@bp.get("")
@roles_required("admin", "pharmacist")
def list_branches():
    page, limit = page_args()
    q = {"type": request.args["type"]} if request.args.get("type") in BRANCH_TYPES else {}
    return jsonify(paginated(get_db().branches, q, [("type", -1), ("name", 1)], ser_branch, page, limit))


@bp.post("")
@roles_required("admin")
def create_branch():
    db = get_db()
    doc = _validate(json_body())
    if db.branches.find_one({"name": doc["name"]}):
        raise ApiError(409, "DUPLICATE", "A branch with this name already exists", {"name": "Already exists"})
    doc["_id"] = db.branches.insert_one(doc).inserted_id
    return jsonify(ser_branch(doc)), 201


@bp.put("/<branch_id>")
@roles_required("admin")
def update_branch(branch_id):
    db = get_db()
    oid = parse_oid(branch_id)
    if not db.branches.find_one({"_id": oid}):
        raise ApiError(404, "NOT_FOUND", "Branch not found")
    updates = _validate(json_body(), partial=True)
    if not updates:
        raise ApiError(400, "VALIDATION_ERROR", "Nothing to update")
    db.branches.update_one({"_id": oid}, {"$set": updates})
    return jsonify(ser_branch(db.branches.find_one({"_id": oid})))
