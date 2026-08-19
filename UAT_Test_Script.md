# Hidayah Platform — User Acceptance Testing (UAT) Script

**Project:** Hidayah e-Madarasah International  
**Document Type:** UAT Test Script  
**Version:** 1.0  
**Date:** August 2026  

---

## How to Use This Document

Each story below follows one user actor through a complete real-world journey on the platform. A tester should follow the steps in order, tick ✅ for pass or mark ❌ for fail, and note any issues in the **Notes** column.

**Tools needed:** Postman (or any API client), or the Hidayah web application  
**Base URL:** Your deployed server URL (e.g. `https://hidayah.onrender.com`)

---

## Test Accounts to Create Before Starting

Before running any stories, ensure the following accounts exist (or create them during Story 3):

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Admin | `admin_test` | `Admin@12345` | Platform oversight |
| Tutor | Created in Story 2 | `Sheikh@12345` | Teaching |
| Student | Created in Story 1 | `Aisha@12345` | Learning |
| Parent | Created in Story 4 | `Parent@12345` | Monitoring child |

---

## STORY 1 — Student Registration & Learning Journey
**Actor:** Aisha (Student)  
**Goal:** A new student can register, get approved by admin, explore the platform, book a tutor, and log out.

### Pre-conditions
- Platform is live
- At least one approved tutor exists in the system
- Admin account is active

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Send `POST /api/auth/register/` with role `STUDENT`, username `aisha_test`, email, password, subject enrollment | Response 201. User created in the system | | |
| 2 | Send `POST /api/auth/login/` with `aisha_test` credentials | Response 200. Receive `access` token and user profile in response | | |
| 3 | Send `GET /api/auth/profile/` with the access token in the `Authorization: Bearer` header | Response 200. Returns Aisha's profile with correct username and role | | |
| 4 | Send `GET /api/students/me/` | Response 200. Returns student profile with `approval_status` and `payment_status` fields | | |
| 5 | Send `GET /api/students/me/progress/` | Response 200. Returns `attendance` object with `total`, `completed`, `upcoming` fields | | |
| 6 | Send `GET /api/classes/sessions/` | Response 200. Returns list (may be empty at this stage) | | |
| 7 | Send `GET /api/curriculum/materials/` | Response 200. Returns list of learning materials | | |
| 8 | Send `GET /api/exams/list/` | Response 200. Returns list of available exams | | |
| 9 | Send `GET /api/auth/notifications/` | Response 200. Returns list of notifications (may be empty) | | |
| 10 | Send `GET /api/ai/practice-sets/` | Response 200. Returns empty list initially | | |
| 11 | Send `POST /api/classes/booking/request/` with tutor ID, subject, and schedule | Response 201. Booking created and auto-approved. `id` returned in response | | |
| 12 | Send `GET /api/classes/booking/request/` | Response 200. Aisha's booking appears in the list | | |
| 13 | Send `POST /api/complaints/my/` with `filed_against_id`, `subject`, and `description` | Response 201. Complaint filed successfully | | |
| 14 | Send `GET /api/complaints/my/` | Response 200. Returns object with `filed_by_me` list containing the complaint | | |
| 15 | Send `POST /api/ai/practice-sets/` with a practice set JSON | Response 201. Practice set saved | | |
| 16 | Send `GET /api/ai/practice-sets/` | Response 200. List now contains 1 item matching the saved title | | |
| 17 | Send `POST /api/auth/logout/` | Response 200 or 204. Session ended | | |

---

## STORY 2 — Tutor Application & Teaching Journey
**Actor:** Sheikh Musa (Tutor)  
**Goal:** A new tutor can apply, get approved by admin, set availability, create exams, and view their students.

### Pre-conditions
- Admin account is active
- At least one subject exists in the system

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Send `POST /api/tutors/register/` with tutor details (name, subjects, hourly rate, experience) | Response 201. Tutor profile created with status `APPLIED` | | |
| 2 | Log in as Admin. Send `GET /api/tutors/admin/list/` | Response 200. Sheikh's email appears in the tutor list | | |
| 3 | Admin sends `POST /api/tutors/admin/action/{tutor_profile_id}/` with `{"action": "APPROVE"}` | Response 200. Tutor status changes to `APPROVED` | | |
| 4 | Log in as Sheikh. Send `GET /api/tutors/me/` | Response 200. Profile returned with `status: APPROVED` | | |
| 5 | Send `PUT /api/tutors/me/availability/` with `{"slots": [{"day": "Monday", "start_time": "09:00", "end_time": "12:00"}]}` | Response 200. Availability saved | | |
| 6 | Send `GET /api/students/tutor/my-students/` | Response 200. Returns list of students assigned to Sheikh (may be empty) | | |
| 7 | Send `POST /api/exams/list/` with title, subject ID, `exam_type: INTERNAL`, duration | Response 201. Exam created with `id` | | |
| 8 | Send `POST /api/exams/list/{exam_id}/add_question/` with question text, options A-D, correct option | Response 201. Question added. `id` returned | | |
| 9 | Repeat step 8 for 2 more questions (total 3 questions) | All 3 return 201 | | |
| 10 | Send `GET /api/exams/list/` | Response 200. Sheikh's exam appears in the list | | |
| 11 | Send `GET /api/classes/booking/approval/` | Response 200. Returns list of pending booking requests | | |
| 12 | Send `GET /api/classes/sessions/` | Response 200. Returns Sheikh's session list | | |
| 13 | Send `GET /api/payments/tutor/wallet/` | Response 200. Returns `balance` and `transactions` | | |
| 14 | Send `GET /api/complaints/my/` | Response 200. Returns complaints filed against Sheikh | | |
| 15 | Send `GET /api/curriculum/materials/` | Response 200. Returns materials uploaded by Sheikh | | |

---

## STORY 3 — Admin Platform Oversight Journey
**Actor:** Admin Hussain  
**Goal:** Admin can approve students and tutors, monitor financials, manage the platform, and resolve issues.

### Pre-conditions
- Admin account exists
- At least one pending student exists
- At least one approved tutor exists
- At least one complaint has been filed

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Log in as Admin. Send `GET /api/auth/pending-students/` | Response 200. Returns list of students with `approval_status: PENDING` | | |
| 2 | Send `POST /api/auth/approve-student/{student_id}/` | Response 200. Student approved and notified | | |
| 3 | Send `GET /api/students/admin/all/` | Response 200. Returns all active (PAID) students | | |
| 4 | Send `GET /api/tutors/admin/list/` | Response 200. Returns all tutors with their status | | |
| 5 | Send `GET /api/payments/admin/analytics/` | Response 200. Returns `total_revenue`, `history`, status breakdown, and charts | | |
| 6 | Send `GET /api/payments/admin/stats/` | Response 200. Returns platform financial statistics | | |
| 7 | Send `GET /api/payments/admin/transactions/` | Response 200. Returns recent global transaction list | | |
| 8 | Send `GET /api/payments/admin/withdrawals/pending/` | Response 200. Returns list of pending withdrawal requests | | |
| 9 | Send `GET /api/payments/admin/settings/` | Response 200. Returns current commission settings | | |
| 10 | Send `PATCH /api/payments/admin/settings/` with `{"default_commission_percentage": 15}` | Response 200. Commission rate updated | | |
| 11 | Send `POST /api/payments/admin/wallet-action/` with student ID, amount, `action_type: DEPOSIT` | Response 200. Student wallet credited. New balance returned | | |
| 12 | Send `POST /api/auth/notifications/broadcast/` with title, message, `target_role: ALL` | Response 200. `created` count returned (matches number of active non-admin users) | | |
| 13 | Send `GET /api/complaints/admin/all/` | Response 200. Returns all complaints on the platform | | |
| 14 | Send `POST /api/complaints/admin/{complaint_id}/resolve/` with a response message | Response 200. Complaint marked as resolved | | |
| 15 | Send `POST /api/classes/batches/` with batch name, tutor ID, subject ID | Response 201. Batch created with `id` | | |
| 16 | Send `POST /api/classes/batches/{batch_id}/students/add/` with `{"student_ids": [student_id]}` | Response 200. Student added to batch | | |
| 17 | Send `GET /api/classes/batches/` | Response 200. Batch appears in the list | | |
| 18 | Send `GET /api/classes/admin/unified-list/` | Response 200. Returns combined list of regular and trial sessions | | |
| 19 | Send `GET /api/classes/admin/bookings/` | Response 200. Returns all bookings on the platform | | |
| 20 | Send `GET /api/classes/admin/all/` | Response 200. Returns all scheduled sessions | | |
| 21 | Send `GET /api/auth/admin/users/` | Response 200. Returns all platform users | | |
| 22 | Send `GET /api/auth/admin/users/?role=TUTOR` | Response 200. Returns only tutor accounts | | |
| 23 | Send `PATCH /api/auth/admin/users/{user_id}/` with `{"first_name": "Updated"}` | Response 200. User record updated | | |

---

## STORY 4 — Parent Registration & Child Portal Journey
**Actor:** Umm Khalid (Parent)  
**Goal:** A parent can register, log in, and view their linked child's profile and notifications.

### Pre-conditions
- A student child account already exists in the system
- Admin has linked the child to the parent (or done via ORM for testing)

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Send `POST /api/auth/register/` with role `PARENT`, parent details | Response 201 or 200. Parent account created | | |
| 2 | Send `POST /api/auth/login/` with parent credentials | Response 200. `access` token returned | | |
| 3 | Send `GET /api/parents/dashboard/` | Response 200 or 404 (acceptable if no parent profile yet) | | |
| 4 | Send `GET /api/parents/dashboard/child_dashboard/` | Response 200. Returns list of linked children | | |
| 5 | Send `GET /api/students/children/` | Response 200. Returns children linked to this parent | | |
| 6 | Send `GET /api/auth/profile/` | Response 200. Returns parent's own profile | | |
| 7 | Send `GET /api/auth/notifications/` | Response 200. Returns parent's notifications | | |

---

## STORY 5 — Booking Lifecycle (Student → Tutor → Admin)
**Actor:** Fatima (Student) and Sheikh Omar (Tutor)  
**Goal:** Verify the complete booking flow from student request through to admin visibility.

### Pre-conditions
- An approved tutor exists
- An approved student with `payment_status: PAID` exists
- Both are logged in

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Student: Send `POST /api/classes/booking/request/` with tutor ID, subject, and schedule | Response 201. Booking auto-approved. `id` in response | | |
| 2 | As Student: Send `GET /api/classes/booking/request/` | Response 200. The new booking appears | | |
| 3 | As Tutor: Send `GET /api/classes/booking/approval/` | Response 200. The student's booking is visible | | |
| 4 | As Admin: Send `GET /api/classes/admin/bookings/` | Response 200. Booking appears in the admin list | | |
| 5 | As Student: Send `GET /api/classes/sessions/` | Response 200. Sessions list returned | | |
| 6 | As Tutor: Send `GET /api/classes/sessions/` | Response 200. Sessions list returned | | |

---

## STORY 6 — Paystack Wallet Top-Up & Webhook Journey
**Actor:** A Student  
**Goal:** Student can initiate a wallet top-up via Paystack; webhook correctly credits the wallet.

### Pre-conditions
- Student is logged in
- Paystack test keys are configured in the environment
- Student has a wallet (auto-created on registration)

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Student: Send `POST /api/payments/initiate/` with `{"amount": 5000}` | Response 200. Returns `authorization_url`, `reference`, and `amount` | | |
| 2 | Open the `authorization_url` in a browser | Paystack test payment page loads | | |
| 3 | Complete the test payment using Paystack test card (`4084 0840 8408 4081`, any future expiry, CVV `408`) | Payment success page shown | | |
| 4 | Send `GET /api/payments/verify/{reference}/` with the reference from step 1 | Response 200. `verified: true`. Wallet balance increased by NGN 5,000 | | |
| 5 | Send `GET /api/payments/status/` | Response 200. `wallet_balance` shows the updated amount | | |

---

## STORY 7 — Exam Lifecycle Journey
**Actor:** Sheikh (Tutor) and a Student  
**Goal:** Tutor creates an exam with questions; student takes the exam and sees results; retake is blocked.

### Pre-conditions
- An approved tutor and a student both exist and are logged in
- Student wallet balance is greater than 0

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `POST /api/exams/list/` with title, subject, `exam_type: INTERNAL`, duration | Response 201. Exam created. Note the `id` | | |
| 2 | As Tutor: Send `POST /api/exams/list/{exam_id}/add_question/` three times with different questions | Each returns 201. Note each question's `id` | | |
| 3 | As Student: Send `GET /api/exams/list/` | Response 200. Exam appears in the list | | |
| 4 | As Student: Send `GET /api/exams/list/{exam_id}/` | Response 200. Exam details returned with all 3 questions | | |
| 5 | As Student: Send `POST /api/exams/list/{exam_id}/submit/` with answers for all 3 questions (at least 2 correct) | Response 201. Returns `score` (e.g. 66.67 for 2/3), `correct_answers: 2`, `total_questions: 3` | | |
| 6 | As Student: Try `GET /api/exams/list/{exam_id}/` again | Response 403. "You have already completed this examination" | | |
| 7 | As Student: Send `GET /api/exams/results/` | Response 200. Result appears in the list with correct score | | |
| 8 | As Admin: Send `GET /api/exams/results/` | Response 200. All results visible including this student's | | |

---

## STORY 8 — Booking Approval & Session Completion Journey
**Actor:** Tutor Ustadh Bilal and Student Zainab  
**Goal:** Tutor approves a pending booking; session is completed; commission is split correctly.

### Pre-conditions
- Tutor and student exist and are approved
- Student wallet has sufficient balance (e.g. NGN 5,000)
- A booking exists with `approved: false`

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `GET /api/classes/booking/approval/` | Response 200. The pending booking appears in the list | | |
| 2 | As Tutor: Send `POST /api/classes/booking/{booking_id}/approve/` with `{"action": "approve"}` | Response 200. Booking approved. `booking.approved` is now true | | |
| 3 | Create a session (via admin or ORM) with a fee of NGN 1,500 | Session exists with `status: PENDING` | | |
| 4 | As Student: Send `GET /api/classes/sessions/` | Response 200. Session appears | | |
| 5 | As Tutor: Send `POST /api/classes/session/{session_id}/complete/` | Response 200. Returns `fee`, `commission`, `net_payout`, `student_balance`, `tutor_balance` | | |
| 6 | Verify session status | Session `status` is `COMPLETED`, `payout_status` is `RELEASED` | | |
| 7 | As Student: Check `GET /api/payments/status/` | `wallet_balance` has decreased by the session fee | | |
| 8 | As Tutor: Check `GET /api/payments/tutor/wallet/` | `balance` has increased by the net payout (fee minus commission) | | |
| 9 | As Student: Send `GET /api/students/me/progress/` | Response 200. `attendance.completed` is 1 | | |

---

## STORY 9 — Tutor Withdrawal Journey
**Actor:** Ustadh Ibrahim (Tutor) and Admin  
**Goal:** Tutor requests a withdrawal from earned balance; admin approves; balance is reduced.

### Pre-conditions
- Tutor exists with wallet balance ≥ NGN 5,000

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `GET /api/payments/tutor/wallet/` | Response 200. `balance` shows NGN 8,000 (or whatever the balance is) | | |
| 2 | As Tutor: Send `POST /api/payments/tutor/withdrawal/` with `amount: 5000`, bank name, account number, account name | Response 201. Withdrawal created with `status: PENDING` and `id` | | |
| 3 | As Tutor: Send `GET /api/payments/tutor/withdrawal/` | Response 200. Withdrawal appears with status `PENDING` | | |
| 4 | As Admin: Send `GET /api/payments/admin/withdrawals/pending/` | Response 200. The withdrawal request appears | | |
| 5 | As Admin: Send `POST /api/payments/admin/withdrawal/approve/{withdrawal_id}/` with `{"action": "approve"}` | Response 200. Withdrawal approved | | |
| 6 | As Tutor: Send `GET /api/payments/tutor/wallet/` | Response 200. `balance` has decreased by NGN 5,000 | | |

---

## STORY 10 — Parent Full Portal Journey
**Actor:** Fatima (Parent) and her child Omar (Student)  
**Goal:** Parent can fund child's wallet, monitor child's progress, and impersonate child to act on their behalf.

### Pre-conditions
- Parent and student (child) accounts both exist
- Child is linked to parent in the system
- Child has an active student profile

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Parent: Send `POST /api/parents/dashboard/fund_child_wallet/` with `child_id` and `amount: 10000` | Response 200. `new_balance: 10000.0` returned | | |
| 2 | Check child's wallet directly | Wallet balance is NGN 10,000 | | |
| 3 | As Parent: Send `GET /api/parents/dashboard/child_dashboard/` | Response 200. Child appears in the list | | |
| 4 | As Parent: Send `GET /api/parents/dashboard/child_detail/?child_id={child_profile_id}` | Response 200. Returns `full_name`, `wallet_balance: 10000.0`, `sessions`, `transactions` | | |
| 5 | As Parent: Send `GET /api/students/children/` | Response 200. Child profile returned | | |
| 6 | As Parent: Send `POST /api/parents/dashboard/impersonate_child/` with `{"child_id": child_profile_id}` | Response 200. Returns child's `access` token | | |
| 7 | Use the child's access token: Send `GET /api/students/me/` | Response 200. Returns Omar's student profile (confirms token works as child) | | |
| 8 | As Parent: Send `GET /api/auth/profile/` | Response 200. Returns parent's own profile (parent session still active) | | |

---

## STORY 11 — Student Re-enrolment & Promotion Journey
**Actor:** Yusuf (Student) and Admin  
**Goal:** An existing student enrols in an additional subject; admin can later promote the student to tutor.

### Pre-conditions
- Student with `approval_status: APPROVED` exists
- At least one subject exists in the system

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Student: Send `POST /api/students/enroll-subject/` with `subject_id` and `schedule` | Response 200 or 201. Enrolment requested | | |
| 2 | Verify in the database or admin panel | Enrollment record exists for this student and subject | | |
| 3 | As Student: Send `GET /api/students/me/` | Response 200. Profile returned | | |
| 4 | As Admin: Send `POST /api/students/admin/{student_user_id}/promote/` | Response 200. Message confirms promotion. Student role changed to `TUTOR` | | |
| 5 | Verify student's new role | `role` field is now `TUTOR`. A `TutorProfile` with status `PENDING` has been created | | |

---

## STORY 12 — Auth Extras Journey
**Actor:** Any authenticated user and Admin  
**Goal:** Password change, token refresh, notification management, and admin user management all work correctly.

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As any user: Send `POST /api/auth/password/change/` with correct `current_password` and a new `new_password` | Response 200. "Password updated successfully" | | |
| 2 | Log in again using the NEW password | Response 200. `access` token returned. Old password no longer works | | |
| 3 | Send `POST /api/auth/refresh/` with a valid `refresh` token in the body | Response 200. New `access` token returned | | |
| 4 | As Admin: Create a notification for a user (via broadcast or directly) | Notification exists | | |
| 5 | As that user: Send `POST /api/auth/notifications/{notification_id}/read/` | Response 200. `"Marked as read"` message returned | | |
| 6 | Verify notification | `is_read` is now `true` | | |
| 7 | As Admin: Send `GET /api/auth/admin/users/` | Response 200. Returns all platform users | | |
| 8 | As Admin: Send `PATCH /api/auth/admin/users/{user_id}/` with `{"first_name": "NewName"}` | Response 200. User's first name updated | | |

---

## STORY 13 — Password Reset Journey
**Actor:** Any user who has forgotten their password  
**Goal:** User can request a password reset link and set a new password using the token.

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Send `POST /api/auth/password-reset/request/` with a **non-existent** email | Response 200. Generic message returned (no info leak about whether email exists) | | |
| 2 | Send `POST /api/auth/password-reset/request/` with a **real** user's email | Response 200. "Password reset link sent to your email." User receives an email with a reset link | | |
| 3 | Extract the `uidb64` and `token` from the reset link in the email | Token and UID obtained | | |
| 4 | Send `POST /api/auth/password-reset/confirm/` with `uidb64`, `token`, and new `password` | Response 200. "Password reset successful" | | |
| 5 | Log in with the new password | Response 200. Access granted | | |
| 6 | Send `POST /api/auth/password-reset/confirm/` again with the **same** token | Response 401. "Invalid or expired token" (token is single-use) | | |

---

## STORY 14 — Trial Application Journey
**Actor:** A prospective student (not yet on the platform), Admin, and Tutor  
**Goal:** Someone can submit a trial class request; admin reviews and either rejects or approves it.

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | **Without logging in:** Send `POST /api/applications/` with first name, email, course interested, preferred day/time | Response 201. Trial application submitted. `id` returned | | |
| 2 | As Admin: Send `GET /api/admin/applications/` | Response 200. The application appears in the list | | |
| 3 | As Admin: Send `POST /api/admin/applications/{app_id}/reject/` | Response 200. Application status changes to `rejected` | | |
| 4 | Create a new trial application (repeat step 1) | Response 201. Note the new `id` | | |
| 5 | As Admin: Send `POST /api/admin/applications/{app_id}/approve/` with `generate_zoom: false`, a manual `meeting_link`, tutor name, and `start_time` | Response 200. Application `status` changes to `approved`. Meeting link saved | | |
| 6 | As Admin: Send `PATCH /api/admin/applications/{app_id}/update/` with `{"duration": 60}` | Response 200. Duration updated | | |
| 7 | As the student (if they have a platform account with matching email): Send `GET /api/applications/student/my-classes/` | Response 200. `classes` list returned including the approved trial | | |
| 8 | As Tutor (assigned to the trial): Send `GET /api/applications/tutor/schedule/` | Response 200. Trial appears in tutor's schedule | | |

---

## STORY 15 — Booking Wallet-Pay & Tutor Reject Journey
**Actor:** A Student and a Tutor  
**Goal:** Student pays for an approved booking using their wallet; a separate booking is rejected by the tutor.

### Pre-conditions
- Student wallet has sufficient balance
- An approved booking exists (`paid: false`)

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | Confirm student wallet balance is sufficient to cover the booking price | Wallet balance ≥ booking price | | |
| 2 | As Student: Send `POST /api/payments/booking/wallet-pay/{booking_id}/` | Response 200. `success: true`. `new_balance` shows reduced amount | | |
| 3 | Verify booking is now marked as paid | `booking.paid` is `true` | | |
| 4 | Verify wallet balance reduced by the booking price | New balance = old balance − booking price | | |
| 5 | Create a second booking with `approved: false` (pending tutor approval) | Booking exists | | |
| 6 | As Tutor: Send `GET /api/classes/booking/approval/` | Response 200. Pending booking is visible | | |
| 7 | As Tutor: Send `POST /api/classes/booking/{booking_id}/reject/` with `{"rejection_reason": "Schedule conflict"}` | Response 200. Booking is deleted | | |
| 8 | As Student: Check notifications — `GET /api/auth/notifications/` | Response 200. A "Booking Request Declined" notification appears | | |

---

## STORY 16 — Reschedule Journey
**Actor:** A Student and Admin  
**Goal:** Student requests to reschedule a session; admin approves the new time; session is updated.

### Pre-conditions
- A scheduled session exists in the future (at least 1 hour away)

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Student: Send `POST /api/classes/student/reschedule/` with `session_id`, `requested_date` (YYYY-MM-DD), `requested_time` (HH:MM:SS), and `reason` | Response 200. Reschedule request created. `request_id` returned | | |
| 2 | As Admin: Send `POST /api/classes/admin/reschedule/{request_id}/action/` with `{"action": "APPROVE"}` | Response 200. "Reschedule approved" | | |
| 3 | Verify session | `status` is now `RESCHEDULED`. `scheduled_at` updated to the new date/time | | |
| 4 | Create a second reschedule request (repeat step 1 for another session) | `request_id` returned | | |
| 5 | As Admin: Send `POST /api/classes/admin/reschedule/{request_id}/action/` with `{"action": "REJECT", "notes": "Tutor unavailable"}` | Response 200. "Reschedule rejected" | | |

---

## STORY 17 — Curriculum Material Upload Journey
**Actor:** Sheikh (Tutor), Admin, and a Student  
**Goal:** Tutor uploads a learning material; admin and eligible students can see it.

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `POST /api/curriculum/materials/` with `title`, `material_type: LINK`, `external_url`, `is_public: true` | Response 201. Material created. `id` returned | | |
| 2 | As Tutor: Send `GET /api/curriculum/materials/` | Response 200. The uploaded material appears in the list | | |
| 3 | As Tutor: Send `PATCH /api/curriculum/materials/{material_id}/` with `{"title": "Updated Title"}` | Response 200. Title updated in response | | |
| 4 | As Admin: Send `GET /api/curriculum/materials/` | Response 200. Material appears (admins see all) | | |
| 5 | Without logging in: Send `GET /api/curriculum/materials/` | Response 200. Public materials visible (no auth required for listing) | | |

---

## STORY 18 — Exam Assignment Journey
**Actor:** Tutor, Students, and Admin  
**Goal:** Tutor assigns an exam to students; students see their assigned exams.

### Pre-conditions
- An exam exists (created by the tutor)
- At least 2 student accounts exist

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `POST /api/exams/assignments/` with `{"exam": exam_id, "student": student_1_id}` | Response 201. Assignment created | | |
| 2 | As Tutor: Send `POST /api/exams/assignments/bulk-assign/` with `{"exam": exam_id, "students": [student_1_id, student_2_id]}` | Response 201. `ids` list returned with assignment IDs | | |
| 3 | As Student 1: Send `GET /api/exams/assignments/` | Response 200. Assigned exam appears in the list | | |
| 4 | As Admin: Send `GET /api/exams/assignments/` | Response 200. All assignments visible | | |

---

## STORY 19 — Programs, Whiteboard & Miscellaneous Journey
**Actor:** Various roles  
**Goal:** Verify public listings, whiteboard saving, session start, payment status, tutor profile update, and admin booking actions.

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | **Without logging in:** Send `GET /api/programs/list/` | Response 200. Returns list of programs (Western, Islamic) | | |
| 2 | **Without logging in:** Send `GET /api/programs/subjects/` | Response 200. Returns list of subjects | | |
| 3 | **Without logging in:** Send `GET /api/payments/pricing/` | Response 200. Returns active pricing tiers | | |
| 4 | As Tutor: Send `POST /api/whiteboard/library/` with `{"title": "Lesson 1", "snapshot": "{\"strokes\":[]}"}` | Response 201. Whiteboard saved | | |
| 5 | As Tutor: Send `GET /api/whiteboard/library/` | Response 200. Saved whiteboard appears in the list | | |
| 6 | As Tutor: Send `PATCH /api/tutors/{tutor_profile_id}/update_profile/` with `{"bio": "New bio text"}` | Response 200. Bio updated in tutor profile | | |
| 7 | As Tutor: Send `POST /api/classes/session/{session_id}/start/` | Response 200. `is_started: true` returned | | |
| 8 | As Student: Send `GET /api/payments/status/` | Response 200. Returns `payment_status`, `wallet_balance`, `total_amount` | | |
| 9 | As Tutor: Send `GET /api/payments/tutor/financials/` | Response 200. Returns `total_classes`, `completed_classes`, `gross_earnings`, `net_earnings` | | |
| 10 | As Admin: Create a booking with `approved: false`. Send `POST /api/classes/admin/bookings/{booking_id}/action/` with `{"action": "approve"}` | Response 200. Booking `approved` is now `true` | | |
| 11 | As Admin: Create another booking. Send `POST /api/classes/admin/bookings/{booking_id}/action/` with `{"action": "reject"}` | Response 200. Booking is deleted from the system | | |

---

## STORY 20 — Scheduling & Tutor Request Journey
**Actor:** A Student and a Tutor  
**Goal:** A tutor request (created when student enrols with a tutor) can be listed and actioned by the tutor.

### Pre-conditions
- A TutorRequest exists linking a student to a tutor (auto-created during enrolment, or created manually)

---

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Tutor: Send `GET /api/scheduling/requests/` | Response 200. The tutor request from the student appears | | |
| 2 | As Student: Send `GET /api/scheduling/requests/` | Response 200. The student's sent request appears | | |
| 3 | As Tutor: Send `GET /api/scheduling/requests/{request_id}/` | Response 200. Request detail returned | | |
| 4 | As Tutor: Send `POST /api/scheduling/requests/{request_id}/reject/` with `{"reason": "Schedule conflict"}` | Response 200. Request `status` changes to `REJECTED` | | |

---

## Security & Role Isolation Checks

These checks verify that users cannot access resources outside their role.

| # | Action | Expected Result | ✅/❌ | Notes |
|---|--------|-----------------|-------|-------|
| 1 | As Student: Send `GET /api/students/admin/all/` | Response 403. Access denied | | |
| 2 | As Student: Send `GET /api/tutors/admin/list/` | Response 403. Access denied | | |
| 3 | As Student: Send `GET /api/payments/admin/analytics/` | Response 403. Access denied | | |
| 4 | As Tutor: Send `GET /api/payments/admin/analytics/` | Response 403. Access denied | | |
| 5 | As Student: Send `POST /api/classes/batches/` | Response 403. Access denied | | |
| 6 | As Tutor A: Send `PATCH /api/tutors/{tutor_B_profile_id}/update_profile/` | Response 403. Cannot edit another tutor's profile | | |
| 7 | Without logging in: Send `GET /api/classes/sessions/` | Response 401. Authentication required | | |
| 8 | Without logging in: Send `POST /api/auth/password/change/` | Response 401. Authentication required | | |

---

## Issue Log

Use this table to record any failures found during UAT.

| # | Story | Step | Issue Description | Severity (High/Med/Low) | Assigned To | Status |
|---|-------|------|-------------------|------------------------|-------------|--------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Backend Developer | | | |
| Project Manager | | | |

---

*Document prepared for Hidayah e-Madarasah International — internal use only.*
