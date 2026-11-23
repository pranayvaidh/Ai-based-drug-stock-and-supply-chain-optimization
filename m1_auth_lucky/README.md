# Module 1: User Authentication & Role Management

**Owner:** Lucky Jangid (Team Lead) · 23ESKIT091 · **Form-3 progress: 50 %** · Hard deadline 15 Dec 2026

This folder also holds the **single Flask backend app** (decision D2): `backend/app.py` builds the app,
connects MongoDB, creates indexes and registers Module 1 **and** Module 2 blueprints.

## Done (LIVE)
| Feature | Ref |
|---|---|
| `users` collection with a unique index on `email` (lower-cased) | Sprint 1 |
| `POST /auth/register`: duplicate email → 409, password ≥ 8 chars, bcrypt hash, role ∈ admin/pharmacist/supplier, pharmacist needs `branch_id`, supplier needs `supplier_id` | FR-1.1, FR-1.2, TC-01 |
| `POST /auth/login`: JWT with user id (`sub`), `role`, `exp`; same 401 message for unknown email and wrong password | FR-1.3, TC-02 |
| `@roles_required(...)` on top of `@jwt_required()`; 401 `UNAUTHORIZED` / 401 `TOKEN_EXPIRED` / 403 `FORBIDDEN` | FR-1.4, TC-03, TC-12 |
| `GET/PUT /users/me` (name, password change with old password) | FR-1.5 |
| Expired tokens rejected by the server; the client logs out on 401 with "Session expired, please log in again" | FR-1.6, SRS A1 |
| React Login (validation, demo-account chips), Register (role select → branch/supplier select), Profile | Form-3A wk 10 |
| `AuthContext`, axios client with Bearer interceptor, `ProtectedRoute`, `RoleGuard`, friendly 403 page | Form-3A wk 10 |
| Auth connected to the inventory interface (M2 blueprints use `rbac` + `extensions` from here) | Form-3A wk 11 |
| Uniform error body `{"error": {"code", "message", "details"?}}` | — |

## Planned
| Feature | When |
|---|---|
| Security testing (rate limiting, password policy hardening) | Form-2 #5, Nov–Dec 2026 (Sprint 4) |
| Admin user management (the Users tab in Admin Settings shows sample users today) | Form-2 #6, Sprint 4 |
| Calling the ML service from the backend (`ML_SERVICE_URL`, `ML_SERVICE_KEY` already in config) | Sprint 7 |

## Endpoints
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | Public | `{name, email, password, role, branch_id?, supplier_id?}` → 201 `{user}` |
| POST | `/auth/login` | Public | `{email, password}` → `{access_token, token_type, expires_in, user}` |
| GET | `/users/me` | Logged in | profile with `branch_name` / `supplier_name` resolved |
| PUT | `/users/me` | Logged in | `{name?}` and/or `{current_password, new_password}`; email/role not editable |
| GET | `/health` | Public | `{status, db: "up"|"down"}` |

Token lifetime: `JWT_EXPIRES_MINUTES` (default 60). JWT claims: `sub` (user id), `role`, `name`,
`branch_id`, `supplier_id`, `exp`.

## Files
```
backend/app.py          create_app(): config, CORS, JWT, Mongo (fail-fast), indexes, blueprints, /health
backend/run.py          python -m m1_auth_lucky.backend.run
backend/config.py       reads .env at the repo root
backend/extensions.py   Mongo connect/get_db, ensure_indexes, jwt, bcrypt
backend/rbac.py         roles_required(), current_user()
backend/errors.py       ApiError + JSON error handlers + JWT error handlers
backend/auth/           routes.py, validators.py
backend/users/routes.py GET/PUT /users/me
backend/seed_users.py   5 demo users (password Demo@1234)
frontend/               api/client.js, context/AuthContext.jsx, routing/*, pages/*
tests/                  test_auth.py, test_rbac.py, test_profile.py (pytest + mongomock)
postman/                M1_Auth.postman_collection.json
```

## Test cases covered
| TC | What | Where |
|---|---|---|
| TC-01 | Stored hash ≠ password and bcrypt verifies it | `tests/test_auth.py::test_tc01_password_is_bcrypt_hashed` |
| TC-02 | Wrong password → 401 | `test_auth.py::test_tc02_wrong_password_401`, Postman |
| TC-03 | Pharmacist → admin-only route → 403 | `test_rbac.py::test_tc03_…`, Postman, UI `/admin/settings` |
| TC-12 | Supplier 2 opens supplier 1's PO → 403 | `test_rbac.py::test_tc12_…`, Postman |
| — | Duplicate email, short password, expired token, profile get/update | `test_auth.py`, `test_rbac.py`, `test_profile.py` |

```bash
pytest m1_auth_lucky -q
```

## Demo (about 3–4 minutes)
1. Register a new pharmacist in the UI (`/register`); show the errors for a duplicate email and a 7-character password.
2. In Compass/mongosh show `password_hash` is a bcrypt string starting with `$2b$` (TC-01):
   `db.users.findOne({email: "pharmacist@demo.com"}, {password_hash: 1})`
3. Log in with a wrong password → "Invalid email or password" (TC-02). Log in correctly; the JWT payload
   (role, exp) is printed in the browser console (`[auth] JWT payload`), or paste the token into jwt.io.
4. As the pharmacist open `/admin/settings` → 403 page. Postman: "TC-03 Pharmacist → admin-only" → 403 JSON.
5. Postman: "TC-12 Supplier2 → supplier1's PO" → 403.
6. Edit the profile name. Log out. Expired token: set `JWT_EXPIRES_MINUTES=1` in `.env`, restart the API,
   wait a minute → the next request shows "Session expired, please log in again" (or run the test).
7. `pytest m1_auth_lucky -q`
