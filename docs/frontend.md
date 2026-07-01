# Frontend Reference

React 19 SPA built with Vite. Uses Tailwind CSS v4 for styling, React Router v7 for routing, and Axios for HTTP requests. All pages are lazy-loaded via `React.lazy` for performance.

Entry: `frontend/src/main.jsx` → `App.jsx`

---

## Routing (`App.jsx`)

| Path | Component | Access |
|---|---|---|
| `/` | `Home` | Public |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/tutor/register` | `TutorRegister` | Public |
| `/pending-approval` | `PendingApproval` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/reset-password/:uidb64/:token` | `ResetPassword` | Public |
| `/admin` | `AdminDashboard` | ADMIN |
| `/admin/exams` | `AdminExamManager` | ADMIN |
| `/admin/exams/:examId/questions` | `AdminQuestionManager` | ADMIN |
| `/tutor` | `TutorDashboard` | TUTOR, ADMIN |
| `/student` | `StudentDashboard` | STUDENT |
| `/parent` | `ParentDashboard` | PARENT |
| `/exam-practice` | `ExamHub` | STUDENT, TUTOR, ADMIN |
| `/exam/practice/:id` | `CBTInterface` | STUDENT, TUTOR, ADMIN |
| `/ai-hub` | `AIHub` | STUDENT, TUTOR, ADMIN |
| `/live/:roomId` | `LiveClassRoom` | STUDENT, TUTOR, ADMIN |
| `/booking/request` | `BookingRequest` | STUDENT |
| `/payment` | `PaymentPage` | STUDENT |
| `/payment/callback` | `PaymentCallback` | Public |
| `*` | Redirects to `/` | — |

`ProtectedRoute` wraps role-restricted routes and redirects unauthenticated or unauthorised users.

---

## Authentication (`context/AuthContext.jsx`)

Global auth state provided via React Context. Stores the logged-in `user` object (including `role`), JWT tokens, and exposes `login` / `logout` functions. Token refresh and persistence handled here.

---

## Pages

### `Home.jsx`
Public landing page. Includes the `Hero`, `About`, `Curriculum`, `Tutors`, `HITISFeatures` sections and the `TrialForm` (free trial signup). Also renders the `Navbar`.

### `Login.jsx`
Email/password login form. On success, stores JWT and redirects based on user role.

### `Register.jsx`
Student self-registration. Collects personal info, course preferences, preferred time, and class type. Creates a `STUDENT` user with `PENDING` status.

### `TutorRegister.jsx`
Multi-step tutor application form broken into sub-components:
- `AccountFields` — name, email, password
- `ProfileFields` — bio, image, age, address
- `ExperienceFields` — years of experience, subjects, languages
- `TechnicalFields` — device type, network type, intro video upload
- `AvailabilityManager` — availability days and hours
- `SubjectGrid` — visual subject/course selector

### `PendingApproval.jsx`
Holding page shown to students waiting for admin approval.

### `ForgotPassword.jsx` / `ResetPassword.jsx`
Standard password reset flow. `ForgotPassword` submits an email; `ResetPassword` uses the `/:uidb64/:token` URL params sent in the reset email.

### `AdminDashboard.jsx`
Central admin control panel. Covers:
- Student and tutor management (approve/reject/block)
- Session scheduling and overview
- Payment and wallet management
- Complaint resolution
- Platform settings (commission rates)
- Trial application management
- Notification sending

### `AdminExamManager.jsx`
Admin view for creating, editing, and deleting exams. Shows exam type, subject, year, duration.

### `AdminQuestionManager.jsx`
Admin view for managing questions within a specific exam (`:examId`). Supports bulk upload and individual question editing.

### `TutorDashboard.jsx`
Tutor's home after login. Shows:
- Upcoming and past sessions
- Student list
- Curriculum/material uploads
- Exam assignment tool
- Wallet balance and withdrawal requests
- Complaint filing
- Profile editing

### `StudentDashboard.jsx`
Student's home after login. Shows:
- Upcoming sessions and session history
- Enrolled subjects and tutor info
- Learning materials assigned by tutor
- Exam results
- Wallet balance
- Notification centre
- Reschedule request tool

### `ParentDashboard.jsx`
Parent view linked to a child student. Shows student's sessions, tutor, materials, and exam performance.

### `BookingRequest.jsx`
Student submits a structured booking request (hours per week, preferred days, class type) for admin to schedule sessions.

### `ExamHub.jsx`
Exam selection page. Lists available exams grouped by type (JAMB, WAEC, NECO, etc.) and subject. Shows assigned exams from tutors. Navigates to `CBTInterface` on selection.

### `CBTInterface.jsx`
Full Computer-Based Testing interface. Features:
- Timed countdown
- Question navigation panel
- Answer selection and flagging
- Auto-submit on timeout
- Score display on completion

### `AIHub.jsx`
AI question generation interface. User selects a subject, exam type, and year range. Calls `/api/ai/` to get GPT-generated questions, then launches a practice session inline.

### `LiveClassRoom.jsx`
Live class room at `/live/:roomId`. Integrates:
- WebRTC video/audio (`WebRTCVideoChat` component)
- Excalidraw whiteboard (`ExcalidrawWhiteboard` component)
- Exam panel sidebar for viewing questions during class

### `PaymentPage.jsx`
Initiates a Paystack payment for the student's registration fee. Calls the backend to generate a Paystack checkout URL, then redirects.

### `PaymentCallback.jsx`
Landing page after Paystack redirects back. Verifies payment status with the backend and shows success/failure.

---

## Components

### `Navbar.jsx`
Top navigation bar on the public-facing pages. Links to page sections and shows login/register buttons.

### `DashboardLayout.jsx`
Shared layout wrapper for all authenticated dashboard pages. Handles the sidebar, top bar, and content area.

### `ProtectedRoute.jsx`
HOC that checks authentication and role before rendering a route. Redirects to `/login` if not authenticated, or to `/` if the role is not allowed.

### `AuthContext.jsx` (in `context/`)
See Authentication section above.

### `TrialForm.jsx`
Homepage trial class signup form. Sends a POST to `/api/` to create a `TrialApplication`.

### `Hero.jsx`, `About.jsx`, `Curriculum.jsx`, `Tutors.jsx`, `HITISFeatures.jsx`
Marketing sections on the Home page.

### `NotificationCenter.jsx`
Dropdown notification bell. Fetches unread notifications from `/api/accounts/notifications/` and allows marking as read.

### `RescheduleModal.jsx`
Modal dialog for submitting a reschedule request on a specific session.

### `ComplaintModal.jsx`
Modal for filing a complaint against a tutor or student.

### `TutorWallet.jsx`
Wallet widget for the tutor dashboard. Shows balance, transaction history, and a withdrawal request button.

### `WithdrawalModal.jsx`
Modal for submitting a bank withdrawal request with account details.

### `Calculator.jsx`
In-app scientific calculator widget available in the student dashboard.

### `QuranMushaf.jsx`
Quran reader component with page navigation. Likely uses an external Quran API or embedded images.

### `JambCBT.jsx`
Standalone JAMB-style CBT interface component (distinct from the full `CBTInterface` page — used inline).

### `Whiteboard/ExcalidrawWhiteboard.jsx`
Full Excalidraw whiteboard embedded in the live class room. Supports real-time collaboration (synced via WebSocket to the Django Channels backend). Includes sub-panels:
- `ExamPanel.jsx` — Shows exam questions alongside the board.
- `MathToolsPanel.jsx` — Quick-insert maths symbols and formulas.
- `LibraryPanel.jsx` — Pre-saved shapes/diagrams library.

### `LiveClass/WebRTCVideoChat.jsx`
WebRTC-based peer video/audio chat embedded in the live class room. Handles peer connection setup, media streams, and mute/camera controls.

### `TutorRegister/` (sub-components)
Multi-step form fields for tutor registration. See `TutorRegister.jsx` page above.

---

## Services (`src/services/`)

### `api.js`
Centralised Axios instance. Sets the base URL from `VITE_API_BASE_URL` (env variable). Attaches JWT access token to every request via a request interceptor. Handles token refresh on 401 responses.

### `cloudinaryService.js`
Direct-to-Cloudinary unsigned upload helper. Used for uploading tutor images, intro videos, and CVs from the browser without routing through the Django backend.

---

## Constants (`src/constants/`)

### `registration.js`
Static lists used in registration forms: Nigerian states, countries, course options, level choices, preferred time slots, and class structure options.

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `react-router-dom` v7 | Client-side routing |
| `axios` | HTTP client |
| `@excalidraw/excalidraw` | Collaborative whiteboard canvas |
| `react-use-websocket` | WebSocket hook (whiteboard sync) |
| `recharts` | Charts in dashboards |
| `framer-motion` | Animations and transitions |
| `jspdf` + `jspdf-autotable` | Client-side PDF generation |
| `pdfjs-dist` | PDF viewer (for displaying curriculum materials) |
| `lucide-react` | Icon library |
| `tailwindcss` v4 | Utility-first CSS |

---

## Build & Dev

```bash
# Development
npm run dev       # Vite dev server at http://localhost:5173

# Production build
npm run build     # Output to frontend/dist/

# Lint
npm run lint
```

The Vite config (`vite.config.js`) uses `@vitejs/plugin-react` and `@tailwindcss/vite`.

The `public/_redirects` file configures Render/Netlify to serve `index.html` for all routes (SPA fallback).
