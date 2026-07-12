# Performance Audit Progress Tracker

Tracks implementation progress against the performance audit (`performance-audit.md`).

---

## Phase P1 — Database Indexes ✅ Complete

> **Note:** `Notification.user` is a ForeignKey — Django auto-indexes all FKs. No migration needed there.

| # | Item | File | Status |
|---|---|---|---|
| 1 | Add `db_index=True` to `StudentProfile.payment_status` | `backend/students/models.py:21` | ✅ Done |
| 2 | Add `db_index=True` to `ScheduledSession.status` | `backend/classes/models.py:28` | ✅ Done |

---

## Phase P2 — Async Task Dispatch ✅ Complete

Unified dispatcher in `backend/core/dispatch.py` — uses Celery when `REDIS_URL` is set, falls back to a `ThreadPoolExecutor` otherwise. Tasks defined in `backend/core/tasks.py`. Celery app configured in `backend/core/celery.py`. All args are JSON-serializable (PKs, not model instances). Each task retries 3× with 60s back-off on failure.

To enable Celery on Render: add a Background Worker service to `render.yaml` with `startCommand: celery -A core worker --loglevel=info --concurrency=2`.

| # | Item | File | Status |
|---|---|---|---|
| 3 | Defer PDF generation + `send_admission_letter_email` via `run_async` | `backend/accounts/views.py` | ✅ Done |
| 4 | Defer all three tutor workflow emails via `run_async` | `backend/tutors/views.py` | ✅ Done |
| 5 | Defer trial confirmation `send_mail` via `run_async` | `backend/applications/views.py` | ✅ Done |

---

## Phase P3 — N+1 Query Fixes ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 7 | Fix `TutorViewSet.admin_list()` — bulk wallet lookup before loop | `backend/tutors/views.py` | ✅ Done |
| 8 | Fix `AdminUnifiedClassListView` — `select_related` already present in queryset | `backend/classes/views.py` | ✅ Already OK |
| 9 | Fix `EnrollmentSerializer.get_tutor_class_link()` — add `prefetch_related('enrollments__tutor__tutor_profile')` to student views | `backend/students/views.py` | ✅ Done |
| 10 | Fix `EnrollmentSerializer.get_upcoming_sessions()` — deduplicated session query via instance cache | `backend/students/serializers.py` | ✅ Done |
| 11 | Fix `TutorProfileSerializer.get_busy_slots()` — only called on detail view; list uses LiteTutorSerializer | `backend/tutors/serializers.py` | ✅ Already OK |
| 12 | Fix `PendingStudentSerializer.get_profile_data()` — `select_related('student_profile')` in view; access via reverse accessor in serializer | `backend/accounts/views.py`, `backend/accounts/serializers.py` | ✅ Done |
| 13 | Fix `by_subject` Python loop — push keyword filter to SQL `Q()` objects | `backend/tutors/views.py` | ✅ Done |

---

## Phase P4 — Heavy Serializers & Pagination ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 14 | Enforce `LiteTutorSerializer` on `by_subject` action | `backend/tutors/views.py` | ✅ Already OK — `get_serializer_class` already includes `by_subject` |
| 15 | Remove `wallet_balance` from list serializer | `backend/tutors/serializers.py` | ✅ Already OK — `LiteTutorSerializer` (no wallet_balance) used for all list actions |
| 16 | Add `LimitOffsetPagination` to `TutorViewSet` | `backend/tutors/views.py` | ✅ Done |
| 17 | Add pagination to `UserSessionListView`; fix `tutor__tutor_profile` and `zoom_class` N+1s | `backend/classes/views.py` | ✅ Done |
| 18 | Reduce `AdminPaymentAnalyticsView` history to 20 records | `backend/payments/views.py` | ✅ Done |

---

## Phase P5 — Frontend Dynamic Imports ✅ Complete

Pattern: extract the component that uses the heavy library into its own file, then `React.lazy(() => import('./ThatComponent'))` at the usage site.

| # | Item | File | Status |
|---|---|---|---|
| 19 | Lazy load `Calculator` in CBTInterface | `frontend/src/pages/CBTInterface.jsx` | ✅ Done |
| 20 | Extract `MediaModal` to own file, lazy-load in BookingRequest | `frontend/src/pages/BookingRequest.jsx` | ✅ Done |
| 21 | Extract recharts into `AdminRevenueChart.jsx`, lazy-load in AdminFinancials | `frontend/src/pages/admin/AdminFinancials.jsx` | ✅ Done |

---

## Phase P6 — Frontend Re-render Optimisation ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 22 | Extract `TutorCard` with local `isExpanded`/`mediaModal` state + `React.memo`; stable `useCallback` in parent | `frontend/src/components/TutorCard.jsx` | ✅ Done |
| 23 | Extract `ClassCard` with local reschedule modal state + `React.memo` | `frontend/src/components/ClassCard.jsx` | ✅ Done |
| 24 | Extract `ExamTimer` — timer ticks no longer re-render question grid | `frontend/src/components/ExamTimer.jsx` | ✅ Done |
| 25 | Extract `ExamRow` with `React.memo` in AdminExamManager | `frontend/src/pages/AdminExamManager.jsx` | ✅ Done |
| 26 | Split `AuthContext` into `AuthStateContext` + `UserContext`; added `useToken()` and `useUser()` hooks | `frontend/src/context/AuthContext.jsx` | ✅ Done |

---

## Phase P7 — Component Splitting ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 27 | Split `Register.jsx` (610 lines) → per-step components (`RegisterStep1`, `RegisterStep2`, `RegisterStep3`) | `frontend/src/pages/register/` | ✅ Done |

---

## Phase P8 — Redis Response Caching ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 29 | Configure `django.core.cache.backends.redis.RedisCache` in `settings.py` | `backend/core/settings.py` | ✅ Done |
| 30 | Cache `GET /api/tutors/` (approved tutor list) — 5-min TTL per query-string variant | `backend/tutors/views.py` | ✅ Done |
| 31 | Cache `GET /api/programs/` (programme catalogue) — 10-min TTL, invalidated on write | `backend/programs/views.py` | ✅ Done |
| 32 | Cache `GET /api/payments/analytics/` (admin analytics) — 5-min TTL | `backend/payments/views.py` | ✅ Done |
