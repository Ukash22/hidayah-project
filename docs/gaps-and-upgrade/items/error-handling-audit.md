# Error Handling Audit — Findings

Audit #5 from the [audit index](../audit-index.md). Scope: uncaught promise rejections, missing error boundaries, silent catch blocks, raw `str(e)` in views, user-facing error messages.

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## E1 🔴 Backend logs plaintext passwords and payment data (debug prints)

`print()` statements in production views write to stdout, which Render captures and retains in service logs.

| # | File | Problem |
|---|---|---|
| 1 | `backend/tutors/views.py:251` | `print(f"DEBUG: Tutor Registration Attempt - Data: {request.data}")` — **logs the full registration payload including the plaintext password** |
| 2 | `backend/tutors/views.py:317, 322` | Registration success/error prints — should be logger calls |
| 3 | `backend/payments/views.py:73, 109, 113, 138, 153` | Payment references, amounts, and gateway verification results printed to stdout |
| 4 | `backend/applications/views.py:257` | `print(f"Email Error: {e}")` — errors invisible to log aggregation/levels |

**Fix:** Replace all `print()` in views with `logger` calls; never log request bodies on auth/registration endpoints; log usernames/references only.

---

## E2 🟠 No React error boundary anywhere

`frontend/src/App.jsx` wraps ~50 `React.lazy` routes in `<Suspense>` but there is **no ErrorBoundary component in the entire frontend** (verified by glob).

Consequences:
- Any render error in any page **white-screens the whole app** with no recovery path.
- After each deploy, users with a stale `index.html` hit chunk-load 404s on lazy imports — `lazy()` rejection propagates as a render error → white screen. This *will* happen routinely because the app is a static site with hashed chunk names.

**Fix:**
1. Create `components/ErrorBoundary.jsx` (class component with `componentDidCatch`).
2. Detect chunk-load failures (`error.name === 'ChunkLoadError'` / message contains `Failed to fetch dynamically imported module`) and show a "New version available — Reload" screen that calls `window.location.reload()`.
3. Wrap the router once globally, and optionally each portal shell (Admin/Tutor/Student/Parent) so one portal crashing doesn't take down the shell chrome.

---

## E3 🟠 Raw `str(e)` returned to API clients (13 sites)

Returning raw exception text leaks internals (SQL constraint text, file paths, third-party API errors) and produces unusable user-facing messages.

| File | Lines |
|---|---|
| `backend/accounts/views.py` | 198, 236 |
| `backend/applications/views.py` | 122, 166, 239, 404, 488, 540 |
| `backend/classes/views.py` | 481 |
| `backend/tutors/views.py` | 238, 321 (register returns `Server Error: {str(e)}`), 463 |
| `backend/ai_engine/views.py` | 56 |

**Fix pattern:** `logger.exception("context")` server-side; return `Response({"error": "Something went wrong. Please try again."}, status=500)` (or a specific, safe message for expected failure modes). Keep `str(e)` only for validation-type errors that are safe and actionable.

---

## E4 🟠 Silent data-fetch failures on portal pages (systemic)

64 `console.error(...)` calls across 48 files follow this pattern:

```jsx
} catch (err) {
    console.error('Overview fetch failed', err);
} finally {
    setLoading(false);
}
```

The page then renders its **empty state** — a student whose network dropped sees "no classes", indistinguishable from actually having no classes. No retry, no message.

**Fix:** Shared pattern for portal pages — an `error` state rendered as a small "Couldn't load data — Retry" panel (reusing the fetch function), or at minimum `toast.error('Failed to load…')` in every page-level fetch catch. Highest-value pages first: StudentOverview, StudentClasses, StudentFinance, TutorSchedule, AdminOverview, PaymentPage/PaymentCallback.

Intentional fire-and-forget catches (`.catch(() => {})` in `TutorShell.jsx:32`, `TutorSchedule.jsx:47,49,51`) are acceptable for non-critical side data but should be commented as deliberate.

---

## E5 🟡 Leftover blocking `alert()` / `window.confirm()` (Phase 7 stragglers)

The Toast/ConfirmDialog system exists and covers most call-sites; these remain:

| File | Line | Call |
|---|---|---|
| `frontend/src/pages/student/StudentOverview.jsx` | 138, 142, 150 | `alert()` success/error/validation |
| `frontend/src/pages/student/StudentFinance.jsx` | 77 | `alert()` receipt failure |
| `frontend/src/pages/student/StudentClasses.jsx` | 39 | `alert('Invalid session ID')` |
| `frontend/src/components/TutorWallet.jsx` | 85 | `alert()` PDF failure |
| `frontend/src/components/JambCBT.jsx` | 134 | `alert()` question load failure |
| `frontend/src/components/Whiteboard/ExamPanel.jsx` | 98, 107 | `window.confirm()` ×2, `alert()` at 106 |

**Fix:** Replace with `toast.success/error` and the custom `confirm()` used everywhere else.

---

## E6 🟡 Bare `except: pass` blocks swallow everything

| File | Line |
|---|---|
| `backend/classes/models.py` | 120 |
| `backend/accounts/serializers.py` | 263 |
| `backend/accounts/views.py` | 134 |
| `backend/applications/views.py` | 317, 445 |
| `backend/payments/services.py` | 119 (inside payment flow — a swallowed error here can hide money-path bugs) |
| `backend/applications/admin.py` | 158 |

**Fix:** Catch the narrowest exception that is actually expected; add `logger.warning(...)` so failures are at least visible. `payments/services.py:119` first.

---

## E7 🟢 Inconsistent error payload shape

Backend responses mix `{"error": ...}`, `{"detail": ...}`, and DRF field-error dicts; frontend pages each hand-roll parsing (`err.response?.data?.error || err.response?.data?.detail || ...`). Standardise on one shape (suggest `{"error": "<message>"}` for custom views, leave DRF validation dicts as-is) and add a tiny frontend helper `getApiError(err)`. Overlaps with Audit #6 (API Contract) — track there if preferred.
