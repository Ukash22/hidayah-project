# Performance Audit — Backend & Frontend

Full performance review of the Hidayah codebase. Findings are organised by theme, each with the specific file(s), the problem, and the recommended fix.

---

## 1. N+1 Query Problems

### Problem

**`TutorProfileSerializer.get_busy_slots()`** — `backend/tutors/serializers.py:68–125`
The serializer method field queries `ScheduledSession`, `TrialApplication`, `Booking`, and `Enrollment` for every single tutor during serialization. For a list of 50 tutors, this produces 200+ queries on every `/api/tutors/` request.

**`PendingStudentSerializer.get_profile_data()`** — `backend/accounts/serializers.py:56–63`
Calls `StudentProfileSerializer` for each user in the list, which in turn calls `EnrollmentSerializer` for each profile. 20 pending students = 20+ profile queries + N enrollment queries.

**`EnrollmentSerializer.get_upcoming_sessions()`** — `backend/students/serializers.py:42–58`
Queries `ScheduledSession.objects.filter(enrollment=...)` inside the serializer for each enrollment. If a student has 3 enrollments, this makes 3+ queries, multiplied across all students.

**`EnrollmentSerializer.get_tutor_class_link()`** — `backend/students/serializers.py:35–39`
Accesses `tutor.tutor_profile` on line 37 without `prefetch_related`. If many enrollments are serialized, each one triggers a separate profile query.

**`TutorViewSet.admin_list()`** — `backend/tutors/views.py:128–159`
Loops over the queryset and calls `t.wallet_balance` inside each iteration. The `wallet_balance` property calls `Wallet.objects.get_or_create()` per tutor. 100 tutors = 100 wallet queries inside a loop.

**`AdminUnifiedClassListView.get()`** — `backend/classes/views.py:248–290`
Loops over regular sessions and trial sessions in Python, accessing `.student.get_full_name()` and `.tutor.get_full_name()` inside the loop without `select_related`. Each access triggers a query.

**`TutorViewSet.by_subject()`** — `backend/tutors/views.py:98–105`
Keyword matching loop in Python over the full approved tutor queryset. For 100 tutors, iterates every object without SQL-level filtering, then falls back to returning 12 anyway.

### Fix
- Move `get_busy_slots()` out of the serializer. Either annotate the queryset before serialization (using `annotate` + subquery), or prefetch all required related objects in one query and pass them in via context.
- Add `select_related('user', 'tutor_profile')` and `prefetch_related('enrollments__scheduled_sessions')` to all student/tutor list querysets.
- Replace `wallet_balance` property call inside loop with a bulk `Wallet.objects.filter(user__in=tutor_user_ids).values('user_id', 'balance')` lookup before the loop and map results by user ID.

---

## 2. Missing Database Indexes

### Problem

**`StudentProfile.payment_status`** — `backend/students/models.py:21`
`CharField` frequently filtered in `AdminStudentViewSet.get_queryset()` (to separate paid/unpaid students) but has no `db_index`.

**`ScheduledSession.status`** — `backend/classes/models.py:28`
`CharField` filtered in multiple views (`COMPLETED`, `PENDING`, `ACTIVE`) but has no index.

> **Note:** `Notification.user` is a `ForeignKey` — Django automatically creates a B-tree index on every ForeignKey column. No action needed there.

### Fix
Add `db_index=True` to `payment_status` and `ScheduledSession.status`, then run `makemigrations` + `migrate`. Django does **not** auto-index `CharField` or other non-FK fields — any field that appears regularly in `filter()` or `order_by()` should be indexed explicitly.

---

## 3. Overly Broad Querysets & Missing Pagination

### Problem

**`AdminPaymentAnalyticsView.get()`** — `backend/payments/views.py:597–668`
`all_payments = Payment.objects.all()` at line 597 — fetches the entire payments table with no limit. Then `recent = all_payments.select_related('student').order_by('-created_at')[:100]` returns 100 full payment records with joined student objects on every admin dashboard load, looping over all 100 to build a dict.

**`TutorViewSet` list endpoint** — `backend/tutors/views.py:30`
No `PageNumberPagination` or `LimitOffsetPagination` configured. Returns every approved tutor (could be hundreds) with all nested `get_busy_slots()` data on every request.

**`UserSessionListView.get()`** — `backend/classes/views.py:505`
Builds a combined list of all the user's sessions without pagination. For an active student with many sessions, returns the full history every time.

### Fix
- Set `DEFAULT_PAGINATION_CLASS` in `REST_FRAMEWORK` settings, or apply `pagination_class = LimitOffsetPagination` per viewset.
- Reduce `AdminPaymentAnalyticsView` history to the last 20 records and add a separate paginated history endpoint.
- Apply `.order_by('-created_at')[:50]` at minimum to session lists until pagination is implemented.

---

## 4. Synchronous Email Operations Blocking Requests

### Problem

**`ApproveStudentView.post()`** — `backend/accounts/views.py:193`
`send_admission_letter_email(user, profile)` is called synchronously inside the HTTP request handler. SMTP operations typically take 200–800ms. The admin's approval action blocks until the email is delivered or times out.

**`TutorViewSet.admin_action()`** — `backend/tutors/views.py:197–228`
Three recruitment actions (`INTERVIEW`, `APPROVE`, `REJECT`) each call email functions (`send_tutor_interview_email`, `send_tutor_approval_email`, `send_tutor_rejection_email`) synchronously. Admin recruitment workflow blocks on every action.

**`ApproveApplicationView.post()`** — `backend/applications/views.py:126`
`send_mail()` called synchronously during trial class approval.

### Fix
Move all email calls into Celery tasks. Redis is already in the stack for Django Channels — add `celery` and `django-celery-results` to requirements and configure the broker to use the existing `REDIS_URL`. Each email call becomes:
```python
# tasks.py
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_admission_email_task(self, user_id, profile_id):
    user = User.objects.get(pk=user_id)
    profile = StudentProfile.objects.get(pk=profile_id)
    send_admission_letter_email(user, profile)

# views.py (replaces the blocking call)
send_admission_email_task.delay(user.pk, profile.pk)
```
This gives automatic retry on SMTP failure, delivery confirmation, and task history — none of which a daemon thread provides. The HTTP response returns immediately while the worker handles delivery in the background.

---

## 5. Heavy Serializers on List Endpoints

### Problem

**`TutorProfileSerializer`** — `backend/tutors/serializers.py:36–125`
The default serializer used on `GET /api/tutors/` (public list) includes:
- `wallet_balance` property (line 37) — calls `Wallet.objects.get_or_create()` per tutor
- `get_busy_slots()` (line 68) — 4 additional queries per tutor

This serializer is too heavy for list views. A `LiteTutorSerializer` exists but is not used consistently.

**`StudentProfileSerializer`** — `backend/students/serializers.py:67`
Includes full `EnrollmentSerializer` (which runs `get_upcoming_sessions()` per enrollment) in the default serializer used on `GET /api/students/me/`.

### Fix
- Enforce `LiteTutorSerializer` on all list/public actions. The `get_serializer_class` override in `TutorViewSet` does this for `list` and `public`, but should also apply to `by_subject`.
- Create a `StudentProfileLiteSerializer` (without enrollments) for the overview endpoint, and a separate `/api/students/me/enrollments/` endpoint for enrollment data.

---

## 6. Frontend — Large Component Files (No Code Splitting)

### Problem

**`BookingRequest.jsx`** — `frontend/src/pages/BookingRequest.jsx` — 759 lines
Contains `MediaModal`, `TutorCard`, `ScheduleManager`, and the booking form all in one file. Any state change (modal open, tutor expand, schedule update) re-renders the full component tree including all tutor cards.

**`Register.jsx`** — `frontend/src/pages/Register.jsx` — 610 lines
Multi-step form with all steps in a single component. Every keystroke in any field triggers a re-render of all steps.

**`CBTInterface.jsx`** — `frontend/src/pages/CBTInterface.jsx` — 428 lines
Timer, question display, navigation grid, and submission logic all in one component. Timer tick (every second) re-renders the entire page including the question navigator grid.

**`AdminExamManager.jsx`** — `frontend/src/pages/AdminExamManager.jsx` — 394 lines
Exam list, exam editor modal, and student assignment modal in one file. Opening any modal re-renders the full exam list.

### Fix
- Extract `MediaModal`, individual `TutorCard`, and `ScheduleStep` out of `BookingRequest.jsx` into separate files, then wrap with `React.memo`.
- Split `Register.jsx` steps into `StepOne`, `StepTwo`, `StepThree` components — only the active step re-renders on keystroke.
- Extract `ExamTimer` from `CBTInterface.jsx` — the timer tick only re-renders the clock, not the question grid.

---

## 7. Frontend — Missing Dynamic Imports

### Problem

**`BookingRequest.jsx:4`** — `framer-motion` (`motion`, `AnimatePresence`) imported at the top level. Used only for the `MediaModal` entrance animation — loads the full motion library (≈30KB gzipped) even for users who never open the modal.

**`AdminFinancials.jsx:5–6`** — `recharts` (`AreaChart`, `BarChart`, `PieChart`, `ResponsiveContainer`, `Tooltip`) imported statically. The charts library is ≈80KB gzipped and is loaded even if the admin never scrolls to the chart section.

**`CBTInterface.jsx:5`** — `Calculator` component imported directly. Only shown when `showCalculator` is true but always bundled into the CBT chunk.

### Fix
The correct pattern is `React.lazy` wrapping the **component file** that uses the heavy library — not a dynamic `import()` of the library itself inside a component body (that would fail at render time).

```jsx
// CBTInterface.jsx — lazy-load the Calculator component
const Calculator = lazy(() => import('../components/Calculator'));
// Already correct — no change needed if this is already there

// BookingRequest.jsx — extract MediaModal into its own file first,
// then lazy-load it. MediaModal.jsx imports framer-motion internally.
const MediaModal = lazy(() => import('../components/MediaModal'));

// AdminFinancials.jsx — extract chart section into its own file,
// then lazy-load it. AdminCharts.jsx imports recharts internally.
const AdminCharts = lazy(() => import('../components/AdminCharts'));
```

Each lazy-loaded component must be wrapped with `<Suspense fallback={<div>Loading...</div>}>` at the usage site. The library bundle (framer-motion, recharts) is then split into a separate chunk and only downloaded when the component actually renders — not on the initial page load.

---

## 8. Frontend — Unnecessary Re-renders

### Problem

**`BookingRequest.jsx:94–95`** — `mediaModal` and `expandedTutor` state held in the parent. Every modal open/close or tutor card expand/collapse re-renders all tutor cards in the list (potentially 50+).

**`AdminExamManager.jsx:14–20`** — `editingExam`, `showModal`, `showAssignModal` state in the top-level component causes the entire exam list to re-render when any modal opens.

**`StudentClasses.jsx:18–20`** — `showRescheduleModal` and `selectedSessionId` state in the parent re-renders all class cards when the reschedule modal opens.

**`AuthContext` (App.jsx:119)** — Wraps the entire application. Any change to `user` state (login, logout, token refresh) triggers a re-render cascade through every consumer of the context.

### Fix
- Move `mediaModal` / `expandedTutor` state inside individual `TutorCard` components. State that only affects one card should live in that card.
- Wrap list-item components (`TutorCard`, class cards, exam rows) in `React.memo` to prevent re-renders when parent state changes but their props haven't changed.
- Split `AuthContext` into `AuthContext` (token, login/logout) and `UserContext` (user profile data) — most components only need one or the other.

---

## 9. No API Response Caching (Redis Underutilised)

### Problem

Redis is already running in the stack as the Django Channels broker, but is not used for response caching. Several expensive, rarely-changing API responses are computed on every request:

**`GET /api/tutors/`** — runs the full `TutorProfileSerializer` (N+1 queries + wallet lookups) for every visitor viewing the booking page. The approved tutor list changes only when an admin approves or removes a tutor — not on every page load.

**`GET /api/programs/`** — returns the full programme catalogue. Data changes only when an admin edits a programme. Fetched on every student dashboard load.

**`GET /api/payments/analytics/`** — `AdminPaymentAnalyticsView` scans all payments and builds an aggregated response. This is hit on every admin dashboard load. Admin analytics do not need real-time accuracy — a 5-minute cache is acceptable.

**`GET /api/students/admin/list/`** — runs `PendingStudentSerializer` with nested profile + enrollment queries. Admin student list changes only when a student registers or is approved.

### Fix

Configure Django's cache framework to use the existing Redis URL. No new infrastructure needed:

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.environ["REDIS_URL"],
    }
}
```

Then wrap expensive views with `cache.get/set`:

```python
from django.core.cache import cache

# In TutorViewSet.list() — cache for 5 minutes
def list(self, request, *args, **kwargs):
    cache_key = "tutor_list_approved"
    data = cache.get(cache_key)
    if data is None:
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=300)
        return response
    return Response(data)
```

Invalidate the cache key in `TutorViewSet.admin_action()` whenever a tutor is approved or removed. For the analytics endpoint, use `cache.get_or_set("payment_analytics", compute_fn, timeout=300)`.

---

## Summary Priority Matrix

| # | Severity | Issue | File(s) | Effort |
|---|---|---|---|---|
| 1 | 🔴 Critical | `get_busy_slots()` N+1 — 200+ queries on tutor list | `tutors/serializers.py:68` | Medium |
| 2 | 🔴 Critical | `PendingStudentSerializer` nested N+1 | `accounts/serializers.py:56` | Medium |
| 3 | 🔴 Critical | Synchronous email in `ApproveStudentView` — blocks HTTP response | `accounts/views.py:193` | Medium |
| 4 | 🔴 Critical | Synchronous emails in tutor recruitment actions — blocks HTTP response | `tutors/views.py:197–228` | Medium |
| 5 | 🔴 Critical | `AdminPaymentAnalyticsView` — unbounded queryset + 100-record loop | `payments/views.py:597–668` | Low |
| 6 | 🟠 High | No API response caching — Redis available but unused | `tutors/views.py`, `payments/views.py` | Low |
| 7 | 🟠 High | `EnrollmentSerializer` N+1 per enrollment | `students/serializers.py:42–58` | Medium |
| 8 | 🟠 High | `TutorViewSet.admin_list()` wallet query in loop | `tutors/views.py:128–159` | Low |
| 9 | 🟠 High | `AdminUnifiedClassListView` Python loop N+1 | `classes/views.py:248–290` | Medium |
| 10 | 🟠 High | `TutorProfileSerializer` — wallet + busy_slots on list | `tutors/serializers.py:36–125` | Medium |
| 11 | 🟠 High | `BookingRequest.jsx` — 759-line monolith, all cards re-render on modal | `pages/BookingRequest.jsx` | High |
| 12 | 🟠 High | `Register.jsx` — 610-line monolith, all steps re-render on keystroke | `pages/Register.jsx` | High |
| 13 | 🟠 High | `CBTInterface.jsx` — timer tick re-renders entire page | `pages/CBTInterface.jsx` | Medium |
| 14 | 🟠 High | `framer-motion` / `recharts` not code-split — loaded on initial bundle | `BookingRequest.jsx`, `AdminFinancials.jsx` | Medium |
| 15 | 🟠 High | No pagination on `/api/tutors/` | `tutors/views.py:30` | Low |
| 16 | 🟡 Medium | Missing index on `StudentProfile.payment_status` | `students/models.py:21` | Low |
| 17 | 🟡 Medium | Missing index on `ScheduledSession.status` | `classes/models.py:28` | Low |
| 18 | 🟡 Medium | `AdminExamManager.jsx` modal state re-renders exam list | `pages/AdminExamManager.jsx:14–20` | Low |
| 19 | 🟡 Medium | `StudentClasses.jsx` modal state re-renders all class cards | `pages/student/StudentClasses.jsx:18–20` | Low |
| 20 | 🟡 Medium | No pagination on `/api/classes/sessions/` | `classes/views.py:505` | Low |
| 21 | 🟡 Medium | `AuthContext` wraps entire app — login/logout re-renders everything | `context/AuthContext.jsx` | Medium |
| 22 | 🟡 Medium | `by_subject` Python loop over full queryset | `tutors/views.py:98–105` | Low |
| 23 | 🟡 Medium | Synchronous email in `ApproveApplicationView` — blocks HTTP response | `applications/views.py:126` | Medium |
