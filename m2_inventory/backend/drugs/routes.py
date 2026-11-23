"""/drugs CRUD (FR-2.1)."""
import re

from flask import Blueprint, jsonify, request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_db
from m1_auth_lucky.backend.rbac import roles_required

from ..models import Errors, json_body, opt_str, page_args, paginated, parse_oid, req_str, ser_drug, \
    to_non_negative_number

bp = Blueprint("drugs", __name__, url_prefix="/drugs")


def _validate(body, partial=False):
    errors, doc = Errors(), {}
    for field in ("name", "category", "unit"):
        if not partial or field in body:
            doc[field] = req_str(body, field, errors)
    if not partial or "price" in body:
        doc["price"] = to_non_negative_number(body.get("price"), "price", errors)
    if "strength" in body:
        doc["strength"] = opt_str(body, "strength", 50)
    errors.raise_if_any()
    return doc


def _check_unique_name(db, name, exclude_id=None):
    q = {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}}
    if exclude_id:
        q["_id"] = {"$ne": exclude_id}
    if db.drugs.find_one(q):
        raise ApiError(409, "DUPLICATE", "A drug with this name already exists", {"name": "Already exists"})


@bp.get("")
@roles_required("admin", "pharmacist")
def list_drugs():
    page, limit = page_args()
    q = {}
    if request.args.get("q"):
        q["name"] = {"$regex": re.escape(request.args["q"].strip()), "$options": "i"}
    if request.args.get("category"):
        q["category"] = request.args["category"]
    return jsonify(paginated(get_db().drugs, q, [("name", 1)], ser_drug, page, limit))


@bp.get("/categories")
@roles_required("admin", "pharmacist")
def categories():
    return jsonify({"items": sorted(c for c in get_db().drugs.distinct("category") if c)})


@bp.get("/<drug_id>")
@roles_required("admin", "pharmacist")
def get_drug(drug_id):
    d = get_db().drugs.find_one({"_id": parse_oid(drug_id)})
    if not d:
        raise ApiError(404, "NOT_FOUND", "Drug not found")
    return jsonify(ser_drug(d))


@bp.post("")
@roles_required("admin")
def create_drug():
    db = get_db()
    doc = _validate(json_body())
    _check_unique_name(db, doc["name"])
    doc["_id"] = db.drugs.insert_one(doc).inserted_id
    return jsonify(ser_drug(doc)), 201


@bp.put("/<drug_id>")
@roles_required("admin")
def update_drug(drug_id):
    db = get_db()
    oid = parse_oid(drug_id)
    if not db.drugs.find_one({"_id": oid}):
        raise ApiError(404, "NOT_FOUND", "Drug not found")
    updates = _validate(json_body(), partial=True)
    if not updates:
        raise ApiError(400, "VALIDATION_ERROR", "Nothing to update")
    if "name" in updates:
        _check_unique_name(db, updates["name"], oid)
    db.drugs.update_one({"_id": oid}, {"$set": updates})
    return jsonify(ser_drug(db.drugs.find_one({"_id": oid})))
