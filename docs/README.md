# Hidayah e-Madarasah — Project Overview

**Hidayah** is a full-stack online tutoring platform for Islamic and Western education, targeted primarily at Nigerian students. It connects students with tutors for live one-on-one or group sessions, supports JAMB/WAEC/NECO exam preparation, and includes an AI-powered question generation engine.

> **Project stage: active development — not yet published.** The web app deploys to Render for testing; the mobile app (Capacitor) is not on any store. Publish-stage work is intentionally deferred and tracked in the audit trackers under `docs/gaps-and-upgrade/tracker/` — chiefly: final mobile `appId` + icons/splash (`mobile-capacitor-progress.md` M-C), push notifications (M-D), the in-app payment flow decision (M-B, incl. App Store policy check for iOS), and the JWT-storage hardening workstream (`security-audit-progress.md` S4).

---

## What the Platform Does

- Students sign up, choose courses, pay fees, and attend live online classes with assigned tutors.
- Tutors apply, get interviewed, and receive payouts after completing sessions.
- Admins oversee everything: approvals, scheduling, payments, commissions, exam content.
- Parents can monitor their child's progress via a parent dashboard.
- An AI Hub generates CBT (Computer-Based Testing) practice questions for Nigerian university entrance exams.
- A built-in collaborative whiteboard (Excalidraw) is available inside every live session.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0, Django REST Framework, Django Channels (WebSockets) |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router v7 |
| Mobile | Capacitor (Android + iOS wrapper around the frontend) |
| Database | PostgreSQL (via `dj-database-url`) |
| Real-time | Django Channels + Redis (WebSocket channels) |
| Payments | Paystack |
| Media/Files | Cloudinary (images, videos, documents) |
| AI | OpenAI API (GPT-4o-mini) for exam question generation |
| Auth | JWT (djangorestframework-simplejwt) |
| PDF | ReportLab (admission letters, appointment letters) |
| Email | SMTP (Gmail) |
| Deployment | Render (web service + static site + PostgreSQL + Redis) |

---

## Repository Structure

```
hidayah/
├── backend/          # Django project
│   ├── core/         # Settings, root URLs, ASGI/WSGI config
│   ├── accounts/     # Custom User model, authentication, notifications
│   ├── tutors/       # Tutor profiles, applications, hiring workflow
│   ├── students/     # Student profiles, enrollment
│   ├── parents/      # Parent dashboard API
│   ├── applications/ # Trial class requests, Zoom integration
│   ├── classes/      # Scheduled sessions, reschedule requests, bookings
│   ├── payments/     # Wallets, transactions, Paystack, withdrawals
│   ├── programs/     # Programs and subjects catalogue
│   ├── curriculum/   # Learning materials (videos, PDFs, audio, links)
│   ├── exams/        # Exam bank, questions, CBT results, assignments
│   ├── ai_engine/    # AI question generation (OpenAI)
│   ├── scheduling/   # Tutor request matching
│   ├── feedback/     # Complaint system
│   ├── whiteboard/   # Live collaborative whiteboard (WebSocket)
│   ├── notifications/# In-app notification model
│   ├── scratch/      # Ad-hoc debug/migration scripts (not production code)
│   ├── requirements.txt
│   ├── manage.py
│   └── build.sh      # Render build script
│
├── frontend/         # React + Vite SPA
│   ├── src/
│   │   ├── pages/    # Full page views (one per route)
│   │   ├── components/ # Reusable UI components
│   │   ├── context/  # React context (AuthContext)
│   │   ├── services/ # API client, Cloudinary service
│   │   └── constants/# Static data (registration fields)
│   ├── public/       # Static assets
│   └── package.json
│
├── mobile_app/       # Capacitor wrapper
│   ├── android/      # Android project
│   ├── ios/          # iOS project
│   └── capacitor.config.json
│
├── docs/             # This documentation folder
└── render.yaml       # Render deployment config
```

---

## User Roles

| Role | Description |
|---|---|
| `ADMIN` | Full platform control — approvals, payments, exams, reports |
| `TUTOR` | Teaches sessions, uploads materials, manages wallet withdrawals |
| `STUDENT` | Attends classes, takes exams, pays fees |
| `PARENT` | Monitors a linked student's activity and progress |

---

## Key Flows

**Student Onboarding:**
1. Student registers at `/register` → profile created with `PENDING` approval status.
2. Admin approves the student in the Admin Dashboard.
3. Student pays the registration fee via Paystack at `/payment`.
4. Admin assigns a tutor and schedules sessions.
5. Student attends live classes at `/live/:roomId`.

**Tutor Hiring:**
1. Tutor applies at `/tutor/register` with bio, subjects, CV, intro video.
2. Admin schedules an interview and generates an appointment letter (PDF).
3. On approval, tutor gains access to `/tutor` dashboard.
4. After each completed session, tutor's wallet is credited (minus admin commission).
5. Tutor requests withdrawal via bank transfer.

**Trial Class:**
1. Visitor fills out the Trial Form on the homepage.
2. Admin reviews the `TrialApplication`, assigns a tutor, and schedules a Zoom class.
3. A reminder email is sent before the session.

**Exam Practice:**
1. Student navigates to `/exam-practice` (ExamHub).
2. Selects an exam type (JAMB, WAEC, etc.) and subject.
3. Takes a timed CBT at `/exam/practice/:id`.
4. Score and results are saved to their profile.

**AI Hub:**
1. Student or tutor visits `/ai-hub`.
2. Selects subject, exam type, and year range.
3. Backend calls OpenAI GPT-4o-mini to generate 10 custom questions.
4. Falls back to a mock question bank if no API key is configured.

---

## Environment Variables (Backend)

Variables marked **Required** have no fallback — the app will not start without them.

| Variable | Required | Purpose |
|---|---|---|
| `SECRET_KEY` | **Required** | Django secret key — must be a long random string. No default; `KeyError` on startup if missing. |
| `DEBUG` | Optional | `True` for local dev, `False` for production. Defaults to `False` if not set. |
| `ALLOWED_HOSTS` | **Required in production** | Comma-separated hostnames. Must include your Render backend domain (e.g. `hidayah-backend-zgix.onrender.com`). Defaults to `localhost,127.0.0.1` — omitting this in production causes all requests to return 400. |
| `DATABASE_URL` | **Required** | PostgreSQL connection string |
| `REDIS_URL` | **Required** | Redis connection string (WebSockets, cache, and Celery broker) |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name — file uploads skipped if not set |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret |
| `PAYSTACK_SECRET_KEY` | **Required** | Paystack secret key — payment endpoints fail without it |
| `PAYSTACK_PUBLIC_KEY` | **Required** | Paystack public key |
| `OPENAI_API_KEY` | Optional | OpenAI API key — AI question generation falls back to mock bank if not set |
| `EMAIL_HOST` | Optional | SMTP host (default: `smtp.gmail.com`) |
| `EMAIL_HOST_USER` | Optional | Sender email address |
| `EMAIL_HOST_PASSWORD` | Optional | App password for SMTP |

### Render pre-deploy checklist

Before every deployment, confirm these are set in the Render dashboard under **Environment**:

- [ ] `SECRET_KEY` — set and non-empty
- [ ] `ALLOWED_HOSTS` — includes `hidayah-backend-zgix.onrender.com`
- [ ] `DEBUG` — set to `False`
- [ ] `DATABASE_URL` — points to the Render PostgreSQL instance
- [ ] `REDIS_URL` — points to the Render Redis instance
- [ ] `PAYSTACK_SECRET_KEY` — live or test key depending on environment

---

## Deployment (Render)

Defined in `render.yaml`:

| Service | Type | Purpose |
|---|---|---|
| **hidayah-backend** | Web service | Django + Daphne (ASGI, WebSocket support) |
| **hidayah-frontend** | Static site | React SPA, built with `npm run build` |
| **hidayah-db** | PostgreSQL | Managed database |
| **hidayah-redis** | Redis | WebSockets (Channels), API cache, Celery broker |
| **hidayah-celery** | Background worker | Async task processing — **commented out by default** |

Production URLs:
- Backend: `https://hidayah-backend-zgix.onrender.com`
- Frontend: `https://hidayah-frontend.onrender.com`

### Celery background worker

Slow operations (email delivery, PDF generation) are handled by a dispatcher in `backend/core/dispatch.py`:

- **Without Celery worker** (default): tasks run in a `ThreadPoolExecutor` inside the web process — fire-and-forget, no retry on failure. Works on the free tier at no extra cost.
- **With Celery worker**: tasks run in a dedicated worker process with automatic 3× retry on SMTP/PDF failure. Uses the same `REDIS_URL` already required for WebSockets — no new infrastructure.

To enable Celery on Render:
1. Uncomment the `hidayah-celery` worker block in `render.yaml`.
2. The worker uses a paid Render plan (~$7/month for Starter).
3. No code changes or new env vars needed — `REDIS_URL` is already set.

> The web process continues working without a worker running. Deploying the worker is additive, not required.

### API response caching

When `REDIS_URL` is set, some read endpoints are cached (falls back to per-process in-memory cache otherwise — no config needed):

| Endpoint | TTL | Staleness note |
|---|---|---|
| `GET /api/tutors/` (approved tutor list) | 5 min | A newly approved tutor may take up to 5 min to appear |
| `GET /api/programs/` (programme catalogue) | 10 min | Invalidated automatically on write |
| `GET /api/payments/analytics/` (admin analytics) | 5 min | Admin dashboards can lag real payments by up to 5 min |

### Paginated endpoints

`GET /api/classes/sessions/` returns a paginated envelope `{ count, next, previous, results }` (default limit 50). `GET /api/tutors/` supports optional `?limit=&offset=` pagination — without those params it returns a plain array as before.

### API docs

Interactive Swagger UI at `/api/docs/` (OpenAPI schema at `/api/schema/`) via drf-spectacular. Open in development; staff-only in production. Many `APIView`s are not yet annotated and appear untyped — annotate with `@extend_schema` opportunistically.

### API compatibility policy (additive-only)

The Capacitor mobile app ships on its own release cycle, so an old installed app can talk to a newer backend. Therefore: **never remove or rename response fields, and never change an existing endpoint's response shape** — add new fields and new endpoints instead. If a breaking change is truly unavoidable, introduce it at a new path (`/api/v2/<resource>`) and keep the old one until clients migrate. Frontend list-fetches should use `asList()` from `services/api.js` so array↔envelope differences never break pages.

---

## Audit & Upgrade Docs

See [`gaps-and-upgrade/audit-index.md`](gaps-and-upgrade/audit-index.md) for the full list of completed and pending audits.

| File | Purpose |
|---|---|
| `gaps-and-upgrade/audit-index.md` | Master audit index — all completed and pending audits |
| `gaps-and-upgrade/items/ui-ux-audit.md` | UI/UX audit findings (13 themes, 22 items) |
| `gaps-and-upgrade/tracker/ui-ux-progress.md` | Phase 1–5 implementation tracker |
| `gaps-and-upgrade/items/page-architecture.md` | Page architecture refactor plan |
| `gaps-and-upgrade/tracker/page-architecture-progress.md` | Phase A–E implementation tracker |
| `gaps-and-upgrade/items/security-audit.md` | Security audit findings (12 items + 1 confirmed safe) |
| `gaps-and-upgrade/tracker/security-audit-progress.md` | Phase S1–S4 implementation tracker |

---

## Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Celery worker (optional — only needed to test async task retry behaviour locally):**
```bash
# In a separate terminal, with Redis running locally:
cd backend
celery -A core worker --loglevel=info
# Without this, tasks fall back to a thread pool automatically — no setup needed for normal dev.
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # runs at http://localhost:5173
```

**Backend tests (performance & security suites, in `backend/tests/`):**
```bash
cd backend
python manage.py test tests --settings=core.test_settings   # fast (~2s, MD5 hashing for test users)
python manage.py test tests                                 # normal settings (~4 min)
```
Covers: async dispatch fallback (`test_dispatch`), response caching + N+1 query-count guards + pagination shapes (`test_tutors`, `test_classes`, `test_payments`, `test_programs`), P1 index guards (`test_students`, `test_classes`), and role/permission enforcement on admin, financial, and profile endpoints.

**Mobile (Android):**
```bash
cd frontend && npm run build
cd ../mobile_app && npx cap sync android
npx cap open android
```