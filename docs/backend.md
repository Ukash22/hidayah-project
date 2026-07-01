# Backend Reference

Django 6.0 project using Django REST Framework and Django Channels. Entry point is `backend/manage.py`. The ASGI server (`daphne`) is used in production to support WebSocket connections.

Root URL config: `backend/core/urls.py`

---

## Django Apps

### `core`
Project configuration and shared utilities.

- `core/settings.py` — All settings: installed apps, database, CORS, Cloudinary, email, Paystack, Redis, JWT, Channels.
- `core/urls.py` — Root URL dispatcher (all apps registered under `/api/`).
- `core/asgi.py` — ASGI config (HTTP + WebSocket routing).
- `core/utils/pdf_generator.py` — ReportLab-based PDF generator for admission and appointment letters.

---

### `accounts`
Custom user model and in-app notifications.

**Models:**
- `User` (extends `AbstractUser`) — roles: `ADMIN`, `TUTOR`, `STUDENT`, `PARENT`. Fields include `phone`, `dob`, `gender`, `country`, `timezone`, `preferred_language`, `admission_number`, `is_verified`.
  - ADMIN role automatically gains `is_staff` and `is_superuser`.
- `Notification` — Per-user notifications with `title`, `message`, `is_read`.

**API prefix:** `/api/auth/` and `/api/accounts/`

Key endpoints include registration, login (JWT), password reset, profile management, and notification listing.

---

### `tutors`
Tutor profiles and the hiring/approval workflow.

**Models:**
- `TutorProfile` — One-to-one with `User`.
  - Workflow statuses: `APPLIED` → `INTERVIEW_SCHEDULED` → `APPROVED` / `REJECTED`.
  - Stores: `bio`, `image`, `cv_resume`, `credentials`, `intro_video`, `experience_years`, `subjects_to_teach`, `languages`, `availability_days`, `availability_hours`, `hourly_rate`, `commission_percentage`.
  - `device_type`: `COMPUTER`, `PHONE`, `BOTH`.
  - `is_public`, `is_blocked` flags for admin control.
  - `live_class_link` — Personal Zoom/meeting link for the tutor.
  - `wallet_balance` — Computed property from `payments.Wallet`.
- `TutorAvailability` — Structured availability slots (day + time blocks).

**API prefix:** `/api/tutors/`

---

### `students`
Student profiles, enrollment, and approval status.

**Models:**
- `StudentProfile` — One-to-one with `User`.
  - Approval: `PENDING` → `APPROVED` / `REJECTED`.
  - Payment status: `UNPAID`, `PAID`, `PARTIAL`.
  - `level`: `PRIMARY`, `SECONDARY`, `JUNIOR_WAEC`, `JAMB`, `WAEC`, `NECO`.
  - `class_type`: `ONE_ON_ONE` or `GROUP`.
  - `enrolled_courses` — M2M to `programs.Subject`.
  - `target_exam_type` / `target_exam_year` — For exam preparation tracking.
  - `assigned_tutor`, `preferred_tutor` — FK to `User` (role=TUTOR).
  - `wallet_balance` — Computed property from `payments.Wallet`.
  - `admission_letter` — PDF uploaded to Cloudinary.
- `Enrollment` — Structured enrollment record with `preferred_days`, `preferred_time`, `preferred_start_date`, `hours_per_week`, `hours_per_session`, `class_structure`, `learning_level`.

**API prefix:** `/api/students/`

---

### `parents`
Parent dashboard — allows a parent account to view their child's profile and sessions.

**Models:** No dedicated models; uses `User.is_parent_account` and `StudentProfile.parent` FK.

**API prefix:** `/api/parents/`

---

### `applications`
Free trial class request and Zoom integration.

**Models:**
- `TrialApplication` — Prospective student submits name, email, course interest, preferred day/time. Statuses: `pending`, `approved`, `rejected`. On approval, `tutor` and `scheduled_at` are set.
- `ZoomClass` — Linked to a `TrialApplication`. Stores `meeting_id`, `join_url`, `start_url`, `password`, `whiteboard_url`.

**Services:**
- `zoom_service.py` — Creates/updates Zoom meetings via the Zoom API.
- `live_class_service.py` — Helpers for starting and managing live class state.
- `email_service.py` — Sends confirmation and reminder emails for trials.

**Management command:** `send_reminders` — Sends email reminders before scheduled trial classes.

**API prefix:** `/api/` (trial applications are the primary resource here)

---

### `classes`
Scheduled sessions, rescheduling, and booking.

**Models:**
- `ScheduledSession` — The core class record.
  - FK to `student` (User) and `tutor` (User).
  - FK to `programs.Subject`.
  - `is_trial` flag.
  - Statuses: `PENDING`, `COMPLETED`, `RESCHEDULED`, `CANCELLED`.
  - Financial snapshots: `fee_amount`, `commission_amount`, `admin_percentage_at_completion`.
  - Payout statuses: `NONE`, `PENDING`, `RELEASED`.
  - `meeting_link`, `whiteboard_link`, `is_started`.
- `RescheduleRequest` — A student or tutor requests to reschedule a `ScheduledSession`. Statuses: `PENDING`, `APPROVED`, `REJECTED`. Initiated by `STUDENT` or `TUTOR`.
- `Booking` — Student-initiated enrollment request before sessions are scheduled. Stores `hours_per_week`, `hours_per_session`, `preferred_start_date`, `preferred_days`, `class_structure`, `learning_level`.
- `WhiteboardSession` — Links a `ScheduledSession` to a whiteboard room.

**Services:**
- `scheduler.py` — Logic for auto-creating session schedules from bookings.
- `utils.py` — Fee calculation helpers.

**Management commands:**
- `send_class_reminders` — Emails tutors and students before upcoming sessions.
- `backfill_sessions` — Utility to backfill historical session records.

**API prefix:** `/api/classes/`

---

### `payments`
Wallets, transactions, Paystack gateway, and withdrawals.

**Models:**
- `PricingTier` — Hourly rates for `ONE_ON_ONE` and `GROUP` class types.
- `Payment` — Individual payment record. Methods: `PAYSTACK`, `BANK_TRANSFER`, `WALLET`. Statuses: `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`.
- `Wallet` — One-per-user balance store.
- `Transaction` — Immutable ledger entries. Types: `DEPOSIT`, `SESSION_DEBIT`, `SESSION_PAYOUT`, `WITHDRAWAL`, `COMMISSION`, `REFUND`, `MANUAL_ADJUSTMENT`.
- `Withdrawal` — Tutor withdrawal requests with bank details. Statuses: `PENDING`, `APPROVED`, `REJECTED`.
- `PlatformSettings` — Singleton model holding the global default admin commission percentage.

**Services:**
- `paystack_service.py` — Initialises and verifies Paystack transactions.
- `services.py` / `logic.py` — Session payment logic: debiting the student wallet, releasing payout to tutor, deducting admin commission.

**Management command:** `unify_payments` — Data migration utility.

**API prefix:** `/api/payments/`

---

### `programs`
Master catalogue of programs and subjects.

**Models:**
- `Program` — Top-level grouping. Types: `ISLAMIC` (Islamic Education), `WESTERN` (Western Education), `EXAM_PREP` (Exam Preparation).
- `Subject` — Belongs to a `Program`. Has a URL-friendly `slug` and an `admin_percentage` (default commission override per subject).

**API prefix:** `/api/programs/`

---

### `curriculum`
Learning materials uploaded by tutors.

**Models:**
- `LearningMaterial` — FK to `tutor` (User). Types: `VIDEO`, `PDF`, `AUDIO`, `LINK`. Files stored on Cloudinary. Can be `is_public` (visible to all) or assigned to specific students via `assigned_students` M2M.

**API prefix:** `/api/curriculum/`

---

### `exams`
CBT exam bank, question management, results, and tutor assignments.

**Models:**
- `Exam` — An exam paper. Types: `JAMB`, `WAEC`, `NECO`, `JSSCE`, `PRIMARY`, `INTERNAL`. FK to `programs.Subject`. Has `duration_minutes` and `year`.
- `Question` — MCQ: `text`, `option_a`–`option_d`, `correct_option` (A/B/C/D).
- `ExamResult` — Student's score after completing an exam. Stores `score`, `total_questions`, `date_taken`.
- `ExamAssignment` — Tutor assigns a specific exam to a specific student with an optional `due_date`.

**API prefix:** `/api/exams/`

---

### `ai_engine`
AI-powered question generation using OpenAI.

**Models:**
- `AIGeneratedQuestion` — Caches generated question sets. FK to `programs.Subject`. Stores questions as JSON.

**Service (`services.py`):**
- `generate_ai_questions(subject_name, exam_type, year_range, num_questions)` — Calls GPT-4o-mini to generate JAMB-standard MCQs. Falls back to a built-in mock question bank if `OPENAI_API_KEY` is not set.

**API prefix:** `/api/ai/`

---

### `scheduling`
Tutor-student matching requests.

**Models:**
- `TutorRequest` — A student sends a request to a specific tutor for a subject and preferred time slot. Statuses: `PENDING`, `APPROVED`, `REJECTED`.

**API prefix:** `/api/scheduling/`

---

### `feedback`
Complaint and dispute resolution.

**Models:**
- `Complaint` — Filed by one user against another. Has `subject`, `description`, `status` (`OPEN`, `UNDER_REVIEW`, `RESOLVED`), `admin_response`, and `resolved_at`.

**API prefix:** `/api/complaints/`

---

### `whiteboard`
Real-time collaborative whiteboard via WebSockets.

**Models:**
- `LiveWhiteboardSession` — Links to a `ScheduledSession`. Has a `room_id` and `is_active` flag.
- `LiveBoardSnapshot` — Per-student base64 image snapshot of a live session.
- `SavedWhiteboard` — A tutor's saved tldraw/Excalidraw `snapshot` (JSON), with a `title`.

**WebSocket consumer:** `consumers.py` — Handles real-time drawing sync between participants using Django Channels.

**API prefix:** `/api/whiteboard/`

---

### `notifications`
In-app notification store (separate from `accounts.Notification`; used for real-time push).

**Models:**
- `Notification` (in `notifications/models.py`) — Separate from `accounts.Notification`. Likely used for push/system notifications.

---

### `scratch`
**Not production code.** A collection of one-off Python scripts used during development for debugging, data migrations, seeding, and API testing. Safe to ignore.

---

## Authentication

JWT via `djangorestframework-simplejwt`. Tokens are obtained at `/api/auth/` endpoints. Protected views use `IsAuthenticated` permission. Role-based access is enforced in individual views.

---

## Real-Time (WebSockets)

Django Channels with Redis as the channel layer. The whiteboard consumer (`whiteboard/consumers.py`) handles drawing event broadcasting. The ASGI app is configured in `core/asgi.py`.

---

## Media & File Storage

All uploaded files (tutor images, videos, CVs, admission letters, etc.) are stored on Cloudinary via `django-cloudinary-storage`. The `CLOUDINARY_STORAGE` settings block in `settings.py` configures the connection.

---

## PDF Generation

`core/utils/pdf_generator.py` uses ReportLab to generate:
- Student admission letters
- Tutor appointment letters

These are uploaded to Cloudinary and linked back to the respective profile.
