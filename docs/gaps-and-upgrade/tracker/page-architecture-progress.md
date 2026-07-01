# Page Architecture Refactor — Progress Tracker

Tracks implementation against `items/page-architecture.md`.

---

## Phase A — Layout Infrastructure ✅ Complete

Shared components used by every portal. Nothing else starts until these exist.

| # | Component | File | Status |
|---|---|---|---|
| 1 | `DashboardShell` | `components/layout/DashboardShell.jsx` | ✅ Done — `<Outlet context={{ isDark }}>`, no `brandColor`, no tab state |
| 2 | `Sidebar` | `components/layout/Sidebar.jsx` | ✅ Done — receives `navGroups`, `role`, `isDark`, `onToggleTheme`, `onLogout` |
| 3 | `SidebarGroup` | `components/layout/SidebarGroup.jsx` | ✅ Done — collapsible group with label + ChevronDown |
| 4 | `SidebarItem` | `components/layout/SidebarItem.jsx` | ✅ Done — `NavLink` with `isActive` for route-driven highlight |
| 5 | `TopBar` | `components/layout/TopBar.jsx` | ✅ Done — mobile-only sticky header |
| 6 | `Drawer` | `components/layout/Drawer.jsx` | ✅ Done — spring animation, Escape-to-close, body scroll lock, `footer` slot |
| 7 | `PageHeader` | `components/layout/PageHeader.jsx` | ✅ Done — `title`, `description`, `breadcrumb[]`, `actions` slot |
| 8 | Barrel export | `components/layout/index.js` | ✅ Done |

---

## Phase B — Student Portal ✅ Complete

*Smallest dashboard (1,329 lines). Pattern proven here before touching larger files.*

### Shell & Routes
| Component | Route | Status |
|---|---|---|
| `StudentShell` | `/student` (layout) | ✅ Done — `DashboardShell` with student nav groups |
| Route wiring in `App.jsx` | nested under `/student` | ✅ Done — index redirects to `/student/overview` |

### Sub-pages
| Component | Route | Status |
|---|---|---|
| `StudentOverview` | `/student/overview` | ✅ Done — stats, enrollments, pending payments, upcoming sessions, enrollment modal |
| `StudentClasses` | `/student/classes` | ✅ Done — full session list, join/reschedule, RescheduleModal |
| `StudentLibrary` | `/student/library` | ✅ Done — material cards grid with search, EmptyState |
| `StudentExams` | `/student/exams` | ✅ Done — pending exams + results history table |
| `StudentFinance` | `/student/finance` | ✅ Done — wallet card, transactions, lazy jsPDF receipts |
| `StudentFeedback` | `/student/feedback` | ✅ Done — complaint log + ComplaintModal |
| `StudentJambCBT` | `/student/jamb` | ✅ Done — access-gated by profile level; lazy-loads JambCBT |
| `StudentSettings` | `/student/settings` | ⏭ Deferred — profile editing not yet implemented in old dashboard |
| `EnrollmentWizard` | `/student/enroll` | ⏭ Deferred — enrollment modal kept in Overview for now; wizard route is a future task |
| `SessionDrawer` | `/student/classes/:id` | ⏭ Deferred — no per-session detail view exists yet; future task |

---

## Phase C — Tutor Portal ✅ Complete

*1,817 lines. Reuses Phase A layout and Phase B patterns.*

### Shell & Routes
| Component | Route | Status |
|---|---|---|
| `TutorShell` | `/tutor` (layout) | ✅ Done — redirects non-approved tutors to `/pending-approval` |
| Route wiring in `App.jsx` | nested under `/tutor` | ✅ Done — index redirects to `/tutor/schedule` |

### Sub-pages
| Component | Route | Status |
|---|---|---|
| `TutorSchedule` | `/tutor/schedule` | ✅ Done — trial + regular sessions, active-class banner, complaint + assignment modals |
| `TutorRequests` | `/tutor/requests` | ✅ Done — pending / approved / active sub-tabs, approve / reject |
| `TutorWalletPage` | `/tutor/wallet` | ✅ Done — financial summary cards + TutorWallet component |
| `TutorExams` | `/tutor/exams` | ✅ Done — exam grid, create/edit modal, question manager modal, assignments table |
| `TutorMaterials` | `/tutor/materials` | ✅ Done — upload form, target-audience selector, materials grid |
| `TutorComplaints` | `/tutor/complaints` | ✅ Done — filed-by-me + received split view |
| `TutorProfilePage` | `/tutor/profile` | ✅ Done — update bio / rate / meeting links, read-only availability |
| `TutorMedia` | `/tutor/media` | ✅ Done — video + audio upload via Cloudinary |
| `SessionDrawer` | `/tutor/schedule/:id` | ⏭ Deferred — no per-session detail view exists yet |
| `BookingDrawer` | `/tutor/requests/:id` | ⏭ Deferred — no per-booking detail view exists yet |

---

## Phase D — Admin Portal ✅ Complete

*4,138 lines. Refactored into 14 sub-pages + shared helpers.*

### Shell & Routes
| Component | Route | Status |
|---|---|---|
| `AdminShell` | `/admin` (layout) | ✅ Done — `DashboardShell` with 14-item nav |
| Route wiring in `App.jsx` | nested under `/admin` | ✅ Done — standalone `/admin/exams` routes placed above parent to avoid conflict |

### Sub-pages
| Component | Route | Status |
|---|---|---|
| `AdminOverview` | `/admin/overview` | ✅ Done — stats, charts, active-class banner, global commission editor |
| `AdminAdmissions` | `/admin/admissions` | ✅ Done — pending students tab + applications tab, bulk approve |
| `AdminStudents` | `/admin/students` | ✅ Done — full manage modal (course, tutor assign, wallet), delete |
| `AdminTutors` | `/admin/tutors` | ✅ Done — approved tutors list, view profile, delete |
| `AdminRecruitment` | `/admin/recruitment` | ✅ Done — interview scheduling, approve/reject, view modal |
| `AdminBookings` | `/admin/bookings` | ✅ Done — status filter, approve/reject |
| `AdminClasses` | `/admin/classes` | ✅ Done — regular/trials toggle, live session monitor, room links |
| `AdminCurriculum` | `/admin/curriculum` | ✅ Done — programs, subjects (inline commission edit), materials toggle/delete |
| `AdminExams` | `/admin/exams` | ✅ Standalone — existing `AdminExamManager` unchanged |
| `AdminFinancials` | `/admin/financials` | ✅ Done — revenue chart (daily/weekly/monthly), audit trail, wallet transactions, lazy jsPDF |
| `AdminPayouts` | `/admin/payouts` | ✅ Done — release funds action |
| `AdminWithdrawals` | `/admin/withdrawals` | ✅ Done — approve, lazy jsPDF receipt |
| `AdminComplaints` | `/admin/complaints` | ✅ Done — resolve with admin response |
| `AdminSettings` | `/admin/settings` | ✅ Done — admin user list, create admin modal |
| `adminHelpers.jsx` | shared | ✅ Done — `StatusBadge`, `getLocalTime`, `getCountryFlag` |

---

## Phase E — Parent Portal ✅ Complete

*163 lines. Simplest portal — children list with impersonation.*

| Component | Route | Status |
|---|---|---|
| `ParentShell` | `/parent` (layout) | ✅ Done — `DashboardShell` with single nav item |
| `ParentOverview` | `/parent/overview` | ✅ Done — children grid, impersonation ("View Dashboard") swaps tokens → `/student` |
| `ChildDashboard` | `/parent/child/:id` | ⏭ Deferred — no per-child detail view in original; impersonation covers this use case |

---

## Notes
- Old `DashboardLayout.jsx` stays in place until all portals are migrated, then deleted.
- Old `AdminDashboard.jsx`, `TutorDashboard.jsx`, `StudentDashboard.jsx` stay in place until their portal phase is complete, then deleted.
- Each phase must leave the app fully working before the next begins.
