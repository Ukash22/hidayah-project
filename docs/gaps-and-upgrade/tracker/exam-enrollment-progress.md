# Exam Enrollment Self-Edit — Progress Tracker

Tracks implementation against [exam-enrollment-self-edit.md](../items/exam-enrollment-self-edit.md).

---

## Phase E-1 — Backend ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 1 | `StudentProfileDetailView` → `RetrieveUpdateAPIView`; `http_method_names = ['get', 'patch']` | `students/views.py` | ✅ |
| 2 | `update()` override whitelisting `level`, `target_exam_type`, `target_exam_year` only | `students/views.py` | ✅ |

No migration needed — fields already exist on `StudentProfile`.

---

## Phase E-2 — Frontend ✅ Complete

| # | Item | File | Status |
|---|---|---|---|
| 3 | `useEffect` fetch of current enrollment values on mount | `pages/AccountSettings.jsx` | ✅ |
| 4 | "Exam Enrollment" card with Level + Target Exam + Target Year controls | `pages/AccountSettings.jsx` | ✅ |
| 5 | Card renders only for `user.role === 'STUDENT'`; hidden for tutor/admin/parent | `pages/AccountSettings.jsx` | ✅ |
| 6 | `PATCH /api/students/me/` on save with toast feedback | `pages/AccountSettings.jsx` | ✅ |

---

## Verification Checklist

- [ ] Log in as a student → Account Settings → "Exam Enrollment" card visible
- [ ] Log in as tutor/admin/parent → card not shown
- [ ] Change level + target exam → Save → refresh page → values preserved
- [ ] Try PATCH with a disallowed field (e.g. `payment_status`) → backend ignores it (only whitelisted fields are processed)
- [ ] Confirm AI Hub and CBT pages reflect the updated `target_exam_type`
