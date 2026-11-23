"""/sales: FEFO sale entry, sales list, CSV upload (FR-2.4, FR-2.5, TC-05)."""
from datetime import datetime

from flask import Blueprint, jsonify, request

from m1_auth_lucky.backend.errors import ApiError
from m1_auth_lucky.backend.extensions import get_client, get_db, supports_transactions
from m1_auth_lucky.backend.rbac import current_user, roles_required

from ..models import Errors, NameMaps, json_body, midnight, page_args, paginated, parse_date, parse_oid, \
    ref_exists, ser_sale, to_positive_int, today
from .csv_upload import CsvFormatError, import_sales_csv
from .fefo import fefo_sell

bp = Blueprint("sales", __name__, url_prefix="/sales")


@bp.post("")
@roles_required("pharmacist", "admin")  # admin allowed for the demo (see README)
def record_sale():
    db = get_db()
    user = current_user()
    body = json_body()
    errors = Errors()
    if user.is_("pharmacist"):
        if body.get("branch_id") and body["branch_id"] != user.branch_id:
            raise ApiError(403, "FORBIDDEN", "Pharmacists can only record sales for their own branch")
        body["branch_id"] = user.branch_id
    drug = ref_exists(db, "drugs", body.get("drug_id"), "drug_id", errors)
    branch = ref_exists(db, "branches", body.get("branch_id"), "branch_id", errors)
    qty = to_positive_int(body.get("quantity"), "quantity", errors)
    sale_date = parse_date(body.get("sale_date")) if body.get("sale_date") else today()
    if not sale_date:
        errors["sale_date"] = "Invalid date (YYYY-MM-DD)"
    elif sale_date > today():
        errors["sale_date"] = "Sale date cannot be in the future"
    errors.raise_if_any()

    sale = {"drug_id": drug["_id"], "branch_id": branch["_id"], "quantity": qty,
            "sale_date": midnight(sale_date), "recorded_by": user.oid, "source": "manual",
            "created_at": datetime.utcnow()}
    sale, used = fefo_sell(db, drug["_id"], branch["_id"], qty, sale,
                           use_transaction=supports_transactions(), client=get_client())
    out = ser_sale(sale, NameMaps(db))
    out["batches_used"] = used
    return jsonify(out), 201


@bp.get("")
@roles_required("admin", "pharmacist")
def list_sales():
    page, limit = page_args()
    q = {}
    if request.args.get("drug_id"):
        q["drug_id"] = parse_oid(request.args["drug_id"], "drug_id")
    if request.args.get("branch_id"):
        q["branch_id"] = parse_oid(request.args["branch_id"], "branch_id")
    if request.args.get("source") in ("manual", "csv"):
        q["source"] = request.args["source"]
    rng = {}
    if request.args.get("from"):
        d = parse_date(request.args["from"])
        if d:
            rng["$gte"] = midnight(d)
    if request.args.get("to"):
        d = parse_date(request.args["to"])
        if d:
            rng["$lte"] = midnight(d)
    if rng:
        q["sale_date"] = rng
    names = NameMaps(get_db())
    return jsonify(paginated(get_db().sales, q, [("sale_date", -1), ("created_at", -1)],
                             lambda s: ser_sale(s, names), page, limit))


@bp.post("/upload")
@roles_required("admin", "pharmacist")
def upload_csv():
    f = request.files.get("file")
    if f is None or not f.filename:
        raise ApiError(400, "VALIDATION_ERROR", "Attach a CSV file in the 'file' field")
    if not f.filename.lower().endswith(".csv"):
        raise ApiError(400, "INVALID_FILE", "Only .csv files are accepted")
    raw = f.read()
    try:
        result = import_sales_csv(get_db(), raw, recorded_by=current_user().id)
    except CsvFormatError as exc:
        raise ApiError(413 if exc.code == "FILE_TOO_LARGE" else 400, exc.code, exc.message)
    result["filename"] = f.filename
    return jsonify(result), 200
