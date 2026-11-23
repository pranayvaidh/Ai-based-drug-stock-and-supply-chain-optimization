"""First-Expiry-First-Out stock reduction (FR-2.4, NFR-004, TC-05).

1. Load usable batches (quantity > 0, expiry >= today) sorted by expiry ascending.
2. If the total is short → INSUFFICIENT_STOCK, nothing changes.
3. Otherwise take from the earliest-expiring batches first. On a replica set we use a
   MongoDB transaction; on a standalone server we use guarded conditional updates and
   compensate (put stock back) if any step fails.
"""
from m1_auth_lucky.backend.errors import ApiError

from ..models import midnight, today


class FefoConflict(Exception):
    """A batch changed underneath us (concurrent sale)."""


def usable_batches(db, drug_id, branch_id, session=None):
    q = {"drug_id": drug_id, "branch_id": branch_id, "quantity": {"$gt": 0},
         "expiry_date": {"$gte": midnight(today())}}
    return list(db.stock_batches.find(q, session=session).sort([("expiry_date", 1), ("received_at", 1)]))


def plan_fefo(batches, quantity):
    """Pure function: which batches to take from, and how much. Returns (plan, available)."""
    available = sum(b["quantity"] for b in batches)
    if available < quantity:
        return None, available
    plan, remaining = [], quantity
    for b in batches:
        if remaining <= 0:
            break
        take = min(b["quantity"], remaining)
        plan.append((b, take))
        remaining -= take
    return plan, available


def _insufficient(available, requested):
    raise ApiError(400, "INSUFFICIENT_STOCK",
                   f"Only {available} units available in non-expired stock; requested {requested}",
                   {"available": available, "requested": requested})


def _apply_guarded(db, plan, session=None):
    """Decrement each batch only if it still has enough. Returns [(batch, take, remaining)]."""
    done = []
    try:
        for b, take in plan:
            updated = db.stock_batches.find_one_and_update(
                {"_id": b["_id"], "quantity": {"$gte": take}},
                {"$inc": {"quantity": -take}},
                return_document=True, session=session)
            if updated is None:
                raise FefoConflict(b["batch_no"])
            done.append((b, take, updated["quantity"]))
    except Exception:
        if session is None:  # compensate manually; a transaction rolls back on its own
            for b, take, _ in done:
                db.stock_batches.update_one({"_id": b["_id"]}, {"$inc": {"quantity": take}})
        raise
    return done


def fefo_sell(db, drug_id, branch_id, quantity, sale_doc, use_transaction=False, client=None):
    """Reduce stock FEFO and insert ``sale_doc``. Returns (sale_doc, batches_used)."""

    def run(session=None):
        batches = usable_batches(db, drug_id, branch_id, session)
        plan, available = plan_fefo(batches, quantity)
        if plan is None:
            _insufficient(available, quantity)
        done = _apply_guarded(db, plan, session)
        try:
            sale_doc["_id"] = db.sales.insert_one(sale_doc, session=session).inserted_id
        except Exception:
            if session is None:
                for b, take, _ in done:
                    db.stock_batches.update_one({"_id": b["_id"]}, {"$inc": {"quantity": take}})
            raise
        return [{"batch_no": b["batch_no"], "batch_id": str(b["_id"]),
                 "expiry_date": b["expiry_date"].date().isoformat(), "taken": take, "remaining": rem}
                for b, take, rem in done]

    if use_transaction and client is not None:
        with client.start_session() as s:
            used = s.with_transaction(lambda sess: run(sess))
        return sale_doc, used

    for _attempt in range(3):  # retry on a concurrent-update conflict
        try:
            return sale_doc, run()
        except FefoConflict:
            continue
    raise ApiError(409, "CONFLICT", "Stock changed while recording the sale, please retry")
