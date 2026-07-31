# Tutor Request Decline-with-Reason — Findings

Feature #17. Tutors could only approve or silently ignore booking requests — there was no formal decline path. The existing "Reject" button used `window.prompt()` (a browser native dialog, inconsistent with the rest of the UI), and the backend ignored any reason sent and simply deleted the booking record without notifying the student.

Severity: 🟠 hurts users — student left guessing why their request disappeared

---

## Findings

| # | Finding | Location | Sev |
|---|---|---|---|
| D-1 | `window.prompt()` used to collect decline reason — inconsistent UI | `TutorRequests.jsx:handleReject` | 🟠 |
| D-2 | Backend discarded `rejection_reason` and deleted booking silently — student never notified | `classes/views.py:BookingApprovalView` reject branch | 🟠 |

---

## Fix

### Backend — `BookingApprovalView` reject branch

Before deleting the booking:
1. Extract `rejection_reason` from `request.data` (optional)
2. Compose a `Notification` for the student: *"Your booking request for [Subject] was declined by [Tutor]. Reason: [reason]"*
3. Create the notification via `Notification.objects.create()`
4. Then delete the booking (existing behaviour preserved)

No new model field or migration needed — the reason is delivered via the existing notification system.

### Frontend — `TutorRequests.jsx`

`window.prompt()` replaced with a purpose-built **Decline modal**:

- Triggered by the "Decline" button (renamed from "Reject") on each pending request card
- Modal shows student name, a textarea for the reason (optional), Cancel and "Decline Request" buttons
- On confirm: `POST /api/classes/booking/{id}/reject/` with `{ rejection_reason }`
- Toast on success: *"Request declined. Student has been notified."*
- Loading state on the Decline button while the request is in flight
