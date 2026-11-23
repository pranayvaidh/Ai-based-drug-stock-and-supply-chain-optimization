"""Input validation for registration / login / profile (FR-1.1, FR-1.2)."""
import re

from ..rbac import ROLES

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD = 8


def validate_password(pw, field="password"):
    if not isinstance(pw, str) or not pw:
        return {field: "Password is required"}
    if len(pw) < MIN_PASSWORD:
        return {field: f"Password must be at least {MIN_PASSWORD} characters"}
    return {}


def validate_register(body):
    errors = {}
    name = (body.get("name") or "").strip() if isinstance(body.get("name"), str) else ""
    email = (body.get("email") or "").strip().lower() if isinstance(body.get("email"), str) else ""
    role = body.get("role")
    if len(name) < 2:
        errors["name"] = "Name must be at least 2 characters"
    if not EMAIL_RE.match(email):
        errors["email"] = "A valid email is required"
    errors.update(validate_password(body.get("password")))
    if role not in ROLES:
        errors["role"] = f"Role must be one of: {', '.join(ROLES)}"
    if role == "pharmacist" and not body.get("branch_id"):
        errors["branch_id"] = "A pharmacist must be linked to a branch"
    if role == "supplier" and not body.get("supplier_id"):
        errors["supplier_id"] = "A supplier user must be linked to a supplier"
    return errors, {"name": name, "email": email, "role": role}


def validate_login(body):
    errors = {}
    email = body.get("email") if isinstance(body.get("email"), str) else ""
    pw = body.get("password") if isinstance(body.get("password"), str) else ""
    if not email.strip():
        errors["email"] = "Email is required"
    if not pw:
        errors["password"] = "Password is required"
    return errors, email.strip().lower(), pw
