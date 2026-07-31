# Platform Announcement Broadcast — Progress Tracker

Tracks implementation against [platform-announcement.md](../items/platform-announcement.md).

---

## Phase A-1 — Backend ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | `BroadcastNotificationView` added to `accounts/views.py` | ✅ |
| 2 | `IsAdminUser` permission guard | ✅ |
| 3 | `target_role` whitelist: ALL / STUDENT / TUTOR / PARENT | ✅ |
| 4 | `bulk_create(batch_size=500)` fan-out | ✅ |
| 5 | URL `notifications/broadcast/` registered in `accounts/urls.py` | ✅ |

---

## Phase A-2 — Frontend ✅ Complete

| # | Item | Status |
|---|---|---|
| 6 | "Broadcast Announcement" card in `AdminSettings.jsx` | ✅ |
| 7 | Title + Send To + Message form | ✅ |
| 8 | POST → toast with recipient count | ✅ |
| 9 | Form resets on success; button disabled while submitting | ✅ |

---

## Verification Checklist

- [ ] Admin fills form → submit → toast shows "Sent to N users"
- [ ] Target role "Students only" → only students receive the notification
- [ ] Recipients see the notification in their bell dropdown
- [ ] Admins are excluded from the fan-out (even when "All Users" selected)
- [ ] Empty title or message → submit button stays disabled
- [ ] Non-admin user POSTing to `/api/auth/notifications/broadcast/` → 403
