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

## Phase S4 — JWT Storage ✅ Complete

Design implemented:
- **Refresh token:** httpOnly cookie only (`hidayah_refresh`, path `/api/auth/`, Secure + SameSite=None in prod, Lax in dev). Never appears in a response body — XSS cannot exfiltrate it. `LoginView` sets it; new `LogoutView` clears it; `CookieTokenRefreshView` reads it (body `refresh` still accepted for legacy clients).
- **Access token:** in-memory only (`services/tokenStore.js`). On page load, `AuthContext` bootstraps a fresh access token from the cookie via `/api/auth/refresh/`. The 401 interceptor in `api.js` refreshes from the cookie, not storage. `CORS_ALLOW_CREDENTIALS` enabled; the `api` instance sends `withCredentials`.
- **One deliberate exception:** parent→child impersonation stores the CHILD access token in `localStorage('access')` as an override (it must survive a hard redirect, and the parent's cookie session stays untouched for "return to parent"). Exposure is limited to the child's 1-day access token during an active impersonation.

| # | Item | File(s) | Status |
|---|---|---|---|
| 14 | Access token in memory; refresh in httpOnly cookie; cookie-aware refresh/logout endpoints; impersonation reworked onto the cookie model; 6 auth-flow tests | `accounts/views.py`, `accounts/urls.py`, `core/settings.py`, `services/tokenStore.js`, `services/api.js`, `AuthContext.jsx`, `ParentOverview.jsx`, `StudentOverview.jsx`, `tests/test_auth.py` | ✅ Done |

> **Mobile caveat:** in the Capacitor app the cookie is cross-site (webview origin → onrender backend); Android WebView handles it, but iOS WKWebView's tracking prevention can drop third-party cookies. Verify login persistence on a real iOS build; if it fails, fall back to Capacitor's CookiesPlugin or a native-only storage path. Noted in the mobile tracker's publish-stage checks.

---

## Confirmed Safe — No Action Required

| # | Item | Notes |
|---|---|---|
| 13 | Paystack webhook `permission_classes = []` | HMAC SHA-512 validation confirmed in `paystack_service.py`. Correct pattern. |
| — | `PAYSTACK_SECRET_KEY` env var | No insecure default. Read directly from env. ✅ |
| — | CORS configuration | Correctly configured, no `AllowAll`. ✅ |
| — | Security headers (HSTS, XSS filter, SSL redirect) | Correctly gated by `not DEBUG`. ✅ |
