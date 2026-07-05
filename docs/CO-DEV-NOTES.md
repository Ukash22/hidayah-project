# Co-Developer Notes — July 2026 Upgrade Wave

Complete handover for the audit programme (10 audits), S4 auth hardening, and UI refresh. Written for whoever pulls this and handles redeployment. Deep links: findings in `docs/gaps-and-upgrade/items/`, live status in `docs/gaps-and-upgrade/tracker/`, decisions in `docs/gaps-and-upgrade/DECISIONS.md`.

---

## ⚠ 1. Deployment actions (Render)

| # | Action | When | Why |
|---|---|---|---|
| 1 | **Set `ADMIN_PASSWORD` in Render → Environment** | Before next deploy | `create_admin.py` used to reset the admin password to hardcoded `AdminPassword123!` on every deploy — prod is almost certainly still on it. Script now does nothing without the env var; setting it rotates the password |
| 2 | Nothing for migrations | — | `build.sh` auto-applies. This wave: `accounts/0005` (notification link), `payments/0008` + `tutors/0012` + `classes/0012` (money validators), `classes/0011` + `students/0020` (indexes), `notifications/0002` (drops orphaned table) |
| 3 | Expect **all users logged out once** | At deploy | S4 switched to httpOnly-cookie refresh; old localStorage sessions can't migrate. One re-login, done |
| 4 | Nothing for dependencies | — | `drf-spectacular` + `celery[redis]` are in requirements.txt, auto-installed |
| 5 | **`PAYSTACK_MOCK_MODE=False`** | Launch day only | Payments are SIMULATED until then (env default True) |
| 6 | Optional: uncomment `hidayah-celery` worker in `render.yaml` (~$7/mo) | Whenever | Adds email/PDF retry; without it tasks run in a thread pool — fully functional |

Full env-var table: `docs/README.md` → Environment Variables (incl. new `REFRESH_COOKIE_*`, `CORS_EXTRA_ORIGINS`, `ADMIN_*`, `VITE_DEV_PROXY_TARGET`).

---

## 2. Per-audit detail

### Audit 3 — Security (S1–S4 complete)
**Fixed:** JWT hardening (S4): refresh token only in httpOnly cookie `hidayah_refresh` (path `/api/auth/`, None+Secure; env-overridable); access token in frontend memory (`services/tokenStore.js`); `AuthContext` bootstraps from cookie on load; `CookieTokenRefreshView` accepts legacy body `refresh` too; `LogoutView` clears the cookie. Impersonation redesigned: child access token uses the one permitted `localStorage('access')` override; parent session stays in the cookie; refresh is disabled during impersonation. Also earlier: tutor admin endpoints (`admin/list`, `admin/action`, `manage`, `assign`) were open to any/anonymous users — now `IsAdminUser`; `update_profile` requires ownership; registration no longer logs plaintext passwords.
**Remaining:** stricter login/password-reset throttle (custom `5/min` anon class — noted in security tracker); **iOS webview cookie verification** on a real device (WKWebView may drop the cross-site cookie — fallback plan in mobile tracker).

### Audit 4 — Performance (P1–P8 complete)
**In place:** DB indexes (`StudentProfile.payment_status`, `ScheduledSession.status`); async dispatcher `core/dispatch.py` (Celery when `REDIS_URL`, thread-pool fallback, 3× retry when Celery); N+1 fixes (bulk wallet lookup in admin_list, SQL keyword search in by_subject, session prefetches); pagination (`/api/classes/sessions/` envelope limit 50; `/api/tutors/` opt-in via `?limit=`); Redis caching — tutors list 5 min/query-string, programs 10 min (write-invalidated), admin analytics 5 min; frontend: lazy recharts/MediaModal/Calculator, React.memo cards, AuthContext split, Register split into steps.
**Know:** cache staleness is documented behaviour (new tutor appears ≤5 min late — not a bug). Build warns about two >1MB chunks (Excalidraw internals) — pre-existing, untackled.

### Audit 5 — Error handling (complete)
**In place:** React `ErrorBoundary` wraps the router — catches render errors AND stale-chunk failures after deploys ("Update available — Reload"); `FetchError` retry panels on money pages + dashboards; PaymentCallback distinguishes "couldn't confirm — DON'T pay again" (network/5xx) from a rejected payment (4xx); all `str(e)` responses replaced with `logger.exception` + generic messages; zero `print()` in production paths; `LOGGING` config → stdout (Render retains), `payments` logger at DEBUG; toasts/ConfirmDialog everywhere (no `alert`/`window.confirm`); bare excepts narrowed.
**Remaining:** PaymentPage FetchError deliberately skipped (failures surface via its action buttons).

### Audit 6 — API contract (complete)
**In place:** ONE HTTP client — `services/api.js` (`api.get('/api/…')`): token attach + 401→cookie-refresh→retry. **Dev uses relative URLs through the Vite proxy** so the auth cookie is first-party. Helpers: `getApiError(err, fallback)` (handles `{error}`/`{detail}`/DRF dicts/HTML/network), `asList(data)` (array-or-`{results}`). drf-spectacular at `/api/docs/` (staff-only in prod); auth + payment endpoints annotated. Duplicate `/api/accounts/` mount removed (use `/api/auth/`).
**Policy (README):** additive-only API — never remove/rename fields or change shapes on existing endpoints (the Capacitor app ships separately); `/api/v2/<x>` only for unavoidable breaks. New growable lists must paginate with the envelope.
**Rules for new code:** internal calls via `api.*` only (no raw axios, no `${VITE_API_BASE_URL}` templates); custom views return `{"error": "<msg>"}`; annotate views with `@extend_schema` as you touch them (~40 still untyped in /api/docs).
**Remaining:** opportunistic annotation of the long tail; `/api/programs/list/` odd prefix stays (renaming = the exact break the policy forbids).

### Audit 7 — Accessibility (complete)
**In place:** Modal focus trap + restore (ConfirmDialog inherits); toast live region (`role="status"`, errors `role="alert"`); global `:focus-visible` outline (many components use `outline-none`); `MotionConfig reducedMotion="user"` + CSS media query killing pulse/bounce for reduced-motion users; contrast pass (slate-400→500 on light surfaces — **dark toolbars intentionally kept slate-400**); form labels associated (register wizard = wrapping `<label>`; modals/login = `htmlFor`); skip-to-content link in `DashboardShell`; whiteboard/live-class icon buttons labelled.
**Remaining:** ~90 inline labels on controls without a `name` attr — associate when touching each form (two patterns documented in items file).

### Audit 8 — Mobile / Capacitor (dev-stage complete; publish-stage parked)
**Fixed (app was unusable):** CORS now allows `https://localhost` + `capacitor://localhost` (before: every API call from the installed app failed, incl. login); Android `CAMERA`/`RECORD_AUDIO`/`MODIFY_AUDIO_SETTINGS`; iOS `NSCameraUsageDescription`/`NSMicrophoneUsageDescription` (without them iOS kills the app on getUserMedia); `viewport-fit=cover`.
**After every pull:** `cd frontend && npm run build && cd ../mobile_app && npx cap sync`.
**Parked for publish stage (tracker M-B/C/D):** in-app payment flow — Paystack redirect currently strands webview users on the hosted site; recommended `@capacitor/browser` + status polling, and CHECK Apple's policy on off-store payment first · final `appId` (still `com.hidayah.testapp` — **unchangeable after store publication**) · icons/splash/StatusBar plugins · push notifications (no plugin wired; needs FCM/APNs + device-token model + hooks in `core/tasks.py`) · safe-area `env()` padding verification on a notched device · iOS cookie check (see Audit 3).

### Audit 9 — Backend code quality (Q-A/Q-B complete; Q-C opportunistic)
**Fixed:** `backend/scratch/` untracked+ignored — it contained REAL DB dumps (user emails + password hashes). **Still in git history: run `git filter-repo --path backend/scratch --invert-paths` before the repo is ever public/shared.** Notification split-brain resolved (four writers posted to a model no endpoint read — admins never saw enrollment/class notifications; all on `accounts.Notification` now, orphan app retired). Dead shadowed methods removed; money validation (`MinValueValidator` on all money fields EXCEPT `Wallet.balance`); withdrawals reserve pending amounts; `resolve_media_url()`/`TutorMediaFieldsMixin` dedupe; `TutorRegisterSerializer` replaces 80-line inline registration (legacy `{'detail': msg}` contract preserved).
**Remaining (opportunistic):** drop the retired `notifications` app from INSTALLED_APPS in a later cleanup; gradual removal of the `# type: ignore/pylint: skip-file` headers + adopt ruff; `intro_video_url` looks legacy but **is still used** (video fallback + update handler — don't delete).

### Audit 10 — Test coverage (baseline done; policy adopted)
**State:** 63 tests in `backend/tests/` (~4s with `--settings=core.test_settings`); 48% backend line coverage. Two real bugs were caught BY writing tests (wallet-signal fixture clash; unknown-subject registration abort — an IntegrityError inside atomic used to kill the whole registration).
**Policy:** every bug fix ships a regression test · new endpoints ship happy-path + permission tests · money code needs math + idempotency tests · coverage is a compass, not a target.
**Top remaining gaps (T-B, add when touching each area):** Paystack webhook HMAC accept/reject · booking-payment fulfillment (`payments/logic.py`, 31%) · session generation (`classes/scheduler` 10%, `classes/utils` 0%) · trial approve/reject workflow · exam scoring.
**Frontend:** zero tests by DESIGN during UI churn — when a frontend bug bites twice, add vitest starting with `getApiError`/`asList`/`tokenStore`/price math.
Suite guide + conventions (incl. the Wallet `get_or_create` fixture gotcha): `backend/tests/README.md`.

### UI refresh ("calm premium", homepage Option B — complete)
**Done:** 679 `font-black`→`font-bold`; labels standardized to `text-[11px] font-semibold tracking-wide`; radius tokens `rounded-card` (1.25rem)/`rounded-card-lg` (1.75rem) replacing five arbitrary values; 405 raw `blue-600`→`primary` tokens (dark-rooted pages excluded); gold accent tokens (ratings use it); 12 decorative `animate-pulse` removed; **dark mode actually works now** — class-scoped `@custom-variant dark` on the shell root + 608 `dark:` variants in portal files (was: toggle recolored only the page background); tutor-wizard inputs made visible (`border-white/15`, lightened labels); mobile pass (responsive card paddings, scaled figures, 12 admin tables scroll-safe, hero stats 2×2 on phones); homepage de-pulsed with lucide icons + static gradient.
**Rules for new UI code:** no new `rounded-[Nrem]` (use the tokens) · `font-black` only for display titles · `primary`/`secondary`/`gold` tokens, not raw palette blues · pulse ONLY for loading/live/alert semantics (keep-list in the plan doc) · min text 11px · new portal cards need `dark:` variants.
**Remaining (opportunistic):** emoji→lucide in portal stat cards; `shadow-2xl` audit on flat cards; `Card` primitive component; stacked-card mobile variant for admin tables (they scroll fine meanwhile); dark-mode rough edges — the 608 variants were scripted, expect the odd light chip; patch individually.

### Audits 1–2 (UI/UX + Page Architecture — earlier work)
Toast/Confirm system, portal shells (`DashboardShell` + nested routes), skeletons, per-step register wizard, drawer/sidebar structure. Trackers exist if you need history.

---

## 3. Decisions you might mistake for bugs (D-numbers → DECISIONS.md)

- **Negative wallet balances are ALLOWED** — admin clawback mechanism; a test asserts debit-below-zero succeeds (D11)
- **Impersonation stores child token in localStorage** — must survive a hard redirect; parent stays in the cookie (D15)
- `/api/programs/list/` weird prefix stays (D6) · tutor list cache is 5-min stale by design (D2) · `text-slate-400` on dark toolbars is correct contrast (D10) · refresh-in-body still accepted for legacy clients (D14) · payments mocked until launch flip (D17) · scratch history purge is a public-repo precondition (D12/Q1)

---

## 4. Local dev quickstart deltas

```bash
# backend — .env already has SECRET_KEY/DEBUG/sqlite + commented templates for every knob
cd backend && python manage.py migrate && python manage.py runserver
# tests (fast):
python manage.py test tests --settings=core.test_settings

# frontend — API + auth cookie proxied same-origin in dev (vite.config.js); WS hits :8000 directly
cd frontend && npm run dev
```
- Cloudinary env vars optional locally — file URLs degrade to `null` instead of crashing.
- API docs while dev server runs: http://localhost:8000/api/docs/
- Use `http://localhost:5173` (not 127.0.0.1) in the browser for consistency.
