"""Small helpers shared by M1 and M2: ObjectId parsing and JSON-safe serialisation."""
from datetime import date, datetime

from bson import ObjectId
from bson.errors import InvalidId

from .errors import ApiError


def parse_oid(value, field="id", required=True):
    if value in (None, ""):
        if required:
            raise ApiError(400, "VALIDATION_ERROR", f"'{field}' is required", {field: "required"})
        return None
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError):
        raise ApiError(400, "VALIDATION_ERROR", f"'{field}' is not a valid id", {field: "invalid id"})


def iso_date(value):
    """Date-only fields → 'YYYY-MM-DD'."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def iso_dt(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat() + ("" if value.tzinfo else "Z")
    return str(value)


def as_str_id(value):
    return str(value) if value is not None else None


def midnight(d):
    """date → naive datetime at 00:00 (how date-only fields are stored in Mongo)."""
    return datetime(d.year, d.month, d.day)
