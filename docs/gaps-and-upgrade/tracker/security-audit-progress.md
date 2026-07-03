# Security Audit Progress Tracker

Tracks implementation progress against the security audit (`security-audit.md`).

---

## Phase S1 — Critical Settings Fixes ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 1 | Remove SECRET_KEY hardcoded fallback | `backend/core/settings.py:32` | ✅ Done — `os.environ["SECRET_KEY"]`, KeyError if missing |
| 2 | Change DEBUG default to `"False"` | `backend/core/settings.py:35` | ✅ Done |
| 3 | Fix ALLOWED_HOSTS — invert wildcard condition | `backend/core/settings.py:37–38` | ✅ Done — default `localhost,127.0.0.1`; `*` only appended when DEBUG=True |

---

## Phase S2 — Backend Permission Hardening ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 4 | WebSocket `BoardConsumer` — add `is_authenticated` check in `connect()` | `backend/whiteboard/consumers.py` | ✅ Done — closes with code 4001 if unauthenticated |
| 5 | WebSocket `SignalingConsumer` — add `is_authenticated` check in `connect()` | `backend/whiteboard/consumers.py` | ✅ Done — closes with code 4001 if unauthenticated |
| 6 | `AdminWalletActionView` — `IsAuthenticated` → `IsAdminUser` | `backend/payments/views.py` | ✅ Done — runtime `is_staff` check removed |
| 7 | `AdminTransactionListView` — `IsAuthenticated` → `IsAdminUser` | `backend/payments/views.py` | ✅ Done — runtime `is_staff` check removed |
| 8 | `cloudinary_signature` action — `[]` → `[IsAuthenticated]` | `backend/tutors/views.py` | ⚠️ Accepted Risk — reverted to `[]`. Tutor registration uploads files before an account exists; requiring auth breaks the public registration flow. Mitigated by: client-side MIME/size validation (`cloudinaryService.js`) + global anon throttle (100/min). |
| 9 | Remove `BasicAuthentication` + `SessionAuthentication` from `REST_FRAMEWORK` | `backend/core/settings.py` | ✅ Done — JWT-only; global throttling added |

---

## Phase S3 — Medium Fixes ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 10 | Add file type + size validation before Cloudinary upload | `frontend/src/services/cloudinaryService.js` | ✅ Done — `validateFile()` checks MIME type + size before upload |
| 11 | Replace `print()` with `logging.debug()` in WebSocket consumers | `backend/whiteboard/consumers.py` | ✅ Done — module-level `logger`; all print() removed |
| 12 | Replace `str(e)` responses with generic message + server-side logging | `backend/payments/views.py`, `backend/tutors/views.py` | ✅ Done — `logger.exception()` server-side; generic message to client |
| 13 | Add DRF throttling — global rates on all endpoints | `backend/core/settings.py` | ✅ Done — `AnonRateThrottle` 100/min, `UserRateThrottle` 300/min |

### Throttle rates applied

| Throttle | Rate | Applies to |
|---|---|---|
| `anon` | 100/minute | All unauthenticated requests |
| `user` | 300/minute | All authenticated requests |

> Note: Login and password-reset endpoints would benefit from a stricter custom throttle (e.g. `5/minute` for anon). This requires creating a `LoginRateThrottle` class and applying it directly to those views — tracked as a follow-up.

---

## Phase S4 — JWT Storage (Planned, Not Started) ⬜ Pending

This is the highest-effort item and requires coordinated frontend + backend changes. Treated as a separate workstream.

| # | Item | File(s) | Status |
|---|---|---|---|
| 14 | Move access token to memory; refresh token to `httpOnly` cookie | `AuthContext.jsx`, backend token endpoint, all API service files | ⬜ Pending |

---

## Confirmed Safe — No Action Required

| # | Item | Notes |
|---|---|---|
| 13 | Paystack webhook `permission_classes = []` | HMAC SHA-512 validation confirmed in `paystack_service.py`. Correct pattern. |
| — | `PAYSTACK_SECRET_KEY` env var | No insecure default. Read directly from env. ✅ |
| — | CORS configuration | Correctly configured, no `AllowAll`. ✅ |
| — | Security headers (HSTS, XSS filter, SSL redirect) | Correctly gated by `not DEBUG`. ✅ |
