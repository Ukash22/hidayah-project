# Error Handling Audit — Progress Tracker

Tracks implementation against [error-handling-audit.md](../items/error-handling-audit.md).

---

## Phase EH1 — Stop logging secrets & payment data 🔴 ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 1 | Remove registration payload print (plaintext password) — now logs username only | `backend/tutors/views.py` | ✅ Done |
| 2 | Convert remaining registration prints to logger | `backend/tutors/views.py` | ✅ Done |
| 3 | Convert payment prints to `logger.debug` (refs + success flags only, no gateway payloads) | `backend/payments/views.py` | ✅ Done |
| 4 | Convert email error print to `logger.exception` | `backend/applications/views.py` | ✅ Done |

## Phase EH2 — React ErrorBoundary 🟠 ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 5 | Create `ErrorBoundary.jsx` with chunk-load "Reload for new version" handling | `frontend/src/components/ErrorBoundary.jsx` | ✅ Done |
| 6 | Wrap router globally in App.jsx | `frontend/src/App.jsx` | ✅ Done |

## Phase EH3 — Sanitise `str(e)` API responses 🟠 ✅ Complete

All 13 sites now `logger.exception(...)` server-side and return generic safe messages.

| # | Item | File | Status |
|---|---|---|---|
| 7 | accounts views (2 sites) | `backend/accounts/views.py` | ✅ Done |
| 8 | applications views (6 sites) | `backend/applications/views.py` | ✅ Done |
| 9 | tutors views (3 sites, incl. register `Server Error:` leak) | `backend/tutors/views.py` | ✅ Done |
| 10 | classes + ai_engine views (2 sites) | `backend/classes/views.py`, `backend/ai_engine/views.py` | ✅ Done |

## Phase EH4 — Fetch-failure UX on portal pages 🟠 ✅ Complete (3 low-priority pages deferred)

| # | Item | File | Status |
|---|---|---|---|
| 11 | Shared `FetchError` retry panel component (exported from `components/ui`) | `frontend/src/components/ui/FetchError.jsx` | ✅ Done |
| 12 | Money pages: StudentFinance, TutorWalletPage, PaymentCallback (dedicated "couldn't confirm — don't pay again" state with retry, distinct from a rejected payment) | — | ✅ Done |
| 13 | Main dashboards: StudentOverview, StudentClasses, TutorSchedule | — | ✅ Done |
| 13b | Deferred (apply when next editing them): PaymentPage, AdminFinancials, AdminOverview — failures there surface via action buttons / staff users refresh | — | ⏸ Deferred |

## Phase EH4b — Production log visibility ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| — | `LOGGING` config: stdout handler, root INFO, `payments` logger at DEBUG so the payment init/verify trail is visible on Render | `backend/core/settings.py` | ✅ Done |

## Phase EH5 — Replace leftover alert/confirm 🟡 ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 14 | StudentOverview (3), StudentClasses, StudentFinance | `frontend/src/pages/student/` | ✅ Done |
| 15 | TutorWallet, JambCBT (alert + window.confirm), ExamPanel (alert + 2× window.confirm) | `frontend/src/components/` | ✅ Done |

## Phase EH6 — Fix bare `except: pass` 🟡 ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 16 | payments/services.py (money path) — narrowed to `(ValueError, TypeError)` + `logger.warning` | `backend/payments/services.py` | ✅ Done |
| 17 | Remaining sites — narrowed exceptions, logging on approval/email paths | `classes/models.py`, `accounts/views.py`, `accounts/serializers.py`, `applications/views.py`, `applications/admin.py` | ✅ Done |

## Phase EH7 — Standard error payload shape 🟢

**Approach decided:** frontend-only. Add a `getApiError(err, fallback)` helper (checks `error` → `detail` → first DRF field error → fallback) and adopt it opportunistically when pages are already being edited. Do NOT restructure backend response shapes now — that's a breaking change affecting the mobile app; decide the canonical shape in the API Contract Audit (#6).

| # | Item | File | Status |
|---|---|---|---|
| 18 | `getApiError(err)` frontend helper | `frontend/src/services/api.js` | ✅ Done |
| 19 | Adopt `getApiError` opportunistically when editing pages | — | ⏳ Ongoing |
