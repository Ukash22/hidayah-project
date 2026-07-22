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
| 6 | **Replace WhatsApp placeholder** — set `VITE_WHATSAPP_NUMBER` (frontend env) and `WHATSAPP_NUMBER` (backend env if used) to the real Nigerian number in `2348XXXXXXXXX` format | Before launch | Homepage WhatsApp float button and FAQ CTA currently point to `2348000000000` (a dummy number). Also grep `src/` for any hardcoded `2348000000000` and replace. |
| 7 | Optional: uncomment `hidayah-celery` worker in `render.yaml` (~$7/mo) | Whenever | Adds email/PDF retry; without it tasks run in a thread pool — fully functional |

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

### Audit 11 — UI deep dive, D-1 through D-4 (complete)

Full screen-by-screen review of all 45 screens. Four implementation phases, all shipped. Details in [`ui-deep-dive-progress.md`](gaps-and-upgrade/tracker/ui-deep-dive-progress.md).

**D-1 — Bugs fixed:**
- **X1** (`primary-600/700` dead classes): 13 occurrences across 11 files replaced with `primary-dark`; also defined missing `--primary-rgb` CSS variable used by button shadows.
- **StudentLibrary ExternalLink button**: was labelled + focusable but did nothing — wired to open the resource link.
- **X2 (5 hard navigations)**: AIHub wallet gate, ExamHub JAMB launch, ExamHub wallet lock panel, Login/Register admin redirects → all `navigate()`. Impersonation and ErrorBoundary reloads remain full-page **by design** (they need a hard refresh to rehydrate auth state).

**D-2 — High-value small items:**
- **Admin search**: AdminStudents (name/username/email/course/tutor) + AdminTutors (name/email/subject) — client-side filter + payment-status chips.
- **Password change**: `POST /api/auth/password/change/` (old + new + confirm, validators, 4 tests) + shared `AccountSettings.jsx` page wired to all four portal shells via sidebar. **Do not create role-specific account pages** — this page is shared by design.
- **Notifications "view all"**: `NotificationsPage.jsx` shared across all four shells + "View All" link in the bell dropdown; optimistic mark-read; portal-aware deep-link routing for notification links.
- **Tutor availability editing**: `PUT /api/tutors/me/availability/` (replace-slots, 3 tests) + inline slot editor mounted on `TutorProfilePage`. The wizard's `AvailabilityManager` component is reused.

**D-3 — Consistency sweep:**
- **X3 micro-text** (60 files): `text-[9/10px] uppercase tracking-widest font-bold` → `text-[11px] uppercase tracking-wide font-semibold`. 16 remaining `text-[9px]` bumped to `text-[10px]`.
- **X4 emoji → lucide in portals**: AdminStudents (📹→Video, ✅/❌→status dots), TutorRequests (📥⏳✅ tab labels stripped, 👤→User), ParentOverview (🧒→User), AdminOverview (🎥→Video), ExamHub (⚙️→Settings, 📜→Lock).
- **X6 decorative bounce removed**: AIHub (🤖→Bot), ExamHub lock (📜→Lock), StudentOverview bell — all replaced with static lucide icons. Raised-hand + student reaction emojis kept (semantic, not decorative).
- **ExamManager/QuestionManager into admin shell**: stripped standalone Navbar/min-h-screen; now nested admin routes at `/admin/exams` and `/admin/exams/:examId/questions`.

**D-4 — Feature investments:**
- **Parent portal build-out**: `GET /api/parents/children/{id}/detail/` (child sessions + wallet transactions) + `POST /api/parents/children/{id}/fund_wallet/` backend with 7 new tests. `ParentChildDetail.jsx` — sessions table, wallet balance, Add Funds modal; "Detail" link added alongside the impersonation button.
- **Student progress/results history**: `GET /api/students/me/progress/` (attendance stats + exam score trend, 3 tests). `StudentProgress.jsx` with SVG bar chart, attendance ring, subject breakdown bars — previously `ExamResult` data existed but was unreachable in the UI.
- **Homepage conversion**: `Pricing.jsx` (live data from `/api/payments/pricing/`, static fallback), `Testimonials.jsx` (4 cards + social proof bar), `FAQ.jsx` (7-item accordion, 2-col layout, WhatsApp CTA). Sticky `WhatsAppFloat` button. Footer updated with Pricing + FAQ + WhatsApp links.
- **Smaller shipped items**: register step-2 running price estimate; TutorProfile "Book this tutor" preselects tutor (`?tutor_id=`); tutor wizard localStorage draft persistence; complaint status timeline (OPEN→UNDER_REVIEW→RESOLVED) in TutorComplaints; withdrawal reject-with-reason (`admin_notes` field + RejectModal); admin CSV export (`downloadCSV` utility on Students + Tutors pages); analytics date-range (`?date_from=&date_to=` on backend, skips cache; date pickers + Apply/Clear in AdminFinancials).

**Rules for new code that come out of this audit:**
- `AccountSettings` and `NotificationsPage` are shared — route them via all four shells, don't fork per role.
- `downloadCSV(rows, filename)` utility exists in `src/utils/` — use it for any new CSV export.
- `getApiError(err, fallback)` handles all DRF error shapes — use it instead of `err.response?.data?.error || fallback`.
- Analytics endpoints that support date ranges skip the Redis cache — expected behaviour, not a bug.
- ExamManager/QuestionManager are now inside the admin shell — don't add any more standalone authenticated pages that duplicate the portal chrome.

---

### Audits 1–2 (UI/UX + Page Architecture — earlier work)
Toast/Confirm system, portal shells (`DashboardShell` + nested routes), skeletons, per-step register wizard, drawer/sidebar structure. Trackers exist if you need history.

---

## 3. Decisions you might mistake for bugs (D-numbers → DECISIONS.md)

- **Negative wallet balances are ALLOWED** — admin clawback mechanism; a test asserts debit-below-zero succeeds (D11)
- **Impersonation stores child token in localStorage** — must survive a hard redirect; parent stays in the cookie (D15)
- `/api/programs/list/` weird prefix stays (D6) · tutor list cache is 5-min stale by design (D2) · `text-slate-400` on dark toolbars is correct contrast (D10) · refresh-in-body still accepted for legacy clients (D14) · payments mocked until launch flip (D17) · scratch history purge is a public-repo precondition (D12/Q1)

---

## 5. July 2026 — Portal consolidation, live class UX, AI worker planning

Changes made after the initial July 2026 audit wave. No new migrations or backend model changes in this batch — all are frontend or doc changes plus the AI worker plan.

---

### 5a. ExamHub and AIHub moved into the student portal

Both pages were previously standalone routes (`/exam-practice`, `/ai-hub`) with their own `<Navbar />` and dark full-page layouts. They are now nested inside the student portal:

| Old route | New route |
|-----------|-----------|
| `/exam-practice` | `/student/exam-practice` |
| `/ai-hub` | `/student/ai-hub` |

Legacy routes remain as `<Navigate replace />` redirects so old links/bookmarks keep working.

**What changed in each file:**
- `ExamHub.jsx` — removed `<Navbar />`, outer wrapper, and dark container; added `<PageHeader>`; `window.location.href = ...` → `navigate(...)` for JAMB launch; adjusted `sticky top-*` values from `top-32` (below navbar) to `top-6` (portal); emerald theme throughout.
- `AIHub.jsx` — same stripping pattern; indigo theme; `profileLoading` state added to prevent wallet-gate flash.
- `StudentShell.jsx` — two new nav items added: Exam Practice (`🎓`) and AI Hub (`🤖`).
- `App.jsx` — new nested routes under `/student`; legacy redirects; CBTInterface stays at `/exam/practice/:id` (full-screen, must not have portal sidebar).

**CBTInterface stays standalone.** It's a full-screen timed exam that must not have the portal sidebar. ExamHub links to it; CBT navigates away on completion.

---

### 5b. BookingModal — booking form extracted from TutorCard

The inline "Book This Tutor" expand-section inside each `TutorCard` was removed. Booking is now a full-screen overlay modal (`BookingModal.jsx` — new file).

**Pattern:**
- `TutorCard` is now a ~130-line display card with a single CTA button that calls `onBook(tutor)`.
- `BookingRequest` manages `selectedTutor` state and renders `<BookingModal>` under `<AnimatePresence>`.
- Modal closes on backdrop click or Escape key.
- `DAYS`, `addHoursToTime`, `fmt12h` helpers live in `BookingModal.jsx`.

**Theme change:** `TutorCard` and `BookingRequest` both moved from dark-glass (`bg-white/5`) to the portal's light background (`bg-white border-slate-200`). Remove any future cards with dark-glass styling on this page.

---

### 5c. LiveClassRoom improvements

Three changes to the live class screen (`LiveClassRoom.jsx` + `WebRTCVideoChat.jsx`):

1. **Exit Room button** — The existing "Leave" button in WebRTCVideoChat only called `setIsVideoOpen(false)` (no navigation). Added a separate `Exit Room` button in the LiveClassRoom header that calls `navigate(-1)`. The header is emerald-themed with a pulsing LIVE badge.

2. **Local video PIP** — The local user video panel in classroom mode was `h-48 md:h-56`. Reduced to `h-32 md:h-40` so it's less intrusive as a picture-in-picture.

3. **Chat click-outside close** — Added `chatPanelRef` + `mousedown` event listener to `WebRTCVideoChat`. Clicking outside the chat panel sets `showChat(false)`.

---

### 5d. MathToolsPanel auto-close

All five insert actions in `MathToolsPanel.jsx` (Graph, Angle, Pie Chart, Ruler, Protractor) now call `onClose()` immediately after inserting the shape. Previously the panel stayed open, requiring a manual close.

---

### 5e. Seed command — materials section

`backend/accounts/management/commands/seed.py` gained a `_seed_materials()` method.

- Triggered by `python manage.py seed --section materials` or `--section all`.
- Creates 8 `LearningMaterial` records across 3 demo tutors using `get_or_create` (idempotent).
- All use `material_type='LINK'` with YouTube `external_url` — Cloudinary is not configured in dev so `material_type='VIDEO'` would store a null file URL.
- When Cloudinary is configured in production, VIDEO/PDF/AUDIO types work normally (file stored in Cloudinary, `file_url` populated).

---

### 5f. New/updated docs

| File | What changed |
|------|-------------|
| `docs/frontend.md` | Full rewrite — route tables for all 4 portals, portal shell architecture, page stripping recipe, exam distinction table, components reference |
| `docs/ai-hub-worker-plan.md` | New full implementation plan — stateless FastAPI Question Engine covering AI Hub, Exam Practice, and JAMB CBT sessions; Redis key design (5 roles); Celery task definitions; past question data sources and ingestion pipeline; 6-phase rollout |

---

### 5g. Planned: Question Engine (not implemented yet)

See `docs/ai-hub-worker-plan.md` for the full plan. Key points for co-devs:

- The current `ai_engine/services.py` calls OpenAI synchronously inside a Django request — blocks the worker thread for 5–30s under load.
- The plan moves all AI/CBT question concerns to a stateless FastAPI service (`ai_worker/`).
- Django becomes a proxy: JWT auth → wallet check → Redis rate limit → call worker → store result.
- Redis adds: CBT session state (server-enforced timer + browser-crash recovery), question cache (24h TTL), AI bank cache (6h TTL, pre-warmed nightly by Celery), rate limiting.
- The frontend does NOT change for Phase 1–3 — same API URLs, same response shapes.
- `OPENAI_API_KEY` moves from Django to the worker service in production; Django keeps it only as the `services.py` fallback during dev.

**Do not refactor `ai_engine/services.py` directly.** The migration path is additive: worker up → Django proxy with fallback → remove fallback. See the plan's Phase section.

---

### 5h. Student exam enrollment — known gap

`StudentProfile.level` and `target_exam_type` are set at registration and cannot be changed by the student after the fact. There is no self-service update UI. JAMB CBT auto-configures from `target_exam_type`, so a student who registered incorrectly (e.g., SECONDARY instead of JAMB) gets the wrong exam type.

**Fix location:** Account Settings page — expose `level` and `target_exam_type` as editable fields. No backend change needed (the fields exist and are updateable via the profile endpoint). This is not yet implemented.

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
