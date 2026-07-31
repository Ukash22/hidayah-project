# Tutor Request Decline-with-Reason — Progress Tracker

Tracks implementation against [tutor-request-decline.md](../items/tutor-request-decline.md).

---

## Phase D-1 — Backend ✅ Complete

| # | Item | Status |
|---|---|---|
| 1 | Extract `rejection_reason` from `request.data` in reject branch | ✅ |
| 2 | Create `Notification` for the student with tutor name + reason before deletion | ✅ |
| 3 | Booking still deleted after notification (existing behaviour preserved) | ✅ |

No migration needed.

---

## Phase D-2 — Frontend ✅ Complete

| # | Item | Status |
|---|---|---|
| 4 | `declineModal` state replaces `window.prompt()` | ✅ |
| 5 | Decline modal: student name, optional reason textarea, Cancel + Decline buttons | ✅ |
| 6 | Loading state on Decline button | ✅ |
| 7 | Toast on success: "Request declined. Student has been notified." | ✅ |
| 8 | Button label renamed "Reject" → "Decline" (less aggressive, more professional) | ✅ |

---

## Verification Checklist

- [ ] Click "Decline" on a pending request → modal opens with student name
- [ ] Enter a reason → submit → student sees notification in their bell with the reason
- [ ] Leave reason blank → submit → student sees notification without reason clause
- [ ] Cancel → modal closes, booking unchanged
- [ ] Decline button shows "Declining…" while request is in flight
- [ ] Booking disappears from Pending tab after decline
