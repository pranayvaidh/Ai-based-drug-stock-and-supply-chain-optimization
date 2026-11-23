"""Role-based access control (FR-1.4).

Usage::

    @bp.post("/drugs")
    @roles_required("admin")
    def create_drug(): ...

``roles_required`` wraps ``jwt_required()``: missing/invalid token → 401,
expired → 401 TOKEN_EXPIRED, wrong role → 403 FORBIDDEN.
"""
from functools import wraps

from bson import ObjectId
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from .errors import ApiError
from .extensions import get_db

ROLES = ("admin", "pharmacist", "supplier")


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            role = get_jwt().get("role")
            if roles and role not in roles:
                raise ApiError(403, "FORBIDDEN",
                               f"Your role '{role}' cannot perform this action (requires: {', '.join(roles)})")
            return fn(*args, **kwargs)
        return wrapper
    return decorator


class CurrentUser:
    """Lightweight view of the JWT claims for the current request."""

    def __init__(self, claims, identity):
        self.id = identity
        self.role = claims.get("role")
        self.name = claims.get("name")
        self.branch_id = claims.get("branch_id")
        self.supplier_id = claims.get("supplier_id")

    @property
    def oid(self):
        return ObjectId(self.id)

    def is_(self, *roles):
        return self.role in roles

    def load(self):
        """Full user document from the DB (or None)."""
        return get_db().users.find_one({"_id": ObjectId(self.id)})


def current_user():
    return CurrentUser(get_jwt(), get_jwt_identity())
