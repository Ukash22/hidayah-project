# Batch / Study Groups — Progress Tracker

Tracks implementation against [batch-study-groups.md](../items/batch-study-groups.md).

---

## Phase B-1 — Backend ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | `Batch` model in `classes/models.py` — name, tutor FK, subject FK, students M2M, description, is_active, created_at | ✅ |
| 2 | `batch` FK on `ScheduledSession` (SET_NULL, nullable) | ✅ |
| 3 | Migration `classes/0013_batch.py` — CreateModel + AddField | ✅ |
| 4 | `BatchSerializer` — tutor_name, subject_name, student_count, students_detail read annotations | ✅ |
| 5 | `BatchView` — GET (role-filtered list), POST (create), PUT (partial update), DELETE (soft) | ✅ |
| 6 | `BatchMemberView` — POST `add` / `remove` with `student_ids` list | ✅ |
| 7 | URL patterns in `classes/urls.py` | ✅ |

---

## Phase B-2 — Admin Portal ✅ Complete

| # | Item | Status |
|---|---|---|
| 8 | "Study Batches" third tab in `AdminClasses.jsx` | ✅ |
| 9 | Create batch form (name, tutor, subject, description) | ✅ |
| 10 | Expandable batch cards with student list + remove buttons | ✅ |
| 11 | Add-student dropdown (filtered to non-members) | ✅ |
| 12 | Deactivate / reactivate toggle | ✅ |

---

## Phase B-3 — Tutor Portal ✅ Complete

| # | Item | Status |
|---|---|---|
| 13 | "My Study Batches" section in `TutorSchedule.jsx` | ✅ |
| 14 | Expandable batch cards with student list + remove buttons | ✅ |
| 15 | Add-student from assigned roster dropdown | ✅ |

---

## Phase B-4 — Student Portal ✅ Complete

| # | Item | Status |
|---|---|---|
| 16 | "My Study Groups" card grid in `StudentClasses.jsx` | ✅ |
| 17 | Shows batch name, subject, tutor, member count — read-only | ✅ |

---

## Future Items (not yet scheduled)

| # | Item | Priority |
|---|---|---|
| F-1 | Batch-level announcement broadcast | Medium |
| F-2 | Session creation auto-fills student list from batch | Medium |
| F-3 | Progress roll-up across batch members (tutor dashboard) | Low |
| F-4 | Student self-request to join; tutor/admin approval flow | Low |
