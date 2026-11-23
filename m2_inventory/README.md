# Module 2: Drug Inventory & Supply Chain

**Owner:** Kunal Prajapat · 23ESKIT086 · **Form-3 progress: 52 %** · Hard deadline 15 Dec 2026

This folder also holds **the single Vite + React 18 + Tailwind app** (decision D1): `frontend/` is the
Vite root. Module 1 and Module 4 UI code is imported through the aliases `@m1` and `@m4`.

## Done (LIVE)
| Feature | Ref |
|---|---|
| Collections drugs, suppliers, branches, stock_batches, sales, purchase_orders + SRS indexes | Sprint 1 |
| `/drugs` CRUD + Drug List with search, category filter, add/edit modal (admin) / read-only (pharmacist) | FR-2.1 |
| Suppliers (name, contact, avg lead time) and branches/warehouses (type, location) | FR-2.2 |
| `POST /stock` batch entry + stock list with days-to-expiry badge and per-drug totals toggle | FR-2.3, TC-04 |
| `POST /sales` with **FEFO** (earliest expiry first); oversell rejected, stock unchanged; `batches_used` breakdown | FR-2.4, NFR-004, TC-05 |
| `POST /sales/upload` CSV: row validation, valid rows saved as history, rejected rows listed with reasons | FR-2.5 |
| Purchase orders: create (always `Pending`) + scoped list; status pills | FR-2.6 |
| Supplier Portal: a supplier sees only their own orders | FR-2.8 (view), TC-12 |
| Reusable UI kit in `frontend/src/components/ui/` (Button, Input, Select, Modal, DataTable, FormField, Badge, EmptyState, **DataSourceBadge**, Tooltip, Skeleton, PageHeader) | — |

## Planned
| Feature | When | Today in the UI |
|---|---|---|
| `PUT /purchase-orders/{id}/status`; Delivered → new stock batch | Sprint 4 (FR-2.7) | Confirm / Mark delivered / Cancel buttons disabled with tooltip |
| Supplier confirms / rejects own orders | Sprint 4 (FR-2.8) | Confirm / Reject buttons disabled with tooltip |
| AI suggested orders from forecasts | Sprint 7 (FR-3.5) | "Suggested orders (AI)" panel on sample data; **Use suggestion** pre-fills the LIVE form |

## Endpoints
Lists are paginated: `?page=&limit=` (default 20, max 100) → `{items, page, limit, total}`.

| Method | Path | Access |
|---|---|---|
| GET | `/drugs?q=&category=` · `/drugs/categories` · `/drugs/<id>` | Admin, Pharmacist |
| POST / PUT | `/drugs`, `/drugs/<id>` | Admin |
| GET | `/suppliers` | Admin, Pharmacist (read-only for the stock form: documented deviation from SRS App. B) |
| POST / PUT | `/suppliers`, `/suppliers/<id>` | Admin |
| GET | `/branches?type=` | Admin, Pharmacist |
| POST / PUT | `/branches`, `/branches/<id>` | Admin |
| GET | `/branches/public?type=`, `/suppliers/public` | Public: `{id, name}` only (register form) |
| GET | `/stock?drug_id=&branch_id=&group=batches|totals&include_empty=` | Admin, Pharmacist |
| POST | `/stock` | Admin; Pharmacist only for their own branch (else 403) |
| POST | `/sales` | Pharmacist (own branch). **Admin is allowed too, for the demo.** |
| GET | `/sales?drug_id=&branch_id=&from=&to=&source=` | Admin, Pharmacist |
| POST | `/sales/upload` (multipart `file`) | Admin, Pharmacist |
| GET | `/purchase-orders?status=` | Admin (all), Pharmacist (own branch), Supplier (own supplier only) |
| GET | `/purchase-orders/<id>` | Same scoping; another supplier's order → 403 (TC-12) |
| POST | `/purchase-orders` | Admin, Pharmacist (own branch) → saved as `Pending` |

### Validation
price ≥ 0 · quantities are positive integers · `expiry_date` must be in the future · `sale_date` cannot be
in the future · every referenced id must exist · duplicate batch number for the same drug + branch → 409.

### FEFO sale
1. Usable batches = `quantity > 0` and `expiry_date ≥ today`, sorted by expiry ascending.
2. Total < requested → `400 INSUFFICIENT_STOCK` with `details.available`; nothing changes.
3. Otherwise decrement earliest-expiring first. On a replica set this runs in a MongoDB transaction;
   on a standalone server (the default local install) each step is a guarded
   `find_one_and_update({_id, quantity: {$gte: take}}, {$inc: {quantity: -take}})` with compensating
   increments if a later step fails, and up to 3 retries on a concurrent-update conflict.
4. The sale is inserted and returned with `batches_used: [{batch_no, expiry_date, taken, remaining}]`.

### CSV upload
Columns `date,drug_name,branch_name,quantity` (or `drug_id` / `branch_id`). A row is rejected for: bad or
future date, unknown drug/branch (names matched case-insensitively), non-integer or negative quantity,
an exact duplicate earlier in the file, or a duplicate of history already uploaded (so re-uploading the
same file is harmless). Files > 5 MB → 413; missing headers → 400 `MISSING_HEADERS`.
**Saved rows are historical sales (`source: "csv"`) used to train forecasts; they do not reduce current stock.**
Response: `{total_rows, saved, rejected_count, rejected: [{row_number, row, reason}]}` (`row_number` is the
line in the file; the header is line 1).

## Files
```
backend/                 drugs/ suppliers/ branches/ stock/ sales/ (fefo.py, csv_upload.py) purchase_orders/
backend/models.py        validators, pagination, NameMaps, serializers (ObjectId → str, dates → ISO)
backend/seed_inventory.py  4 branches, 3 suppliers, 12 drugs, 90 batches, 5 POs (idempotent)
frontend/                Vite root: index.html, vite.config.js, tailwind/postcss config, src/
frontend/src/pages/      Drugs, Stock, Sales, Suppliers, Branches, PurchaseOrders, SupplierPortal
sample_data/sales_history_with_errors.csv   13 rows, 8 bad ones (one per rejection rule)
tests/                   test_drugs, test_stock, test_sales_fefo, test_csv_upload, test_purchase_orders
postman/                 M2_Inventory.postman_collection.json
```

## Test cases covered
TC-04 (`test_stock.py::test_tc04_…`), TC-05 (`test_sales_fefo.py::test_tc05_…`), FEFO across two batches
(expired batch skipped), CSV mixed valid/invalid rows, PO qty ≤ 0 → 400, pharmacist cannot add stock to
another branch (403), supplier PO scoping.

```bash
pytest m2_inventory -q
```

## Demo (about 3–4 minutes)
1. As **admin**: Drugs → Add drug; Suppliers → Add supplier with a lead time; Branches → view.
2. As **pharmacist**: Stock → Add batch (TC-04); it appears with the days-to-expiry badge.
3. Sales → record a sale bigger than the first batch (e.g. Paracetamol, 50) → the FEFO breakdown shows the earliest-expiring batch emptied first.
4. Try more than is available → "Sale rejected: insufficient stock … No stock was changed" (TC-05).
5. Upload `m3_ml_kushagra/data/sales_history.csv` → ~8,400 rows saved, 4 bad rows rejected. Then upload
   `sample_data/sales_history_with_errors.csv` → rejected rows table with reasons.
6. Purchase Orders → create an order (or click **Use suggestion**) → it appears as Pending. Log in as
   `supplier@demo.com` → Supplier Portal shows it. Point out the disabled Confirm/Deliver buttons (Sprint 4).
7. `pytest m2_inventory -q`
