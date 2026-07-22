# UI Deep Dive — Progress Tracker

Tracks implementation against [ui-deep-dive.md](../items/ui-deep-dive.md). Review was code-driven (states, flows, dead controls, consistency); items marked 👁 in the findings need browser confirmation.

---

## Phase D-1 — Bugs 🔴 ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | X1: 13× `primary-600/700` ghosts → `primary-dark`; also defined missing `--primary-rgb` used by button shadows | ✅ |
| 2 | StudentLibrary ExternalLink button → working link (opens the resource) | ✅ |
| 3 | 5 hard navigations → `navigate()` (AIHub, ExamHub, CBTInterface, Login/Register admin redirects). Impersonation + ErrorBoundary reloads stay full-page **by design** | ✅ |

## Phase D-2 — High-value small items 🟠 ✅ Complete (item 8 remains opportunistic)

| # | Item | Status |
|---|---|---|
| 4 | AdminStudents: search (name/username/email/course/tutor) + payment-status chips · AdminTutors: search (name/email/subject) | ✅ |
| 5 | `POST /api/auth/password/change/` (validators, 4 tests) + shared `AccountSettings` page routed in all four shells with sidebar links | ✅ |
| 6 | Shared `NotificationsPage` in all four shells + "View All" link in the bell dropdown; optimistic mark-read; portal-aware links | ✅ |
| 7 | `PUT /api/tutors/me/availability/` (replace-slots, 3 tests) + inline slot editor on TutorProfilePage (replaces the "Contact Admins to update slots" dead-end) | ✅ |
| 8 | X5: FetchError rollout to remaining data pages — opportunistic per page (NotificationsPage shipped with it) | ⏳ Opportunistic |

## Phase D-3 — Consistency sweep 🟡 ✅ Complete

| # | Item | Status |
|---|---|---|
| 9 | X3: table/badge micro-text — 346 `text-[9/10px] uppercase tracking-widest font-bold` → `text-[11px] uppercase tracking-wide font-semibold` across 60 files; 16 `text-[9px]` bumped to `text-[10px]` | ✅ |
| 10 | X4: portal emoji → lucide — AdminStudents (📹→Video, ✅/❌→dots), TutorRequests (📥⏳✅ tab labels stripped, 👤→User), ParentOverview (🧒→User), AdminOverview (🎥→Video), ExamHub (⚙️→Settings) | ✅ |
| 11 | X6: decorative bounce census — removed from AIHub (🤖→Bot), ExamHub (📜→Lock), StudentOverview (bell); kept raised hands + student reactions (semantic) | ✅ |
| 12 | ExamManager/QuestionManager into the admin shell — stripped standalone Navbar/min-h-screen chrome; added as nested admin routes in App.jsx | ✅ |

## Phase D-4 — Feature investments 💡

| # | Item | Status |
|---|---|---|
| 13 | **Parent portal build-out**: `GET child_detail` (sessions + wallet txns) + `POST fund_child_wallet` backend; `ParentChildDetail.jsx` with sessions table, wallet balance, Add Funds modal; "Detail" link alongside impersonation button; 7 new backend tests | ✅ |
| 14 | Student progress/results history — `GET /api/students/me/progress/` (attendance stats + exam trend); `StudentProgress.jsx` with SVG bar chart, attendance ring, subject breakdown bars; 3 new tests | ✅ |
| 15 | Homepage conversion — `Pricing.jsx` (live from `/api/payments/pricing/`, fallback static); `Testimonials.jsx` (4 cards, social proof bar); `FAQ.jsx` (7-item accordion, 2-col layout, WhatsApp CTA); sticky `WhatsAppFloat` button; footer updated with Pricing + FAQ + WhatsApp links | ✅ |
| 16 | Smaller: register step-2 price preview + tutor-preselect link from TutorProfile; tutor wizard draft persistence; complaint status timeline (OPEN→UNDER_REVIEW→RESOLVED inline timeline in TutorComplaints); withdrawal reject-with-reason (backend `admin_notes` + RejectModal); admin CSV export (`downloadCSV` utility, students + tutors pages); analytics date-range (`?date_from=&date_to=` backend, skips cache; date pickers + Apply/Clear in AdminFinancials; fixed `totals.*` → flat field refs) | ✅ |
