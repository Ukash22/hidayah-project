# UI Deep Dive — Screen-by-Screen Findings

Audit #11. Code-driven review of all 45 screens (states, flows, dead controls, consistency, feature gaps) after the UI refresh. Visual-runtime issues (spacing, colour balance) still need the browser pass — those are marked 👁.

Severity: 🔴 broken/dead · 🟠 hurts users · 🟡 polish · 💡 improvement/feature idea

---

## Cross-cutting bugs found (fix once, benefits many screens)

| # | Finding | Where | Sev |
|---|---|---|---|
| X1 | **`primary-600`/`primary-700` classes don't exist** in the theme (tokens are `primary-light/dark`) — hover/bg states silently render nothing | 11 occurrences: AdmissionPortal ×3, ExamHub, ForgotPassword, + 6 more (`grep -rn "primary-[67]00" src`) | 🔴 |
| X2 | **7 hard navigations** (`window.location.href='/…'`) remain — post-S4 each one costs a full auth re-bootstrap (flash + refresh round-trip) | ExamHub, EmptyState action in TutorProfile, StudentOverview, ExamHub lock panel, etc. | 🟠 |
| X3 | **Table/badge micro-text escaped the typography pass** — `text-[9px]`/`text-[10px]` + `tracking-widest` survive wherever weight was already `font-bold` (admin table headers, badges, card footers) | all admin tables, ParentOverview badges, StudentLibrary card footer | 🟡 |
| X4 | **Emoji still used as UI controls/icons** in portals (📹 join button, 👤 avatars, 📥⏳✅ tab labels, 🧒 parent cards, 🎥 banner) — the homepage was cleaned, portals were not | AdminStudents, TutorRequests, ParentOverview, AdminOverview, ExamHub ⚙️📜 | 🟡 |
| X5 | `FetchError` retry panel adopted on only 5 pages; the other ~20 data pages still fail to a fake empty state | matrix in tracker | 🟠 |
| X6 | `animate-bounce` census never ran (only pulse) — decorative bounce on ExamHub lock icon | ExamHub:78 | 🟡 |
| X7 | Dark-mode variants exist only in portals — fine — but portal cards created *after* the scripted pass will silently miss them; no lint guard | process note | 🟡 |

---

## Public screens

| Screen | Findings |
|---|---|
| **Home / Hero** | ✅ refreshed. 💡 Missing conversion staples for the Nigerian market: WhatsApp contact button, testimonials strip, transparent pricing section, FAQ (visitors currently must submit the trial form to learn cost). 👁 hero image is a stock Unsplash URL — replace with real classroom/product shot before launch |
| **Tutors section → TutorProfile** | Public profile page is well-built (skeletons, EmptyState, availability chips). 🟠 its error-state CTA uses `window.location.href` (X2). 💡 "Book this tutor" CTA goes to generic register — could pre-select the tutor (query param already supported by Register!) — wire `?tutor_id=` link |
| **ExamHub** | 🔴 X1 dead hover on main CTA. 🟠 selecting exams navigates with `window.location.href` (X2). 🟡 wallet-lock panel: bouncing 📜 emoji (X6), `tracking-[0.2em]` shouting buttons. 💡 the ₦1,000 gate appears with no way to preview content — show subject list greyed-out behind the lock to sell the value |
| **AIHub** | 🟡 robot emoji header; upsell panel uses hard navigation (X2). 💡 generated questions vanish on reload — offer "save to my practice sets" |
| **AdmissionPortal** | 🔴 X1 ×3 (both CTAs have dead hovers). 💡 duplicated purpose with PendingApproval + StudentOverview admission card — three places tell the student their admission status; consolidate to one |
| **TermsOfService / PrivacyPolicy / NotFound / PendingApproval** | Fine. 🟡 PendingApproval has no "check again" action — add refresh button or auto-poll |

## Auth screens

| Screen | Findings |
|---|---|
| **Login** | Solid. 💡 no "remember me" needed (cookie covers it) but add "Forgot password?" prominence check 👁 |
| **Register (3-step)** | Solid post-split. 🟡 step 2 fetches tutors per subject with no debounce — rapid subject toggling spams requests. 💡 no price estimate shown until step 3 — surface the running monthly estimate on step 2 (calculation already exists in submit handler) |
| **TutorRegister wizard** | Inputs fixed this wave. 💡 no draft persistence — a tutor losing connection on step 5 restarts from zero; localStorage draft of non-file fields is cheap |
| **ForgotPassword / ResetPassword** | 🔴 X1 on ForgotPassword submit button hover |

## Student portal

| Screen | Findings |
|---|---|
| **Overview** | Dense but functional. 🟡 568 lines — split enroll-modal into its own component. 💡 no progress snapshot (sessions attended this month, exam score trend — `ExamResult` data exists and is unused here) |
| **Classes** | ✅ best-in-class states (FetchError+empty+skeleton). 💡 list-only view; a simple week calendar strip would answer "when is my next class" faster |
| **Session detail** | Exists, decent. 🟡 no back-link breadcrumb to Classes 👁 |
| **Finance** | ✅ good. 💡 no receipt for the initial admission payment (only wallet transactions); students ask for this |
| **Library** | 🔴 **dead button**: the `ExternalLink` icon button (top-right of every card) has an aria-label but **no onClick** — labelled, focusable, does nothing. Wire it to the same href as Download or remove it. 💡 no type filter (Video/PDF/Audio) despite `TypeIcon` knowing types |
| **Exams / JambCBT** | OK. 💡 results history page missing — student sees score once at submit, then it's gone from the UI (`ExamResult` persists server-side) |
| **Feedback** | OK. 🟡 no status timeline on complaints (submitted→reviewed→resolved states exist server-side) |

## Tutor portal

| Screen | Findings |
|---|---|
| **Schedule** | ✅ good states. 🟡 emoji tab labels (X4). 💡 same calendar-strip idea as student classes |
| **Requests** | 🟡 emoji tabs/avatars (X4). 💡 no decline-with-reason on requests — tutor can only approve or ignore |
| **Wallet** | ✅ good. 💡 earnings chart over time (data: transactions) — currently just a list |
| **Exams / Materials** | Functional CRUD. 🟡 no FetchError (X5). 💡 material upload lacks progress indicator for big videos 👁 |
| **Profile / Media** | 🟠 **Availability is uneditable after registration** — `AvailabilityManager` exists only in the wizard; a tutor whose schedule changes must ask an admin. Mount the same component on TutorProfilePage (API `update_profile` + slots endpoint may need a small addition) |
| **Complaints** | OK |

## Admin portal

| Screen | Findings |
|---|---|
| **Overview** | 🟡 emoji stat icons (X4); active-class banner no longer pulses (good) 👁 check density on mobile |
| **Students** (326L) | 🟠 **No search, no filters, no pagination** on the full student table — unusable beyond ~50 students. Client-side search + payment-status/tutor filter is an afternoon. 🟡 emoji action buttons (📹), 9px text (X3). 💡 CSV export |
| **Tutors / Recruitment** | Same: 🟠 no search/filter. Recruitment has status filter only server-side via tabs — fine. 💡 bulk actions (approve multiple) |
| **Admissions** | Has bulk approve ✅. 🟡 no FetchError |
| **Bookings / Classes / Payouts / Withdrawals / Complaints** | Functional; all 🟡 no FetchError, X3 micro-text. 💡 Withdrawals: no reject-with-reason (button exists? verify 👁) |
| **Curriculum** | OK after scroll-wrapper fix. 💡 drag-to-reorder subjects is unnecessary — skip |
| **Financials** | ✅ FetchError done. 💡 date-range picker for analytics (backend already computes ranges) |
| **Settings** | OK. 💡 this is where a "platform announcement" broadcast feature would live (send notification to all users — `Notification` model ready) |
| **ExamManager / QuestionManager** (standalone, outside shell) | 🟠 outside `DashboardShell` → no sidebar, no dark mode, inconsistent chrome; migrate into the admin shell as routes. 🟡 emoji buttons (✏️📂🎓) |

## Parent portal

| Screen | Findings |
|---|---|
| **Overview** (the only screen) | 🟠 **Thinnest portal by far** — cards show course/tutor/payment status and impersonation only. Missing for the paying customer: per-child session history & attendance, exam results, payment history, "fund child's wallet" action (parent currently must impersonate to pay!). 💡 This is the highest-value feature area in the whole review: a `ParentChildDetail` route reusing existing student endpoints via the impersonation token or dedicated parent endpoints |

## Shared / shell

| Screen | Findings |
|---|---|
| **Notification bell** | Shows last 3 + mark-read. 🟠 no "view all" page — older notifications unreachable; add `/notifications` route (API already returns 20) |
| **Account settings** | 🟠 **Students and parents have no way to change their password while logged in** (only the logged-out forgot-password flow). Tutors edit profile but not password. One small settings page (change password + email) covers all roles |
| **Sidebar/TopBar** | Fine post-refresh 👁 verify dark toggle icon states |

---

## Prioritised shortlist

**Fix now (bugs):**
1. X1 — replace 11 `primary-600/700` ghosts with `primary-dark` (script, 5 min)
2. StudentLibrary dead ExternalLink button
3. X2 — convert 7 hard navigations to `navigate()`

**Next (high-value, small):**
4. Admin Students/Tutors client-side search + filters
5. Password-change settings page (all roles)
6. Notifications "view all" page
7. Tutor availability editing on TutorProfilePage
8. X3+X4 sweep — finish micro-text + emoji→lucide in portals

**Feature investments (pick by product priority):**
9. **Parent portal build-out** (child detail: sessions, results, payments, fund-wallet) — best ROI for the paying customer
10. Student progress/results history (exam score trend, attendance)
11. ExamManager/QuestionManager into the admin shell
12. Homepage conversion additions (WhatsApp CTA, pricing, testimonials, FAQ)
