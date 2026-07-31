# Batch / Study Groups — Feature Plan

Feature #12. Organise students into named cohorts (batches) under a single tutor + subject, with full CRUD from the admin portal, membership editing from the tutor portal, and read-only visibility in the student portal.

---

## Motivation

Currently there is no way to represent "Group A of 5 JAMB students all taught by Tutor Ibrahim on Wednesdays." Each student is managed in isolation — scheduling, assignment, and monitoring have no concept of a cohort. Batches fix that.

---

## Data Model

**App:** `classes`  
**Model:** `Batch`  
**Migration:** `classes/0013_batch.py`

| Field | Type | Notes |
|---|---|---|
| `name` | CharField(100) | e.g. "JAMB 2025 — Group A" |
| `tutor` | FK → User (CASCADE) | required |
| `subject` | FK → Subject (SET_NULL, nullable) | optional; null = all subjects |
| `students` | M2M → User (blank=True) | membership managed via API |
| `description` | TextField (blank) | optional notes |
| `is_active` | BooleanField | soft-delete; default True |
| `created_at` | DateTimeField auto | — |

`ScheduledSession` receives an optional `batch` FK (SET_NULL) so a session can be tied to a cohort.

---

## API Endpoints

All under `/api/classes/`:

| Method | Path | Roles | Action |
|---|---|---|---|
| GET | `batches/` | admin / tutor / student | list (role-filtered) |
| POST | `batches/` | admin | create |
| GET | `batches/<id>/` | admin / tutor / student | detail |
| PUT | `batches/<id>/` | admin / tutor | update name / description / is_active |
| DELETE | `batches/<id>/` | admin | soft-delete (sets is_active=False) |
| POST | `batches/<id>/students/add/` | admin / tutor | body: `{ student_ids: [id, …] }` |
| POST | `batches/<id>/students/remove/` | admin / tutor | body: `{ student_ids: [id, …] }` |

### Role filtering
- **Admin** — all batches  
- **Tutor** — only batches where `tutor == request.user`  
- **Student** — only batches they are enrolled in  

### Serializer fields
`id`, `name`, `description`, `tutor`, `tutor_name`, `subject`, `subject_name`, `students`, `students_detail` (list of `{id, name, email}`), `student_count`, `is_active`, `created_at`

---

## Frontend Scope

### Admin — `AdminClasses.jsx`
Third tab ("Study Batches") alongside Regular / Trials.

- Create form: name, tutor (select), subject (optional), description  
- Batch cards: expand → student list with remove buttons  
- Add student: dropdown filtered to students not already in the batch  
- Deactivate / reactivate toggle per card  

### Tutor — `TutorSchedule.jsx`
"My Study Batches" section appended after the regular sessions list.

- Only the tutor's own batches  
- Expand → students list with remove buttons  
- Add from the tutor's assigned student roster  

### Student — `StudentClasses.jsx`
"My Study Groups" card grid above the sessions list.

- Renders only when the student is enrolled in at least one batch  
- Shows batch name, subject, tutor, member count  
- Read-only (no self-enroll / leave)  

---

## Access Control

Tutors POSTing to `batches/` are forced to `tutor = request.user` server-side (cannot spoof another tutor). Membership edits are gated to admin and the batch's own tutor. Students have no write access.

---

## Soft-Delete

DELETE sets `is_active=False`. This preserves historical membership and any linked `ScheduledSession` rows. Reactivation is a PUT with `{ is_active: true }`.

---

## Known Gaps / Future Items

| # | Item | Priority |
|---|---|---|
| F-1 | Batch-level announcement broadcast (notify all members) | Medium |
| F-2 | Session creation pre-fills student list when a batch is selected | Medium |
| F-3 | Progress roll-up: aggregate exam scores + attendance across a batch for the tutor dashboard | Low |
| F-4 | Student self-request to join a batch; tutor/admin approves | Low |
