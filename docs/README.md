# Hidayah e-Madarasah — Project Overview

**Hidayah** is a full-stack online tutoring platform for Islamic and Western education, targeted primarily at Nigerian students. It connects students with tutors for live one-on-one or group sessions, supports JAMB/WAEC/NECO exam preparation, and includes an AI-powered question generation engine.

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

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` / `False` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (WebSockets) |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `OPENAI_API_KEY` | OpenAI API key (AI question generation) |
| `EMAIL_HOST` | SMTP host (default: `smtp.gmail.com`) |
| `EMAIL_HOST_USER` | Sender email address |
| `EMAIL_HOST_PASSWORD` | App password for SMTP |

---

## Deployment (Render)

Defined in `render.yaml`:

- **hidayah-backend** — Python web service, starts with `daphne` (ASGI for WebSocket support), root dir `backend/`.
- **hidayah-frontend** — Static site, built with `npm run build`, served from `frontend/dist/`.
- **hidayah-db** — Managed PostgreSQL database.
- **hidayah-redis** — Managed Redis instance (internal access only).

Production URLs:
- Backend: `https://hidayah-backend-zgix.onrender.com`
- Frontend: `https://hidayah-frontend.onrender.com`

---

## Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev   # runs at http://localhost:5173
```

**Mobile (Android):**
```bash
cd frontend && npm run build
cd ../mobile_app && npx cap sync android
npx cap open android
```
