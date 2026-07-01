# Page Architecture Redesign

## The Problem in Numbers

| File | Lines | What it contains |
|---|---|---|
| `AdminDashboard.jsx` | **4,138** | 14 tabs + 8 inline components + 12 API fetch functions + 20+ state variables |
| `TutorDashboard.jsx` | **1,817** | 8 tabs + modals + Cloudinary uploads + exam creation inline |
| `StudentDashboard.jsx` | **1,329** | 7 tabs + enrollment modal + reschedule modal + PDF receipt generation |

Everything is in one place because tabs swap content in a `{activeTab === 'x' && (...)}` chain. The result: a single component that fetches all data on mount, manages all state, renders all UI, and handles every user action for an entire portal. This makes the code hard to maintain, impossible to code-split, slow to load, and painful to extend.

The fix is **nested routing + feature modules**. Each major section becomes a real URL, loads its own data, and is split into its own file.

---

## Core Principle: The Dashboard Shell

Every portal (Admin, Tutor, Student, Parent) should be a **shell** — a persistent layout that only handles:
1. The sidebar navigation
2. The top header bar
3. The `<Outlet />` where the current sub-page renders

The shell fetches only the data it permanently needs: the logged-in user's profile and unread notification count. Everything else is fetched by the sub-page that needs it.

```
DashboardShell
├── Sidebar (persistent, always visible)
├── TopBar (persistent, always visible)
└── <Outlet /> (the active sub-page renders here)
```

---

## Proposed Route Tree

```
/admin                          → AdminShell (layout only)
  /admin/overview               → AdminOverview (stats, charts)
  /admin/admissions             → AdminAdmissions (pending student list)
    /admin/admissions/:id       → StudentApplicationDrawer (right-side drawer)
  /admin/students               → AdminStudents (approved student table)
    /admin/students/:id         → StudentDetailPage (full page)
  /admin/tutors                 → AdminTutors (approved tutor table)
    /admin/tutors/:id           → TutorDetailPage (full page)
  /admin/recruitment            → AdminRecruitment (tutor applicants)
    /admin/recruitment/:id      → TutorApplicationDrawer (right-side drawer)
  /admin/classes                → AdminClasses (all sessions)
    /admin/classes/:id          → SessionDetailDrawer
  /admin/bookings               → AdminBookings (pending/approved bookings)
  /admin/trials                 → AdminTrials (trial applications)
  /admin/curriculum             → AdminCurriculum (all materials)
  /admin/exams                  → AdminExams (exam bank)
    /admin/exams/:id            → AdminExamDetail (questions for this exam)
  /admin/financials             → AdminFinancials (transactions)
  /admin/payouts                → AdminPayouts (pending payout releases)
  /admin/withdrawals            → AdminWithdrawals (tutor withdrawal requests)
  /admin/complaints             → AdminComplaints (complaint list)
    /admin/complaints/:id       → ComplaintDetailDrawer
  /admin/settings               → AdminSettings (platform settings, commission)

/tutor                          → TutorShell (layout only)
  /tutor/schedule               → TutorSchedule (upcoming + past sessions)
    /tutor/schedule/:id         → SessionDetailDrawer
  /tutor/students               → TutorStudents (assigned students list)
    /tutor/students/:id         → StudentProfileDrawer
  /tutor/requests               → TutorRequests (booking approvals)
    /tutor/requests/:id         → BookingDetailDrawer
  /tutor/materials              → TutorMaterials (library)
    /tutor/materials/new        → NewMaterialPage or Drawer
  /tutor/exams                  → TutorExams (exams created / assigned)
    /tutor/exams/new            → NewExamDrawer
    /tutor/exams/:id            → ExamDetailPage (questions)
  /tutor/wallet                 → TutorWallet (balance, history, withdraw)
  /tutor/complaints             → TutorComplaints
  /tutor/profile                → TutorProfile (bio, media, availability)
    /tutor/profile/media        → TutorMediaUpload (sub-page within profile)

/student                        → StudentShell (layout only)
  /student/overview             → StudentOverview (welcome, quick actions)
  /student/classes              → StudentClasses (upcoming + past)
    /student/classes/:id        → SessionDetailDrawer
  /student/library              → StudentLibrary (materials)
    /student/library/:id        → MaterialViewPage
  /student/exams                → StudentExams (assigned + available)
    /student/exams/:id          → CBTInterface (already exists, just link here)
  /student/ai-hub               → AIHub (already exists, embed here or link)
  /student/finance              → StudentFinance (wallet, transactions, receipts)
  /student/feedback             → StudentFeedback (complaints)
  /student/settings             → StudentSettings (profile, preferences)
  /student/enroll               → EnrollmentWizard (multi-step, new route)

/parent                         → ParentShell
  /parent/overview              → ParentOverview
  /parent/child/:id             → ChildDashboard (mirrors student view, read-only)
```

---

## Sidebar Navigation — Groups and Sub-Items

Instead of a flat list of icons, the sidebar should use **grouped sections** with collapsible sub-items for sections that have depth.

### Admin Sidebar

```
OVERVIEW
  ● Dashboard              /admin/overview

PEOPLE
  ● Admissions    [badge]  /admin/admissions
  ● Students               /admin/students
  ● Tutors                 /admin/tutors
  ● Recruitment   [badge]  /admin/recruitment

ACADEMIC
  ● Classes                /admin/classes
  ● Bookings      [badge]  /admin/bookings
  ● Trials                 /admin/trials
  ● Curriculum             /admin/curriculum
  ▼ Exams                  (collapsible group)
      Exam Bank            /admin/exams
      Question Manager     (opens from Exam Bank page)

FINANCE
  ● Transactions           /admin/financials
  ● Payouts       [badge]  /admin/payouts
  ● Withdrawals   [badge]  /admin/withdrawals

SUPPORT
  ● Complaints    [badge]  /admin/complaints
  ● Platform Settings      /admin/settings
```

### Tutor Sidebar

```
  ● Schedule               /tutor/schedule
  ● My Students            /tutor/students
  ● Requests      [badge]  /tutor/requests
  ▼ Content
      Materials            /tutor/materials
      Exams                /tutor/exams
  ● Wallet                 /tutor/wallet
  ● Complaints             /tutor/complaints
  ● Profile & Media        /tutor/profile
```

### Student Sidebar

```
  ● Overview               /student/overview
  ● My Classes             /student/classes
  ● Library                /student/library
  ▼ Exams & AI
      Exam Practice        /student/exams
      AI Hub               /student/ai-hub
  ● Finance                /student/finance
  ● Feedback               /student/feedback
  ● Settings               /student/settings
```

---

## Drawer Pattern — For Details, Not Full Pages

A **right-side drawer** (sliding panel, ~480px wide on desktop, full screen on mobile) should be used when the user needs to inspect or act on a **single record** without losing their place in the list.

Use a drawer for:
- Viewing a student application detail (Admin → Admissions)
- Reviewing a tutor application and approving/rejecting (Admin → Recruitment)
- Viewing/editing a session (schedule → session detail)
- Viewing a booking request and approving it (Tutor → Requests)
- Viewing a complaint and responding (Admin/Tutor/Student → Complaints)
- Viewing a student's profile from the tutor's student list

The drawer is triggered by clicking a row in a table or a card in a list. The URL updates to include the record ID (`/admin/admissions/42`), so the drawer can be deep-linked and the back button closes it.

```
List Page (/admin/admissions)
├── Table row clicked → URL becomes /admin/admissions/42
├── Drawer slides in from the right
├── Drawer shows full ApplicationDetail component
├── Actions (Approve, Reject, Schedule Interview) are in the drawer
└── Closing the drawer → URL returns to /admin/admissions
```

**Implementation:** Use React Router v7 nested routes. The drawer route (`/admin/admissions/:id`) is a child route of the list page. When the child route matches, the list stays rendered and the drawer overlays it.

---

## Full Page — For Heavy Editing or Multi-Step Actions

Use a **dedicated full page** (not a drawer) when the user needs:
- A multi-step form (Enrollment wizard, Tutor profile editing)
- A content-heavy detail view with tabs of its own (Student full profile, Exam question manager)
- An interface that takes full focus (CBT exam, Live class room — already full page)

Examples:
- `/admin/students/:id` — Student full profile: personal info, sessions history, payments, enrolled subjects, complaints. Has its own tab bar within the page.
- `/admin/exams/:id` — Exam detail with question table, add/edit/delete questions inline.
- `/student/enroll` — Multi-step enrollment wizard (replaces the enrollment modal currently inside StudentDashboard).
- `/tutor/profile` — Full profile editor with tabs: Bio & Info, Availability, Media (replaces the inline profile tab in TutorDashboard).

---

## Modal — For Confirmations and Simple Actions Only

Modals should be reserved for:
- Confirming a destructive action ("Are you sure you want to cancel this session?")
- A single-input action (reschedule to a new datetime, enter a rejection reason)
- A quick status update (mark session as complete, release a payout)

Modals should **not** be used for:
- Viewing full profiles (use Drawer)
- Creating exams or materials (use Drawer or Page)
- Multi-step enrollment (use Page)
- Displaying large data tables

---

## Feature Module Structure

Each sub-page should live in its own folder with everything it needs:

```
src/
  pages/
    admin/
      AdminShell.jsx           ← layout, sidebar, outlet
      overview/
        AdminOverview.jsx
      admissions/
        AdminAdmissions.jsx    ← list
        AdmissionDrawer.jsx    ← detail drawer
      students/
        AdminStudents.jsx      ← list
        StudentDetail.jsx      ← full page
      tutors/
        AdminTutors.jsx
        TutorDetail.jsx
      recruitment/
        AdminRecruitment.jsx
        RecruitmentDrawer.jsx
      classes/
        AdminClasses.jsx
        SessionDrawer.jsx
      exams/
        AdminExams.jsx
        AdminExamDetail.jsx
      financials/
        AdminFinancials.jsx
      payouts/
        AdminPayouts.jsx
      withdrawals/
        AdminWithdrawals.jsx
      complaints/
        AdminComplaints.jsx
        ComplaintDrawer.jsx
      settings/
        AdminSettings.jsx

    tutor/
      TutorShell.jsx
      schedule/
        TutorSchedule.jsx
        SessionDrawer.jsx
      students/
        TutorStudents.jsx
        StudentDrawer.jsx
      requests/
        TutorRequests.jsx
        BookingDrawer.jsx
      materials/
        TutorMaterials.jsx
        MaterialDrawer.jsx
      exams/
        TutorExams.jsx
        ExamDrawer.jsx
      wallet/
        TutorWallet.jsx
      complaints/
        TutorComplaints.jsx
      profile/
        TutorProfile.jsx
        TutorMediaUpload.jsx

    student/
      StudentShell.jsx
      overview/
        StudentOverview.jsx
      classes/
        StudentClasses.jsx
        SessionDrawer.jsx
      library/
        StudentLibrary.jsx
        MaterialViewer.jsx
      exams/
        StudentExams.jsx       ← links out to existing CBTInterface
      ai-hub/
        AIHub.jsx              ← moved here from top-level pages/
      finance/
        StudentFinance.jsx
      feedback/
        StudentFeedback.jsx
      settings/
        StudentSettings.jsx
      enroll/
        EnrollmentWizard.jsx   ← replaces the modal inside StudentDashboard

  components/
    ui/                        ← shared primitives (see ui-ux-audit.md)
    layout/
      DashboardShell.jsx       ← the single reusable shell used by all portals
      Sidebar.jsx
      SidebarGroup.jsx         ← collapsible sidebar section
      SidebarItem.jsx
      TopBar.jsx
      Drawer.jsx               ← reusable right-side drawer wrapper
      PageHeader.jsx           ← title + breadcrumb + actions bar
```

---

## Data Fetching Strategy Change

Currently every dashboard fires all API calls in one `fetchData` function on mount. The new architecture means each sub-page fetches only what it needs, only when it's visited.

```
AdminShell.jsx         → fetches: user profile, notification count
AdminAdmissions.jsx    → fetches: pending student applications
AdminStudents.jsx      → fetches: approved students (paginated)
AdminFinancials.jsx    → fetches: transactions (paginated)
```

Benefits:
- The shell renders instantly. No more full-page loading spinner.
- Navigating to a tab you rarely visit doesn't slow down the ones you use daily.
- Each page can independently refresh its own data.
- React Router's `loader` API (v7) can preload data before the component renders, eliminating the `loading` state pattern entirely for most pages.

---

## Quick Reference: Current vs Proposed

| Current | Problem | Proposed |
|---|---|---|
| `AdminDashboard.jsx` (4,138 lines, 1 file) | Unmaintainable, loads everything on mount | ~14 focused sub-pages + 1 shell file |
| `TutorDashboard.jsx` (1,817 lines) | Exam creation, media upload, profile edit all inline | ~8 sub-pages with dedicated routes |
| `StudentDashboard.jsx` (1,329 lines) | Enrollment modal, CBT preview, PDF generation all inline | ~7 sub-pages, wizard gets its own route |
| `TutorProfileModal` inside AdminDashboard | Not reusable, 200 lines of inline JSX | `TutorDetail.jsx` full page + `RecruitmentDrawer.jsx` |
| `{activeTab === 'x' && ...}` chain | No code splitting, all renders at once | Real routes = automatic code splitting per page |
| Single `fetchData` with 9+ parallel calls | Fail of one silently breaks others | Per-page loaders, independent error boundaries |
| Enrollment inside StudentDashboard modal | Multi-step flow crammed into a modal | `/student/enroll` wizard page with URL-tracked steps |
| Exam creation inside TutorDashboard modal | Complex form in an overlay | `/tutor/exams/new` drawer with proper form layout |
| All modals defined in parent file | Can't reuse or test independently | Drawer/Modal components in own files, imported where needed |
