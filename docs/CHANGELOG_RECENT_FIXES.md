# Recent Code Changes & Fixes Log

---

## [2026-09-24] Notification Message Display Fix

**Date:** September 24, 2026  
**Environment:** Local Development (`localhost:5173` frontend / `127.0.0.1:8000` backend)

### Root Cause
In-app notification messages were not displaying because of a **backend routing bug** and a **frontend stale closure**.

#### Backend — `accounts/views.py` & `accounts/urls.py`
- **Bug:** `NotificationListView` had both `get()` (list, no pk) and `post(self, request, pk)` (mark-read, requires pk) on the same class. Django REST Framework's URL dispatcher for `POST /api/auth/notifications/` routed to this view **without** a `pk`, causing a `TypeError: post() missing 1 required positional argument: 'pk'` — crashing the endpoint silently and preventing the frontend from receiving any data when it tried to fetch on first load (if the browser sent a stale cached POST).
- **Fix:** Split into three dedicated views:
  - `NotificationListView` — `GET /api/auth/notifications/` (list only)
  - `NotificationMarkReadView` — `POST /api/auth/notifications/<pk>/read/`
  - `NotificationMarkAllReadView` — `POST /api/auth/notifications/read-all/` *(new)*
- **Files changed:**
  - `backend/accounts/views.py` — removed `post()` from `NotificationListView`, added `NotificationMarkReadView` and `NotificationMarkAllReadView`
  - `backend/accounts/urls.py` — updated import and added `read-all/` URL pattern

#### Frontend — `NotificationCenter.jsx`
- **Bug 1:** `useEffect` had `[]` as dependency array but used `fetchNotifications` (a `useCallback`) inside — this is a stale closure; the ESLint suppression comment masked the warning. On fast re-renders `fetchNotifications` could reference a stale token.
- **Bug 2:** `useAuth` and `user` were imported but never used (dead import).
- **Fix:**
  - Added `fetchNotifications` to the `useEffect` dependency array (correct per React rules).
  - Removed unused `useAuth` import.
  - Added **"Mark all read"** button in the dropdown header, wired to the new `read-all/` endpoint.
- **File changed:** `frontend/src/components/NotificationCenter.jsx`

#### Frontend — `NotificationsPage.jsx`
- **Enhancement:** Added `markAllRead()` handler and a contextual **"Mark all read"** button in the page header (only shown when unread notifications exist).
- **File changed:** `frontend/src/pages/NotificationsPage.jsx`

### Summary of Changed Files

| File | Component | Change |
|------|-----------|--------|
| `backend/accounts/views.py` | Backend (Auth) | Split `NotificationListView` into `NotificationListView`, `NotificationMarkReadView`, `NotificationMarkAllReadView` |
| `backend/accounts/urls.py` | Backend (Auth) | Wired split views; added `read-all/` URL |
| `frontend/src/components/NotificationCenter.jsx` | Frontend (UI) | Fixed stale `useEffect` dep, removed dead import, added "Mark all read" button |
| `frontend/src/pages/NotificationsPage.jsx` | Frontend (Pages) | Added `markAllRead()` and "Mark all read" button in header |

---

**Date:** September 11, 2026  
**Environment:** Local Development (`localhost:5173` frontend / `127.0.0.1:8000` backend)

---


## 1. Summary of Changed Files

| # | File Path | Component | Description of Change |
|---|---|---|---|
| 1 | `frontend/src/pages/admin/AdminOverview.jsx` | Frontend (Admin) | Fixed `results.map` callback parameter bug causing "Failed to fetch dashboard data" alert; added `min-w-0` and explicit dimensions to Recharts containers. |
| 2 | `frontend/src/pages/PaymentCallback.jsx` | Frontend (Payments) | Made post-payment verification redirect role-aware (`/parent` vs `/student`), updated manual "Go to Dashboard" button, and reduced delay to 5s. |
| 3 | `frontend/src/pages/PaymentPage.jsx` | Frontend (Payments) | Updated wallet balance payment success redirect to be role-aware (`/parent` vs `/student`). |
| 4 | `backend/core/settings.py` | Backend (Core) | Added `FRONTEND_URL` definition with fallback to `http://localhost:5173` in DEBUG mode and Render domain in production. |
| 5 | `backend/.env` | Backend (Config) | Set `FRONTEND_URL=http://localhost:5173` for local payment callback routing; switched `DATABASE_URL=sqlite:///db.sqlite3`. |
| 6 | `docs/CO-DEV-NOTES.md` | Documentation | Added section `5i. Payment Redirection Flow & FRONTEND_URL — ✅ fixed`. |
| 7 | `docs/PAYMENT_FLOW_AND_REDIRECT_NOTE.md` | Documentation | Created comprehensive documentation of the complete payment lifecycle, callback verification, and dashboard redirection. |
| 8 | `frontend/src/pages/student/StudentClasses.jsx` | Frontend (Student) | Fixed Babel/Vite JSX syntax error caused by duplicated ternary operators and invalid IIFE syntax; cleanly structured conditional empty/locked state. |
| 9 | `backend/core/settings.py` | Backend (Storage/Config) | Made default storage backend conditional on `CLOUDINARY_CLOUD_NAME`; added automatic fallback to `FileSystemStorage` when Cloudinary is unconfigured. |
| 10 | `backend/students/serializers.py` | Backend (Students) | Safely resolved assigned tutor avatar using `resolve_media_url` in `get_assigned_tutor_details`, resolving 500 error on `/api/students/me/`. |
| 11 | `backend/tutors/serializers.py` | Backend (Tutors) | Added explicit `image = serializers.SerializerMethodField()` on `TutorProfileSerializer` for resilient media serialization across all tutor endpoints. |
| 12 | `backend/students/utils.py` & `views.py` | Backend (Students) | Added defensive try-except blocks when reading `profile.admission_letter.url` during enrollment and PDF regeneration. |

---

## 2. Detailed Per-File Changes

### 1. `frontend/src/pages/admin/AdminOverview.jsx`
- **Location:** Lines 56–72 and lines 192–252.
- **Problem:**
  1. `const ok = (i) => results[i].status === 'fulfilled' ? results[i].value : null;` was called inside `results.map(ok)`.
  2. Because `Array.prototype.map` passes `(element, index)` to the callback, parameter `i` was the settled result object rather than an index number.
  3. `results[i]` evaluated to `results["[object Object]"]` (`undefined`), throwing `TypeError: Cannot read properties of undefined (reading 'status')`.
  4. The error caught in the `catch` block and triggered `setError('Failed to fetch dashboard data.')` even though all 9 backend endpoints returned HTTP `200 OK`.
  5. Recharts `<ResponsiveContainer>` instances inside CSS grid items lacked `min-w-0` and explicit minimum dimension attributes, triggering console warnings: `The width(-1) and height(-1) of chart should be greater than 0`.
- **Changes Applied:**
  ```javascript
  // Line 59: Corrected callback parameter from (i) to (r)
  - const ok = (i) => results[i].status === 'fulfilled' ? results[i].value : null;
  + const ok = (r) => r.status === 'fulfilled' ? r.value : null;
    const [studRes, tutRes, appRes, bookRes, withRes, compRes, clsRes, settRes, statsRes] = results.map(ok);
  ```
  ```jsx
  // Chart wrappers: Added min-w-0 and ResponsiveContainer dimensions
  - <div className="h-48 w-full">
  -     <ResponsiveContainer>
  + <div className="h-48 w-full min-w-0">
  +     <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={180}>
  ```

---

### 2. `frontend/src/pages/PaymentCallback.jsx`
- **Location:** Lines 39–48, lines 166–175, lines 193–203.
- **Problem:**
  1. After successful verification, the auto-redirect was hardcoded to `navigate('/student')`.
  2. If a parent paid fees on behalf of a child, redirecting to `/student` was intercepted by `ProtectedRoute`, resulting in unnecessary role-mismatch redirection.
  3. The manual "Go to Dashboard" button in both success and error panels also had hardcoded `/student`.
- **Changes Applied:**
  ```javascript
  // Automatic timeout redirect:
  - setTimeout(() => {
  -     navigate('/student');
  - }, 8000);
  + const destination = user?.role === 'PARENT' ? '/parent' : '/student';
  + setTimeout(() => {
  +     navigate(destination);
  + }, 5000);
  ```
  ```jsx
  // Manual "Go to Dashboard" buttons:
  - onClick={() => navigate('/student')}
  + onClick={() => navigate(user?.role === 'PARENT' ? '/parent' : '/student')}
  ```

---

### 3. `frontend/src/pages/PaymentPage.jsx`
- **Location:** Lines 111–117.
- **Problem:**
  1. When using internal wallet balance to pay for a booking, the success handler hardcoded `navigate('/student', ...)`.
- **Changes Applied:**
  ```javascript
  - navigate('/student', { state: { message: 'Payment processed successfully using your wallet balance!' } });
  + navigate(user?.role === 'PARENT' ? '/parent' : '/student', { state: { message: 'Payment processed successfully using your wallet balance!' } });
  ```

---

### 4. `backend/core/settings.py`
- **Location:** Lines 95–100.
- **Problem:**
  1. `FRONTEND_URL` was not declared in `settings.py`.
  2. In `backend/payments/paystack_service.py`, `getattr(settings, 'FRONTEND_URL', 'https://hidayah-frontend.onrender.com')` defaulted to the live production Render frontend.
  3. Consequently, local payment callbacks were redirected away from `http://localhost:5173` to the live site.
- **Changes Applied:**
  ```python
  # Frontend URL for payment redirects and email links
  FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173' if DEBUG else 'https://hidayah-frontend.onrender.com')
  ```

---

### 5. `backend/.env`
- **Location:** Lines 13 and 28.
- **Changes Applied:**
  ```env
  # Set local database to SQLite
  DATABASE_URL=sqlite:///db.sqlite3

  # Added frontend URL for local payment callbacks
  FRONTEND_URL=http://localhost:5173
  ```

---

### 6. `docs/CO-DEV-NOTES.md`
- **Location:** Section 5i (lines 220–235).
- **Changes Applied:**
  - Added documentation section `5i. Payment Redirection Flow & FRONTEND_URL — ✅ fixed` summarizing the `FRONTEND_URL` requirement, role-aware routing, and student dashboard navigation via `StudentShell`.

---

### 7. `docs/PAYMENT_FLOW_AND_REDIRECT_NOTE.md`
- **Location:** Entire file (new document).
- **Changes Applied:**
  - Full end-to-end documentation of the payment flow:
    - Gateway initiation (`PaymentPage.jsx`)
    - Paystack callback & verification (`PaymentCallback.jsx`)
    - Auto-redirect and manual navigation to `/student` (`/student/overview`)
    - Wallet payment flow
    - Resolution of the missing `FRONTEND_URL` issue.

---

### 8. `frontend/src/pages/student/StudentClasses.jsx`
- **Location:** Lines 67–141.
- **Problem:**
  - Build failure in Vite/Babel compiler: `[plugin:vite:react-babel] Unexpected token (109:16)`.
  - Caused by an accidental duplicate ternary operator and misplaced IIFE wrapper in JSX:
    ```jsx
    // Before:
    )) : (
    ) : (() => {
        const isUnpaidLocked = ...;
        return (...);
    })()}
    )}
    ```
- **Changes Applied:**
  - Extracted `isUnpaidLocked` calculation out of JSX up to component scope:
    ```jsx
    const isUnpaidLocked = profile?.payment_status === 'UNPAID' && parseFloat(profile?.wallet_balance || 0) <= 0;
    ```
  - Replaced the broken nested ternary and IIFE with clean, standard React conditional rendering (`classes.length > 0 ? (...) : (...)`).
  - Verified with ESLint: 0 errors.

---

### 9. `backend/core/settings.py`
- **Location:** Lines 267–285.
- **Problem:**
  - Django's default storage backend `STORAGES["default"]["BACKEND"]` was hardcoded to `cloudinary_storage.storage.MediaCloudinaryStorage`.
  - In local development, Cloudinary environment variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are intentionally left unconfigured in `.env`.
  - Any attempt to resolve a model file/image field's `.url` property triggered `ValueError: Must supply cloud_name in tag or in configuration`, crashing endpoints with a `500 Internal Server Error`.
- **Changes Applied:**
  - Made the default storage engine conditional on the presence of `CLOUDINARY_CLOUD_NAME`:
    ```python
    if os.getenv('CLOUDINARY_CLOUD_NAME'):
        CLOUDINARY_STORAGE = {
            'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
            'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
            'API_SECRET': os.getenv('CLOUDINARY_API_SECRET'),
        }
        _default_storage = "cloudinary_storage.storage.MediaCloudinaryStorage"
    else:
        _default_storage = "django.core.files.storage.FileSystemStorage"

    STORAGES = {
        "default": {
            "BACKEND": _default_storage,
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.StaticFilesStorage",
        },
    }
    ```
  - In local dev, media files now use Django's local `FileSystemStorage` safely without crashing. In production environments where `CLOUDINARY_CLOUD_NAME` is set, Cloudinary is automatically used.

---

### 10. `backend/students/serializers.py`
- **Location:** Lines 8 and lines 98–111.
- **Problem:**
  - When fetching student profiles (`/api/students/me/` and `/api/students/admin/all/`), `get_assigned_tutor_details` directly read `tp.image.url` without defensive handling:
    ```python
    'image': tp.image.url if tp.image else None,
    ```
  - If storage is misconfigured or a storage backend error occurs, this crashed the entire serializer and returned HTTP 500 to the frontend student overview dashboard.
- **Changes Applied:**
  - Imported the unified media resolution helper from tutors:
    ```python
    from tutors.serializers import PublicTutorSerializer, resolve_media_url
    ```
  - Updated `get_assigned_tutor_details` to resolve avatar image fields safely:
    ```python
    'image': resolve_media_url(tp.image),
    ```

---

### 11. `backend/tutors/serializers.py`
- **Location:** Line 101.
- **Problem:**
  - `TutorProfileSerializer` inherited `TutorMediaFieldsMixin` (which provides safe `get_image(self, obj)` via `resolve_media_url`), but did not declare `image = serializers.SerializerMethodField()`.
  - Consequently, DRF used the default `ImageField` representation which attempted to read `.url` directly on the storage engine.
- **Changes Applied:**
  - Added explicit `image = serializers.SerializerMethodField()` to `TutorProfileSerializer` to guarantee safe URL resolution across all tutor profile queries.

---

### 12. `backend/students/utils.py` & `backend/students/views.py`
- **Location:** `utils.py` line 47; `views.py` lines 248–258.
- **Problem:**
  - Direct accesses to `profile.admission_letter.url` without error handling in enrollment request and admission letter update workflows.
- **Changes Applied:**
  - Wrapped `profile.admission_letter.url` access in `try...except Exception` blocks, gracefully falling back to `None` if the storage backend is unavailable or the file path is non-standard.

---

### 13. `backend/students/serializers.py` — Admin Student Update 400 Fix

- **Location:** Full file (refactored); problem began at `17:35:31`, resolved at `17:55:15`.
- **Problem:**
  - `PATCH /api/students/admin/<id>/update/` returned HTTP 400 ("Bad Request") when the admin submitted the Manage Student form.
  - Root cause: The `StudentProfileSerializer` used the raw DRF field auto-generation for several writable fields, causing validation failures with:
    - `assigned_tutor` — needed to gracefully accept an empty string, `"0"`, `null`, or a TutorProfile ID (instead of only a strict User PK).
    - `meeting_link` and `whiteboard_link` — the model uses `URLField`, which by default rejects empty strings. A custom `CharField(required=False, allow_blank=True, allow_null=True)` override was added.
    - `level`, `class_type`, etc. — needed permissive `CharField` overrides to skip model-level `choices` validation from DRF.
  - `AdminStudentDetailView.perform_update()` called `self.get_object()` again to capture the old tutor — causing a double DB query but was not the 400 source.
- **Changes Applied:**
  - Added `FlexibleTutorRelatedField(PrimaryKeyRelatedField)` — accepts empty string, `"0"`, `null`, or a TutorProfile ID with fallback lookup, resolving to `None` or the correct `User`.
  - Added explicit `CharField` overrides for `assigned_tutor`, `meeting_link`, `whiteboard_link`, `level`, `class_type`, `days_per_week`, `hours_per_week`, `enrolled_course` with `required=False, allow_blank=True, allow_null=True`.
  - Added `admission_letter_url = SerializerMethodField()` + safe `get_admission_letter_url()` using `try/except`.
  - Set `admission_letter` as `write_only` via `extra_kwargs`.
  - Added `get_assigned_tutor_details()`, `get_preferred_tutor_details()` methods.

---

### 14. `frontend/src/pages/admin/AdminStudents.jsx` — Tutor Dropdown Value Mismatch

- **Location:** Lines 71, 88–92, 298.
- **Problem:**
  1. In `openManage()`, the form was initialized with `student.assigned_tutor` (a raw User ID integer), but the tutor dropdown options used `t.id` (TutorProfile ID). This caused the dropdown to never show the currently-assigned tutor.
  2. When a user picks a tutor and saves, the wrong ID type was being sent (TutorProfile ID instead of User ID).
  3. Error display used `err.response?.data?.error` which would be `undefined` for field-level validation errors (DRF returns a dict), showing only the generic HTTP status message.
- **Changes Applied:**
  ```javascript
  // openManage: prefer user_id from assigned_tutor_details, fallback to assigned_tutor field
  - assigned_tutor: student.assigned_tutor || '',
  + assigned_tutor: student.assigned_tutor_details?.user_id || student.assigned_tutor || '',
  ```
  ```jsx
  // Dropdown option value: use user_id (User PK) instead of t.id (TutorProfile PK)
  - {approvedTutors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
  + {approvedTutors.map(t => <option key={t.id} value={t.user_id || t.id}>{t.name || `${t.first_name} ${t.last_name}`.trim()}</option>)}
  ```
  ```javascript
  // Error display: parse DRF field-level validation errors into readable string
  - toast.error('Failed to update student: ' + (err.response?.data?.error || err.message));
  + const errData = err.response?.data;
  + const errMsg = typeof errData === 'object' && errData !== null
  +     ? (errData.error || Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
  +     : err.message;
  + toast.error('Failed to update student: ' + errMsg);
  ```


