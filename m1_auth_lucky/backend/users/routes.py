"""GET/PUT /users/me (FR-1.5)."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..errors import ApiError
from ..extensions import bcrypt, get_db
from ..rbac import current_user
from ..utils import iso_dt

bp = Blueprint("users", __name__, url_prefix="/users")


def serialize_user(u, resolve_names=False):
    out = {
        "id": str(u["_id"]),
        "name": u.get("name"),
        "email": u.get("email"),
        "role": u.get("role"),
        "branch_id": str(u["branch_id"]) if u.get("branch_id") else None,
        "supplier_id": str(u["supplier_id"]) if u.get("supplier_id") else None,
        "created_at": iso_dt(u.get("created_at")),
    }
    if resolve_names:
        db = get_db()
        out["branch_name"] = None
        out["supplier_name"] = None
        if u.get("branch_id"):
            b = db.branches.find_one({"_id": u["branch_id"]}, {"name": 1})
            out["branch_name"] = b["name"] if b else None
        if u.get("supplier_id"):
            s = db.suppliers.find_one({"_id": u["supplier_id"]}, {"name": 1})
            out["supplier_name"] = s["name"] if s else None
    return out


def _load_me():
    user = current_user().load()
    if not user:
        raise ApiError(401, "UNAUTHORIZED", "User no longer exists")
    return user


@bp.get("/me")
@jwt_required()
def get_me():
    return jsonify({"user": serialize_user(_load_me(), resolve_names=True)})


@bp.put("/me")
@jwt_required()
def update_me():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError(400, "VALIDATION_ERROR", "Request body must be a JSON object")
    forbidden = [f for f in ("email", "role", "branch_id", "supplier_id") if f in body]
    if forbidden:
        raise ApiError(400, "VALIDATION_ERROR", "Email and role cannot be changed here",
                       {f: "Not editable" for f in forbidden})
    user = _load_me()
    updates, errors = {}, {}

    if "name" in body:
        name = body["name"].strip() if isinstance(body["name"], str) else ""
        if len(name) < 2:
            errors["name"] = "Name must be at least 2 characters"
        else:
            updates["name"] = name

    new_pw = body.get("new_password")
    if new_pw is not None:
        from ..auth.validators import validate_password  # local import avoids a cycle
        errors.update(validate_password(new_pw, "new_password"))
        cur = body.get("current_password")
        if not isinstance(cur, str) or not bcrypt.check_password_hash(user["password_hash"], cur):
            errors["current_password"] = "Current password is incorrect"
        if not errors:
            updates["password_hash"] = bcrypt.generate_password_hash(new_pw).decode("utf-8")

    if errors:
        raise ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields", errors)
    if not updates:
        raise ApiError(400, "VALIDATION_ERROR", "Nothing to update (send name and/or new_password)")
    get_db().users.update_one({"_id": user["_id"]}, {"$set": updates})
    user.update(updates)
    return jsonify({"user": serialize_user(user, resolve_names=True),
                    "password_changed": "password_hash" in updates})
