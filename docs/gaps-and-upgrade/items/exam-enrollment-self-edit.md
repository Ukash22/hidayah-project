# Exam Enrollment Self-Edit — Findings

Feature #13. Students who registered with the wrong `level` or `target_exam_type` had no way to correct it — no self-service UI existed and no admin path was exposed to them. AI Hub question generation and JAMB CBT auto-configuration both read from `target_exam_type`, so an incorrect value silently gives the student the wrong experience.

Severity: 🟠 hurts users (wrong exam type = wrong AI questions + wrong CBT mode)

Documented in CO-DEV-NOTES §5h.

---

## Root Cause

`StudentProfileDetailView` was a `generics.RetrieveAPIView` (GET-only). The serializer already included `level`, `target_exam_type`, and `target_exam_year` as writable fields — the only missing piece was an endpoint that accepted PATCH from the student.

`AccountSettings.jsx` existed and was shared across all four portals, but contained only the password-change form.

---

## Findings

| # | Finding | Location | Sev |
|---|---|---|---|
| E-1 | No PATCH endpoint on `/api/students/me/` — view was GET-only | `students/views.py:StudentProfileDetailView` | 🟠 |
| E-2 | No UI for a student to update `level` or `target_exam_type` | — | 🟠 |

---

## Fix

### Backend
`StudentProfileDetailView` promoted from `RetrieveAPIView` → `RetrieveUpdateAPIView`.

- `http_method_names = ['get', 'patch']` — PUT intentionally excluded (PATCH-only to prevent accidental full-overwrites).
- `update()` override strips request data to a whitelist `{'level', 'target_exam_type', 'target_exam_year'}` before touching the serializer. Students cannot patch `payment_status`, `assigned_tutor`, or any other field via this endpoint.

### Frontend
New **"Exam Enrollment"** card added to `AccountSettings.jsx`.

- Renders only when `user.role === 'STUDENT'`.
- Fetches current values from `GET /api/students/me/` on mount.
- Three controls: Level (select), Target Exam (select), Target Year (text, maxLength 4).
- On save: `PATCH /api/students/me/` with `{ level, target_exam_type, target_exam_year }`.
- Card spans full width (`lg:col-span-2`) to sit above the narrower Password and Profile cards.

### Field choices
| Field | Choices |
|---|---|
| `level` | PRIMARY · SECONDARY · JUNIOR_WAEC · JAMB · WAEC · NECO |
| `target_exam_type` | JAMB · WAEC · NECO · BECE |

---

## No Migration Needed

Both fields already exist on `StudentProfile`. No schema change.
