# Platform Announcement Broadcast — Findings

Feature #16. Admin had no way to reach all users (or a specific role) with a platform-wide message. The `Notification` model and bell UI already existed — only the fan-out endpoint and admin form were missing.

Severity: 🟠 operational gap — no mass communication channel

Noted in ui-deep-dive.md Admin → Settings: *"this is where a 'platform announcement' broadcast feature would live (send notification to all users — Notification model ready)"*.

---

## Finding

| # | Finding | Location | Sev |
|---|---|---|---|
| A-1 | No broadcast endpoint — notifications could only be created per-user by internal code | `accounts/views.py` | 🟠 |
| A-2 | No UI for admin to compose and send a broadcast | `pages/admin/AdminSettings.jsx` | 🟠 |

---

## Fix

### Backend — `POST /api/auth/notifications/broadcast/`

- Permission: `IsAdminUser`
- Body: `{ title, message, target_role }` where `target_role` ∈ `ALL | STUDENT | TUTOR | PARENT`
- Filters: `is_active=True`, excludes `role=ADMIN` (admins don't notify themselves)
- Uses `bulk_create(batch_size=500)` — efficient for large user bases
- Returns `{ created: N }`

### Frontend — AdminSettings.jsx

"Broadcast Announcement" card added above the admin management table.

- Title input + Send To role select + message textarea
- Submit → POST → toast: *"Announcement sent to 142 users."*
- Form resets after success
- Button disabled while sending or if fields are empty
