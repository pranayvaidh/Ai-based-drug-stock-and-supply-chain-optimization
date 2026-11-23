# Build Brief for Claude Code: AI-Based Drug Stock & Supply Chain Optimization

**Project ID:** 2026-27-AIML-28 · **Institute:** SKIT Jaipur, Dept. of IT · **Session:** 2026-27
**Purpose of this file:** You (Claude Code) are building the codebase for the **upcoming progress demo**. The demo shows the project exactly as the mentor's **Form-3 Weekly Status Matrix** records it (last entry: 24–25 Oct 2026), plus a **complete frontend**.

> **Claude Code: read this first.**
> 1. Before you start, move this file to `docs/BUILD_SPEC.md`. At the end, write a **new** root `README.md` for humans, following §11.
> 2. Build only what §3 marks as **LIVE**. Anything marked **MOCK** gets a finished UI backed by clean sample data, plus a visible "Sample data · planned Sprint N" badge. Do **not** build the backend for MOCK features early. The demo has to match the mentor's progress records.
> 3. The stack is fixed by the SRS: **React 18 + Tailwind CSS 3 + Recharts + Chart.js** (frontend), **Python 3.11 + Flask** (backend and ML service), **MongoDB 8 via PyMongo**, **Flask-JWT-Extended + bcrypt**, **pandas + scikit-learn + Prophet** (ML). Do not use FastAPI, Next.js, LangGraph, OpenAI or any LLM, TensorFlow/PyTorch, or OR-Tools.
> 4. Work through §12 phase by phase. Run the tests after each phase. Finish with the checklist in §13.

---

## 0. Decisions the team can change before handing this over

These are the defaults. Edit them here if the team wants something different.

| # | Decision | Default |
|---|---|---|
| D1 | Where the single React (Vite) app lives | `m2_inventory/frontend/`. Form-3B says Kunal created the React 18 + Tailwind project. The other members' UI code sits in their own folders and is imported through Vite aliases. |
| D2 | Where the single Flask backend app lives | `m1_auth_lucky/backend/`. Form-3A says Lucky created the Flask project with blueprints. It registers Kunal's blueprints. |
| D3 | Module 3 integration level | The ML service runs **standalone** (port 5051) and is demoed with scripts, Postman and pytest. The main backend does **not** call it yet: Form-2 schedules that integration for 25 Feb – 5 Mar 2027. |
| D4 | Module 4 data | Every dashboard visual uses **sample data shaped exactly like the agreed API contracts**. The aggregation APIs are scheduled for Jan 2027. |
| D5 | Ports | Frontend 5173, Flask API 5050, ML service 5051, MongoDB 27017. Port 5000 is avoided because macOS AirPlay uses it. |

---

## 1. Team, ownership and Form-3 status

| Member | Roll No. | Module | Form-3 progress | Hard deadline |
|---|---|---|---|---|
| **Lucky Jangid** (Team Lead) | 23ESKIT091 | M1: User Authentication & Role Management, Flask backend & integration | 50% | 15 Dec 2026 |
| **Kunal Prajapat** | 23ESKIT086 | M2: Drug Inventory & Supply Chain (React inventory + purchase-order UI) | 52% | 15 Dec 2026 |
| **Kushagra Sharma** | 23ESKIT089 | M3: AI/ML Demand Forecasting & Risk Detection | 35% | 15 Mar 2027 |
| **Pranay Vaidh** | 23ESKIT124 | M4: Analytics, Visualization & Dashboard | 35% | 20 Mar 2027 |

---

## 2. Repository layout (4 member folders + thin root glue)

Module code lives **only** inside its owner's folder. The root holds only glue: config, scripts, docs and the README. Folder names use underscores so Python can import them as packages. Every Python folder gets an `__init__.py`.

```
drug-supply-chain/
├── README.md                    # final human README (§11), written last
├── docs/BUILD_SPEC.md           # this file
├── package.json                 # ALL frontend deps; node_modules at root so every member folder resolves imports
├── requirements.txt             # -r m1_auth_lucky/requirements.txt, -r m3_ml_kushagra/requirements.txt
├── .env.example                 # copy to .env
├── docker-compose.yml           # optional: MongoDB 8 only
├── scripts/
│   ├── seed_all.py              # calls m1 seed (users) + m2 seed (master data, stock); --with-sales loads the CSV too
│   ├── run_backend.(sh|bat)
│   ├── run_ml.(sh|bat)
│   └── run_all.(sh|bat)         # backend + ML + frontend
│
├── m1_auth_lucky/               # ── MODULE 1: Lucky Jangid
│   ├── README.md                # what's done, endpoints, demo steps, test cases covered
│   ├── requirements.txt         # flask, flask-jwt-extended, flask-bcrypt (or bcrypt), flask-cors, pymongo, python-dotenv, pytest, mongomock
│   ├── backend/
│   │   ├── app.py               # create_app(): config, CORS, JWT, Mongo, indexes, registers M1 + M2 blueprints, error handlers
│   │   ├── run.py               # python -m m1_auth_lucky.backend.run
│   │   ├── config.py
│   │   ├── extensions.py        # mongo client/db getter, jwt, bcrypt
│   │   ├── rbac.py              # @roles_required("admin", "pharmacist"), current_user helper
│   │   ├── errors.py            # uniform JSON error format
│   │   ├── auth/routes.py       # /auth/register, /auth/login
│   │   ├── users/routes.py      # GET/PUT /users/me
│   │   ├── auth/validators.py
│   │   └── seed_users.py
│   ├── frontend/
│   │   ├── pages/LoginPage.jsx, RegisterPage.jsx, ProfilePage.jsx
│   │   ├── context/AuthContext.jsx       # token + user in localStorage, login(), logout()
│   │   ├── api/client.js                 # axios instance, Bearer interceptor, 401 → logout + "Session expired"
│   │   └── routing/ProtectedRoute.jsx, RoleGuard.jsx
│   ├── tests/test_auth.py, test_rbac.py, test_profile.py
│   └── postman/M1_Auth.postman_collection.json
│
├── m2_inventory/          # ── MODULE 2: Kunal Prajapat
│   ├── README.md
│   ├── backend/
│   │   ├── drugs/routes.py, suppliers/routes.py, branches/routes.py
│   │   ├── stock/routes.py, sales/routes.py (+ sales/csv_upload.py, sales/fefo.py)
│   │   ├── purchase_orders/routes.py
│   │   ├── models.py            # field lists, validators, serializers (ObjectId → str)
│   │   └── seed_inventory.py    # branches, suppliers, drugs, stock batches
│   ├── frontend/                # ← THE VITE APP ROOT (D1)
│   │   ├── index.html, vite.config.js, tailwind.config.js, postcss.config.js
│   │   ├── src/main.jsx, src/App.jsx (router), src/index.css
│   │   ├── src/components/ui/   # reusable: Button, Input, Select, Modal, DataTable (paginated), FormField, Badge, EmptyState, DataSourceBadge
│   │   └── src/pages/           # DrugsPage, StockPage, SalesPage (entry + CSV), SuppliersPage, BranchesPage, PurchaseOrdersPage, SupplierPortalPage
│   ├── sample_data/sales_history_with_errors.csv   # small file with bad rows for the rejection demo
│   ├── tests/test_drugs.py, test_stock.py, test_sales_fefo.py, test_csv_upload.py, test_purchase_orders.py
│   └── postman/M2_Inventory.postman_collection.json
│
├── m3_ml_kushagra/              # ── MODULE 3: Kushagra Sharma (standalone ML microservice)
│   ├── README.md
│   ├── requirements.txt         # flask, pandas, numpy, scikit-learn, prophet, matplotlib, requests, pytest
│   ├── ml_service/
│   │   ├── app.py               # Flask, port 5051, X-Service-Key auth
│   │   ├── preprocessing.py     # FR-3.1
│   │   ├── models/prophet_model.py, regression_model.py, moving_average.py
│   │   ├── evaluation.py        # MAPE, 80/20 time split
│   │   ├── forecaster.py        # model selection logic (FR-3.2, FR-3.3, fallback)
│   │   ├── reorder.py           # safety_stock, reorder_point, reorder_quantity (FR-3.4 formulas)
│   │   └── rules_pseudocode.md  # status / expiry / anomaly rules, written but NOT coded (per Form-3C)
│   ├── data/generate_synthetic_sales.py   # deterministic (seed=42) → data/sales_history.csv
│   ├── data/sales_history.csv             # committed, generated
│   ├── scripts/demo_forecast.py           # end-to-end demo against the running service (§7.4)
│   ├── contracts/ML_API_CONTRACT.md       # agreed request/response JSON
│   ├── tests/test_reorder.py, test_preprocessing.py, test_evaluation.py, test_forecaster.py, test_api.py
│   └── postman/M3_ML.postman_collection.json
│
└── m4_dashboard_pranay/         # ── MODULE 4: Pranay Vaidh (frontend + contracts + mocks)
    ├── README.md
    ├── contracts/DASHBOARD_API_CONTRACT.md   # GET /dashboard/overview, /dashboard/suppliers (agreed, not built)
    └── frontend/
        ├── layout/AppLayout.jsx, Sidebar.jsx, Topbar.jsx, FilterBar.jsx   # dashboard shell, responsive grid
        ├── components/KpiCard.jsx, StockHeatmap.jsx, ForecastChart.jsx, AlertList.jsx,
        │              ExpiryRiskIndicator.jsx, SupplierPerformanceChart.jsx, StatusLegend.jsx
        ├── pages/DashboardHome.jsx, ForecastDashboard.jsx, HeatmapPage.jsx, AlertsPage.jsx,
        │         SupplierPerformancePage.jsx, AdminSettingsPage.jsx, ReportsPage.jsx
        ├── services/dashboardService.js      # returns mock data now; switch to real API later through one flag
        └── mocks/overview.json, suppliers.json, forecast_sample.json, alerts.json, settings.json, users.json
```

**Frontend wiring (D1):** the root `package.json` holds every frontend dependency, and `npm install` runs at the root. Node resolution then walks up from any member folder to the root `node_modules`. In `m2_inventory/frontend/vite.config.js`:
- set `root: __dirname`
- set aliases `@m1 → ../../m1_auth_lucky/frontend`, `@m2 → ./src`, `@m4 → ../../m4_dashboard_pranay/frontend`
- set `server.fs.allow` to the repo root and `server.port` to 5173
- proxy `/api` → `http://localhost:5050` (strip the `/api` prefix), so the browser never deals with CORS during the demo

Tailwind `content` must glob all three frontend folders. Root scripts: `"dev": "vite --config m2_inventory/frontend/vite.config.js"`, plus `build` and `preview`.

**Backend wiring (D2):** run everything from the repo root (`python -m m1_auth_lucky.backend.run`). M2 blueprints import `rbac` and `extensions` from `m1_auth_lucky.backend`. That dependency is real (inventory needs auth), and it is the "Auth APIs connected with the inventory interface" integration from Form-3A.

---

## 3. Milestone scope: LIVE vs MOCK

### Module 1 (Lucky): everything in Form-3A is LIVE
| Feature | Ref | Status |
|---|---|---|
| `users` collection (name, email, password_hash, role, branch_id, supplier_id) with a unique index on email | Sprint 1 | LIVE |
| `POST /auth/register`: rejects duplicate emails, enforces an 8-character minimum password, hashes with bcrypt | FR-1.1, FR-1.2, TC-01 | LIVE |
| `POST /auth/login`: JWT carrying user id, role and expiry; wrong password → 401 | FR-1.3, TC-02 | LIVE |
| Role decorators (Admin / Pharmacist / Supplier); 403 on violation | FR-1.4, TC-03, TC-12 | LIVE |
| `GET/PUT /users/me`; server rejects expired tokens; logout clears the token on the client | FR-1.5, FR-1.6 | LIVE |
| React Login/Register with role selection, validation messages and token storage | Form-3A wk 10 | LIVE |
| Auth integrated with the inventory interface | Form-3A wk 11 | LIVE |
| Security testing, admin user management | Form-2 #5–6 (Nov–Dec) | MOCK (Users tab in Admin Settings shows sample users, "planned Sprint 4") |

### Module 2 (Kunal): LIVE except FR-2.7 and FR-2.8
| Feature | Ref | Status |
|---|---|---|
| Collections: drugs, suppliers, branches, stock_batches, sales, purchase_orders (+ SRS indexes) | Sprint 1 | LIVE |
| `/drugs` CRUD (name, category, unit, price) + Drug List with add/edit forms | FR-2.1 | LIVE |
| Suppliers (name, contact, avg lead time) + branches/warehouses (type, location) | FR-2.2 | LIVE |
| `POST /stock` batch (batch_no, qty, expiry, branch, supplier) + stock list | FR-2.3, TC-04 | LIVE |
| `POST /sales` with earliest-expiry-first reduction; oversell rejected and stock left unchanged | FR-2.4, TC-05 | LIVE |
| `POST /sales/upload` CSV: row validation, saves valid rows, lists rejected rows | FR-2.5 | LIVE |
| Purchase order creation (status enum Pending/Confirmed/Delivered/Cancelled; new orders start as Pending) + order list | FR-2.6 | LIVE |
| `PUT /purchase-orders/{id}/status`, delivered order → new stock batch | FR-2.7 | MOCK (action buttons disabled with tooltip "planned Sprint 4") |
| Supplier confirms/rejects own orders | FR-2.8 | Supplier can **see** own orders (LIVE, needed for TC-12); confirm/reject buttons disabled, "planned Sprint 4" |

### Module 3 (Kushagra): standalone ML service, partly LIVE
| Feature | Ref | Status |
|---|---|---|
| Daily sales series per drug/branch: zero-fill missing days, remove obvious errors | FR-3.1 | LIVE |
| Prophet 30-day forecast; most recent 20% held out for testing | FR-3.2 | LIVE |
| scikit-learn regression alternative; MAPE compared, better model kept | FR-3.3 | LIVE |
| 14-day moving-average fallback when history < 60 days | SRS §5.1.1 | LIVE |
| `safety_stock`, `reorder_point`, `reorder_quantity` functions with unit tests | FR-3.4 (formulas), FR-3.5 prep | LIVE (library + tests, not exposed to the backend) |
| Flask ML service: `POST /ml/forecast` | Form-3C wk 11 | LIVE |
| `POST /ml/anomaly` | Form-3C wk 11 | SKELETON: validates input, returns HTTP 501 with the contract shape |
| Status / expiry / anomaly rules | FR-3.5–3.7 | Pseudocode only (`rules_pseudocode.md`), not coded |
| Backend ↔ ML integration, auto re-run on new sales, redistribution | FR-3.8, FR-3.9 | MOCK in the UI ("planned Sprint 7") |

### Module 4 (Pranay): full UI on sample data
| Feature | Ref | Status |
|---|---|---|
| Dashboard shell: sidebar navigation, responsive grid, filter bar | Form-3D wk 5 | LIVE (UI) |
| KPI cards: items at risk, expiring batches, open orders, active alerts | Form-3D wk 7 | UI on sample data |
| Drugs × branches heatmap with tooltip and legend (red/amber/green/grey) | FR-4.2 | UI on sample data |
| Actual vs forecast line chart with MAPE + confidence label | FR-4.1 | UI on sample data |
| Alert list with severity; 30/60/90-day expiry indicators | FR-4.3, FR-4.4 | UI on sample data |
| `/dashboard/overview` & `/dashboard/suppliers` contracts; filter + CSV report design | FR-4.6, FR-4.8 | Contract doc + UI; CSV export works client-side on the displayed sample data |
| Supplier performance, admin settings, auto-refresh, aggregation APIs | FR-4.5, FR-4.7, Form-2 #1–5 | UI on sample data, "planned Sprint 5–7" |

**Sprint labels for badges** (from SRS Table 14): Sprint 4 = Nov–Dec 2026 · Sprint 5 = Jan 2027 · Sprint 6 = Jan–Feb 2027 · Sprint 7 = Feb–Mar 2027.

---

## 4. Data model (MongoDB, database `drug_supply_chain`)

Follow SRS §5.3.1 exactly. Store ObjectIds in the database, return them as strings in JSON, and return dates as ISO `YYYY-MM-DD` (date-only fields) or ISO datetime.

- **users**: `name, email (unique, lowercased), password_hash, role ∈ {admin, pharmacist, supplier}, branch_id (pharmacist), supplier_id (supplier), created_at`
- **branches**: `name, type ∈ {warehouse, pharmacy}, location`
- **drugs**: `name, category, unit, price` (plus optional `strength`)
- **suppliers**: `name, contact, avg_lead_time_days`
- **stock_batches**: `drug_id, branch_id, supplier_id, batch_no, quantity, expiry_date, received_at`
- **sales**: `drug_id, branch_id, quantity, sale_date, recorded_by, source ∈ {manual, csv}`
- **purchase_orders**: `drug_id, branch_id, supplier_id, quantity, status, created_by, created_at, delivered_at (null)`
- **forecasts, alerts, settings**: create these collections and their indexes (to show the schema is ready), but nothing writes to them yet

**Indexes** are created on app start: `users.email` (unique), `sales (drug_id, branch_id, sale_date)`, `stock_batches (drug_id, branch_id, expiry_date)`, `forecasts (drug_id, branch_id)` (unique), `alerts (resolved, type)`.

**Seed data** (`python scripts/seed_all.py`; idempotent, `--reset` drops and recreates). All names are fictional:
- **Branches (4):** Central Warehouse Jaipur (warehouse, Sitapura); Malviya Nagar Pharmacy; Vaishali Nagar Pharmacy; Jagatpura Pharmacy
- **Suppliers (3):** Rajasthan Pharma Distributors (lead 5d); MedLine Wholesale (lead 7d); Shree Ganesh Medical Agencies (lead 3d)
- **Drugs (12):** Paracetamol 500 mg, Amoxicillin 250 mg, Metformin 500 mg, Cetirizine 10 mg, Azithromycin 500 mg, Pantoprazole 40 mg, ORS Sachet, Dextromethorphan Syrup 100 ml, Insulin Glargine 100 IU/ml, Atorvastatin 10 mg, Vitamin D3 60K, Ibuprofen 400 mg. Use realistic categories (Analgesic, Antibiotic, Antidiabetic…), units (strip of 10, bottle, sachet, vial) and INR prices.
- **Stock batches:** 2–3 per drug per pharmacy branch. Expiry dates range from 15 days to 18 months, so some batches are near expiry (useful for the FEFO demo).
- **Users** (password for all: `Demo@1234`):
  - `admin@demo.com` (admin)
  - `pharmacist@demo.com` (pharmacist, Malviya Nagar)
  - `pharmacist2@demo.com` (pharmacist, Vaishali Nagar)
  - `supplier@demo.com` (Rajasthan Pharma Distributors)
  - `supplier2@demo.com` (MedLine Wholesale)
- **Purchase orders:** 4–5 seeded, at least one for each supplier. All are `Pending` except one historical `Delivered` (created directly in the DB by the seed, not through the API).
- **Sales:** none by default. `--with-sales` loads `m3_ml_kushagra/data/sales_history.csv` through the same validation code as the CSV upload.

The **M4 mock JSON files must use these same drug and branch names**, so LIVE and MOCK screens look like one system.

---

## 5. Module 1: backend & frontend spec (Lucky)

**Config** (`.env`): `MONGO_URI`, `MONGO_DB`, `JWT_SECRET_KEY`, `JWT_EXPIRES_MINUTES=60`, `CORS_ORIGIN=http://localhost:5173`, `ML_SERVICE_URL`, `ML_SERVICE_KEY`. Fail fast with a clear message if MongoDB is unreachable at startup.

**Endpoints**
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | body `{name, email, password, role, branch_id?, supplier_id?}`. 400 if invalid; 409 on duplicate email; password min 8 chars; role must be one of the three. A pharmacist needs `branch_id`, a supplier needs `supplier_id`. Response 201 with the user (no hash). |
| POST | `/auth/login` | Public | `{email, password}` → `{access_token, expires_in, user}`. Wrong credentials → 401 "Invalid email or password" (same message for both cases). |
| GET | `/users/me` | Any logged-in user | Profile with branch/supplier name resolved |
| PUT | `/users/me` | Any logged-in user | Update `name` and/or password (old password required; same 8-char rule). Email and role cannot be changed here. |
| GET | `/health` | Public | `{status, db: "up"/"down"}` |

**RBAC:** `@roles_required(*roles)` sits on top of `@jwt_required()`. Role and user id go in the JWT claims. Responses:
- missing or invalid token → 401 `{"error":{"code":"UNAUTHORIZED"}}`
- expired token → 401 with code `TOKEN_EXPIRED`
- wrong role → 403 `{"error":{"code":"FORBIDDEN","message":"..."}}`

Uniform error body everywhere: `{"error": {"code", "message", "details"?}}`.

**Frontend**
- **Login:** email, password, inline validation. Show demo-account quick-fill chips (one per role) because they make the live demo smooth.
- **Register:** name, email, password + confirm, role select. Show a branch select for pharmacists and a supplier select for suppliers; these lists come from public `GET /branches/public` and `/suppliers/public` endpoints returning names only, owned by M2.
- **Profile:** view and edit.
- **Auth handling:** `AuthContext` keeps the token in localStorage. The axios interceptor adds `Authorization: Bearer`. On 401 the app logs out and shows a toast: "Session expired, please log in again" (SRS use-case alternate flow A1).
- **Routing:** `ProtectedRoute` + `RoleGuard`. A forbidden route renders a friendly 403 page.

**Tests (pytest + mongomock):** TC-01 (stored hash ≠ password, bcrypt verifies), TC-02, TC-03 (pharmacist → admin-only route = 403), TC-12 (supplier2 opens supplier1's PO = 403), duplicate email, short password, expired token (override expiry to 1 second, or create a token with a negative delta), profile get/update.

---

## 6. Module 2: backend & frontend spec (Kunal)

**Endpoints** (paginated lists use `?page=&limit=`, default 20, max 100, response `{items, page, limit, total}`)
| Method | Path | Access |
|---|---|---|
| GET | `/drugs` (`?q=&category=`) | Admin, Pharmacist |
| POST / PUT | `/drugs`, `/drugs/<id>` | Admin |
| GET | `/suppliers` | Admin, Pharmacist (read-only, needed for the stock-entry dropdown; documented deviation from SRS App. B) |
| POST / PUT | `/suppliers`, `/suppliers/<id>` | Admin |
| GET / POST / PUT | `/branches` | GET Admin + Pharmacist; write Admin |
| GET | `/branches/public`, `/suppliers/public` | Public, `{id, name}` only (for the register form) |
| GET | `/stock` (`?drug_id=&branch_id=&group=batches/totals`) | Admin, Pharmacist |
| POST | `/stock` | Admin, Pharmacist (a pharmacist can only add stock to their own branch, otherwise 403) |
| POST | `/sales` | Pharmacist (own branch); Admin is allowed too for the demo. Note this in the README. |
| GET | `/sales` (`?drug_id=&branch_id=&from=&to=`) | Admin, Pharmacist |
| POST | `/sales/upload` (multipart `file`) | Admin, Pharmacist |
| GET | `/purchase-orders` | Admin (all), Pharmacist (own branch), Supplier (own `supplier_id` only) |
| GET | `/purchase-orders/<id>` | Same scoping; another supplier's order → 403 (TC-12) |
| POST | `/purchase-orders` | Admin, Pharmacist. `{drug_id, branch_id, supplier_id, quantity>0}` → saved as `Pending` |

**Validation:**
- price ≥ 0; quantity a positive integer
- `expiry_date` must be in the future on stock entry
- `sale_date` cannot be in the future
- every referenced id must exist

**FEFO sale (FR-2.4, NFR-004, TC-05):**
1. Load the batches for (drug, branch) with `quantity > 0` and expiry ≥ today, sorted by `expiry_date` ascending.
2. If their total is less than the requested quantity, return 400 `INSUFFICIENT_STOCK` with the available quantity, and change nothing.
3. Otherwise decrement from the earliest-expiring batches first. If the server supports transactions (replica set), use a MongoDB transaction. If not, use guarded `find_one_and_update({_id, quantity: {$gte: take}}, {$inc: {quantity: -take}})` calls, and run compensating increments if any step fails.
4. Insert the sale.
5. Return the sale together with the `batches_used: [{batch_no, taken, remaining}]` breakdown. This breakdown is what makes FEFO visible in the demo.

**CSV upload (FR-2.5):**
- Columns: `date,drug_name,branch_name,quantity` (also accept `drug_id`/`branch_id` columns).
- Row rules:
  - parseable date, not in the future
  - known drug and branch (case-insensitive name match)
  - integer quantity ≥ 0
  - no exact duplicate row
- Valid rows are saved as **historical sales** (`source: "csv"`) and do **not** reduce current stock. Explain that this is training history.
- Response: `{total_rows, saved, rejected: [{row_number, row, reason}]}`.
- Reject files over 5 MB or with missing headers.

**Frontend pages (all LIVE unless noted)**
- **Drugs:** searchable, paginated table; add/edit modal; category filter. Admin sees the edit controls, a pharmacist sees a read-only table.
- **Stock:** "Add batch" form + batch table. Columns: drug, branch, batch no, qty, expiry date, a *days to expiry* badge, supplier. There is a toggle to show per-drug totals. The badge is a plain display of the date; the risk logic is M3 and comes later.
- **Sales:**
  - Record-sale form (drug, quantity, date; branch locked to a pharmacist's own branch). After saving, show the FEFO `batches_used` breakdown.
  - Recent sales table.
  - **CSV upload panel:** drag-and-drop, then a result summary (saved count) and a rejected-rows table with reasons.
- **Suppliers** (Admin): table + add/edit (name, contact, avg lead time).
- **Branches** (Admin): table + add/edit (name, type, location).
- **Purchase Orders:**
  - "Create order" form (drug, branch, supplier, qty) and an orders table with status pills (Pending = amber, Confirmed = blue, Delivered = green, Cancelled = grey). Both LIVE.
  - A **"Suggested orders (AI)"** panel shows MOCK suggestions (badge: "Sample data · planned Sprint 7"). Each has a **"Use suggestion"** button that pre-fills the LIVE create form.
  - Row actions Confirm / Mark delivered / Cancel are disabled, with the tooltip "Status workflow planned Sprint 4 (FR-2.7)".
- **Supplier Portal** (Supplier role only): a LIVE list of the supplier's own orders. Confirm/Reject buttons are disabled with "planned Sprint 4 (FR-2.8)".

**Tests:** TC-04, TC-05 (stock unchanged after a rejected sale), FEFO picks the earliest expiry across two batches, CSV upload with mixed valid and invalid rows, PO validation (qty ≤ 0 → 400), pharmacist cannot add stock to another branch (403), supplier PO scoping.

---

## 7. Module 3: ML microservice spec (Kushagra)

### 7.1 Synthetic data (`data/generate_synthetic_sales.py`, Form-3C wk 4)
Generate deterministic data (numpy seed 42) for 3 pharmacy branches × 12 drugs, covering the **240 days ending yesterday**. Columns: `date,drug_name,branch_name,quantity`. Per series, quantity = base demand × weekly pattern (higher Mon/Sat) × gentle trend × seasonal factor (cough syrup and cetirizine rise in winter months, ORS in summer) + Poisson noise. Then add:
- **Insulin Glargine at Jagatpura:** only the last **40 days**, so the moving-average fallback shows up
- one deliberate **demand spike** (≈5× for 2 days): Paracetamol at Malviya Nagar about 3 weeks ago, for the future anomaly demo
- a few missing days, plus 3–4 obviously bad rows (negative qty, text qty), so preprocessing has real work to do

Write the result to `data/sales_history.csv`. Keep the drug and branch names identical to §4.

### 7.2 Pipeline
- **`preprocessing.py` (FR-3.1):** `build_daily_series(records, drug, branch)` → a continuous daily `pandas` series. Drop negative, non-numeric and future rows (and return a count of each). Reindex to a full date range with zero-fill. Do **not** remove spikes; spikes are anomaly material.
- **`evaluation.py`:** `time_split(series, test_frac=0.2)` and `mape(actual, forecast)`. Days with actual = 0 are excluded from MAPE (document this). Returns a percentage rounded to 2 decimals.
- **`models/prophet_model.py`:** Prophet with weekly seasonality, plus yearly seasonality when history ≥ 365 days. Returns `yhat` and an interval. **Guarded import:** if Prophet is not installed, log a warning and mark it unavailable. The service must still run.
- **`models/regression_model.py`:** scikit-learn `LinearRegression` (or `Ridge`) on time index + day-of-week one-hot + month features.
- **`models/moving_average.py`:** the mean of the last 14 days, held flat for 30 days.
- **`forecaster.py` (FR-3.2, FR-3.3):**
  - If history < 60 days → `moving_average_14d` (MAPE computed on the holdout where possible, otherwise `null`).
  - Otherwise, fit Prophet and the regression model on the first 80% and score both on the last 20%. Keep the one with the lower MAPE, refit it on 100% of the data, and forecast `horizon_days` (default 30). Clip predictions at ≥ 0.
  - `confidence = "LOW"` if MAPE > 25 or MAPE is null, else `"OK"` (NFR-006).
- **`reorder.py` (FR-3.4):** pure functions with docstrings that cite the SRS formulas:
  - `safety_stock(z, sigma, lead_time) = z·σ·√L`
  - `reorder_point(d, L, ss) = d·L + ss`
  - `reorder_quantity(d, L, R, ss, stock, on_order) = max(0, d·(L+R) + ss − stock − on_order)`
  - Defaults: `Z = 1.65`, `R = 7`.

### 7.3 Service API (`ml_service/app.py`, port 5051, header `X-Service-Key` must equal `ML_SERVICE_KEY`, else 401)
**`POST /ml/forecast`** (LIVE)
```json
// request
{ "drug_id": "Paracetamol 500 mg", "branch_id": "Malviya Nagar Pharmacy", "horizon_days": 30,
  "sales": [ { "date": "2026-03-01", "quantity": 12 }, ... ] }
// response 200
{ "drug_id": "...", "branch_id": "...", "model_used": "prophet | linear_regression | moving_average_14d",
  "horizon_days": 30, "history_days": 240,
  "candidates": { "prophet": { "mape": 18.4 }, "linear_regression": { "mape": 22.9 } },
  "mape": 18.4, "confidence": "OK",
  "avg_daily_demand": 10.2,
  "daily_predictions": [ { "date": "2026-11-17", "yhat": 10.8, "yhat_lower": 7.1, "yhat_upper": 14.2 }, ... ],
  "preprocessing": { "input_rows": 245, "dropped_invalid": 3, "zero_filled_days": 5 },
  "generated_at": "ISO datetime" }
```
**`POST /ml/anomaly`** (SKELETON) validates the same `sales` shape plus `z_limit` (default 3), then returns **HTTP 501**:
```json
{ "status": "not_implemented", "planned": "Sprint 6 (Jan–Feb 2027), FR-3.7",
  "contract": { "anomalies": [ { "date": "YYYY-MM-DD", "quantity": 0, "z_score": 0.0, "type": "SPIKE|DROP" } ] } }
```
`GET /health` → `{status, prophet_available: bool}`.

Write both contracts, with examples, into `contracts/ML_API_CONTRACT.md`.

### 7.4 Demo script (`scripts/demo_forecast.py`)
Reads `data/sales_history.csv`, then for 3 chosen series (one with long history, one where regression is likely to win, the 40-day Insulin series) calls the running service and prints a table:

`drug | branch | history days | prophet MAPE | regression MAPE | chosen model | confidence | avg daily demand`

It saves `outputs/forecast_<drug>_<branch>.png`: the last 60 days of actuals, the 30-day forecast and the interval, drawn with matplotlib. Then it prints the **SRS worked example** using `reorder.py`: d = 10, L = 5, safety stock 20 → ROP 70; stock 60, R = 7 → reorder qty 80. It ends by calling `/ml/anomaly` and printing the 501 "planned Sprint 6" response. Flags: `--service-url`, `--key`.

### 7.5 Tests
- `test_reorder.py`: the SRS example (ROP = 70, qty = 80), `max(0, …)` never negative, the safety-stock formula
- `test_preprocessing.py`: zero-fill length, invalid rows dropped
- `test_evaluation.py`: MAPE on known arrays, zero-actual exclusion
- `test_forecaster.py`: < 60 days → moving average; ≥ 60 days → one of the two models, 30 non-negative predictions; skip Prophet-specific asserts if Prophet is unavailable
- `test_api.py`: 401 without the key, a 200 shape check, 501 on anomaly

---

## 8. Module 4: dashboard spec (Pranay)

**Contracts (`contracts/DASHBOARD_API_CONTRACT.md`)** document the agreed-but-not-built endpoints with full example JSON:
- `GET /dashboard/overview?branch_id=&category=&from=&to=` →
  - `kpis{items_at_risk, expiring_batches_30d, open_orders, active_alerts}`
  - `heatmap{drugs[], branches[], cells[{drug, branch, status: HEALTHY|STOCKOUT_RISK|OVERSTOCK|NO_DATA, stock, days_of_cover, rop}]}`
  - `expiry{d30, d60, d90, batches[...]}`
  - `latest_alerts[...]`
  - `refreshed_at`
- `GET /dashboard/suppliers` → `[{supplier, on_time_rate, avg_lead_time_days, orders_delivered, trend[{month, on_time_rate}]}]`
- `GET /forecast/{drug_id}?branch_id=`: same shape as the ML forecast response plus `actuals[{date, quantity}]`
- `GET /alerts` → `[{id, type: STOCKOUT|OVERSTOCK|EXPIRY_RISK|ANOMALY, severity: CRITICAL|WARNING|INFO, drug, branch, batch_no?, message, created_at, resolved}]`
- `GET/PUT /settings` → `{expiry_warning_days:30, max_cover_days:60, review_days:7, z_value:1.65, anomaly_limit:3}`

**`services/dashboardService.js`** exposes `getOverview(filters)`, `getSuppliers()`, `getForecast(drug, branch)`, `getAlerts(filters)`, `getSettings()`. Each resolves the mock JSON after a 300 ms delay, and applies the filters client-side so the filter bar really works. One constant, `USE_MOCK = true`, has a comment showing the future real-API call. Mock data must be internally consistent: the KPI counts match the heatmap and alert lists, and the names match §4.

**Layout & screens**
- **Layout:** collapsible sidebar with role-based items, a topbar with user name, role chip and logout, and a responsive grid.
- **Colours:** red = stockout/critical, amber = overstock/warning, green = healthy, grey = no data (SRS §5.1.2). A reusable `StatusLegend` shows them everywhere.
- **`DataSourceBadge`** (shared, in M2 `ui/`): a green "LIVE" chip or a slate "Sample data · planned Sprint N" chip. Place one on every card and page header. It keeps the demo honest and lets evaluators see what is real.

| Screen | Content | Data |
|---|---|---|
| Dashboard Home | 4 KPI cards, mini heatmap, latest 5 alerts, expiry 30/60/90 bars | Sample |
| Forecast Dashboard | Drug + branch selectors; Recharts line: actual (solid) vs forecast (dashed) with shaded interval; MAPE value + confidence chip ("Low confidence" if > 25%); model-used label; "Re-run forecast" button disabled ("planned Sprint 7") | Sample |
| Stock Heatmap | Full drugs × branches grid, coloured cells, hover tooltip (stock, days of cover, ROP), legend, category filter | Sample |
| Alerts & Expiry | Alert list with severity/type filters and a resolve button (disabled); three expiry columns for 30/60/90 days | Sample |
| Supplier Performance | Chart.js bar (on-time %) + line (lead-time trend) per supplier; table | Sample |
| Admin Settings | Tabs: **Thresholds** (form bound to mock settings; Save shows "planned Sprint 7"), **Users** (sample list, "planned Sprint 4") | Sample |
| Reports | Filter bar (branch, category, date range) + preview table + **Download CSV** (client-side export of the current preview, filename includes the date) | Sample |

**Role-based navigation**
- **Admin:** everything
- **Pharmacist:** Dashboard, Drugs (read), Stock, Sales, Purchase Orders, Forecast, Heatmap, Alerts, Reports, Profile
- **Supplier:** Supplier Portal, Profile

**Responsiveness:** the sidebar collapses to a drawer under 1024 px, tables scroll horizontally, and charts resize. Every page needs loading skeletons, empty states and error toasts.

---

## 9. Frontend dependencies (root `package.json`)
`react@18`, `react-dom@18`, `react-router-dom@6`, `axios`, `recharts`, `chart.js`, `react-chartjs-2`, `lucide-react`, `react-hot-toast`, `clsx`. Dev: `vite@5`, `@vitejs/plugin-react`, `tailwindcss@3`, `postcss`, `autoprefixer`, `eslint` (basic config). Use JavaScript/JSX, not TypeScript; the team knows React 18 + JS per the SRS. Node 20 LTS.

---

## 10. Using the reference project (`pharmaceutical-supply-chain-agentic-ai-main`)
Use it for patterns only. Don't copy it wholesale.
- **Borrow ideas from:**
  - `agents/forecasting_agent.py`: `_prepare_data`, `_forecast_prophet`, `_forecast_moving_average`, `_calculate_metrics` (rewrite as plain functions per §7.2)
  - `utils/database.py`: the connection-singleton and DataAccess pattern
  - `frontend/src/app/{page,forecasting,alerts,inventory}/page.tsx` + `components/layout/sidebar.tsx`: visual layout (KPI card row, alert cards, forecast chart framing). Translate to React + Vite + JSX + Tailwind 3.
- **Ignore:** FastAPI/uvicorn, LangGraph/LangChain/OpenAI, LSTM/TensorFlow/PyTorch, OR-Tools route optimization, Leaflet maps, Next.js/TS, Radix, Streamlit/Dash, its Persian PRD, its dataset loaders, and its "Key Achievements" numbers. Never present the reference's metrics as ours.

---

## 11. The final root `README.md` you must write (for humans)
Sections, in this order:
1. **Title, project ID, one-paragraph overview, team table** (name, roll no., module, folder).
2. **Architecture diagram** (Mermaid): React → Flask API → MongoDB; ML service shown standalone with a dashed "integration planned Sprint 7" arrow.
3. **Milestone status table:** the condensed LIVE/MOCK matrix from §3, with the Form-3 percentages.
4. **Prerequisites:** Python 3.11, Node 20, MongoDB 8 (local install or `docker compose up -d`), Git.
5. **Setup:** step-by-step for **Windows (PowerShell) and macOS/Linux**:
   - venv creation and activation
   - `pip install -r requirements.txt`
   - a Prophet note: wheels exist for 3.11; if install fails, the service falls back to regression and moving average
   - `npm install`
   - `cp .env.example .env`
   - `python scripts/seed_all.py --reset`
6. **Run:** three terminals (backend 5050, ML 5051, frontend 5173) or `scripts/run_all`. Include health-check URLs.
7. **Demo accounts** table.
8. **Demo script, per member** (copy §11.1, keep it tight; about 3–4 minutes each).
9. **Running tests:** `pytest m1_auth_lucky m2_inventory m3_ml_kushagra -q`; Postman import paths.
10. **API reference:** links to each member README and contract file.
11. **Troubleshooting:** Mongo not running, port in use, Prophet install, CORS (use the Vite proxy), expired token.
12. **Roadmap:** what each member delivers next, with the Form-2 hard deadlines.

### 11.1 Demo script to include
**Lucky (M1: Auth & RBAC, 50%)**
1. Register a new pharmacist in the UI; show the validation errors for a duplicate email and a 7-character password.
2. In Mongo Compass/shell, show `password_hash` is a bcrypt hash (TC-01).
3. Log in with a wrong password → error (TC-02). Log in correctly and show the JWT payload (role, exp) at jwt.io or in the console.
4. Log in as the pharmacist and open `/admin/settings` → 403 page. Run Postman TC-03 (403 JSON).
5. As `supplier2`, request supplier1's PO in Postman → 403 (TC-12).
6. Edit the profile name. Log out, then show that an expired token is rejected (`JWT_EXPIRES_MINUTES=1`, or the test).
7. `pytest m1_auth_lucky -q`

**Kunal (M2: Inventory & Supply Chain, 52%)**
1. As admin: add a drug, add a supplier with a lead time, view branches.
2. As pharmacist: add a stock batch (TC-04) and show it in the stock list with the days-to-expiry badge.
3. Record a sale that spans two batches, and show the FEFO breakdown, earliest expiry first.
4. Try to sell more than available → rejected, and stock is unchanged (TC-05).
5. Upload `m3_ml_kushagra/data/sales_history.csv` (Kushagra's generated history) → saved count. Then upload `sample_data/sales_history_with_errors.csv` → rejected rows with reasons.
6. Create a purchase order → it appears as Pending. Show the supplier seeing it in the Supplier Portal. Point out the disabled confirm/deliver buttons (Sprint 4).
7. `pytest m2_inventory -q`

**Kushagra (M3: Forecasting, 35%)**
1. Start the ML service and open `/health` (Prophet available).
2. `python m3_ml_kushagra/scripts/demo_forecast.py` → the MAPE comparison table. Explain the 80/20 holdout and why the lower-MAPE model is kept. Point out the Insulin series falling back to the 14-day moving average.
3. Open the generated forecast PNGs.
4. The script's SRS worked example: ROP 70, reorder 80. Then `pytest m3_ml_kushagra -q`.
5. Postman: `/ml/forecast` (200) and `/ml/anomaly` (501, contract agreed, Sprint 6). Show `rules_pseudocode.md` as the next step.

**Pranay (M4: Dashboard, 35%)**
1. Dashboard Home: KPI cards, the colour convention and legend, latest alerts.
2. Heatmap: tooltips and the category filter.
3. Forecast Dashboard: actual vs forecast, MAPE + confidence label (pick a series with MAPE > 25 to show "Low confidence").
4. Alerts & Expiry 30/60/90; Supplier Performance (Chart.js).
5. Reports: apply filters, then Download CSV.
6. Open `DASHBOARD_API_CONTRACT.md` and show how `USE_MOCK` switches to the real API in Jan 2027. Point out the "Sample data" badges.

---

## 12. Build order (phases)
1. **Scaffold:** folder tree, root `package.json`/`requirements.txt`/`.env.example`/`docker-compose.yml`, Vite app with aliases + Tailwind running a blank layout.
2. **M1 backend:** app factory, Mongo, indexes, auth, RBAC, profile, tests green.
3. **M2 backend:** master data, stock, FEFO sales, CSV upload, POs, seeds, tests green.
4. **M3:** generator → CSV, pipeline, reorder, service, demo script, tests green. Prophet-dependent tests skip cleanly if Prophet is missing.
5. **Frontend M1 + M2 pages:** wired to the live API through the Vite proxy.
6. **Frontend M4 pages + mocks + contracts,** plus the Suggested Orders panel and placeholders.
7. **Polish:** role-based nav, badges, empty and error states, responsive pass, Postman collections, member READMEs, root README.
8. **Verify:** §13.

## 13. Acceptance checklist (verify before you finish)
- [ ] `python scripts/seed_all.py --reset` succeeds twice in a row (idempotent)
- [ ] Backend, ML service and frontend all start with the documented commands. `/health` is OK on both services.
- [ ] All pytest suites pass (Prophet tests may skip only if Prophet is absent)
- [ ] TC-01, 02, 03, 04, 05 and 12 are each demonstrable in the UI or Postman
- [ ] Logging in as each of the 3 roles shows the correct navigation; forbidden routes show a 403 page
- [ ] FEFO breakdown is shown after a multi-batch sale; an oversell leaves stock unchanged
- [ ] CSV upload of the generated file saves rows; the errors file lists the rejected rows
- [ ] `demo_forecast.py` prints the MAPE table, writes the PNGs and prints ROP 70 / qty 80
- [ ] Every MOCK widget carries a "Sample data · planned Sprint N" badge; every LIVE page carries "LIVE"
- [ ] No module code at the repo root; each member folder has its own README listing done vs planned work
- [ ] No secrets committed. `.env` is gitignored; `.env.example` is complete.
- [ ] `npm run build` completes without errors
