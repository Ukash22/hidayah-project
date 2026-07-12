# API Contract Audit — Findings

Audit #6 from the [audit index](../audit-index.md). Scope: request/response shape consistency, missing pagination, undocumented endpoints, versioning strategy, serializer field gaps.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## A1 🟠 Two HTTP clients — token refresh only works on one

Measured: **101 raw `axios.*` calls** in pages/components vs **60 via the shared `api` instance** (`services/api.js`).

The 401 → refresh-token → retry interceptor lives only on the `api` instance. Every page using raw `axios` with `getAuthHeader()` (most portal dashboards: StudentOverview, StudentClasses, TutorSchedule, TutorWalletPage, BookingRequest, …) gets **no refresh**: when the 1-day access token expires mid-session, all fetches 401 and the user sees error panels until they manually log in again.

**Fix:** migrate portal pages from `axios.get(`${VITE_API_BASE_URL}/…`, { headers: getAuthHeader() })` to `api.get('/…')`. The `api` instance already sets baseURL and auth handling. Mechanical change, batch per portal (student → tutor → admin → parent). No backend change needed.

---

## A2 🟠 Response shape roulette — arrays vs paginated envelopes

Only 2 endpoints paginate: `/api/tutors/` (opt-in via `?limit=`) and `/api/classes/sessions/` (always, envelope). Everything else returns bare arrays. Consequence: **30 frontend files** carry defensive `Array.isArray(res.data) ? res.data : (res.data?.results || ...)` branching, and the P4 pagination change silently broke 3 pages until caught.

**Fix:**
1. Add `asList(data)` helper next to `getApiError` in `services/api.js`: returns `data` if array, else `data.results ?? []`. Use it at every list-fetch site instead of ad-hoc ternaries.
2. Document the shape of every list endpoint in a contract table (see A4 — generated schema makes this free).
3. Policy going forward: new list endpoints that can grow unboundedly must paginate (envelope); small fixed lists (subjects, pricing tiers) stay arrays. Never change an existing endpoint's shape without a frontend PR in the same change.

---

## A3 🟡 Error payload shape mixed

Custom views return `{"error": …}`, some `{"detail": …}`, DRF validation returns field dicts, and JWT/permission errors return `{"detail": …}`. Frontend `getApiError()` (added in EH7) already normalises on read.

**Fix (convention, not retrofit):** all *new/edited* custom `APIView` responses use `{"error": "<message>"}`; leave DRF's own `detail`/field-dict responses alone — `getApiError` handles both. Retrofitting existing responses would risk the mobile app for zero user benefit.

---

## A4 🟡 ~90 endpoints, zero API documentation

No drf-spectacular / swagger / schema tooling is installed. Endpoint count by app: payments 19, classes 16, accounts 12, applications 10, students 8, feedback 4, plus 5 router-based apps.

**Fix:** add `drf-spectacular` — `SPECTACULAR_SETTINGS` + `/api/schema/` + `/api/docs/` (Swagger UI), gated to admin users in production. Generated docs double as the shape-contract table from A2. ~30 min of setup; serializer-less `APIView`s will show as untyped until annotated, which is acceptable — annotate the payments and auth endpoints first.

---

## A5 🟡 No versioning strategy (and a mobile app that makes it matter)

All routes live at unversioned `/api/…`, and `mobile_app/` (Capacitor) ships the same frontend on independent release cycles — an old installed app version can hit a newer backend.

**Fix (policy, not URL surgery):** do **not** retrofit `/api/v1/` now — every client would need simultaneous updates for zero immediate gain. Instead adopt and document an **additive-only rule**: never remove/rename response fields or change shapes on existing endpoints; add new fields/endpoints freely. Introduce `/api/v2/<resource>` only when a genuinely breaking change is unavoidable. (The P4 sessions-envelope change is exactly the class of change this rule exists to catch.)

---

## A6 🟢 Routing quirks

| Quirk | Detail | Risk |
|---|---|---|
| Duplicate mount | `accounts.urls` included at **both** `/api/auth/` and `/api/accounts/` (`core/urls.py`) | Same endpoints at two URLs; double attack/maintenance surface. Frontend uses `/api/auth/…` — verify nothing uses `/api/accounts/…` (incl. mobile), then remove the duplicate |
| Bare mount | `applications.urls` included at `/api/` root | Future path-collision risk with other apps |
| Odd prefix | Programs router registers prefix `list` → catalogue lives at `/api/programs/list/` | Confusing (already caused wrong-URL tests); rename to `programs` alongside a frontend update, or leave and document |
| Router roots | `DefaultRouter` exposes browsable API-root pages | Cosmetic; switch to `SimpleRouter` if unwanted |

---

## A7 🟢 Unbounded admin lists

`/api/tutors/admin/list/`, admin student/booking lists return entire tables. Fine at current scale; apply the A2 pagination policy when any of these tables reach thousands of rows. (Admin transaction history was already capped at 20 in P4.)

---

## Serializer field gaps (observations)

- `LiteTutorSerializer` (list/public/by_subject) vs `TutorProfileSerializer` (detail): list omits `wallet_balance`/`busy_slots` by design — `busy_slots` is bolted on manually in `by_subject`. Document that detail-only fields exist; don't add them to lists (that was the P4 perf win).
- `hourly_rate` serialises as a **string** (DRF Decimal default) — frontend `parseFloat`s everywhere. Harmless, but worth noting in the contract docs so nobody "fixes" it into a float and breaks money precision.
