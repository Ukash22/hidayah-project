# Frontend Reference

React 19 SPA built with Vite. Uses Tailwind CSS v4 for styling, React Router v7 for routing, and Axios for HTTP requests. All pages are lazy-loaded via `React.lazy` for performance.

Entry: `frontend/src/main.jsx` → `App.jsx`

---

## Routing (`App.jsx`)

### Public routes

| Path | Component | Access |
|---|---|---|
| `/` | `Home` | Public |
| `/login` | `Login` | Public |
| `/register` | `Register` | Public |
| `/tutor/register` | `TutorRegister` | Public |
| `/pending-approval` | `PendingApproval` | Public |
| `/forgot-password` | `ForgotPassword` | Public |
| `/reset-password/:uidb64/:token` | `ResetPassword` | Public |
| `/terms` | `TermsOfService` | Public |
| `/privacy` | `PrivacyPolicy` | Public |
| `/tutors/:id` | `TutorProfile` | Public |
| `/payment/callback` | `PaymentCallback` | Public |

### Portal routes (nested under shell)

Each portal uses a shell component (`AdminShell`, `TutorShell`, `StudentShell`, `ParentShell`) that renders the sidebar and layout. Sub-routes render inside the shell's `<Outlet />`.

**Admin portal** — `/admin/*` — role: ADMIN

| Sub-path | Component |
|---|---|
| `overview` | `AdminOverview` |
| `admissions` | `AdminAdmissions` |
| `students` | `AdminStudents` |
| `tutors` | `AdminTutors` |
| `recruitment` | `AdminRecruitment` |
| `bookings` | `AdminBookings` |
| `classes` | `AdminClasses` |
| `curriculum` | `AdminCurriculum` |
| `financials` | `AdminFinancials` |
| `payouts` | `AdminPayouts` |
| `withdrawals` | `AdminWithdrawals` |
| `complaints` | `AdminComplaints` |
| `exams` | `AdminExamManager` |
| `exams/:examId/questions` | `AdminQuestionManager` |
| `settings` | `AdminSettings` |
| `account` | `AccountSettings` |
| `notifications` | `NotificationsPage` |

**Tutor portal** — `/tutor/*` — roles: TUTOR, ADMIN

| Sub-path | Component |
|---|---|
| `schedule` | `TutorSchedule` |
| `requests` | `TutorRequests` |
| `wallet` | `TutorWalletPage` |
| `exams` | `TutorExams` |
| `materials` | `TutorMaterials` |
| `complaints` | `TutorComplaints` |
| `profile` | `TutorProfilePage` |
| `media` | `TutorMedia` |
| `account` | `AccountSettings` |
| `notifications` | `NotificationsPage` |

**Student portal** — `/student/*` — role: STUDENT

| Sub-path | Component | Notes |
|---|---|---|
| `overview` | `StudentOverview` | Dashboard home |
| `find-tutor` | `BookingRequest` | Browse tutors, submit booking |
| `classes` | `StudentClasses` | Session list |
| `classes/:id` | `StudentSessionDetail` | Session detail view |
| `library` | `StudentLibrary` | Tutor-uploaded materials |
| `exams` | `StudentExams` | Tutor-assigned exam assignments |
| `exam-practice` | `ExamHub` | Self-service past paper practice |
| `ai-hub` | `AIHub` | AI question generator |
| `jamb` | `StudentJambCBT` | Auto-configured JAMB/WAEC simulation |
| `progress` | `StudentProgress` | Performance tracking |
| `finance` | `StudentFinance` | Wallet and payment history |
| `feedback` | `StudentFeedback` | File complaints or feedback |
| `account` | `AccountSettings` | Profile and password |
| `notifications` | `NotificationsPage` | Notification inbox |

**Parent portal** — `/parent/*` — role: PARENT

| Sub-path | Component |
|---|---|
| `overview` | `ParentOverview` |
| `child/:childId` | `ParentChildDetail` |
| `account` | `AccountSettings` |
| `notifications` | `NotificationsPage` |

### Standalone authenticated routes

| Path | Component | Access | Notes |
|---|---|---|---|
| `/live/:roomId` | `LiveClassRoom` | STUDENT, TUTOR, ADMIN | Full-screen live class |
| `/exam/practice/:id` | `CBTInterface` | STUDENT, TUTOR, ADMIN | Full-screen CBT exam |
| `/payment` | `PaymentPage` | STUDENT | Paystack checkout |

### Legacy redirects

| Old path | Redirects to |
|---|---|
| `/exam-practice` | `/student/exam-practice` |
| `/ai-hub` | `/student/ai-hub` |
| `/booking/request` | `/student/find-tutor` |

`ProtectedRoute` wraps role-restricted routes and redirects unauthenticated users to `/login`.

---

## Portal shell architecture

Each portal (admin, tutor, student, parent) follows the same pattern:

```
/<role>/           ← ProtectedRoute wrapping <RoleShell />
  ├── overview
  ├── <feature-a>
  └── <feature-b>
```

The shell defines `NAV_GROUPS` (sidebar navigation) and delegates layout to `DashboardShell`. Sub-pages are plain React components that render only their own content — no `<Navbar />`, no full-page wrapper, no `min-h-screen`. They receive layout (padding, scroll container) from `DashboardShell`.

When adding a new student portal page:
1. Create `frontend/src/pages/student/MyPage.jsx` — content only, use `<PageHeader>` at top
2. Lazy-import it in `App.jsx`
3. Add `<Route path="my-page" element={<MyPage />} />` inside the `/student` block
4. Add `{ to: '/student/my-page', icon: '🔔', label: 'My Page' }` to `StudentShell.jsx` `NAV_GROUPS`

---

## Exam Practice and AI Hub (`ExamHub.jsx`, `AIHub.jsx`)

Both pages were originally standalone (had their own `<Navbar />` and dark layout). They were moved into the student portal as nested routes in July 2026.

**ExamHub** (`/student/exam-practice`):
- Lists available past papers grouped by exam type (JAMB, WAEC, NECO, JSSCE, PRIMARY)
- For JAMB: lets student configure a 4-subject combination and launch a full timed simulation
- Wallet gate: requires ≥ ₦1,000 balance; shows a lock screen if insufficient
- Navigates to `CBTInterface` (`/exam/practice/:id`) for the actual exam — that page stays standalone because the full-screen CBT experience should not have the portal sidebar

**AIHub** (`/student/ai-hub`):
- Student selects a subject + exam type; calls `POST /api/ai/questions/generate/` to generate GPT questions
- Questions render inline with option selection; submit scores on completion
- Wallet gate: same ₦1,000 threshold (configured via `MIN_WALLET_BALANCE_FOR_AI` in `backend/.env`)
- Score result and "Show Correct Answers" toggle shown in the sidebar after submission

**CBTInterface** (`/exam/practice/:id`) stays standalone:
- Full-screen, distraction-free timed exam
- `id` param can be a comma-separated list of exam IDs for multi-subject JAMB simulation
- Has its own back navigation (no portal shell)
- Accessible by STUDENT, TUTOR, and ADMIN roles

**JAMB CBT** (`/student/jamb`, `StudentJambCBT`):
- A separate portal page that auto-configures a JAMB/BECE simulation based on the student's profile (`level`, `target_exam_type`)
- Renders the `JambCBT` component inline (no navigation to `/exam/practice/`)
- Gated by student level — only shown to students whose profile matches exam-prep levels

**Distinction between Assessments, Exam Practice, and JAMB CBT:**

| Page | What it shows |
|---|---|
| Assessments (`/student/exams`) | Exams assigned by the student's tutor |
| Exam Practice (`/student/exam-practice`) | Self-service practice from the public exam bank |
| JAMB CBT (`/student/jamb`) | Auto-configured full JAMB simulation using student's profile |
| AI Hub (`/student/ai-hub`) | AI-generated questions (not from the bank) |

---

## Authentication (`context/AuthContext.jsx`)

Global auth state provided via React Context. Stores the logged-in `user` object (including `role`), JWT tokens, and exposes `login` / `logout` functions. Token refresh and persistence handled here.

The Axios interceptor in `api.js` automatically attaches the access token and retries failed requests after refreshing. On refresh failure, it only redirects to `/login` if the current path starts with a portal prefix (`/admin`, `/tutor`, `/student`, `/parent`, `/live`, etc.) — public pages are never force-redirected.

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

### `ExamHub.jsx`
Past paper practice hub — see Exam Practice section above.

### `AIHub.jsx`
AI question generator — see Exam Practice section above.

### `CBTInterface.jsx`
Full Computer-Based Testing interface. Features:
- Timed countdown
- Question navigation panel
- Answer selection and flagging
- Auto-submit on timeout
- Score display on completion

### `LiveClassRoom.jsx`
Live class room at `/live/:roomId`. Integrates:
- WebRTC video/audio (`WebRTCVideoChat` component)
- Excalidraw whiteboard (`ExcalidrawWhiteboard` component)
- Exit Room button navigates back (`useNavigate(-1)`)

### `BookingRequest.jsx`
Student browses approved tutors, filters by name/subject, and submits a booking request via a modal form (`BookingModal`). Rendered inside the student portal at `/student/find-tutor`.

### `PaymentPage.jsx`
Initiates a Paystack payment for the student's registration fee. Calls the backend to generate a Paystack checkout URL, then redirects.

### `PaymentCallback.jsx`
Landing page after Paystack redirects back. Verifies payment status with the backend and shows success/failure.

---

## Components

### `Navbar.jsx`
Top navigation bar on the public-facing pages. Links to page sections and shows login/register buttons. **Not used inside portal pages** — those use `DashboardShell` instead.

### `BookingModal.jsx`
Full-screen overlay modal rendered by `BookingRequest`. Contains the tutor booking form (subject, schedule, duration, level). Closes on backdrop click or Escape key.

### `TutorCard.jsx`
Light-themed tutor card used in the Find Tutor portal page. Shows tutor avatar, subjects, rate, and availability. "Book This Tutor" button opens `BookingModal` — no inline expand.

### `DashboardShell` / portal layout components (`components/layout/`)
Shared layout wrapper for authenticated portal pages. Handles the sidebar, top bar, and content area.

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

### `ComplaintModal.jsx`
Modal for filing a complaint against a tutor or student.

### `TutorWallet.jsx`
Wallet widget for the tutor dashboard. Shows balance, transaction history, and a withdrawal request button.

### `WithdrawalModal.jsx`
Modal for submitting a bank withdrawal request with account details.

### `Calculator.jsx`
In-app scientific calculator widget available in the student dashboard.

### `QuranMushaf.jsx`
Quran reader component with page navigation.

### `JambCBT.jsx`
Inline JAMB/BECE simulation component — renders inside `StudentJambCBT`. Auto-configures subject list based on the student's exam profile. Distinct from `CBTInterface` (which is a standalone page driven by exam IDs).

### `Whiteboard/ExcalidrawWhiteboard.jsx`
Full Excalidraw whiteboard embedded in the live class room. Supports real-time collaboration (synced via WebSocket to the Django Channels backend). Includes sub-panels:
- `ExamPanel.jsx` — Shows exam questions alongside the board.
- `MathToolsPanel.jsx` — Quick-insert maths symbols and formulas. Auto-closes after inserting a shape.
- `LibraryPanel.jsx` — Pre-saved shapes/diagrams library.

### `LiveClass/WebRTCVideoChat.jsx`
WebRTC-based peer video/audio chat embedded in the live class room. Handles peer connection setup, media streams, mute/camera controls. Chat panel closes on outside click.

### `TutorRegister/` (sub-components)
Multi-step form fields for tutor registration. See `TutorRegister.jsx` page above.

---

## Services (`src/services/`)

### `api.js`
Centralised Axios instance. Sets the base URL from `VITE_API_BASE_URL` (env variable). Attaches JWT access token to every request via a request interceptor. Handles token refresh on 401 responses. Only redirects to `/login` on refresh failure from portal paths — public pages are unaffected.

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
