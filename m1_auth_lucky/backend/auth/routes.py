"""POST /auth/register, POST /auth/login (FR-1.1 – FR-1.3, TC-01, TC-02)."""
from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token
from pymongo.errors import DuplicateKeyError

from ..errors import ApiError
from ..extensions import bcrypt, get_db
from ..utils import parse_oid
from ..users.routes import serialize_user
from .validators import validate_login, validate_register

bp = Blueprint("auth", __name__, url_prefix="/auth")


def _json_body():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError(400, "VALIDATION_ERROR", "Request body must be a JSON object")
    return body


def hash_password(pw):
    return bcrypt.generate_password_hash(pw).decode("utf-8")


def make_token(user):
    claims = {
        "role": user["role"],
        "name": user["name"],
        "branch_id": str(user["branch_id"]) if user.get("branch_id") else None,
        "supplier_id": str(user["supplier_id"]) if user.get("supplier_id") else None,
    }
    return create_access_token(identity=str(user["_id"]), additional_claims=claims)


@bp.post("/register")
def register():
    body = _json_body()
    errors, clean = validate_register(body)
    if errors:
        raise ApiError(400, "VALIDATION_ERROR", "Please fix the highlighted fields", errors)

    db = get_db()
    doc = {**clean, "branch_id": None, "supplier_id": None}
    if clean["role"] == "pharmacist":
        bid = parse_oid(body.get("branch_id"), "branch_id")
        if not db.branches.find_one({"_id": bid}):
            raise ApiError(400, "VALIDATION_ERROR", "Unknown branch", {"branch_id": "Branch not found"})
        doc["branch_id"] = bid
    if clean["role"] == "supplier":
        sid = parse_oid(body.get("supplier_id"), "supplier_id")
        if not db.suppliers.find_one({"_id": sid}):
            raise ApiError(400, "VALIDATION_ERROR", "Unknown supplier", {"supplier_id": "Supplier not found"})
        doc["supplier_id"] = sid

    if db.users.find_one({"email": clean["email"]}):
        raise ApiError(409, "EMAIL_EXISTS", "An account with this email already exists",
                       {"email": "Email already registered"})

    doc["password_hash"] = hash_password(body["password"])
    doc["created_at"] = datetime.utcnow()
    try:
        res = db.users.insert_one(doc)
    except DuplicateKeyError:  # race with the unique index
        raise ApiError(409, "EMAIL_EXISTS", "An account with this email already exists",
                       {"email": "Email already registered"})
    doc["_id"] = res.inserted_id
    return jsonify({"user": serialize_user(doc)}), 201


@bp.post("/login")
def login():
    body = _json_body()
    errors, email, pw = validate_login(body)
    if errors:
        raise ApiError(400, "VALIDATION_ERROR", "Email and password are required", errors)
    user = get_db().users.find_one({"email": email})
    # Same message for unknown email and wrong password (no user enumeration).
    if not user or not bcrypt.check_password_hash(user["password_hash"], pw):
        raise ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password")
    expires = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    return jsonify({
        "access_token": make_token(user),
        "token_type": "Bearer",
        "expires_in": int(expires.total_seconds()),
        "user": serialize_user(user, resolve_names=True),
    })
