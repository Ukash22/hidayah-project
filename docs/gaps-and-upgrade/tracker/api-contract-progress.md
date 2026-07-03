# API Contract Audit — Progress Tracker

Tracks implementation against [api-contract-audit.md](../items/api-contract-audit.md).

---

## Phase AC1 — One HTTP client (token refresh everywhere) 🟠

Migrated **97 call sites across 40 files** to the shared `api` instance so the 401→refresh→retry interceptor applies everywhere. Also added a **request interceptor** to `services/api.js` that reads the access token from localStorage per-request (previously the header was only set by an AuthContext effect, which runs after child page effects on first mount).

Intentionally left raw: the refresh call inside `api.js` itself, the public Cloudinary signature endpoint (`cloudinaryService.js`), and external quran.com calls (`QuranMushaf.jsx`).

| # | Item | Scope | Status |
|---|---|---|---|
| 0 | Request interceptor: token attached per-request from localStorage | `frontend/src/services/api.js` | ✅ Done |
| 1 | Student portal pages | `frontend/src/pages/student/` | ✅ Done |
| 2 | Tutor portal pages | `frontend/src/pages/tutor/` | ✅ Done |
| 3 | Shared components (TutorWallet, NotificationCenter, TrialForm, Tutors, modals, JambCBT) | `frontend/src/components/` | ✅ Done |
| 4 | Remaining top-level pages (BookingRequest, CBTInterface, PaymentPage, PaymentCallback, ExamHub, AIHub, admin exam tools, …) | `frontend/src/pages/` | ✅ Done |

> Note: explicit `{ headers: getAuthHeader() }` configs were deliberately left in place during migration — they're redundant but harmless (the refresh interceptor overwrites the header on retry). Remove opportunistically.

## Phase AC2 — Response shape normalisation 🟠

| # | Item | File | Status |
|---|---|---|---|
| 5 | `asList(data)` helper (array ⟶ itself, envelope ⟶ `.results`, else `[]`) | `frontend/src/services/api.js` | ✅ Done |
| 6 | Replace ad-hoc `Array.isArray(...)` ternaries with `asList` (opportunistic, alongside AC1 migration) | ~30 files | ⬜ Pending |
| 7 | Policy adopted: growable lists paginate with envelope; shape changes require same-change frontend PR | this doc / README | ✅ Documented |

## Phase AC3 — API schema & docs 🟡

| # | Item | File | Status |
|---|---|---|---|
| 8 | Install `drf-spectacular`, add `/api/schema/` + `/api/docs/` (Swagger UI; AllowAny in DEBUG, staff-only in prod) | `backend/core/settings.py`, `core/urls.py`, `requirements.txt` | ✅ Done |
| 9 | Annotate payments + auth `APIView`s with `@extend_schema` (they currently appear untyped — 54 unique introspection warnings) | `backend/payments/`, `backend/accounts/` | ⬜ Pending |

## Phase AC4 — Error shape convention 🟡

| # | Item | Status |
|---|---|---|
| 10 | Convention: new/edited custom views return `{"error": "<msg>"}`; DRF defaults untouched; frontend reads via `getApiError` | ✅ Documented (no retrofit — mobile-app risk) |

## Phase AC5 — Routing cleanup 🟢

| # | Item | File | Status |
|---|---|---|---|
| 11 | Verified zero usage (frontend, mobile_app, backend emails/templates) → duplicate `/api/accounts/` include removed | `backend/core/urls.py` | ✅ Done |
| 12 | Programs prefix decision: **leave `/api/programs/list/` as-is** — renaming is exactly the breaking change the additive-only policy forbids; documented in items file | `backend/programs/urls.py` | ✅ Decided |

## Phase AC6 — Versioning policy 🟢

| # | Item | Status |
|---|---|---|
| 13 | Additive-only rule adopted; `/api/v2/<resource>` only on unavoidable breaking change; documented in README ("API compatibility policy") | ✅ Done |
